import * as THREE from 'three';
import { batchVehicleParts } from './drive-vehicle-art.js';
import { rallyBridges, rallyJumps, rallyStops, waterline } from './drive-rally-terrain.js';

const finish = (color, roughness = .78) => new THREE.MeshStandardMaterial({ color, roughness });
const pine = finish(0xa77546);
const dark = finish(0x573f2e);
const amber = finish(0xde9752);
const coral = finish(0xc25041);
const ivory = finish(0xf0e0bd);
const turquoise = finish(0x2d7b79, .45);
const navy = finish(0x25495b, .46);
const steel = finish(0x677778, .35);
const tar = finish(0x344449);
const glass = finish(0x79a9af, .22);
const canvas = finish(0xc6b482);
const lime = finish(0x9d9838);
const box = new THREE.BoxGeometry();
const drum = new THREE.CylinderGeometry(.5, .49, 1, 18);
const discus = new THREE.CylinderGeometry(.5, .5, 1, 14);
const buoy = new THREE.SphereGeometry(.5, 12, 9);
const pennant = new THREE.ConeGeometry(.5, 1, 9);
const rope = new THREE.TorusGeometry(.4, .11, 8, 16).rotateX(Math.PI / 2);
const fruit = new THREE.IcosahedronGeometry(.5, 1);
const sail = new THREE.BufferGeometry();
sail.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, 0,.99,.11, .13,.15,.51, 0,0,1], 3));
sail.setIndex([0,1,2,0,2,3,1,3,2]);
sail.computeVertexNormals();
const sailCloth = finish(0xe8dcaf, .97);
sailCloth.side = THREE.DoubleSide;

function hullGeometry() {
  const length = 24;
  const position = [];
  const indices = [];
  for (let i = 0; i <= length; i++) {
    const t = i / length;
    const w = .49 * (Math.sin(Math.PI * (t * .86 + .08)) ** .62) *
      THREE.MathUtils.smoothstep(t, 0, .33);
    const tip = .19 * (1 - THREE.MathUtils.smoothstep(t, 0, .36));
    position.push(-w, .32 + tip, t - .5, -w * .81, -.06 + tip, t - .5, -w * .32, -.42 + tip, t - .5,
       w * .32, -.42 + tip, t - .5, w * .81, -.06 + tip, t - .5, w, .32 + tip, t - .5);
    if (!i) continue;
    for (let row = 0; row < 5; row++) {
      const offset = (i - 1) * 6 + row;
      indices.push(offset, offset + 1, offset + 6, offset + 1, offset + 7, offset + 6);
    }
  }
  for (let row = 1; row < 5; row++) indices.push(144, 144 + row + 1, 144 + row);
  const surface = new THREE.BufferGeometry();
  surface.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  surface.setIndex(indices);
  surface.computeVertexNormals();
  return surface;
}
const hull = hullGeometry();
const hullPaints = [turquoise, coral, navy, ivory].map(material => {
  const paint = material.clone();
  paint.side = THREE.DoubleSide;
  return paint;
});

function coords(p, lateral, along) {
  return [p.x + p.nx * lateral + p.tx * along, p.z + p.nz * lateral + p.tz * along];
}

function shack(add, x, y, z, yaw, accent) {
  const q = (dx, dy, dz, material, w, h, d, geo) => {
    add(material, x + Math.cos(yaw) * dx + Math.sin(yaw) * dz, y + dy, z - Math.sin(yaw) * dx + Math.cos(yaw) * dz, w, h, d, yaw, geo);
  };
  q(0, .12, 0, dark, 4.4, .23, 3.16);
  for (const x of [-1.97, 1.97]) for (const z of [-1.34, 1.34]) q(x, 1.2, z, dark, .19, 2.44, .21);
  for (let i = 0; i < 7; i++) q((i - 3) * .64, 2.45, 0, i % 2 ? accent : ivory, .67, .14, 3.4);
  for (let i = 0; i < 8; i++) q((i - 3.5) * .51, 2.27, 1.67, i % 2 ? accent : ivory, .51, .32, .07);
  q(0, .81, .97, pine, 4.05, .114, .96);
  q(0, .46, 1.25, accent, 4.05, .64, .12);
  for (const dx of [-1.25, -.49, .38]) {
    q(dx, .95, .92, dark, .61, .19, .43);
    for (let n = 0; n < 4; n++) q(dx + (n - 1.5) * .118, 1.075 + (n % 2) * .065, .90,
      n % 2 ? amber : lime, .17, .18, .17, fruit);
  }
}

