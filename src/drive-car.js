import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Body, Box, RaycastVehicle, Vec3 } from 'cannon-es';

const material = (color, metalness = 0, roughness = .55) => new THREE.MeshStandardMaterial({ color, metalness, roughness });

function sculptedShell(sections, surface) {
  const vertices = [];
  const indices = [];
  for (const [z, bottom, top, lowerWidth, upperWidth] of sections) {
    vertices.push(-lowerWidth, bottom, z, lowerWidth, bottom, z, upperWidth, top, z, -upperWidth, top, z);
  }
  for (let row = 0; row < sections.length - 1; row++) {
    for (let face = 0; face < 4; face++) {
      const a = row * 4 + face;
      const b = row * 4 + (face + 1) % 4;
      indices.push(a, b, b + 4, a, b + 4, a + 4);
    }
  }
  const end = vertices.length / 3 - 4;
  indices.push(0, 2, 1, 0, 3, 2, end, end + 1, end + 2, end, end + 2, end + 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  const flat = geometry.toNonIndexed();
  geometry.dispose();
  flat.computeVertexNormals();
  return new THREE.Mesh(flat, surface);
}

export function createCar(scene, world) {
  const shell = material(0xadb9c6, .55, .29);
  const edge = material(0xe4eef6, .44, .26);
  const rubber = material(0x161e24, .02, .93);
  const trim = material(0x212c37, .27, .43);
  const glass = material(0x293f50, .59, .18);
  const rim = material(0x788c9c, .68, .35);
  const brakeDisc = material(0xd6aa67, .42, .38);
  const exhaust = material(0x93a3ae, .72, .27);
  const light = new THREE.MeshBasicMaterial({ color: 0xd5f8ff });
  const tail = new THREE.MeshBasicMaterial({ color: 0xff566c });
  const body = new THREE.Group();
  function part(surface, w, h, d, x, y, z, round = .025, parent = body) {
    const geometry = round ? new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d, round) / 2) : new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  body.add(sculptedShell([
    [-2.22, -.27, -.05, .77, .84], [-1.87, -.31, .17, .99, 1.01], [-.75, -.33, .22, 1.02, .91],
    [.75, -.34, .24, 1.02, .94], [1.63, -.31, .22, 1.04, 1.03], [2.14, -.21, .07, .87, .98],
  ], shell));
  body.add(sculptedShell([
    [-.91, .14, .21, .84, .73], [-.30, .16, .68, .84, .66],
    [.45, .17, .67, .86, .67], [1.32, .19, .28, .88, .82],
  ], glass));
  part(shell, 1.32, .07, .87, 0, .687, .08, .06);
  part(edge, .48, .018, .70, 0, .728, .09, .01);
  part(trim, 1.77, .13, .35, 0, -.27, 2.05);
  part(trim, 1.69, .12, .25, 0, -.27, -2.13);
  part(edge, 1.93, .08, .35, 0, .29, 1.94);
  part(tail, 1.49, .035, .05, 0, .04, 2.153);
  part(trim, .42, .125, .023, 0, -.12, 2.232, 0);
  part(edge, .24, .062, .025, 0, -.113, 2.249, 0);
  for (const side of [-1, 1]) {
    part(light, .61, .049, .045, side * .53, -.077, -2.227).rotation.y = side * .15;
    part(tail, .061, .067, .38, side * .949, .04, 1.96);
    part(trim, .43, .13, .041, side * .48, -.19, -2.229);
    part(trim, .56, .127, .045, side * .62, -.164, 2.197);
    for (let i = 0; i < 2; i++) {
      const x = side * (.46 + i * .17);
      const pipe = new THREE.Mesh(new THREE.TorusGeometry(.069, .018, 7, 14), exhaust);
      pipe.position.set(x, -.168, 2.226);
      body.add(pipe);
    }
    part(trim, .10, .135, 1.55, side * .995, -.24, .08);
    part(trim, .045, .115, .43, side * .986, -.025, .83).rotation.x = -.15;
    part(edge, .025, .027, .85, side * .965, .075, -.21).rotation.y = side * .035;
    part(edge, .29, .10, .19, side * .952, .31, -.51);
    part(trim, .035, .10, .39, side * .701, .51, .26).rotation.x = .31;
    part(shell, .09, .16, .11, side * .67, .18, 1.91);
    for (let fin = 0; fin < 3; fin++) part(trim, .035, .10, .205, side * (.35 + .17 * fin), -.295, 2.117);
  }
  for (let i = 0; i < 4; i++) {
    part(trim, 1.27 + i * .07, .024, .055, 0, .642 - i * .069, .52 + i * .153, 0).rotation.x = .43;
  }
  scene.add(body);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 30), new THREE.MeshBasicMaterial({
    color: 0x0a1419, opacity: .33, transparent: true, depthWrite: false,
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(1.37, 2.5, 1);
  scene.add(shadow);

  const chassis = new Body({ mass: 1020, linearDamping: .09, angularDamping: .42 });
  chassis.addShape(new Box(new Vec3(1, .34, 2.05)), new Vec3(0, -.045, 0));
  chassis.addShape(new Box(new Vec3(.68, .235, .68)), new Vec3(0, .39, .15));
  const vehicle = new RaycastVehicle({ chassisBody: chassis, indexRightAxis: 0, indexUpAxis: 1, indexForwardAxis: 2 });
  const wheels = [];
  for (const z of [-1.36, 1.35]) {
    for (const side of [-1, 1]) {
      vehicle.addWheel({
        radius: .39, directionLocal: new Vec3(0, -1, 0), axleLocal: new Vec3(1, 0, 0),
        chassisConnectionPointLocal: new Vec3(side * .94, -.09, z),
        suspensionRestLength: .33, suspensionStiffness: 48, maxSuspensionForce: 30000,
        dampingRelaxation: 3.5, dampingCompression: 5.2, maxSuspensionTravel: .22,
        rollInfluence: .04, frictionSlip: 4.1, customSlidingRotationalSpeed: -24, useCustomSlidingRotationalSpeed: true,
      });
      const wheel = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(.396, .396, .30, 20), rubber);
      tire.rotation.z = Math.PI / 2;
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
        part(rim, .032, .177, .05, side * .175, .172, 0, .009, branch);
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
  return { chassis, drive, render, setPose };
}

export function flatYaw(body) {
  const axis = body.quaternion.vmult(new Vec3(0, 0, -1));
  return Math.atan2(-axis.x, -axis.z);
}

export function isTipped(body) {
  const up = body.quaternion.vmult(new Vec3(0, 1, 0));
  return up.y < .48;
}

export function launcherImpulse(body, x, z, impact) {
  const direction = new Vec3(impact.x, 0, impact.z);
  const speed = direction.normalize();
  const side = direction.x * (body.position.z - z) - direction.z * (body.position.x - x);
  const carry = 2.2 + speed * .67;
  body.velocity.set(direction.x * carry, Math.max(0, body.velocity.y * .23), direction.z * carry);
  body.applyImpulse(new Vec3(0, 10700, 0));
  body.quaternion.vmult(new Vec3(.28, .07, side >= 0 ? 2.74 : -2.74), body.angularVelocity);
}
