import * as THREE from 'three';
import { Body, Box, Heightfield, RaycastResult, Vec3 } from 'cannon-es';
import { breakCrate, crateCollision, createCrate, restoreCrate } from './drive-crates.js';
import { makeBatches } from './drive-city.js';
import { buildRallyObstacles } from './drive-rally-obstacles.js';

const layouts = {
  race: [[108, 48], [105, -31], [105, -111], [66, -152], [-21, -151], [-48, -121], [-25, -78],
    [-91, -63], [-130, -85], [-165, -47], [-149, 39], [-107, 102], [-44, 107], [15, 150], [82, 144], [110, 104]],
  rally: [[117, 60], [121, 3], [117, -64], [91, -104], [32, -127], [-42, -123], [-111, -103],
    [-137, -50], [-137, 25], [-115, 78], [-59, 117], [5, 130], [65, 118], [111, 104]],
};

const ground = new THREE.PlaneGeometry(1080, 1080).rotateX(-Math.PI / 2);
const pebble = new THREE.IcosahedronGeometry(.5, 1);
const post = new THREE.CylinderGeometry(.44, .5, 1, 9);
const matte = color => new THREE.MeshStandardMaterial({ color, roughness: .88 });
const chalk = matte(0xe9e5d2);
const red = matte(0xb03937);
const teal = matte(0x33877a);
const grass = matte(0x567d53);
const olive = matte(0x527057);
const pine = matte(0x3e634d);
const timber = matte(0x9c7954);
const treeBark = matte(0x776649);
const paleSand = matte(0xe3d3a7);
const shale = matte(0x9f9d89);
const steel = matte(0x657779);
const barrier = matte(0xd0d4ca);
const roof = matte(0x243941);
const glass = new THREE.MeshStandardMaterial({ color: 0x49788a, metalness: .34, roughness: .24 });
const light = new THREE.MeshBasicMaterial({ color: 0xd8ede1 });

function randomGenerator(seed) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}

export function defineCircuit(kind) {
  const curve = new THREE.CatmullRomCurve3(layouts[kind].map(([x, z]) => new THREE.Vector3(x, 0, z)), true);
  curve.arcLengthDivisions = 1900;
  curve.updateArcLengths();
  const length = curve.getLength();
  const half = kind === 'race' ? 7.35 : 6.65;
  function sample(meters) {
    const t = ((meters % length) + length) % length / length;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    return { x: point.x, z: point.z, tx: tangent.x, tz: tangent.z,
      nx: -tangent.z, nz: tangent.x, yaw: Math.atan2(-tangent.x, -tangent.z) };
  }
  const checkpoints = Array.from({ length: 400 }, (_, index) => sample(index * length / 400));
  function locate(position) {
    let closest = 0;
    let best = Infinity;
    for (let index = 0; index < checkpoints.length; index++) {
      const point = checkpoints[index];
      const distance = (point.x - position.x) ** 2 + (point.z - position.z) ** 2;
      if (distance < best) {
        closest = index;
        best = distance;
      }
    }
    return { point: checkpoints[closest], offset: Math.sqrt(best), meters: closest * length / checkpoints.length };
  }
  return { kind, length, half, sample, locate, checkpoints };
}

function band(parent, route, material, edgeA, edgeB, y) {
  const points = route.checkpoints;
  const positions = [], indices = [], uv = [];
  for (let i = 0; i <= points.length; i++) {
    const p = points[i % points.length];
    for (const edge of [edgeA, edgeB]) {
      const side = typeof edge === 'function' ? edge(i % points.length) : edge;
      positions.push(p.x + p.nx * side, typeof y === 'function' ? y(i % points.length, side) : y, p.z + p.nz * side);
      uv.push((p.x + p.nx * side) * .19, (p.z + p.nz * side) * .19);
    }
    if (i) {
      const a = i * 2 - 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const strip = new THREE.Mesh(geo, material);
  strip.receiveShadow = true;
  parent.add(strip);
}

function grain(seed, color) {
  const rand = randomGenerator(seed);
  const data = new Uint8Array(128 * 128 * 4);
  for (let i = 0; i < data.length; i += 4) {
    const height = 159 + rand() * 58 + Math.sin(i * .77) * 10;
    data[i] = data[i + 1] = data[i + 2] = height;
    data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, 128, 128);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ color, map: texture, bumpMap: texture, bumpScale: .022, roughness: .89, side: THREE.DoubleSide });
}

