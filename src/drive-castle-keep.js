import * as THREE from 'three';
import { Body, Box, ConvexPolyhedron, Quaternion, Vec3 } from 'cannon-es';

export const keepLevel = 4.45;
const edge = 10.85;
const landing = 7.05;
const well = 7.14;
const halfWell = 1.46;
const deck = .28;
const wall = .53;
const mainPlan = { edgeX: edge, edgeZ: edge, landing, well, halfWell };
const upperPlan = { edgeX: 6.24, edgeZ: 7.72, landing: 5.6, well: 3.49, halfWell: 1.19 };
const observatory = 6 * keepLevel;
const towerCenter = 13.27;
const towerHalf = 3.12;

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
export const squareRoof = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4);
const gable = new THREE.CylinderGeometry(.5, .5, 1, 3, 1).rotateX(Math.PI / 2);
const cutStone = new THREE.IcosahedronGeometry(.5, 1);
const twill = new THREE.MeshStandardMaterial({ color: 0x42736b, side: THREE.DoubleSide, roughness: .87 });
const copper = new THREE.MeshStandardMaterial({ color: 0x8a6753, side: THREE.DoubleSide, roughness: .70 });
const axis = new Vec3(0, 1, 0);
const roofY = keepLevel * 3;
const ledgerZ = 3.55;

