import * as THREE from 'three';
import { Body, Box, Vec3 } from 'cannon-es';
import { rallyBridges, rallyJumps, rallyStops } from './drive-rally-terrain.js';

const rough = color => new THREE.MeshStandardMaterial({ color, roughness: .91 });
const darkWood = rough(0x593c27);
const wood = rough(0xad8151);
const stone = rough(0x858d82);
const stoneLight = rough(0xaaa996);
const moss = rough(0x6b8650);
const leaf = rough(0x315e3b);
const leafLight = rough(0x668e45);
const frond = rough(0x518135);
frond.side = THREE.DoubleSide;
const roof = rough(0x996b42);
const teal = rough(0x2b766e);
const indigo = rough(0x365976);
const amber = new THREE.MeshBasicMaterial({ color: 0xf7cd7f });
const chalk = new THREE.MeshBasicMaterial({ color: 0xe4ead4 });
const rock = new THREE.IcosahedronGeometry(.5, 1);
const monolith = new THREE.BoxGeometry(1, 1, 1, 2, 3, 2);
const stoneVertices = monolith.attributes.position;
for (let i = 0; i < stoneVertices.count; i++) {
  const x = stoneVertices.getX(i), y = stoneVertices.getY(i), z = stoneVertices.getZ(i);
  const taper = 1 - Math.max(0, y) * .21;
  stoneVertices.setXYZ(i, x * taper + Math.sin(5.3 * x + 6.15 * y + z) * .062,
    y + Math.sin(7.1 * z - x * 2.25 + y) * .044, z * taper + Math.sin(4.5 * y - x * 3.7 + z) * .059);
}
monolith.computeVertexNormals();
const tuft = new THREE.ConeGeometry(.5, 1, 5);
const trunk = new THREE.CylinderGeometry(.35, .52, 1, 8);
const plank = new THREE.BoxGeometry();
const signPlane = new THREE.PlaneGeometry();
const crown = new THREE.BufferGeometry();
const verts = [], triangles = [];
for (let i = 0; i <= 9; i++) {
  const f = i / 9, h = Math.sin(f * Math.PI * .90) * .265, w = Math.sin(f * Math.PI) * .24;
  verts.push(-w, h - w * .26, -f, 0, h, -f, w, h - w * .24, -f);
  if (i) {
    const a = (i - 1) * 3;
    triangles.push(a,a+1,a+3,a+1,a+4,a+3,a+1,a+2,a+4,a+2,a+5,a+4);
  }
}
crown.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
crown.setIndex(triangles);
crown.computeVertexNormals();

function at(point, lateral, along) {
  return [point.x + point.nx * lateral + point.tx * along, point.z + point.nz * lateral + point.tz * along];
}

function part(add, point, material, lateral, y, along, w, h, d, turn = 0, geometry) {
  const [x, z] = at(point, lateral, along);
  add(material, x, y, z, w, h, d, point.yaw + turn, geometry);
}

function palm(add, x, z, y, size, angle) {
  const shift = size * .079;
  for (let section = 0; section < 5; section++) {
    const bend = shift * (section / 4) ** 1.7;
    add(darkWood, x + bend, y + (section + .5) * size / 5, z, .37 - section * .029, size / 5 + .04, .39 - section * .026, angle, trunk);
  }
  for (let l = 0; l < 9; l++) {
    const scale = size * (.42 + (l % 3) * .042);
    add(l % 3 ? frond : leafLight, x + shift, y + size, z, scale, scale * (.72 + (l % 2) * .7), scale,
      angle + l * Math.PI * 2 / 9, crown);
  }
  for (let n = 0; n < 3; n++) add(wood, x + shift + (n - 1) * .18, y + size - .05, z + .19, .25, .27, .24, n, rock);
}

function hut(add, p, lateral, along, color) {
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    part(add, p, darkWood, lateral + x * 2.63, 1.79, along + z * 2.08, .25, 3.58, .26);
  }
  part(add, p, wood, lateral, .20, along, 5.85, .38, 4.92);
  part(add, p, color, lateral, 1.31, along + 1.84, 5.48, 1.14, .21);
  for (let row = 0; row < 9; row++) {
    const inset = row * .51;
    part(add, p, row % 2 ? roof : wood, lateral, 3.37 + row * .15, along, 6.36 - inset, .23, 5.71 - inset * .49);
  }
  for (const x of [-1, 1]) {
    part(add, p, darkWood, lateral + x * 1.61, .87, along - .45, .36, .94, 2.45);
    part(add, p, wood, lateral + x * 1.61, 1.33, along - .40, .58, .14, 2.63);
  }
}

