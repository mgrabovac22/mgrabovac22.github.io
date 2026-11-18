import * as THREE from 'three';
import { batchVehicleParts, buildFormulaBody, buildWheel, crossSection, loftShell, vehiclePaint, vehiclePiece as part } from './drive-vehicle-art.js';
import { normalizeRaceBuild, raceOptions, raceSpec, raceWheelWidth } from './drive-race-build.js';

const shapeBox = new THREE.BoxGeometry();
const plate = new THREE.PlaneGeometry();
const pipe = new THREE.CylinderGeometry(.5, .5, 1, 16, 1, true);
const rimRotor = new THREE.CylinderGeometry(.5, .5, 1, 16);
const intake = new THREE.CylinderGeometry(.5, .57, 1, 12);
const bucket = new THREE.MeshStandardMaterial({ color: 0x141b21, metalness: .26, roughness: .69 });
const carbon = new THREE.MeshStandardMaterial({ color: 0x20282b, metalness: .34, roughness: .45 });
const alloy = new THREE.MeshStandardMaterial({ color: 0xbac2c5, metalness: .79, roughness: .29 });
const brakeLamp = new THREE.MeshStandardMaterial({ color: 0xcc344b, emissive: 0xa21734, emissiveIntensity: 1.4, roughness: .27 });
const finishProps = {
  gloss: [.29, .53, .74], metallic: [.24, .68, .91], satin: [.43, .54, .32],
  matte: [.75, .13, 0], chrome: [.13, .94, .9],
};
const glassColors = { clear: 0x304754, smoke: 0x131e27, ice: 0x43667e, amber: 0x51413a };
const lampColors = { white: 0xe0f1fa, amber: 0xffc768, ice: 0x84d4fa, mint: 0x81ffce };
const spoilerShapes = {
  ducktail: [.10, .56, .22], club: [.34, .83, .26], gt: [.56, .95, .35], swan: [.73, .91, .38],
};

function primaryPaint(build, model, color) {
  const material = vehiclePaint(color);
  [material.roughness, material.metalness, material.clearcoat] = finishProps[build.finish];
  if (build.livery === 'none') return material;
  const liveryColor = new THREE.Color(build.accent);
  material.userData.liveryColor = liveryColor;
  material.customProgramCacheKey = () => 'circuit-livery';
  material.onBeforeCompile = shader => {
    shader.uniforms.liveryColor = { value: liveryColor };
    shader.uniforms.liveryKind = { value: raceOptions.livery.indexOf(build.livery) };
    shader.uniforms.liverySize = { value: new THREE.Vector2(model.width, model.depth) };
    shader.vertexShader = 'varying vec3 liveryPoint;\n' + shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nliveryPoint = transformed;');
    shader.fragmentShader = 'varying vec3 liveryPoint; uniform vec3 liveryColor; uniform float liveryKind; uniform vec2 liverySize;\n' +
      shader.fragmentShader.replace('#include <color_fragment>', /* glsl */`
        #include <color_fragment>
        vec2 pos = liveryPoint.xz / liverySize;
        float stripe = 0.;
        if (liveryKind < 1.5) stripe = 1. - smoothstep(.060, .071, abs(abs(pos.x) - .135));
        else if (liveryKind < 2.5) stripe = 1. - smoothstep(.13, .141, abs(pos.x - .255));
        else if (liveryKind < 3.5) stripe = 1. - smoothstep(.235, .251, abs(pos.y + pos.x * .47 - .34));
        else if (liveryKind < 4.5) stripe = 1. - smoothstep(.015, .03, liveryPoint.y - pos.y * .11);
        else stripe = smoothstep(-.14, .78, pos.y) * .91;
        diffuseColor.rgb = mix(diffuseColor.rgb, liveryColor, stripe);
      `);
  };
  return material;
}

