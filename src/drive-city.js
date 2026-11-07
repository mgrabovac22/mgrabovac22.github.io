import * as THREE from 'three';
import { Body, Box, PointToPointConstraint, Sphere, Vec3 } from 'cannon-es';

export const blockSize = 44;
const road = 11.6;
const boxGeometry = new THREE.BoxGeometry();
const orbGeometry = new THREE.SphereGeometry(.5, 9, 7);
const material = (color, roughness = .83) => new THREE.MeshStandardMaterial({ color, roughness });
const luminous = color => new THREE.MeshBasicMaterial({ color });
const assets = {
  asphalt: material(0x293943), curb: material(0x829199), slab: material(0x4c6069),
  roof: material(0x455966), steel: material(0x344a55), silver: material(0x8c9eab), trim: material(0x526974),
  paint: material(0xa8c0bf), amber: material(0xcdab64), dirt: material(0x34423b), leaf: material(0x455e55),
  leafLight: material(0x6b8171), trunk: material(0x4a4438), glass: material(0x548b9c, .29),
  amberLight: luminous(0xffdc98), cyan: luminous(0x91e8ff), signal: luminous(0xff7e62),
  green: luminous(0xc9ff82), coat: material(0x789ea9), face: material(0xc6a88d),
  trousers: material(0x344457), crate: material(0x805844), crateEdge: material(0xd29961),
};

