import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Body, Box, Vec3 } from 'cannon-es';
import { blockSize } from './drive-city.js';
import fontData from './drive-font.json' with { type: 'json' };

const font = new FontLoader().parse(fontData);
const glyphs = new Map();
const ink = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false });
const box = new THREE.BoxGeometry();
const steel = new THREE.MeshStandardMaterial({ color: '#59716e', roughness: .57, metalness: .32 });
const brackets = new THREE.MeshStandardMaterial({ color: '#a5b4aa', roughness: .57, metalness: .22 });
const enamel = new THREE.MeshBasicMaterial({ color: '#184739', fog: false, toneMapped: false });
const border = new THREE.MeshBasicMaterial({ color: '#b8d6b7', fog: false, toneMapped: false });
const reflectors = new THREE.MeshBasicMaterial({ color: '#f2c57d', fog: false, toneMapped: false });
const palette = {
  chapter: [new THREE.Color('#f2c57d'), new THREE.Color('#af814b')],
  headline: [new THREE.Color('#f3f6e5'), new THREE.Color('#96bfab')],
  body: [new THREE.Color('#e5efdf'), new THREE.Color('#83a899')],
};
const width = 10.3;
const panelWidth = 11.45;
const elevation = 4.75;
const maxHeight = 3.95;
const viewRange = 118;
const sightRange = 100;
const physicsRange = 46;

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

function signRows(page, index, detailScale) {
  const rows = [];
  const add = (text, role, size, gap = 0) => {
    if (!text) return;
    const lines = wrap(text, size);
    for (const [i, line] of lines.entries()) {
      const fitted = Math.min(size, width / measure(line));
      rows.push({ line, role, size: fitted, height: fitted * 1.17 + (i === lines.length - 1 ? gap : 0) });
    }
  };
  add(String(index + 1).padStart(2, '0') + '  /  ' + page.chapterTitle.toUpperCase(), 'chapter', .36, .10);
  add(page.title, 'headline', .98, .11);
  add([page.meta, page.date].filter(Boolean).join(' · '), 'body', .44 * detailScale, .11);
  add(page.body, 'body', .43 * detailScale, .09);
  for (const point of page.points ?? []) add('• ' + point, 'body', .41 * detailScale, .05);
  add(page.tags?.join(' · '), 'body', .40 * detailScale, .07);
  add(page.links.map(link => link.label).join(' · '), 'chapter', .37 * detailScale);
  return { rows, height: rows.reduce((sum, row) => sum + row.height, 0) };
}

function letterLayout(page, index) {
  let detailScale = 1;
  let { rows, height } = signRows(page, index, detailScale);
  while (height > maxHeight && detailScale > .43) {
    detailScale -= .07;
    ({ rows, height } = signRows(page, index, detailScale));
  }
  const scale = Math.min(1, maxHeight / height);
  let y = height;
  const pieces = [];
  for (const { line, role, size, height: rowHeight } of rows) {
    let x = 0;
    const baseline = y - size;
    for (const character of line) {
      const glyph = characterGeometry(character, role);
      if (glyph.geometry) {
        pieces.push({
          glyph, role, size: size * scale,
          x: (x + glyph.center.x * size) * scale - width / 2,
          y: (baseline + glyph.center.y * size) * scale,
        });
      }
      x += glyph.advance * size;
    }
    y -= rowHeight;
  }
  return pieces;
}

