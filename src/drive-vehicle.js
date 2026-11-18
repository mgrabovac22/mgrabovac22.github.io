import * as THREE from 'three';
import { Body, Box, RaycastVehicle, Vec3 } from 'cannon-es';
import { createPerson } from './drive-people.js';
import { buildUtilityBody, buildWheel } from './drive-vehicle-art.js';
import { crateGroup } from './drive-crates.js';

export const tankBay = { x: -4.04, z: -276.25, yaw: -.09 };
export const vehicleTypes = ['sport', 'jeep', 'monster', 'bike'];

const presets = {
  jeep: { mass: 1850, axle: 1.08, length: 1.55, radius: .47, rest: .44, stance: .99, power: 10500, stiffness: 33, max: 32, steer: .49, width: 1.09, depth: 2.06, color: 0x728779 },
  monster: { mass: 2600, axle: 1.34, length: 1.56, radius: .84, rest: .55, stance: 1.46, power: 20200, stiffness: 34, max: 30, steer: .55, width: 1.0, depth: 2.10, color: 0x926244 },
  bike: { mass: 255, axle: 0, length: 1.12, radius: .36, rest: .27, stance: .67, power: 2250, stiffness: 48, max: 48, steer: .44, width: .34, depth: 1.27, color: 0x414e61 },
  tank: { mass: 3150, axle: 1.02, length: 1.35, radius: .48, rest: .40, stance: .98, power: 17500, stiffness: 45, max: 22, steer: .58, width: 1.17, depth: 1.98, color: 0x497478 },
  formula: { mass: 770, axle: .93, length: 1.45, radius: .337, rest: .22, stance: .67, power: 8100, stiffness: 60, max: 52, steer: .55, width: .96, depth: 2.28, color: 0xc73830 },
  buggy: { mass: 870, axle: .92, length: 1.16, radius: .46, rest: .42, stance: .98, power: 6550, stiffness: 34, max: 36, steer: .57, width: .86, depth: 1.71, color: 0xc68138 },
};

const up = new Vec3(0, 1, 0);
const forward = new Vec3(0, 0, -1);
const idle = { forward: false, reverse: false, left: false, right: false, brake: true };