function seeded(i, j) {
  let n = Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ 479107;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

function textureCanvas(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

function facade(style) {
  const random = seeded(style + 1, 7);
  return new THREE.MeshStandardMaterial({ roughness: .82, map: textureCanvas(128, 256, ctx => {
    const walls = ['#677b85', '#797d85', '#4e6878', '#536872'];
    ctx.fillStyle = walls[style];
    ctx.fillRect(0, 0, 128, 256);
    for (let row = 0; row < 10; row++) {
      const y = 3 + row * 25;
      ctx.fillStyle = '#242f36';
      ctx.fillRect(0, y + 20, 128, 3);
      for (let column = 0; column < 5; column++) {
        const x = 4 + column * 25;
        const lit = random();
        ctx.fillStyle = '#293b47';
        ctx.fillRect(x, y, 20, 19);
        ctx.fillStyle = lit < .22 ? '#e2c997' : lit < .43 ? '#91c3c9' : '#3a5665';
        ctx.fillRect(x + 2, y + 2, 16, 14);
        ctx.fillStyle = '#314650';
        ctx.fillRect(x + 9, y + 2, 1, 14);
        ctx.fillRect(x + 2, y + 8, 16, 1);
      }
    }
  }) });
}

const stationNames = [
  ['Riverside', 'Obala'], ['Market Line', 'Tržnica'], ['Central Exchange', 'Središnja postaja'],
  ['Foundry', 'Ljevaonica'], ['Glass Quarter', 'Staklena četvrt'], ['West Yard', 'Zapadni kolodvor'],
];

function isStation(i, j) {
  return (i !== 0 || j !== 0) && ((Math.abs(i) + Math.abs(j)) % 3 === 1 || i === 0 && j === -2);
}
const stationKey = (i, j) => i + ':' + j;

function makeBatches(parent) {
  const entries = new Map();
  const transform = new THREE.Object3D();
  function add(surface, x, y, z, w, h, d, rotation = 0, geometry = boxGeometry) {
    if (!entries.has(surface)) entries.set(surface, { geometry, items: [] });
    entries.get(surface).items.push([x, y, z, w, h, d, rotation]);
  }
  function commit() {
    for (const [surface, { geometry, items }] of entries) {
      const mesh = new THREE.InstancedMesh(geometry, surface, items.length);
      items.forEach(([x, y, z, w, h, d, rotation], index) => {
        transform.position.set(x, y, z);
        transform.scale.set(w, h, d);
        transform.rotation.set(0, rotation, 0);
        transform.updateMatrix();
        mesh.setMatrixAt(index, transform.matrix);
      });
      mesh.computeBoundingSphere();
      parent.add(mesh);
    }
  }
  return { add, commit };
}

function mesh(parent, surface, w, h, d, x = 0, y = 0, z = 0, geometry = boxGeometry) {
  const object = new THREE.Mesh(geometry, surface);
  object.position.set(x, y, z);
  object.scale.set(w, h, d);
  parent.add(object);
  return object;
}

function createCrate(parent, x, z, size) {
  const view = new THREE.Group();
  parent.add(view);
  view.position.set(x, size / 2 + .035, z);
  mesh(view, assets.crate, size, size, size);
  for (const side of [-1, 1]) {
    mesh(view, assets.crateEdge, size * 1.035, size * .075, size * 1.035, 0, side * size * .43, 0);
    mesh(view, assets.crateEdge, size * .105, size * .91, size * 1.036, side * size * .35);
  }
  const marking = mesh(view, assets.amberLight, size * .62, size * .065, .01, 0, 0, size * .51);
  marking.rotation.z = .37;
  const collider = new Body({ mass: 0, shape: new Box(new Vec3(size / 2, size / 2, size / 2)) });
  collider.position.set(x, size / 2, z);
  return { view, collider, x, z, spent: false };
}

const personParts = [
  [assets.coat, .38, .58, .23, 0, 1.24, 0],
  [assets.face, .24, .28, .23, 0, 1.72, 0, orbGeometry],
  [assets.coat, .115, .55, .122, -.254, 1.20, 0],
  [assets.coat, .115, .55, .122, .254, 1.20, 0],
  [assets.trousers, .151, .65, .165, -.104, .57, 0],
  [assets.trousers, .151, .65, .165, .104, .57, 0],
];

function createWalker(parent, x, z, axis, direction, phase) {
  const view = new THREE.Group();
  parent.add(view);
  const parts = personParts.map(([surface, w, h, d, px, py, pz, geometry]) =>
    mesh(view, surface, w, h, d, px, py, pz, geometry));
  for (const side of [-1, 1]) mesh(parts[side < 0 ? 4 : 5], assets.steel, 1.12, .21, 1.65, 0, -.47, .24);
  if (phase % 2 > 1) mesh(parts[0], assets.amber, .80, .80, .39, 0, 0, -.58);
  const collider = new Body({ type: Body.KINEMATIC, shape: new Box(new Vec3(.27, .84, .21)) });
  collider.position.set(x, .86, z);
  return { view, parts, collider, x, z, axis, direction, phase, knocked: false, near: false };
}

function updateWalker(walker, time) {
  const pace = time * .15 + walker.phase;
  const stride = 1 - Math.abs(pace % 2 - 1);
  const facing = (pace % 2 < 1 ? 1 : -1) * walker.direction;
  const offset = (stride - .5) * 21 * walker.direction;
  const gait = Math.sin(time * 7.8 + walker.phase * 10);
  const x = walker.x + (walker.axis === 0 ? offset : 0);
  const z = walker.z + (walker.axis === 1 ? offset : 0);
  walker.view.position.set(x, .15 + Math.abs(gait) * .042, z);
  walker.view.rotation.y = walker.axis === 0 ? facing * Math.PI / 2 : facing > 0 ? 0 : Math.PI;
  walker.parts[2].rotation.x = gait * .53;
  walker.parts[3].rotation.x = -gait * .53;
  walker.parts[4].rotation.x = -gait * .58;
  walker.parts[5].rotation.x = gait * .58;
  walker.parts[4].position.z = gait * .15;
  walker.parts[5].position.z = -gait * .15;
  walker.collider.position.set(x, .94, z);
  walker.collider.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), walker.view.rotation.y);
  walker.collider.aabbNeedsUpdate = true;
}

function ragdoll(scene, world, walker, impact, now) {
  const group = new THREE.Group();
  scene.add(group);
  walker.view.updateWorldMatrix(true, true);
  const limbs = personParts.map(([surface, w, h, d, , , , geometry], index) => {
    const object = mesh(group, surface, w, h, d, 0, 0, 0, geometry);
    const shape = geometry ? new Sphere(.13) : new Box(new Vec3(w / 2, h / 2, d / 2));
    const body = new Body({ mass: index === 0 ? 6 : 2, shape, linearDamping: .20, angularDamping: .22,
      collisionFilterGroup: 2, collisionFilterMask: 1 });
    body.position.copy(walker.parts[index].getWorldPosition(new THREE.Vector3()));
    body.quaternion.copy(walker.parts[index].getWorldQuaternion(new THREE.Quaternion()));
    body.velocity.set(impact.x, 2.2 + index * .12, impact.z);
    body.angularVelocity.set(1.5, index * .32, 1.2 - index * .27);
    world.addBody(body);
    return { object, body };
  });
  const torso = limbs[0].body;
  const joints = [
    [[0, .30, 0], [0, -.12, 0]], [[-.19, .22, 0], [0, .21, 0]],
    [[.19, .22, 0], [0, .21, 0]], [[-.105, -.28, 0], [0, .30, 0]], [[.105, -.28, 0], [0, .30, 0]],
  ].map(([a, b], i) => {
    const joint = new PointToPointConstraint(torso, new Vec3(...a), limbs[i + 1].body, new Vec3(...b), 900);
    joint.collideConnected = false;
    world.addConstraint(joint);
    return joint;
  });
  return { group, limbs, joints, expires: now + 6.5, walker };
}