export function inCastleKeep(position) {
  const x = Math.abs(position.x), z = Math.abs(position.z);
  const tower = Math.abs(x - towerCenter) + Math.abs(z - towerCenter) < towerHalf * Math.SQRT2 + .34;
  return (x < edge + .24 && z < edge + .24 || tower || x > 10 && z > 10 && x < towerCenter && z < towerCenter) &&
    position.y < observatory + 6;
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

function floorSections(add, world, level, plan = mainPlan) {
  const { edgeX, edgeZ, well, halfWell, landing } = plan;
  slab(add, world, 0, level, 0, (well - halfWell) * 2, edgeZ * 2);
  for (const side of [-1, 1]) {
    const rim = well + halfWell;
    slab(add, world, side * (edgeX + rim) / 2, level, 0, edgeX - rim, edgeZ * 2);
    for (const end of [-1, 1]) slab(add, world, side * well, level, end * (landing + edgeZ) / 2, halfWell * 2, edgeZ - landing);
    for (const x of [side * (well - halfWell), side * (well + halfWell)]) {
      for (const finish of [.32, .69]) add(timber, x, level + finish, 0, .105, .12, landing * 2);
      for (let z = -landing + .4; z < landing; z += 2.22) {
        add(pale, x, level + .365, z, .15, .73, .15);
        add(brass, x, level + .755, z, .20, .07, .20);
      }
      keepCollision(world, x, level + .44, 0, .10, .88, landing * 2);
    }
  }
  for (const direction of [-1, 1]) {
    for (let z = 1.56; z < edgeZ - .78; z += 1.56) add(inset, 0, level + .012, direction * z, 2.57, .031, 1.47);
  }
}

function stairs(add, world, level, side, plan = mainPlan) {
  const { well, halfWell, landing } = plan;
  const low = level * keepLevel;
  const x = side * well;
  const width = halfWell * 2 - .15;
  const length = landing * 2;
  const rise = keepLevel;
  const steps = plan === mainPlan ? 30 : 26;
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

function masonry(add, world, x, y, z, width, height, depth, yaw = 0, material = sandstone) {
  add(material, x, y, z, width, height, depth, yaw);
  keepCollision(world, x, y, z, width, height, depth, yaw);
}

function towerShell(add, world, x, z, y, yaw, level) {
  const open = level === 3;
  const height = open ? 4.15 : keepLevel;
  const width = towerHalf * 2;
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  for (const a of [-towerHalf, towerHalf]) for (const b of [-towerHalf, towerHalf]) {
    const px = x + cos * a + sin * b, pz = z - sin * a + cos * b;
    masonry(add, world, px, y + height / 2, pz, .42, height, .42, yaw, pale);
    add(inset, px, y + .21, pz, .54, .34, .54, yaw);
    add(pale, px, y + height - .22, pz, .58, .29, .58, yaw);
  }

  for (const turn of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const direction = yaw + turn;
    const sine = Math.sin(direction), cosine = Math.cos(direction);
    const centerX = x + sine * towerHalf, centerZ = z + cosine * towerHalf;
    const passage = turn === Math.PI;
    const gap = passage ? 2.48 : level === 0 ? 2.11 : 0;
    const parts = gap ? [-1, 1].map(side => [side * (width + gap) / 4, (width - gap) / 2]) : [[0, width]];
    function part(material, across, h, depth, w, sizeY, d, collides = false) {
      const px = centerX + across * cosine + depth * sine;
      const pz = centerZ - across * sine + depth * cosine;
      add(material, px, y + h, pz, w, sizeY, d, direction);
      if (collides) keepCollision(world, px, y + h, pz, w, sizeY, d, direction);
    }
    part(pale, 0, height - .17, 0, width + .15, .33, .53);

    if (open) {
      for (const [middle, span] of parts) {
        part(pale, middle, .145, 0, span, .29, .31);
        part(iron, middle, .95, 0, span, .13, .17);
        for (let across = middle - span / 2 + .23; across < middle + span / 2; across += .54) {
          part(iron, across, .53, 0, .071, .84, .11);
        }
        keepCollision(world, centerX + middle * cosine, y + .48, centerZ - middle * sine, span, .96, .17, direction);
      }
      continue;
    }

    for (const [middle, span] of parts) {
      part(level % 2 ? pale : sandstone, middle, height / 2, 0, span, height, .38, true);
      for (const h of [.24, 1.09, 3.76]) part(inset, middle, h, 0, span, .085, .40);
      if (span < 1.65) continue;
      const windows = gap ? [middle] : [-1.33, 1.33];
      for (const across of windows) for (const depth of [-.196, .196]) {
        part(midnight, across, 2.48, depth, .29, 1.17, .023);
        part(pale, across, 1.88, depth, .61, .13, .22);
        part(brass, across, 3.11, depth, .53, .13, .19);
      }
    }
    if (gap) {
      for (const side of [-1, 1]) part(pale, side * (gap / 2 + .095), 1.46, 0, .17, 2.92, .55);
      part(pale, 0, (height + 3.02) / 2, 0, gap + .03, height - 3.02, .42, true);
      for (let i = -5; i <= 5; i++) {
        const across = i * gap / 11;
        const arch = 2.54 + .48 * Math.sqrt(1 - (2 * across / gap) ** 2);
        part(pale, across, arch, 0, gap / 11 + .026, .17, .57);
      }
    }
  }
}

function tower(add, world, sx, sz) {
  const x = sx * towerCenter, z = sz * towerCenter;
  const yaw = Math.atan2(sx, sz);
  const bridgeStart = 9.34 * Math.SQRT2;
  const bridgeEnd = towerCenter * Math.SQRT2 - towerHalf + .13;
  const bridgeLength = bridgeEnd - bridgeStart;
  const center = (bridgeStart + bridgeEnd) / 2 / Math.SQRT2;
  for (let level = 0; level <= 3; level++) {
    const y = level * keepLevel;
    if (level) {
      const span = towerHalf * 2 + .07;
      slab(add, world, x, y, z, span, span, sandstone, yaw);
      slab(add, world, sx * center, y, sz * center, 2.72, bridgeLength, pale, yaw);
      for (const side of [-1, 1]) {
        const tx = sx * center + Math.cos(yaw) * side * 1.27;
        const tz = sz * center - Math.sin(yaw) * side * 1.27;
        add(timber, tx, y + .56, tz, .10, .10, bridgeLength - .14, yaw);
        keepCollision(world, tx, y + .38, tz, .12, .76, bridgeLength - .14, yaw);
        for (const along of [-.94, 0, .94]) {
          add(pale, tx + Math.sin(yaw) * along, y + .31, tz + Math.cos(yaw) * along, .17, .62, .17, yaw);
        }
      }
    }
    towerShell(add, world, x, z, y, yaw, level);
  }
  add(pale, x, roofY + 4.13, z, 6.92, .46, 6.92, yaw);
  add(inset, x, roofY + 4.36, z, 7.23, .19, 7.23, yaw);
  finial(add, x, z, roofY + 4.40, 7.55, sx === sz ? 6.0 : 5.25, iron, yaw);
}

function hall(parent, add, world) {
  for (const x of [-1.47, 1.47]) for (const z of [-1.86, 1.86]) {
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

function finial(add, x, z, base, width, height, metal = iron, yaw = 0) {
  add(metal, x, base + height / 2, z, width, height, width, yaw, squareRoof);
  add(brass, x, base + height + .23, z, .19, .61, .19, 0, cylinder);
  add(brass, x, base + height + .60, z, .32, .33, .32, 0, cutStone);
}

function roomPartitions(add, world, level) {
  const y = level * keepLevel;
  for (const xSide of [-1, 1]) for (const zSide of [-1, 1]) {
    const x = xSide * 1.94;
    const wallTone = level % 2 ? sandstone : pale;
    for (const [start, end] of [[1.87, 3.58], [5.76, 7.60]]) {
      masonry(add, world, x, y + keepLevel / 2, zSide * (start + end) / 2, .24, keepLevel, end - start, 0, wallTone);
    }
    masonry(add, world, x, y + 3.61, zSide * 4.67, .24, 1.68, 2.22, 0, wallTone);
    for (const z of [3.57, 5.77]) {
      add(timber, x, y + 1.39, zSide * z, .32, 2.76, .13);
      add(brass, x, y + 2.65, zSide * z, .37, .14, .18);
    }
    add(timber, x, y + 2.79, zSide * 4.67, .35, .21, 2.36);
    for (const z of [1.87, 7.60]) {
      masonry(add, world, xSide * 3.65, y + keepLevel / 2, zSide * z, 3.66, keepLevel, .23, 0, wallTone);
      add(inset, xSide * 3.65, y + .16, zSide * z, 3.66, .19, .31);
    }
    masonry(add, world, xSide * 5.43, y + keepLevel / 2, zSide * 4.74, .27, keepLevel, 5.73, 0, wallTone);

    const bookcase = (xSide === zSide) !== (level === 1);
    const fx = xSide * 5.11, fz = zSide * 6.35;
    if (bookcase) {
      masonry(add, world, fx, y + 1.12, fz, .43, 2.24, 1.74, 0, timber);
      for (const shelf of [.35, .93, 1.51]) {
        add(timber, fx - xSide * .20, y + shelf, fz, .53, .073, 1.78);
        for (let book = 0; book < 8; book++) {
          const spine = [iron, terracotta, brass, inset][(book + Math.round(shelf * 10)) % 4];
          const h = .22 + .065 * (book % 4);
          add(spine, fx - xSide * .21, y + shelf + .046 + h / 2, fz - .70 + book * .19, .20, h, .13);
        }
      }
    } else {
      add(timber, fx, y + .45, fz, .39, .81, 1.69);
      add(pale, fx, y + .89, fz, .47, .10, 1.73);
      for (let jar = 0; jar < 3; jar++) {
        add(jar % 2 ? opal : terracotta, fx, y + 1.12, fz - .53 + .53 * jar, .31, .36, .31, 0, cutStone);
        add(brass, fx, y + 1.29, fz - .53 + .53 * jar, .16, .055, .16, 0, cylinder);
      }
      masonry(add, world, fx, y + .45, fz, .42, .93, 1.69, 0, timber);
    }
    const fabric = bookcase ? iron : terracotta;
    const backdrop = zSide * 7.46;
    const hangingX = xSide * 3.42;
    add(fabric, hangingX, y + 2.27, backdrop, 1.38, 1.41, .054);
    for (const border of [-.59, .59]) add(brass, hangingX + border, y + 2.27, backdrop - zSide * .031, .036, 1.35, .025);
    add(brass, hangingX, y + 2.98, backdrop, 1.62, .057, .092);
    add(brass, hangingX, y + 2.28, backdrop - zSide * .042, .44, .43, .042, 0, cutStone);
    add(iron, xSide * 2.31, y + 2.42, zSide * 7.40, .23, .15, .22);
    add(light, xSide * 2.31, y + 2.61, zSide * 7.34, .16, .24, .16, 0, cutStone);
  }
}

function innerSpire(add, world) {
  const { edgeX, edgeZ } = upperPlan;
  for (let floor = 3; floor < 6; floor++) {
    const y = floor * keepLevel;
    floorSections(add, world, y + keepLevel, upperPlan);
    for (const side of [-1, 1]) stairs(add, world, floor, side, upperPlan);
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const end = Math.abs(Math.cos(yaw)) > .5;
      const depth = end ? edgeZ : edgeX;
      const across = end ? edgeX : edgeZ;
      const dx = Math.sin(yaw), dz = Math.cos(yaw);
      const opening = floor === 3 && end ? 1.56 : 0;
      for (const side of [-1, 1]) {
        const midpoint = side * (across + opening) / 2;
        masonry(add, world, dx * depth + dz * midpoint, y + keepLevel / 2, dz * depth - dx * midpoint,
          across - opening, keepLevel, .42, yaw, floor % 2 ? sandstone : pale);
        const window = side * (across - 1.5);
        panel(add, yaw, window, y + 2.57, depth + .22, iron, .78, 1.86, .065);
        panel(add, yaw, window, y + 2.54, depth + .263, midnight, .59, 1.64, .04);
        panel(add, yaw, window, y + 2.57, depth + .295, brass, .064, 1.58, .05);
        panel(add, yaw, window, y + 1.67, depth + .26, pale, 1.04, .17, .41);
      }
      if (opening) {
        masonry(add, world, dx * depth, y + 3.84, dz * depth, opening * 2, 1.22, .46, yaw, pale);
        for (let i = -6; i <= 6; i++) {
          const x = i * .225;
          panel(add, yaw, x, y + 2.82 + Math.sqrt(opening ** 2 - x ** 2) * .31, depth + .10, pale, .24, .18, .71);
        }
      }
      panel(add, yaw, 0, y + .21, depth + .08, inset, across * 2, .19, .53);
      panel(add, yaw, 0, y + keepLevel - .14, depth + .09, pale, across * 2, .27, .66);
      if (floor === 5) {
        panel(add, yaw, 0, observatory + .84, depth, timber, across * 2, .16, .22);
        panel(add, yaw, 0, observatory + .18, depth, pale, across * 2, .36, .40);
        for (let x = -across + .14; x <= across; x += .98) {
          panel(add, yaw, x, observatory + .47, depth, iron, .088, .83, .14);
        }
        keepCollision(world, dx * depth, observatory + .45, dz * depth, across * 2, .91, .16, yaw);
      }
    }
    for (const z of [-4.13, 4.13]) {
      add(terracotta, 0, y + .038, z, 1.92, .049, 2.06);
      for (const side of [-1, 1]) {
        add(brass, side * 1.98, y + 2.50, z, .19, .31, .19, 0, cutStone);
      }
    }
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 5.46, z = sz * 6.87;
    masonry(add, world, x, observatory + 1.98, z, .52, 3.96, .52, 0, pale);
    add(brass, x, observatory + 3.75, z, .73, .13, .73);
    const base = roofY + 3.15, turretTop = observatory + (sx === sz ? 2.63 : .65);
    const tx = sx * 7.79, tz = sz * 4.69;
    add(inset, tx, (base + turretTop) / 2, tz, 2.96, turretTop - base, 2.96);
    add(pale, tx - sx * .24, base - .46, tz, 2.62, .94, 2.63);
    for (let band = base + .18; band < turretTop; band += keepLevel) {
      add(pale, tx, band, tz, 3.13, .23, 3.13);
      add(midnight, tx + sx * 1.49, band + .71, tz, .042, .83, .23);
      add(midnight, tx, band + .71, tz + sz * 1.49, .23, .83, .042);
    }
    add(pale, tx, turretTop - .08, tz, 3.28, .32, 3.28);
    finial(add, tx, tz, turretTop + .05, 3.65, sx === sz ? 5.27 : 4.09, sx === sz ? iron : opal);
  }
  for (const side of [-1, 1]) {
    add(opal, side * 8.06, roofY + 5.50, 0, 3.67, 3.31, 7.47, 0, gable);
    add(pale, side * 8.06, roofY + 4.31, 0, 3.17, .25, 7.51);
    add(brass, side * 8.06, roofY + 7.15, 0, .11, .14, 7.32);
  }
  add(pale, 0, observatory + 3.98, 0, 15.49, .54, 16.08);
  add(inset, 0, observatory + 4.23, 0, 16.20, .17, 16.20);
  finial(add, 0, 0, observatory + 4.27, 16.52, 7.52);
}

export function buildCastleKeep(parent, world, add) {
  keepWalls(add, world);
  for (let n = 1; n <= 3; n++) floorSections(add, world, n * keepLevel);
  for (let level = 0; level < 3; level++) {
    for (const side of [-1, 1]) stairs(add, world, level, side);
    roomPartitions(add, world, level);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) tower(add, world, sx, sz);
  hall(parent, add, world);
  innerSpire(add, world);
}
