import * as THREE from 'three';
import { Body, Box, Cylinder, Quaternion, RaycastResult, Vec3, World } from 'cannon-es';
import { waterline } from './drive-rally-terrain.js';

const propGroup = 8;
const surroundings = 1 | 4 | propGroup;
const box = new THREE.BoxGeometry();
const droplet = new THREE.IcosahedronGeometry(.5, 0);
const propAxis = new Vec3(0, 1, 0);

export class RallyPhysicsWorld extends World {
  rayTest(from, to, result) {
    if (!(result instanceof RaycastResult)) return super.rayTest(from, to, result);
    // The buggy's suspension rides the track while its chassis handles loose scenery impacts.
    return this.raycastClosest(from, to, { collisionFilterMask: ~propGroup, skipBackfaces: true }, result);
  }
}

const tints = {
  water: new THREE.Color(0x60d3d9), juice: new THREE.Color(0xeeb259),
  dust: new THREE.Color(0xd9ba83), leaves: new THREE.Color(0x598347),
  timber: new THREE.Color(0xaf7e4d), foam: new THREE.Color(0xd6f0df),
  fruit: new THREE.Color(0xf0aa42), seeds: new THREE.Color(0x729242), sparks: new THREE.Color(0xffdc86),
};

function createSpills(parent, terrain, random) {
  const capacity = 180;
  const points = new THREE.InstancedMesh(droplet, new THREE.MeshStandardMaterial({ roughness: .54 }), capacity);
  points.count = 0;
  points.frustumCulled = false;
  parent.add(points);
  const position = new THREE.Object3D();
  const spray = [];
  const puddleGeometry = new THREE.CircleGeometry(1, 29).rotateX(-Math.PI / 2);
  const puddles = Array.from({ length: 10 }, () => {
    const mesh = new THREE.Mesh(puddleGeometry, new THREE.MeshStandardMaterial({
      transparent: true, opacity: .0, metalness: .4, roughness: .17,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1,
    }));
    mesh.visible = false;
    parent.add(mesh);
    return { mesh, life: 0 };
  });

  function burst(effect, center, direction, strength) {
    const liquid = effect === 'water' || effect === 'juice';
    const color = tints[effect];
    if (!color) return;
    if (liquid) {
      const puddle = puddles.reduce((oldest, entry) => entry.life < oldest.life ? entry : oldest);
      const x = center.x + direction.x * .52, z = center.z + direction.z * .52;
      const y = terrain.height(x, z);
      puddle.mesh.position.set(x, Math.max(y, waterline) + .023, z);
      puddle.mesh.material.color.copy(color).multiplyScalar(.60);
      puddle.mesh.material.opacity = .61;
      puddle.mesh.visible = true;
      puddle.life = 4.1;
    }
    const count = liquid ? 26 : effect === 'timber' ? 13 : 11;
    for (let i = 0; i < count && spray.length < capacity; i++) {
      const phase = random() * Math.PI * 2;
      const speed = (.55 + random() * 2.1) * strength;
      const life = (liquid ? .47 : .53) + random() * .58;
      spray.push({
        x: center.x, y: center.y, z: center.z, color: effect === 'fruit' && i % 2 ? tints.seeds : color, life, duration: life,
        liquid, rounded: effect === 'fruit' || effect === 'sparks',
        vx: direction.x * 1.6 + Math.cos(phase) * speed,
        vy: .75 + random() * (liquid ? 3.6 : 2.25),
        vz: direction.z * 1.6 + Math.sin(phase) * speed,
        size: liquid ? .06 + random() * .117 : .08 + random() * .169, phase,
      });
    }
  }

  function update(dt) {
    for (let i = spray.length - 1; i >= 0; i--) {
      const p = spray[i];
      p.life -= dt;
      p.vy -= dt * (p.liquid ? 10.4 : 6.6);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.life <= 0 || p.y < Math.max(terrain.height(p.x, p.z), waterline)) spray.splice(i, 1);
    }
    points.count = spray.length;
    points.visible = spray.length > 0;
    for (const [index, p] of spray.entries()) {
      position.position.set(p.x, p.y, p.z);
      position.rotation.set(p.phase + p.life * 9, p.phase, p.life * 6);
      const radius = p.size * Math.sqrt(p.life / p.duration);
      position.scale.set(radius, radius * (p.rounded ? 1 : p.liquid ? 1.57 : .6), radius);
      position.updateMatrix();
      points.setColorAt(index, p.color);
      points.setMatrixAt(index, position.matrix);
    }
    if (spray.length) {
      points.instanceMatrix.needsUpdate = true;
      points.instanceColor.needsUpdate = true;
    }
    for (const puddle of puddles) {
      const { mesh } = puddle;
      if (!mesh.visible) continue;
      puddle.life -= dt;
      mesh.visible = puddle.life > 0;
      mesh.material.opacity = .56 * Math.min(1, puddle.life / 1.3);
      const radius = .25 + .99 * THREE.MathUtils.smoothstep(4.1 - puddle.life, 0, 1.1);
      mesh.scale.set(radius * 1.23, 1, radius);
    }
  }

  return { burst, update, reset() {
    spray.length = points.count = 0;
    for (const puddle of puddles) {
      puddle.life = 0;
      puddle.mesh.visible = false;
    }
  } };
}

