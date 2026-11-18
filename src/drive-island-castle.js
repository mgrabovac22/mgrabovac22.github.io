import * as THREE from 'three';
import { Body, Box, Quaternion, Vec3 } from 'cannon-es';
import { castleBridges, castleIslandDistance } from './drive-rally-terrain.js';
import { timberDeck } from './drive-rally-obstacles.js';
import { squareRoof } from './drive-castle-keep.js';

const stone = color => new THREE.MeshStandardMaterial({ color, roughness: .92 });
const limestone = stone(0xa5a995);
const light = stone(0xc5c5a9);
const shaded = stone(0x848e7e);
const dark = stone(0x525f55);
const wood = stone(0x73513c);
const cap = stone(0x355b56);
const gold = stone(0xc8a46c);
const leaf = stone(0x476347);
const leafLight = stone(0x6b8552);
const terracotta = stone(0x9b5941);
const blue = stone(0x3c6975);
const rug = stone(0xb07251);
const sea = new THREE.MeshPhysicalMaterial({ color: 0x53b7ab, roughness: .27, metalness: .16, clearcoat: .55 });
const gleam = new THREE.MeshBasicMaterial({ color: 0xeaf4db, transparent: true, opacity: .64, depthWrite: false });
const window = new THREE.MeshBasicMaterial({ color: 0x223e3b });
const box = new THREE.BoxGeometry();
const cylinder = new THREE.CylinderGeometry(.5, .5, 1, 14);
const rock = new THREE.IcosahedronGeometry(.5, 1);
const sphere = new THREE.SphereGeometry(.5, 12, 8);
const matCloth = new THREE.MeshStandardMaterial({ color: 0xd28c58, side: THREE.DoubleSide, roughness: .94 });
const matBlue = new THREE.MeshStandardMaterial({ color: 0x367d79, side: THREE.DoubleSide, roughness: .91 });
const yAxis = new Vec3(0, 1, 0);
const bridgeWidth = 2.55;
const edge = 23.5;

function collision(world, x, y, z, w, h, d, yaw = 0, vehiclesOnly = false) {
  world.addBody(new Body({
    mass: 0, material: world.defaultMaterial,
    collisionFilterGroup: vehiclesOnly ? 128 : 1, collisionFilterMask: vehiclesOnly ? 4 : -1,
    shape: new Box(new Vec3(w / 2, h / 2, d / 2)),
    position: new Vec3(x, y, z), quaternion: new Quaternion().setFromAxisAngle(yAxis, yaw),
  }));
}

function directional(x, z, yaw) {
  return {
    x, z, yaw, nx: Math.cos(yaw), nz: -Math.sin(yaw),
    tx: -Math.sin(yaw), tz: -Math.cos(yaw),
  };
}

function at(p, across, y, forward) {
  return [p.x + p.nx * across + p.tx * forward, y, p.z + p.nz * across + p.tz * forward];
}

function place(add, p, material, across, y, forward, w, h, d, offset = 0, geometry = box) {
  add(material, ...at(p, across, y, forward), w, h, d, p.yaw + offset, geometry);
}

function footbridges(parent, world, add, terrain) {
  for (const { outer, inner } of castleBridges) {
    const yaw = Math.atan2(outer.x - inner.x, outer.z - inner.z);
    const p = directional(outer.x, outer.z, yaw);
    const length = Math.hypot(inner.x - outer.x, inner.z - outer.z);
    const entryY = Math.max(terrain.height(outer.x, outer.z), -.24);
    const exitY = Math.max(terrain.height(inner.x, inner.z), -.12);
    const height = .74;
    timberDeck(parent, world, p, 0, bridgeWidth, [
      [-1.0, entryY - .03], [2.5, height], [length - 2.8, height], [length + .75, exitY - .034],
    ]);
    collision(world, ...at(p, 0, entryY + .73, .05), bridgeWidth, 2.68, .31, yaw, true);
    for (const s of [-1, 1]) {
      const across = s * (bridgeWidth / 2 + .03);
      const full = length - 4.6;
      const middle = length * .5;
      collision(world, ...at(p, across, height + .33, middle), .12, .68, full, yaw);
      for (const rail of [.40, .68]) place(add, p, wood, across, height + rail, middle, .089, .08, full);
      for (let step = 2.6; step <= length - 2.2; step += 3.4) {
        place(add, p, wood, across, -.53, step, .24, 3.86, .24);
        place(add, p, gold, across, 1.45, step, .28, .11, .28);
        if (Math.round(step) % 3 === 0) place(add, p, terracotta, across, -.34, step, .34,.23,.34,0,cylinder);
      }
      for (let n = 0; n < 4; n++) {
        const q = at(p, s * (1.86 + (n % 2) * .45), .35, -n * 1.53 - 1.10);
        const y = terrain.height(q[0], q[2]);
        add(n % 3 ? shaded : leafLight, q[0], y + .24, q[2], .75, .64, .78, n * 1.3, rock);
      }
      place(add, p, limestone, s * 1.05, entryY + .43, .02, .28, .78, .30);
      place(add, p, gold, s * 1.05, entryY + .865, .02, .33, .10, .31);
    }
    for (let i = 0; i < 6; i++) {
      const [x, , z] = at(p, 0, 0, -2.1 - i * 1.68);
      const y = terrain.height(x,z);
      if (y < -.27) break;
      add(i % 2 ? limestone : shaded,x,y+.017,z,1.25,.11,.71,yaw+i*.17,rock);
    }
  }
}

