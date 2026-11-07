import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Body, Box, RaycastVehicle, Vec3 } from 'cannon-es';
import { createBodywork } from './drive-body.js';

const material = (color, metalness = 0, roughness = .55) => new THREE.MeshStandardMaterial({ color, metalness, roughness });

function createExhaust(scene) {
  const size = 32;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const radius = Math.hypot((x + .5) / size - .5, (y + .5) / size - .5) * 2;
      pixels.set([255, 255, 255, Math.round(255 * Math.max(0, 1 - radius) ** 1.68)], index);
    }
  }
  const map = new THREE.DataTexture(pixels, size, size);
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearFilter;
  map.needsUpdate = true;
  const pool = Array.from({ length: 36 }, () => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false }));
    sprite.visible = false;
    scene.add(sprite);
    return { sprite, velocity: new THREE.Vector3(), age: 0, duration: 0, intensity: 0 };
  });
  const pipes = [-.77, -.60, .60, .77];
  let accumulator = 0;
  let outlet = 0;
  function clear() {
    accumulator = 0;
    for (const { sprite } of pool) sprite.visible = false;
  }
  function update(dt, body, throttle, speed, enabled) {
    if (!enabled) {
      clear();
      return;
    }
    for (const particle of pool) {
      const { sprite, velocity, duration, intensity } = particle;
      if (!sprite.visible) continue;
      particle.age += dt;
      const life = particle.age / duration;
      if (life >= 1) {
        sprite.visible = false;
        continue;
      }
      sprite.position.addScaledVector(velocity, dt);
      sprite.position.y += dt * (.27 + life * .45);
      sprite.scale.setScalar(.23 + life * (.83 + intensity * .36));
      sprite.material.opacity = (1 - life) * (.42 + intensity * .43);
    }
    accumulator += dt * (9 + throttle * 31);
    while (accumulator >= 1) {
      accumulator--;
      const particle = pool.find(item => !item.sprite.visible);
      if (!particle) break;
      const { sprite, velocity } = particle;
      sprite.position.set(pipes[outlet++ % pipes.length], -.184, 2.30).applyQuaternion(body.quaternion).add(body.position);
      const hot = throttle > .72 && outlet % 9 === 0;
      sprite.scale.setScalar(.23);
      sprite.material.color.setHex(hot ? 0xeeb978 : 0xcbd6d7);
      sprite.material.opacity = .42 + throttle * .43;
      sprite.visible = true;
      velocity.set((Math.random() - .5) * .33, .09, .7 + throttle * 1.4 - Math.abs(speed) * .028).applyQuaternion(body.quaternion);
      particle.age = 0;
      particle.duration = hot ? .19 : .64 + Math.random() * .29;
      particle.intensity = throttle;
    }
  }
  return { update, clear };
}

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
  chassis.addShape(new Box(new Vec3(.97, .283, 1.55)), new Vec3(0, -.04, .02));
  chassis.addShape(new Box(new Vec3(.79, .215, .39)), new Vec3(0, -.07, -1.91));
  chassis.addShape(new Box(new Vec3(.92, .233, .37)), new Vec3(0, -.045, 1.86));
  chassis.addShape(new Box(new Vec3(.627, .260, .72)), new Vec3(0, .438, -.06));
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
  const inverse = new THREE.Quaternion();
  const wheelRotation = new THREE.Quaternion();
  const exhaust = createExhaust(scene);
  let steering = 0;
  let throttle = 0;
  let braking = 0;
  let speed = 0;
  let righting = null;
  function setPose(x, y, z, yaw = 0, easeRecovery = false) {
    righting = easeRecovery ? { position: body.position.clone(), rotation: body.quaternion.clone(), elapsed: 0 } : null;
    chassis.position.set(x, y, z);
    chassis.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), yaw);
    chassis.velocity.setZero();
    chassis.angularVelocity.setZero();
    chassis.force.setZero();
    chassis.torque.setZero();
    chassis.previousPosition.copy(chassis.position);
    chassis.interpolatedPosition.copy(chassis.position);
    chassis.previousQuaternion.copy(chassis.quaternion);
    chassis.interpolatedQuaternion.copy(chassis.quaternion);
    chassis.updateInertiaWorld(true);
    chassis.aabbNeedsUpdate = true;
    chassis.wakeUp();
    steering = 0;
    throttle = 0;
    braking = 0;
    speed = 0;
    exhaust.clear();
  }
  function drive(input, dt) {
    chassis.quaternion.vmult(new Vec3(0, 0, -1), forward);
    speed = chassis.velocity.dot(forward);
    const power = righting ? 0 : Number(input.forward) - Number(input.reverse);
    const turn = righting ? 0 : Number(input.left) - Number(input.right);
    const target = turn * THREE.MathUtils.lerp(.50, .16, Math.min(Math.abs(speed) / 35, 1));
    steering = THREE.MathUtils.damp(steering, target, 7.5, dt);
    vehicle.setSteeringValue(steering, 0);
    vehicle.setSteeringValue(steering, 1);
    const stopping = Boolean(righting) || input.brake || (power > 0 && speed < -.8) || (power < 0 && speed > .8);
    braking = THREE.MathUtils.damp(braking, Number(stopping), stopping ? 21 : 13, dt);
    throttle = THREE.MathUtils.damp(throttle, stopping ? 0 : power, 9, dt);
    const limit = throttle < 0 ? 12 : 41;
    const force = stopping ? 0 : throttle * (1 - braking) * 6400 * Math.max(0, 1 - Math.abs(speed) / limit);
    const brakeImpulse = Math.min(102 * braking, 1 + chassis.mass * Math.abs(speed) * .22);
    const rolling = Math.abs(throttle) < .04 ? 1.3 : 0;
    for (let i = 0; i < 4; i++) {
      vehicle.applyEngineForce(force * (i < 2 ? .18 : .32), i);
      vehicle.setBrake(rolling + brakeImpulse * (i < 2 ? 1.06 : .94), i);
    }
    tail.color.setHex(stopping ? 0xffa0a6 : 0xff566c);
  }
  function render(dt = 0, emit = false) {
    body.position.copy(chassis.interpolatedPosition);
    body.quaternion.copy(chassis.interpolatedQuaternion);
    if (righting) {
      righting.elapsed = Math.min(1, righting.elapsed + dt / .72);
      const progress = THREE.MathUtils.smoothstep(righting.elapsed, 0, 1);
      body.position.lerp(righting.position, 1 - progress);
      body.position.y += Math.sin(progress * Math.PI) * .58;
      body.quaternion.slerp(righting.rotation, 1 - progress);
      if (righting.elapsed >= 1) righting = null;
    }
    inverse.copy(chassis.quaternion).invert();
    for (let i = 0; i < wheels.length; i++) {
      vehicle.updateWheelTransform(i);
      const pose = vehicle.wheelInfos[i].worldTransform;
      wheels[i].position.copy(pose.position).sub(chassis.position).applyQuaternion(inverse)
        .applyQuaternion(body.quaternion).add(body.position);
      wheelRotation.copy(pose.quaternion).premultiply(inverse);
      wheels[i].quaternion.multiplyQuaternions(body.quaternion, wheelRotation);
    }
    shadow.position.set(body.position.x, .038, body.position.z);
    shadow.material.opacity = .32 / Math.max(1, body.position.y * 1.3);
    exhaust.update(dt, body, Math.abs(throttle), speed, emit);
  }
  return { chassis, drive, render, setPose, viewPosition: body.position, get grounded() { return vehicle.numWheelsOnGround >= 2; } };
}

