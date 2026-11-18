import * as THREE from 'three';
import { Body, Box, ConvexPolyhedron, Quaternion, Vec3 } from 'cannon-es';

export const keepLevel = 4.45;
const edge = 10.85;
const landing = 7.05;
const well = 7.14;
const halfWell = 1.46;
const deck = .28;
const wall = .53;

const surface = (color, roughness = .91) => new THREE.MeshStandardMaterial({ color, roughness });
const pale = surface(0xc5b491);
const sandstone = surface(0xa5a286);
const inset = surface(0x858d75);
const timber = surface(0x6d4534);
const terracotta = surface(0xa6533d);
const brass = surface(0xcaa16b, .64);
const iron = surface(0x3f5f59, .68);
const floor = surface(0xb8aa86);
const opal = surface(0x6e9995, .46);
const midnight = new THREE.MeshBasicMaterial({ color: 0x243d38 });
const light = new THREE.MeshBasicMaterial({ color: 0xf0c779 });
const cylinder = new THREE.CylinderGeometry(.5, .55, 1, 15);
const roofs = new THREE.ConeGeometry(.5, 1, 8).rotateY(Math.PI / 8);
const cutStone = new THREE.IcosahedronGeometry(.5, 1);
const twill = new THREE.MeshStandardMaterial({ color: 0x42736b, side: THREE.DoubleSide, roughness: .87 });
const copper = new THREE.MeshStandardMaterial({ color: 0x8a6753, side: THREE.DoubleSide, roughness: .70 });
const axis = new Vec3(0, 1, 0);
const roofY = keepLevel * 3;
const ledgerZ = 3.55;

export function inCastleKeep(position) {
  const x = Math.abs(position.x), z = Math.abs(position.z);
  return (x < edge + .24 && z < edge + .24 || x > 10 && z > 10 && x < 16.4 && z < 16.4) &&
    position.y < roofY + 15;
}

export function keepCollision(world, x, y, z, w, h, d, yaw = 0) {
  const body = new Body({
    mass: 0, material: world.defaultMaterial,
    shape: new Box(new Vec3(w / 2, h / 2, d / 2)),
    position: new Vec3(x, y, z), quaternion: new Quaternion().setFromAxisAngle(axis, yaw),
  });
  world.addBody(body);
}

function slab(add, world, x, level, z, width, length, skin = floor, angle = 0) {
  add(skin, x, level - deck / 2, z, width, deck, length, angle);
  keepCollision(world, x, level - deck / 2, z, width, deck, length, angle);
}

function floorSections(add, world, level) {
  slab(add, world, 0, level, 0, (well - halfWell) * 2, edge * 2);
  for (const side of [-1, 1]) {
    const rim = well + halfWell;
    slab(add, world, side * (edge + rim) / 2, level, 0, edge - rim, edge * 2);
    for (const end of [-1, 1]) slab(add, world, side * well, level, end * (landing + edge) / 2, halfWell * 2, edge - landing);
    for (const x of [side * (well - halfWell), side * (well + halfWell)]) {
      for (const finish of [.32, .69]) add(timber, x, level + finish, 0, .105, .12, landing * 2);
      for (let z = -6.65; z < 7.0; z += 2.22) {
        add(pale, x, level + .365, z, .15, .73, .15);
        add(brass, x, level + .755, z, .20, .07, .20);
      }
      keepCollision(world, x, level + .44, 0, .10, .88, landing * 2);
    }
  }
  for (const direction of [-1, 1]) {
    for (let i = 1; i < 6; i++) add(inset, 0, level + .012, direction * (i * 1.56), 2.57, .031, 1.47);
  }
}

function stairs(add, world, level, side) {
  const low = level * keepLevel;
  const x = side * well;
  const width = halfWell * 2 - .15;
  const length = landing * 2;
  const rise = keepLevel;
  const steps = 30;
  for (let i = 0; i < steps; i++) {
    const tread = length / steps;
    const z = -side * (landing - (i + .5) * tread);
    const top = low + rise * (i + 1) / steps;
    add(i % 5 === 0 ? sandstone : pale, x, top - .107, z, width, .211, tread + .007);
    add(inset, x, top - .163, z, width - .08, .093, tread + .021);
  }
  // The stair treads share a continuous collision surface for the avatar's small foot capsule.
  const nearZ = length / 2, farZ = -nearZ;
  const topA = -rise / 2, topB = rise / 2;
  const v = width / 2;
  const vertices = [
    [-v, topA, nearZ], [v, topA, nearZ], [v, topB, farZ], [-v, topB, farZ],
    [-v, topA - .23, nearZ], [v, topA - .23, nearZ], [v, topB - .23, farZ], [-v, topB - .23, farZ],
  ].map(coords => new Vec3(...coords));
  world.addBody(new Body({
    mass: 0, material: world.defaultMaterial,
    shape: new ConvexPolyhedron({ vertices, faces: [[0,1,2,3],[7,6,5,4],[4,5,1,0],[5,6,2,1],[6,7,3,2],[7,4,0,3]] }),
    position: new Vec3(x, low + rise / 2, 0),
    quaternion: new Quaternion().setFromAxisAngle(axis, side === 1 ? Math.PI : 0),
  }));
}

