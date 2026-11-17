import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const rounded = new RoundedBoxGeometry(1, 1, 1, 3, .13);
const cylinder = new THREE.CylinderGeometry(.5, .5, 1, 24);
const pipe = new THREE.CylinderGeometry(.5, .5, 1, 24, 1, true);
const yAxis = new THREE.Vector3(0, 1, 0);

function grain(size, sample) {
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const index = (y * size + x) * 4;
    const shade = sample(x / size, y / size);
    pixels.set([shade, shade, shade, 255], index);
  }
  const map = new THREE.DataTexture(pixels, size, size);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}

const tread = grain(128, (u, v) => {
  const shoulder = Math.abs(v - .5);
  const across = ((u * 32 + shoulder * 6) % 1) < .17;
  const channel = [0, .17, .32].some(lane => Math.abs(shoulder - lane) < .012);
  return shoulder < .30 && (channel || across) ? 95 : 204 + Math.round(Math.cos(u * 32 * Math.PI * 2) * 9);
});
const brushed = grain(64, (u, v) => 162 + Math.round(24 * Math.sin(v * 47) + 22 * Math.cos(v * 163 + u * 2)));

const trim = new THREE.MeshStandardMaterial({ color: 0x21272a, roughness: .46, metalness: .29 });
const tireRubber = new THREE.MeshStandardMaterial({ color: 0x252728, roughness: .86, bumpMap: tread, bumpScale: .016 });
const satin = new THREE.MeshStandardMaterial({ color: 0xa8b1b3, roughness: .27, metalness: .72, roughnessMap: brushed });
const hub = new THREE.MeshStandardMaterial({ color: 0x536167, roughness: .43, metalness: .73 });
const lens = new THREE.MeshPhysicalMaterial({ color: 0x24404b, metalness: .44, roughness: .16, clearcoat: .65, clearcoatRoughness: .19 });
const headlamp = new THREE.MeshStandardMaterial({ color: 0xe3eef0, emissive: 0x94c9dc, emissiveIntensity: .42, roughness: .19, metalness: .30 });
const reverse = new THREE.MeshBasicMaterial({ color: 0xe1eddb });
const braking = new THREE.MeshStandardMaterial({ color: 0xbc3440, emissive: 0x6e101e, emissiveIntensity: .8, roughness: .32, metalness: .14 });
const accent = new THREE.MeshStandardMaterial({ color: 0xd4b06b, roughness: .37, metalness: .44 });

function paint(color) {
  return new THREE.MeshPhysicalMaterial({ color, clearcoat: .74, clearcoatRoughness: .19, metalness: .53, roughness: .29 });
}

function piece(parent, material, width, height, depth, x, y, z, geometry = rounded) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(width, height, depth);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function beam(parent, mat, start, end, diameter, open = false) {
  const a = new THREE.Vector3(...start);
  const direction = new THREE.Vector3(...end).sub(a);
  const midpoint = a.addScaledVector(direction, .5);
  const length = direction.length();
  const mesh = piece(parent, mat, diameter, length, diameter, ...midpoint, open ? pipe : cylinder);
  mesh.quaternion.setFromUnitVectors(yAxis, direction.normalize());
  return mesh;
}

function molding(parent, material, points, radius) {
  const path = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  parent.add(new THREE.Mesh(new THREE.TubeGeometry(path, 14, radius, 6), material));
}

