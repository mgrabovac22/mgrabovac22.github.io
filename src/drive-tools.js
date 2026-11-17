import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Body, Vec3 } from 'cannon-es';
import { playerCollisionGroup } from './drive-player.js';

export const tools = [
  { id: 'water', color: 0x63d7fa, delay: .115, speed: 36, life: .55, fall: 8, shove: 7, sound: 'splash' },
  { id: 'firework', color: 0xffa468, delay: .72, speed: 25, life: 1.08, fall: -3, radius: 5.6, shove: 12, sound: 'firework' },
  { id: 'bubble', color: 0xad92ff, delay: .3, speed: 14, life: 1.08, fall: -1.4, radius: 1.65, shove: 7, sound: 'bubble' },
  { id: 'confetti', color: 0xffcf72, delay: .4, speed: 27, life: .34, fall: 5, radius: 3.8, shove: 6.8, sound: 'confetti' },
  { id: 'pulse', color: 0x97f8b4, delay: .59, speed: 32, life: .54, fall: 0, radius: 4.7, shove: 11, sound: 'pulse' },
];
export const tankWater = { ...tools[0], delay: .18, speed: 44, life: .64, radius: 2.7, shove: 12 };

const box = new RoundedBoxGeometry(1, 1, 1, 2, .11);
const tube = new THREE.CylinderGeometry(.5, .5, 1, 14);
const sphere = new THREE.SphereGeometry(.5, 12, 9);
const ring = new THREE.TorusGeometry(.5, .039, 6, 28);
const steel = new THREE.MeshStandardMaterial({ color: 0x45616a, roughness: .48, metalness: .58 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x15252d, roughness: .82 });
const light = new THREE.MeshStandardMaterial({ color: 0xa6b0ae, metalness: .50, roughness: .38 });
const colors = [0xff747b, 0xffd378, 0x83f7c2, 0x79cfff, 0xce88ff];

function piece(parent, material, width, height, depth, x, y, z, geometry = box) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(width, height, depth);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function makeTool(tool) {
  const model = new THREE.Group();
  const tint = new THREE.MeshStandardMaterial({
    color: new THREE.Color(tool.color).lerp(new THREE.Color(0x35404a), .43), roughness: .36, metalness: .37,
  });
  const glow = new THREE.MeshStandardMaterial({ color: tool.color, emissive: tool.color, emissiveIntensity: .15, roughness: .36 });
  piece(model, rubber, .118, .193, .141, 0, -.10, .03).rotation.x = -.36;
  piece(model, steel, .19, .19, .41, 0, .051, -.112);
  piece(model, tint, .213, .115, .30, 0, .105, -.032);
  const length = tool.id === 'firework' ? .73 : .48;
  piece(model, steel, .135, length, .135, 0, .08, -.31, tube).rotation.x = Math.PI / 2;
  piece(model, tint, .184, .105, .184, 0, .08, -.30 - length / 2, tube).rotation.x = Math.PI / 2;
  piece(model, rubber, .113, .03, .113, 0, .08, -.36 - length / 2, tube).rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    piece(model, steel, .022, .124, .33, side * .094, .06, -.18);
    for (let i = 0; i < 4; i++) piece(model, glow, .016, .055, .023, side * .106, .094, -.10 - i * .055);
    piece(model, light, .018, .023, .032, side * .108, .106, .076, tube).rotation.z = Math.PI / 2;
  }
  if (tool.id === 'water' || tool.id === 'bubble') {
    for (const side of [-1, 1]) {
      piece(model, tint, .111, .25, .111, side * .125, .10, .132, tube).rotation.x = Math.PI / 2;
      piece(model, light, .105, .039, .105, side * .125, .10, .252, tube).rotation.x = Math.PI / 2;
    }
    if (tool.id === 'bubble') piece(model, glow, .37, .37, .15, 0, .08, -.53, ring);
  } else if (tool.id === 'firework') {
    for (let i = 0; i < 3; i++) piece(model, tint, .27, .048, .27, 0, .08, -.18 - i * .16, tube).rotation.x = Math.PI / 2;
    piece(model, rubber, .08, .12, .18, 0, .249, -.13);
  } else if (tool.id === 'confetti') {
    for (let i = 0; i < 3; i++) piece(model, tint, .11, .28, .11, (i - 1) * .105, .185, -.21, tube).rotation.z = (i - 1) * .28;
  } else {
    for (let i = 0; i < 3; i++) piece(model, glow, .24, .24, .16, 0, .08, -.26 - i * .085, ring);
  }
  return model;
}

