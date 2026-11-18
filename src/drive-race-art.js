import * as THREE from 'three';
import { batchVehicleParts, buildFormulaBody, buildWheel, vehicleCarbon as carbon, vehiclePaint, vehiclePiece as part } from './drive-vehicle-art.js';
import { normalizeRaceBuild, raceOptions, raceSpec, raceWheelWidth } from './drive-race-build.js';
import { coachwork, fitFormulaTail, fitMirrors } from './drive-race-coachwork.js';

const shapeBox = new THREE.BoxGeometry();
const plate = new THREE.PlaneGeometry();
const pipe = new THREE.CylinderGeometry(.5, .5, 1, 16, 1, true);
const rimRotor = new THREE.CylinderGeometry(.5, .5, 1, 16);
const intake = new THREE.CylinderGeometry(.5, .57, 1, 12);
const bucket = new THREE.MeshStandardMaterial({ color: 0x141b21, metalness: .26, roughness: .69 });
const alloy = new THREE.MeshStandardMaterial({ color: 0xbac2c5, metalness: .79, roughness: .29 });
const brakeLamp = new THREE.MeshStandardMaterial({ color: 0xcc344b, emissive: 0xa21734, emissiveIntensity: 1.4, roughness: .27 });
const oxide = new THREE.MeshStandardMaterial({ color: 0x4a618f, metalness: .83, roughness: .29 });
const blackChrome = new THREE.MeshStandardMaterial({ color: 0x363f47, metalness: .75, roughness: .38 });
const finishProps = {
  gloss: [.29, .53, .74], metallic: [.24, .68, .91], satin: [.43, .54, .32],
  matte: [.75, .13, 0], chrome: [.13, .94, .9], pearl: [.25, .52, .89],
};
const glassColors = { clear: 0x304754, smoke: 0x131e27, ice: 0x43667e, amber: 0x51413a };
const lampColors = { white: 0xe0f1fa, amber: 0xffc768, ice: 0x84d4fa, mint: 0x81ffce };
const spoilerShapes = {
  ducktail: [.10, .56, .22], club: [.34, .83, .26], gt: [.56, .95, .35], swan: [.73, .91, .38],
  endurance: [.51, .93, .39],
};

