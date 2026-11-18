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
const raceGrooves = grain(128, (u,v) => {
  const center = Math.abs(u - .5);
  return Math.abs(center - .16) < .018 || (center > .28 && (v * 36 + u * 3) % 1 < .16) ? 102 : 193;
});

const trim = new THREE.MeshStandardMaterial({ color: 0x21272a, roughness: .46, metalness: .29 });
const tireRubber = new THREE.MeshStandardMaterial({ color: 0x252728, roughness: .86, bumpMap: tread, bumpScale: .016 });
const semiSlickRubber = new THREE.MeshStandardMaterial({ color: 0x252728, roughness: .77, bumpMap: raceGrooves, bumpScale: .014 });
const satin = new THREE.MeshStandardMaterial({ color: 0xa8b1b3, roughness: .27, metalness: .72, roughnessMap: brushed });
const hub = new THREE.MeshStandardMaterial({ color: 0x536167, roughness: .43, metalness: .73 });
const lens = new THREE.MeshPhysicalMaterial({ color: 0x24404b, metalness: .44, roughness: .16, clearcoat: .65, clearcoatRoughness: .19 });
const headlamp = new THREE.MeshStandardMaterial({ color: 0xe3eef0, emissive: 0x94c9dc, emissiveIntensity: .42, roughness: .19, metalness: .30 });
const reverse = new THREE.MeshBasicMaterial({ color: 0xe1eddb });
const braking = new THREE.MeshStandardMaterial({ color: 0xbc3440, emissive: 0x6e101e, emissiveIntensity: .8, roughness: .32, metalness: .14 });
const accent = new THREE.MeshStandardMaterial({ color: 0xd4b06b, roughness: .37, metalness: .44 });
const castSteel = new THREE.MeshStandardMaterial({ color: 0x606969, roughness: .76, metalness: .48, roughnessMap: brushed });
const beltRubber = new THREE.MeshStandardMaterial({ color: 0x272b2b, roughness: .88, metalness: .10 });
const weave = grain(32, (u, v) => 135 + 46 * Math.sin((u + v) * 25) * Math.cos((u - v) * 19));
const carbon = new THREE.MeshStandardMaterial({ color: 0x242b2c, roughness: .37, metalness: .28, roughnessMap: weave });
const harness = new THREE.MeshStandardMaterial({ color: 0xb0803b, roughness: .91 });
const padding = new THREE.MeshStandardMaterial({ color: 0x3c4443, roughness: .93 });
const helmet = new THREE.SphereGeometry(.5, 16, 12);
const lensDot = new THREE.SphereGeometry(.5, 9, 6);
const steeringWheel = new THREE.TorusGeometry(.116, .019, 6, 17);
const whitewall = new THREE.TorusGeometry(.5, .027, 5, 28).rotateY(Math.PI / 2);
const wheelSpoke = new THREE.BoxGeometry();
const trimBlock = new RoundedBoxGeometry(1, 1, 1, 1, .12);
const bolt = new THREE.CylinderGeometry(.5, .5, 1, 6);
const lensRing = new THREE.TorusGeometry(.5, .044, 6, 24);
const signal = new THREE.MeshStandardMaterial({ color: 0xd78a2b, emissive: 0xc96314, emissiveIntensity: .40, roughness: .27 });
const blackGlass = new THREE.MeshPhysicalMaterial({ color: 0x17282e, metalness: .30, roughness: .17, clearcoat: .95 });
const ivory = new THREE.MeshStandardMaterial({ color: 0xdcd9bf, roughness: .39, metalness: .21 });
const redEnamel = new THREE.MeshStandardMaterial({ color: 0x9a3023, roughness: .36, metalness: .26 });
const plateFace = new THREE.PlaneGeometry();
const plates = new Map();

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
  const geometry = new THREE.TubeGeometry(path, 14, radius, 6);
  geometry.userData.vehicleOwned = true;
  parent.add(new THREE.Mesh(geometry, material));
}

function spring(body, start, end) {
  beam(body, castSteel, start, end, .135);
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const align = new THREE.Quaternion().setFromUnitVectors(yAxis, direction.clone().normalize());
  const points = [];
  for (let i = 0; i <= 42; i++) {
    const progress = i / 42;
    const phase = progress * Math.PI * 12;
    const point = new THREE.Vector3(Math.sin(phase) * .1, direction.length() * (.13 + progress * .71), Math.cos(phase) * .1);
    points.push(point.applyQuaternion(align).add(a));
  }
  const coil = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 44, .020, 5);
  body.add(new THREE.Mesh(coil, accent));
}

function fastener(parent, material, diameter, x, y, z, face = 'z') {
  const head = piece(parent, material, diameter, .018, diameter, x, y, z, bolt);
  if (face === 'x') head.rotation.z = Math.PI / 2;
  if (face === 'z') head.rotation.x = Math.PI / 2;
}

function lightProjector(parent, diameter, x, y, z) {
  piece(parent, trim, diameter * 1.09, .058, diameter * 1.09, x, y, z, cylinder).rotation.x = Math.PI / 2;
  piece(parent, headlamp, diameter, diameter, .03, x, y, z - .038, lensRing);
  piece(parent, blackGlass, diameter * .79, .028, diameter * .79, x, y, z - .023, cylinder).rotation.x = Math.PI / 2;
  piece(parent, headlamp, diameter * .46, diameter * .39, .039, x, y, z - .044, lensDot);
}

function license(parent, id, width, height, y, z, pitch = 0) {
  if (!plates.has(id) && typeof document !== 'undefined') {
    const board = document.createElement('canvas');
    board.width = 128;
    board.height = 48;
    const ink = board.getContext('2d');
    ink.fillStyle = '#e0e5de';
    ink.fillRect(0, 0, 128, 48);
    ink.fillStyle = '#375777';
    ink.fillRect(0, 0, 16, 48);
    ink.fillStyle = '#182631';
    ink.font = 'bold 25px monospace';
    ink.textAlign = 'center';
    ink.textBaseline = 'middle';
    ink.fillText(id, 71, 25, 102);
    const map = new THREE.CanvasTexture(board);
    map.colorSpace = THREE.SRGBColorSpace;
    plates.set(id, new THREE.MeshStandardMaterial({ map, roughness: .64 }));
  }
  piece(parent, plates.get(id) ?? ivory, width, height, 1, 0, y, z, plateFace).rotation.x = pitch;
}

export function fitBikeHelmet(head) {
  head.layers.disableAll();
  piece(head, satin, .243, .262, .286, 0, .123, -.012, helmet);
  piece(head, blackGlass, .215, .095, .176, 0, .146, .068, helmet);
  piece(head, carbon, .188, .089, .162, 0, .059, .063, helmet);
  piece(head, braking, .069, .015, .019, 0, .095, -.151, trimBlock);
}

// Bake only fixed pieces together. Turret, nozzle, wheels and rider retain their pivots.
export function batchVehicleParts(group, castShadow = true) {
  const batches = new Map();
  for (const item of group.children) {
    if (!item.isMesh || item.isInstancedMesh || Array.isArray(item.material)) continue;
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
    geometry.userData.vehicleOwned = true;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = castShadow;
    group.remove(...meshes);
    group.add(mesh);
  }
}