function signMaterial(text, background, ink) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 512, 96);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, 500, 84);
  ctx.fillStyle = ink;
  ctx.font = '800 54px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 68, 464);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map });
}

const board = new THREE.PlaneGeometry();
function at(add, point, surface, lateral, up, along, width, height, depth, turn = 0, geometry) {
  add(surface, point.x + point.nx * lateral + point.tx * along, up,
    point.z + point.nz * lateral + point.tz * along, width, height, depth, point.yaw + turn, geometry);
}

function blockers(world, point, lateral, w, h, d) {
  const body = new Body({
    mass: 0, shape: new Box(new Vec3(w / 2, h / 2, d / 2)),
    position: new Vec3(point.x + point.nx * lateral, h / 2, point.z + point.nz * lateral),
  });
  body.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), point.yaw);
  world.addBody(body);
}

function buildRace(parent, world, route, add, rand) {
  const lawn = new THREE.Mesh(ground, grass);
  lawn.position.y = -.06;
  parent.add(lawn);
  const asphalt = grain(17, 0x5c666b);
  const runoff = grain(31, 0x559d8a);
  band(parent, route, runoff, -12.0, 12.0, -.027);
  band(parent, route, asphalt, -route.half, route.half, -.010);
  for (const side of [-1, 1]) {
    const edge = route.half * side;
    band(parent, route, chalk, edge - .09, edge + .09, .002);
  }
  const segments = Math.ceil(route.length / 2.64);
  for (let k = 0; k < segments; k++) {
    const spot = route.sample(k * route.length / segments);
    for (const side of [-1, 1]) at(add, spot, k % 2 ? chalk : red, side * 7.86, .013, 0, 1.02, .052, route.length / segments + .037);
  }
  const railSegments = Math.ceil(route.length / 5.5);
  const railLength = route.length / railSegments;
  for (let k = 0; k < railSegments; k++) {
    const p = route.sample(railLength * k);
    for (const side of [-1, 1]) {
      const x = side * (side === 1 && k < 16 ? 18 : 12.55);
      at(add, p, steel, x, .28, 0, .35, .56, railLength + .09);
      at(add, p, k % 5 === 0 ? red : barrier, x, .54, 0, .48, .15, railLength + .08);
      at(add, p, steel, x, .86, 0, .15, .86, .15);
      blockers(world, p, x, .46, .71, railLength + .02);
    }
  }
  const line = route.sample(7.5);
  for (let row = 0; row < 2; row++) for (let col = -9; col <= 9; col++) {
    at(add, line, (row + col) % 2 ? chalk : roof, col * .75, .009, row * .65, .753, .022, .655);
  }
  for (let grid = 0; grid < 7; grid++) {
    const p = route.sample(-grid * 6.6 - 4);
    at(add, p, chalk, grid % 2 ? -2.2 : 2.2, .005, 0, 2.76, .017, .10);
    for (const side of [-1, 1]) at(add, p, chalk, (grid % 2 ? -2.2 : 2.2) + side * 1.33, .005, .63, .10, .017, 1.37);
  }
  const apex = signMaterial('APEX CIRCUIT', '#1e323a', '#f1dfba');
  const pit = signMaterial('PIT LANE', '#263d43', '#f7d998');
  for (const atMeter of [-29, 18, 62]) {
    const p = route.sample(atMeter);
    for (let tier = 0; tier < 7; tier++) {
      at(add, p, tier % 3 === 0 ? red : steel, -19.3 - tier * 1.35, .79 + tier * .47, 0, 1.29, .38, 35);
      at(add, p, roof, -19.55 - tier * 1.35, 1.02 + tier * .47, 0, .11, .52, 35);
    }
    at(add, p, roof, -25.0, 5.72, 0, 11.8, .24, 36);
    at(add, p, red, -18.98, 5.72, 0, .16, .26, 36);
    for (const end of [-1, 1]) at(add, p, steel, -29.25, 2.59, end * 16.9, .2, 5.25, .22);
    at(add, p, apex, -18.84, 5.68, 0, 10.25, 1.04, 1, Math.PI / 2, board);
    at(add, p, roof, 24.5, 1.8, 0, 7.4, 3.6, 32);
    at(add, p, glass, 24.4, 4.19, 0, 7.6, 1.19, 31.6);
    at(add, p, barrier, 24.4, 4.9, 0, 8.0, .18, 33.2);
    for (const along of [-10, -5, 0, 5, 10]) {
      at(add, p, steel, 20.73, 1.45, along, .12, 2.74, 3.74);
      at(add, p, red, 20.61, 2.91, along, .17, .14, 3.83);
    }
    at(add, p, pit, 20.51, 3.27, 0, 9.2, .76, 1, -Math.PI / 2, board);
  }
  for (let i = 0; i < 145; i++) {
    const p = route.sample(rand() * route.length);
    const side = rand() > .58 ? 1 : -1;
    const lateral = side * (31 + rand() * 77);
    const h = 2.4 + rand() * 7.2;
    if (route.locate({ x: p.x + p.nx * lateral, z: p.z + p.nz * lateral }).offset < 19) continue;
    at(add, p, timber, lateral, h * .33, 0, .35, h * .70, .35, 0, post);
    at(add, p, i % 3 ? pine : olive, lateral, h * .72, 0, h * .73, h * .85, h * .69, i, pebble);
  }
  for (const meters of [3.5, 128, 212, 427, 640]) {
    const p = route.sample(meters);
    for (const side of [-1, 1]) {
      at(add, p, steel, side * 14, 4.4, 0, .19, 8.9, .25);
      at(add, p, roof, side * 13.2, 8.8, 0, 1.8, .24, .28);
      at(add, p, light, side * 12.4, 8.67, 0, .31, .09, .26);
    }
  }
}