function primaryPaint(build, model, color) {
  const material = vehiclePaint(color);
  [material.roughness, material.metalness, material.clearcoat] = finishProps[build.finish];
  if (build.finish === 'pearl') {
    material.iridescence = .67;
    material.iridescenceIOR = 1.36;
    material.iridescenceThicknessMinimum = 215;
    material.iridescenceThicknessMaximum = 460;
  }
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
        else if (liveryKind < 5.5) stripe = smoothstep(-.14, .78, pos.y) * .91;
        else if (liveryKind < 6.5) {
          float chevron = abs(pos.y + abs(pos.x) * .58 + .10);
          stripe = (1. - smoothstep(.065, .081, chevron)) + (1. - smoothstep(.045, .062, abs(chevron - .21)));
        } else if (liveryKind < 7.5) {
          stripe = step(-.50, pos.y) * step(abs(pos.x), .61) * mod(floor(pos.x * 8.) + floor(pos.y * 10.), 2.);
        } else {
          stripe = (1. - smoothstep(.009, .016, abs(liveryPoint.y - .19 - pos.y * .041))) * smoothstep(.84, .956, abs(pos.x));
        }
        diffuseColor.rgb = mix(diffuseColor.rgb, liveryColor, stripe);
      `);
  };
  return material;
}


function aero(body, model, build, paint, accent) {
  const { width, depth, type } = model;
  const deck = model.shape?.deck ?? .14, hood = model.shape?.hood ?? .14;
  const rear = depth - .29;
  const fitted = { carbon, body: paint, accent, alloy };
  const wing = build.wing === 'stock'
    ? type === 'formula' ? (build.wingFinish === 'stock' ? 'none' : 'club')
      : (['gt', 'prototype', 'attack'].includes(type) ? 'club' : 'ducktail')
    : build.wing;
  if (spoilerShapes[wing]) {
    const [lift, span, chord] = spoilerShapes[wing];
    const height = deck + lift;
    const skin = fitted[build.wingFinish] ?? (wing === 'ducktail' ? paint : carbon);
    part(body, skin, width * span * 2, .073, chord, 0, height, rear).rotation.x = -.19;
    if (lift > .15) for (const side of [-1, 1]) {
      const rake = wing === 'swan' ? .24 : -.061;
      const foot = deck - .12, rise = height - foot;
      const stand = part(body, alloy, .087, Math.hypot(rise, rake), .126,
        side * width * .49, (foot + height) / 2, rear - rake / 2);
      stand.rotation.x = Math.atan2(rake, rise);
      part(body, accent, .064, .208, chord + .079, side * width * span, height, rear);
    }
    if (wing === 'swan') part(body, accent, width * span * 1.95, .055, .17, 0, height + .098, rear - .043);
    if (wing === 'endurance') {
      part(body, skin, width * 1.77, .046, .22, 0, height+.103, rear-.049).rotation.x = -.17;
      for (const side of [-1,1]) part(body, accent, .051,.177,.20,side*width*.871,height+.052,rear-.05,shapeBox);
    }
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
  } else if (build.hood === 'power') {
    const bulge = part(body, paint, type === 'formula' ? .29 : .64, .136, depth*.44, 0, hood+.046, -depth*.55);
    bulge.rotation.x = -.095;
    part(body, accent, .071, .024, depth*.34, 0, hood+.115, -depth*.54, shapeBox).rotation.x = -.095;
  } else if (build.hood === 'louvers') {
    const span = type === 'formula' ? .33 : .79;
    part(body, carbon, span, .053, .558, 0, hood+.016, -depth*.55);
    for (let index=0;index<7;index++) part(body, bucket, span*.92,.026,.04,0,hood+.048,-depth*.55-.225+index*.070,shapeBox).rotation.x = .31;
  }
  const tipMetal = build.tipFinish === 'blued' ? oxide : build.tipFinish === 'black' ? blackChrome : alloy;
  if (build.exhaust === 'side') {
    for (const side of [-1,1]) {
      const span=width*(type==='formula'?.78:.94);
      part(body, tipMetal, .131,.27,.131,side*span,-.177,.68,pipe).rotation.z=Math.PI/2;
    }
    return;
  }
  const outlets = build.exhaust === 'quad' ? [-.69,-.49,.49,.69] : build.exhaust === 'twin' ? [-.59,.59]
    : build.exhaust === 'angled' ? [-.77,.77] : build.exhaust === 'center' ? [0]
      : type === 'formula' ? (build.tipFinish === 'steel' ? [] : [0]) : type === 'electric' ? [] : [-.55,.55];
  const longTip = Boolean(model.shape && build.rearBumper !== 'stock');
  const tailMount = model.shape ? (longTip ? .152 : .083) : -.155;
  for (const x of outlets) {
    const tip = part(body, tipMetal, x === 0 ? .22 : .114, longTip ? .34 : .25, .109, x * width, -.09, depth + tailMount, pipe);
    tip.rotation.x = Math.PI / 2;
    if (build.exhaust === 'angled') tip.rotation.z = Math.sign(x) * .37;
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

function registrationPlate(body, model, build) {
  const board = document.createElement('canvas');
  board.width = 256;
  board.height = 80;
  const ink = board.getContext('2d');
  const light = build.plateStyle === 'light';
  ink.fillStyle = light ? '#e6e9e3' : '#202831';
  ink.fillRect(0, 0, 256, 80);
  ink.fillStyle = build.plateStyle === 'race' ? '#62d8bc' : '#39759b';
  ink.fillRect(0, 0, 28, 80);
  ink.textAlign = 'center';
  ink.textBaseline = 'middle';
  ink.font = '800 37px monospace';
  ink.fillStyle = light ? '#192a35' : '#edf2e7';
  ink.fillText(build.plateText.trim() || 'APEX', 140, 42, 206);
  const map = new THREE.CanvasTexture(board);
  map.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map });
  const y = Math.max(.015, model.shape.deck * .31), z = model.depth + .078;
  part(body, bucket, .63,.211,.042,0,y,z,shapeBox);
  part(body, material, .592,.174,1,0,y,z+.024,plate);
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
  const trim = build.trim === 'carbon' ? carbon : build.trim === 'black' ? blackChrome
    : build.trim === 'chrome' || model.type === 'muscle' ? alloy : bucket;
  const surfaces = { paint: primary, accent, glass, lamp, brakeLamp, bucket, carbon, trim, alloy };
  const owned = [primary, accent, glass, rim, caliper, lamp];
  const glowMaterials = [];
  if (model.id === 'formula') {
    buildFormulaBody(body, primary, accent, build.wing === 'stock' && build.wingFinish === 'stock',
      build.exhaust === 'stock' && build.tipFinish === 'steel', glass, build.mirrors === 'stock' && build.trim === 'stock',
      build.taillights === 'stock');
    if (build.mirrors !== 'stock' || build.trim !== 'stock') fitMirrors(body, build, { x: .356, y: .328, z: -.24 }, surfaces);
    fitFormulaTail(body, model, build, surfaces);
    if (build.lights !== 'white') part(body, lamp, .62, .029, .032, 0, -.081, -2.266, shapeBox);
  } else coachwork(body, model, build, surfaces);
  aero(body, model, build, primary, accent);
  if (build.number) owned.push(numberPlate(body, model, build.number));
  if (build.plateStyle !== 'off') owned.push(registrationPlate(body, model, build));
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
  const spokes = { stock: 7, five: 5, mesh: 14, turbine: 10, disc: 0, split: 10, deep: 5, retro: 8 };
  const axleParts = [];
  for (const z of [-model.length, model.length]) for (const side of [-1, 1]) {
    const width = raceWheelWidth(model, z);
    const wheel = buildWheel(model.radius, width, spokes[build.rims], side, build.tire === 'grooved', false,
      { rim, type: build.rims, whitewall: build.tire === 'whitewall', semiSlick: build.tire === 'semiSlick' });
    const rotor = part(body, alloy, model.radius * 1.24, .032, model.radius * 1.24,
      side * (model.axle + width * .18), -.28, z, rimRotor);
    rotor.rotation.z = Math.PI / 2;
    // The brake stays behind the wheel instead of spinning with the rim.
    part(body, caliper, .105, .134, .141, side * (model.axle + width * .22), -.18, z + .092);
    for (let hole = 0; hole < 9; hole++) {
      const angle = hole * Math.PI * 2 / 9;
      part(body, bucket, .012, .017, .017, side * (model.axle + width*.18 + .019),
        -.28 + Math.cos(angle) * model.radius*.495,z + Math.sin(angle) * model.radius*.495,shapeBox);
    }
    axleParts.push({ wheel, side, z });
  }
  batchVehicleParts(body);
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