function stoneCircle(add, p, lateral, world) {
  for (let i = 0; i < 11; i++) {
    const angle = (i + .5) / 11 * Math.PI * 2;
    const center = [lateral + Math.cos(angle) * 8.4, Math.sin(angle) * 8.3];
    const h = 3.15 + (i % 3) * .47;
    if (i === 0) continue;
    part(add, p, i % 3 ? stone : stoneLight, center[0], h * .45, center[1], 1.62, h, 1.88, angle, monolith);
    part(add, p, moss, center[0] + .40, h * .68, center[1] + .39, .47, .76, 1.32, angle, rock);
    if (i % 2 === 1 && i !== 9) part(add, p, stoneLight,
      lateral + Math.cos(angle + .27) * 8.05, 3.05, Math.sin(angle + .27) * 8.05, 1.24, .71, 4.93, angle - Math.PI / 2, monolith);
    const [x, z] = at(p, ...center);
    world.addBody(new Body({ mass: 0, shape: new Box(new Vec3(.65, h * .43, .7)), position: new Vec3(x, h * .43, z) }));
  }
  part(add, p, stone, lateral, .42, 0, 4.7, .96, 3.0, .23, rock);
  part(add, p, moss, lateral, .77, 0, 4.1, .28, 2.1, .23, rock);
  for (let i = 0; i < 7; i++) part(add, p, stoneLight, -8.4 - i * 1.26, .065, -1.7, 1.07, .18, 2.45, i * .06, rock);
}

function marker(add, p, lateral, along, title, signMaterial, color) {
  part(add, p, darkWood, lateral, 1.09, along, .18, 2.18, .19);
  part(add, p, color, lateral, 1.84, along, 3.0, .73, .20);
  part(add, p, signMaterial(title, '#263c36', '#fff0c6'), lateral, 1.84, along - .111, 2.89, .66, 1, 0, signPlane);
}