const frond = new THREE.BufferGeometry();
frond.setAttribute('position', new THREE.Float32BufferAttribute([
  0, 0, 0, -.52, .045, -.40, -.82, -.01, -.73, -.06, -.21, -.98, .34, -.32, -1.12,
  .70, -.035, -.72, .49, .078, -.39, .02, .12, -.60,
], 3));
frond.setIndex([0,1,7, 1,2,7, 2,3,7, 3,4,7, 4,5,7, 5,6,7, 6,0,7]);
frond.computeVertexNormals();
const palmLeaf = new THREE.MeshStandardMaterial({ color: 0x447c50, roughness: .78, side: THREE.DoubleSide });
const palmTip = new THREE.MeshStandardMaterial({ color: 0x77974d, roughness: .82, side: THREE.DoubleSide });
const hill = matte(0x729266);
const waterline = -.37;
const coastWidth = i => 25 + Math.sin(i / 400 * Math.PI * 8) * 4.2 + Math.sin(i / 400 * Math.PI * 14) * 3.1;
const shoreHeight = distance => -3.5 * THREE.MathUtils.smoothstep(distance, -6, 26);

function distanceFromShore(route, position, nearest = route.locate(position)) {
  const { point, meters } = nearest;
  const outward = (position.x - point.x) * point.nx + (position.z - point.z) * point.nz;
  return outward - coastWidth(meters / route.length * 400);
}

