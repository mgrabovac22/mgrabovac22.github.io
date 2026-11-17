import * as THREE from 'three';
import { rallyBridges, rallyJumps, rallyStops } from './drive-rally-terrain.js';
import { buildRallyMarina } from './drive-rally-marina.js';

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

function plantPalm(props, x, z, y, height, yaw) {
  props.place({ x, y: y + height / 2, z, yaw, bounds: [.23, height / 2, .25], mass: 41, effect: 'leaves', tip: 1.48 },
    draw => palm(draw, x, z, y, height, yaw));
}

function looseRock(props, x, y, z, w, h, d, yaw, material, geometry = rock) {
  props.place({ x, y, z, yaw, bounds: [w * .44, h * .47, d * .43], mass: 14 + w * h * d * 12, effect: 'dust', tip: .81 },
    draw => draw(material, x, y, z, w, h, d, yaw, geometry));
}

function brush(props, x, y, z, size, yaw) {
  props.place({ x, y: y + .26, z, yaw, bounds: [.23, .29, .24], mass: 3.8, effect: 'leaves' }, draw => {
    for (let i = 0; i < 4; i++) draw(i % 2 ? leaf : leafLight, x + Math.cos(i * 2.4) * .23, y + .24, z + Math.sin(i * 2.4) * .24,
      size * .78, size * (.67 + i * .13), size * .63, yaw + i, tuft);
  });
}

