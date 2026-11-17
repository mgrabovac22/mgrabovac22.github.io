import * as THREE from 'three';
import { Body, Box, Vec3 } from 'cannon-es';

const box = new THREE.BoxGeometry();
const dark = new THREE.MeshStandardMaterial({ color: 0x594537, roughness: .88 });
const planks = new THREE.MeshStandardMaterial({ color: 0xaf8657, roughness: .83 });
const endPaint = new THREE.MeshStandardMaterial({ color: 0xd6ad66, roughness: .86 });
const support = new THREE.MeshStandardMaterial({ color: 0x624e38, roughness: .93 });
const signal = new THREE.MeshStandardMaterial({ color: 0x3b766a, roughness: .76 });
const chevron = new THREE.MeshBasicMaterial({ color: 0xffebbc });
const arrowArms = [1, -1].map(direction => new THREE.BoxGeometry(.30, .073, .028).rotateZ(direction * .6));

function section(parent, world, point, lateral, width, from, to, low, high) {
  const flatLength = to - from;
  const height = high - low;
  const span = Math.hypot(flatLength, height);
  const thickness = .145;
  const pivot = new THREE.Group();
  const along = (from + to) / 2;
  pivot.position.set(point.x + point.tx * along + point.nx * lateral, (low + high) / 2,
    point.z + point.tz * along + point.nz * lateral);
  pivot.rotation.set(Math.atan2(height, flatLength), point.yaw, 0, 'YXZ');
  parent.add(pivot);

  const deck = new THREE.Mesh(box, dark);
  deck.position.y = -thickness * .52;
  deck.scale.set(width, thickness, span);
  deck.receiveShadow = true;
  pivot.add(deck);

  const count = Math.ceil(span / .43);
  const slats = new THREE.InstancedMesh(box, planks, count);
  const cursor = new THREE.Object3D();
  const tint = new THREE.Color();
  for (let i = 0; i < count; i++) {
    cursor.position.set(0, -.017, span * ((i + .5) / count - .5));
    cursor.scale.set(width + .04, .048, span / count - .016);
    cursor.updateMatrix();
    slats.setMatrixAt(i, cursor.matrix);
    slats.setColorAt(i, tint.setScalar(.79 + (Math.sin(i * 5.2) + 1) * .11));
  }
  slats.receiveShadow = true;
  pivot.add(slats);
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(box, endPaint);
    strip.position.set(side * (width / 2 - .175), .015, 0);
    strip.scale.set(.20, .052, span);
    pivot.add(strip);
  }

  const center = new THREE.Vector3(0, -thickness / 2, 0).applyQuaternion(pivot.quaternion).add(pivot.position);
  const body = new Body({
    mass: 0, shape: new Box(new Vec3(width / 2, thickness / 2, span / 2)),
    position: new Vec3(...center),
  });
  body.quaternion.copy(pivot.quaternion);
  world.addBody(body);
}

function framework(add, point, offset, width, along, height) {
  for (const side of [-1, 1]) {
    const x = point.x + point.tx * along + point.nx * (offset + side * (width / 2 - .31));
    const z = point.z + point.tz * along + point.nz * (offset + side * (width / 2 - .31));
    add(support, x, height / 2, z, .21, height, .25, point.yaw);
  }
  add(support, point.x + point.tx * along + point.nx * offset, height * .76,
    point.z + point.tz * along + point.nz * offset, width - .51, .19, .25, point.yaw);
}

function jumpMarker(add, point, lane, width, along) {
  for (const side of [-1, 1]) {
    const lateral = lane + side * (width / 2 + .29);
    const x = point.x + point.tx * along + point.nx * lateral;
    const z = point.z + point.tz * along + point.nz * lateral;
    add(support, x, .61, z, .11, 1.22, .13, point.yaw);
    add(signal, x, 1.21, z, .67, .57, .15, point.yaw);
    for (const arm of [-1, 1]) {
      add(chevron, x + point.nx * arm * .10 - point.tx * .09, 1.22, z + point.nz * arm * .10 - point.tz * .09,
        1, 1, 1, point.yaw, arrowArms[(arm + 1) / 2]);
    }
  }
}

export function buildRallyObstacles(parent, world, route, add, addCrate) {
  const jumps = [
    { meters: 111, lane: 1.85, width: 5.7, rise: 1.10, gap: 2.65 },
    { meters: 275, lane: 0, width: 8.6, rise: 1.50, gap: 4.4 },
    { meters: 618, lane: -1.7, width: 5.9, rise: 1.35, gap: 3.5 },
  ];
  for (const { meters, lane, width, rise, gap } of jumps) {
    const p = route.sample(meters);
    const takeoff = -gap / 2;
    const land = gap / 2;
    section(parent, world, p, lane, width, takeoff - 9.5, takeoff, .029, rise);
    section(parent, world, p, lane, width, land, land + 4.2, rise * .49, rise * .49);
    section(parent, world, p, lane, width, land + 4.2, land + 11, rise * .49, .027);
    jumpMarker(add, p, lane, width, takeoff - 11.8);
    framework(add, p, lane, width, takeoff - .32, rise - .13);
    framework(add, p, lane, width, land + .19, rise * .49 - .10);
    for (const side of [-1, 1]) {
      addCrate(p.x + p.nx * (lane + side * (width / 2 - 1.15)),
        p.z + p.nz * (lane + side * (width / 2 - 1.15)), .85);
    }
  }
  for (const meters of [395, 747]) {
    const p = route.sample(meters);
    const lateral = meters === 395 ? -.45 : .9;
    section(parent, world, p, lateral, 8.1, -12, -6, .025, 1.01);
    section(parent, world, p, lateral, 8.1, -6, 6, 1.01, 1.01);
    section(parent, world, p, lateral, 8.1, 6, 12, 1.01, .025);
    for (const along of [-5.6, 0, 5.6]) framework(add, p, lateral, 8.1, along, .87);
  }
}
