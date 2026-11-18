import * as THREE from 'three';
import { Body, Box, Vec3 } from 'cannon-es';
import { createRaceArtwork } from './drive-race-art.js';

const rough = (color, roughness = .83) => new THREE.MeshStandardMaterial({ color, roughness });
const silver = rough(0x8c9c9d);
const carbon = rough(0x28383c);
const concrete = rough(0xa5aaa4);
const rubber = rough(0x343b3d);
const red = rough(0xb53e43);
const white = rough(0xf1e9d5);
const sea = rough(0x3d7777);
const gold = rough(0xc89650);
const canopy = rough(0x4a5c60);
const live = new THREE.MeshBasicMaterial({ color: 0xc7edbc });
const typographic = new THREE.PlaneGeometry();
const tire = new THREE.TorusGeometry(.36, .14, 7, 15).rotateX(Math.PI / 2);
const person = new THREE.CapsuleGeometry(.20, .38, 2, 5);
const fenceWidth = 10.45;
const fenceHeight = 5.8;
const pixel = new Uint8Array(64 * 64 * 4);
for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
  const offset = (y * 64 + x) * 4;
  const link = ((x + y) % 32 < 2 || (x - y + 64) % 32 < 2);
  pixel.set([156, 169, 166, link ? 217 : 0], offset);
}
const wires = new THREE.DataTexture(pixel, 64, 64);
wires.wrapS = wires.wrapT = THREE.RepeatWrapping;
wires.magFilter = THREE.LinearFilter;
wires.minFilter = THREE.LinearMipmapLinearFilter;
wires.generateMipmaps = true;
wires.repeat.set(4, 3);
wires.needsUpdate = true;
const chainLink = new THREE.MeshStandardMaterial({
  color: 0x758481, map: wires, roughness: .73, metalness: .21, side: THREE.DoubleSide, alphaTest: .39,
});

function offset(p, lateral, along = 0) {
  return [p.x + p.nx * lateral + p.tx * along, p.z + p.nz * lateral + p.tz * along];
}

function part(add, p, surface, lateral, y, along, width, height, depth, turn = 0, shape) {
  const [x, z] = offset(p, lateral, along);
  add(surface, x, y, z, width, height, depth, p.yaw + turn, shape);
}

export function buildRaceFence(route, world, add) {
  const segmentCount = Math.ceil(route.length / 5.25);
  const step = route.length / segmentCount;
  for (let index = 0; index < segmentCount; index++) {
    const a = route.sample(index * step);
    const b = route.sample((index + 1) * step);
    for (const side of [-1, 1]) {
      const [ax, az] = offset(a, side * fenceWidth);
      const [bx, bz] = offset(b, side * fenceWidth);
      const x = (ax + bx) / 2, z = (az + bz) / 2;
      const span = Math.hypot(bx - ax, bz - az);
      const yaw = Math.atan2(ax - bx, az - bz);
      const postColor = index % 6 === 0 ? gold : silver;
      add(carbon, x, .38, z, .52, .76, span + .12, yaw);
      add(index % 8 < 2 ? red : concrete, x, .75, z, .59, .23, span + .10, yaw);
      add(chainLink, x, 3.31, z, span, 4.91, 1, yaw + Math.PI / 2, typographic);
      add(silver, x, 5.75, z, .08, .085, span + .14, yaw);
      add(postColor, ax, 2.93, az, .145, 5.84, .15, yaw);
      const wall = new Body({ mass: 0, shape: new Box(new Vec3(.24, fenceHeight / 2, span / 2 + .12)),
        position: new Vec3(x, fenceHeight / 2, z) });
      wall.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), yaw);
      wall.aabbNeedsUpdate = true;
      world.addBody(wall);
    }
  }
}