export function createShotTrigger() {
  const held = new Set();
  let pending = false;
  return {
    press(id) { held.add(id); pending = true; },
    tap() { pending = true; },
    release(id) { held.delete(id); },
    clear() { held.clear(); pending = false; },
    update(shoot) {
      if ((pending || held.size) && shoot()) pending = false;
    },
  };
}

export function createToolKit(scene, world, city, hand, audio, compact, onSelect) {
  const models = tools.map(makeTool);
  const rocket = new THREE.CapsuleGeometry(.074, .31, 4, 10);
  const jet = new THREE.CapsuleGeometry(.044, .52, 3, 7).translate(0, -.26, 0);
  const projectiles = new Map(tools.map(tool => [tool.id, new THREE.MeshBasicMaterial({
    color: tool.color, transparent: tool.id === 'bubble', opacity: tool.id === 'bubble' ? .64 : 1,
  })]));
  projectiles.set('water', new THREE.MeshStandardMaterial({
    color: 0x7abdd1, emissive: 0x21708d, emissiveIntensity: .36, roughness: .18, metalness: .23,
    transparent: true, opacity: .84, depthWrite: false,
  }));
  const rounds = Array.from({ length: 22 }, () => {
    const shot = new THREE.Mesh(sphere, projectiles.get('water'));
    shot.visible = false;
    scene.add(shot);
    return { shot, velocity: new THREE.Vector3(), age: 0, tool: null, ignore: null };
  });
  const capacity = compact ? 330 : 620;
  const sparks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), capacity);
  const droplets = new THREE.InstancedMesh(new THREE.SphereGeometry(.56, 6, 4), projectiles.get('water'), capacity);
  sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  droplets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  sparks.frustumCulled = droplets.frustumCulled = false;
  sparks.count = droplets.count = 0;
  scene.add(sparks, droplets);
  const particles = Array.from({ length: capacity }, () => ({
    origin: new THREE.Vector3(), velocity: new THREE.Vector3(), ttl: 0, duration: 0, size: 0, angle: 0, color: 0, water: false,
  }));
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const next = new Vec3();
  const previous = new Vec3();
  const impact = new Vec3();
  const shove = new Vec3();
  const spin = new THREE.Vector3(0, 1, 0);
  const rotation = new THREE.Vector3();
  let selected = -1;
  let cursor = 0;
  let delay = 0;

  function select(index) {
    if (index !== -1 && !models[index]) return false;
    selected = index;
    hand.clear();
    if (selected >= 0) hand.add(models[selected]);
    onSelect(selected);
    return true;
  }

  function cycle(direction) {
    const start = selected < 0 && direction < 0 ? 0 : selected;
    select((start + direction + tools.length) % tools.length);
  }

  function emit(point, tone, count, power, life, water = false) {
    for (let i = 0; i < count; i++) {
      const particle = particles[cursor++ % capacity];
      particle.origin.copy(point);
      particle.velocity.set(Math.random() - .5, Math.random() - .29, Math.random() - .5)
        .multiplyScalar(power * (.4 + Math.random() * .6));
      particle.ttl = particle.duration = life * (.65 + Math.random() * .35);
      particle.size = .032 + Math.random() * .090;
      particle.angle = Math.random() * 6.28;
      particle.color = tone ?? colors[i % colors.length];
      particle.water = water;
    }
  }

  function hit(body, direction, amount, ignore) {
    if (!body || body === ignore || !amount) return;
    if (city.hitTarget(body, direction, amount)) return;
    if (body.type !== Body.DYNAMIC || body.collisionFilterGroup === playerCollisionGroup) return;
    const strength = Math.min(body.mass * amount * .43, body.mass * 4);
    shove.set(direction.x * strength, Math.max(.16, direction.y) * strength, direction.z * strength);
    body.wakeUp();
    body.applyImpulse(shove);
  }

  function finish(round, body) {
    const { shot, tool, ignore, velocity } = round;
    shot.visible = false;
    const point = shot.position;
    const fireworks = tool.id === 'firework';
    const confetti = tool.id === 'confetti';
    const water = tool.id === 'water';
    emit(point, fireworks || confetti ? null : tool.color, fireworks ? 100 : confetti ? 64 : water ? (compact ? 19 : 28) : 27,
      fireworks ? 23 : tool.id === 'pulse' ? 14 : 8, fireworks ? 1.22 : water ? .46 : .60, water);
    if (fireworks) audio.play('pop');
    if (tool.id === 'water') audio.play('splash');
    if (tool.radius) {
      for (const candidate of world.bodies) {
        if (candidate === ignore || candidate.position.distanceSquared(point) > tool.radius ** 2) continue;
        const distance = candidate.position.distanceTo(point);
        impact.set(candidate.position.x - point.x, (candidate.position.y - point.y) * .45, candidate.position.z - point.z);
        if (impact.lengthSquared() < .001) impact.copy(velocity);
        impact.normalize();
        const scale = candidate === body ? 1 : 1 - distance / tool.radius;
        hit(candidate, impact, tool.shove * scale, ignore);
      }
    } else if (body) {
      impact.copy(velocity);
      impact.normalize();
      hit(body, impact, tool.shove, ignore);
    }
  }

  function fire(origin, direction, ignore, tank = false) {
    if (delay > 0 || (!tank && selected < 0)) return false;
    const round = rounds.find(entry => !entry.shot.visible);
    if (!round) return false;
    const tool = tank ? tankWater : tools[selected];
    delay = tool.delay;
    round.tool = tool;
    round.ignore = ignore;
    round.age = 0;
    round.shot.position.copy(origin);
    round.shot.material = projectiles.get(tool.id);
    round.shot.geometry = tool.id === 'water' ? jet : tool.id === 'firework' ? rocket : sphere;
    round.shot.visible = true;
    round.velocity.copy(direction).multiplyScalar(tool.speed);
    if (tool.id === 'firework') round.velocity.y += 8.5;
    round.shot.scale.setScalar(tool.id === 'bubble' ? .37 : tool.id === 'water' ? (tank ? 2.1 : 1.35) : tool.id === 'firework' ? 1 : .18);
    round.shot.quaternion.setFromUnitVectors(spin, rotation.copy(round.velocity).normalize());
    audio.play(tool.sound);
    emit(origin, tool.id === 'confetti' ? null : tool.color, 7, 4, .3, tool.id === 'water');
    return true;
  }

  function update(dt) {
    delay = Math.max(0, delay - dt);
    for (const round of rounds) {
      if (!round.shot.visible) continue;
      const { shot, velocity, tool, ignore } = round;
      const point = shot.position;
      const age = round.age;
      round.age += dt;
      velocity.y -= tool.fall * dt;
      shot.quaternion.setFromUnitVectors(spin, rotation.copy(velocity).normalize());
      if (tool.id === 'water') {
        const length = Math.min(round.age * tool.speed, tool.delay * tool.speed * .89);
        const width = tool === tankWater ? 1.22 : .75;
        shot.scale.set(width, Math.max(.25, length / .61), width);
      }
      previous.copy(point);
      point.addScaledVector(velocity, dt);
      next.copy(point);
      let body = null;
      let distance = Infinity;
      world.raycastAll(previous, next, { skipBackfaces: true, checkCollisionResponse: false }, hit => {
        if (hit.body === ignore || hit.body.collisionFilterGroup === playerCollisionGroup || hit.distance >= distance) return;
        distance = hit.distance;
        body = hit.body;
        point.copy(hit.hitPointWorld);
      });
      if (body || round.age >= tool.life || point.y < .11) finish(round, body);
      else if (Math.floor(age * 38) !== Math.floor(round.age * 38)) {
        emit(point, tool.color, 2, 2.5, .23, tool.id === 'water');
      }
    }
    let count = 0;
    let waterCount = 0;
    for (const particle of particles) {
      if (particle.ttl <= 0) continue;
      particle.ttl -= dt;
      particle.velocity.y -= dt * 9;
      particle.origin.addScaledVector(particle.velocity, dt);
      dummy.position.copy(particle.origin);
      const size = particle.size * Math.max(.1, particle.ttl / particle.duration);
      if (particle.water) {
        dummy.scale.set(size * .66, size * 1.9, size * .66);
        dummy.quaternion.setFromUnitVectors(spin, rotation.copy(particle.velocity).normalize());
        dummy.updateMatrix();
        droplets.setMatrixAt(waterCount++, dummy.matrix);
        continue;
      }
      dummy.scale.setScalar(size);
      dummy.quaternion.setFromAxisAngle(spin, particle.angle + particle.ttl * 9);
      dummy.updateMatrix();
      sparks.setMatrixAt(count, dummy.matrix);
      sparks.setColorAt(count++, tint.setHex(particle.color));
    }
    sparks.count = count;
    droplets.count = waterCount;
    if (waterCount) {
      droplets.instanceMatrix.clearUpdateRanges();
      droplets.instanceMatrix.addUpdateRange(0, waterCount * 16);
      droplets.instanceMatrix.needsUpdate = true;
    }
    if (count) {
      sparks.instanceMatrix.needsUpdate = true;
      sparks.instanceColor.needsUpdate = true;
    }
  }

  return { fire, update, select, cycle };
}