function solid(parent, material, w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(box, material);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function createSign(scene, post) {
  const parts = letterLayout(post.page, post.index);
  const geometries = parts.map(({ glyph, size, x, y }) =>
    glyph.geometry.clone().scale(size, size, size).translate(x, y, 0));
  const lettering = mergeGeometries(geometries);
  for (const geometry of geometries) geometry.dispose();
  lettering.computeBoundingBox();
  const center = lettering.boundingBox.getCenter(new THREE.Vector3());
  const height = Math.max(2.15, lettering.boundingBox.max.y - lettering.boundingBox.min.y + .78);
  const textY = .09 - center.y;
  const panelY = elevation + height / 2;
  lettering.translate(0, textY, 0);

  const panel = new THREE.Group();
  panel.position.y = panelY;
  solid(panel, brackets, panelWidth, height, .26, 0, 0, 0);
  solid(panel, enamel, panelWidth - .18, height - .17, .29, 0, 0, 0);
  const faces = [];
  for (const side of [0, Math.PI]) {
    const face = new THREE.Group();
    face.rotation.y = side;
    const letters = new THREE.Mesh(lettering, ink);
    letters.position.z = .17;
    face.add(letters);
    for (const x of [-panelWidth / 2 + .19, panelWidth / 2 - .19]) {
      solid(face, border, .028, height - .34, .03, x, 0, .16);
      solid(face, reflectors, .15, .11, .025, x * .943, height / 2 - .28, .16);
    }
    for (const y of [-height / 2 + .17, height / 2 - .17]) {
      solid(face, border, panelWidth - .38, .026, .03, 0, y, .16);
    }
    for (const x of [-.13, .13]) {
      solid(face, border, .20, .045, .028, x, -height / 2 + .31, .162).rotation.z = Math.sign(x) * .59;
    }
    panel.add(face);
    faces.push(face);
  }

  const sign = new THREE.Group();
  sign.position.set(post.x, 0, post.z);
  sign.rotation.y = post.course.axis === 'x' ? Math.PI / 2 : 0;
  const beamY = elevation + height + .43;
  for (const x of [-6.53, 6.53]) {
    solid(sign, steel, .23, beamY, .27, x, beamY / 2, 0);
    solid(sign, brackets, .60, .33, .56, x, .22, 0);
    solid(sign, reflectors, .17, .41, .028, x, 1.28, .15);
    solid(sign, reflectors, .17, .41, .028, x, 1.28, -.15);
  }
  solid(sign, steel, 13.35, .26, .36, 0, beamY, 0);
  for (const x of [-3.65, 3.65]) solid(sign, brackets, .15, .62, .25, x, beamY - .30, 0);
  sign.add(panel);
  scene.add(sign);

  const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), sign.rotation.y);
  const sensor = new Body({
    mass: 0, shape: new Box(new Vec3(panelWidth / 2, height / 2, .18)),
    collisionResponse: false, collisionFilterGroup: 16, collisionFilterMask: 4,
  });
  sensor.position.set(post.x, panelY, post.z);
  sensor.quaternion.copy(rotation);
  sensor.addEventListener('collide', ({ body }) => {
    if (body.collisionFilterGroup === 4 && body.velocity.lengthSquared() > 2.25) post.impact = true;
  });

  return { sign, panel, faces, lettering, height, panelY, parts, textY, rotation, sensor, sensing: false };
}

function setSensor(world, model, enabled) {
  if (model.sensing === enabled) return;
  model.sensing = enabled;
  if (enabled) world.addBody(model.sensor);
  else world.removeBody(model.sensor);
}

function clearSign(scene, world, post) {
  if (!post.model) return;
  const { sign, lettering } = post.model;
  setSensor(world, post.model, false);
  scene.remove(sign);
  lettering.dispose();
  post.model = null;
}

function debris(mesh, mass, extents, position, rotation, velocity, spin) {
  const body = new Body({
    mass, shape: new Box(new Vec3(Math.max(.035, extents.x), Math.max(.035, extents.y), Math.max(.03, extents.z))),
    linearDamping: .20, angularDamping: .39, sleepSpeedLimit: .30, sleepTimeLimit: .85,
    collisionFilterGroup: 32, collisionFilterMask: 1 | 4,
  });
  body.position.copy(position);
  body.quaternion.copy(rotation);
  body.velocity.copy(velocity);
  body.angularVelocity.copy(spin);
  mesh.position.copy(position);
  mesh.quaternion.copy(rotation);
  return {
    mesh, body, home: position, rotation, origin: new THREE.Vector3(), spin: new THREE.Quaternion(),
  };
}

