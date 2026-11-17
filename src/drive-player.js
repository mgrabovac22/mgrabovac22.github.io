import * as THREE from 'three';
import { Body, ContactMaterial, Material, Sphere, Vec3 } from 'cannon-es';
import { createPerson } from './drive-people.js';

const up = new Vec3(0, 1, 0);
const axis = new THREE.Vector3(0, 1, 0);
export const playerCollisionGroup = 64;

export function createPlayer(scene, world, audio) {
  const { view, parts } = createPerson(scene, 4);
  const shoes = new Material('player shoes');
  world.addContactMaterial(new ContactMaterial(shoes, world.defaultMaterial, { friction: 0, restitution: 0 }));
  const body = new Body({
    mass: 76, material: shoes, fixedRotation: true, linearDamping: .03, collisionFilterGroup: playerCollisionGroup, collisionFilterMask: 5,
  });
  for (const y of [-.51, -.16, .20, .54]) body.addShape(new Sphere(.27), new Vec3(0, y, 0));
  const held = new THREE.Group();
  held.position.set(.24, 1.21, .32);
  held.rotation.y = Math.PI;
  view.add(held);
  const bottom = new Vec3();
  const movement = new THREE.Vector3();
  const muzzle = new THREE.Vector3();
  let active = false;
  let heading = Math.PI;
  let jump = 0;
  let stride = 0;
  let lastStep = 0;
  let landing = 0;

  function setActive(value) {
    if (value === active) return;
    active = value;
    view.visible = value;
    if (value) world.addBody(body);
    else world.removeBody(body);
  }
  view.visible = false;

  function place(x, y, z, yaw) {
    body.position.set(x, y, z);
    body.interpolatedPosition.copy(body.position);
    body.previousPosition.copy(body.position);
    body.velocity.setZero();
    body.aabbNeedsUpdate = true;
    body.wakeUp();
    heading = yaw + Math.PI;
    jump = stride = lastStep = landing = 0;
  }

  function step(input, yaw, dt) {
    const { velocity, position } = body;
    bottom.set(position.x, position.y - .94, position.z);
    let grounded = false;
    world.raycastAll(position, bottom, { skipBackfaces: true, collisionFilterGroup: playerCollisionGroup, collisionFilterMask: 5 }, hit => {
      if (hit.body !== body && hit.hitNormalWorld.dot(up) > .52) grounded = true;
    });
    jump = Math.max(0, jump - dt);
    landing = grounded ? .075 : Math.max(0, landing - dt);
    if (landing && jump && velocity.y < .9) {
      velocity.y = 5.7;
      jump = landing = 0;
    }
    movement.set(Number(input.right) - Number(input.left), 0, Number(input.reverse) - Number(input.forward));
    if (movement.lengthSq() > 0) movement.normalize().applyAxisAngle(axis, yaw);
    const speed = input.sprint ? 7.4 : 4.35;
    velocity.x = THREE.MathUtils.damp(velocity.x, movement.x * speed, grounded ? 14 : 4, dt);
    velocity.z = THREE.MathUtils.damp(velocity.z, movement.z * speed, grounded ? 14 : 4, dt);
    const pace = Math.hypot(velocity.x, velocity.z);
    if (grounded && pace > .45) {
      stride += pace * dt * 3.1;
      const beat = Math.floor(stride / Math.PI);
      if (beat !== lastStep) audio.play('footstep');
      lastStep = beat;
    }
    const swing = grounded ? Math.sin(stride) * Math.min(1, pace / 3) : .22;
    const angle = yaw + Math.PI - heading;
    heading += Math.atan2(Math.sin(angle), Math.cos(angle)) * (1 - Math.exp(-13 * dt));
    parts[0].rotation.z = -movement.x * .045;
    parts[2].rotation.x = swing * .36;
    parts[3].rotation.x = -1.04;
    parts[5].rotation.x = -.72;
    for (const side of [0, 1]) {
      const leg = swing * (side ? -1 : 1);
      parts[6 + side].rotation.x = leg * .63;
      parts[8 + side].rotation.x = Math.max(0, -leg) * .84;
    }
  }

  function render(pitch) {
    const position = body.interpolatedPosition;
    view.position.set(position.x, position.y - .79, position.z);
    view.rotation.y = heading;
    held.rotation.x = pitch;
    parts[1].rotation.x = -pitch * .4;
  }

  return {
    body, held, place, setActive, step, render,
    jump() { jump = .13; },
    muzzle(longBarrel = false) { return held.localToWorld(muzzle.set(0, .08, longBarrel ? -.73 : -.61)); },
  };
}
