import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Body, Box, Vec3 } from 'cannon-es';
import { createStory } from './story.js';
import { blockSize } from './drive-city.js';
import fontData from './drive-font.json' with { type: 'json' };

const font = new FontLoader().parse(fontData);
const glyphs = new Map();
const ink = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .58, metalness: .11, fog: false });
const palette = {
  chapter: [new THREE.Color('#493018'), new THREE.Color('#c49b5e')],
  headline: [new THREE.Color('#0a1918'), new THREE.Color('#d3b17b')],
  body: [new THREE.Color('#0d1e25'), new THREE.Color('#9eafa8')],
};
const spacing = 2 * blockSize;
const firstCrossing = -17;
const width = 15;
const elevation = 4.15;
const maxHeight = 5.8;
const viewRange = 118;
const sightRange = 72;
const physicsRange = 39;
const rest = new THREE.Quaternion();

function characterGeometry(character, role) {
  const key = role + character;
  if (glyphs.has(key)) return glyphs.get(key);
  const source = fontData.glyphs[character] ?? fontData.glyphs['?'];
  const advance = source.ha / fontData.resolution;
  if (!source.o) {
    const blank = { advance };
    glyphs.set(key, blank);
    return blank;
  }

  const geometry = new TextGeometry(character in fontData.glyphs ? character : '?', {
    font, size: 1, depth: role === 'headline' ? .20 : .105, curveSegments: 3, bevelEnabled: false,
  });
  geometry.computeBoundingBox();
  const center = geometry.boundingBox.getCenter(new THREE.Vector3());
  const bounds = geometry.boundingBox.getSize(new THREE.Vector3());
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (const { start, count, materialIndex } of geometry.groups) {
    const color = palette[role][materialIndex === 0 ? 0 : 1];
    for (let i = start; i < start + count; i++) color.toArray(colors, 3 * i);
  }
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.clearGroups();
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const glyph = { geometry, advance, center, bounds };
  glyphs.set(key, glyph);
  return glyph;
}

function measure(text) {
  return Array.from(text, character => (fontData.glyphs[character] ?? fontData.glyphs['?']).ha)
    .reduce((width, advance) => width + advance, 0) / fontData.resolution;
}