function barrel(props, p, terrain, lateral, along, paint, effect) {
  const [x, z] = coords(p, lateral, along);
  const y = terrain.height(x, z);
  if (y < -.25) return;
  props.place({ x, y: y + .55, z, yaw: p.yaw, bounds: [.35, .54, .35], kind: 'barrel', mass: 24, effect, tip: 1.81 }, draw => {
    draw(paint, x, y + .54, z, .72, 1.08, .72, 0, drum);
    draw(paint, x, y + .55, z, .78, .49, .78, 0, drum);
    for (const h of [.17, .85]) draw(steel, x, y + h, z, .773, .088, .773, 0, discus);
    draw(dark, x, y + 1.084, z, .71, .042, .71, 0, discus);
    draw(steel, x + .14, y + 1.11, z, .12, .062, .12, 0, discus);
    for (let stave = 0; stave < 8; stave++) {
      const angle = stave * Math.PI / 4;
      draw(pine, x + .377 * Math.sin(angle), y + .544, z + .377 * Math.cos(angle), .034, .52, .03, angle);
    }
  });
}

function beachFurniture(props, p, terrain, lateral, along, type) {
  const [x, z] = coords(p, lateral, along);
  const ground = terrain.height(x, z);
  if (ground < -.18) return;
  const yaw = p.yaw + (type % 2 ? .46 : -.31);
  if (type === 0 || type === 1) {
    props.place({ x, y: ground + .95, z, yaw, bounds: [.58, .93, .61], mass: 15, effect: 'timber' }, draw => {
      draw(pine, x, ground + .88, z, .14, 1.76, .14, yaw);
      draw(type === 0 ? coral : turquoise, x, ground + 1.83, z, 2.86, .51, 2.86, yaw, pennant);
      draw(ivory, x, ground + 1.61, z, 2.76, .055, 2.76, yaw, discus);
      draw(pine, x, ground + .19, z, 1.24, .31, 1.04, yaw);
      draw(canvas, x, ground + .37, z, .98, .13, .76, yaw);
    });
  } else if (type === 2) {
    props.place({ x, y: ground + 1.18, z, yaw, bounds: [.54,1.18,.34], mass: 12, effect: 'timber', tip: 1.45 }, draw => {
      draw(dark, x, ground + .39, z, 1.53, .68, .78, yaw);
      for (const side of [-1, 1]) {
        const [px, pz] = coords({ ...p, x, z }, side * .34, 0);
        draw(side > 0 ? coral : turquoise, px, ground + 1.14, pz, .48, 2.31, .09, yaw, buoy);
        draw(ivory, px, ground + 1.28, pz, .35, .46, .102, yaw, buoy);
      }
    });
  } else {
    props.place({ x, y: ground + .38, z, yaw, bounds: [1.09,.35,.41], mass: 27, effect: 'timber' }, draw => {
      draw(dark, x, ground + .21, z, 2.13, .42, .66, yaw);
      draw(pine, x, ground + .47, z, 2.25, .167, .86, yaw);
      draw(tar, x, ground + .58, z, .72, .16, .70, yaw, rope);
      draw(ivory, x + .72, ground + .61, z, .54, .19, .45, yaw, buoy);
    });
  }
}