export function flatYaw(body) {
  const axis = body.quaternion.vmult(new Vec3(0, 0, -1));
  return Math.atan2(-axis.x, -axis.z);
}

export function isTipped(body) {
  const up = body.quaternion.vmult(new Vec3(0, 1, 0));
  return up.y < .48;
}

export function launcherImpulse(body, x, z, impact, localHit, localCrate) {
  // The crate center distributes the blast across the contact face, even when
  // the solver reports one corner first. The contact height comes from the hit.
  const application = new Vec3(
    THREE.MathUtils.clamp(localCrate.x, -.97, .97),
    THREE.MathUtils.clamp(localHit.y, -.323, .67),
    THREE.MathUtils.clamp(localCrate.z, -2.30, 2.23),
  );
  const lever = body.vectorToWorldFrame(application);
  const hit = body.position.vadd(lever);
  const impulse = new Vec3(hit.x - x, 0, hit.z - z);
  const spread = Math.min(1, impulse.normalize() * 2.4);
  const impactSpeed = Math.hypot(impact.x, impact.z);
  impulse.scale(body.mass * spread * (1.15 + Math.min(25, impactSpeed) * .066), impulse);
  impulse.y = body.mass * (7.65 + Math.min(25, impactSpeed) * .079);
  body.wakeUp();
  body.applyImpulse(impulse, lever.scale(.39));
}