export function createUtilityVehicle(scene, world, kind) {
  const p = presets[kind];
  const bike = kind === 'bike';
  const body = new THREE.Group();
  const { equipment, pilot } = buildUtilityBody(body, kind, p);
  let rider = pilot;
  if (bike) {
    const { view, parts } = createPerson(body, 5, true);
    rider = view;
    rider.scale.setScalar(.84);
    rider.rotation.y = Math.PI;
    rider.position.set(0, -.34, .45);
    parts[0].rotation.x = -.37;
    parts[1].rotation.x = .26;
    for (const side of [0, 1]) {
      parts[2 + side].rotation.x = -1.13;
      parts[2 + side].rotation.z = (side ? 1 : -1) * .34;
      parts[4 + side].rotation.x = -.58;
      parts[6 + side].rotation.x = -1.12;
      parts[6 + side].rotation.z = (side ? 1 : -1) * .22;
      parts[8 + side].rotation.x = 1.58;
    }
  }
  scene.add(body);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({
    color: 0x0a1419, opacity: .29, transparent: true, depthWrite: false,
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(Math.max(p.width, p.axle + .32) * 1.24, p.depth * 1.19, 1);
  scene.add(shadow);
  const chassis = new Body({ mass: p.mass, linearDamping: .09, angularDamping: .51, collisionFilterGroup: 4 });
  chassis.addShape(new Box(new Vec3(p.width, bike ? .25 : .32, p.depth)), new Vec3(0, .10, 0));
  chassis.addShape(new Box(new Vec3(p.width * .8, kind === 'formula' ? .17 : .29, bike ? .57 : 1.02)),
    new Vec3(0, kind === 'formula' ? .30 : .62, .25));
  if (kind === 'monster') {
    // The real tire footprint can touch a crate while the chassis passes above it.
    const inertia = chassis.inertia.clone();
    const inverseInertia = chassis.invInertia.clone();
    for (const z of [-p.length, p.length]) for (const side of [-1, 1]) {
      const contact = new Box(new Vec3(.33, .36, .54));
      contact.collisionFilterMask = crateGroup;
      contact.collisionResponse = false;
      chassis.addShape(contact, new Vec3(side * p.axle, -.77, z));
    }
    chassis.inertia.copy(inertia);
    chassis.invInertia.copy(inverseInertia);
    chassis.updateInertiaWorld(true);
  }
  const rig = new RaycastVehicle({ chassisBody: chassis, indexRightAxis: 0, indexUpAxis: 1, indexForwardAxis: 2 });
  const wheels = [];
  for (const z of [-p.length, p.length]) {
    for (const side of bike ? [0] : [-1, 1]) {
      rig.addWheel({
        radius: p.radius, directionLocal: new Vec3(0, -1, 0), axleLocal: new Vec3(1, 0, 0),
        chassisConnectionPointLocal: new Vec3(side * p.axle, -.10, z),
        suspensionRestLength: p.rest, suspensionStiffness: p.stiffness, maxSuspensionForce: p.mass * 31,
        dampingRelaxation: 3.8, dampingCompression: 5.5, maxSuspensionTravel: p.rest * .77,
        rollInfluence: .06, frictionSlip: kind === 'formula' ? 6.8 : kind === 'buggy' ? 4.2 : bike ? 4.4 : 5.1,
      });
      const width = kind === 'monster' ? .66 : bike ? .20 : kind === 'formula' ? (z < 0 ? .38 : .49) : .34;
      const wheel = kind === 'tank' ? null : buildWheel(p.radius, width, bike ? 5 : 7, side, kind !== 'formula', kind === 'buggy');
      if (wheel) scene.add(wheel);
      wheels.push(wheel);
    }
  }
  const facing = new Vec3();
  const localOmega = new Vec3();
  const currentUp = new Vec3();
  const inverse = new THREE.Quaternion();
  const wheelRotation = new THREE.Quaternion();
  const correction = new Vec3();
  const wantedUp = new Vec3();
  let active = false;
  let steer = 0;
  let throttle = 0;
  let brake = 0;
  let recovery = null;

  function setActive(value) {
    if (active === value) return;
    active = value;
    if (value) rig.addToWorld(world);
    else rig.removeFromWorld(world);
    body.visible = shadow.visible = value;
    for (const wheel of wheels) if (wheel) wheel.visible = value;
  }

  function setPose(x, y, z, yaw = 0, smoothRecovery = false) {
    recovery = smoothRecovery ? { elapsed: 0, position: body.position.clone(), rotation: body.quaternion.clone() } : null;
    chassis.position.set(x, y, z);
    chassis.quaternion.setFromAxisAngle(up, yaw);
    chassis.velocity.setZero();
    chassis.angularVelocity.setZero();
    chassis.previousPosition.copy(chassis.position);
    chassis.interpolatedPosition.copy(chassis.position);
    chassis.previousQuaternion.copy(chassis.quaternion);
    chassis.interpolatedQuaternion.copy(chassis.quaternion);
    chassis.force.setZero();
    chassis.torque.setZero();
    chassis.aabbNeedsUpdate = true;
    chassis.wakeUp();
    steer = throttle = brake = 0;
  }

  function drive(input = idle, dt) {
    chassis.quaternion.vmult(forward, facing);
    const speed = chassis.velocity.dot(facing);
    const power = recovery ? 0 : Number(input.forward) - Number(input.reverse);
    const turn = recovery ? 0 : Number(input.left) - Number(input.right);
    steer = THREE.MathUtils.damp(steer, turn * p.steer * (1 - .66 * Math.min(1, Math.abs(speed) / p.max)), 8, dt);
    const braking = Boolean(recovery) || input.brake || (power !== 0 && speed * power < -.8);
    brake = THREE.MathUtils.damp(brake, Number(braking), 15, dt);
    throttle = THREE.MathUtils.damp(throttle, braking ? 0 : power, 8, dt);
    const limit = throttle < 0 ? Math.min(13, p.max * .55) : p.max;
    const force = throttle * (1 - brake) * p.power * Math.max(0, 1 - Math.abs(speed) / limit);
    const front = wheels.length / 2;
    for (let i = 0; i < wheels.length; i++) {
      if (i < front) rig.setSteeringValue(steer, i);
      rig.applyEngineForce(force * (i < front ? (bike ? 0 : .21) : (bike ? 1 : .29)), i);
      rig.setBrake(2 + brake * (p.mass * .11), i);
    }
    if (bike && rig.numWheelsOnGround) {
      const lean = steer * Math.min(1, Math.abs(speed) / 8) * .89;
      const heading = Math.atan2(-facing.x, -facing.z);
      wantedUp.set(-Math.sin(lean) * Math.cos(heading), Math.cos(lean), Math.sin(lean) * Math.sin(heading));
      chassis.quaternion.vmult(up, currentUp);
      currentUp.cross(wantedUp, correction);
      chassis.vectorToLocalFrame(chassis.angularVelocity, localOmega);
      localOmega.set(localOmega.x, 0, localOmega.z);
      chassis.vectorToWorldFrame(localOmega, localOmega);
      chassis.torque.vadd(correction.scale(p.mass * 23), chassis.torque);
      chassis.torque.vsub(localOmega.scale(p.mass * 3.2), chassis.torque);
    }
  }

  function render(dt = 0, _emit, occupied) {
    if (!active) return;
    body.position.copy(chassis.interpolatedPosition);
    body.quaternion.copy(chassis.interpolatedQuaternion);
    if (equipment && dt > 0) {
      chassis.quaternion.vmult(forward, facing);
      const distance = -chassis.velocity.dot(facing) * dt;
      if (Math.abs(distance) > .0007) equipment.roll(distance);
    }
    if (recovery) {
      recovery.elapsed += dt;
      const progress = THREE.MathUtils.smoothstep(recovery.elapsed, 0, .67);
      body.position.lerp(recovery.position, 1 - progress);
      body.position.y += Math.sin(progress * Math.PI) * .42;
      body.quaternion.slerp(recovery.rotation, 1 - progress);
      if (progress >= 1) recovery = null;
    }
    if (rider) rider.visible = occupied;
    shadow.position.set(body.position.x, .092, body.position.z);
    shadow.material.opacity = .29 / Math.max(1, 1 + body.position.y - p.stance);
    inverse.copy(chassis.quaternion).invert();
    for (let i = 0; i < wheels.length; i++) {
      const wheel = wheels[i];
      if (!wheel) continue;
      rig.updateWheelTransform(i);
      const transform = rig.wheelInfos[i].worldTransform;
      wheel.position.copy(transform.position).sub(chassis.position).applyQuaternion(inverse)
        .applyQuaternion(body.quaternion).add(body.position);
      wheelRotation.copy(transform.quaternion).premultiply(inverse);
      wheel.quaternion.multiplyQuaternions(body.quaternion, wheelRotation);
    }
  }

  const muzzle = new THREE.Vector3();
  const direction = new THREE.Vector3();
  return {
    chassis, stance: p.stance, width: p.width, kind, viewPosition: body.position, drive, render, setPose, setActive,
    get grounded() { return rig.numWheelsOnGround >= 2; },
    aim(yaw, pitch) {
      if (!equipment) return;
      equipment.turret.rotation.y = yaw;
      equipment.nozzle.rotation.x = pitch;
    },
    shot() {
      if (!equipment) return null;
      const { nozzle } = equipment;
      nozzle.updateWorldMatrix(true, false);
      muzzle.set(0, 0, -1.94).applyMatrix4(nozzle.matrixWorld);
      direction.set(0, 0, -1).transformDirection(nozzle.matrixWorld);
      return { muzzle, direction };
    },
  };
}
