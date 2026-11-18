import * as THREE from 'three';
import { Body, Box, Quaternion, Vec3 } from 'cannon-es';
import { batchIslandDetails } from './drive-rally-batches.js';

const stopSpecs = {
  wreck: [32, -10.6], trail: [153, -12.4], ruins: [182.4, -24.5], chest: [547, -29],
};
const gateSpecs = [[157, -17.5], [161, -24], [168, -27], [175, -19.5]];
const runeSpecs = { wave: [184, -27.5], sun: [191, -26.3], leaf: [189, -19.1] };
const sequence = ['wave', 'leaf', 'sun'];
const stageIds = Object.keys(stopSpecs);
const limit = 16;
const gold = new THREE.MeshStandardMaterial({ color: 0xd5a74e, metalness: .49, roughness: .37 });
const cream = new THREE.MeshStandardMaterial({ color: 0xf2e1aa, roughness: .78 });
const wood = new THREE.MeshStandardMaterial({ color: 0x815633, roughness: .94 });
const shadowedWood = new THREE.MeshStandardMaterial({ color: 0x4f392a, roughness: .94 });
const coral = new THREE.MeshStandardMaterial({ color: 0xb44e45, roughness: .86 });
const teal = new THREE.MeshStandardMaterial({ color: 0x327770, roughness: .83 });
const moss = new THREE.MeshStandardMaterial({ color: 0x577c4d, roughness: .90 });
const basalt = new THREE.MeshStandardMaterial({ color: 0x606d61, roughness: .94 });
const box = new THREE.BoxGeometry();
const stone = new THREE.IcosahedronGeometry(.5, 1);
const peg = new THREE.CylinderGeometry(.5, .58, 1, 10);
const flag = new THREE.ConeGeometry(.50, 1, 3);
const gemGeometry = new THREE.OctahedronGeometry(.22);
const ringGeometry = new THREE.RingGeometry(.82, 1, 38).rotateX(-Math.PI / 2);

function pointAt(route, [meters, lateral]) {
  const p = route.sample(meters);
  return { x: p.x + p.nx * lateral, z: p.z + p.nz * lateral, yaw: p.yaw };
}

export function rallyHuntSites(route) {
  const stops = Object.fromEntries(Object.entries(stopSpecs).map(([name, spec]) => [name, pointAt(route, spec)]));
  const runes = Object.fromEntries(Object.entries(runeSpecs).map(([name, spec]) => [name, pointAt(route, spec)]));
  return { stops, runes, gates: gateSpecs.map(spec => pointAt(route, spec)) };
}

function block(group, material, x, y, z, w, h, d, geometry = box) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function runeArt(key) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ink = canvas.getContext('2d');
  ink.fillStyle = '#193831';
  ink.fillRect(0, 0, 128, 128);
  ink.strokeStyle = '#f8e0a0';
  ink.lineWidth = 6;
  ink.lineCap = 'round';
  ink.strokeRect(8, 8, 112, 112);
  ink.beginPath();
  if (key === 'wave') {
    for (const y of [48, 76]) {
      ink.moveTo(23, y);
      ink.bezierCurveTo(42, y-22, 51, y+21, 65, y);
      ink.bezierCurveTo(81, y-22, 91, y+21, 105, y);
    }
  } else if (key === 'sun') {
    ink.arc(64, 64, 17, 0, Math.PI * 2);
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ink.moveTo(64 + Math.cos(a) * 26, 64 + Math.sin(a) * 26);
      ink.lineTo(64 + Math.cos(a) * 38, 64 + Math.sin(a) * 38);
    }
  } else {
    ink.moveTo(36, 88);
    ink.quadraticCurveTo(24, 41, 95, 32);
    ink.quadraticCurveTo(96, 95, 36, 88);
    ink.moveTo(28, 100);
    ink.lineTo(76, 53);
  }
  ink.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false });
}

