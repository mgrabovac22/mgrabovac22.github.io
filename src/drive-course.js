import * as THREE from 'three';
import { Body, Box, RaycastResult, Vec3 } from 'cannon-es';
import { breakCrate, crateCollision, createCourseCrateSweep, createCrate, restoreCrate } from './drive-crates.js';
import { makeBatches } from './drive-city.js';
import { buildRallyObstacles } from './drive-rally-obstacles.js';
import { buildRallyTerrain, rallyBridges, rallyJumps, waterline } from './drive-rally-terrain.js';
import { buildRallyScenery } from './drive-rally-scenery.js';
import { createRallyProps } from './drive-rally-props.js';
import { buildRaceDistrict, buildRaceFence, createRaceGrid } from './drive-race.js';
import { createRallyHunt, rallyHuntSites } from './drive-rally-hunt.js';
export { RallyPhysicsWorld } from './drive-rally-props.js';

const layouts = {
  race: [[108, 48], [105, -31], [105, -111], [66, -152], [-21, -151], [-48, -121], [-33, -94], [-40, -75], [-60, -65],
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
const steel = matte(0x657779);
const barrier = matte(0xd0d4ca);
const roof = matte(0x243941);
const glass = new THREE.MeshStandardMaterial({ color: 0x49788a, metalness: .34, roughness: .24 });
const light = new THREE.MeshBasicMaterial({ color: 0xd8ede1 });
const crossings = [...rallyJumps.map(({ meters }) => meters), ...rallyBridges];

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
  function separation(a, b) {
    const difference = Math.abs(a - b) % length;
    return Math.min(difference, length - difference);
  }
  function boardStations(count) {
    const eligible = [];
    for (let meters = 25; meters < length - 5; meters += 2) {
      if (crossings.every(crossing => separation(crossing, meters) >= 23)) eligible.push(meters);
    }
    return Array.from({ length: count }, (_, i) => eligible[Math.floor(i * eligible.length / count)]);
  }
  return { kind, length, half, sample, locate, separation, boardStations, checkpoints };
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
  buildRaceFence(route, world, add);
  buildRaceDistrict(route, add, rand, signMaterial);
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

function ocean(parent, terrain) {
  const surface = new THREE.ShaderMaterial({
    uniforms: { clock: { value: 0 }, depthMap: { value: terrain.depthMap }, bounds: { value: terrain.bounds } },
    vertexShader: 'varying vec2 p; void main(){p=position.xz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: /* glsl */`varying vec2 p; uniform float clock; uniform vec4 bounds; uniform sampler2D depthMap;
      void main() {
        vec2 uv=vec2((p.x-bounds.x)/bounds.z,(bounds.y-p.y)/bounds.w);
        float outside=step(uv.x,0.)+step(1.,uv.x)+step(uv.y,0.)+step(1.,uv.y);
        float bed=outside>0.?0.:texture2D(depthMap,uv).r;
        float depth=max(0.,3.08-bed*3.45);
        float a=sin(p.x*.29+p.y*.19-clock*1.55)+.53*sin(p.y*.49-p.x*.14+clock*1.93);
        float ripple=smoothstep(.52,1.50,a);
        float shimmer=sin(p.x*.93-p.y*.27+a+clock*.51)*sin(p.y*.85+p.x*.33+clock*.81);
        vec3 color=mix(vec3(.036,.24,.35),vec3(.15,.61,.51),1.-smoothstep(.18,2.9,depth));
        color+=ripple*vec3(.022,.073,.055);
        color+=max(shimmer-.52,0.)*.097*(1.-smoothstep(.25,2.06,depth));
        float foam=1.-smoothstep(.065,.229,abs(depth-.095+a*.065));
        color=mix(color,vec3(.79,.92,.79),foam*(.49+ripple*.34));
        gl_FragColor=vec4(color,1.);
        #include <colorspace_fragment>
      }`,
  });
  const water = new THREE.Mesh(ground, surface);
  water.position.y = waterline;
  parent.add(water);
  return surface.uniforms.clock;
}

function buildRally(parent, world, route, add, rand, stops) {
  const terrain = buildRallyTerrain(parent, world, route);
  const props = createRallyProps(parent, world, terrain, rand);
  const wave = ocean(parent, terrain);
  const sandTrack = grain(22, 0xb99566);
  const lanes = [-route.half, -3.3, 0, 3.3, route.half];
  for (let i = 1; i < lanes.length; i++) band(parent, route, sandTrack, lanes[i - 1], lanes[i], (index, side) => {
    const p = route.checkpoints[index];
    return terrain.height(p.x + p.nx * side, p.z + p.nz * side) + .012;
  });
  buildRallyObstacles(parent, world, route, add, props);
  const sites = rallyHuntSites(route);
  const huntPoints = [...Object.values(sites.stops), ...Object.values(sites.runes), ...sites.gates];
  const keepClear = (x, z) => huntPoints.some(point =>
    Math.hypot(point.x - x, point.z - z) < 4);
  const surroundings = buildRallyScenery(parent, props, route, terrain, add, rand, stops, signMaterial, keepClear);
  props.commit();
  const hunt = createRallyHunt(parent, world, route, terrain, sites);
  return { terrain, wave, props, hunt, ...surroundings };
}

export function createCourse(scene, world, kind, stops = new Map()) {
  const route = defineCircuit(kind);
  const scenery = new THREE.Group();
  scene.add(scenery);
  const { add, commit } = makeBatches(scenery);
  const rand = randomGenerator(kind === 'race' ? 27 : 53);
  const crates = [];
  const queue = [];
  const collected = new Set();
  const crateSweep = createCourseCrateSweep();
  let activeDriver;
  function addCrate(x, z, size) {
    const crate = createCrate(scenery, x, z, size, { id: crates.length });
    crate.collider.addEventListener('collide', crateCollision(crate, event => queue.push(event), 0));
    world.addBody(crate.collider);
    crates.push(crate);
  }
  let island;
  let grid;
  const ripples = [];
  if (kind === 'race') {
    buildRace(scenery, world, route, add, rand);
    world.addBody(new Body({ mass: 0, shape: new Box(new Vec3(530, .20, 530)), position: new Vec3(0, -.20, 0) }));
    grid = createRaceGrid(scenery, world, route);
  } else {
    island = buildRally(scenery, world, route, add, rand, stops);
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
    const station = 49 + n * 64;
    if (island && crossings.some(meters => route.separation(meters, station) < 27)) continue;
    const p = route.sample(station);
    const lane = island ? (n % 2 ? 4.85 : -4.85) : n === 0 ? 0 : n % 3 === 0 ? 2.3 : n % 3 === 1 ? -2.1 : 0;
    addCrate(p.x + p.nx * lane, p.z + p.nz * lane, .98 + rand() * .15);
  }
  const start = route.sample(0);
  if (island) {
    const entry = route.sample(rallyJumps[0].meters + 4);
    start.yaw = Math.atan2(start.x - entry.x, start.z - entry.z);
  }
  const rayStart = new Vec3();
  const rayEnd = new Vec3();
  const groundHit = new RaycastResult();
  let closest = { point: start, meters: 0, offset: 0 };
  let depth = 0;
  return {
    route, start, grid, hunt: island?.hunt,
    sync(position) {
      closest = route.locate(position);
      if (island) {
        depth = waterline - island.terrain.height(position.x, position.z);
        island.props.sync(position);
      }
    },
    wade(body, dt) {
      if (!island || depth <= .02 || body.position.y > .88) return;
      const drag = Math.exp(-dt * THREE.MathUtils.smoothstep(depth, .02, 1.10) * 2.05);
      body.velocity.x *= drag;
      body.velocity.z *= drag;
    },
    update(time, position, motion, dt = 0, speed = 0) {
      if (island) {
        island.wave.value = motion ? time : 0;
        island.animate(motion ? time : 0, position);
        island.props.update(dt, motion);
        island.hunt.render(time, dt, motion, position);
      }
      for (const [index, ripple] of ripples.entries()) {
        ripple.visible = motion && depth > .02 && position.y < .88 && speed > .55;
        if (!ripple.visible) continue;
        const phase = (time * 1.25 + index / ripples.length) % 1;
        ripple.position.set(position.x, waterline + .025, position.z);
        ripple.scale.set(1.15 + phase * 2.8, 1, 1.15 + phase * 2.8);
        ripple.material.opacity = (1 - phase) * .41;
      }
      if (activeDriver) for (const crate of crates) {
        if (crate.spent && time - crate.brokenAt > 8 && Math.hypot(position.x - crate.x, position.z - crate.z) > 35) restoreCrate(world, crate);
      }
    },
    process(time, onBlast) {
      for (const crate of crates) {
        const hit = crateSweep.hit(crate);
        if (hit) queue.push(hit);
      }
      for (const impact of queue.splice(0)) {
        if (impact.target.spent || impact.driver !== activeDriver) continue;
        impact.target.brokenAt = time;
        onBlast(breakCrate(world, collected, impact));
      }
    },
    reset() {
      for (const crate of crates) restoreCrate(world, crate);
      island?.props.reset(start);
      island?.hunt.cancelTrail();
    },
    safeLanding(x, z) {
      const { point, meters } = route.locate({ x, z });
      if (!island) return [point.x, point.z, null, point.yaw];
      for (const offset of [0, -15, 15, -26, 26, -39, 39]) {
        const station = meters + offset;
        if (crossings.some(crossing => route.separation(crossing, station) < 23)) continue;
        const safe = route.sample(station);
        if (island.terrain.height(safe.x, safe.z) > -.18) return [safe.x, safe.z, null, safe.yaw];
      }
      return [start.x, start.z, null, start.yaw];
    },
    groundHeight(position) {
      rayStart.set(position.x, position.y + .4, position.z);
      rayEnd.set(position.x, -4, position.z);
      return world.raycastClosest(rayStart, rayEnd, { collisionFilterMask: 1, skipBackfaces: true }, groundHit)
        ? groundHit.hitPointWorld.y : 0;
    },
    takeArrival(body) { return island?.takeArrival(body); },
    advance(dt, car) {
      activeDriver = car?.chassis;
      if (!activeDriver) return;
      crateSweep.begin(car);
      if (grid && dt > 0) grid.advance(dt, activeDriver.position, closest.meters);
    },
    walkSurface(x, z, above) {
      rayStart.set(x, above, z);
      rayEnd.set(x, -4, z);
      if (!world.raycastClosest(rayStart, rayEnd, { collisionFilterMask: 1, skipBackfaces: true }, groundHit)) return null;
      return groundHit.hitNormalWorld.y > .62 && groundHit.hitPointWorld.y > waterline - .17 ? groundHit.hitPointWorld.y : null;
    },
    offCourse(position) { return island ? depth > 1.08 && position.y < .27 : closest.offset > 13.8; },
  };
}