function shell(parent, material, sections, cross, stepsPerSection = 5) {
  const profiles = sections.map(cross);
  const rings = profiles[0].length;
  const steps = (sections.length - 1) * stepsPerSection;
  const tracks = Array.from({ length: rings }, (_, index) => new THREE.CatmullRomCurve3(
    profiles.map((profile, row) => {
      const [x, y, z = sections[row][0]] = profile[index];
      return new THREE.Vector3(x, y, z);
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
  geometry.userData.vehicleOwned = true;
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

function bike(root, color, p) {
  const body = new THREE.Group();
  body.scale.fromArray(p.modelScale);
  root.add(body);
  const roundedProfile = ([, w, low, high]) => profile(w, low, high, .79);
  shell(body, color, [[-.67, .13, .31, .48], [-.52, .212, .25, .604], [-.25, .254, .24, .634],
    [.00, .232, .277, .574], [.24, .15, .32, .49], [.43, .11, .36, .42]], roundedProfile);
  shell(body, color, [[-.99, .162, .32, .415], [-.88, .246, .275, .535], [-.74, .298, .18, .53],
    [-.60, .283, .122, .425], [-.42, .20, .108, .30]], roundedProfile);
  shell(body, blackGlass, [[-.95, .12, .43, .46], [-.84, .162, .481, .522], [-.68, .177, .535, .642],
    [-.54, .124, .598, .737]], roundedProfile);
  shell(body, carbon, [[-.65, .14, -.24, -.11], [-.38, .234, -.286, -.068], [.14, .23, -.277, -.14],
    [.44, .122, -.208, -.106]], roundedProfile);
  shell(body, color, [[.24, .153, .28, .432], [.53, .206, .277, .45], [.85, .195, .304, .529],
    [1.12, .13, .345, .553], [1.26, .07, .39, .49]], roundedProfile);
  shell(body, padding, [[.17, .109, .45, .476], [.30, .172, .414, .465], [.60, .186, .418, .475],
    [.74, .164, .45, .495]], roundedProfile);
  piece(body, satin, .135, .023, .135, 0, .651, -.271, cylinder);
  piece(body, trim, .085, .026, .085, 0, .654, -.271, cylinder);
  piece(body, hub, .405, .33, .52, 0, -.036, .005, trimBlock).rotation.x = -.18;
  piece(body, trim, .37, .274, .09, 0, .041, -.434, trimBlock).rotation.x = .26;
  for (let row = 0; row < 7; row++) piece(body, castSteel, .326, .011, .021, 0, -.056 + row*.028, -.484 - row*.006, wheelSpoke);
  piece(body, trim, .231, .12, .035, 0, .23, 1.252, trimBlock).rotation.x = -.23;
  license(body,'NS 03',.176,.080,.22,1.279,-.23);
  beam(body, trim, [0, .358, 1.11], [0, .267, 1.263], .045);

  const fork = new THREE.Group();
  fork.position.z = -p.length / body.scale.z;
  const slider = new THREE.Group();
  fork.add(slider);
  body.add(fork);
  const axleY = (p.wheelMount - p.rest) / body.scale.y;
  shell(slider, color, [[-.34, .086, axleY + .16, axleY + .193], [-.24, .128, axleY + .29, axleY + .337],
    [-.05, .137, axleY + .345, axleY + .402], [.14, .124, axleY + .318, axleY + .354],
    [.27, .105, axleY + .23, axleY + .26]], roundedProfile);
  beam(fork, castSteel, [-.158,.463,.363], [.158,.463,.363], .060);
  beam(fork, hub, [-.154,.226,.253], [.154,.226,.253], .062);
  beam(slider, castSteel, [-.153,axleY,0], [.153,axleY,0], .046);
  const grip = new THREE.Vector3(.291,.561,.667);

  for (const side of [-1, 1]) {
    const s = side;
    // Thin light blades continue around each side of the fairing.
    const blade = [[s*.064,.367,-1.001],[s*.139,.380,-.99],[s*.222,.416,-.921],[s*.267,.447,-.851]];
    molding(body, trim, blade, .032);
    molding(body, headlamp, blade.map(([x,y,z]) => [x,y+.008,z-.018]), .010);
    piece(body, signal, .027, .034, .091, s*.287, .336, -.775, trimBlock).rotation.x = -.21;
    molding(body, carbon, [[s*.237,.171,-.662],[s*.291,.23,-.592],[s*.294,.374,-.532],[s*.205,.455,-.467]], .023);
    for (let fin = 0; fin < 6; fin++) {
      piece(body, satin, .071, .014, .201, s*.210, .054+fin*.033, -.132-fin*.024, wheelSpoke).rotation.x = -.28;
    }
    piece(body, castSteel, .208, .052, .208, s*.217, -.066, .174, cylinder).rotation.z = Math.PI/2;
    piece(body, hub, .142, .06, .142, s*.245, -.068, .171, cylinder).rotation.z = Math.PI/2;
    for (let i = 0; i < 5; i++) {
      const angle = i*Math.PI*2/5;
      fastener(body, satin,.020,s*.266,-.066+Math.sin(angle)*.074,.171+Math.cos(angle)*.074,'x');
    }
    beam(body, castSteel,[s*.156,.382,-.537],[s*.202,.104,.165],.079);
    beam(body, carbon,[s*.196,.089,.21],[s*.178,axleY,1.12],.094);
    beam(body, satin,[s*.165,axleY,.99],[s*.176,.209,.51],.042);
    beam(body, accent,[s*.176,.015,.85],[s*.183,.173,.562],.074);
    beam(body, satin,[s*.176,-.101,.272],[s*.316,-.101,.272],.052);
    beam(body, trim,[s*.252,-.101,.272],[s*.320,-.101,.272],.061);
    molding(body, braking, [[s*.041,.444,1.27],[s*.095,.468,1.237],[s*.139,.487,1.16]],.018);
    piece(body, signal, .076, .023, .039, s*.119, .313, 1.205, trimBlock);
    beam(body, carbon,[s*.197,.509,-.724],[s*.338,.665,-.729],.025);
    piece(body, color, .164, .068, .093, s*.365, .673, -.736, trimBlock).rotation.y = s*.27;
    piece(body, lens, .128, .051, .014, s*.376, .675, -.689, trimBlock).rotation.y = s*.27;
    const x = s*.137;
    beam(fork, accent,[x,.109,.127],[x,.481,.374],.065);
    beam(slider, satin,[x,axleY,.002],[x,.166,.159],.044);
    beam(slider, hub,[x,axleY,.002],[x,axleY+.137,.045],.074);
    piece(slider, redEnamel,.040,.102,.072,s*.112,axleY+.064,.108,trimBlock).rotation.x = -.27;
    molding(fork, satin,[[s*.096,.494,.404],[s*.164,.548,.527],[s*.228,.557,.654],[s*.249,.56,.663]],.019);
    beam(fork, trim,[s*.242,.56,.659],[s*.340,.563,.675],.049);
    beam(fork, satin,[s*.254,.557,.603],[s*.343,.551,.637],.016);
  }

  // Offset exhaust deliberately leaves the chain and swingarm exposed.
  molding(body, castSteel, [[.103,-.01,-.30],[.16,-.194,-.23],[.227,-.225,.144],[.284,-.099,.55]], .036);
  beam(body, satin,[.284,-.099,.49],[.292,.074,1.013],.125);
  beam(body, carbon,[.29,.046,.922],[.293,.087,1.051],.134,true);
  beam(body, castSteel,[.292,.069,.997],[.293,.087,1.055],.094,true);
  beam(body, hub,[-.134,-.146,.208],[-.147,axleY+.119,1.12],.044);
  beam(body, trim,[-.14,-.292,.25],[-.15,axleY-.079,1.12],.033);
  for (let link = 0; link < 13; link++) {
    const t = link/12;
    piece(body, castSteel,.039,.019,.027,-.148,-.289-.16*t,.26+.86*t,wheelSpoke).rotation.x = -.18;
  }
  batchVehicleParts(slider);
  batchVehicleParts(fork);
  batchVehicleParts(body);
  return { frame: body, fork, slider, grip };
}

function makeTracks(body) {
  const path = new THREE.Path();
  path.moveTo(-1.44, .018);
  path.lineTo(1.44, .018);
  path.quadraticCurveTo(1.88, .018, 1.88, -.40);
  path.quadraticCurveTo(1.88, -.83, 1.44, -.83);
  path.lineTo(-1.44, -.83);
  path.quadraticCurveTo(-1.88, -.83, -1.88, -.40);
  path.quadraticCurveTo(-1.88, .018, -1.44, .018);
  const count = 48;
  const length = path.getLength();
  const pitch = length/count;
  const shapes = [
    trimBlock.clone().scale(.402,.055,pitch*.89),
    wheelSpoke.clone().scale(.184,.031,pitch*.23).rotateY(.30).translate(-.094,.034,0),
    wheelSpoke.clone().scale(.184,.031,pitch*.23).rotateY(-.30).translate(.094,.034,0),
    wheelSpoke.clone().scale(.040,.042,pitch*.51).translate(-.184,.006,0),
    wheelSpoke.clone().scale(.040,.042,pitch*.51).translate(.184,.006,0),
  ];
  const unindexed = shapes.map(shape => shape.index ? shape.toNonIndexed() : shape);
  const template = mergeGeometries(unindexed);
  for (const shape of new Set([...shapes, ...unindexed])) shape.dispose();
  template.userData.vehicleOwned = true;
  const pads = [-1, 1].map(side => {
    const mesh = new THREE.InstancedMesh(template, beltRubber, count);
    mesh.position.x = side * 1.055;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.castShadow = true;
    body.add(mesh);
    return mesh;
  });
  const pose = new THREE.Object3D();
  const here = new THREE.Vector2();
  const ahead = new THREE.Vector2();
  let phase = 0;
  function roll(distance) {
    phase = (phase + distance / length) % 1;
    for (let i = 0; i < count; i++) {
      const spot = (i / count + phase + 1) % 1;
      path.getPointAt(spot, here);
      path.getPointAt((spot + .001) % 1, ahead);
      pose.position.set(0, here.y, here.x);
      pose.rotation.x = Math.atan2(here.y - ahead.y, ahead.x - here.x);
      pose.updateMatrix();
      for (const pad of pads) pad.setMatrixAt(i, pose.matrix);
    }
    for (const pad of pads) pad.instanceMatrix.needsUpdate = true;
  }
  roll(0);
  return roll;
}

function serviceTank(body, color) {
  const steel = paint(0x425a60);
  shell(body, color, [[-2.0, .90, -.43, .24], [-1.65, 1.11, -.41, .40], [-.62, 1.11, -.29, .53],
    [.87, 1.10, -.31, .50], [1.70, 1.08, -.34, .42], [1.98, .97, -.37, .33]], ([, w, y, h]) => profile(w, y, h, .93));
  for (const side of [-1, 1]) {
    const x = side * 1.04;
    piece(body, steel, .443, .158, 3.53, x, .147, -.009,trimBlock);
    piece(body, hub, .079, .093, 3.25, x+side*.196, .102, 0,trimBlock);
    piece(body, trim, .415, .13, .38, x, .077, -1.678,trimBlock).rotation.x = -.20;
    piece(body, trim, .415, .13, .38, x, .077, 1.674,trimBlock).rotation.x = .20;
    piece(body, trim, .316, .566, 3.12, x+side*.002, -.409, 0,trimBlock);
    piece(body, castSteel, .226, .420, 2.52, x+side*.083, -.408, 0,trimBlock);
    piece(body, hub, .087, .076, 2.88, x+side*.178, -.231, 0,trimBlock);
    for (const z of [-1.07,-.542,0,.542,1.07]) {
      piece(body, steel,.089,.254,.477,x+side*.147,-.424,z,trimBlock);
      piece(body, trim,.033,.057,.140,x+side*.191,-.489,z,trimBlock);
      fastener(body,castSteel,.037,x+side*.201,-.338,z-.127,'x');
      fastener(body,castSteel,.037,x+side*.201,-.338,z+.126,'x');
    }
    piece(body, trim,.358,.043,.598,side*.630,.422,1.350,trimBlock).rotation.x=.070;
    for (let slat=0;slat<8;slat++) piece(body,castSteel,.294,.026,.033,side*.63,.476-slat*.006,1.117+slat*.061,wheelSpoke).rotation.x=.32;
    piece(body, castSteel,.383,.065,.285,side*.70,.430,1.728,trimBlock);
    piece(body, signal,.132,.025,.020,side*.939,.275,1.846,trimBlock);
    lightProjector(body,.144,side*.723,.210,-1.987);
    piece(body, braking,.118,.065,.027,side*.749,.187,1.995,trimBlock);
    piece(body, reverse,.055,.041,.027,side*.645,.182,1.998,trimBlock);
    piece(body, ivory,.012,.049,1.39,side*1.110,.296,.073,trimBlock);
    for (const end of [-1, 1]) {
      const z=end*1.93;
      beam(body,castSteel,[side*.682,.127,z-.08*end],[side*.680,.123,z+.138*end],.080);
      piece(body,redEnamel,.139,.108,.049,side*.680,.123,z+.135*end,trimBlock);
    }
    molding(body,satin,[[side*.845,.462,-1.26],[side*.845,.538,-1.14],[side*.849,.567,-.70],[side*.854,.504,-.589]],.021);
    molding(body,satin,[[side*.856,.447,.991],[side*.855,.573,1.109],[side*.855,.545,1.586],[side*.855,.439,1.725]],.021);
    piece(body,steel,.270,.162,.456,side*.793,.526,.459,trimBlock);
    beam(body,satin,[side*.809,.619,.353],[side*.809,.619,.521],.024);
    for (const z of [.258,.648]) fastener(body,hub,.040,side*.793,.609,z,'y');
  }
  piece(body, trim,.793,.154,.055,0,.105,1.993,trimBlock);
  for (let step=0;step<3;step++) piece(body,castSteel,.611,.024,.063,0,.061+step*.045,2.029,wheelSpoke);
  piece(body, steel,.722,.032,.282,0,.376,-1.745,trimBlock).rotation.x=.32;
  for (let i=-2;i<=2;i++) piece(body,trim,.089,.023,.128,i*.116,.410,-1.712,wheelSpoke).rotation.x=.29;
  for (const x of [-.30,.30]) fastener(body,satin,.042,x,.438,-1.603,'y');
  const roll = makeTracks(body);
  const turret = new THREE.Group();
  turret.position.set(0, .55, .08);
  body.add(turret);
  piece(turret, hub, 1.43, .19, 1.43, 0, 0, 0, cylinder);
  shell(turret, steel, [[-.69, .43, .04, .34], [-.42, .64, .04, .52], [.34, .67, .05, .55], [.70, .53, .04, .41]],
    ([, w, y, h]) => profile(w, y, h, .85));
  piece(turret, trim,.551,.062,.364,-.178,.552,.224,trimBlock);
  piece(turret, steel,.482,.043,.298,-.178,.581,.224,trimBlock).rotation.x=-.064;
  beam(turret,satin,[-.308,.603,.229],[-.083,.603,.229],.026);
  piece(turret,hub,.36,.041,.36,.324,.553,.27,cylinder);
  piece(turret,castSteel,.302,.044,.302,.324,.574,.27,cylinder);
  beam(turret,trim,[.247,.607,.27],[.411,.607,.27],.025);
  for (let i=0;i<8;i++) {
    const angle=i*Math.PI/4;
    fastener(turret,satin,.022,.324+Math.cos(angle)*.169,.581,.27+Math.sin(angle)*.169,'y');
  }
  for (const side of [-1, 1]) {
    beam(turret, trim, [side * .37, .34, -.30], [side * .32, .21, -.59], .069);
    molding(turret, hub, [[side * .32, .21, -.57], [side * .23, .12, -.34], [side * .17, .23, -.14]], .034);
    piece(turret, color,.074,.156,.497,side*.605,.194,.164,trimBlock);
    for (const z of [-.015,.338]) fastener(turret,castSteel,.038,side*.649,.186,z,'x');
    molding(turret,trim,[[side*.224,.34,-.57],[side*.453,.385,-.38],[side*.488,.431,-.17]],.030);
  }
  piece(turret, blackGlass,.301,.121,.035,-.282,.382,-.569,trimBlock).rotation.y=-.24;
  piece(turret, headlamp,.121,.055,.029,.318,.356,-.568,trimBlock).rotation.y=.24;
  beam(turret, hub,[.466,.39,.54],[.47,.578,.576],.073);
  beam(turret, trim,[.47,.52,.57],[.46,.98,.61],.021);
  const nozzle = new THREE.Group();
  nozzle.position.set(0, .34, -.46);
  turret.add(nozzle);
  beam(nozzle, satin,[0,0,-.09],[0,0,-1.37],.173);
  beam(nozzle, steel,[0,0,-.14],[0,0,-.665],.284);
  for (const s of [-1,1]) {
    beam(nozzle,castSteel,[s*.154,0,.026],[s*.154,0,-.45],.053);
    beam(nozzle,hub,[s*.174,0,.01],[s*.118,0,.01],.173);
  }
  for (const z of [-.745,-1.24]) beam(nozzle,castSteel,[0,0,z+.033],[0,0,z-.033],.207);
  beam(nozzle, satin,[0,0,-1.34],[0,0,-1.866],.287,true);
  beam(nozzle, hub,[0,0,-1.663],[0,0,-1.91],.351,true);
  beam(nozzle, trim,[0,0,-1.559],[0,0,-1.891],.223,true);
  beam(nozzle, castSteel,[0,0,-1.871],[0,0,-1.921],.372,true);
  piece(nozzle,lens,.208,.028,.208,0,0,-1.741,cylinder).rotation.x=Math.PI/2;
  batchVehicleParts(nozzle);
  batchVehicleParts(turret);
  return { turret, nozzle, roll };
}

function flaredFender(body, skin, p, side, axle, monster) {
  const outer = p.axle + p.tireWidth / 2 + (monster ? .069 : .073);
  const reach = p.radius + (monster ? .101 : .117);
  const rise = monster ? .52 : .39;
  const positions = [], uv = [], indices = [], lip = [];
  const rows = 16;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const angle = (t * 2 - 1) * 1.37;
    const taper = Math.abs(t * 2 - 1);
    const z = axle + Math.sin(angle) * reach;
    const y = -.148 + Math.cos(angle) ** .91 * rise;
    const edge = outer - (monster ? .24 : .178) * taper ** 2;
    const section = [[p.width * .81, y + .035], [edge - .042, y + .008], [edge, y - .025], [edge - .011, y - .086]];
    for (let j = 0; j < section.length; j++) {
      positions.push(side * section[j][0], section[j][1], z);
      uv.push(j / 3, t);
      if (!i || !j) continue;
      const a = (i - 1) * 4 + j - 1, b = a + 1, c = a + 4, d = c + 1;
      if (side > 0) indices.push(a,c,b,b,c,d);
      else indices.push(a,b,c,b,d,c);
    }
    lip.push([side * (edge - .007), y - .082, z]);
    if (i % 4 === 2) fastener(body,castSteel,.025,side * (edge + .005),y-.047,z,'x');
  }
  const shape = new THREE.BufferGeometry();
  shape.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  shape.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
  shape.setIndex(indices);
  shape.computeVertexNormals();
  shape.userData.vehicleOwned = true;
  body.add(new THREE.Mesh(shape,skin));
  molding(body,trim,lip,.027);
}

function truckRunningGear(root, p, monster) {
  const axleY = -.10 - p.rest;
  const railY = p.bodyLift - (monster ? .39 : .35);
  const railX = p.width * (monster ? .49 : .56);
  const halfWidth = p.axle - p.tireWidth * .19;
  const direction = new THREE.Vector3();
  for (const side of [-1,1]) {
    beam(root,castSteel,[side*railX,railY,-1.91],[side*railX,railY,1.91],monster ? .115 : .078);
    if (monster) {
      beam(root,trim,[side*railX,.49,-1.81],[side*railX,.49,1.78],.104);
      for (const z of [-1.62,-.61,.61,1.62]) {
        beam(root,castSteel,[side*railX,.48,z],[side*railX,railY,z+.24*Math.sign(z)],.094);
      }
    }
  }
  for (const z of [-1.28,0,1.28]) beam(root,hub,[-railX,railY,z],[railX,railY,z],.091);
  piece(root,castSteel,.52,.083,.53,0,railY-.051,-1.20,trimBlock).rotation.x = -.12;
  if (monster) beam(root,castSteel,[0,-.22,-1.19],[0,-.22,1.19],.120);

  const axles = [-p.length,p.length].map(z => {
    const assembly = new THREE.Group();
    assembly.position.set(0,axleY,z);
    root.add(assembly);
    beam(assembly,castSteel,[-halfWidth,0,0],[halfWidth,0,0],monster ? .133 : .086);
    piece(assembly,hub,monster ? .405 : .273,monster ? .339 : .212,.304,0,0,0,trimBlock);
    piece(assembly,monster ? redEnamel : castSteel,monster ? .29 : .183,.172,.043,0,0,.149,trimBlock);
    for (const side of [-1,1]) {
      piece(assembly,hub,.13,.17,.173,side*halfWidth,0,0,trimBlock);
    }
    batchVehicleParts(assembly);

    const arms = [];
    if (monster) for (const side of [-1,1]) {
      const end = Math.sign(z);
      const shock = new THREE.Group();
      spring(shock,[0,0,0],[0,1,0]);
      batchVehicleParts(shock);
      root.add(shock);
      arms.push({
        view: shock, x: side * (halfWidth - .15), upperY: .43, upperX: side * railX,
        upperZ: z - end * .27, baseZ: z - end * .14,
      });
      for (const [height,anchorZ,baseZ,material] of [
        [railY-.23,z-end*.74,0,redEnamel], [railY-.04,z-end*.60,-end*.082,castSteel],
      ]) {
        const arm = new THREE.Group();
        beam(arm,material,[0,0,0],[0,1,0],.071).castShadow = true;
        root.add(arm);
        arms.push({ view:arm, x:side*(halfWidth-.12), upperY:height, upperX:side*railX,
          upperZ:anchorZ, baseZ:z+baseZ });
      }
    }
    return { assembly, arms };
  });
  function moveAxles(wheels) {
    for (let i = 0; i < axles.length; i++) {
      const { assembly, arms } = axles[i];
      const left = -.10 - (wheels?.[i*2].suspensionLength ?? p.rest);
      const right = -.10 - (wheels?.[i*2+1].suspensionLength ?? p.rest);
      assembly.position.y = (left + right) / 2;
      assembly.rotation.z = Math.atan2(right - left, p.axle * 2);
      for (const arm of arms) {
        const lowerY = THREE.MathUtils.lerp(left,right,(arm.x / p.axle + 1) / 2);
        direction.set(arm.upperX-arm.x,arm.upperY-lowerY,arm.upperZ-arm.baseZ);
        const length = direction.length();
        arm.view.position.set(arm.x,lowerY,arm.baseZ);
        arm.view.quaternion.setFromUnitVectors(yAxis,direction.multiplyScalar(1/length));
        arm.view.scale.y = length;
      }
    }
  }
  moveAxles();
  return moveAxles;
}

function truck(root, p, color, monster) {
  const body = new THREE.Group();
  body.position.y = p.bodyLift;
  root.add(body);
  const w = p.width;
  const arch = z => {
    const distance = Math.abs(Math.abs(z)-p.length)/(monster ? .82 : .63);
    return -.26 + (monster ? .40 : .375)*Math.sqrt(Math.max(0,1-distance*distance));
  };
  const sections = [
    [-p.depth, .85, .428], [-1.93, .929, .488], [-1.59, 1.018, .525], [-1.28, 1.015, .556],
    [-.95, .963, .575], [-.48, .938, .561], [.39, .932, .544], [.83, .954, .537],
    [1.20, .997, .523], [1.56, 1.035, .503], [1.90, .954, .465], [p.depth, .894, .419],
  ];
  shell(body, color, sections, ([z, width, top]) => {
    const contour = profile(w*width, arch(z), top, .86);
    if (!monster) return contour;
    const dip = .25 * THREE.MathUtils.smoothstep(z,.62,.83) * (1-THREE.MathUtils.smoothstep(z,1.85,2.05));
    return [...contour.slice(0,5), [w*width*.68,top-dip], [0,top-dip], [-w*width*.68,top-dip], ...contour.slice(6)];
  });
  const roofEnd = monster ? .73 : 1.66;
  const cabin = [
    [-1.11,.79,.516,.577], [-.84,.85,.54,.833], [-.49,.812,.54,1.092], [-.27,.808,.536,1.152],
    [roofEnd-.32,.817,.521,1.148], [roofEnd-.14,.821,.515,1.105], [roofEnd,.809,.504,monster ? .543 : .971],
  ];
  shell(body, blackGlass, cabin, ([, width, base, top]) => profile(width*w,base,top,.88));
  shell(body, color, cabin.slice(2,-1), ([, width, , top]) => profile(w*width*.994,top-.053,top+.049,.88), 7);

  const front = -p.depth;
  const rear = p.depth;
  piece(body, trim, w*1.734, .238, .229, 0, .071, front+.018, trimBlock);
  piece(body, castSteel, w*(monster ? 1.58 : 1.44), .074, .211, 0, -.058, front+.057, trimBlock).rotation.x = -.16;
  piece(body, trim, w*1.783, .228, .212, 0, .024, rear+.024, trimBlock);
  piece(body, hub, w*1.25, .033, .20, 0, .098, rear+.028, trimBlock);
  piece(body, trim, .338, .13, .036, 0, .200, rear+.048, trimBlock);
  license(body,monster?'NS 02':'NS 01',.286,.088,.200,rear+.074);
  for (const s of [-1,1]) fastener(body, trim, .014, s*.111, .229, rear+.079);
  if (monster) {
    piece(body, trim, 1.42, .236, .09, 0, .27, front-.029, trimBlock);
    for (let i = 0; i < 5; i++) piece(body, hub, 1.12, .012, .012, 0, .191+i*.036, front-.082,wheelSpoke);
    for (let i = -6; i <= 6; i++) piece(body, castSteel, .012, .18, .009, i*.083, .265, front-.087,wheelSpoke);
    shell(body, carbon, [[-1.96,.22,.483,.514],[-1.57,.276,.517,.619],[-1.24,.244,.538,.638],[-1.08,.165,.548,.577]],
      ([, width, low, high]) => profile(width,low,high,.84));
    piece(body, trim, .308, .105, .032, 0,.573,-1.608,trimBlock);
    for (let i=-2; i<=2; i++) piece(body, hub,.011,.080,.014,i*.058,.573,-1.628,wheelSpoke);
  } else {
    piece(body, trim, 1.082, .272, .090, 0,.258,front-.029,trimBlock);
    for (let i=-3; i<=3; i++) {
      const x = i*.144;
      piece(body, satin,.111,.196,.037,x,.263,front-.079,trimBlock);
      piece(body, trim,.081,.167,.035,x,.263,front-.093,trimBlock);
      for (let row=0;row<4;row++) piece(body, hub,.066,.011,.009,x,.202+row*.041,front-.112,wheelSpoke);
    }
    piece(body, hub,.358,.106,.152,0,.042,front-.105,trimBlock);
    beam(body, castSteel,[-.125,.049,front-.177],[.125,.049,front-.177],.046);
    beam(body, satin,[-.10,.049,front-.197],[.10,.049,front-.197],.023);
    piece(body, carbon,1.26,.042,.67,0,1.211,.49,trimBlock);
    for (const z of [.23,.72]) beam(body, castSteel,[-.64,1.247,z],[.64,1.247,z],.042);
  }
  for (const side of [-1, 1]) {
    const x = side*w;
    if (monster) {
      const led = [[x*.594,.337,front-.085],[x*.773,.343,front-.071],[x*.857,.381,front+.02],[x*.903,.374,front+.19]];
      molding(body, trim, led, .058);
      molding(body, headlamp, led.map(([u,y,z])=>[u,y+.021,z-.043]), .017);
      piece(body, braking,.246,.115,.064,x*.755,.305,rear+.043,trimBlock);
      piece(body, reverse,.119,.027,.041,x*.759,.254,rear+.067,trimBlock);
    } else {
      lightProjector(body,.258,x*.652,.326,front-.039);
      piece(body, signal,.102,.039,.061,x*.805,.223,front+.007,trimBlock).rotation.y = side*.24;
      lightProjector(body,.097,x*.659,.060,front-.118);
      piece(body, trim,.162,.251,.060,x*.81,.298,rear+.040,trimBlock);
      for (const y of [.249,.300,.351]) piece(body, braking,.101,.038,.020,x*.815,y,rear+.077,trimBlock);
      piece(body, reverse,.081,.026,.021,x*.813,.209,rear+.071,trimBlock);
    }
    beam(body, redEnamel,[x*.55,-.029,front+.045],[x*.57,-.066,front-.173],.063);
    beam(body, castSteel,[x*.55,-.02,rear-.054],[x*.57,-.061,rear+.159],.053);
    const seam = [[x*.81,.569,-1.10],[x*.854,.58,-.81],[x*.895,.556,-.32],[x*.894,.542,.45],[x*.866,.523,roofEnd-.06]];
    molding(body, trim,seam,.026);
    molding(body, color,[[x*.801,.605,-1.02],[x*.775,.865,-.726],[x*.719,1.098,-.431]],.044);
    for (const [z, lean] of (monster ? [[.60,-.16]] : [[.17,0],[.97,-.09],[1.54,-.074]])) {
      beam(body,color,[x*.839,.551,z],[x*.775,1.087,z+lean],.078);
      if (monster || z<1.4) {
        molding(body,trim,[[x*.953,.532,z],[x*.942,.304,z+.024],[x*.891,.089,z+.05]],.011);
        piece(body,trim,.037,.049,.138,x*.932,.412,z-.132,trimBlock);
        piece(body,satin,.024,.016,.087,x*.953,.415,z-.132,trimBlock);
      }
    }
    beam(body,trim,[x*.821,.593,-.755],[x*1.036,.661,-.756],.064);
    piece(body,color,.203,.113,.165,x*1.064,.677,-.750,trimBlock).rotation.y=side*.18;
    piece(body,lens,.162,.078,.018,x*1.067,.679,-.653,trimBlock).rotation.y=side*.18;
    piece(body,signal,.125,.018,.018,x*1.069,.665,-.836,trimBlock).rotation.y=side*.18;
    molding(body,trim,[[x*.902,.301,-1.96],[x*.986,.369,-1.49],[x*.965,.387,-.92],
      [x*.939,.378,.38],[x*1.009,.336,1.49],[x*.926,.305,1.97]],.014);
    piece(body,carbon,.123,.071,1.54,x*.932,-.197,.05,trimBlock);
    if (!monster) {
      beam(body,castSteel,[x*.967,-.258,-.71],[x*.967,-.258,.74],.081);
      for (const z of [-.38,.38]) {
        piece(body,trim,.183,.046,.271,x*.975,-.228,z,trimBlock);
        for (let i=-2;i<=2;i++) piece(body,hub,.154,.011,.015,x*.987,-.201,z+i*.041,wheelSpoke);
      }
      beam(body,satin,[x*.629,1.174,-.24],[x*.639,1.168,1.36],.055);
    }
    for (const axle of [-p.length,p.length]) flaredFender(body,monster ? color : trim,p,side,axle,monster);
    molding(body,trim,[[x*.12,.603,-1.104],[x*.39,.669,-1.012],[x*.62,.722,-.949]],.012);
  }
  if (monster) {
    piece(body,carbon,1.39,.048,.91,0,.283,1.284,trimBlock);
    for (let i=-4;i<=4;i++) piece(body,hub,.024,.013,.79,i*.147,.315,1.26,wheelSpoke);
    molding(body,castSteel,[[-.69,.50,.776],[-.61,.991,.863],[0,1.011,.863],[.61,.991,.863],[.69,.50,.776]],.055);
    for (const side of [-1, 1]) {
      beam(body,castSteel,[side*.61,.971,.863],[side*.725,.484,1.715],.101);
      beam(body,trim,[side*.709,.507,1.681],[-side*.541,.899,.919],.044);
      beam(body,satin,[side*.459,-.036,1.61],[side*.466,-.010,2.192],.088,true);
    }
  } else {
    piece(body,color,1.61,.109,.085,0,.55,1.729,trimBlock);
    piece(body,braking,.370,.026,.040,0,1.053,1.604,trimBlock);
    molding(body,trim,[[-.424,.780,1.681],[.062,.724,1.699],[.323,.748,1.688]],.016);
    piece(body,trim,.815,.198,.815,0,.527,2.061,cylinder).rotation.x=Math.PI/2;
    piece(body,hub,.591,.21,.591,0,.527,2.080,cylinder).rotation.x=Math.PI/2;
    piece(body,color,.521,.217,.521,0,.527,2.107,cylinder).rotation.x=Math.PI/2;
    piece(body,castSteel,.208,.026,.208,0,.527,2.227,cylinder).rotation.x=Math.PI/2;
    for (let i=0;i<24;i++) {
      const angle = i/24*Math.PI*2;
      piece(body,trim,.065,.020,.166,Math.cos(angle)*.41,.527+Math.sin(angle)*.41,2.065,wheelSpoke).rotation.z=angle-Math.PI/2;
    }
  }
  batchVehicleParts(body);
  return truckRunningGear(root,p,monster);
}

function formula(body, color, white = paint(0xe5ded0), stockWing = true, stockExhaust = true, visor = lens,
  stockMirrors = true, stockTail = true) {
  shell(body, color, [[-2.29, .133, -.13, -.015], [-1.67, .204, -.17, .09], [-.91, .28, -.20, .21],
    [-.59, .53, -.22, .215], [.18, .74, -.22, .225], [.76, .61, -.20, .43],
    [1.26, .34, -.19, .28], [1.84, .24, -.14, .084]], ([, w, y, h]) => profile(w, y, h, .75));
  shell(body, carbon, [[-1.04, .35, -.227, -.19], [-.63, .66, -.249, -.205], [.12, .81, -.251, -.194],
    [.73, .70, -.247, -.188], [1.63, .44, -.189, -.108]], ([, w, y, h]) => profile(w, y, h, .93));
  piece(body, carbon, .61, .081, .75, 0, .233, .04);
  piece(body, white, .335, .302, .343, 0, .412, .244, helmet);
  piece(body, visor, .311, .116, .189, 0, .452, .134, helmet);
  molding(body, carbon, [[-.30, .23, .13], [-.24, .465, -.16], [0, .491, -.32], [.24, .465, -.16], [.30, .23, .13]], .042);
  beam(body, carbon, [0, .25, -.70], [0, .491, -.32], .052);
  piece(body, carbon, .243, .206, .244, 0, .480, .668);
  piece(body, white, .321, .048, .295, 0, .586, .701);
  piece(body, carbon, 2.10, .049, .386, 0, -.153, -2.08);
  piece(body, color, 1.98, .051, .258, 0, -.073, -1.96).rotation.x = -.22;
  if (stockWing) {
    piece(body, carbon, 1.47, .064, .35, 0, .584, 1.96);
    piece(body, white, 1.47, .051, .205, 0, .714, 2.01).rotation.x = -.18;
  }
  piece(body, carbon, .59, .072, .44, 0, -.185, 1.81).rotation.x = .18;
  if (stockExhaust) beam(body, castSteel, [0, .154, 1.63], [0, .155, 1.98], .114, true);
  if (stockTail) piece(body, braking, .154, .063, .039, 0, -.026, 1.98);
  for (const side of [-1, 1]) {
    piece(body, carbon, .063, .181, .40, side * 1.006, -.05, -2.04).rotation.y = side * .08;
    piece(body, color, .072, .097, .504, side * .98, -.033, -1.97);
    if (stockWing) {
      piece(body, carbon, .071, .303, .46, side * .742, .574, 1.969).rotation.y = -side * .075;
      piece(body, color, .089, .304, .134, side * .258, .411, 1.86).rotation.x = -.20;
    }
    piece(body, white, .115, .035, .95, side * .54, .219, .12).rotation.y = -side * .090;
    piece(body, carbon, .188, .098, .464, side * .545, .172, -.497).rotation.y = side * .16;
    if (stockMirrors) {
      beam(body, carbon, [side * .235, .267, -.234], [side * .44, .340, -.200], .025);
      piece(body, color, .139, .063, .111, side * .444, .345, -.197);
      piece(body, satin, .112, .052, .019, side * .454, .343, -.136);
    }
    for (let louver = 0; louver < 5; louver++) {
      piece(body, carbon, .131, .019, .047, side * (.48 - louver * .022), .311 + .016 * louver, .493 + .074 * louver).rotation.y = side * .22;
    }
    for (const at of [-1.45, 1.45]) {
      beam(body, trim, [side * .30, -.05, at - .27], [side * .86, -.09, at], .052);
      beam(body, trim, [side * .31, -.15, at + .22], [side * .86, -.12, at], .056);
    }
  }
}

function buggy(body, color) {
  shell(body, color, [[-1.72, .39, -.27, .057], [-1.42, .52, -.289, .195], [-1.02, .62, -.28, .289],
    [-.61, .735, -.29, .215], [.53, .69, -.29, .20], [1.16, .618, -.28, .272], [1.70, .49, -.253, .14]],
    ([, w, y, h]) => profile(w, y, h, .82));
  const canopy = new THREE.MeshStandardMaterial({ color: 0x30494b, roughness: .62, metalness: .16, side: THREE.DoubleSide });
  piece(body, canopy, 1.20, .049, .88, 0, .942, -.10);
  piece(body, carbon, 1.084, .085, .98, 0, .242, .273);
  piece(body, trim, .818, .137, .157, 0, .42, -.535);
  piece(body, lens, .205, .061, .042, -.26, .459, -.447);
  piece(body, carbon, 1, 1, 1, -.26, .49, -.366, steeringWheel).rotation.x = -.29;
  const pilot = new THREE.Group();
  body.add(pilot);
  piece(pilot, padding, .315, .363, .171, -.26, .439, .23).rotation.x = -.11;
  piece(pilot, satin, .248, .254, .24, -.26, .679, .201, helmet);
  piece(pilot, lens, .223, .073, .161, -.26, .680, .128, helmet);
  for (const arm of [-1, 1]) {
    const x = -.26 + arm * .112;
    beam(pilot, padding, [x + arm * .03, .523, .207], [x + arm * .035, .433, -.154], .091);
    beam(pilot, trim, [x + arm * .035, .433, -.154], [x, .50, -.364], .061);
  }
  piece(body, trim, .52, .147, .073, 0, .072, -1.703);
  piece(body, castSteel, .466, .029, .04, 0, .062, -1.749);
  piece(body, carbon, .294, .018, .505, 0, .268, -1.035).rotation.x = -.08;
  for (let slot = 0; slot < 7; slot++) piece(body, castSteel, .224, .021, .019, 0, .289 + slot * .0037, -1.242 + .055 * slot);
  beam(body, castSteel, [-.57, .903, -.48], [.57, .903, -.48], .084);
  piece(body, trim, .849, .104, .115, 0, .895, -.507);
  for (let n = -4; n <= 4; n++) piece(body, headlamp, .077, .043, .024, n * .086, .902, -.572, lensDot);
  beam(body, satin, [-.17, .22, 1.09], [-.17, .27, 1.79], .116, true);
  beam(body, satin, [.17, .22, 1.09], [.17, .27, 1.79], .116, true);
  piece(body, carbon, .705, .123, .87, 0, .292, 1.151);
  for (let fin = -3; fin <= 3; fin++) piece(body, castSteel, .034, .038, .46, fin * .082, .377, 1.092);
  for (const side of [-1, 1]) {
    const x = side * .60;
    piece(body, trim, .359, .53, .192, side * .258, .448, .39).rotation.x = -.18;
    piece(body, padding, .296, .369, .06, side * .258, .481, .296).rotation.x = -.18;
    piece(body, padding, .304, .096, .302, side * .258, .278, .22);
    piece(body, harness, .034, .349, .019, side * .258 - .072, .478, .259).rotation.x = -.18;
    piece(body, harness, .034, .349, .019, side * .258 + .072, .478, .259).rotation.x = -.18;
    molding(body, castSteel, [[x, .22, -.91], [x, .83, -.49], [x, .93, -.34],
      [x, .93, .57], [x, .85, .67], [x, .30, 1.29]], .053);
    beam(body, castSteel, [x, .43, -.70], [x, .42, .73], .065);
    beam(body, castSteel, [x, .86, .48], [x, .22, .20], .071);
    for (const z of [-1.16, 1.16]) {
      const out = [x * 1.51, -.35, z];
      spring(body, [x * .89, .345, z * .83], out);
      beam(body, satin, [x * .71, -.22, z + .24], out, .058);
      beam(body, satin, [x * .71, -.23, z - .26], out, .057);
      beam(body, castSteel, [x * .68, -.20, z], [x * 1.51, -.20, z], .088);
    }
    piece(body, headlamp, .20, .13, .07, side * .41, .193, -1.65);
    piece(body, braking, .18, .12, .06, side * .38, .29, 1.66);
    for (const z of [-1.14, 1.18]) {
      molding(body, trim, [[side * .78, .025, z - .51], [side * .90, .284, z - .28], [side * .92, .339, z],
        [side * .90, .285, z + .28], [side * .79, .028, z + .49]], .059);
      piece(body, carbon, .265, .035, .46, side * .825, .302, z);
    }
    beam(body, carbon, [x, .559, -.699], [x * 1.26, .635, -.693], .037);
    piece(body, castSteel, .20, .09, .12, x * 1.33, .640, -.693);
    piece(body, lens, .169, .067, .018, x * 1.33, .641, -.622);
    piece(body, color, .151, .285, .639, x * 1.11, .145, -.098).rotation.z = side * -.106;
    piece(body, satin, .059, .027, .169, x * 1.247, .183, -.062);
  }
  beam(body, castSteel, [-.70, -.01, -1.73], [.70, -.01, -1.73], .087);
  beam(body, castSteel, [-.59, .29, 1.76], [.59, .29, 1.76], .081);
  const spare = piece(body, tireRubber, .69, .197, .69, 0, .463, 1.133, cylinder);
  spare.rotation.x = -.27;
  piece(body, hub, .397, .205, .397, 0, .473, 1.133, cylinder).rotation.x = -.27;
  for (const side of [-1, 1]) beam(body, harness, [side * .221, .548, .91], [-side * .213, .533, 1.33], .038);
  batchVehicleParts(pilot);
  return pilot;
}

export function buildUtilityBody(body, kind, preset) {
  const color = paint(preset.color);
  let equipment = null, pilot = null, frontFork = null, moveAxles = null;
  if (kind === 'bike') frontFork = bike(body, color, preset);
  else if (kind === 'tank') equipment = serviceTank(body, color);
  else if (kind === 'formula') formula(body, color);
  else if (kind === 'buggy') pilot = buggy(body, color);
  else moveAxles = truck(body, preset, color, kind === 'monster');
  batchVehicleParts(body);
  return { equipment, pilot, frontFork, moveAxles };
}

const cityWheelStyles = {
  jeep: { type: 'split', trim: hub, scale: .93, blocks: 32 },
  monster: { type: 'deep', trim: castSteel, scale: .87, blocks: 38, hubWidth: .40 },
  bike: { type: 'turbine', trim: castSteel, scale: 1.05 },
};
const rotorRing = new THREE.RingGeometry(.48, .81, 28);

export function buildCityWheel(kind, { radius, tireWidth }, face, front) {
  const pack = cityWheelStyles[kind];
  if (!pack) return null;
  const bike = kind === 'bike';
  const monster = kind === 'monster';
  const width = bike ? (front ? .137 : .191) : tireWidth;
  const wheel = buildWheel(radius,width,bike ? 5 : monster ? 8 : 10,face,true,false,
    { type: pack.type, rim: pack.trim, scale: pack.scale, hubWidth: pack.hubWidth });
  if (pack.blocks) {
    const blocks = new THREE.InstancedMesh(trimBlock, tireRubber, pack.blocks);
    const pose = new THREE.Object3D();
    for (let i = 0; i < blocks.count; i++) {
      const angle = i / blocks.count * Math.PI * 2;
      const side = i % 2 ? -1 : 1;
      const r = radius*(monster ? .987 : .992);
      pose.position.set(side * width*.205, Math.cos(angle)*r, Math.sin(angle)*r);
      pose.rotation.set(angle, 0, side*.43);
      pose.scale.set(width*.52, radius*(monster ? .075 : .047), radius*.169);
      pose.updateMatrix();
      blocks.setMatrixAt(i, pose.matrix);
    }
    wheel.add(blocks);
  }
  if (monster) {
    const beadlock = new THREE.Group();
    const ring = radius*.699;
    piece(beadlock,hub,.51,ring*2,ring*2,face*width*.465,0,0,whitewall);
    for (let i=0;i<14;i++) {
      const angle = i*Math.PI*2/14;
      fastener(beadlock,satin,.030,face*width*.494,Math.cos(angle)*ring,Math.sin(angle)*ring,'x');
    }
    batchVehicleParts(beadlock);
    wheel.add(beadlock);
  }
  if (bike) {
    const discs = new THREE.Group();
    for (const side of front ? [-1,1] : [1]) {
      const x = side*(width*.48+.008);
      const size = radius*(front ? .96 : .77);
      piece(discs,satin,size,size,1,x,0,0,rotorRing).rotation.y = side*Math.PI/2;
      for (let i=0;i<16;i++) {
        const angle=i*Math.PI/8;
        const r=size*(i%2 ? .663 : .737);
        fastener(discs,trim,.012,x+side*.003,Math.sin(angle)*r,Math.cos(angle)*r,'x');
      }
    }
    batchVehicleParts(discs);
    wheel.add(discs);
  }
  return wheel;
}

const tireGeometry = new Map();

export function buildWheel(radius, width, spokes, face = 1, useTread = true, offroad = false, style) {
  const wheel = new THREE.Group();
  const key = radius + ':' + width;
  if (!tireGeometry.has(key)) {
    const outline = [[.61, -.34], [.77, -.49], [.89, -.49], [.966, -.39], [1, -.27], [1, .27],
      [.966, .39], [.89, .49], [.77, .49], [.61, .34], [.61, -.34]];
    tireGeometry.set(key, new THREE.LatheGeometry(outline.map(([r, x]) => new THREE.Vector2(r * radius, x * width)), 32));
  }
  piece(wheel, style?.semiSlick ? semiSlickRubber : useTread ? tireRubber : trim,
    1, 1, 1, 0, 0, 0, tireGeometry.get(key)).rotation.z = Math.PI / 2;
  const sides = face === 0 ? [-1, 1] : [face];
  const rim = style?.rim ?? satin;
  const metalRadius = radius * (style?.scale ?? 1);
  piece(wheel, hub, metalRadius * 1.36, width * (style?.hubWidth ?? .69), metalRadius * 1.36, 0, 0, 0, cylinder).rotation.z = Math.PI / 2;
  for (const side of sides) {
    const type = style?.type;
    const lipX = side * width * (style ? .451 : .415);
    const faceX = side * width * (type === 'deep' ? .24 : .415);
    const dish = style ? Math.abs(lipX - faceX) + .024 : .033;
    piece(wheel, rim, metalRadius * 1.57, dish, metalRadius * 1.57, (faceX+lipX)/2, 0, 0, pipe).rotation.z = Math.PI / 2;
    piece(wheel, trim, metalRadius * .50, .055, metalRadius * .50, faceX, 0, 0, cylinder).rotation.z = Math.PI / 2;
    piece(wheel, rim, metalRadius * .232, .063, metalRadius * .232, faceX + side * .011, 0, 0, cylinder).rotation.z = Math.PI / 2;
    if (style) {
      piece(wheel, type === 'deep' || type === 'retro' ? satin : rim, .34, metalRadius * 1.51, metalRadius * 1.51, lipX, 0, 0, whitewall);
      piece(wheel, trim, .30, metalRadius * 1.66, metalRadius * 1.66, lipX + side * .011, 0, 0, whitewall);
    }
    if (style?.type === 'disc') {
      piece(wheel, rim, metalRadius * 1.48, .032, metalRadius * 1.48, faceX, 0, 0, cylinder).rotation.z = Math.PI / 2;
    }
    if (style?.whitewall) piece(wheel, reverse, 1, radius * 1.77, radius * 1.77, faceX + side * .022, 0, 0, whitewall);
    if (type === 'retro') {
      piece(wheel, rim, metalRadius * .92, .036, metalRadius * .92, faceX, 0, 0, cylinder).rotation.z = Math.PI / 2;
    }
    for (let i = 0; i < spokes; i++) {
      const angle = type === 'split' ? Math.floor(i / 2) / (spokes / 2) * Math.PI * 2 + (i % 2 ? .148 : -.148)
        : i / spokes * Math.PI * 2;
      const r = metalRadius * .463;
      const sweep = type === 'turbine' ? .47 : type === 'mesh' ? (i % 2 ? -.28 : .28) : .12;
      const spokeWidth = type === 'deep' ? .174 : type === 'split' ? .071 : .12;
      piece(wheel, rim, .027, metalRadius * .602, metalRadius * spokeWidth, faceX, Math.cos(angle) * r, Math.sin(angle) * r,
        style ? wheelSpoke : rounded).rotation.x = angle + sweep;
      if (!style) piece(wheel, accent, .025, .024, .024, faceX + side * .033,
        Math.cos(angle) * metalRadius * .169, Math.sin(angle) * metalRadius * .169, cylinder).rotation.z = Math.PI / 2;
    }
    if (style) for (let lug = 0; lug < 5; lug++) {
      const angle = lug * Math.PI * 2 / 5;
      piece(wheel, castSteel,.022,.021,.022,faceX+side*.038,Math.cos(angle)*metalRadius*.170,Math.sin(angle)*metalRadius*.170,
        wheelSpoke).rotation.x = angle;
    }
  }
  batchVehicleParts(wheel);
  if (offroad) {
    const lugs = new THREE.InstancedMesh(rounded, tireRubber, 40);
    const positions = new THREE.Object3D();
    for (let i = 0; i < lugs.count; i++) {
      const angle = i / lugs.count * Math.PI * 2;
      const side = i % 2 ? -1 : 1;
      positions.position.set(side * width * .26, Math.cos(angle) * radius * .98, Math.sin(angle) * radius * .98);
      positions.rotation.set(angle, side * .26, 0);
      positions.scale.set(width * .44, radius * .096, radius * .145);
      positions.updateMatrix();
      lugs.setMatrixAt(i, positions.matrix);
    }
    wheel.add(lugs);
  }
  return wheel;
}

export { formula as buildFormulaBody, paint as vehiclePaint, piece as vehiclePiece, shell as loftShell, carbon as vehicleCarbon };