function releaseSign(scene, post, explode, position, velocity) {
  const { model } = post;
  const { panel, panelY, height, rotation } = model;
  const home = new THREE.Vector3(post.x, panelY, post.z);
  const crossOffset = post.course.axis === 'z' ? position.x - post.x : position.z - post.z;
  const side = Math.abs(crossOffset) > .8 ? -Math.sign(crossOffset) : post.index % 2 ? 1 : -1;
  const rotate = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(rotation);
  const travel = new THREE.Vector3(velocity.x, 0, velocity.z).normalize();

  if (!explode) {
    scene.add(panel);
    for (const face of model.faces) face.visible = true;
    return [debris(panel, 38, new THREE.Vector3(panelWidth / 2, height / 2, .16), home, rotation,
      rotate(side * 4.9, -.7, .15).addScaledVector(travel, 1.65), rotate(.36, side * .27, side * 1.45))];
  }

  panel.visible = false;
  const title = model.parts.filter(part => part.role === 'headline').slice(0, 24);
  const details = model.parts.filter(part => part.role === 'body');
  const extra = details.filter((_, index) => index % Math.max(1, Math.ceil(details.length / 9)) === 0);
  const fragments = [...title, ...extra].map(({ glyph, size, x, y }) => {
    const mesh = new THREE.Mesh(glyph.geometry, ink);
    mesh.scale.setScalar(size);
    return { mesh, mass: .8 + size, extents: glyph.bounds.clone().multiplyScalar(size / 2), x, y: y + model.textY };
  });
  for (let i = 0; i < 7; i++) {
    const mesh = new THREE.Mesh(box, i % 3 === 0 ? brackets : enamel);
    mesh.scale.set(.55 + (i % 3) * .19, .23 + (i % 4) * .08, .10);
    fragments.push({ mesh, mass: 2, extents: mesh.scale.clone().multiplyScalar(.5), x: (i - 3) * 1.45, y: (i % 2 - .5) * height * .61 });
  }
  return fragments.map(({ mesh, mass, extents, x, y }, i) => {
    const seed = Math.sin(i * 127.1 + post.index * 27.7);
    const drift = Math.cos(i * 17.1);
    scene.add(mesh);
    return debris(mesh, mass, extents, rotate(x, y, .2).add(home), rotation,
      rotate(seed * 4.5 + side, 1.3 + drift * 1.6, drift * 3.2).addScaledVector(travel, 2.5),
      rotate(seed * 6, drift * 5, seed * drift * 4));
  });
}

function findCourse(position, velocity, heading) {
  const reversing = velocity.x * heading.x + velocity.z * heading.z < -2.5;
  const axis = Math.abs(heading.x) > Math.abs(heading.z) ? 'x' : 'z';
  if (Math.abs(heading[axis]) < .79) return null;
  const across = axis === 'x' ? 'z' : 'x';
  const street = Math.round(position[across] / blockSize) * blockSize;
  if (Math.abs(position[across] - street) > 7.35) return null;
  const direction = Math.sign(heading[axis]) * (reversing ? -1 : 1);
  return { axis, across, street, direction };
}

function sameCourse(a, b) {
  return a?.axis === b?.axis && a?.street === b?.street && a?.direction === b?.direction;
}