function skiff(props, p, terrain, index) {
  let location;
  for (let lateral = 16; lateral < 46; lateral += .62) {
    const [x, z] = coords(p, lateral, 0);
    const depth = waterline - terrain.height(x, z);
    if (depth > .25 && depth < .70) {
      location = { x, z };
      break;
    }
  }
  if (!location) return;
  const { x, z } = location;
  const y = waterline + .24;
  const yaw = p.yaw + (index % 2 ? .57 : -.28);
  const [w, length] = index % 2 ? [2.15, 5.65] : [1.79, 4.48];
  const offset = (dx, h, dz, material, a, b, c, geo) => [
    material, x + Math.cos(yaw) * dx + Math.sin(yaw) * dz, y + h, z - Math.sin(yaw) * dx + Math.cos(yaw) * dz, a, b, c, yaw, geo];
  props.place({ x, y, z, yaw, bounds: [w * .45, .34, length * .40], mass: 68, effect: 'foam', tip: .31,
    floats: true, drift: [p.nx, p.nz] }, draw => {
    draw(...offset(0, 0, 0, hullPaints[index % hullPaints.length], w, .79, length, hull));
    draw(...offset(0, -.06, .45, pine, w * .62, .15, length * .59));
    for (const seat of [-.33, .79, 1.50]) draw(...offset(0, .25, seat, dark, w * .71, .11, .21));
    for (const side of [-1, 1]) draw(...offset(side * w * .405, .27, .45, ivory, .095, .062, length * .65));
    draw(...offset(w * .24, .36, .51, ivory, .63, .17, .58, rope));
    draw(...offset(0, .40, length / 2 + .13, tar, .46, .54, .37));
  });
  if (index % 2 === 0) {
    const pierX = x - p.nx * 2.2 + p.tx * 4.7;
    const pierZ = z - p.nz * 2.2 + p.tz * 4.7;
    const pierY = Math.max(waterline + .30, terrain.height(pierX, pierZ) + .12);
    props.place({ x: pierX, y: pierY, z: pierZ, yaw: p.yaw, bounds: [1.81,.17,.77], mass: 38,
      effect: 'timber', floats: pierY < .05 }, draw => {
      for (let i = 0; i < 9; i++) {
        const across = (i - 4) * .401;
        draw(i % 3 ? pine : dark, pierX + p.nx * across, pierY + .08, pierZ + p.nz * across,
          .386, .13, 1.49, p.yaw);
      }
      for (const side of [-1, 1]) {
        draw(dark, pierX + p.tx * side * .58, pierY - .11, pierZ + p.tz * side * .58, 3.62, .22, .15, p.yaw);
        draw(dark, pierX + p.nx * 1.40 + p.tx * side * .67, pierY + .22, pierZ + p.nz * 1.40 + p.tz * side * .67,
          .16,.53,.18,p.yaw);
      }
      draw(tar, pierX - p.nx * .91, pierY + .18, pierZ - p.nz * .91, .88,.17,.74,p.yaw,rope);
    });
  }
}

function ship(parent, model) {
  const vessel = new THREE.Group();
  parent.add(vessel);
  function piece(material, x, y, z, w, h, d, geo = box) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(w, h, d);
    vessel.add(mesh);
    return mesh;
  }
  const length = model === 0 ? 16.8 : model === 1 ? 13.5 : 10.8;
  const width = model === 0 ? 4.3 : model === 1 ? 3.3 : 2.65;
  piece(hullPaints[model], 0, 0, 0, width, 1.46, length, hull);
  piece(ivory, 0, .25, .15, width * .96, .29, length * .986, hull);
  piece(pine, 0, .42, .44, width * .70, .18, length * .74);
  for (let i = 0; i < 6; i++) {
    for (const s of [-1, 1]) {
      piece(steel, s * width * .42, .84, (i - 2) * length * .118, .07, .62, .072);
    }
  }
  for (const s of [-1, 1]) piece(ivory, s * width * .42, 1.14, .85, .075, .073, length * .68);
  if (model === 1) {
    piece(dark, 0, 3.93, -.16, .13, 7.2, .13, discus);
    piece(sailCloth, .01, .81, -.08, 2.8, 6.94, 4.53, sail);
    piece(sailCloth, -.01, .67, -5.15, -2.0, 5.72, 5, sail);
    piece(amber, 0, 7.51, .20, .12, .39, 1.01, sail);
  } else {
    const taller = model === 0 ? 1 : .81;
    piece(ivory, 0, .71, -.54, width * .75, .76, length * .31);
    piece(ivory, 0, 1.38 * taller, -1.13, width * .70, 1.30 * taller, length * .19);
    piece(turquoise, 0, 2.05 * taller, -1.09, width * .82, .23, length * .25);
    piece(glass, 0, 1.62 * taller, -1.16 - length * .093, width * .62, .52, .077);
    for (const s of [-1, 1]) {
      piece(glass, s * width * .352, 1.62 * taller, -1.18, .077, .53, length * .154);
      piece(coral, s * width * .304, .87, 2.28, .44, .28, .63, rope);
      piece(pine, s * width * .148, .77, 4.19, .96, .61, 1.27);
    }
    piece(steel, 0, 3.15, -.77, .07, 2.37, .07, discus);
    piece(ivory, 0, 3.56, -.76, 1.38, .12, .135);
    piece(tar, -.86, 2.28 * taller, .02, .41, .58, .40, discus);
  }
  batchVehicleParts(vessel, false);
  return { vessel, length, width };
}