function arch(add, world, p) {
  const gate = 6.2;
  const crownY = 4.05;
  const radius = gate / 2;
  const stretch = (edge * 2 - gate) / 2;
  for (const s of [-1, 1]) {
    const wing = s * (radius + stretch / 2);
    collision(world, ...at(p, wing, 3.38, 0), stretch, 6.76, 2.65, p.yaw);
    for (let level = 0; level < 9; level++) {
      const offset = level % 2 ? .52 : 0;
      const columns = 10;
      let left = radius;
      for (let i = 0; i < columns; i++) {
        const end = i === columns - 1 ? edge : Math.min(edge, radius + (i + 1) * 2.04 + offset);
        const width = end - left;
        place(add, p, (i + 3 * level) % 6 === 0 ? shaded : limestone, s * (left + end) / 2,
          .39 + level * .74, 0, width - .026, .715, level === 0 ? 2.73 : 2.52);
        left = end;
      }
    }
    place(add, p, light, wing, .25, 0, stretch, .45, 2.88);
    place(add, p, light, wing, 6.64, 0, stretch + .04, .33, 2.83);
    for (let i = 0; i < 8; i++) {
      const lane = s * (4.33 + i * 2.40);
      place(add, p, light, lane, 7.08, -1.02, 1.36, .71, .62);
      place(add, p, light, lane, 7.08, 1.02, 1.36, .71, .62);
    }
    for (const u of [7.7, 13.9, 18.3]) {
      place(add, p, dark, s * u, 4.67, -1.278, .56, 1.31, .055);
      place(add, p, window, s * u, 4.67, -1.315, .22, 1.06, .061);
      place(add, p, light, s * u, 3.98, -1.33, .78, .14, .21);
    }
  }
  collision(world, ...at(p, 0, 7.27, 0), gate, 2.85, 3.05, p.yaw);
  for (let i = 0; i < 17; i++) {
    const across = (i - 8) * .37;
    const archY = crownY + Math.sqrt(radius ** 2 - across ** 2) * .71;
    place(add, p, i === 8 ? gold : light, across, (archY + 8.64) / 2, 0, .366, 8.64 - archY, 3.08);
    place(add, p, i % 2 ? limestone : light, across, archY, -.11, .367, .235, 3.28);
  }
  place(add, p, cap, 0, 8.73, 0, 6.88, .27, 3.34);
  for (const side of [-1, 1]) {
    place(add, p, dark, side * 3.38, 2.39, -.76, .28, 4.77, .34);
    place(add, p, gold, side * 3.53, 2.55, -1.56, .35, .42, .41);
    place(add, p, terracotta, side * 4.1, .41, 2.9, .77,.78,.76,0,cylinder);
    place(add, p, leaf, side * 4.1, .82, 2.9, 1.11,.8,.95,0,rock);
  }
}

function towers(add, world) {
  for (const x of [-edge, edge]) for (const z of [-edge, edge]) {
    collision(world, x, 4.62, z, 7.16, 9.24, 7.16);
    for (const [y, size, h, material] of [[.39,7.56,.78,light],[4.45,7.16,8.42,limestone],[3.01,7.27,.24,shaded],
      [7.54,7.36,.25,light],[8.71,7.59,.56,light],[9.21,7.70,.55,shaded]]) {
      add(material, x, y, z, size, h, size);
    }
    add(cap, x, 11.72, z, 7.72, 4.23, 7.72, 0, squareRoof);
    add(wood, x, 13.96, z, .16, .57, .16, 0, cylinder);
    add(gold, x, 14.27, z, .31, .31, .31, 0, sphere);
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const face = directional(x, z, a);
      for (const across of [-2.48, -.83, .83, 2.48]) place(add, face, light, across, 9.77, -3.48, .81, .72, .64);
      for (const across of [-1.21, 1.21]) {
        place(add, face, window, across, 6.26, -3.59, .32, 1.20, .048);
        place(add, face, light, across, 5.62, -3.62, .68, .15, .23);
      }
    }
    for (const dx of [-3.48, 3.48]) for (const dz of [-3.48, 3.48]) {
      add(light, x + dx, 9.77, z + dz, .67, .72, .67);
    }
  }
}