export function buildRaceDistrict(route, add, random, signMaterial) {
  const labels = ['APEX PADDOCK', 'TURN 04', 'HORIZON CLUB', 'WEST GRANDSTAND',
    'SECTOR 02', 'MEDIA CENTRE', 'APEX RACING', 'FINAL SECTOR'];
  for (let region = 0; region < labels.length; region++) {
    const station = (region * route.length / labels.length + 24) % route.length;
    const p = route.sample(station);
    const side = region % 3 ? -1 : 1;
    const civic = region === 0 || region === 2 || region === 5;
    const infield = 24 + (region % 2) * 2;
    const theme = [red, sea, gold, silver][region % 4];
    const sign = signMaterial(labels[region], '#26383d', '#f1e3b7');
    const fits = (lateral, along) => {
      const [x, z] = offset(p, side * lateral, along);
      return route.locate({ x, z }).offset > 14.5;
    };
    for (const along of [-32, -16, 0, 16, 32]) {
      if (!fits(infield, along)) continue;
      part(add, p, concrete, side * infield, -.006, along, 14.4, .11, 15.8);
      for (const approach of [-5.8, 5.8]) part(add, p, white, side * infield, .054, along + approach, 9, .013, .08);
      if (!civic) {
        if (Math.abs(along) > 20) continue;
        for (let row = 0; row < 6; row++) {
          const d = side * (infield - 3 + row * 1.18);
          part(add, p, carbon, d, .78 + row * .56, along, 1.25, .52, 15.65);
          part(add, p, row % 3 ? concrete : theme, d, .92 + row * .56, along, 1.17, .28, 15.43);
          for (let seat = 0; seat < 23; seat++) {
            const model = random();
            if (model > .17) part(add, p, model > .8 ? theme : model > .5 ? white : canopy, d + side * .23, 1.48 + row * .56,
              along - 7 + seat * .61, .38, .52, .37, 0, person);
          }
        }
        part(add, p, canopy, side * infield, 5.85, along, 12.46, .26, 15.94);
        part(add, p, theme, side * (infield - 6.1), 5.87, along, .36, .24, 15.94);
        for (const tower of [-7.6, 7.6]) part(add, p, silver, side * (infield + 4), 2.91, along + tower, .21, 5.86, .20);
      } else if (along % 32 === 0) {
        const height = 3.7 + .65 * (region % 3);
        part(add, p, carbon, side * (infield + 2.7), height / 2, along, 10.4, height, 13.15);
        part(add, p, silver, side * (infield + 2.7), height, along, 10.9, .24, 13.6);
        part(add, p, theme, side * (infield + 2.7), height + .32, along, 9.6, .49, 12.7);
        for (const bay of [-4.1, 0, 4.1]) {
          part(add, p, canopy, side * (infield - 2.59), height * .50, along + bay, .10, height * .69, 3.64);
          part(add, p, live, side * (infield - 2.68), height * .71, along + bay, .05, .093, 3.42);
        }
      } else {
        part(add, p, white, side * infield, .83, along, 2.4, 1.66, 5.25);
        part(add, p, theme, side * infield, 1.48, along - 1.7, 2.3, .72, 1.58);
        for (const x of [-1, 1]) for (const z of [-1, 1]) {
          part(add, p, rubber, side * infield + x * 1.09, .37, along + z * 1.53, .68, .24, .68, 0, tire);
        }
      }
    }
    if (fits(17, 0)) part(add, p, sign, side * 17, civic ? 4.27 : 4.62, -.10, 8.15, 1.0, 1,
      -side * Math.PI / 2, typographic);
    for (const pole of [-15, 13]) {
      if (!fits(16, pole)) continue;
      part(add, p, silver, side * 16, 3.25, pole, .12, 6.51, .12);
      part(add, p, theme, side * 16, 5.64, pole + .69, .07, 1.19, 1.46);
    }
  }
  const meterBoards = [150,100,50].map(value => signMaterial(value, '#e9e6d7', '#223334'));
  for (let index = 0; index < 26; index++) {
    const p = route.sample(index * route.length / 26 + 3.5);
    const side = index % 2 ? -1 : 1;
    for (let line = -2; line <= 2; line++) for (let stack = 0; stack < 3; stack++) {
      part(add, p, stack === 2 && index % 3 === 0 ? red : rubber, side * 11.52, .16 + stack * .33,
        line * .79, .86, .43, .86, 0, tire);
    }
    part(add, p, silver, -side * 9.19, .48, 0, .087, .96, .091);
    part(add, p, meterBoards[index % 3], -side * 9.19, .99, -.064, .65, .45, 1, 0, typographic);
    if (index % 3 !== 2) continue;
    part(add, p, silver, side * 13.35, 3.53, 0, .21, 7.16, .22);
    part(add, p, carbon, side * 13.35, 7.12, 0, 2.6, .31, .71);
    for (const x of [-1, 0, 1]) part(add, p, live, side * 13.37 + x * .72, 7.08, -.39, .45, .21, .10);
  }
}