export function createRallyProps(parent, world, terrain, random) {
  const batches = new Map();
  const props = [];
  const nearby = new Set();
  const hits = new Map();
  const arrivals = new Map();
  const effects = createSpills(parent, terrain, random);
  const dummy = new THREE.Object3D();
  const transform = new THREE.Matrix4(), render = new THREE.Matrix4();
  const size = new THREE.Vector3(1, 1, 1);
  const rotation = new THREE.Quaternion(), baseRotation = new THREE.Quaternion();
  const point = new THREE.Vector3();
  let nextSync = 0, now = 0;

  function place(spec, draw) {
    const { x, y, z, yaw, bounds: [w, h, d], kind = 'box' } = spec;
    const center = new Vec3(x, y, z);
    const orientation = new Quaternion().setFromAxisAngle(propAxis, yaw);
    const shape = kind === 'barrel' ? new Cylinder(w, w, h * 2, 10) : new Box(new Vec3(w, h, d));
    const base = new THREE.Matrix4().compose(point.copy(center), rotation.copy(orientation), size);
    const inverse = base.clone().invert();
    const body = new Body({ mass: spec.mass, collisionFilterGroup: propGroup, collisionFilterMask: surroundings, shape,
      position: center, quaternion: orientation, linearDamping: .21, angularDamping: .33, sleepSpeedLimit: .25, sleepTimeLimit: .6 });
    const parts = [];
    draw((surface, px, py, pz, sx, sy, sz, turn = 0, geometry = box) => {
      const key = surface.id + ':' + geometry.id;
      if (!batches.has(key)) batches.set(key, { surface, geometry, poses: [] });
      const batch = batches.get(key);
      dummy.position.set(px, py, pz);
      dummy.scale.set(sx, sy, sz);
      dummy.rotation.set(0, turn, 0);
      dummy.updateMatrix();
      batch.poses.push(dummy.matrix.clone());
      parts.push({ batch, index: batch.poses.length - 1, relative: dummy.matrix.clone().premultiply(inverse) });
    });
    const prop = { body, center, orientation, parts, spec, knocked: false, lastArrival: -Infinity };
    body.addEventListener('collide', ({ body: driver }) => {
      const speed = Math.hypot(driver.velocity.x, driver.velocity.z);
      const hitByCar = driver.collisionFilterGroup === 4;
      if (hitByCar && spec.onImpact && speed > .53 && now - prop.lastArrival > 1.6) arrivals.set(prop, driver);
      if (!prop.knocked && (hitByCar ? speed > .53 : driver.collisionFilterGroup === propGroup && speed > 2.15)) {
        hits.set(prop, { speed, vx: driver.velocity.x, vz: driver.velocity.z });
      }
    });
    props.push(prop);
  }

  function commit() {
    for (const batch of batches.values()) {
      const { poses, surface, geometry } = batch;
      const mesh = new THREE.InstancedMesh(geometry, surface, poses.length);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      poses.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.computeBoundingSphere();
      if (mesh.boundingSphere) mesh.boundingSphere.radius += 27;
      mesh.receiveShadow = true;
      parent.add(mesh);
      batch.mesh = mesh;
      batch.poses = null;
    }
  }

  function drawProp(prop, motion = true) {
    point.copy(prop.body.position);
    baseRotation.copy(prop.body.quaternion);
    if (prop.spec.floats && !prop.knocked && motion) point.y += Math.sin(now * 1.34 + prop.center.x) * .069;
    transform.compose(point, baseRotation, size);
    for (const { batch, index, relative } of prop.parts) {
      if (!batch.mesh) continue;
      batch.mesh.setMatrixAt(index, render.multiplyMatrices(transform, relative));
      batch.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  function sync(position, force = false) {
    if (!force && now < nextSync) return;
    nextSync = now + .19;
    for (const prop of props) {
      const distance = Math.hypot(position.x - prop.body.position.x, position.z - prop.body.position.z);
      if (distance < 72 && !nearby.has(prop)) {
        world.addBody(prop.body);
        if (!prop.knocked) prop.body.sleep();
        nearby.add(prop);
      } else if (distance > 88 && nearby.delete(prop)) {
        world.removeBody(prop.body);
      }
    }
  }

  function update(dt, motion) {
    now += dt;
    for (const [prop, { speed, vx, vz }] of hits) {
      const { body, spec } = prop;
      prop.knocked = true;
      const direction = new Vec3(vx / speed, 0, vz / speed);
      const strength = Math.min(2.35, .65 + speed * .067);
      body.wakeUp();
      const movement = spec.floats ? strength * 1.65 : strength;
      body.velocity.x += direction.x * movement;
      body.velocity.z += direction.z * movement;
      if (spec.drift) {
        body.velocity.x += spec.drift[0] * strength * .78;
        body.velocity.z += spec.drift[1] * strength * .78;
      }
      body.velocity.y += strength * (spec.kind === 'barrel' ? .52 : .28);
      const torque = spec.tip ?? 1;
      body.angularVelocity.x += direction.z * strength * torque;
      body.angularVelocity.z -= direction.x * strength * torque;
      if (motion) effects.burst(spec.effect, new Vec3(body.position.x, body.position.y + .18, body.position.z), direction, strength);
    }
    hits.clear();
    for (const [prop, driver] of arrivals) {
      prop.lastArrival = now;
      prop.spec.onImpact(driver);
    }
    arrivals.clear();
    for (const prop of nearby) {
      if (!prop.knocked && !prop.spec.floats) continue;
      const { body, spec } = prop;
      if (spec.floats && prop.knocked) {
        const level = spec.y + Math.sin(now * 1.28 + prop.center.x) * .08;
        body.velocity.y += ((level - body.position.y) * 19 - body.velocity.y * 6) * dt;
        body.angularVelocity.scale(1 / (1 + 3.2 * dt), body.angularVelocity);
      }
      drawProp(prop, motion);
    }
    effects.update(dt);
  }

  function reset(position) {
    hits.clear();
    arrivals.clear();
    effects.reset();
    for (const prop of props) {
      const { body, center, orientation } = prop;
      if (nearby.delete(prop)) world.removeBody(body);
      body.position.copy(center);
      body.previousPosition.copy(center);
      body.interpolatedPosition.copy(center);
      body.quaternion.copy(orientation);
      body.previousQuaternion.copy(orientation);
      body.interpolatedQuaternion.copy(orientation);
      body.velocity.setZero();
      body.angularVelocity.setZero();
      body.force.setZero();
      body.torque.setZero();
      body.aabbNeedsUpdate = true;
      prop.knocked = false;
      prop.lastArrival = -Infinity;
      drawProp(prop, false);
    }
    sync(position, true);
  }

  return { place, commit, sync, update, reset };
}