function wreck(group) {
  const hull = new THREE.Group();
  hull.rotation.set(0, -.38, -.14);
  group.add(hull);
  for (let i = 0; i < 9; i++) {
    const z = (i - 4) * .43;
    const width = .78 + Math.sin((i + 1) * Math.PI / 10) * 1.19;
    block(hull, i % 3 ? wood : shadowedWood, 0, .24, z, width, .19, .412);
    for (const side of [-1, 1]) block(hull, wood, side * width / 2, .48, z,
      .22, .53 - Math.abs(i - 4) * .034, .443).rotation.z = -side * .30;
  }
  for (const z of [-.82, .46]) block(hull, cream, 0, .48, z, 1.51, .085, .22);
  block(group, shadowedWood, -1.82, .27, -.44, .62, .51, .63).rotation.y = .25;
  const rope = new THREE.TorusGeometry(.29, .057, 6, 18).rotateX(-Math.PI / 2);
  block(group, cream, -1.82, .54, -.44, 1.32, .85, 1.05, rope);
  block(group, basalt, 1.51, .25, 1.13, .83, .54, .71, stone);
  block(group, gold, .07, .58, .45, .31, .075, .31, peg);
}

function trailPost(group, marker, material = teal) {
  block(group, wood, 0, .59, 0, .13, 1.18, .13);
  block(group, cream, 0, 1.14, 0, .19, .083, .19, peg);
  block(group, material, .26, .91, 0, .61, .32, .067);
  if (marker) block(group, gold, .59, .91, 0, .23, .34, .085, flag).rotation.z = -Math.PI / 2;
  for (const side of [-1, 1]) {
    block(group, moss, side * .42, .09, .18, .45, .19, .35, stone);
    block(group, coral, side * .36, .21, .16, .18, .11, .16, stone);
  }
}

function stoneNotebook(group) {
  block(group, basalt, 0, .37, 0, .87, .74, .66, peg);
  block(group, moss, 0, .68, 0, .86, .16, .67, peg);
  block(group, shadowedWood, 0, .82, 0, .56, .092, .41);
  for (let i = -1; i <= 1; i++) block(group, cream, i * .156, .884, .026, .12, .050, .25);
}

function vault(group) {
  for (let i = 0; i < 7; i++) {
    const a = .58 + i * .78;
    block(group, i % 3 ? basalt : moss, Math.sin(a) * 1.45, .25 + (i % 2) * .13, Math.cos(a) * 1.35,
      .94, .84 + (i % 2) * .45, .66, stone);
  }
  block(group, wood, 0, .25, 0, 1.19, .50, .79);
  block(group, shadowedWood, 0, .11, -.01, 1.26, .13, .86);
  for (const side of [-1, 1]) block(group, gold, side * .41, .27, -.406, .085, .46, .043);
  const lid = new THREE.Group();
  lid.position.set(0, .48, -.40);
  group.add(lid);
  block(lid, wood, 0, .14, .40, 1.24, .29, .82);
  block(lid, wood, 0, .30, .40, 1.12, .085, .73);
  block(lid, gold, 0, .061, .84, .21, .21, .073);
  for (const side of [-1, 1]) block(lid, gold, side * .41, .296, .40, .083, .095, .82);
  for (let i = 0; i < 16; i++) {
    block(group, gold, Math.sin(i * 2.4) * .35, .46 + (i % 4) * .016, Math.cos(i * 2.4) * .25, .18, .055, .18, peg);
  }
  return lid;
}