function wrap(text, size) {
  const lines = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    const candidate = current ? current + ' ' + word : word;
    if (current && measure(candidate) * size > width) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function letterLayout(page, index) {
  const rows = [];
  const add = (text, role, size, gap = 0) => {
    if (!text) return;
    const lines = wrap(text, size);
    for (const [i, line] of lines.entries()) {
      rows.push({ line, role, size: Math.min(size, width / measure(line)), gap: i === lines.length - 1 ? gap : 0 });
    }
  };
  add(String(index + 1).padStart(2, '0') + '  /  ' + page.chapterTitle.toUpperCase(), 'chapter', .50, .11);
  add(page.title, 'headline', 1.02, .13);
  add([page.meta, page.date].filter(Boolean).join(' · '), 'body', .51, .15);
  add(page.body, 'body', .45, .12);
  for (const point of page.points ?? []) add('• ' + point, 'body', .43, .075);
  add(page.tags?.join(' · '), 'body', .43, .10);
  add(page.links.map(link => link.label).join(' · '), 'chapter', .39);
  const height = rows.reduce((sum, row) => sum + row.size * 1.23 + row.gap, 0);
  const scale = Math.min(1, maxHeight / height);
  let y = height;
  const pieces = [];
  for (const { line, role, size, gap } of rows) {
    let x = -measure(line) * size / 2;
    y -= size * 1.15;
    for (const character of line) {
      const glyph = characterGeometry(character, role);
      if (glyph.geometry) {
        pieces.push({
          glyph, role, size: size * scale,
          x: (x + glyph.center.x * size) * scale,
          y: (y + glyph.center.y * size) * scale,
        });
      }
      x += glyph.advance * size;
    }
    y -= size * .08 + gap;
  }
  return pieces;
}

function createLetters(scene, post) {
  const parts = letterLayout(post.page, post.index);
  const geometries = parts.map(({ glyph, size, x, y }) =>
    glyph.geometry.clone().scale(size, size, size).translate(x, y, 0));
  const joined = mergeGeometries(geometries);
  for (const geometry of geometries) geometry.dispose();

  const sign = new THREE.Group();
  sign.position.set(0, elevation, post.z);
  const front = new THREE.Mesh(joined, ink);
  const rear = new THREE.Mesh(joined, ink);
  front.position.z = .09;
  rear.position.z = -.09;
  rear.rotation.y = Math.PI;
  sign.add(front, rear);
  scene.add(sign);
  post.sign = sign;
}

function addFragments(scene, world, post, parts, travel) {
  const title = parts.filter(part => part.role === 'headline');
  const details = parts.filter(part => part.role === 'body');
  const extra = details.filter((_, index) => index % Math.max(1, Math.ceil(details.length / 10)) === 0);
  const scatter = post.index % 2 === 1;
  const subset = [...title.slice(0, 28), ...extra];
  return subset.map(({ glyph, x, y, size }, i) => {
    const mesh = new THREE.Mesh(glyph.geometry, ink);
    mesh.scale.setScalar(size);
    mesh.position.set(x, elevation + y, post.z);
    scene.add(mesh);

    const extents = glyph.bounds.clone().multiplyScalar(size / 2);
    const body = new Body({
      mass: 1.15 + size, shape: new Box(new Vec3(Math.max(.048, extents.x), Math.max(.045, extents.y), Math.max(.039, extents.z))),
      linearDamping: .29, angularDamping: .47, sleepSpeedLimit: .32, sleepTimeLimit: .8,
      collisionFilterGroup: 32, collisionFilterMask: 1 | 4,
    });
    const seed = Math.sin(i * 127.1 + post.index * 27.7);
    const drift = Math.cos(i * 17.1);
    body.position.copy(mesh.position);
    body.velocity.set(seed * (scatter ? 4.5 : .65), scatter ? 1.8 + drift * 1.7 : -.3,
      drift * (scatter ? 5.1 : 1.6) - travel * (scatter ? 1.2 : 2.5));
    body.angularVelocity.set(seed * 6, drift * 5, seed * drift * 4);
    const fragment = { mesh, body, home: mesh.position.clone(), origin: new THREE.Vector3(), spin: new THREE.Quaternion(), bump: null };
    body.addEventListener('collide', ({ body: vehicle }) => {
      if (vehicle.collisionFilterGroup !== 4) return;
      const direction = new Vec3(vehicle.velocity.x, 0, vehicle.velocity.z);
      const speed = direction.normalize();
      if (speed < .6) return;
      direction.scale(body.mass * Math.min(8, speed * .72), direction);
      direction.y = body.mass * Math.min(2.1, speed * .23);
      fragment.bump = direction;
    });
    body.aabbNeedsUpdate = true;
    world.addBody(body);
    return fragment;
  });
}

export function createSkyStories(scene, world, language) {
  const posts = createStory(language).map((page, index) => ({
    page, index, z: firstCrossing - index * spacing, fragile: index % 3 === 1,
    state: 'intact', sign: null, pieces: [], active: false, healing: 0,
  }));
  let lastZ = null;

  function setPhysics(post, active) {
    if (post.active === active) return;
    post.active = active;
    for (const { body } of post.pieces) {
      if (active) {
        body.aabbNeedsUpdate = true;
        world.addBody(body);
      } else world.removeBody(body);
    }
  }

  function completeRepair(post) {
    setPhysics(post, false);
    for (const { mesh } of post.pieces) scene.remove(mesh);
    post.pieces = [];
    post.state = 'restored';
    if (post.sign) post.sign.visible = true;
  }

  function heal(immediate = false) {
    let count = 0;
    for (const post of posts) {
      if (post.state !== 'broken') continue;
      count++;
      if (immediate || !post.active) {
        completeRepair(post);
      } else {
        setPhysics(post, false);
        for (const { mesh, origin, spin } of post.pieces) {
          origin.copy(mesh.position);
          spin.copy(mesh.quaternion);
        }
        post.state = 'healing';
        post.healing = 0;
      }
    }
    return count;
  }

  function update(position, velocity, heading, viewerZ, dt, reduced) {
    const travel = Math.sign(position.z - (lastZ ?? position.z));
    const direction = Math.sign(heading.z) || -1;
    const lead = THREE.MathUtils.clamp(Math.abs(velocity.z) * .94 + 4, 9, 22);
    let nearest = posts[0];
    let nearestScore = Infinity;
    let shattered = false;

    for (const post of posts) {
      const offset = post.z - position.z;
      const distance = Math.hypot(position.x, offset);
      const score = Math.abs(offset) + (offset * direction < -5 ? spacing : 0);
      if (score < nearestScore) {
        nearestScore = score;
        nearest = post;
      }

      const ahead = offset * travel;
      const hit = dt > 0 && ahead > 2 && ahead <= lead && Math.abs(velocity.z) > 1.6;
      const breaks = hit && Math.abs(position.x) < 6.2 && post.fragile && post.state === 'intact';
      if (distance < viewRange && !post.sign && post.state !== 'broken') createLetters(scene, post);
      if (post.sign) {
        post.sign.visible = distance < sightRange && (post.state === 'intact' || post.state === 'restored');
        post.sign.children[0].visible = viewerZ >= post.z;
        post.sign.children[1].visible = viewerZ < post.z;
      }
      if (distance >= viewRange && post.sign) {
        scene.remove(post.sign);
        post.sign.children[0].geometry.dispose();
        post.sign = null;
      }
      if (breaks) {
        const parts = letterLayout(post.page, post.index);
        if (post.sign) post.sign.visible = false;
        post.pieces = addFragments(scene, world, post, parts, travel);
        post.active = true;
        post.state = 'broken';
        shattered = true;
      }

      if (post.state === 'broken') {
        setPhysics(post, distance < physicsRange);
        for (const fragment of post.pieces) {
          const { mesh, body, bump } = fragment;
          mesh.visible = distance < sightRange;
          if (!post.active) continue;
          if (bump) {
            body.wakeUp();
            body.applyImpulse(bump, new Vec3(0, .07, 0));
            fragment.bump = null;
          }
          mesh.position.copy(body.position);
          mesh.quaternion.copy(body.quaternion);
        }
      } else if (post.state === 'healing') {
        if (post.sign) post.sign.visible = false;
        post.healing += reduced ? 1 : dt * 1.17;
        const t = THREE.MathUtils.smoothstep(post.healing, 0, 1);
        for (const { mesh, origin, spin, home } of post.pieces) {
          mesh.position.lerpVectors(origin, home, t);
          mesh.quaternion.slerpQuaternions(spin, rest, t);
        }
        if (t >= 1) completeRepair(post);
      }
    }
    lastZ = position.z;
    return { page: nearest.page, index: nearest.index, total: posts.length, shattered };
  }

  return { update, heal, reposition(position) { lastZ = position.z; } };
}
