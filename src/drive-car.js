import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Body, Box, RaycastVehicle, Vec3 } from 'cannon-es';
import { createBodywork } from './drive-body.js';

const material = (color, metalness = 0, roughness = .55) => new THREE.MeshStandardMaterial({ color, metalness, roughness });

export function createCar(scene, world) {
  const { body, tail } = createBodywork();
  const rubber = material(0x131a20, .02, .82);
  const trim = material(0x212c37, .27, .43);
  const rim = material(0x788c9c, .68, .35);
  const brakeDisc = material(0xd6aa67, .42, .38);
  body.traverse(mesh => { if (mesh.isMesh) mesh.castShadow = true; });
  scene.add(body);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 30), new THREE.MeshBasicMaterial({
    color: 0x0a1419, opacity: .33, transparent: true, depthWrite: false,
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.37, 2.5, 1);
  scene.add(shadow);

  const chassis = new Body({ mass: 1020, linearDamping: .09, angularDamping: .46, collisionFilterGroup: 4 });
  chassis.addShape(new Box(new Vec3(1, .34, 2.05)), new Vec3(0, -.045, 0));
  chassis.addShape(new Box(new Vec3(.68, .235, .68)), new Vec3(0, .39, .15));
  const vehicle = new RaycastVehicle({ chassisBody: chassis, indexRightAxis: 0, indexUpAxis: 1, indexForwardAxis: 2 });
  const wheels = [];
  for (const z of [-1.36, 1.35]) {
    for (const side of [-1, 1]) {
      vehicle.addWheel({
        radius: .39, directionLocal: new Vec3(0, -1, 0), axleLocal: new Vec3(1, 0, 0),
        chassisConnectionPointLocal: new Vec3(side * .94, -.09, z),
        suspensionRestLength: .34, suspensionStiffness: 41, maxSuspensionForce: 30000,
        dampingRelaxation: 3.5, dampingCompression: 5.2, maxSuspensionTravel: .26,
        rollInfluence: .04, frictionSlip: 4.1, customSlidingRotationalSpeed: -24, useCustomSlidingRotationalSpeed: true,
      });
      const wheel = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.LatheGeometry([
        new THREE.Vector2(.25, -.17), new THREE.Vector2(.365, -.17), new THREE.Vector2(.392, -.13),
        new THREE.Vector2(.399, -.08), new THREE.Vector2(.399, .08), new THREE.Vector2(.392, .13),
        new THREE.Vector2(.365, .17), new THREE.Vector2(.25, .17),
      ], 36), rubber);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheel.add(tire);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.274, .274, .035, 16), trim);
      hub.rotation.z = Math.PI / 2;
      hub.position.x = side * .151;
      wheel.add(hub);
      const center = new THREE.Mesh(new THREE.CylinderGeometry(.082, .082, .05, 12), brakeDisc);
      center.rotation.z = Math.PI / 2;
      center.position.x = side * .177;
      wheel.add(center);
      for (let spoke = 0; spoke < 7; spoke++) {
        const branch = new THREE.Group();
        branch.rotation.x = spoke * Math.PI * 2 / 7;
        const arm = new THREE.Mesh(new RoundedBoxGeometry(.031, .178, .046, 2, .011), rim);
        arm.position.set(side * .178, .164, .014);
        arm.rotation.x = -.11;
        branch.add(arm);
        wheel.add(branch);
      }
      wheels.push(wheel);
      scene.add(wheel);
    }
  }
  vehicle.addToWorld(world);
  const forward = new Vec3();
  let steering = 0;
  function setPose(x, y, z, yaw = 0) {
    chassis.position.set(x, y, z);
    chassis.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), yaw);
    chassis.velocity.setZero();
    chassis.angularVelocity.setZero();
    chassis.force.setZero();
    chassis.torque.setZero();
    chassis.aabbNeedsUpdate = true;
    chassis.wakeUp();
    steering = 0;
  }
  function drive(input, dt) {
    chassis.quaternion.vmult(new Vec3(0, 0, -1), forward);
    const speed = chassis.velocity.dot(forward);
    const power = Number(input.forward) - Number(input.reverse);
    const turn = Number(input.left) - Number(input.right);
    const target = turn * THREE.MathUtils.lerp(.50, .16, Math.min(Math.abs(speed) / 35, 1));
    steering = THREE.MathUtils.damp(steering, target, 9, dt);
    vehicle.setSteeringValue(steering, 0);
    vehicle.setSteeringValue(steering, 1);
    const stopping = input.brake || (power > 0 && speed < -2) || (power < 0 && speed > 2);
    const limit = power < 0 ? 12 : 41;
    const force = stopping ? 0 : power * 6400 * Math.max(0, 1 - Math.abs(speed) / limit);
    for (let i = 0; i < 4; i++) {
      vehicle.applyEngineForce(force * (i < 2 ? .18 : .32), i);
      vehicle.setBrake(stopping ? 61 : power ? 0 : 1.3, i);
    }
    tail.color.setHex(stopping ? 0xffa0a6 : 0xff566c);
  }
  function render() {
    body.position.copy(chassis.position);
    body.quaternion.copy(chassis.quaternion);
    for (let i = 0; i < wheels.length; i++) {
      vehicle.updateWheelTransform(i);
      wheels[i].position.copy(vehicle.wheelInfos[i].worldTransform.position);
      wheels[i].quaternion.copy(vehicle.wheelInfos[i].worldTransform.quaternion);
    }
    shadow.position.set(chassis.position.x, .038, chassis.position.z);
    shadow.material.opacity = .32 / Math.max(1, chassis.position.y * 1.3);
  }
  return { chassis, drive, render, setPose, get grounded() { return vehicle.numWheelsOnGround >= 2; } };
}

export function flatYaw(body) {
  const axis = body.quaternion.vmult(new Vec3(0, 0, -1));
  return Math.atan2(-axis.x, -axis.z);
}

export function isTipped(body) {
  const up = body.quaternion.vmult(new Vec3(0, 1, 0));
  return up.y < .48;
}

export function launcherImpulse(body, x, z, impact, variation) {
  const direction = new Vec3(impact.x, 0, impact.z);
  const speed = direction.normalize();
  const offset = direction.x * (body.position.z - z) - direction.z * (body.position.x - x);
  const bank = Math.abs(offset) > .27 ? Math.sign(offset) : Math.sign(variation);
  const drift = bank * (1.25 + Math.abs(variation) * 1.8);
  const carry = Math.min(12, 1.8 + speed * .68);
  body.velocity.set(direction.x * carry - direction.z * drift, 0, direction.z * carry + direction.x * drift);
  body.applyImpulse(new Vec3(0, 6900 + Math.abs(variation) * 2700, 0));
  body.quaternion.vmult(new Vec3(variation * 1.6, variation * .82, bank * (1.8 + Math.abs(variation) * 3.7)), body.angularVelocity);
}