// Bake only fixed pieces together. Turret, nozzle, wheels and rider retain their pivots.
export function batchVehicleParts(group, castShadow = true) {
  const batches = new Map();
  for (const item of group.children) {
    if (!item.isMesh || Array.isArray(item.material)) continue;
    if (!batches.has(item.material)) batches.set(item.material, []);
    batches.get(item.material).push(item);
  }
  for (const [material, meshes] of batches) {
    if (meshes.length === 1) {
      meshes[0].castShadow = castShadow;
      continue;
    }
    const pieces = meshes.map(mesh => {
      const geometry = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      if (!geometry.hasAttribute('uv')) geometry.setAttribute('uv',
        new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
      mesh.updateMatrix();
      return geometry.applyMatrix4(mesh.matrix);
    });
    const geometry = mergeGeometries(pieces);
    for (const part of pieces) part.dispose();
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = castShadow;
    group.remove(...meshes);
    group.add(mesh);
  }
}

function shell(parent, material, sections, cross, stepsPerSection = 5) {
  const rings = cross(sections[0]).length;
  const steps = (sections.length - 1) * stepsPerSection;
  const tracks = Array.from({ length: rings }, (_, index) => new THREE.CatmullRomCurve3(
    sections.map(section => {
      const [x, y] = cross(section)[index];
      return new THREE.Vector3(x, y, section[0]);
    }), false, 'centripetal').getPoints(steps));
  const vertices = [];
  const indices = [];
  const uvs = [];
  for (let i = 0; i <= steps; i++) for (let j = 0; j < rings; j++) {
    vertices.push(...tracks[j][i]);
    uvs.push(j / rings, i / steps);
    if (!i) continue;
    const a = (i - 1) * rings + j;
    const b = (i - 1) * rings + (j + 1) % rings;
    indices.push(a, b, a + rings, b, b + rings, a + rings);
  }
  const last = steps * rings;
  for (let i = 1; i < rings - 1; i++) indices.push(0, i + 1, i, last, last + i, last + i + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  parent.add(new THREE.Mesh(geometry, material));
}

function profile(width, bottom, top, taper = .81) {
  return [[0, bottom], [width * .84, bottom], [width * .99, bottom * .55 + top * .45],
    [width, top - (top - bottom) * .16], [width * taper, top], [0, top + .026],
    [-width * taper, top], [-width, top - (top - bottom) * .16], [-width * .99, bottom * .55 + top * .45], [-width * .84, bottom]];
}

function bike(body, color) {
  shell(body, color, [[-.86, .13, .23, .38], [-.67, .25, .17, .53], [-.35, .29, .14, .55],
    [-.04, .22, .17, .51], [.22, .16, .25, .43], [.43, .17, .29, .42]], ([, w, y, h]) => profile(w, y, h));
  shell(body, trim, [[.12, .14, .43, .47], [.43, .25, .42, .52], [.85, .21, .43, .56], [1.21, .10, .38, .47]],
    ([, w, y, h]) => profile(w, y, h, .91));
  piece(body, hub, .46, .41, .64, 0, .09, .07);
  piece(body, lens, .34, .26, .06, 0, .71, -.77).rotation.x = -.35;
  piece(body, headlamp, .29, .09, .054, 0, .43, -.858);
  piece(body, braking, .25, .057, .06, 0, .44, 1.21);
  piece(body, trim, .29, .075, .034, 0, .25, 1.29);
  for (const side of [-1, 1]) {
    const x = side * .16;
    beam(body, satin, [x, -.10, -1.08], [x, .57, -.66], .077);
    beam(body, hub, [side * .22, -.14, 1.11], [side * .22, .04, .17], .070);
    beam(body, color, [side * .21, .06, .29], [side * .24, .48, -.45], .072);
    beam(body, satin, [side * .30, -.12, .32], [side * .33, -.047, .95], .108);
    beam(body, trim, [side * .33, -.047, .94], [side * .33, -.039, 1.025], .084, true);
    beam(body, satin, [0, .655, -.55], [side * .38, .71, -.57], .048);
    beam(body, trim, [side * .25, .69, -.57], [side * .39, .71, -.57], .077);
    piece(body, lens, .14, .07, .083, side * .38, .84, -.61).rotation.y = side * .27;
    beam(body, satin, [side * .30, .70, -.56], [side * .38, .84, -.61], .021);
    for (let fin = 0; fin < 5; fin++) piece(body, satin, .045, .016, .32, side * .24, fin * .042 - .022, .02);
  }
}

function serviceTank(body, color) {
  const steel = paint(0x47647a);
  shell(body, color, [[-2.0, .90, -.43, .24], [-1.65, 1.11, -.41, .40], [-.62, 1.11, -.29, .53],
    [.87, 1.10, -.31, .50], [1.70, 1.08, -.34, .42], [1.98, .97, -.37, .33]], ([, w, y, h]) => profile(w, y, h, .93));
  for (const side of [-1, 1]) {
    const x = side * 1.04;
    shell(body, trim, [[-1.86, .17, -.55, -.21], [-1.58, .22, -.79, .05], [1.56, .22, -.79, .05], [1.87, .17, -.54, -.24]],
      ([, w, y, h]) => profile(w, y, h, .79).map(([px, py]) => [px + x, py]), 4);
    piece(body, steel, .36, .20, 3.46, x, .118, 0);
    for (let step = -7; step <= 7; step++) piece(body, hub, .036, .08, .169, x + side * .225, -.55, step * .22);
    for (let slat = 0; slat < 5; slat++) piece(body, trim, .21, .021, .047, side * .65, .455, 1.14 + slat * .103);
    piece(body, headlamp, .23, .108, .04, side * .67, .235, -1.992);
    piece(body, braking, .22, .084, .052, side * .78, .242, 1.988);
    piece(body, accent, .065, .036, 1.89, side * 1.17, .227, .09);
    beam(body, satin, [side * .86, .30, .81], [side * .86, .30, 1.83], .037);
  }
  piece(body, satin, .29, .11, .065, 0, .065, 2.017);
  const turret = new THREE.Group();
  turret.position.set(0, .55, .08);
  body.add(turret);
  piece(turret, hub, 1.43, .19, 1.43, 0, 0, 0, cylinder);
  shell(turret, steel, [[-.69, .43, .04, .34], [-.42, .64, .04, .52], [.34, .67, .05, .55], [.70, .53, .04, .41]],
    ([, w, y, h]) => profile(w, y, h, .85));
  piece(turret, lens, .55, .056, .36, -.16, .552, .22);
  piece(turret, hub, .29, .037, .29, .33, .549, .27, cylinder);
  piece(turret, headlamp, .35, .063, .031, -.04, .40, -.642);
  beam(turret, trim, [.47, .35, .56], [.46, .98, .61], .021);
  const nozzle = new THREE.Group();
  nozzle.position.set(0, .34, -.46);
  turret.add(nozzle);
  beam(nozzle, satin, [0, 0, -.10], [0, 0, -1.38], .17);
  beam(nozzle, steel, [0, 0, -.19], [0, 0, -.60], .288);
  beam(nozzle, satin, [0, 0, -1.34], [0, 0, -1.87], .30, true);
  beam(nozzle, hub, [0, 0, -1.64], [0, 0, -1.92], .352, true);
  beam(nozzle, trim, [0, 0, -1.57], [0, 0, -1.88], .207, true);
  piece(nozzle, lens, .20, .028, .20, 0, 0, -1.741, cylinder).rotation.x = Math.PI / 2;
  batchVehicleParts(nozzle);
  batchVehicleParts(turret);
  return { turret, nozzle };
}

function truck(body, p, color, monster) {
  const w = p.width;
  const arch = z => Math.max(-.26, ...[-p.length, p.length].map(axle => {
    const t = Math.abs(z - axle) / (p.radius + .17);
    return t >= 1 ? -.26 : -.26 + (monster ? .42 : .38) * Math.sqrt(1 - t * t);
  }));
  const sections = [
    [-p.depth, .83, .36], [-1.85, .96, .39], [-1.55, 1.015, .46], [-1.19, 1, .52], [-.92, .94, .55],
    [-.43, .91, .55], [.48, .92, .54], [1.17, 1.0, .50], [1.55, 1.03, .48], [1.90, .98, .44], [p.depth, .90, .39],
  ];
  shell(body, color, sections, ([z, width, top]) => profile(w * width, arch(z), top, .77));
  const roofEnd = monster ? .71 : 1.53;
  const cabin = [
    [-1.19, .76, .49, .56], [-.86, .86, .52, .71], [-.49, .77, .53, 1.12],
    [-.03, .75, .53, 1.183], [roofEnd - .18, .77, .52, 1.15], [roofEnd, .79, .50, monster ? .52 : 1.05],
  ];
  shell(body, lens, cabin, ([, width, base, top]) => profile(width * w, base, top, .9));
  shell(body, color, cabin.slice(2, -1).map(([z, width, , top]) => [z, width, top]),
    ([, width, top]) => profile(w * width * .96, top - .029, top + .044, .89), 8);
  piece(body, trim, 1.75 * w, .17, .11, 0, .107, -p.depth + .01);
  piece(body, trim, 1.76 * w, .21, .20, 0, .055, p.depth - .065);
  piece(body, satin, .33, .12, .04, 0, .214, p.depth + .018);
  piece(body, trim, .81, .20, .065, 0, .270, -p.depth - .014);
  for (let slot = -3; slot <= 3; slot++) piece(body, hub, .057, .139, .026, slot * .109, .27, -p.depth - .055);
  for (const side of [-1, 1]) {
    const x = side * w;
    const front = -p.depth;
    piece(body, lens, .38, .158, .072, x * .65, .278, front - .022).rotation.y = side * .13;
    piece(body, headlamp, .30, .060, .069, x * .65, .309, front - .052).rotation.y = side * .13;
    piece(body, accent, .060, .045, .049, x * .80, .239, front - .039);
    piece(body, braking, .24, .16, .047, x * .77, .294, p.depth + .006);
    piece(body, reverse, .15, .034, .029, x * .77, .252, p.depth + .032);
    const stanchions = [[-.73, -.45, .68, 1.10], [.16, .16, .59, 1.14], [roofEnd - .10, roofEnd - .18, .55, 1.11]];
    for (const [baseZ, topZ, low, high] of (monster ? stanchions.slice(0, 2) : stanchions)) {
      beam(body, color, [x * .77, low, baseZ], [x * .70, high, topZ], .073);
    }
    piece(body, trim, .13, .10, .17, x * .95, .651, -.68);
    piece(body, color, .23, .11, .18, x * 1.05, .693, -.70);
    piece(body, lens, .182, .073, .033, x * 1.08, .696, -.597);
    for (const z of (monster ? [.35] : [-.19, .73])) {
      piece(body, trim, .024, .047, .19, x * .928, .422, z);
      piece(body, satin, .025, .022, .135, x * .94, .424, z);
    }
    piece(body, trim, .10, .091, 1.58, x * .94, -.207, .03);
    beam(body, satin, [x * .58, 1.22, -.27], [x * .58, 1.21, roofEnd - .21], .057);
    for (const axle of [-p.length, p.length]) {
      const length = monster ? .62 : .54;
      const edgeX = x * (monster ? 1.00 : 1.045);
      molding(body, trim, [[edgeX * .94, -.17, axle - length], [edgeX, .095, axle - length * .54],
        [edgeX, .18, axle], [edgeX, .065, axle + length * .61], [edgeX * .94, -.18, axle + length]], .038);
    }
    if (monster) {
      piece(body, trim, .059, .098, 1.16, x * .828, .49, 1.29);
      beam(body, hub, [x * .57, .50, .66], [x * .50, .97, .91], .084);
      beam(body, hub, [x * .50, .97, .91], [x * .62, .56, 1.52], .084);
    }
  }
  if (monster) piece(body, trim, 1.47, .038, 1.21, 0, .444, 1.31);
  else {
    piece(body, braking, .33, .028, .028, 0, 1.105, roofEnd + .021);
    piece(body, color, w * 1.40, .15, .072, 0, .575, roofEnd + .021);
    piece(body, trim, .45, .024, .025, .10, .679, roofEnd + .035).rotation.z = .09;
    for (const side of [-1, 1]) {
      beam(body, color, [side * w * .73, .62, roofEnd + .025], [side * w * .62, 1.075, roofEnd + .02], .075);
    }
  }
}

export function buildUtilityBody(body, kind, preset) {
  const color = paint(preset.color);
  let equipment = null;
  if (kind === 'bike') bike(body, color);
  else if (kind === 'tank') equipment = serviceTank(body, color);
  else truck(body, preset, color, kind === 'monster');
  batchVehicleParts(body);
  return equipment;
}

const tireGeometry = new Map();

export function buildWheel(radius, width, spokes, face = 1, useTread = true) {
  const wheel = new THREE.Group();
  const key = radius + ':' + width;
  if (!tireGeometry.has(key)) {
    const outline = [[.61, -.34], [.77, -.49], [.89, -.49], [.966, -.39], [1, -.27], [1, .27],
      [.966, .39], [.89, .49], [.77, .49], [.61, .34], [.61, -.34]];
    tireGeometry.set(key, new THREE.LatheGeometry(outline.map(([r, x]) => new THREE.Vector2(r * radius, x * width)), 32));
  }
  piece(wheel, useTread ? tireRubber : trim, 1, 1, 1, 0, 0, 0, tireGeometry.get(key)).rotation.z = Math.PI / 2;
  const sides = face === 0 ? [-1, 1] : [face];
  piece(wheel, hub, radius * 1.36, width * .69, radius * 1.36, 0, 0, 0, cylinder).rotation.z = Math.PI / 2;
  for (const side of sides) {
    const faceX = side * width * .415;
    piece(wheel, satin, radius * 1.57, .033, radius * 1.57, faceX, 0, 0, pipe).rotation.z = Math.PI / 2;
    piece(wheel, trim, radius * .50, .055, radius * .50, faceX, 0, 0, cylinder).rotation.z = Math.PI / 2;
    piece(wheel, satin, radius * .232, .063, radius * .232, faceX + side * .011, 0, 0, cylinder).rotation.z = Math.PI / 2;
    for (let i = 0; i < spokes; i++) {
      const angle = i / spokes * Math.PI * 2;
      const r = radius * .463;
      piece(wheel, satin, .027, radius * .602, radius * .12, faceX, Math.cos(angle) * r, Math.sin(angle) * r).rotation.x = angle + .12;
      piece(wheel, accent, .025, .024, .024, faceX + side * .033, Math.cos(angle) * radius * .169, Math.sin(angle) * radius * .169, cylinder).rotation.z = Math.PI / 2;
    }
  }
  batchVehicleParts(wheel);
  return wheel;
}
