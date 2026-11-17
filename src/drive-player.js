import * as THREE from 'three';
import { Body, ContactMaterial, Material, Sphere, Vec3 } from 'cannon-es';
import { createPerson } from './drive-people.js';

const up = new Vec3(0, 1, 0);
const axis = new THREE.Vector3(0, 1, 0);
export const playerCollisionGroup = 64;

export function createPlayer(scene, world, audio, compact = false) {
  const { view, parts } = createPerson(scene, 5, true);
  const shoes = new Material('player shoes');
  world.addContactMaterial(new ContactMaterial(shoes, world.defaultMaterial, { friction: 0, restitution: 0 }));
  const body = new Body({
    mass: 76, material: shoes, fixedRotation: true, allowSleep: false, linearDamping: .03,
    collisionFilterGroup: playerCollisionGroup, collisionFilterMask: 5,
  });
  for (const y of [-.51, -.16, .20, .54]) body.addShape(new Sphere(.27), new Vec3(0, y, 0));
  const held = new THREE.Group();
  held.position.set(.016, -.242, .031);
  held.scale.setScalar(compact ? .64 : .76);
  const grip = parts[5];
  grip.add(held);
  const bottom = new Vec3();
  const movement = new THREE.Vector3();
  const muzzle = new THREE.Vector3();
  const target = new THREE.Quaternion();
  const wrist = new THREE.Quaternion();
  const aim = new THREE.Euler(0, 0, 0, 'YXZ');
  let active = false;
  let heading = Math.PI;
  let jump = 0;
  let stride = 0;
  let lastStep = 0;
  let landing = 0;
  let equipped = false;
  let shoulderWeight = 0;
  let recoil = 0;
  let paceWeight = 0;
  let armSwing = 0;
  let bodyBob = 0;

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
    recoil = paceWeight = armSwing = bodyBob = 0;
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
    movement.set(Number(input.right) - Number(input.left) + (input.moveX ?? 0), 0,
      Number(input.reverse) - Number(input.forward) + (input.moveZ ?? 0));
    movement.clampLength(0, 1).applyAxisAngle(axis, yaw);
    const sprint = input.sprint ? 1 : input.sprintAmount ?? 0;
    const speed = THREE.MathUtils.lerp(4.35, 7.4, sprint);
    velocity.x = THREE.MathUtils.damp(velocity.x, movement.x * speed, grounded ? 14 : 4, dt);
    velocity.z = THREE.MathUtils.damp(velocity.z, movement.z * speed, grounded ? 14 : 4, dt);
    const pace = Math.hypot(velocity.x, velocity.z);
    if (grounded && pace > .45) {
      stride += pace * dt * (3.4 - sprint * .57);
      const beat = Math.floor(stride / Math.PI);
      if (beat !== lastStep) audio.play('footstep');
      lastStep = beat;
    }
    paceWeight = THREE.MathUtils.damp(paceWeight, grounded ? Math.min(1, pace / 3) : 0, 12, dt);
    const swing = Math.sin(stride) * paceWeight;
    armSwing = swing * (.40 + sprint * .23);
    const travelHeading = !equipped && pace > .55 ? Math.atan2(velocity.x, velocity.z) : yaw + Math.PI;
    const angle = travelHeading - heading;
    heading += Math.atan2(Math.sin(angle), Math.cos(angle)) * (1 - Math.exp(-11 * dt));
    bodyBob = grounded ? Math.abs(swing) * (.022 + sprint * .030) : 0;
    parts[0].rotation.z = -movement.x * .036 + swing * .025;
    parts[0].rotation.x = THREE.MathUtils.damp(parts[0].rotation.x, .02 + paceWeight * (.03 + sprint * .12), 11, dt);
    for (const side of [0, 1]) {
      const sign = side ? -1 : 1;
      const leg = swing * sign;
      const thigh = grounded ? leg * (.67 + .18 * sprint) : sign * .23;
      const knee = grounded ? Math.max(0, -leg) * (.89 + .19 * sprint) : .42 + sign * .09;
      parts[6 + side].rotation.x = THREE.MathUtils.damp(parts[6 + side].rotation.x, thigh, 23, dt);
      parts[8 + side].rotation.x = THREE.MathUtils.damp(parts[8 + side].rotation.x, knee, 25, dt);
    }
  }

  function render(pitch, dt = 0) {
    const position = body.interpolatedPosition;
    view.position.set(position.x, position.y - .79 + bodyBob, position.z);
    view.rotation.y = heading;
    shoulderWeight = THREE.MathUtils.damp(shoulderWeight, Number(equipped), 19, dt);
    recoil = THREE.MathUtils.damp(recoil, 0, 17, dt);
    const blend = (rest, aimed) => THREE.MathUtils.lerp(rest, aimed, shoulderWeight);
    parts[2].rotation.set(blend(armSwing, -1.11 - pitch * .54), .05, blend(-.12, .36));
    parts[3].rotation.set(blend(-armSwing, -1.20 - pitch * .60 - recoil), -.04, blend(.12, -.06));
    parts[4].rotation.set(blend(-.17 - Math.abs(armSwing), -.56 - pitch * .32), -.10, blend(0, .36));
    parts[5].rotation.set(blend(-.17 - Math.abs(armSwing), -.48 - pitch * .33), 0, -.025);
    parts[1].rotation.x = blend(-.055 * paceWeight, -pitch * .4);
    target.setFromEuler(aim.set(pitch, heading + Math.PI, 0));
    held.quaternion.copy(grip.getWorldQuaternion(wrist).invert()).multiply(target);
  }

  return {
    body, held, place, setActive, step, render,
    equip(value) { equipped = value; },
    kick() { recoil = .105; },
    jump() { jump = .13; },
    muzzle(longBarrel = false) { return held.localToWorld(muzzle.set(0, .08, longBarrel ? -.73 : -.61)); },
  };
}