function panel(add, yaw, cross, y, depth, material, w, h, d, geometry) {
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  add(material, sin * depth + cos * cross, y, cos * depth - sin * cross, w, h, d, yaw, geometry);
}

function keepWalls(add, world) {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const dx = Math.sin(yaw), dz = Math.cos(yaw);
    for (let level = 0; level < 3; level++) {
      const y = level * keepLevel;
      const maxX = level ? 9.06 : edge;
      const gate = level === 0 ? 2.66 : 1.98;
      for (const side of [-1, 1]) {
        const width = maxX - gate;
        const middle = side * (maxX + gate) / 2;
        keepCollision(world, dx * edge + dz * middle, y + keepLevel / 2, dz * edge - dx * middle,
          width, keepLevel, wall, yaw);
        for (let row = 0; row < 6; row++) {
          let last = gate;
          for (let n = 0; n < 5; n++) {
            const end = n === 4 ? maxX : gate + (n + 1.0 + (row % 2) * .22) * width / 5;
            panel(add, yaw, side * (end + last) / 2, y + (row + .5) * keepLevel / 6, edge,
              (row + n + level) % 6 === 0 ? inset : sandstone, end - last - .022, keepLevel / 6 - .031, wall);
            last = end;
          }
        }
        for (const cross of [gate + .55, gate + 2.67, maxX - .51]) {
          panel(add, yaw, side * cross, y + 2.48, edge + .268, midnight, .29, .92, .023);
          panel(add, yaw, side * cross, y + 2.02, edge + .29, pale, .62, .11, .28);
        }
        panel(add, yaw, side * (gate + .14), y + 1.46, edge + .13, pale, .23, 2.95, .83);
        panel(add, yaw, side * (gate + .29), y + 2.43, edge + .46, iron, .15, .19, .24);
        panel(add, yaw, side * (gate + .29), y + 2.62, edge + .52, light, .167, .23, .17, cutStone);
      }
      for (let i = -8; i <= 8; i++) {
        const across = gate * i / 8.2;
        const shoulder = y + 2.84 + Math.sqrt(gate ** 2 - across ** 2) * .32;
        panel(add, yaw, across, shoulder + (y + keepLevel - shoulder) / 2, edge,
          i === 0 ? pale : sandstone, gate / 8.2 + .025, y + keepLevel - shoulder, wall + .045);
        panel(add, yaw, across, shoulder, edge + .06, pale, gate / 8.2 + .022, .19, wall + .25);
      }
      keepCollision(world, dx * edge, y + keepLevel - .47, dz * edge, gate * 2, .94, wall, yaw);
      panel(add, yaw, 0, y + keepLevel - .07, edge, pale, level ? 17.98 : edge * 2.03, .163, wall + .25);
      if (level > 0) {
        slab(add, world, dx * (edge + 1.09), y, dz * (edge + 1.09), 4.9, 2.64, pale, yaw);
        panel(add, yaw, 0, y + .62, edge + 2.29, timber, 4.89, .14, .114);
        keepCollision(world, dx * (edge + 2.29), y + .42, dz * (edge + 2.29), 4.89, .84, .12, yaw);
        for (const side of [-1, 1]) {
          const c = side * 2.39;
          panel(add, yaw, c, y+.43, edge + 1.25, pale, .13,.86,2.18);
          keepCollision(world, dx*(edge+1.25)+dz*c, y+.43, dz*(edge+1.25)-dx*c, .13,.86,2.18,yaw);
        }
      }
    }
    for (let index = -7; index <= 7; index++) {
      panel(add, yaw, index * 1.34, roofY + .49, edge, index % 3 === 0 ? inset : pale, .73, .99, .74);
    }
    keepCollision(world, dx * edge, roofY + .39, dz * edge, 17.98, .78, wall, yaw);
  }
}