function coachwork(body, model, paint, accent, glass, lamp) {
  const { shape, depth, width, roof, length, radius, type } = model;
  const skirt = -.24;
  const at = [...new Set([-depth, -depth + .22, -length - radius, -length, -length + radius,
    -.52, .08, .72, length - radius, length, length + radius, depth - .18, depth])].sort((a, b) => a - b);
  loftShell(body, paint, at.map(z => {
    const front = THREE.MathUtils.smoothstep(-z, length - .26, depth);
    const rear = THREE.MathUtils.smoothstep(z, length - .21, depth);
    const half = width * (shape.shoulders - front * (shape.shoulders - shape.nose) - rear * (shape.shoulders - shape.tail));
    const axle = Math.abs(Math.abs(z) - length);
    const cut = Math.sqrt(Math.max(0, (radius + .07) ** 2 - axle ** 2));
    const arch = Math.max(skirt, -.348 + cut);
    const panel = shape.hood + (shape.deck - shape.hood) * THREE.MathUtils.smoothstep(z, -.6, depth - .2);
    return [z, half, arch, Math.max(arch + .083, panel - front * .075 - rear * .026)];
  }), ([, w, bottom, top]) => crossSection(w, bottom, top, type === 'touring' || type === 'muscle' ? .94 : .82), 2);
  part(body, carbon, width * 1.72, .082, depth * 1.68, 0, skirt - .02, 0, shapeBox);
  const [nose, front, back, tail] = shape.cabin;
  const glassWidth = width * shape.glass;
  const sill = shape.hood * .47 + shape.deck * .53 - .035;
  if (type === 'roadster') {
    const screen = part(body, glass, glassWidth * 1.89, .28, .074, 0, sill + .17, front - .12);
    screen.rotation.x = -.32;
    for (const side of [-1, 1]) {
      part(body, bucket, .33, .30, .22, side * .29, sill + .13, .28);
      part(body, accent, .22, .19, .08, side * .29, sill + .33, .34);
    }
  } else {
    loftShell(body, glass, [[nose, glassWidth * .96, sill, sill + .035], [front, glassWidth, sill, roof],
      [back, glassWidth * .96, sill, roof - (type === 'muscle' ? .10 : .03)],
      [tail, glassWidth * .84, sill, Math.max(sill + .022, shape.deck + .017)]],
    ([, w, base, top]) => crossSection(w, base, top, type === 'touring' || type === 'rally' ? .93 : .76), 4);
    const cap = part(body, paint, glassWidth * (type === 'touring' ? 1.73 : 1.49), .09, back - front + .17,
      0, roof + .036, (front + back) / 2);
    cap.rotation.x = type === 'muscle' ? .11 : .019;
    for (const side of [-1, 1]) part(body, paint, .083, (roof - sill) * .88, .105, side * glassWidth * .93,
      (roof + sill) * .5, back - .16).rotation.z = side * .32;
  }
  for (const side of [-1, 1]) {
    if (type === 'muscle') {
      for (const across of [.604, .841]) {
        part(body, alloy, .227, .074, .227, side * width * across, .16, -depth - .025, intake).rotation.x = Math.PI / 2;
        part(body, lamp, .192, .073, .192, side * width * across, .16, -depth - .049, intake).rotation.x = Math.PI / 2;
      }
    } else {
      const frontLamp = part(body, lamp, width * (type === 'electric' ? .66 : .39), type === 'touring' ? .126 : .076,
        .212, side * width * shape.nose * .72, shape.hood * .66, -depth + .10);
      frontLamp.rotation.y = side * (type === 'hyper' ? .48 : .18);
    }
    part(body, brakeLamp, width * .51, .072, .058, side * width * shape.tail * .66, shape.deck - .105, depth - .005);
    part(body, carbon, .151, .12, .23, side * (glassWidth + .067), sill + .15, nose + .15);
    part(body, accent, .198, .074, .17, side * (glassWidth + .213), sill + .18, nose + .16);
    if (['hyper','attack','prototype'].includes(type)) {
      part(body, carbon, .13, .178, .62, side * width * .985, shape.deck - .113, .72).rotation.y = side * .20;
    }
  }
  part(body, carbon, width * (type === 'electric' ? .74 : .99), .139, .085, 0, -.05, -depth + .019);
  part(body, alloy, width * .61, .03, .044, 0, .044, -depth + .018, shapeBox);
  part(body, carbon, width * 1.39, .159, .44, 0, -.148, depth - .20);
  if (type === 'muscle') {
    part(body, bucket, width * 1.82, .226, .095, 0, .158, -depth + .005);
    for (const y of [.074, .122, .170, .218]) part(body, alloy, width * 1.00, .016, .028, 0, y, -depth - .058, shapeBox);
    part(body, alloy, width * 1.89, .117, .156, 0, -.095, -depth - .035);
    part(body, alloy, width * 1.87, .108, .139, 0, -.10, depth + .007);
  }
  if (type === 'electric') part(body, lamp, width * 1.43, .029, .04, 0, shape.hood * .67, -depth + .025, shapeBox);
}