function forest(props, route, terrain, random, crossings) {
  for (const [station, count] of [[41, 35], [230, 42], [465, 37], [690, 45], [840, 24]]) {
    const roots = [];
    for (let i = 0; i < count * 3 && roots.length < count; i++) {
      const meters = station + (random() - .5) * 56;
      if (crossings.some(cut => route.separation(cut, meters) < 23) || rallyStops.some(stop => route.separation(stop.meters, meters) < 19)) continue;
      const p = route.sample(meters);
      const [x, z] = at(p, -14 - random() * 27, 0);
      const y = terrain.height(x, z);
      if (y < -.20 || roots.some(([px, pz]) => Math.hypot(x - px, z - pz) < 2.2)) continue;
      roots.push([x, z]);
      const height = 3.6 + random() * 5.9;
      if (i % 4 === 0) {
        props.place({ x, y: y + height / 2, z, yaw: i, bounds: [.29, height / 2, .29], mass: 53, effect: 'leaves', tip: 1.5 }, draw => {
          draw(darkWood, x, y + height / 2, z, .52, height, .55, i, trunk);
          for (let branch = 0; branch < 6; branch++) {
            const angle = i + branch * 2.4;
            draw(branch % 2 ? leaf : leafLight, x + Math.cos(angle) * 1.1, y + height * (.86 + branch * .026),
              z + Math.sin(angle) * 1.27, 2.8 + branch * .21, 1.8 + branch * .11, 2.7, angle, rock);
          }
        });
      } else plantPalm(props, x, z, y, height, i);
      if (i % 3 !== 1) brush(props, x + 1.08, y, z + .80, .86 + random(), i);
    }
  }
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

function stoneCircle(add, props, p, lateral) {
  for (let i = 0; i < 11; i++) {
    const angle = (i + .5) / 11 * Math.PI * 2;
    const center = [lateral + Math.cos(angle) * 8.4, Math.sin(angle) * 8.3];
    const h = 3.15 + (i % 3) * .47;
    if (i === 0) continue;
    const [x, z] = at(p, ...center);
    props.place({ x, y: h * .45, z, yaw: p.yaw + angle, bounds: [.65, h * .44, .71], mass: 118, effect: 'dust', tip: 1.64 }, draw => {
      part(draw, p, i % 3 ? stone : stoneLight, center[0], h * .45, center[1], 1.62, h, 1.88, angle, monolith);
      part(draw, p, moss, center[0] + .40, h * .68, center[1] + .39, .47, .76, 1.32, angle, rock);
    });
    if (i % 2 === 1 && i !== 9) {
      const [capX, capZ] = at(p, lateral + Math.cos(angle + .27) * 8.05, Math.sin(angle + .27) * 8.05);
      looseRock(props, capX, 3.25, capZ, 1.24, .71, 4.93, p.yaw + angle - Math.PI / 2, stoneLight, monolith);
    }
  }
  const [altarX, altarZ] = at(p, lateral, 0);
  props.place({ x: altarX, y: .46, z: altarZ, yaw: p.yaw + .23, bounds: [2.1, .43, 1.34], mass: 159, effect: 'dust' }, draw => {
    part(draw, p, stone, lateral, .42, 0, 4.7, .96, 3.0, .23, rock);
    part(draw, p, moss, lateral, .77, 0, 4.1, .28, 2.1, .23, rock);
  });
  for (let i = 0; i < 7; i++) part(add, p, stoneLight, -8.4 - i * 1.26, .065, -1.7, 1.07, .18, 2.45, i * .06, rock);
}

function marker(add, p, lateral, along, title, signMaterial, color) {
  part(add, p, darkWood, lateral, 1.09, along, .18, 2.18, .19);
  part(add, p, color, lateral, 1.84, along, 3.0, .73, .20);
  part(add, p, signMaterial(title, '#263c36', '#fff0c6'), lateral, 1.84, along - .111, 2.89, .66, 1, 0, signPlane);
}

export function buildRallyScenery(parent, props, route, terrain, add, random, destinations, signMaterial) {
  const crossings = [...rallyJumps.map(jump => jump.meters), ...rallyBridges];
  const pending = new Map();
  const lampGeo = new THREE.OctahedronGeometry(.18);
  for (const stop of rallyStops) {
    const p = route.sample(stop.meters);
    const { id, lateral } = stop;
    if (id === 'stones') {
      marker(add, p, -9.8, -7.5, 'STONEHENGE', signMaterial, wood);
      stoneCircle(add, props, p, lateral);
      continue;
    }
    const destination = destinations.get(id);
    if (!destination) continue;
    const color = id === 'linkedin' ? indigo : id === 'github' ? teal : wood;
    marker(add, p, -8.9, -8.2, destination.label, signMaterial, color);
    for (let i = 0; i < 6; i++) part(add, p, stoneLight, -8.1 - i * 1.26, .065, 0, 1.15, .16, 4.8, i * .04, rock);
    for (const along of [-5.5, 5.5]) {
      const hutAlong = along + Math.sign(along) * 2.2;
      const hutLateral = lateral - 5.2;
      const [hutX, hutZ] = at(p, hutLateral, hutAlong);
      props.place({ x: hutX, y: 2.1, z: hutZ, yaw: p.yaw, bounds: [2.64, 2.08, 2.34], mass: 112, effect: 'timber', tip: 1.73 },
        draw => hut(draw, p, hutLateral, hutAlong, color));
      const [x, z] = at(p, lateral + 1.7, along);
      plantPalm(props, x, z, 0, 5.4, along);
      const [lampX, lampZ] = at(p, lateral + 4.6, along);
      props.place({ x: lampX, y: .71, z: lampZ, yaw: p.yaw, bounds: [.082, .71, .082], mass: 7, effect: 'sparks' }, draw => {
        draw(darkWood, lampX, .67, lampZ, .10, 1.34, .12, p.yaw);
        draw(amber, lampX, 1.45, lampZ, 1, 1, 1, p.yaw, lampGeo);
      });
    }
    const [x, z] = at(p, lateral, .15);
    part(add, p, stone, lateral, .10, 0, 4.0, .22, 4.4);
    props.place({ x, y: 1.01, z, yaw: p.yaw, bounds: [1.14, .83, 1.07], mass: 126, effect: 'dust', tip: 1.10,
      onImpact: driver => pending.set(driver, destination) }, draw => {
      part(draw, p, stoneLight, lateral, .53, .33, 2.21, .56, 1.91);
      part(draw, p, stone, lateral, 1.26, 1.03, 2.26, 1.75, .47);
      for (const side of [-1, 1]) part(draw, p, stoneLight, lateral + side * .95, .92, .43, .37, .78, 1.8);
      part(draw, p, color, lateral, 2.27, 1.06, 2.46, .39, .66);
      part(draw, p, signMaterial(destination.label, '#273e36', '#f8e5a6'), lateral, 1.75, .771, 1.71, .33, 1, 0, signPlane);
    });
  }

  for (let i = 0; i < 380; i++) {
    const meters = random() * route.length;
    if (crossings.some(crossing => route.separation(crossing, meters) < 21) ||
        rallyStops.some(stop => route.separation(stop.meters, meters) < 19)) continue;
    const p = route.sample(meters);
    const lateral = random() > .19 ? -13.7 - random() * 28 : 21.8 + random() * 10;
    const [x, z] = at(p, lateral, 0);
    const y = terrain.height(x, z);
    const scale = random();
    if (y < -.19) continue;
    if (i % 5 === 0) plantPalm(props, x, z, y, 3.39 + scale * 4.75, i);
    else if (i % 4 === 0) {
      const h = .53 + scale * 1.72;
      looseRock(props, x, y + h * .45, z, 1.15 + scale * 2.25, h, .87 + scale * 1.74, i, i % 3 ? moss : stone);
    } else brush(props, x, y, z, .61 + scale * .70, i);
  }
  forest(props, route, terrain, random, crossings);
  for (const meters of crossings) {
    const p = route.sample(meters);
    for (let i = 0; i < 32; i++) {
      const along = (i % 2 ? 1 : -1) * (6.9 + random() * 5.5);
      const lateral = (i % 3 ? 1 : -1) * (12.6 + random() * 22);
      const [x, z] = at(p, lateral, along);
      const y = terrain.height(x, z);
      if (y < -.73) continue;
      const h = .78 + random();
      looseRock(props, x, y + h * .44, z, 1.8 + random(), h, 1.7, i, i % 3 ? stone : moss);
      if (i % 4 === 0 && y > -.17) plantPalm(props, x + 2.2, z, y, 3.8 + random() * 2.7, i);
    }
  }
  for (let i = 0; i < route.length / 9; i++) {
    const meters = i * 9;
    if (crossings.some(crossing => route.separation(meters, crossing) < 18)) continue;
    const p = route.sample(meters);
    for (const side of [-1, 1]) {
      const [x, z] = at(p, side * 7.3, 0);
      props.place({ x, y: .29, z, yaw: p.yaw, bounds: [.068, .29, .072], mass: 4, effect: 'timber' }, draw => {
        draw(darkWood, x, .28, z, .119, .55, .12, p.yaw);
        draw(i % 2 ? teal : chalk, x, .52, z, .13, .13, .135, p.yaw);
      });
    }
  }
  const marina = buildRallyMarina(parent, props, route, terrain, random);

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
      marina.update(time);
    },
  };
}
