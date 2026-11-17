import * as THREE from 'three';
import { Body, Box, Vec3 } from 'cannon-es';

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
  const collider = new Body({ mass: 0, shape, collisionFilterGroup: crateGroup, collisionFilterMask: 4, collisionResponse: false });
  collider.position.set(x, elevation + size / 2, z);
  return { id, view, collider, x, z, shortcut, spent: false };
}

export function crateCollision(target, enqueue) {
  return ({ body: driver, contact }) => {
    if (driver.collisionFilterGroup !== 4 || target.spent || driver.velocity.lengthSquared() < 2.56) return;
    const offset = contact.bi === driver ? contact.ri : contact.rj;
    enqueue({
      target, driver, impact: driver.velocity.clone(),
      localHit: driver.vectorToLocalFrame(offset),
      localCrate: driver.pointToLocalFrame(target.collider.position),
    });
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
