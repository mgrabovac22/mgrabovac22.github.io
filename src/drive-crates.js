import * as THREE from 'three';
import { Body, Box, Quaternion, Vec3 } from 'cannon-es';

export const crateGroup = 16;
const box = new THREE.BoxGeometry();
const plane = new THREE.PlaneGeometry();
const pine = new THREE.MeshStandardMaterial({ color: 0x604e39, roughness: .83 });
const edge = new THREE.MeshStandardMaterial({ color: 0xb28d59, roughness: .83 });
const marking = new THREE.MeshBasicMaterial({ color: 0xffdc98 });

function mesh(parent, geometry, material, w, h, d, x = 0, y = 0, z = 0) {
  const part = new THREE.Mesh(geometry, material);
  part.scale.set(w, h, d);
  part.position.set(x, y, z);
  parent.add(part);
  return part;
}

export function createCrate(parent, x, z, size, { id, elevation = 0, label, shortcut = null }) {
  const view = new THREE.Group();
  parent.add(view);
  view.position.set(x, elevation + size / 2 + .035, z);
  mesh(view, box, pine, size, size, size);
  for (const side of [-1, 1]) {
    mesh(view, box, edge, size * 1.035, size * .075, size * 1.035, 0, side * size * .43);
    mesh(view, box, edge, size * .105, size * .91, size * 1.036, side * size * .35);
  }
  if (label) {
    for (let face = 0; face < 4; face++) {
      const angle = face * Math.PI / 2;
      const board = mesh(view, plane, label, size * .89, size * .43, 1,
        Math.sin(angle) * size * .521, .02, Math.cos(angle) * size * .521);
      board.rotation.y = angle;
    }
  } else {
    mesh(view, box, marking, size * .62, size * .065, .01, 0, 0, size * .51).rotation.z = .37;
  }
  const shape = new Box(new Vec3(size / 2 + .045, size / 2, size / 2 + .045));
  shape.collisionFilterGroup = crateGroup;
  const collider = new Body({ mass: 0, shape, collisionFilterGroup: crateGroup, collisionFilterMask: 4,
    collisionResponse: false, position: new Vec3(x, elevation + size / 2, z) });
  return { id, view, collider, x, z, shortcut, spent: false };
}

export function crateCollision(target, enqueue, minSpeedSquared = 2.56) {
  return ({ body: driver, contact }) => {
    if (driver.collisionFilterGroup !== 4 || target.spent || driver.velocity.lengthSquared() < minSpeedSquared) return;
    const offset = contact.bi === driver ? contact.ri : contact.rj;
    enqueue({
      target, driver, impact: driver.velocity.clone(),
      localHit: driver.vectorToLocalFrame(offset),
      localCrate: driver.pointToLocalFrame(target.collider.position),
    });
  };
}

const courseFootprints = {
  formula: [[.96, -.22, .63, -2.29, 2.29], [1.13, -.64, .075, -1.83, -1.07], [1.18, -.64, .075, 1.07, 1.83],
    [1.06, -.16, -.015, -2.28, -1.88]],
  buggy: [[.86, -.28, .95, -1.71, 1.71], [1.10, -.87, .15, -1.63, -.68], [1.10, -.87, .15, .68, 1.63]],
};

function sweep(from, to, lower, upper) {
  let enter = 0, exit = 1;
  for (let axis = 0; axis < 3; axis++) {
    const motion = to[axis] - from[axis];
    if (Math.abs(motion) < .0001) {
      if (from[axis] < lower[axis] || from[axis] > upper[axis]) return false;
      continue;
    }
    const a = (lower[axis] - from[axis]) / motion;
    const b = (upper[axis] - from[axis]) / motion;
    enter = Math.max(enter, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
    if (enter > exit) return false;
  }
  return true;
}

export function createCourseCrateSweep() {
  const origin = new Vec3();
  const rotation = new Quaternion();
  const before = new Vec3(), after = new Vec3();
  let vehicle;
  return {
    begin(car) {
      vehicle = car;
      origin.copy(car.chassis.position);
      car.chassis.quaternion.conjugate(rotation);
    },
    hit(target) {
      if (!vehicle || target.spent) return null;
      const driver = vehicle.chassis;
      if (origin.distanceSquared(driver.position) > 12) return null;
      const center = target.collider.position;
      if (Math.abs(center.x - driver.position.x) > 6 || Math.abs(center.z - driver.position.z) > 6) return null;
      // Sweep the previous and current local poses so a wheel grazing a corner between steps can still hit.
      center.vsub(origin, before);
      rotation.vmult(before, before);
      driver.pointToLocalFrame(center, after);
      const radius = target.collider.shapes[0].halfExtents;
      const rim = radius.x * .98;
      const vertical = radius.y;
      const from = [before.x, before.y, before.z], to = [after.x, after.y, after.z];
      const touched = courseFootprints[vehicle.kind].some(([halfWidth, floor, roof, nose, tail]) =>
        sweep(from, to, [-halfWidth - rim, floor - vertical, nose - rim], [halfWidth + rim, roof + vertical, tail + rim]));
      if (!touched) return null;
      const localCrate = after.clone();
      return { target, driver, impact: driver.velocity.clone(), localHit: localCrate.clone(), localCrate };
    },
  };
}

export function breakCrate(world, collected, collision) {
  const { target, driver, impact, localHit, localCrate } = collision;
  let coins = 0;
  for (const crate of target.pile ?? [target]) {
    if (!collected.has(crate.id)) {
      collected.add(crate.id);
      coins++;
    }
    crate.spent = true;
    crate.view.visible = false;
    world.removeBody(crate.collider);
  }
  const { x, z, pile, shortcut } = target;
  return { x, z, driver, impact, localHit, localCrate, pile, shortcut, coins };
}

export function restoreCrate(world, crate, active = true) {
  if (!crate.spent) return;
  crate.spent = false;
  crate.view.visible = true;
  if (active) world.addBody(crate.collider);
}
