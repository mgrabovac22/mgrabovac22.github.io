import * as THREE from 'three';
import { Body, ConvexPolyhedron, Vec3 } from 'cannon-es';
import { rallyBridges, rallyJumps } from './drive-rally-terrain.js';

const box = new THREE.BoxGeometry();
const dark = new THREE.MeshStandardMaterial({ color: 0x594537, roughness: .88 });
const planks = new THREE.MeshStandardMaterial({ color: 0xab7b4e, roughness: .86 });
const endPaint = new THREE.MeshStandardMaterial({ color: 0xe2b565, roughness: .86 });
const support = new THREE.MeshStandardMaterial({ color: 0x654632, roughness: .93 });
const signal = new THREE.MeshStandardMaterial({ color: 0x276961, roughness: .76 });
const chevron = new THREE.MeshBasicMaterial({ color: 0xffebbc });
const arrowArms = [1, -1].map(direction => new THREE.BoxGeometry(.30, .073, .028).rotateZ(direction * .6));
const wedgeFaces = [[0,1,2,3], [7,6,5,4], [4,5,1,0], [5,6,2,1], [6,7,3,2], [7,4,0,3]];

function place(point, lateral, y, along) {
  return [point.x + point.tx * along + point.nx * lateral, y, point.z + point.tz * along + point.nz * lateral];
}

function deck(parent, world, point, lateral, width, profile) {
  const platform = new THREE.Group();
  platform.position.set(...place(point, lateral, 0, 0));
  platform.rotation.y = point.yaw;
  parent.add(platform);
  const plankCount = profile.slice(1).reduce((count, [to], i) => count + Math.ceil((to - profile[i][0]) / .35), 0);
  const slats = new THREE.InstancedMesh(box, planks, plankCount);
  const cursor = new THREE.Object3D();
  const tint = new THREE.Color();
  let plank = 0;
  for (let i = 1; i < profile.length; i++) {
    const [from, nearY] = profile[i - 1];
    const [to, farY] = profile[i];
    const run = to - from;
    const slope = farY - nearY;
    const angle = Math.atan2(slope, run);
    const span = Math.hypot(run, slope);
    const bottom = Math.min(nearY, farY) - .32;
    const near = run / 2, far = -near, half = width * .5;
    const centerY = (bottom + (nearY + farY) / 2) / 2;
    const vertices = [
      [-half, nearY, near], [half, nearY, near], [half, farY, far], [-half, farY, far],
      [-half, bottom, near], [half, bottom, near], [half, bottom, far], [-half, bottom, far],
    ];
    const shape = new ConvexPolyhedron({ vertices: vertices.map(([x, y, z]) => new Vec3(x, y - centerY, z)), faces: wedgeFaces });
    const body = new Body({ mass: 0, shape, material: world.defaultMaterial,
      position: new Vec3(...place(point, lateral, centerY, (from + to) / 2)) });
    body.quaternion.copy(platform.quaternion);
    body.aabbNeedsUpdate = true;
    world.addBody(body);

    const beam = new THREE.Mesh(box, dark);
    beam.position.set(0, (nearY + farY) / 2 - .118, -(from + to) / 2);
    beam.rotation.x = angle;
    beam.scale.set(width, .17, span);
    platform.add(beam);
    for (const side of [-1, 1]) {
      const marking = new THREE.Mesh(box, endPaint);
      marking.position.set(side * (half - .15), (nearY + farY) / 2 + .009, beam.position.z);
      marking.rotation.x = angle;
      marking.scale.set(.17, .031, span);
      platform.add(marking);
    }
    const count = Math.ceil(run / .35);
    for (let j = 0; j < count; j++) {
      const fraction = (j + .5) / count;
      cursor.position.set(0, nearY + fraction * slope - .021, -from - fraction * run);
      cursor.rotation.x = angle;
      cursor.scale.set(width + .012, .043, span / count - .014);
      cursor.updateMatrix();
      slats.setMatrixAt(plank, cursor.matrix);
      slats.setColorAt(plank, tint.setScalar(.86 + Math.sin(plank++ * 7.31) * .13));
    }
  }
  slats.castShadow = slats.receiveShadow = true;
  platform.add(slats);
}
function trestle(add, point, lateral, width, along, height, bottom = -1.35) {
  for (const side of [-1, 1]) {
    const lane = lateral + side * (width / 2 - .28);
    add(support, ...place(point, lane, (height + bottom) / 2, along), .29, height - bottom, .32, point.yaw);
    add(dark, ...place(point, lane, height - .26, along), .38, .13, .38, point.yaw);
  }
  add(support, ...place(point, lateral, height - .46, along), width + .25, .24, .35, point.yaw);
}

function postMarker(add, point, lateral, along) {
  add(support, ...place(point, lateral, .64, along), .13, 1.28, .13, point.yaw);
  add(signal, ...place(point, lateral, 1.29, along), .74, .59, .14, point.yaw);
  for (const arm of [-1, 1]) {
    add(chevron, ...place(point, lateral + arm * .10, 1.30, along - .077),
      1, 1, 1, point.yaw, arrowArms[(arm + 1) / 2]);
  }
}

function bridge(parent, world, add, props, point, lateral, width, length, height) {
  deck(parent, world, point, lateral, width, [
    [-length - 6, -.09], [-length - 2, .27], [-length, height], [length, height], [length + 2, .27], [length + 6, -.09],
  ]);
  for (let along = -length + .4; along < length; along += 3.1) {
    trestle(add, point, lateral, width, along, height);
  }
  for (const side of [-1, 1]) {
    const outside = lateral + side * (width / 2 + .04);
    const sections = Math.ceil(length * 2 / 3.25);
    const span = length * 2 / sections;
    for (let i = 0; i < sections; i++) {
      const along = -length + (i + .5) * span;
      const [x, y, z] = place(point, outside, height + .36, along);
      props.place({ x, y, z, yaw: point.yaw, bounds: [.069, .35, span / 2 - .016], mass: 8, effect: 'timber', tip: .82 }, draw => {
        draw(support, ...place(point, outside, y, along - span * .4), .14, .72, .14, point.yaw);
        for (const railY of [.34, .68]) draw(dark, ...place(point, outside, height + railY, along),
          .07, .085, span - .024, point.yaw);
      });
    }
  }
}

export function buildRallyObstacles(parent, world, route, add, props) {
  for (const { meters, width, height, gap } of rallyJumps) {
    const point = route.sample(meters);
    const lip = -gap / 2;
    const land = gap / 2;
    deck(parent, world, point, 0, width, [
      [lip - 18, -.08], [lip - 14, .10], [lip - 10, height * .23], [lip - 5, height * .57],
      [lip - 2, height * .81], [lip, height],
    ]);
    deck(parent, world, point, 0, width + .45, [
      [land, .75], [land + 3, 1.10], [land + 7, 1.04], [land + 14, .35], [land + 18, -.08],
    ]);
    for (const side of [-1, 1]) postMarker(add, point, side * (width / 2 + .40), lip - 19.2);
    for (const along of [lip - 8, lip - 3, lip - .3]) {
      trestle(add, point, 0, width, along, height * (.94 + (along - lip) * .061));
    }
    for (const along of [land + 1, land + 4.5, land + 8]) trestle(add, point, 0, width + .45, along, .94);
    bridge(parent, world, add, props, point, -8.5, 4.1, 9.1, .86);
  }
  for (const meters of rallyBridges) {
    bridge(parent, world, add, props, route.sample(meters), 0, 11.6, 13, 1.12);
  }
}