function aero(body, model, build, paint, accent) {
  const { width, depth, type } = model;
  const deck = model.shape?.deck ?? .14, hood = model.shape?.hood ?? .14;
  const rear = depth - .29;
  const wing = build.wing === 'stock' && type !== 'formula'
    ? (['gt', 'prototype', 'attack'].includes(type) ? 'club' : 'ducktail') : build.wing;
  if (spoilerShapes[wing]) {
    const [lift, span, chord] = spoilerShapes[wing];
    const height = deck + lift;
    part(body, wing === 'ducktail' ? paint : carbon, width * span * 2, .073, chord, 0, height, rear).rotation.x = -.19;
    if (lift > .15) for (const side of [-1, 1]) {
      const rake = wing === 'swan' ? .24 : -.061;
      const foot = deck - .12, rise = height - foot;
      const stand = part(body, alloy, .087, Math.hypot(rise, rake), .126,
        side * width * .49, (foot + height) / 2, rear - rake / 2);
      stand.rotation.x = Math.atan2(rake, rise);
      part(body, accent, .064, .208, chord + .079, side * width * span, height, rear);
    }
    if (wing === 'swan') part(body, accent, width * span * 1.95, .055, .17, 0, height + .098, rear - .043);
  }
  if (build.splitter !== 'stock') {
    const wide = build.splitter === 'street' ? 1.56 : 2.13;
    part(body, carbon, width * wide, .059, .40, 0, -.207, -depth + .073);
    if (build.splitter === 'canards') for (const side of [-1, 1]) {
      const tip = part(body, accent, .29, .048, .32, side * width * .92, -.019, -depth + .16);
      tip.rotation.z = side * .39;
    }
  }
  if (build.skirts !== 'stock') for (const side of [-1, 1]) {
    const blade = build.skirts === 'blade';
    const rail = part(body, blade ? carbon : paint, blade ? .151 : .282, blade ? .062 : .131,
      model.length * 1.41, side * (width + (blade ? 0 : .075)), -.161, .05);
    rail.rotation.z = side * .17;
    part(body, accent, .047, .038, model.length * 1.38, side * (width + (blade ? .082 : .21)), -.151, .05, shapeBox);
  }
  if (build.hood === 'carbon') {
    part(body, carbon, width * (type === 'formula' ? .42 : 1.32), .038, depth * .43, 0, hood + .019, -depth * .56).rotation.x = -.064;
  } else if (build.hood === 'scoop') {
    part(body, paint, .51, .203, .55, 0, hood + .077, -depth * .57).rotation.x = -.14;
    part(body, bucket, .37, .081, .025, 0, hood + .091, -depth * .57 - .275, shapeBox);
  } else if (build.hood === 'vents') {
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      part(body, bucket, type === 'formula' ? .15 : .29, .029, .039,
        s * width * (type === 'formula' ? .14 : .37), hood + .019, -depth * .50 + i * .12, shapeBox);
    }
  }
  const outlets = build.exhaust === 'quad' ? [-.69,-.49,.49,.69] : build.exhaust === 'twin' ? [-.59,.59]
    : build.exhaust === 'center' ? [0] : type === 'formula' || type === 'electric' ? [] : [-.55,.55];
  for (const x of outlets) {
    const tip = part(body, alloy, x === 0 ? .22 : .114, .25, .109, x * width, -.09, depth - .017, pipe);
    tip.rotation.x = Math.PI / 2;
  }
}