function rooms(add, world) {
  for (const x of [-13, 13]) for (const z of [-13, 13]) {
    add(shaded, x, .035, z, 14, .10, 13.4, 0);
    for (let ix = -3; ix <= 3; ix++) for (let iz = -3; iz <= 3; iz++) {
      add((ix + iz) % 2 ? light : limestone, x + ix * 1.91, .091, z + iz * 1.76, 1.865, .036, 1.716, 0);
    }
    for (const wall of [
      { x: x + Math.sign(x) * 6.55, z, w: .5, d: 13.22 },
      { x, z: z + Math.sign(z) * 6.32, w: 13.10, d: .5 },
    ]) {
      add(limestone, wall.x, 1.48, wall.z, wall.w, 2.9, wall.d);
      add(light, wall.x, 3.02, wall.z, wall.w + .18, .31, wall.d + .08);
      collision(world, wall.x, 1.48, wall.z, wall.w, 2.95, wall.d);
    }
    for (const s of [-1, 1]) {
      add(terracotta, x + s * 5.76, .40, z - Math.sign(z) * 1.1, .79,.79,.79,0,cylinder);
      add(s > 0 ? leaf : leafLight, x + s * 5.76, .95, z - Math.sign(z) * 1.1, 1.45,1.16,1.12,.8,rock);
      add(wood, x + s * 5.17, .51, z + Math.sign(z) * 5.16, 2.65,.24,1.02);
      for (let n = 0; n < 3; n++) add(n % 2 ? terracotta : dark, x + s * 5.17 + (n - 1) * .68,
        .86, z + Math.sign(z) * 5.16, .53,.52,.50,0,cylinder);
    }
  }
  for (const axis of [0, 1]) for (let i = -17; i <= 17; i++) {
    if (Math.abs(i) < 2) continue;
    const along = i * 2.15;
    const y = .012;
    add(i % 3 ? shaded : light, axis ? along : 0, y, axis ? 0 : along, axis ? 2.12 : 4.93, .056,
      axis ? 4.93 : 2.12);
  }
}

function furniture(add, world) {
  const volumes = [blue, terracotta, gold, cap, rug];
  for (const x of [-15.6,-11.1]) {
    add(wood, x,1.29,-18.2,3.91,2.47,.65);
    collision(world,x,1.29,-18.2,3.90,2.56,.68);
    for (let row=0;row<3;row++) {
      const y=.49+row*.70;
      add(dark,x,y,-17.83,3.73,.47,.08);
      add(wood,x,y-.24,-17.51,3.94,.08,.67);
      for (let i=0;i<13;i++) {
        const width=.153+i%3*.037;
        add(volumes[(i+row)%volumes.length],x-1.66+i*.27,y,-17.63,width,.36+i%4*.048,.26);
        add(gold,x-1.66+i*.27,y+.04,-17.49,width*.89,.021,.021);
      }
    }
  }
  for (const x of [-3.34,3.34]) for (const z of [-16.82,-11.1]) {
    add(dark,x,1.51,z,.22,3.02,.22);
    add(gold,x,2.97,z,.31,.24,.30);
  }
  for (let i=-4;i<=4;i++) add(wood,i*.91,3.15,-13.95,.19,.18,6.14);
  add(rug,0,.033,-13.07,7.65,.035,5.9);
  for (let i=0;i<12;i++) {
    const a=i*Math.PI/6;
    add(gold,Math.sin(a)*2.62,.058,-13.07+Math.cos(a)*2.62,.26,.025,.26,-a);
  }
  for (const [x,z] of [[10.1,12.9],[18.3,13.0],[13.9,18.1]]) {
    add(shaded,x,.16,z,2.68,.32,1.67);
    for (let i=0;i<6;i++) {
      const lean=i*.78;
      add(i%2?leafLight:leaf,x+Math.sin(lean)*.80,.46,z+Math.cos(lean)*.44,.69,.67,.62,lean,rock);
      add(volumes[(i+2)%volumes.length],x+Math.sin(lean)*.83,.72,z+Math.cos(lean)*.46,.269,.255,.28,lean,rock);
    }
  }
  for (const x of [-18.35,-13.7,-9.3]) {
    add(rug,x,.029,13.8,4.20,.032,4.9);
    add(gold,x,.043,11.55,4.02,.024,.072);
    add(gold,x,.043,16.01,4.02,.024,.072);
  }
  add(dark,0,.021,0,5.45,.061,5.45,0,cylinder);
  add(light,0,.056,0,4.69,.023,4.69,0,cylinder);
  for (let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    add(i%2?gold:cap,Math.sin(a)*.77,.077,Math.cos(a)*.77,.21,.030,1.55,a);
  }
}

