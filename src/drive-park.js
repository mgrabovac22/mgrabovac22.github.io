import * as THREE from 'three';
import { createWalker, walkingLoop } from './drive-people.js';

export function parkServiceAt(column, row) {
  if (column !== 0) return null;
  if (row === -1) return 'linkedin';
  if (row === -4) return 'github';
  return null;
}

const matte = color => new THREE.MeshStandardMaterial({ color, roughness: .88 });
const sphere = new THREE.SphereGeometry(1, 10, 8);
const cylinder = new THREE.CylinderGeometry(.5, .5, 1, 20);
const board = new THREE.PlaneGeometry();
const lawn = matte('#557050');
const clover = matte('#6c885a');
const leaf = matte('#345d46');
const goldLeaf = matte('#a1a668');
const stone = matte('#a9a998');
const pathStone = matte('#c1bdab');
const soil = matte('#423f30');
const bark = matte('#514334');
const timber = matte('#956e4a');
const rail = matte('#304942');
const flower = matte('#dbb589');
const water = new THREE.MeshStandardMaterial({ color: '#669f9a', roughness: .26, metalness: .21 });
const spray = new THREE.MeshBasicMaterial({ color: '#bee9e4' });
const collar = matte('#287d80');
const nose = matte('#302724');
const coats = [matte('#a96643'), matte('#dfc7a0')];
const leashInk = new THREE.LineBasicMaterial({ color: '#263b35' });

function oval(parent, surface, x, y, z, width, height, depth) {
  const mesh = new THREE.Mesh(sphere, surface);
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  parent.add(mesh);
  return mesh;
}

function createDog(parent, walker, index) {
  const body = new THREE.Group();
  parent.add(body);
  const coat = coats[index % coats.length];
  const chest = coats[(index + 1) % coats.length];
  oval(body, coat, 0, .43, -.03, .20, .20, .43);
  oval(body, chest, 0, .44, .23, .18, .21, .22);
  oval(body, collar, 0, .55, .31, .146, .13, .12);
  const head = new THREE.Group();
  head.position.set(0, .65, .39);
  body.add(head);
  oval(head, coat, 0, 0, 0, .16, .15, .19);
  oval(head, chest, 0, -.04, .135, .11, .085, .13);
  oval(head, nose, 0, -.02, .245, .072, .046, .048);
  for (const side of [-1, 1]) {
    oval(head, chest, side * .13, -.055, -.018, .057, .142, .086).rotation.z = side * .24;
    oval(head, nose, side * .084, .031, .136, .021, .023, .015);
  }
  const legs = [-.25, .24].flatMap((z, row) => [-1, 1].map((side, column) => {
    const joint = new THREE.Group();
    joint.position.set(side * .126, .40, z);
    oval(joint, coat, 0, -.125, 0, .068, .17, .074);
    oval(joint, chest, 0, -.264, .04, .054, .12, .054);
    oval(joint, chest, 0, -.359, .07, .067, .044, .098);
    body.add(joint);
    return { joint, phase: (row + column) * Math.PI };
  }));
  const tail = new THREE.Group();
  tail.position.set(0, .49, -.39);
  oval(tail, coat, 0, .12, -.15, .059, .22, .066).rotation.x = -.79;
  body.add(tail);

  const positions = new THREE.BufferAttribute(new Float32Array(6), 3);
  positions.setUsage(THREE.DynamicDrawUsage);
  const leash = new THREE.Line(new THREE.BufferGeometry().setAttribute('position', positions), leashInk);
  leash.frustumCulled = false;
  parent.add(leash);
  const collarPoint = new THREE.Vector3(0, .58, .29);
  const endpoint = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const side = index ? -1 : 1;

  return {
    update(time, motion) {
      leash.visible = walker.view.visible && !walker.knocked;
      body.visible = walker.view.visible || walker.knocked;
      if (walker.knocked || !body.visible) return;
      const heading = walker.view.rotation.y;
      const beat = motion ? time * 10.8 + index * 2.5 : 0;
      offset.set(side * .73, 0, 1.05).applyAxisAngle(yAxis, heading);
      body.position.copy(walker.view.position).add(offset);
      body.position.y = .095 + (motion ? Math.abs(Math.sin(beat)) * .025 : 0);
      body.rotation.y = heading;
      head.rotation.y = motion ? Math.sin(time * 1.8 + index) * .19 : 0;
      tail.rotation.y = motion ? Math.sin(time * 8.7 + index) * .59 : 0;
      for (const { joint, phase } of legs) joint.rotation.x = motion ? Math.sin(beat + phase) * .54 : 0;

      offset.set(side * .25, .92, .02).applyAxisAngle(yAxis, heading).add(walker.view.position);
      endpoint.copy(collarPoint).applyAxisAngle(yAxis, heading).add(body.position);
      positions.setXYZ(0, offset.x, offset.y, offset.z);
      positions.setXYZ(1, endpoint.x, endpoint.y, endpoint.z);
      positions.needsUpdate = true;
    },
    dispose() { leash.geometry.dispose(); },
  };
}