function numberPlate(body, model, value) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f4f4ec'; ctx.fillRect(9, 14, 110, 100);
  ctx.fillStyle = '#152431'; ctx.fillRect(9, 14, 110, 12);
  ctx.font = '900 60px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(value).padStart(2, '0'), 64, 70);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: .32 });
  for (const side of [-1, 1]) {
    const x = side * model.width * (model.id === 'formula' ? .79 : model.shape.shoulders);
    part(body, material, .42, .37, 1, x, model.id === 'formula' ? .099 : .136, .06, plate).rotation.y = side * Math.PI / 2;
  }
  return material;
}

export function createRaceArtwork(input) {
  const build = normalizeRaceBuild(input);
  const model = raceSpec(build);
  const body = new THREE.Group();
  const primary = primaryPaint(build, model, build.paint);
  const accent = vehiclePaint(build.accent);
  const glass = vehiclePaint(glassColors[build.glass]);
  const rim = new THREE.MeshStandardMaterial({ color: build.rimColor, metalness: .77, roughness: .32 });
  const caliper = new THREE.MeshStandardMaterial({ color: build.caliper, metalness: .38, roughness: .39 });
  const lamp = new THREE.MeshStandardMaterial({ color: lampColors[build.lights], emissive: lampColors[build.lights], emissiveIntensity: .64 });
  const owned = [primary, accent, glass, rim, caliper, lamp];
  const glowMaterials = [];
  if (model.id === 'formula') {
    buildFormulaBody(body, primary, accent, build.wing === 'stock', build.exhaust === 'stock', glass);
    if (build.lights !== 'white') part(body, lamp, .62, .029, .032, 0, -.081, -2.266, shapeBox);
  } else coachwork(body, model, primary, accent, glass, lamp);
  aero(body, model, build, primary, accent);
  if (build.number) owned.push(numberPlate(body, model, build.number));
  if (build.glow === 'on') {
    const tint = new THREE.MeshBasicMaterial({ color: build.glowColor });
    const ambient = new THREE.MeshBasicMaterial({ color: build.glowColor, transparent: true, opacity: .22, depthWrite: false });
    owned.push(tint, ambient);
    glowMaterials.push(tint, ambient);
    for (const side of [-1, 1]) {
      part(body, tint, .055, .035, model.length * 1.58, side * model.width * .71, -.314, 0, shapeBox);
      const halo = part(body, ambient, .97, model.length * 1.83, 1, side * model.width * .87, -.563, 0, plate);
      halo.rotation.x = -Math.PI / 2;
    }
  }
  batchVehicleParts(body);
  const spokes = { stock: 7, five: 5, mesh: 14, turbine: 10, disc: 0 };
  const axleParts = [];
  for (const z of [-model.length, model.length]) for (const side of [-1, 1]) {
    const width = raceWheelWidth(model, z);
    const wheel = buildWheel(model.radius, width, spokes[build.rims], side, build.tire === 'grooved', false,
      { rim, type: build.rims, whitewall: build.tire === 'whitewall' });
    const rotor = part(body, alloy, model.radius * 1.24, .032, model.radius * 1.24,
      side * (model.axle + width * .18), -.28, z, rimRotor);
    rotor.rotation.z = Math.PI / 2;
    // The brake stays behind the wheel instead of spinning with the rim.
    part(body, caliper, .105, .134, .141, side * (model.axle + width * .22), -.18, z + .092);
    axleParts.push({ wheel, side, z });
  }
  const geometry = new Set();
  for (const root of [body, ...axleParts.map(item => item.wheel)]) root.traverse(mesh => {
    if (mesh.geometry?.userData.vehicleOwned) geometry.add(mesh.geometry);
  });
  const paints = new Map();
  return {
    model,
    get paint() { return build.paint; },
    recolor(colors) {
      for (const key of ['paint', 'accent', 'rimColor', 'caliper', 'glowColor']) build[key] = colors[key];
      primary.color.set(build.paint);
      primary.userData.liveryColor?.set(build.accent);
      accent.color.set(build.accent);
      rim.color.set(build.rimColor);
      caliper.color.set(build.caliper);
      for (const glow of glowMaterials) glow.color.set(build.glowColor);
    },
    instantiate(color = build.paint, shadows = true) {
      const view = body.clone(true);
      if (color !== build.paint && !paints.has(color)) paints.set(color, primaryPaint(build, model, color));
      const alternate = paints.get(color);
      view.traverse(mesh => {
        if (alternate && mesh.material === primary) mesh.material = alternate;
        if (!shadows) mesh.castShadow = false;
      });
      const wheels = axleParts.map(({ wheel, side, z }) => {
        const clone = wheel.clone(true);
        if (!shadows) clone.traverse(mesh => { mesh.castShadow = false; });
        clone.position.set(side * model.axle, -(model.stance - model.radius), z);
        return clone;
      });
      return { view, wheels };
    },
    dispose() {
      for (const g of geometry) g.dispose();
      for (const material of [...owned, ...paints.values()]) {
        material.map?.dispose();
        material.dispose();
      }
    },
  };
}