export function buildRallyScenery(parent, world, route, terrain, add, random, destinations, signMaterial) {
  const crossings = [...rallyJumps.map(jump => jump.meters), ...rallyBridges];
  const pending = new Map();
  const lamps = new THREE.Group();
  parent.add(lamps);
  const lampGeo = new THREE.OctahedronGeometry(.18);
  for (const stop of rallyStops) {
    const p = route.sample(stop.meters);
    const { id, lateral } = stop;
    if (id === 'stones') {
      marker(add, p, -9.8, -7.5, 'STONEHENGE', signMaterial, wood);
      stoneCircle(add, p, lateral, world);
      continue;
    }
    const destination = destinations.get(id);
    if (!destination) continue;
    const color = id === 'linkedin' ? indigo : id === 'github' ? teal : wood;
    marker(add, p, -8.9, -8.2, destination.label, signMaterial, color);
    for (let i = 0; i < 6; i++) part(add, p, stoneLight, -8.1 - i * 1.26, .065, 0, 1.15, .16, 4.8, i * .04, rock);
    for (const along of [-5.5, 5.5]) {
      hut(add, p, lateral - 2.4, along + Math.sign(along) * 2.2, color);
      const [x, z] = at(p, lateral + 1.7, along);
      palm(add, x, z, 0, 5.4, along);
      part(add, p, darkWood, lateral + 4.6, .67, along, .10, 1.34, .12);
      const lantern = new THREE.Mesh(lampGeo, amber);
      const [lampX, lampZ] = at(p, lateral + 4.6, along);
      lantern.position.set(lampX, 1.5, lampZ);
      lamps.add(lantern);
    }
    part(add, p, stone, lateral, .24, 0, 4.0, .45, 4.4);
    part(add, p, stoneLight, lateral, .53, .33, 2.21, .56, 1.91);
    part(add, p, stone, lateral, 1.26, 1.03, 2.26, 1.75, .47);
    for (const side of [-1, 1]) part(add, p, stoneLight, lateral + side * .95, .92, .43, .37, .78, 1.8);
    part(add, p, color, lateral, 2.27, 1.06, 2.46, .39, .66);
    part(add, p, signMaterial(destination.label, '#273e36', '#f8e5a6'), lateral, 1.75, .771, 1.71, .33, 1, 0, signPlane);
    const [x, z] = at(p, lateral, .15);
    const throne = new Body({ mass: 0, shape: new Box(new Vec3(1.18, .86, 1.14)), position: new Vec3(x, .86, z) });
    throne.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), p.yaw);
    throne.aabbNeedsUpdate = true;
    throne.addEventListener('collide', ({ body }) => {
      if (body.collisionFilterGroup === 4 && body.velocity.lengthSquared() > .25) pending.set(body, destination);
    });
    world.addBody(throne);
  }

  for (let i = 0; i < 730; i++) {
    const meters = random() * route.length;
    if (crossings.some(crossing => route.separation(crossing, meters) < 21) ||
        rallyStops.some(stop => route.separation(stop.meters, meters) < 19)) continue;
    const p = route.sample(meters);
    const lateral = random() > .19 ? -13.7 - random() * 28 : 21.8 + random() * 10;
    const [x, z] = at(p, lateral, 0);
    const y = terrain.height(x, z);
    const scale = random();
    if (y < -.19) continue;
    if (i % 5 === 0) palm(add, x, z, y, 3.39 + scale * 4.75, i);
    else if (i % 4 === 0) add(i % 3 ? moss : stone, x, y + scale * .48, z,
      1.15 + scale * 2.25, .53 + scale * 1.72, .87 + scale * 1.74, i, rock);
    else for (let n = 0; n < 3; n++) add(n % 2 ? leaf : leafLight, x + (n - 1) * .28, y + .24, z + Math.sin(n) * .43,
      .51 + scale * .37, .47 + scale * .62, .42 + scale * .50, i + n, tuft);
  }
  for (const meters of crossings) {
    const p = route.sample(meters);
    for (let i = 0; i < 32; i++) {
      const along = (i % 2 ? 1 : -1) * (6.9 + random() * 5.5);
      const lateral = (i % 3 ? 1 : -1) * (12.6 + random() * 22);
      const [x, z] = at(p, lateral, along);
      const y = terrain.height(x, z);
      if (y < -.73) continue;
      add(i % 3 ? stone : moss, x, y + .27, z, 1.8 + random(), .78 + random(), 1.7, i, rock);
      if (i % 4 === 0 && y > -.17) palm(add, x, z, y, 3.8 + random() * 2.7, i);
    }
  }
  for (let i = 0; i < route.length / 9; i++) {
    const meters = i * 9;
    if (crossings.some(crossing => route.separation(meters, crossing) < 18)) continue;
    const p = route.sample(meters);
    for (const side of [-1, 1]) {
      part(add, p, darkWood, side * 7.3, .28, 0, .119, .55, .12);
      part(add, p, i % 2 ? teal : chalk, side * 7.3, .52, 0, .13, .13, .135);
    }
  }

  const birds = Array.from({ length: 10 }, (_, i) => {
    const bird = new THREE.Group();
    parent.add(bird);
    const wings = [-1, 1].map(side => {
      const wing = new THREE.Group();
      const mesh = new THREE.Mesh(plank, chalk);
      mesh.position.set(side * .32, 0, .093);
      mesh.scale.set(.67, .034, .13);
      mesh.rotation.y = side * .29;
      wing.add(mesh);
      bird.add(wing);
      return wing;
    });
    return { bird, wings, i };
  });
  return {
    takeArrival(body) {
      const destination = pending.get(body);
      pending.clear();
      return destination;
    },
    animate(time) {
      for (const { bird, wings, i } of birds) {
        const phase = time * .24 + i * .27;
        bird.position.set(Math.cos(phase) * (39 + i * 4) + 53, 10 + Math.sin(phase * 3 + i) * 1.45 + i * .31,
          Math.sin(phase) * (40 + i * 4) - 35);
        bird.rotation.y = -phase - .09;
        wings[0].rotation.z = Math.sin(time * 7 + i * .4) * .39;
        wings[1].rotation.z = -wings[0].rotation.z;
      }
      for (const [i, lamp] of lamps.children.entries()) lamp.scale.setScalar(1 + Math.sin(time * 4 + i) * .13);
    },
  };
}