function rallyGround(world, route) {
  const step = 2.5;
  const xs = route.checkpoints.map(point => point.x);
  const zs = route.checkpoints.map(point => point.z);
  const west = Math.min(...xs) - 63;
  const north = Math.max(...zs) + 63;
  const cols = Math.ceil((Math.max(...xs) + 63 - west) / step) + 1;
  const rows = Math.ceil((north - Math.min(...zs) + 63) / step) + 1;
  const pos = new THREE.Vector3();
  const samples = Array.from({ length: cols }, (_, i) => {
    pos.x = west + i * step;
    return Array.from({ length: rows }, (_, j) => {
      pos.z = north - j * step;
      return shoreHeight(distanceFromShore(route, pos));
    });
  });
  const body = new Body({
    mass: 0, shape: new Heightfield(samples, { elementSize: step, minValue: -3.5, maxValue: 0 }),
    position: new Vec3(west, 0, north),
  });
  body.quaternion.setFromAxisAngle(new Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(body);
}

function ocean(parent) {
  const surface = new THREE.ShaderMaterial({
    uniforms: { clock: { value: 0 } },
    vertexShader: 'varying vec2 p; void main(){p=position.xz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 p; uniform float clock; void main() {
      float a=sin(p.x*.139+p.y*.091-clock*1.08)+.55*sin(p.y*.25-p.x*.091+clock*1.3);
      float ripple=smoothstep(.35,1.5,a)*.51;
      float shallows=1.-smoothstep(125.,210.,length(p*vec2(.94,1.08)));
      vec3 color=mix(vec3(.055,.30,.41),vec3(.13,.62,.58),shallows);
      color+=ripple*vec3(.039,.105,.093);
      gl_FragColor=vec4(color,1.);
      #include <colorspace_fragment>
    }`,
  });
  const water = new THREE.Mesh(ground, surface);
  water.position.y = waterline;
  parent.add(water);
  return surface.uniforms.clock;
}

function buildRally(parent, route, add, rand) {
  const wave = ocean(parent);
  const sandTrack = grain(22, 0xb99566);
  const islandSand = grain(49, 0xebd4a5);
  band(parent, route, islandSand, -22.5, i => coastWidth(i) - 6, -.032);
  for (const [from, to] of [[-6, -3], [-3, 0], [0, 3], [3, 6], [6, 9], [9, 16]]) {
    band(parent, route, from < -3 ? islandSand : paleSand, i => coastWidth(i) + from,
      i => coastWidth(i) + to, (i, side) => shoreHeight(side - coastWidth(i)) - .032);
  }
  const foam = new THREE.MeshBasicMaterial({ color: 0xe7f7e5, transparent: true, opacity: .57, depthWrite: false });
  band(parent, route, foam, i => coastWidth(i) + .77 + Math.sin(i * .24) * .36,
    i => coastWidth(i) + 1.29 + Math.sin(i * .24) * .36, waterline + .015);
  band(parent, route, sandTrack,
    i => -route.half - Math.sin(i / 400 * Math.PI * 46) * .27,
    i => route.half + Math.sin(i / 400 * Math.PI * 38) * .35, -.014);

  const inland = new THREE.Shape(route.checkpoints.map(p => new THREE.Vector2(p.x - p.nx * 20.5, -p.z + p.nz * 20.5)));
  const center = new THREE.Mesh(new THREE.ShapeGeometry(inland).rotateX(-Math.PI / 2), hill);
  center.position.y = -.074;
  parent.add(center);
  for (let i = 0; i < 24; i++) {
    const a = rand() * Math.PI * 2;
    const r = 7 + rand() * 61;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const size = 7 + rand() * 17;
    if (route.locate({ x, z }).offset < 22) continue;
    add(i % 3 ? hill : shale, x, -.72, z, size * (1 + rand()), size * .98, size * 1.25, a, pebble);
  }
  for (let i = 0; i < 136; i++) {
    const p = route.sample(rand() * route.length);
    const lateral = rand() < .33 ? 17 + rand() * 4 : -(11 + rand() * 45);
    if (route.locate({ x: p.x + p.nx * lateral, z: p.z + p.nz * lateral }).offset < 10) continue;
    const h = 3.3 + rand() * 5.3;
    at(add, p, treeBark, lateral, h * .48, 0, .28, h, .30, 0, post);
    for (let leaf = 0; leaf < 6; leaf++) {
      at(add, p, leaf % 3 ? palmLeaf : palmTip, lateral, h * .97, 0, h * .60, h * .51, h * .58, leaf * Math.PI / 3 + i, frond);
    }
    if (i % 3 === 0) at(add, p, shale, lateral - 1.35, .47, 1.75, 1.79, 1.35, 1.47, i, pebble);
  }
  const label = signMaterial('BEACH RALLY', '#594535', '#ffe0a9');
  for (const meter of [-10, 148, 293, 484, 656]) {
    const p = route.sample(meter);
    for (const side of [-1, 1]) {
      at(add, p, timber, 13 + side * 2.1, 1.60, -2, .14, 3.2, .16);
      at(add, p, timber, 13 + side * 2.1, 1.60, 2, .14, 3.2, .16);
    }
    at(add, p, meter % 2 ? teal : red, 13, 3.24, 0, 4.7, .20, 4.9);
    at(add, p, timber, 13, .15, 0, 4.55, .26, 4.55);
    at(add, p, label, 13, 2.80, -2.37, 3.7, .61, 1, 0, board);
    for (const side of [-1, 1]) at(add, p, chalk, 13 + side * 1.8, .63, .25, .51, .23, 3.03);
  }
  for (let i = 0; i < route.length / 8; i++) {
    const p = route.sample(i * 8);
    for (const side of [-1, 1]) {
      at(add, p, timber, side * 7.7, .36, 0, .117, .72, .117);
      at(add, p, i % 2 ? red : chalk, side * 7.7, .66, 0, .133, .12, .137);
    }
  }
  return wave;
}

export function createCourse(scene, world, kind) {
  const route = defineCircuit(kind);
  const scenery = new THREE.Group();
  scene.add(scenery);
  const { add, commit } = makeBatches(scenery);
  const rand = randomGenerator(kind === 'race' ? 27 : 53);
  const crates = [];
  const queue = [];
  const collected = new Set();
  function addCrate(x, z, size) {
    const crate = createCrate(scenery, x, z, size, { id: crates.length });
    crate.collider.addEventListener('collide', crateCollision(crate, event => queue.push(event)));
    world.addBody(crate.collider);
    crates.push(crate);
  }
  let water;
  const ripples = [];
  if (kind === 'race') {
    buildRace(scenery, world, route, add, rand);
    world.addBody(new Body({ mass: 0, shape: new Box(new Vec3(530, .20, 530)), position: new Vec3(0, -.20, 0) }));
  } else {
    water = buildRally(scenery, route, add, rand);
    rallyGround(world, route);
    buildRallyObstacles(scenery, world, route, add, addCrate);
    const ring = new THREE.RingGeometry(.82, 1, 27).rotateX(-Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: 0xdff8f2, transparent: true, opacity: 0, depthWrite: false }));
      mesh.visible = false;
      scenery.add(mesh);
      ripples.push(mesh);
    }
  }
  commit();
  for (let n = 0; n < Math.floor(route.length / 64); n++) {
    const p = route.sample(49 + n * 64);
    const lane = n === 0 ? 0 : n % 3 === 0 ? 2.3 : n % 3 === 1 ? -2.1 : 0;
    addCrate(p.x + p.nx * lane, p.z + p.nz * lane, .98 + rand() * .15);
  }
  const start = route.sample(0);
  const rayStart = new Vec3();
  const rayEnd = new Vec3();
  const groundHit = new RaycastResult();
  let closest = { point: start, meters: 0, offset: 0 };
  let shore = -100;
  return {
    route, start,
    sync(position) {
      closest = route.locate(position);
      if (water) shore = distanceFromShore(route, position, closest);
    },
    wade(body, dt) {
      if (!water || shore <= .3 || body.position.y > .95) return;
      const drag = Math.exp(-dt * THREE.MathUtils.smoothstep(shore, .3, 9.3) * 2.05);
      body.velocity.x *= drag;
      body.velocity.z *= drag;
    },
    update(time, position, motion, _dt, speed = 0) {
      if (water) water.value = motion ? time : 0;
      for (const [index, ripple] of ripples.entries()) {
        ripple.visible = motion && shore > .30 && shore < 10 && position.y < .95 && speed > .55;
        if (!ripple.visible) continue;
        const phase = (time * 1.25 + index / ripples.length) % 1;
        ripple.position.set(position.x, waterline + .025, position.z);
        ripple.scale.set(1.15 + phase * 2.8, 1, 1.15 + phase * 2.8);
        ripple.material.opacity = (1 - phase) * .41;
      }
      for (const crate of crates) {
        if (crate.spent && time - crate.brokenAt > 8 && Math.hypot(position.x - crate.x, position.z - crate.z) > 35) restoreCrate(world, crate);
      }
    },
    process(time, onBlast) {
      for (const impact of queue.splice(0)) {
        if (impact.target.spent) continue;
        impact.target.brokenAt = time;
        onBlast(breakCrate(world, collected, impact));
      }
    },
    resetCrates() { for (const crate of crates) restoreCrate(world, crate); },
    safeLanding(x, z) {
      const { point } = route.locate({ x, z });
      return [point.x, point.z, null, point.yaw];
    },
    groundHeight(position) {
      rayStart.set(position.x, position.y + .4, position.z);
      rayEnd.set(position.x, -4, position.z);
      return world.raycastClosest(rayStart, rayEnd, { collisionFilterMask: 1, skipBackfaces: true }, groundHit)
        ? groundHit.hitPointWorld.y : 0;
    },
    offCourse() { return water ? shore > 9.3 : closest.offset > 43; },
  };
}