export function buildPark(parent, add, collider, signs, compact) {
  add(lawn, 22, .087, 22, 30, .024, 30);
  // Keep the apron clear from the street to the crate display.
  add(pathStone, 12.2, .107, 19.3, 12.55, .022, 8.8);
  add(pathStone, 24, .109, 19.3, 17.3, .025, 2.55);
  for (const z of [11.4, 32.6]) add(pathStone, 24.5, .108, z, 16.7, .023, 2.24);
  for (const x of [16.5, 32.5]) add(pathStone, x, .11, 22, 2.24, .025, 21.3);

  for (const [x, z, size] of [[10, 10, 1], [14, 14.4, .86], [24, 8.8, 1.04], [36, 13.3, .98], [35.6, 27, 1.09], [27, 36, .92], [12, 33.3, 1.08], [9.7, 25.9, .72]]) {
    add(soil, x, .112, z, 2.6 * size, .03, 2.6 * size, 0, cylinder);
    add(bark, x, 1.3 * size, z, .28 * size, 2.5 * size, .28 * size, 0, cylinder);
    add(leaf, x, 2.9 * size, z, 1.56 * size, 1.44 * size, 1.38 * size, 0, sphere);
    add(clover, x + .65 * size, 3.4 * size, z + .16, 1.05 * size, 1.12 * size, .96 * size, 0, sphere);
    add(goldLeaf, x - .5 * size, 3.26 * size, z - .51, .82 * size, .92 * size, .85 * size, 0, sphere);
    collider(x, z, .38 * size, 2.7 * size, .38 * size);
  }

  for (const [x, z] of [[12, 13.6], [12, 24.7], [30, 14.8], [29.7, 29.9]]) {
    add(stone, x, .18, z, 3.3, .16, 1.42);
    add(soil, x, .263, z, 3.04, .015, 1.2);
    for (let i = 0; i < 6; i++) {
      const px = x + (i - 2.5) * .47;
      const pz = z + (i % 2 ? -.21 : .19);
      add(clover, px, .37, pz, .32, .18, .30, 0, sphere);
      add(flower, px + .05, .55, pz, .115, .062, .11, 0, sphere);
    }
  }

  for (const [x, z, side] of [[20.2, 16.8, -1], [27.9, 16.8, -1], [20.8, 29.4, 1], [26.4, 29.4, 1]]) {
    for (const end of [-1, 1]) add(rail, x + end * .83, .34, z, .10, .52, .47);
    for (let i = -1; i < 2; i++) add(timber, x, .57, z + i * .15, 2.10, .085, .135);
    for (let i = 0; i < 3; i++) add(timber, x, .77 + i * .135, z + side * .27, 2.10, .1, .08);
  }

  const fx = 24.4, fz = 25.25;
  add(stone, fx, .26, fz, 5.6, .32, 5.6, 0, cylinder);
  add(water, fx, .43, fz, 4.94, .055, 4.94, 0, cylinder);
  add(stone, fx, .61, fz, .88, .48, .88, 0, cylinder);
  add(rail, fx, .88, fz, .62, .14, .62, 0, cylinder);
  collider(fx, fz, 5.15, .54, 5.15);
  const jets = Array.from({ length: compact ? 6 : 12 }, () => oval(parent, spray, fx, .8, fz, .043, .055, .043));

  for (const z of [13.05, 25.9]) {
    add(rail, 7.05, .66, z, .105, 1.14, 5.55);
    for (const n of [-2.6, 0, 2.6]) add(rail, 7.05, .60, z + n, .19, 1.13, .19);
  }
  if (signs) {
    const { park: sign, paint } = signs;
    for (const z of [18.2, 20.4]) {
      add(paint, 6.83, .125, z, 1.45, .006, .11);
      for (const side of [-1, 1]) add(paint, 7.31, .125, z + side * .21, .58, .006, .11, -side * Math.PI / 4);
    }
    add(rail, 7.95, 1.79, 14.0, .12, 3.41, .12);
    add(rail, 7.95, 1.79, 11.05, .12, 3.41, .12);
    add(rail, 7.95, 2.93, 12.52, .19, 1.06, 3.12);
    add(rail, 7.95, 2.93, 14.10, 2.74, .98, .12);
    add(sign, 7.84, 2.93, 12.52, 3.04, .99, 1, -Math.PI / 2, board);
    add(sign, 7.95, 2.93, 14.17, 2.65, .91, 1, 0, board);
  }

  const loop = walkingLoop(16.6, 11.45, 32.35, 32.55, 1.08);
  const opposite = walkingLoop(17.17, 11.98, 31.8, 31.98, 1.16);
  const walkers = [
    createWalker(parent, 2, .22, 1, loop),
    createWalker(parent, 1, .69, -1, opposite),
    createWalker(parent, 4, .50, 1, loop),
    createWalker(parent, 3, .88, -1, opposite),
  ];
  const dogs = walkers.slice(0, 2).map((walker, index) => createDog(parent, walker, index));
  return {
    walkers,
    update(time, motion) {
      dogs.forEach(dog => dog.update(time, motion));
      jets.forEach((drop, index) => {
        const angle = index * Math.PI * 2 / jets.length;
        const phase = ((motion ? time : 0) * .89 + index * .173) % 1;
        drop.position.set(fx + Math.cos(angle) * 1.78 * phase, .52 + (1 - phase) * .41 + 2.9 * phase * (1 - phase), fz + Math.sin(angle) * 1.78 * phase);
      });
    },
    dispose() { dogs.forEach(dog => dog.dispose()); },
  };
}
