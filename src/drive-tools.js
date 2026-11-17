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
const light = new THREE.MeshBasicMaterial({ color: 0xe3faf5 });
const deck = new THREE.MeshStandardMaterial({ color: 0x324a52, roughness: .66 });
const colors = [0xff747b, 0xffd378, 0x83f7c2, 0x79cfff, 0xce88ff];
const pickupLocations = [
  [[7.7, 3.75], [-7.8, -101]],
  [[-7.9, -12], [50.7, -56]],
  [[6.8, -36], [-50.8, -73]],
  [[-6.85, -51], [52.1, -128]],
  [[7.4, -69], [-7.2, -170]],
];

function piece(parent, material, width, height, depth, x, y, z, geometry = box) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(width, height, depth);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function makeTool(tool) {
  const model = new THREE.Group();
  const tint = new THREE.MeshStandardMaterial({ color: tool.color, roughness: .4, metalness: .21 });
  const glow = new THREE.MeshBasicMaterial({ color: tool.color });
  piece(model, rubber, .16, .21, .16, 0, -.11, .04).rotation.x = -.36;
  piece(model, steel, .25, .25, .46, 0, .045, -.12);
  piece(model, tint, .27, .179, .34, 0, .105, -.015);
  const length = tool.id === 'firework' ? .73 : .48;
  piece(model, steel, .19, length, .19, 0, .08, -.31, tube).rotation.x = Math.PI / 2;
  piece(model, tint, .25, .105, .25, 0, .08, -.30 - length / 2, tube).rotation.x = Math.PI / 2;
  piece(model, rubber, .15, .03, .15, 0, .08, -.36 - length / 2, tube).rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    piece(model, steel, .039, .16, .33, side * .123, .06, -.18);
    for (let i = 0; i < 4; i++) piece(model, glow, .023, .075, .023, side * .145, .104, -.10 - i * .055);
  }
  if (tool.id === 'water' || tool.id === 'bubble') {
    for (const side of [-1, 1]) {
      piece(model, tint, .17, .34, .17, side * .18, .10, .15, tube).rotation.x = Math.PI / 2;
      piece(model, light, .17, .048, .17, side * .18, .10, .322, tube).rotation.x = Math.PI / 2;
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

export function createToolKit(scene, world, city, hand, audio, compact, onSelect, onPickup) {
  const models = tools.map(makeTool);
  const owned = new Set([0]);
  const pickups = pickupLocations.flatMap((sites, index) => sites.map(([x, z]) => {
    const prop = new THREE.Group();
    prop.position.set(x, .088, z);
    const glow = new THREE.MeshBasicMaterial({ color: tools[index].color });
    piece(prop, deck, .90, .19, .9, 0, .02, 0, tube);
    piece(prop, deck, .59, .82, .59, 0, .48, 0, tube);
    piece(prop, steel, .79, .13, .79, 0, .91, 0, tube);
    piece(prop, glow, .88, .88, .85, 0, .989, 0, ring).rotation.x = -Math.PI / 2;
    const model = models[index].clone();
    model.scale.setScalar(1.2);
    prop.add(model);
    scene.add(prop);
    return { prop, model, index };
  }));
  const rocket = new THREE.CapsuleGeometry(.074, .31, 4, 10);
  const jet = new THREE.CapsuleGeometry(.033, .54, 3, 8);
  const projectiles = new Map(tools.map(tool => [tool.id, new THREE.MeshBasicMaterial({
    color: tool.color, transparent: tool.id === 'bubble', opacity: tool.id === 'bubble' ? .64 : 1,
  })]));
  const rounds = Array.from({ length: 22 }, () => {
    const shot = new THREE.Mesh(sphere, projectiles.get('water'));
    shot.visible = false;
    scene.add(shot);
    return { shot, velocity: new THREE.Vector3(), age: 0, tool: null, ignore: null };
  });
  const capacity = compact ? 330 : 620;
  const sparks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), capacity);
  sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  sparks.frustumCulled = false;
  sparks.count = 0;
  scene.add(sparks);
  const particles = Array.from({ length: capacity }, () => ({
    origin: new THREE.Vector3(), velocity: new THREE.Vector3(), ttl: 0, duration: 0, size: 0, angle: 0, color: 0,
  }));
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const next = new Vec3();
  const previous = new Vec3();
  const impact = new Vec3();
  const shove = new Vec3();
  const spin = new THREE.Vector3(0, 1, 0);
  const rotation = new THREE.Vector3();
  let selected = 0;
  let cursor = 0;
  let delay = 0;

  function select(index) {
    if (!owned.has(index)) return false;
    selected = index;
    hand.clear();
    hand.add(models[index]);
    onSelect(selected, owned);
    return true;
  }
  select(0);

  function cycle(direction) {
    for (let hop = 1; hop <= tools.length; hop++) {
      const index = (selected + hop * direction + tools.length) % tools.length;
      if (select(index)) return;
    }
  }

  function emit(point, tone, count, power, life) {
    for (let i = 0; i < count; i++) {
      const particle = particles[cursor++ % capacity];
      particle.origin.copy(point);
      particle.velocity.set(Math.random() - .5, Math.random() - .29, Math.random() - .5)
        .multiplyScalar(power * (.4 + Math.random() * .6));
      particle.ttl = particle.duration = life * (.65 + Math.random() * .35);
      particle.size = .032 + Math.random() * .090;
      particle.angle = Math.random() * 6.28;
      particle.color = tone ?? colors[i % colors.length];
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
    emit(point, fireworks || confetti ? null : tool.color, fireworks ? 100 : confetti ? 64 : 27,
      fireworks ? 23 : tool.id === 'pulse' ? 14 : 8, fireworks ? 1.22 : .60);
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
    if (delay > 0) return;
    const round = rounds.find(entry => !entry.shot.visible);
    if (!round) return;
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
    emit(origin, tool.id === 'confetti' ? null : tool.color, 7, 4, .3);
  }

  function update(dt, time, position, walking, motion) {
    delay = Math.max(0, delay - dt);
    for (const pickup of pickups) {
      const { prop, model, index } = pickup;
      const dx = prop.position.x - position.x;
      const dz = prop.position.z - position.z;
      const distance = dx * dx + dz * dz;
      prop.visible = distance < 105 ** 2;
      if (!prop.visible) continue;
      model.position.y = 1.39 + (motion ? .14 * Math.sin(time * 2.1 + index) : 0);
      model.rotation.y = motion ? time * .95 + index : index;
      if (walking && distance < 1.31 ** 2) {
        if (!pickup.near) {
          owned.add(index);
          select(index);
          audio.play('pickup');
          onPickup(index);
        }
        pickup.near = true;
      } else pickup.near = false;
    }
    for (const round of rounds) {
      if (!round.shot.visible) continue;
      const { shot, velocity, tool, ignore } = round;
      const point = shot.position;
      const age = round.age;
      round.age += dt;
      velocity.y -= tool.fall * dt;
      shot.quaternion.setFromUnitVectors(spin, rotation.copy(velocity).normalize());
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
      else if (Math.floor(age * 49) !== Math.floor(round.age * 49)) emit(point, tool.color, tool.id === 'water' ? 4 : 2, 2.5, .23);
    }
    let count = 0;
    for (const particle of particles) {
      if (particle.ttl <= 0) continue;
      particle.ttl -= dt;
      particle.velocity.y -= dt * 9;
      particle.origin.addScaledVector(particle.velocity, dt);
      dummy.position.copy(particle.origin);
      dummy.scale.setScalar(particle.size * Math.max(.1, particle.ttl / particle.duration));
      dummy.quaternion.setFromAxisAngle(spin, particle.angle + particle.ttl * 9);
      dummy.updateMatrix();
      sparks.setMatrixAt(count, dummy.matrix);
      sparks.setColorAt(count++, tint.setHex(particle.color));
    }
    sparks.count = count;
    if (count) {
      sparks.instanceMatrix.needsUpdate = true;
      sparks.instanceColor.needsUpdate = true;
    }
  }

  return { fire, update, select, cycle };
}