const teams = [
  { color: 0x267a88, lane: -3.3, pace: 25.0, grid: 21, phase: .32 },
  { color: 0xdeb34c, lane: 3.1, pace: 24.3, grid: 16, phase: 1.43 },
  { color: 0x536bb1, lane: -2.3, pace: 23.6, grid: 10, phase: 2.74 },
  { color: 0xdde0cf, lane: 2.9, pace: 24.7, grid: 5.5, phase: 4.30 },
];
const up = new Vec3(0, 1, 0);

function makeRival(parent, world, team, artwork, color) {
  const { model } = artwork;
  const { view, wheels } = artwork.instantiate(color, false);
  view.add(...wheels);
  parent.add(view);
  const body = new Body({ type: Body.KINEMATIC, mass: 0, collisionFilterGroup: 64, collisionFilterMask: 4,
    shape: new Box(new Vec3(model.width * 1.08, Math.max(.275, model.roof * .41), model.depth * .90)),
    position: new Vec3(0, model.stance, 0) });
  world.addBody(body);
  return { ...team, pace: team.pace * model.max / 52, model, meter: team.grid, speed: 0, line: team.lane, body, view, wheels };
}

export function createRaceGrid(parent, world, route, initialArtwork) {
  let ownedArtwork = initialArtwork ? null : createRaceArtwork();
  let rivals = [];
  let progress = 0, previous = 0;
  let clock = 0, moving = false;
  function setArtwork(artwork) {
    for (const rival of rivals) {
      parent.remove(rival.view);
      world.removeBody(rival.body);
    }
    if (ownedArtwork && ownedArtwork !== artwork) {
      ownedArtwork.dispose();
      ownedArtwork = null;
    }
    const playerPaint = new THREE.Color(artwork.paint);
    const remaining = [...teams.map(team => team.color), 0xaf598c, 0x56815f, 0x923e3b];
    const candidate = new THREE.Color();
    const distinct = remaining.filter(color => {
      candidate.set(color);
      return Math.abs(playerPaint.r - candidate.r) + Math.abs(playerPaint.g - candidate.g) + Math.abs(playerPaint.b - candidate.b) > .23;
    });
    const palette = [...distinct, ...remaining.filter(color => !distinct.includes(color))];
    rivals = teams.map((team, index) => makeRival(parent, world, team, artwork, palette[index]));
    reset();
  }
  function target(rival, meter, line) {
    const p = route.sample(meter);
    return { x: p.x + p.nx * line, z: p.z + p.nz * line };
  }
  function reset() {
    progress = previous = clock = 0;
    moving = false;
    for (const rival of rivals) {
      rival.meter = rival.grid;
      rival.speed = 0;
      rival.line = rival.lane;
      const { x, z } = target(rival, rival.meter, rival.line);
      const { yaw } = route.sample(rival.meter);
      rival.view.position.set(x, rival.model.stance - .024, z);
      rival.view.rotation.y = yaw;
      rival.body.position.set(x, rival.model.stance - .02, z);
      rival.body.quaternion.setFromAxisAngle(up, yaw);
      rival.body.velocity.setZero();
      rival.body.aabbNeedsUpdate = true;
    }
  }
  setArtwork(initialArtwork ?? ownedArtwork);
  return {
    reset, setArtwork,
    rank(position) {
      const { meters } = route.locate(position);
      let travel = meters - previous;
      if (travel > route.length / 2) travel -= route.length;
      if (travel < -route.length / 2) travel += route.length;
      if (Math.abs(travel) < 42) progress += travel;
      previous = meters;
      return { place: rivals.filter(rival => rival.meter > progress + 1).length + 1, count: rivals.length + 1 };
    },
    advance(dt, driver, playerMeter, throttle) {
      if (!moving && !throttle) return;
      moving = true;
      clock += dt;
      for (const rival of rivals) {
        const ahead = route.sample(rival.meter + 13);
        const entry = route.sample(rival.meter + 1);
        const curvature = Math.atan2(ahead.tx * entry.tz - ahead.tz * entry.tx,
          ahead.tx * entry.tx + ahead.tz * entry.tz);
        const station = rival.meter / route.length * Math.PI * 2;
        const flow = Math.sin(station * 3 + rival.phase) * 1.45 + Math.sin(clock * .37 + rival.phase) * .60;
        let targetSpeed = rival.pace + flow - Math.min(8.4, Math.abs(curvature) * 23);
        let lane = rival.lane + Math.sin(station * 4 + rival.phase) * 1.14 + curvature * 2.1;
        for (const front of rivals) {
          if (front === rival) continue;
          const gap = (front.meter - rival.meter + route.length) % route.length;
          if (gap > 14 || Math.abs(front.line - rival.line) > 2.6) continue;
          const shift = front.line >= 0 ? -3.2 : 3.2;
          lane = THREE.MathUtils.lerp(lane, front.line + shift, 1 - THREE.MathUtils.smoothstep(gap, 5.5, 14));
          if (gap < 8) targetSpeed = Math.min(targetSpeed, Math.max(9, front.speed - (8 - gap) * .72));
        }
        const acceleration = 1.45 * THREE.MathUtils.clamp(rival.model.power / rival.model.mass / (8100 / 770), .80, 1.35);
        const deceleration = 3.1 * (rival.model.brakePower ?? .11) / .11;
        rival.speed = THREE.MathUtils.damp(rival.speed, targetSpeed, targetSpeed < rival.speed ? deceleration : acceleration, dt);
        const distance = route.separation(rival.meter, playerMeter);
        const near = distance < 17 && Math.hypot(driver.x - rival.body.position.x, driver.z - rival.body.position.z) < 15;
        const playerLane = (driver.x - entry.x) * entry.nx + (driver.z - entry.z) * entry.nz;
        const courtesy = near && Math.abs(playerLane - rival.line) < 2.35 ? (playerLane >= rival.line ? -1 : 1) * 1.25 : 0;
        rival.line = THREE.MathUtils.damp(rival.line, THREE.MathUtils.clamp(lane + courtesy, -4.70, 4.70), 1.6, dt);
        const old = target(rival, rival.meter, rival.line);
        rival.meter += rival.speed * dt;
        const next = target(rival, rival.meter, rival.line);
        const dx = next.x - old.x, dz = next.z - old.z;
        const yaw = Math.atan2(-dx, -dz);
        rival.body.position.set(old.x, rival.model.stance - .02, old.z);
        rival.body.velocity.set(dx / dt, 0, dz / dt);
        rival.body.quaternion.setFromAxisAngle(up, yaw);
        rival.body.aabbNeedsUpdate = true;
        rival.view.position.set(next.x, rival.model.stance - .024, next.z);
        rival.view.rotation.y = yaw;
        for (const wheel of rival.wheels) wheel.rotation.x -= rival.speed * dt / rival.model.radius;
      }
    },
  };
}
