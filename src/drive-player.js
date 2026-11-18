import * as THREE from 'three';
import { Body, ContactMaterial, Material, Sphere, Vec3 } from 'cannon-es';
import { createPerson, outdoorStyle } from './drive-people.js';

const up = new Vec3(0, 1, 0);
const axis = new THREE.Vector3(0, 1, 0);
export const playerCollisionGroup = 64;

export function createPlayer(scene, world, audio, compact = false, outdoors = false) {
  const { view, parts } = createPerson(scene, outdoors ? outdoorStyle : 5, true);
  const shoes = new Material('player shoes');
  world.addContactMaterial(new ContactMaterial(shoes, world.defaultMaterial, { friction: 0, restitution: 0 }));
  const body = new Body({
    mass: 76, material: shoes, fixedRotation: true, allowSleep: false, linearDamping: .03,
    collisionFilterGroup: playerCollisionGroup, collisionFilterMask: outdoors ? 13 : 5,
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
  let headTurn = 0, airborne = 0, runWeight = 0, breathing = 0;

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
    recoil = paceWeight = armSwing = bodyBob = headTurn = airborne = runWeight = breathing = 0;
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
    const running = THREE.MathUtils.smoothstep(pace, 2.5, 7.35);
    runWeight = THREE.MathUtils.damp(runWeight, running, 8, dt);
    airborne = THREE.MathUtils.damp(airborne, grounded ? 0 : 1, 14, dt);
    breathing += dt * (2.1 + runWeight * 1.2);
    if (grounded && pace > .45) {
      const cadence = 1.24 + pace * .34;
      stride += Math.PI * cadence * dt;
      const beat = Math.floor((stride + .37) / Math.PI);
      if (beat !== lastStep) audio.play('footstep');
      lastStep = beat;
    }
    paceWeight = THREE.MathUtils.damp(paceWeight, grounded ? Math.min(1, pace / 3) : 0, 12, dt);
    const swing = Math.sin(stride) * paceWeight;
    armSwing = swing * (.32 + runWeight * .29);
    const travelHeading = equipped ? yaw + Math.PI : pace > .55 ? Math.atan2(velocity.x, velocity.z) : heading;
    const angle = travelHeading - heading;
    const turn = Math.atan2(Math.sin(angle), Math.cos(angle));
    heading += turn * (1 - Math.exp(-10 * dt));
    const glance = yaw + Math.PI - heading;
    headTurn = THREE.MathUtils.damp(headTurn, THREE.MathUtils.clamp(Math.atan2(Math.sin(glance), Math.cos(glance)), -.42, .42), 9, dt);
    bodyBob = (1 - airborne) * Math.abs(swing) * (.028 + runWeight * .034);
    parts[0].rotation.z = THREE.MathUtils.damp(parts[0].rotation.z, swing * .034 - turn * paceWeight * .055, 12, dt);
    parts[0].rotation.y = swing * (.038 + runWeight * .032);
    const lean = .019 + paceWeight * (.040 + runWeight * .135) + Math.sin(breathing) * (1 - paceWeight) * .009;
    parts[0].rotation.x = THREE.MathUtils.damp(parts[0].rotation.x, lean, 11, dt);
    for (const side of [0, 1]) {
      const sign = side ? -1 : 1;
      const phase = stride + side * Math.PI;
      const leg = Math.sin(phase) * paceWeight;
      const thigh = THREE.MathUtils.lerp(leg * (.56 + .27 * runWeight) - runWeight * .09, -.21 + sign * .27, airborne);
      const bend = Math.max(0, Math.sin(phase - .45)) * paceWeight;
      const knee = THREE.MathUtils.lerp(.045 + bend * (.61 + .50 * runWeight), .53 + sign * .15, airborne);
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
    parts[2].rotation.set(blend(armSwing - airborne * .28, -1.11 - pitch * .54), .05, blend(-.10 - airborne * .25, .36));
    parts[3].rotation.set(blend(-armSwing - airborne * .28, -1.20 - pitch * .60 - recoil), -.04, blend(.10 + airborne * .25, -.06));
    const elbows = -.12 - runWeight * .57 - airborne * .27;
    parts[4].rotation.set(blend(elbows - Math.max(0, -armSwing) * .32, -.56 - pitch * .32), -.10, blend(0, .36));
    parts[5].rotation.set(blend(elbows - Math.max(0, armSwing) * .32, -.48 - pitch * .33), 0, -.025);
    parts[1].rotation.x = blend(-.055 * paceWeight - parts[0].rotation.x * .33, -pitch * .4);
    parts[1].rotation.y = blend(headTurn - parts[0].rotation.y * .58, 0);
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