export function createEngineDisplay(build) {
  const spec = raceSpec(build);
  const { engine } = spec;
  const root = new THREE.Group();
  const paint = vehiclePaint(build.accent);
  const stand = new THREE.Group();
  root.add(stand);
  for (const x of [-.76, .76]) {
    part(stand, carbon, .12, .83, .12, x, .417, 0, shapeBox);
    part(stand, bucket, .18, .101, 2.18, x, .086, 0);
  }
  part(stand, carbon, 1.79, .10, .16, 0, .788, -.73, shapeBox);
  part(stand, carbon, 1.79, .10, .16, 0, .788, .73, shapeBox);
  if (!engine.cylinders) {
    part(stand, bucket, 1.40, .39, 1.77, 0, 1.00, 0);
    for (const x of [-.43, .43]) {
      part(stand, alloy, .70, .53, .82, x, 1.34, 0, rimRotor).rotation.z = Math.PI / 2;
      part(stand, paint, .28, .19, .44, x, 1.56, .04);
      for (const y of [1.17, 1.30, 1.43]) part(stand, alloy, .40, .051, .094, x, y, -.48);
    }
  } else {
    const banks = engine.inline ? [0] : [-1, 1];
    const cylinders = engine.cylinders / banks.length;
    const front = (cylinders - 1) * .167;
    part(stand, alloy, engine.inline ? .60 : .94, .56, front * 2 + .49, 0, 1.11, 0);
    part(stand, bucket, .67, .16, front * 2 + .56, 0, .86, 0);
    for (const sign of banks) {
      const cover = part(stand, paint, .342, .24, front * 2 + .40, sign * .369, 1.47, 0);
      cover.rotation.z = -sign * .40;
      for (let cylinder = 0; cylinder < cylinders; cylinder++) {
        const z = cylinder * .334 - front;
        const chamber = part(stand, alloy, .285, .44, .27, sign * .324, 1.27, z, intake);
        chamber.rotation.z = -sign * .38;
        part(stand, alloy, .12, .60, .12, (engine.inline ? .41 : sign * .57), 1.18, z, intake).rotation.z = sign * .48;
        part(stand, bucket, .16, .085, .16, sign * .361, 1.605, z, intake);
      }
    }
    part(stand, bucket, .56, .18, front * 2 + .36, 0, 1.54, 0);
    if (build.induction === 'supercharger') {
      part(stand, alloy, .53, .29, .76, 0, 1.76, -.07);
      part(stand, paint, .60, .063, .41, 0, 1.936, -.19);
    } else if (build.induction === 'turbo') for (const sign of [-1, 1]) {
      part(stand, alloy, .34, .15, .34, sign * .71, 1.21, .46, intake).rotation.x = Math.PI / 2;
      part(stand, bucket, .18, .15, .18, sign * .71, 1.21, .52, intake).rotation.x = Math.PI / 2;
    }
  }
  batchVehicleParts(stand, false);
  return { view: root, dispose() {
    for (const mesh of stand.children) if (mesh.geometry?.userData.vehicleOwned) mesh.geometry.dispose();
    paint.dispose();
  } };
}