export function createSkyStories(scene, world, pages) {
  const posts = pages.map((page, index) => ({
    page, index, course: null, model: null, impact: false, state: 'intact', pieces: [], active: false, healing: 0,
  }));
  const mainStreet = { axis: 'z', across: 'x', street: 0, direction: -1 };
  let next = 0;
  let course = mainStreet;
  let candidate = null;
  let courseFor = 0;

  function place(post, street, along) {
    clearSign(scene, world, post);
    post.course = street;
    post[street.axis] = along;
    post[street.across] = street.street;
  }

  function placeAhead(post, position) {
    const { axis, street, direction } = course;
    const target = position[axis] + 30 * direction;
    let along = (Math.round(target / blockSize - .5) + .5) * blockSize;
    if ((along - position[axis]) * direction < 14) along += blockSize * direction;
    while (posts.slice(0, next).some(other => other.course.axis === axis &&
      other.course.street === street && Math.abs(other[axis] - along) < blockSize * .7)) {
      along += blockSize * direction;
    }
    place(post, course, along);
  }

  place(posts[0], mainStreet, -17);

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
    const { panel, panelY, sign } = post.model;
    sign.add(panel);
    panel.position.set(0, panelY, 0);
    panel.quaternion.identity();
    panel.visible = true;
    post.pieces = [];
    post.state = 'restored';
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

  function updateCourse(position, velocity, heading, dt) {
    const observed = findCourse(position, velocity, heading);
    if (!observed || sameCourse(observed, course)) {
      candidate = null;
      return;
    }
    if (!sameCourse(observed, candidate)) {
      candidate = observed;
      courseFor = 0;
    }
    courseFor += dt;
    if (courseFor < .24) return;
    course = candidate;
    candidate = null;
    const upcoming = posts[next];
    if (upcoming && !sameCourse(upcoming.course, course)) placeAhead(upcoming, position);
  }

  function update(position, velocity, heading, viewer, dt, reduced) {
    updateCourse(position, velocity, heading, dt);
    let nearest = posts[next] ?? posts.at(-1);
    let nearestScore = 13;
    let shattered = false;
    let passed = false;

    for (const post of posts) {
      if (!post.course) break;
      const { axis, across, direction } = post.course;
      const lateral = Math.abs(position[across] - post[across]);
      const ahead = (post[axis] - position[axis]) * direction;
      const distance = Math.hypot(position.x - post.x, position.z - post.z);
      if (post.index < next && distance < nearestScore) {
        nearestScore = distance;
        nearest = post;
      }
      if (!post.model && distance < viewRange) post.model = createSign(scene, post);
      if (!post.model) continue;

      const { sign, faces, panel } = post.model;
      sign.visible = distance < sightRange;
      if (panel.parent === sign) {
        faces[0].visible = viewer[axis] >= post[axis];
        faces[1].visible = !faces[0].visible;
      }
      setSensor(world, post.model, post.state === 'intact' && distance < physicsRange);

      const current = post.index === next && sameCourse(course, post.course);
      const speed = velocity[axis] * direction;
      const approaching = current && lateral < 6.15 && ahead > 2 && ahead <= THREE.MathUtils.clamp(3.5 + speed * .34, 5, 12) && speed > 2.3;
      if (post.state === 'intact' && (post.impact || (approaching && post.index % 3 !== 0))) {
        const explode = post.index % 3 !== 2;
        setSensor(world, post.model, false);
        post.pieces = releaseSign(scene, post, explode, position, velocity);
        setPhysics(post, true);
        post.state = 'broken';
        shattered = true;
      }
      if (current && lateral < 7.15 && (ahead <= -1.25 || post.state === 'broken')) passed = true;

      if (post.state === 'broken') {
        setPhysics(post, distance < physicsRange);
        for (const { mesh, body } of post.pieces) {
          mesh.visible = distance < sightRange;
          if (!post.active) continue;
          mesh.position.copy(body.position);
          mesh.quaternion.copy(body.quaternion);
        }
      } else if (post.state === 'healing') {
        post.healing += reduced ? 1 : dt * 1.42;
        const progress = THREE.MathUtils.smoothstep(post.healing, 0, 1);
        for (const { mesh, origin, spin, home, rotation } of post.pieces) {
          mesh.position.lerpVectors(origin, home, progress);
          mesh.quaternion.slerpQuaternions(spin, rotation, progress);
        }
        if (progress >= 1) completeRepair(post);
      }
      if (distance >= viewRange && (post.state === 'intact' || post.state === 'restored')) clearSign(scene, world, post);
    }
    if (passed) {
      const upcoming = posts[++next];
      if (upcoming) placeAhead(upcoming, position);
    }
    return { page: nearest.page, index: nearest.index, total: posts.length, shattered };
  }

  function reset() {
    for (const post of posts) {
      setPhysics(post, false);
      for (const { mesh } of post.pieces) scene.remove(mesh);
      clearSign(scene, world, post);
      Object.assign(post, { course: null, impact: false, state: 'intact', pieces: [], healing: 0 });
    }
    next = 0;
    course = mainStreet;
    candidate = null;
    place(posts[0], mainStreet, -17);
  }

  return { update, heal, reset };
}