export function buildRallyMarina(parent, props, route, terrain, random, keepClear) {
  const crossings = [...rallyJumps.map(jump => jump.meters), ...rallyBridges];
  for (const [index, station] of [20, 61, 158, 227, 316, 443, 491, 573, 674, 774, 847].entries()) {
    if (crossings.some(cut => route.separation(cut, station) <= 25) ||
        rallyStops.some(stop => route.separation(stop.meters, station) <= 20)) continue;
    const p = route.sample(station);
    const tone = [turquoise, coral, amber][index % 3];
    const lateral = -10.6 - (index % 3) * 1.18;
    const [x, z] = coords(p, lateral - 5.1, 1.1);
    const ground = terrain.height(x, z);
    if (ground < -.19 || keepClear(x, z)) continue;
    props.place({ x, y: ground + 1.26, z, yaw: p.yaw, bounds: [2.04,1.24,1.48], mass: 77, effect: 'fruit', tip: 1.42 },
      draw => shack(draw, x, ground, z, p.yaw, tone));
    for (const [n, [row, offset]] of [[-1.1, -.6], [.02, -.66], [1.18, .23], [2.3, .83]].entries()) {
      barrel(props, p, terrain, lateral + 2.15 + offset, row, n % 2 ? amber : turquoise, n % 2 ? 'juice' : 'water');
    }
    for (let i = 0; i < 4; i++) beachFurniture(props, p, terrain, lateral - 1.0 - i * .64, 5.45 + i * 2.7, i);
  }

  for (const [index, station] of [41, 156, 230, 354, 473, 580, 673, 805, 851].entries()) skiff(props, route.sample(station), terrain, index);
  for (const [index, station] of [54, 193, 298, 449, 555, 692, 797].entries()) {
    const p = route.sample(station);
    for (let i = 0; i < 5; i++) {
      const lateral = 18 + i * 4.1, along = (random() - .5) * 10;
      const [x, z] = coords(p, lateral, along);
      const ground = terrain.height(x, z);
      if (ground > waterline - .075) continue;
      const y = waterline + .10;
      props.place({ x, y, z, yaw: p.yaw, bounds: [.25,.26,.25], mass: 9, floats: true, effect: 'foam' }, draw => {
        draw(index % 2 ? coral : amber, x, y, z, .52, .45, .52, 0, buoy);
        draw(tar, x, y + .22, z, .12, .16, .12, 0, discus);
      });
    }
  }

  const wakeShape = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  const ships = [91, 207, 365, 556, 738].map((station, index) => {
    const model = index % 3;
    const { vessel, length, width } = ship(parent, model);
    const wake = new THREE.Mesh(wakeShape, new THREE.MeshBasicMaterial({
      color: 0xcfebda, opacity: .17, transparent: true, depthWrite: false,
    }));
    wake.position.y = waterline + .016;
    wake.scale.set(width * .48, 1, length * .97);
    parent.add(wake);
    return { vessel, length, wake, station, speed: 1.75 + model * .27, outer: 48 + (index % 3) * 8, phase: index * 1.66 };
  });
  return {
    update(time) {
      for (const { vessel, length, wake, station, speed, outer, phase } of ships) {
        const p = route.sample(station + time * speed);
        const [x, z] = coords(p, outer + Math.sin(time * .09 + phase) * 3.15, 0);
        vessel.position.set(x, waterline + .35 + Math.sin(time * 1.32 + phase) * .085, z);
        vessel.rotation.set(Math.sin(time * .83 + phase) * .028, p.yaw, Math.sin(time * .71 + phase) * .055, 'YXZ');
        wake.position.x = x - p.tx * length * .94;
        wake.position.z = z - p.tz * length * .94;
        wake.rotation.y = p.yaw;
        wake.material.opacity = .15 + .038 * Math.sin(time * 2 + phase);
      }
    },
  };
}