function tower(add, world, sx, sz) {
  const x = sx * 13.27, z = sz * 13.27;
  for (let level = 0; level <= 3; level++) {
    const y = level * keepLevel;
    if (level) {
      slab(add, world, x, y, z, 5.25, 5.25, sandstone);
      const cx = sx * 11.52, cz = sz * 11.52;
      const yaw = Math.atan2(sx, sz);
      slab(add, world, cx, y, cz, 2.72, 5.96, pale, yaw);
      for (const side of [-1, 1]) {
        const tx = cx + Math.cos(yaw) * side * 1.28;
        const tz = cz - Math.sin(yaw) * side * 1.28;
        add(timber, tx, y + .56, tz, .10, .10, 5.84, yaw);
        keepCollision(world, tx, y + .38, tz, .12, .76, 5.84, yaw);
        for (let along = -2.65; along < 2.9; along += 1.78) {
          add(pale, tx + Math.sin(yaw) * along, y + .31, tz + Math.cos(yaw) * along, .17,.62,.17,yaw);
        }
      }
    }
    for (const a of [-1, 1]) for (const b of [-1, 1]) {
      if (level && a === -sx && b === -sz) continue;
      const px = x + a * 2.18, pz = z + b * 2.18;
      const h = level < 3 ? keepLevel : 4.15;
      add(level % 2 ? sandstone : pale, px, y + h/2, pz, .83, h, .83);
      add(inset, px, y + .20, pz, .93,.38,.93);
      add(pale, px, y + h - .20, pz, .99,.36,.99);
      keepCollision(world, px, y + h/2, pz, .73,h,.73);
    }
    for (const across of [-1, 1]) {
      add(pale, x + across * 2.26, y + 3.49, z, .56,.34,5.16);
      add(pale, x, y + 3.49, z + across*2.26, 5.16,.34,.56);
      if (level > 0) {
        add(iron, x + sx*2.21, y+.65, z, .17,.11,4.42);
        add(iron, x, y+.65, z + sz*2.21, 4.42,.11,.17);
        keepCollision(world, x + sx*2.21, y+.37, z, .15,.74,4.66);
        keepCollision(world, x, y+.37, z + sz*2.21, 4.66,.74,.15);
      }
    }
  }
  add(pale,x,roofY+4.13,z,5.83,.38,5.82);
  add(iron,x,roofY+6.7,z,7.14,5.33,7.14,0,roofs);
  add(brass,x,roofY+9.54,z,.23,.74,.23,0,cylinder);
  add(brass,x,roofY+9.96,z,.41,.38,.41,0,cutStone);
}

function hall(parent, add, world) {
  for (const x of [-3.54, 3.54]) for (const z of [-4.53, 4.53]) {
    for (let level = 0; level < 3; level++) {
      const y = keepLevel * level;
      add(pale, x, y+.13,z,.68,.26,.68);
      add(sandstone, x,y+2.13,z,.44,3.98,.44,0,cylinder);
      add(pale, x,y+4.07,z,.73,.28,.73);
      keepCollision(world,x,y+2.18,z,.36,keepLevel,.36);
      add(brass,x,y+2.65,z+.28,.28,.22,.29);
      add(light,x,y+2.86,z+.34,.13,.29,.13,0,cutStone);
    }
  }
  for (let level = 0; level < 4; level++) {
    const y = level * keepLevel;
    for (const z of [-4.45, 4.45]) {
      for (const side of [-1, 1]) {
        const x = side * 2.02;
        add(terracotta,x,y+.027,z,2.72,.049,2.50);
        add(brass,x,y+.053,z-.99,2.67,.024,.075);
        add(brass,x,y+.053,z+.99,2.67,.024,.075);
      }
    }
    if (level === 3) continue;
    for (const side of [-1, 1]) {
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(.72,1.16), side < 0 ? twill : copper);
      banner.position.set(side * 4.45,y + 3.11,side * 8.42);
      banner.rotation.y = side < 0 ? Math.PI : 0;
      parent.add(banner);
      add(brass,banner.position.x,y+3.71,banner.position.z,.97,.054,.075);
    }
  }
  // A clear line through the ground hall keeps the courtyard delivery route playable.
  add(opal, 0, .055, ledgerZ - .88, 2.27, .035, .13);
}

export function buildCastleKeep(parent, world, add) {
  keepWalls(add, world);
  for (let n = 1; n <= 3; n++) floorSections(add, world, n * keepLevel);
  for (let level = 0; level < 3; level++) for (const side of [-1, 1]) stairs(add, world, level, side);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) tower(add, world, sx, sz);
  hall(parent, add, world);
}
