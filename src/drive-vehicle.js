import * as THREE from 'three';
import { Body, Box, RaycastVehicle, Vec3 } from 'cannon-es';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createPerson } from './drive-people.js';

export const tankBay = { x: 9.35, z: -13.5, yaw: Math.PI / 2 };
export const vehicleTypes = ['sport', 'jeep', 'monster', 'bike'];

const presets = {
  jeep: { mass: 1850, axle: 1.08, length: 1.55, radius: .47, rest: .44, stance: .99, power: 10500, stiffness: 33, max: 32, steer: .49, width: 1.09, depth: 2.06, color: 0x728779 },
  monster: { mass: 2600, axle: 1.34, length: 1.56, radius: .84, rest: .55, stance: 1.46, power: 20200, stiffness: 34, max: 30, steer: .55, width: 1.0, depth: 2.10, color: 0x926244 },
  bike: { mass: 255, axle: 0, length: 1.12, radius: .36, rest: .27, stance: .67, power: 2250, stiffness: 48, max: 48, steer: .44, width: .34, depth: 1.27, color: 0x414e61 },
  tank: { mass: 3150, axle: 1.02, length: 1.35, radius: .48, rest: .40, stance: .98, power: 17500, stiffness: 45, max: 22, steer: .58, width: 1.17, depth: 1.98, color: 0x497478 },
};

const round = new RoundedBoxGeometry(1, 1, 1, 2, .12);
const cylinder = new THREE.CylinderGeometry(.5, .5, 1, 14);
const palette = color => new THREE.MeshStandardMaterial({ color, roughness: .64, metalness: .22 });
const black = palette(0x1b252c);
const metal = palette(0x91a5ab);
const glass = palette(0x293e49);
const headlamp = new THREE.MeshBasicMaterial({ color: 0xffe8b9 });
const tail = new THREE.MeshBasicMaterial({ color: 0xe65a61 });
const up = new Vec3(0, 1, 0);
const forward = new Vec3(0, 0, -1);
const idle = { forward: false, reverse: false, left: false, right: false, brake: true };