export function createRallyHunt(parent, world, route, terrain, sites = rallyHuntSites(route)) {
  const { stops, gates, runes } = sites;
  const scene = new THREE.Group();
  parent.add(scene);
  const objects = new Map();
  function mount(id, position) {
    const group = new THREE.Group();
    position.y = terrain.height(position.x, position.z);
    group.position.set(position.x, position.y, position.z);
    group.rotation.y = position.yaw;
    scene.add(group);
    objects.set(id, group);
    return group;
  }
  const wreckGroup = mount('wreck', stops.wreck);
  const hull = new THREE.Group();
  hull.position.x = -1.9;
  wreckGroup.add(hull);
  wreck(hull);
  const { yaw, x, y, z } = stops.wreck;
  world.addBody(new Body({ mass: 0, material: world.defaultMaterial,
    shape: new Box(new Vec3(.85, .34, 1.86)),
    position: new Vec3(x - Math.cos(yaw) * 1.9, y + .36, z + Math.sin(yaw) * 1.9),
    quaternion: new Quaternion().setFromAxisAngle(new Vec3(0, 1, 0), yaw - .38),
  }));
  trailPost(mount('trail', stops.trail), true);
  stoneNotebook(mount('ruins', stops.ruins));
  const lid = vault(mount('chest', stops.chest));
  const runeLights = new Map();
  for (const [id, point] of Object.entries(runes)) {
    const group = mount(id, point);
    block(group, basalt, 0, .60, 0, .75, 1.21, .57, peg);
    block(group, moss, 0, 1.09, 0, .79, .17, .58, peg);
    const art = runeArt(id);
    block(group, art, 0, .85, .31, .48, .48, 1, new THREE.PlaneGeometry());
    block(group, art, 0, .85, -.31, .48, .48, 1, new THREE.PlaneGeometry()).rotation.y = Math.PI;
    const light = new THREE.MeshBasicMaterial({ color: 0x6e825c });
    block(group, light, 0, 1.22, 0, .46, .21, .46, gemGeometry);
    runeLights.set(id, light);
  }
  for (const [i, point] of gates.entries()) {
    const group = mount('gate' + i, point);
    for (const side of [-1, 1]) {
      const post = new THREE.Group();
      post.position.x = side * 1.35;
      group.add(post);
      trailPost(post, false, i % 2 ? coral : teal);
    }
    const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({
      color: 0xffdc91, transparent: true, opacity: .58, depthWrite: false, side: THREE.DoubleSide,
    }));
    ring.scale.setScalar(1.16);
    ring.position.y = .068;
    group.add(ring);
  }
  const jewel = new THREE.Mesh(gemGeometry, new THREE.MeshBasicMaterial({ color: 0xffe18d }));
  jewel.scale.setScalar(.88);
  scene.add(jewel);
  for (const group of objects.values()) batchIslandDetails(group, new Set([lid]));

  let stage = 0;
  let seconds = 0, gate = 0, combination = 0, solving = false;
  function near(position, point, range) {
    return Math.hypot(point.x - position.x, point.z - position.z) <= range &&
      Math.abs(position.y - point.y - .8) < 1.65;
  }
  function target() {
    if (seconds > 0) return { id: 'gate' + gate, point: gates[gate] };
    const id = stageIds[stage];
    if (!id) return null;
    return { id, point: stops[id] };
  }
  function nearby(position, walking) {
    if (!walking || seconds > 0 || stage === stageIds.length) return null;
    if (stageIds[stage] === 'ruins' && solving) {
      for (const [id, point] of Object.entries(runes)) if (near(position, point, 1.84)) return id;
      return null;
    }
    const id = stageIds[stage];
    return near(position, stops[id], 2.45) ? id : null;
  }
  function interact(position, walking) {
    const id = nearby(position, walking);
    if (!id) return null;
    switch (id) {
      case 'wreck':
        stage++;
        return 'wreckFound';
      case 'trail':
        gate = 0;
        seconds = limit;
        return 'trailStarted';
      case 'ruins':
        solving = true;
        return 'runesStarted';
      case 'chest':
        stage++;
        return 'treasureFound';
      default:
        if (id !== sequence[combination]) {
          combination = 0;
          return 'runesWrong';
        }
        if (++combination < sequence.length) return 'runeRight';
        stage++;
        solving = false;
        return 'runesSolved';
    }
  }
  function update(dt, position, walking) {
    if (!seconds) return null;
    seconds = Math.max(0, seconds - dt);
    if (!seconds || !walking) {
      seconds = 0;
      gate = 0;
      return 'trailRetry';
    }
    if (!near(position, gates[gate], 1.65)) return null;
    if (++gate < gates.length) return 'gatePassed';
    seconds = 0;
    stage++;
    return 'trailDone';
  }
  function render(time, dt, motion, viewer) {
    const next = target();
    jewel.visible = Boolean(next && !solving && Math.hypot(viewer.x - next.point.x, viewer.z - next.point.z) < 38);
    if (jewel.visible) {
      const { x, y, z } = next.point;
      jewel.position.set(x, y + 1.74 + (motion ? Math.sin(time * 3.15) * .17 : 0), z);
      jewel.rotation.y = motion ? time * 1.3 : 0;
    }
    for (const [i] of gates.entries()) {
      objects.get('gate' + i).visible = stage === 1;
    }
    for (const [id, light] of runeLights) light.color.set(sequence.indexOf(id) < combination ? 0x9aee81 : 0x6e825c);
    const open = stage === stageIds.length ? -1.68 : 0;
    lid.rotation.x = motion ? THREE.MathUtils.damp(lid.rotation.x, open, 6, dt) : open;
  }
  return {
    route, stops, target, nearby, interact, update, render,
    status: () => ({ stage, seconds, gate, gates: gates.length, combination, solving }),
    cancelTrail() { seconds = gate = 0; },
  };
}