export function createCity(scene, world, car, language, isCompact) {
  const blocks = new Map();
  const facades = [0, 1, 2, 3].map(facade);
  const ragdolls = [];
  const queue = [];
  const visited = new Set();
  const stampGeometry = new THREE.PlaneGeometry(3.8, 1.14);
  const glowGeometry = new THREE.TorusGeometry(2.25, .049, 6, 44);
  const beaconGeometry = new THREE.OctahedronGeometry(.36);
  const signalGreen = luminous(0xc9ff82);
  const signalRed = luminous(0xff7358);
  const signMaterials = new Map();
  const warmPool = new THREE.MeshBasicMaterial({
    map: textureCanvas(64, 64, ctx => {
      const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      glow.addColorStop(0, '#ffd58b74');
      glow.addColorStop(1, '#ffd58b00');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 64, 64);
    }),
    transparent: true, depthWrite: false,
  });
  const groundLight = new THREE.PlaneGeometry().rotateX(-Math.PI / 2);
  const listener = (kind, target) => event => {
    if (event.body === car && !target.spent && !target.knocked && car.velocity.length() >= 1.6) {
      queue.push({ kind, target, impact: car.velocity.clone() });
    }
  };

  function build(i, j) {
    const parent = new THREE.Group();
    const x = i * blockSize;
    const z = j * blockSize;
    parent.position.set(x, 0, z);
    scene.add(parent);
    const random = seeded(i, j);
    const batches = makeBatches(parent);
    const { add } = batches;
    const colliders = [];
    const crates = [];
    const walkers = [];
    function collider(cx, cz, width, height, depth, y = height / 2) {
      const body = new Body({ mass: 0, shape: new Box(new Vec3(width / 2, height / 2, depth / 2)) });
      body.position.set(x + cx, y, z + cz);
      colliders.push(body);
    }

    add(assets.asphalt, 22, -.045, 22, 44, .07, 44);
    const midpoint = blockSize / 2;
    collider(midpoint, midpoint, blockSize, .5, blockSize, -.25);
    const sidewalk = blockSize - road;
    add(assets.curb, midpoint, .073, midpoint, sidewalk, .165, sidewalk);
    add(assets.slab, midpoint, .159, midpoint, sidewalk - .4, .02, sidewalk - .4);
    collider(midpoint, midpoint, sidewalk, .155, sidewalk);
    for (let p = 9; p <= 36; p += 6) {
      add(assets.amber, 0, .012, p, .105, .018, 2.6);
      add(assets.amber, p, .012, 0, 2.6, .018, .105);
      add(assets.paint, 5.42, .009, p, .072, .012, 5.15);
      add(assets.paint, p, .009, 5.42, 5.15, .012, .072);
      if (p % 4 === 1) {
        add(assets.trim, 5.55, .022, p - 1.72, .25, .034, .73);
        add(assets.trim, p - 1.72, .022, 5.55, .73, .034, .25);
      }
    }
    for (let stripe = -4; stripe <= 4; stripe++) {
      for (const direction of [-1, 1]) {
        add(assets.paint, stripe * 1.08, .015, direction * 6.7, .56, .021, 1.64);
        add(assets.paint, direction * 6.7, .016, stripe * 1.08, 1.64, .021, .56);
      }
    }
    for (const [bx, bz] of [[15, 15], [29, 15], [15, 29], [29, 29]]) {
      if (random() < .19) {
        add(assets.dirt, bx, .181, bz, 9.3, .03, 9.3);
        for (const tx of [-2.7, 2.7]) {
          add(assets.trunk, bx + tx, 1.24, bz, .29, 2.25, .29);
          add(assets.leafLight, bx + tx, 3.03, bz, 3.35, 2.9, 2.98, 0, orbGeometry);
        }
        add(assets.steel, bx, .44, bz + 3.6, 2.5, .41, .43);
        continue;
      }
      const w = 9.4 + random() * 3.2;
      const d = 9.4 + random() * 3.2;
      const height = 7 + random() * 16 + (random() > .72 ? random() * 16 : 0);
      const color = facades[Math.floor(random() * facades.length)];
      add(color, bx, height / 2 + .17, bz, w, height, d);
      add(assets.steel, bx, 1.33, bz, w + .14, 2.3, d + .14);
      add(assets.roof, bx, height + .43, bz, w + .44, .52, d + .44);
      add(assets.silver, bx - w * .19, height + .88, bz, 2.6, .52, 1.9);
      add(assets.trim, bx + w * .21, height + 1.08, bz + d * .23, 1.4, .93, 2.6);
      add(assets.glass, bx, 1.31, bz - d / 2 - .09, w * .62, 1.68, .08);
      add(assets.amberLight, bx, 2.32, bz - d / 2 - .13, w * .58, .07, .13);
      add(assets.glass, bx - w / 2 - .09, 1.31, bz, .08, 1.68, d * .61);
      add(assets.trim, bx - w / 2 - .48, 2.36, bz, .96, .13, d * .75);
      add(assets.cyan, bx - w / 2 - .93, 2.35, bz, .10, .065, d * .71);
      for (const side of [-1, 1]) {
        add(assets.trim, bx + side * w * .43, height / 2 + .17, bz - d / 2, .16, height, .25);
        add(assets.trim, bx - w / 2, height / 2 + .17, bz + side * d * .43, .25, height, .16);
      }
      if (height > 22) {
        add(assets.silver, bx + 1.5, height + 1.82, bz - 2, .11, 2.7, .11);
        add(assets.signal, bx + 1.5, height + 3.19, bz - 2, .19, .14, .19);
        add(assets.cyan, bx, height + .41, bz - d / 2 - .28, w * .68, .075, .08);
      }
      collider(bx, bz, w + .13, height + .45, d + .13);
    }
    for (const k of [9, 22, 35]) {
      add(assets.steel, 6.23, 2.1, k, .17, 3.91, .17);
      add(assets.steel, 5.65, 4.08, k, 1.36, .11, .16);
      add(assets.amberLight, 5.02, 3.99, k, .44, .095, .34);
      if (!isCompact) add(warmPool, 4.7, .034, k, 6.8, 1, 8.6, 0, groundLight);
      add(assets.trunk, k, 1.33, 6.96, .22, 2.4, .22);
      add(assets.leaf, k, 2.75, 6.96, 2.19, 2.34, 1.85, 0, orbGeometry);
      add(assets.steel, k, .44, 7.8, 1.64, .43, .37);
      add(assets.silver, k, .69, 7.99, 1.68, .26, .07);
      add(assets.steel, 6.93, .47, k + 2, .56, .60, .51);
      add(assets.silver, 6.93, .80, k + 2, .61, .10, .56);
      add(assets.curb, 8.25, .196, k + 1.4, 1.56, .061, 1.18);
      add(assets.dirt, 8.25, .24, k + 1.4, 1.41, .061, 1.03);
    }
    for (const [cx, cz] of [[6.12, 6.04], [-6.12, -6.04]]) {
      add(assets.steel, cx, 1.65, cz, .15, 3.29, .15);
      add(assets.steel, cx, 2.78, cz, .38, .77, .28);
      add(signalRed, cx, 2.98, cz, .17, .13, .297);
      add(signalGreen, cx, 2.60, cz, .17, .13, .297);
    }
    for (const [cx, cz] of [[5.05, 11 + random() * 13], [25 + random() * 9, 5.1], [7.48, 29]]) {
      crates.push(createCrate(parent, cx, cz, .79 + random() * .19));
    }
    if (i === 0 && j === -1) crates.push(createCrate(parent, 3, 22, 1.03));
    walkers.push(createWalker(parent, 6.68, i === 0 && j === 0 ? 16 : 22, 1, 1,
      i === 0 && j === 0 ? .98 : random() * 2));
    walkers.push(createWalker(parent, 23, 6.73, 0, -1, random() * 2 + .3));
    if (!isCompact && random() > .39) walkers.push(createWalker(parent, 37.05, 22, 1, -1, random() * 2 + .3));

    let station = null;
    if (isStation(i, j)) {
      const key = stationKey(i, j);
      const label = stationNames[(Math.abs(i * 13 + j * 7) + Math.abs(j * 3)) % stationNames.length][language === 'hr' ? 1 : 0];
      const sign = new THREE.Group();
      sign.position.set(6.98, 3.11, 1.22);
      parent.add(sign);
      mesh(sign, assets.steel, .13, 2.72, .13, 0, -1.30);
      mesh(sign, assets.steel, 3.95, 1.27, .21);
      if (!signMaterials.has(label)) {
        const map = textureCanvas(384, 112, ctx => {
          ctx.fillStyle = '#20343f';
          ctx.fillRect(0, 0, 384, 112);
          ctx.fillStyle = '#d7ff8e';
          ctx.fillRect(0, 0, 384, 8);
          ctx.font = 'bold 34px sans-serif';
          ctx.fillText(label.toUpperCase(), 20, 57, 344);
          ctx.fillStyle = '#b4d4de';
          ctx.font = 'bold 21px monospace';
          ctx.fillText(language === 'hr' ? 'POSTAJA  /  MG' : 'CHECKPOINT  /  MG', 20, 90);
        });
        signMaterials.set(label, new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }));
      }
      const panel = new THREE.Mesh(stampGeometry, signMaterials.get(label));
      panel.position.z = .113;
      sign.add(panel);
      sign.rotation.y = -.18;
      const ring = new THREE.Mesh(glowGeometry, assets.green);
      ring.position.set(2.83, .066, 2.5);
      ring.rotation.x = -Math.PI / 2;
      parent.add(ring);
      const beacon = new THREE.Mesh(beaconGeometry, assets.green);
      beacon.position.set(2.83, 1.65, 2.5);
      parent.add(beacon);
      const courier = new THREE.Group();
      parent.add(courier);
      mesh(courier, assets.silver, .61, .22, .72);
      mesh(courier, assets.cyan, .34, .045, .075, 0, -.055, .385);
      mesh(courier, assets.amber, .37, .24, .33, 0, -.20, 0);
      const rotors = [-1, 1].map(side => {
        mesh(courier, assets.steel, .39, .058, .12, side * .39, .09, 0);
        return mesh(courier, assets.steel, .43, .037, .08, side * .56, .132, 0);
      });
      station = { key, label, ring, beacon, courier, rotors, x: x + 2.83, z: z + 2.5 };
      add(assets.steel, 7.55, 2.5, 4.2, .16, 4.7, .16);
      add(assets.green, 7.54, 4.77, 4.2, .14, .91, .14);
      for (const corner of [-1, 1]) {
        add(assets.silver, 7.47, 1.34, 7.85 + corner * 1.65, .12, 2.38, .12);
        add(assets.amberLight, 7.14, 2.52, 7.85 + corner * 1.58, .68, .10, .12);
      }
      add(assets.steel, 7.42, 2.58, 7.85, 1.53, .14, 3.63);
      add(assets.green, 6.63, 2.58, 7.85, .07, .087, 3.63);
      add(assets.glass, 8.07, 1.45, 7.85, .078, 1.87, 3.39);
      add(assets.steel, 7.67, .56, 7.85, .62, .18, 2.52);
    }
    batches.commit();
    for (const crate of crates) {
      crate.x += x;
      crate.z += z;
      crate.collider.position.x += x;
      crate.collider.position.z += z;
      crate.collider.addEventListener('collide', listener('crate', crate));
    }
    for (const walker of walkers) {
      walker.collider.addEventListener('collide', listener('walker', walker));
      walker.originX = x;
      walker.originZ = z;
    }
    return { parent, colliders, crates, walkers, station, active: false, i, j };
  }

  function setActive(block, active) {
    if (block.active === active) return;
    block.active = active;
    const handle = body => {
      if (active) {
        body.aabbNeedsUpdate = true;
        world.addBody(body);
      } else {
        world.removeBody(body);
      }
    };
    for (const body of block.colliders) handle(body);
    for (const crate of block.crates) if (!crate.spent) handle(crate.collider);
    for (const walker of block.walkers) if (!walker.knocked) handle(walker.collider);
  }

  let lastI = null;
  let lastJ = null;
  function sync(position) {
    const i = Math.floor(position.x / blockSize);
    const j = Math.floor(position.z / blockSize);
    if (lastI === i && lastJ === j) return;
    lastI = i;
    lastJ = j;
    const reach = 2;
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dz = -reach; dz <= reach; dz++) {
        const key = stationKey(i + dx, j + dz);
        if (!blocks.has(key)) blocks.set(key, build(i + dx, j + dz));
      }
    }
    for (const [key, block] of blocks) {
      const range = Math.max(Math.abs(i - block.i), Math.abs(j - block.j));
      setActive(block, range <= 1);
      if (range > reach) {
        scene.remove(block.parent);
        block.parent.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
        blocks.delete(key);
      }
    }
  }

  function update(time, position) {
    signalGreen.color.setHex(time % 12 < 7 ? 0xc9ff82 : 0x424c3c);
    signalRed.color.setHex(time % 12 < 7 ? 0x654346 : 0xff7358);
    let nearest = null;
    let nearestDistance = Infinity;
    let arrived = null;
    for (const block of blocks.values()) {
      for (const walker of block.walkers) {
        if (walker.knocked) continue;
        updateWalker(walker, time);
        walker.collider.position.x += walker.originX;
        walker.collider.position.z += walker.originZ;
      }
      const station = block.station;
      if (!station) continue;
      const distance = Math.hypot(station.x - position.x, station.z - position.z);
      const fresh = !visited.has(station.key);
      station.ring.scale.setScalar(1 + Math.sin(time * 2.8) * .115);
      station.beacon.position.y = 1.82 + Math.sin(time * 3) * .26;
      station.beacon.rotation.y = time * 1.47;
      station.beacon.visible = fresh;
      const phase = time * .39 + block.i + block.j;
      station.courier.position.set(6.8 + Math.sin(phase) * 2.6, 4.5 + Math.cos(phase * 2) * .28, 9.3 + Math.cos(phase) * 3.8);
      station.courier.rotation.set(.1 * Math.cos(phase), Math.atan2(Math.cos(phase) * 2.6, -Math.sin(phase) * 3.8), -.12 * Math.sin(phase));
      station.rotors.forEach((rotor, i) => { rotor.rotation.y = time * (i ? -20 : 20); });
      if (fresh && distance < nearestDistance) {
        nearest = station;
        nearestDistance = distance;
      }
      if (fresh && distance < 7.15) {
        visited.add(station.key);
        arrived = station.label;
      }
    }
    return { nearest, nearestDistance, arrived, total: visited.size };
  }

  function process(time, onBlast) {
    for (const { kind, target, impact } of queue.splice(0)) {
      if (kind === 'crate' && !target.spent) {
        target.spent = true;
        target.view.visible = false;
        world.removeBody(target.collider);
        onBlast(target.x, target.z, impact);
      } else if (kind === 'walker' && !target.knocked) {
        target.knocked = true;
        target.view.visible = false;
        world.removeBody(target.collider);
        const scale = Math.min(.60, 11 / impact.length());
        ragdolls.push(ragdoll(scene, world, target, impact.scale(scale), time));
      }
    }
    for (let i = ragdolls.length - 1; i >= 0; i--) {
      const entry = ragdolls[i];
      if (entry.expires < time) {
        for (const joint of entry.joints) world.removeConstraint(joint);
        for (const { body } of entry.limbs) world.removeBody(body);
        scene.remove(entry.group);
        ragdolls.splice(i, 1);
        const block = blocks.get(stationKey(Math.round(entry.walker.originX / blockSize), Math.round(entry.walker.originZ / blockSize)));
        if (block?.walkers.includes(entry.walker)) {
          entry.walker.knocked = false;
          entry.walker.view.visible = true;
          if (block.active) world.addBody(entry.walker.collider);
        }
      } else {
        for (const { body, object } of entry.limbs) {
          object.position.copy(body.position);
          object.quaternion.copy(body.quaternion);
        }
      }
    }
  }

  return { sync, update, process };
}