function part(parent, surface, w, h, d, x, y, z, geometry = round) {
  const mesh = new THREE.Mesh(geometry, surface);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildBody(body, kind, p) {
  const paint = palette(p.color);
  if (kind === 'bike') {
    part(body, black, .39, .48, 1.44, 0, .04, .12);
    part(body, paint, .53, .40, 1.04, 0, .43, -.29);
    part(body, black, .45, .15, .80, 0, .49, .59);
    part(body, paint, .41, .20, .67, 0, .33, .92);
    part(body, glass, .34, .26, .09, 0, .76, -.76).rotation.x = -.28;
    part(body, metal, .79, .065, .09, 0, .77, -.56);
    part(body, headlamp, .29, .12, .07, 0, .51, -.855);
    part(body, tail, .28, .085, .05, 0, .38, 1.27);
    for (const side of [-1, 1]) {
      part(body, metal, .085, .76, .086, side * .14, .03, -.89).rotation.x = -.3;
      part(body, metal, .12, .12, .82, side * .27, -.08, .62);
    }
    return null;
  }

  part(body, black, p.width * 1.93, .30, p.depth * 2.02, 0, -.12, 0);
  part(body, paint, p.width * 1.87, .55, p.depth * 1.9, 0, .20, 0);
  part(body, black, p.width * 1.77, .22, .085, 0, .10, -p.depth);
  for (const side of [-1, 1]) {
    part(body, headlamp, .38, .14, .07, p.width * side * .70, .27, -p.depth + .02);
    part(body, tail, .27, .15, .075, p.width * side * .74, .21, p.depth - .03);
    part(body, metal, .10, .08, p.depth * 1.46, side * p.width * .93, -.10, 0);
  }
  if (kind === 'tank') {
    for (const side of [-1, 1]) {
      part(body, black, .40, .55, p.depth * 1.94, side * 1.04, -.31, 0);
      part(body, paint, .49, .13, p.depth * 1.9, side * 1.08, .11, 0);
      for (let step = -5; step <= 5; step++) part(body, metal, .065, .21, .23, side * 1.25, -.39, step * .31);
    }
    const turret = new THREE.Group();
    turret.position.set(0, .52, .10);
    body.add(turret);
    part(turret, metal, 1.35, .19, 1.35, 0, 0, 0, cylinder);
    part(turret, paint, 1.43, .47, 1.36, 0, .32, .02);
    part(turret, headlamp, .45, .10, .06, 0, .51, -.61);
    part(turret, glass, .67, .09, .41, 0, .58, .23);
    const nozzle = new THREE.Group();
    nozzle.position.set(0, .30, -.32);
    turret.add(nozzle);
    part(nozzle, black, .25, 1.62, .25, 0, 0, -.85, cylinder).rotation.x = Math.PI / 2;
    part(nozzle, metal, .43, .51, .43, 0, 0, -1.61, cylinder).rotation.x = Math.PI / 2;
    part(nozzle, black, .31, .045, .31, 0, 0, -1.88, cylinder).rotation.x = Math.PI / 2;
    return { turret, nozzle };
  }

  const cabin = kind === 'monster' ? 1.65 : 2.38;
  part(body, glass, p.width * 1.65, .68, cabin, 0, .78, .30);
  part(body, paint, p.width * 1.71, .13, cabin + .09, 0, 1.17, .30);
  for (const side of [-1, 1]) {
    const x = p.width * side * .84;
    for (const z of [.30 - cabin / 2, .32, .30 + cabin / 2]) part(body, paint, .075, .71, .083, x, .80, z);
    part(body, black, .29, .14, .25, side * p.width, .72, -.65);
    part(body, metal, .043, .041, .25, side * p.width * .94, .43, .58);
    part(body, black, .085, .07, cabin, side * p.width * .64, 1.28, .30);
    for (const z of [-p.length, p.length]) part(body, black, .18, .1, p.radius * 2.1, side * p.width, .21, z);
  }
  return null;
}

export function createUtilityVehicle(scene, world, kind) {
  const p = presets[kind];
  const bike = kind === 'bike';
  const body = new THREE.Group();
  const equipment = buildBody(body, kind, p);
  let rider;
  if (bike) {
    const { view, parts } = createPerson(body, 4);
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
  chassis.addShape(new Box(new Vec3(p.width * .8, .29, bike ? .57 : 1.02)), new Vec3(0, .62, .25));
  const rig = new RaycastVehicle({ chassisBody: chassis, indexRightAxis: 0, indexUpAxis: 1, indexForwardAxis: 2 });
  const wheels = [];
  for (const z of [-p.length, p.length]) {
    for (const side of bike ? [0] : [-1, 1]) {
      rig.addWheel({
        radius: p.radius, directionLocal: new Vec3(0, -1, 0), axleLocal: new Vec3(1, 0, 0),
        chassisConnectionPointLocal: new Vec3(side * p.axle, -.10, z),
        suspensionRestLength: p.rest, suspensionStiffness: p.stiffness, maxSuspensionForce: p.mass * 31,
        dampingRelaxation: 3.8, dampingCompression: 5.5, maxSuspensionTravel: p.rest * .77,
        rollInfluence: .06, frictionSlip: bike ? 4.4 : 5.1,
      });
      const wheel = new THREE.Group();
      const width = kind === 'monster' ? .63 : bike ? .20 : .34;
      part(wheel, black, p.radius * 2, width, p.radius * 2, 0, 0, 0, cylinder).rotation.z = Math.PI / 2;
      part(wheel, metal, p.radius * 1.13, width + .03, p.radius * 1.13, 0, 0, 0, cylinder).rotation.z = Math.PI / 2;
      part(wheel, black, p.radius * .46, width + .065, p.radius * .46, 0, 0, 0, cylinder).rotation.z = Math.PI / 2;
      if (kind === 'monster') for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI / 6;
        part(wheel, black, width * .96, .11, .17, 0, Math.cos(angle) * p.radius, Math.sin(angle) * p.radius).rotation.x = angle;
      }
      scene.add(wheel);
      wheels.push(wheel);
    }
  }
  const facing = new Vec3();
  const localOmega = new Vec3();
  const currentUp = new Vec3();
  const correction = new Vec3();
  const wantedUp = new Vec3();
  let active = false;
  let steer = 0;
  let throttle = 0;
  let brake = 0;

  function setActive(value) {
    if (active === value) return;
    active = value;
    if (value) rig.addToWorld(world);
    else rig.removeFromWorld(world);
    body.visible = shadow.visible = value;
    for (const wheel of wheels) wheel.visible = value;
  }

  function setPose(x, y, z, yaw = 0) {
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
    const power = Number(input.forward) - Number(input.reverse);
    const turn = Number(input.left) - Number(input.right);
    steer = THREE.MathUtils.damp(steer, turn * p.steer * (1 - .66 * Math.min(1, Math.abs(speed) / p.max)), 8, dt);
    const braking = input.brake || (power !== 0 && speed * power < -.8);
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

  function render(_dt, _emit, occupied) {
    if (!active) return;
    body.position.copy(chassis.interpolatedPosition);
    body.quaternion.copy(chassis.interpolatedQuaternion);
    if (rider) rider.visible = occupied;
    shadow.position.set(body.position.x, .092, body.position.z);
    shadow.material.opacity = .29 / Math.max(1, 1 + body.position.y - p.stance);
    for (let i = 0; i < wheels.length; i++) {
      rig.updateWheelTransform(i);
      const transform = rig.wheelInfos[i].worldTransform;
      wheels[i].position.copy(transform.position);
      wheels[i].quaternion.copy(transform.quaternion);
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