export function buildIslandCastle(parent, world, add, terrain) {
  const seaGroup = new THREE.Group();
  parent.add(seaGroup);
  footbridges(seaGroup, world, add, terrain);
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const p = directional(Math.sin(yaw) * edge, Math.cos(yaw) * edge, yaw);
    arch(add, world, p);
  }
  towers(add, world);
  rooms(add, world);
  furniture(add, world);
  add(limestone, -7.5, .26, -3.83, 2.49,.51,2.49,0,cylinder);
  add(sea, -7.5, .53, -3.83, 2.12,.060,2.12,0,cylinder);
  add(limestone, -7.5, .79, -3.83, .31,1.60,.32,0,cylinder);
  const fountain = new THREE.Group();
  fountain.position.set(-7.5, 1.53, -3.83);
  seaGroup.add(fountain);
  const drop = new THREE.SphereGeometry(.052, 7, 5);
  const streams = Array.from({ length: 27 }, () => {
    const mesh = new THREE.Mesh(drop, gleam);
    fountain.add(mesh);
    return mesh;
  });
  const banners = [];
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const p = directional(Math.sin(yaw) * 25.08, Math.cos(yaw) * 25.08, yaw);
    for (const side of [-1, 1]) {
      const [x, y, z] = at(p, side * 5.2, 4.66, 0);
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 2.75, 7, 10), side < 0 ? matCloth : matBlue);
      banner.position.set(x,y,z);
      banner.rotation.y = yaw;
      seaGroup.add(banner);
      const position = banner.geometry.attributes.position;
      banners.push({ position, side });
      place(add, p, wood, side * 5.2, 6.08, -.07, 1.63,.08,.12);
      place(add, p, gold, side * 5.2, 4.77, -.14, .54,.62,.12,0,rock);
    }
  }
  for (let i = 0; i < 118; i++) {
    const angle = i * 2.39996;
    const fraction = .68 + (i % 13) * .024;
    const x = Math.cos(angle) * 48 * fraction, z = Math.sin(angle) * 42 * fraction;
    if (Math.min(Math.abs(x), Math.abs(z), Math.abs(z-6), Math.abs(x-8)) < 2.85) continue;
    if (Math.abs(x) < 27.7 && Math.abs(z) < 27.7) continue;
    const y = terrain.height(x,z);
    if (y < -.22) continue;
    if (i % 3) add(i % 2 ? leaf : leafLight,x,y+.3,z,1.25,.94,1.34,i,rock);
    else {
      const h = 4 + (i % 8) * .71;
      add(wood,x,y+h/2,z,.39,h,.43,i,cylinder);
      for (let n = 0; n < 7; n++) {
        const a = i + n * 2.39996;
        add(n % 2 ? leaf : leafLight,x+Math.cos(a)*1.03,y+h-(n%3)*.24,z+Math.sin(a)*1.10,
          2.31,1.23,2.6,a,rock);
      }
    }
  }
  return {
    contains(position) { return castleIslandDistance(position.x, position.z) < .97; },
    animate(time, flowing, motion) {
      fountain.visible = flowing;
      if (flowing) for (const [i, mesh] of streams.entries()) {
        const t = (i / streams.length + time * 1.48) % 1, a = i * 2.40;
        mesh.position.set(Math.cos(a) * t, t * (1.36 - 2.42 * t), Math.sin(a) * t);
      }
      if (!motion) return;
      for (const { position, side } of banners) {
        for (let i = 0; i < position.count; i++) {
          const weight = (.5 - position.getY(i) / 2.75);
          position.setZ(i, Math.sin(position.getX(i) * 4.1 + time * 2.5 + side) * weight * .24);
        }
        position.needsUpdate = true;
      }
    },
  };
}
