import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import fontData from './world-font.json';
import { towers } from './data.js';
import { furnishDetails } from './fixtures.js';
import { addOfficeCorners, addOfficeScene } from './office-scenes.js';
import { floorText } from './floor-text.js';
import { ball, box, cylinder, surface } from './scene.js';

const font = new FontLoader().parse(fontData);
const mat = {
  frame: surface('#777f82'),
  cork: surface('#ae9775'),
  glass: new THREE.MeshStandardMaterial({ color: '#b9cacb', opacity: .27, transparent: true, depthWrite: false, roughness: .4 }),
  felt: surface('#939c98'),
  line: surface('#e9e9d7'),
  white: surface('#e0e1dc'),
  title: surface('#63796d', .77),
  titleEdge: surface('#33483f'),
  wood: surface('#999c9a'),
  woodEdge: surface('#747b7e'),
  ink: surface('#38454b'),
  gray: surface('#7f8a90'),
  screen: surface('#3d595a', .47),
  light: surface('#b4d6bf', .66),
  paper: surface('#eee8d1'),
  plant: surface('#5e8057'),
  plantLight: surface('#879c64'),
  jacket: surface('#758382'),
  navy: surface('#4a5e67'),
  trousers: surface('#333f3b'),
  skin: surface('#b6896e'),
  skinLight: surface('#d6ac8c'),
  hair: surface('#453c32'),
};

function lettering(parent, word) {
  const threshold = new THREE.Group();
  threshold.position.set(0, 0, -6.15);
  threshold.rotation.y = .27;
  parent.add(threshold);

  const geometry = new TextGeometry(word.toUpperCase(), {
    font, size: 1.64, depth: .26, curveSegments: 4,
    bevelEnabled: true, bevelThickness: .035, bevelSize: .045, bevelSegments: 2,
  });
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const width = bounds.max.x - bounds.min.x;
  geometry.translate(-(bounds.min.x + bounds.max.x) / 2, -bounds.min.y, 0);
  const text = new THREE.Mesh(geometry, [mat.titleEdge, mat.title]);
  text.scale.x = Math.min(1.1, 11.75 / width);
  text.position.set(0, .31, .14);
  text.castShadow = true;
  text.receiveShadow = true;
  threshold.add(text);

  box(threshold, mat.gray, 13.75, .11, .44, 0, .085, 0);
  box(threshold, mat.ink, 13.54, .11, .19, 0, .233, .22);
  for (const x of [-6.65, 6.65]) {
    box(threshold, mat.frame, .145, 1.77, .26, x, .92, 0);
    box(threshold, mat.light, .15, .043, .27, x, 1.83, 0);
    box(threshold, mat.white, .86, .041, .047, x * .92, .35, .28);
  }
}

function desk(parent, x, z, width = 2.12, depth = 1.1) {
  const desk = new THREE.Group();
  desk.position.set(x, 0, z);
  parent.add(desk);
  box(desk, mat.wood, width, .095, depth, 0, .66, 0);
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      box(desk, mat.ink, .065, .61, .065, side * (width / 2 - .11), .31, end * (depth / 2 - .12));
    }
  }
  return desk;
}

function monitor(parent, x = 0, z = 0) {
  box(parent, mat.ink, .32, .032, .19, x, .73, z);
  box(parent, mat.ink, .057, .19, .07, x, .82, z);
  box(parent, mat.ink, .63, .39, .058, x, 1.035, z);
  box(parent, mat.screen, .577, .334, .009, x, 1.04, z + .033);
  for (let i = 0; i < 3; i++) box(parent, i === 1 ? mat.light : mat.gray, .37 - i * .085, .013, .006, x - i * .035, 1.123 - i * .051, z + .04);
  box(parent, mat.ink, .47, .026, .16, x, .72, z + .27);
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 9; column++) box(parent, mat.gray, .031, .008, .02, x + (column - 4) * .047, .738, z + .23 + row * .037);
  }
  ball(parent, mat.ink, .046, .021, .061, x + .315, .723, z + .265);
  box(parent, mat.ink, .017, .021, .29, x + .18, .718, z - .115).rotation.y = .21;
}

function papers(parent, x, z, y = .73) {
  box(parent, mat.paper, .31, .021, .225, x, y, z).rotation.y = .18;
  box(parent, mat.white, .29, .016, .205, x, y + .015, z).rotation.y = -.08;
  box(parent, mat.ink, .17, .012, .022, x + .065, y + .028, z + .04).rotation.y = -.25;
}

function plant(parent, x, z, size = 1) {
  const plant = new THREE.Group();
  plant.position.set(x, 0, z);
  plant.scale.setScalar(size);
  parent.add(plant);
  cylinder(plant, mat.woodEdge, .26, .33, 0, .18, 0);
  cylinder(plant, mat.wood, .278, .045, 0, .335, 0);
  cylinder(plant, mat.plant, .025, .55, 0, .59, 0);
  for (let i = 0; i < 5; i++) {
    const angle = i * 2.4;
    const leaf = ball(plant, i % 2 ? mat.plant : mat.plantLight, .122, .25, .076,
      Math.cos(angle) * .15, .6 + (i % 3) * .08, Math.sin(angle) * .15);
    leaf.rotation.set(Math.sin(angle) * .78, angle, -Math.cos(angle) * .78);
  }
}

function chair(parent, x, z, yRotation = 0) {
  const chair = new THREE.Group();
  chair.position.set(x, 0, z);
  chair.rotation.y = yRotation;
  parent.add(chair);
  box(chair, mat.gray, .41, .072, .40, 0, .39, 0);
  box(chair, mat.ink, .35, .32, .065, 0, .55, .165);
  cylinder(chair, mat.ink, .042, .32, 0, .19, 0);
  for (let i = 0; i < 3; i++) box(chair, mat.ink, .38, .041, .041, 0, .044, 0).rotation.y = i * Math.PI / 3;
}

function shelving(parent, x, z) {
  for (const side of [-1, 1]) box(parent, mat.woodEdge, .07, 1.66, .44, x + side * .91, .83, z);
  for (let shelf = 0; shelf < 4; shelf++) {
    const y = .11 + shelf * .49;
    box(parent, mat.wood, 1.83, .08, .44, x, y, z);
    for (let book = 0; book < 7; book++) {
      const height = .19 + ((book * 7 + shelf * 5) % 10) * .017;
      box(parent, [mat.ink, mat.felt, mat.paper, mat.woodEdge][(book + shelf) % 4], .13, height, .27,
        x - .74 + book * .215, y + .04 + height / 2, z + .035).rotation.z = book === 6 ? .12 : 0;
    }
  }
}

function lamp(parent, x, z) {
  cylinder(parent, mat.ink, .11, .027, x, .728, z);
  cylinder(parent, mat.gray, .024, .39, x, .91, z);
  const arm = box(parent, mat.gray, .29, .03, .034, x + .12, 1.08, z);
  arm.rotation.z = -.2;
  cylinder(parent, mat.ink, .116, .105, x + .25, 1.015, z);
  cylinder(parent, mat.light, .09, .021, x + .25, .955, z);
}

const actorTint = surface('#ffffff');

function instanceCharacter(rig) {
  const groups = new Map();
  rig.traverse(object => {
    if (!object.isMesh) return;
    if (!groups.has(object.geometry)) groups.set(object.geometry, []);
    object.updateMatrix();
    groups.get(object.geometry).push({ mesh: object, parent: object.parent });
  });
  const instances = [];
  for (const [geometry, parts] of groups) {
    if (parts.length < 4) continue;
    const batch = new THREE.InstancedMesh(geometry, actorTint, parts.length);
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    batch.castShadow = batch.receiveShadow = true;
    batch.frustumCulled = false;
    parts.forEach(({ mesh }, index) => {
      batch.setColorAt(index, mesh.material.color);
      mesh.removeFromParent();
    });
    rig.add(batch);
    instances.push({ batch, parts });
  }
  const inverse = new THREE.Matrix4();
  const matrix = new THREE.Matrix4();
  return () => {
    rig.updateWorldMatrix(true, true);
    inverse.copy(rig.matrixWorld).invert();
    for (const { batch, parts } of instances) {
      parts.forEach(({ mesh, parent }, index) => {
        matrix.multiplyMatrices(parent.matrixWorld, mesh.matrix).premultiply(inverse);
        batch.setMatrixAt(index, matrix);
      });
      batch.instanceMatrix.needsUpdate = true;
    }
  };
}

function person(parent, x, z, outfit, behavior, phase = 0, {
  scale = 1, stride = 2.6, pace = .34, beat = 6.4, facing,
} = {}) {
  const rig = new THREE.Group();
  rig.position.set(x, 0, z);
  rig.userData.dynamic = true;
  rig.scale.setScalar(scale);
  const reading = behavior === 'read';
  const presenting = behavior === 'present';
  const seated = reading || behavior === 'type';
  const carrying = behavior === 'carry';
  const walking = carrying || behavior === 'walk';
  const hips = seated ? .42 : .47;
  parent.add(rig);
  ball(rig, outfit, .145, .205, .086, 0, hips + .15, 0);
  cylinder(rig, mat.skinLight, .044, .085, 0, hips + .36, 0);
  const head = new THREE.Group();
  head.position.y = hips + .463;
  rig.add(head);
  ball(head, phase > 2 ? mat.skin : mat.skinLight, .087, .11, .084, 0, 0, 0);
  ball(head, mat.hair, .091, .073, .09, 0, .05, -.016);
  ball(head, mat.skinLight, .025, .029, .026, 0, -.008, .077);

  const limbs = [-1, 1].map(side => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * .127, hips + .265, 0);
    rig.add(shoulder);
    shoulder.rotation.z = side * .09;
    ball(shoulder, outfit, .044, .099, .048, 0, -.071, 0);
    const elbow = new THREE.Group();
    elbow.position.y = -.145;
    shoulder.add(elbow);
    ball(elbow, outfit, .038, .068, .041, 0, -.052, 0);
    ball(elbow, mat.skinLight, .035, .04, .038, 0, -.121, 0);
    const hip = new THREE.Group();
    hip.position.set(side * .071, hips, 0);
    rig.add(hip);
    ball(hip, mat.trousers, .059, .135, .063, 0, -.105, 0);
    const knee = new THREE.Group();
    knee.position.y = -.225;
    hip.add(knee);
    ball(knee, mat.trousers, .05, .117, .052, 0, -.087, 0);
    ball(knee, mat.ink, .054, .04, .084, 0, -.205, .031);
    return { shoulder, elbow, hip, knee };
  });
  if (carrying) {
    box(rig, mat.cork, .32, .21, .26, 0, .63, .28);
    box(rig, mat.paper, .055, .01, .27, 0, .738, .28);
  }

  if (scale > 1) {
    ball(head, mat.gray, .106, .067, .104, 0, .09, 0);
    box(head, mat.light, .157, .018, .070, 0, .074, .095);
    box(rig, mat.light, .125, .029, .041, .072, hips + .243, .082);
  }
  const updateInstances = instanceCharacter(rig);

  function animate(time, active) {
    const t = time + phase;
    const movement = active ? 1 : .45;
    if (walking) {
      const heading = t * pace;
      rig.position.x = x + Math.sin(heading) * stride;
      rig.position.z = z + Math.cos(heading) * .29;
      rig.rotation.y = Math.atan2(Math.cos(heading) * stride, -Math.sin(heading) * .29);
      rig.position.y = Math.abs(Math.sin(t * beat)) * .035 * scale;
    } else if (seated) {
      rig.rotation.y = facing ?? Math.PI;
    } else {
      rig.rotation.y = (facing ?? -.43) + Math.sin(t * .61) * .13 * movement;
    }
    head.rotation.y = Math.sin(t * .8) * .23 * movement;
    head.rotation.x = reading ? .17 + Math.sin(t * .75) * .16 * movement : 0;
    limbs.forEach(({ shoulder, elbow, hip, knee }, index) => {
      const gait = Math.sin(t * beat + index * Math.PI);
      if (walking) {
        hip.rotation.x = gait * .46;
        knee.rotation.x = Math.max(0, -gait) * .61;
        shoulder.rotation.x = carrying ? -.72 : -gait * .34;
        elbow.rotation.x = carrying ? -.86 : 0;
      } else if (seated) {
        hip.rotation.x = -1.4;
        knee.rotation.x = 1.36;
        shoulder.rotation.x = -.66;
        elbow.rotation.x = -1.03 + Math.sin(t * (reading ? 1.85 : 12.4) + index * 2) * .13 * movement;
      } else {
        shoulder.rotation.x = index === 0 ? -.21 : (presenting ? -1.27 : -.72) + Math.sin(t * 1.5) * .31 * movement;
        elbow.rotation.x = index === 0 ? -.18 : -.62 + Math.cos(t * 1.5) * .16 * movement;
      }
    });
    updateInstances();
  }
  animate(0, false);
  return animate;
}

function floorMarkings(parent, title) {
  if (title) lettering(parent, title);
  for (const side of [-1, 1]) {
    box(parent, mat.felt, .72, .013, .027, side * 7.52, .013, 4.38).castShadow = false;
    box(parent, mat.felt, .027, .013, .53, side * 7.87, .013, 4.13).castShadow = false;
  }
}

function cabinet(parent, x, z, rotation = 0) {
  const unit = new THREE.Group();
  unit.position.set(x, 0, z);
  unit.rotation.y = rotation;
  parent.add(unit);
  box(unit, mat.gray, .85, 1, .63, 0, .55, 0);
  box(unit, mat.wood, .9, .068, .67, 0, 1.07, 0);
  for (let i = 0; i < 3; i++) {
    box(unit, mat.white, .76, .275, .044, 0, .244 + i * .297, .33);
    box(unit, mat.ink, .24, .036, .056, 0, .302 + i * .297, .365);
  }
  papers(unit, .13, .015, 1.12);
  for (const x of [-.29, .29]) {
    for (const z of [-.22, .22]) cylinder(unit, mat.ink, .055, .08, x, .055, z);
  }
}

function divider(parent, x, z, width) {
  box(parent, mat.frame, width + .15, .058, .15, x, .08, z);
  const glass = box(parent, mat.glass, width, 1.39, .026, x, .88, z);
  glass.castShadow = false;
  for (const sign of [-1, 1]) box(parent, mat.frame, .054, 1.51, .058, x + width * .5 * sign, .835, z);
  for (const y of [.18, .7, 1.56]) box(parent, mat.frame, width, .029, .06, x, y, z);
}

function tray(parent, x, z, y = .71) {
  box(parent, mat.gray, .41, .039, .3, x, y, z);
  box(parent, mat.paper, .29, .016, .23, x, y + .022, z);
  for (const side of [-1, 1]) box(parent, mat.ink, .025, .064, .3, x + side * .19, y + .02, z);
  box(parent, mat.ink, .41, .053, .024, x, y + .017, z - .148);
}

function mug(parent, x, z, y = .74) {
  cylinder(parent, mat.white, .069, .106, x, y + .05, z);
  cylinder(parent, mat.cork, .054, .006, x, y + .103, z);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.043, .01, 5, 12), mat.white);
  handle.position.set(x + .068, y + .061, z);
  parent.add(handle);
}

function printer(parent, x, z) {
  const stand = desk(parent, x, z, 1.35, .7);
  box(stand, mat.gray, .98, .33, .53, 0, .87, 0);
  box(stand, mat.white, .93, .07, .49, 0, 1.07, 0);
  box(stand, mat.ink, .66, .083, .028, 0, .88, .275);
  box(stand, mat.paper, .58, .012, .21, 0, .861, .378);
  box(stand, mat.light, .085, .027, .025, .34, .98, .28);
  return stand;
}

function officeDetails(parent, page, index) {
  const side = index % 2 ? 1 : -1;
  const branch = !page.title;
  const details = furnishDetails(parent, index, branch);
  const actors = [];
  if (!branch && !page.first && index % 3 !== 1) {
    const work = desk(parent, side * 1.9, -6.37, 2.7, 1.13);
    monitor(work, -.36, -.16);
    tray(work, .66, .14);
    chair(parent, side * 1.9 - .34, -5.35, Math.PI);
    actors.push(person(parent, side * 1.9 - .34, -5.35, mat.jacket, 'type', index * .91));
  }
  if (!branch) {
    actors.push(person(parent, -side * 2.8, 4.92, mat.jacket, 'walk', 1.1 + index * .53));
    actors.push(person(parent, side * 7.7, 7.91, mat.navy, index % 3 ? 'walk' : 'carry', 2.7 + index * .63));
    plant(parent, -side * 8.28, 7.23, 1.22);
    if (index % 3 === 0) divider(parent, side * 4.1, 9.24, 4.64);
  } else {
    actors.push(person(parent, .7, -2.35, mat.navy, 'gesture', index * .63));
    if (index % 2) plant(parent, -4.78, 3.37, 1.6);
  }
  const grate = box(parent, mat.frame, 1.64, .016, .27, side * 8.30, .007, -1.58);
  grate.castShadow = false;
  for (let n = 0; n < 11; n++) box(parent, mat.ink, .043, .018, .19, side * 8.30 - .69 + n * .138, .009, -1.58).castShadow = false;
  return (time, active) => {
    details(time);
    actors.forEach(actor => actor(time, active));
  };
}

function sharedSpace(parent, index) {
  const style = index % 3;
  if (style === 0) {
    const rug = cylinder(parent, mat.felt, 1, .016, 0, .008, 3.18);
    rug.scale.x = 4.4;
    rug.scale.z = 2.55;
    rug.castShadow = false;
    const low = desk(parent, 0, 3.21, 3.42, 1.78);
    low.scale.y = .65;
    papers(low, .86, .18);
    mug(low, -.82, .14);
    tray(low, .11, -.28);
    for (const side of [-1, 1]) {
      box(parent, mat.ink, 1.13, .33, 2.65, side * 2.54, .185, 3.15);
      box(parent, mat.jacket, 1.10, .22, 2.59, side * 2.54, .46, 3.15);
      box(parent, mat.titleEdge, .23, .67, 2.59, side * 2.98, .67, 3.15);
      plant(parent, side * 4.19, 5.16, 1.44);
    }
  } else if (style === 1) {
    const island = desk(parent, 0, 3.83, 4.8, 2.28);
    monitor(island, -1.47, -.61);
    monitor(island, .03, -.61);
    monitor(island, 1.45, -.61);
    papers(island, .84, .52);
    papers(island, -.56, .62);
    for (const x of [-1.47, .03, 1.45]) chair(parent, x, 5.41, Math.PI);
    cabinet(parent, 3.85, 3.25);
    plant(parent, -3.89, 3.39, 1.33);
  } else {
    for (const x of [-2.75, 0, 2.75]) {
      shelving(parent, x, 1.65);
      box(parent, mat.line, 1.78, .012, .037, x, .015, 2.8).castShadow = false;
    }
    const reading = desk(parent, 0, 5.37, 3.76, 1.40);
    lamp(reading, -1.38, -.35);
    papers(reading, .72, .16);
    tray(reading, .13, -.29);
    for (const x of [-.88, .87]) chair(parent, x, 6.53, Math.PI);
    plant(parent, 3.97, 4.15, 1.57);
  }
}

function batchFurnishings(parent) {
  parent.updateWorldMatrix(true, true);
  const inverse = parent.matrixWorld.clone().invert();
  const batches = new Map();
  function collect(object) {
    if (object.userData.dynamic) return;
    if (object.isMesh && !Array.isArray(object.material) && !object.material.transparent) {
      const key = [object.geometry.id, object.material.id, object.castShadow, object.receiveShadow].join('/');
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(object);
    }
    object.children.forEach(collect);
  }
  parent.children.forEach(collect);
  for (const meshes of batches.values()) {
    if (meshes.length < 3) continue;
    const first = meshes[0];
    const batch = new THREE.InstancedMesh(first.geometry, first.material, meshes.length);
    batch.castShadow = first.castShadow;
    batch.receiveShadow = first.receiveShadow;
    meshes.forEach((mesh, index) => {
      batch.setMatrixAt(index, mesh.matrixWorld.clone().premultiply(inverse));
      mesh.removeFromParent();
    });
    parent.add(batch);
  }
}

function studio(parent) {
  const work = desk(parent, -.8, -1.9, 3.08, 1.33);
  monitor(work, -.48, -.23);
  lamp(work, -1.18, -.19);
  papers(work, .82, .12);
  cylinder(work, mat.white, .075, .13, 1.25, .77, .24);
  chair(parent, -1.23, -.96, Math.PI);
  shelving(parent, -4.9, -2.94);
  plant(parent, -6.65, -1.25, .83);
  const pinboard = new THREE.Group();
  pinboard.position.set(3.25, 0, -2.72);
  parent.add(pinboard);
  box(pinboard, mat.woodEdge, 2.7, 1.55, .11, 0, .98, 0);
  box(pinboard, mat.white, 2.51, 1.34, .02, 0, .99, .062);
  for (let i = 0; i < 5; i++) {
    box(pinboard, i % 2 ? mat.light : mat.paper, .3, .21, .012, -1 + i * .44, 1.28 - .27 * (i % 2), .076).rotation.z = .05 * (i - 2);
  }
  plant(parent, 5.93, -1.92, 1.08);
  return { target: work, actors: [person(parent, -1.23, -.96, mat.navy, 'type'), person(parent, 3.28, -1.94, mat.jacket, 'gesture', 2), person(parent, 1.75, .69, mat.jacket, 'walk', 1)] };
}

function workshop(parent) {
  const plinth = new THREE.Group();
  plinth.position.set(0, 0, -2.05);
  parent.add(plinth);
  box(plinth, mat.white, 3.64, .41, 1.83, 0, .21, 0);
  box(plinth, mat.ink, 3.51, .06, 1.71, 0, .46, 0);
  const layout = [[-.99, .23, -.2], [-.41, .47, .29], [.34, .84, -.22], [1.03, .59, .26]];
  for (const [x, h, z] of layout) {
    box(plinth, mat.paper, .57, h, .52, x, .5 + h / 2, z);
    box(plinth, mat.felt, .45, .04, .41, x, .52 + h, z);
  }
  const work = desk(parent, -4.7, -1.7);
  monitor(work, .28, -.13);
  papers(work, -.67, .16);
  const kiosk = desk(parent, 4.6, -2.1, 1.82);
  monitor(kiosk, -.35, -.13);
  const phone = box(kiosk, mat.ink, .25, .47, .04, .52, .93, .15);
  phone.rotation.x = -.28;
  box(kiosk, mat.light, .19, .36, .01, .52, .94, .174).rotation.x = -.28;
  plant(parent, 6.6, -1.3);
  return { target: plinth, actors: [person(parent, 1.4, -.83, mat.jacket, 'gesture', 2.7), person(parent, -2.8, .55, mat.navy, 'walk', 3.6)] };
}

function technologyLabel(tower) {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 144;
  const context = canvas.getContext('2d');
  context.fillStyle = '#25342b';
  context.fillRect(0, 0, 192, 144);
  context.strokeStyle = '#829678';
  context.lineWidth = 4;
  context.strokeRect(3, 3, 186, 138);
  context.fillStyle = '#eff3e2';
  context.textAlign = 'center';
  context.font = 'bold 43px monospace';
  context.fillText(tower.mark, 96, 68);
  context.font = '26px Arial';
  context.fillStyle = '#d5e6a3';
  context.fillText('★'.repeat(tower.level) + '☆'.repeat(3 - tower.level), 96, 112);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
}

function lab(parent) {
  const exhibit = new THREE.Group();
  exhibit.position.set(0, 0, -1.8);
  parent.add(exhibit);
  towers.forEach((tower, index) => {
    const x = (index - (towers.length - 1) / 2) * 1.55;
    const z = index % 2 ? -.72 : .48;
    const height = tower.level * .68 + .52;
    const shell = [mat.gray, mat.felt, mat.titleEdge][tower.level - 1];
    box(exhibit, shell, 1.18, height, .88, x, height / 2, z);
    box(exhibit, mat.ink, 1.21, .09, .91, x, .045, z);
    box(exhibit, mat.light, 1.22, .084, .93, x, height, z);
    for (let line = 1; line < tower.level; line++) box(exhibit, mat.line, 1.19, .021, .889, x, .15 + line * .69, z);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(1.08, .81), technologyLabel(tower));
    label.position.set(x, height - .52, z + .449);
    exhibit.add(label);
    for (const offset of [-.39, .39]) box(exhibit, mat.ink, .12, .061, .12, x + offset, height + .055, z - .28);
  });
  const techDesk = desk(parent, 4.15, -3.48, 2.2);
  monitor(techDesk, .43, -.22);
  papers(techDesk, -.6, .12);
  chair(parent, 4.58, -2.55, Math.PI);
  const calibration = new THREE.Group();
  calibration.position.set(-5.6, .3, -.1);
  calibration.userData.dynamic = true;
  parent.add(calibration);
  cylinder(calibration, mat.ink, .21, .55, 0, 0, 0);
  for (let i = 0; i < 3; i++) box(calibration, mat.light, .58, .045, .11, 0, .30, 0).rotation.y = i * Math.PI / 3;
  return {
    target: exhibit, markerHeight: 3.21,
    actors: [person(parent, 4.58, -2.55, mat.navy, 'type', 1.4), person(parent, .2, .42, mat.jacket, 'walk', 3.8)],
    ambient(time) { calibration.rotation.y = time * .65; },
  };
}

function office(parent) {
  const table = desk(parent, -.3, -1.88, 3.64, 1.46);
  papers(table, .83, -.2);
  papers(table, -1.13, .22);
  chair(parent, -.8, -.77, Math.PI);
  chair(parent, .34, -.77, Math.PI);
  chair(parent, -.77, -2.96);
  const wall = new THREE.Group();
  wall.position.set(.6, 0, -3.58);
  parent.add(wall);
  box(wall, mat.woodEdge, 5.3, 1.98, .105, 0, .99, 0);
  box(wall, mat.white, 5.09, 1.76, .016, 0, 1, .066);
  box(wall, mat.felt, 4.35, .021, .018, 0, 1.05, .08);
  for (let i = 0; i < 5; i++) {
    box(wall, mat.titleEdge, .065, .07, .028, -1.94 + i * .97, 1.055, .09);
    box(wall, i % 2 ? mat.paper : mat.light, .54, .23, .018, -1.94 + i * .97, .77 + i % 2 * .56, .085);
  }
  const work = desk(parent, 4.89, -1.72);
  monitor(work, .09, -.19);
  plant(parent, -5.58, -2.6, 1.27);
  return { target: table, actors: [person(parent, -.8, -.77, mat.navy, 'type', 2.2), person(parent, 2.27, -1.32, mat.jacket, 'gesture', 4.6), person(parent, 1.57, .57, mat.navy, 'walk', 2.1)] };
}

function library(parent) {
  shelving(parent, -4.65, -2.87);
  shelving(parent, -2.5, -2.87);
  shelving(parent, -.35, -2.87);
  const reading = desk(parent, 3.35, -2.06, 3.3, 1.23);
  papers(reading, -.35, .14);
  lamp(reading, -1.18, -.19);
  box(reading, mat.ink, .53, .038, .39, .62, .728, .08);
  box(reading, mat.paper, .237, .031, .345, .50, .754, .08).rotation.z = -.075;
  box(reading, mat.paper, .237, .031, .345, .744, .754, .08).rotation.z = .075;
  chair(parent, 3.19, -1.14, Math.PI);
  plant(parent, 6.02, -2.76, 1.03);
  return { target: reading, actors: [person(parent, 3.19, -1.14, mat.jacket, 'type', 2), person(parent, -3.82, -1.85, mat.navy, 'gesture', 2.8), person(parent, -.36, .61, mat.jacket, 'walk', 4.2)] };
}

function postroom(parent) {
  const counter = desk(parent, -.35, -1.8, 4.31, 1.4);
  lamp(counter, -1.7, -.23);
  papers(counter, -1.05, .16);
  const letter = new THREE.Group();
  counter.add(letter);
  letter.position.set(.48, .735, .07);
  letter.userData.dynamic = true;
  box(letter, mat.white, .88, .025, .55, 0, 0, 0);
  for (const side of [-1, 1]) box(letter, mat.felt, .49, .01, .015, side * .2, .015, -.12).rotation.y = side * .5;
  box(letter, mat.titleEdge, .15, .012, .15, .29, .018, -.125);
  chair(parent, .12, -.78, Math.PI);
  const mailbox = new THREE.Group();
  mailbox.position.set(4.45, 0, -1.72);
  parent.add(mailbox);
  box(mailbox, mat.titleEdge, 1.12, 1.4, .79, 0, .7, 0);
  box(mailbox, mat.ink, .76, .07, .035, 0, 1.1, .403);
  box(mailbox, mat.white, .36, .16, .039, 0, .74, .405);
  plant(parent, -5.03, -2.3, 1.24);
  return { target: counter, actors: [person(parent, .12, -.78, mat.navy, 'type', 3.7), person(parent, 3.14, -.92, mat.jacket, 'gesture', 1.8)],
    ambient(time, active) { letter.rotation.y = active ? Math.sin(time * .65) * .16 : 0; } };
}

const layouts = { about: studio, career: office, projects: workshop, qualifications: lab, education: library, contact: postroom };

export function addRoom(scene, page, index) {
  const [x, z] = page.position;
  const room = new THREE.Group();
  room.position.set(x, 0, z);
  scene.add(room);
  floorMarkings(room, page.first ? page.chapterTitle : '');
  const detailMotion = officeDetails(room, page, index);
  const cornerMotion = page.title ? addOfficeCorners(room, index, person) : null;
  let exhibit;
  let activity;
  const giant = page.id === 'projects'
    ? person(room, 0, -14.1, mat.gray, 'carry', 0, { scale: 5.7, stride: 20, pace: .32, beat: 3.5 })
    : null;
  let arrivedAt = null;
  if (page.first) {
    const layout = new THREE.Group();
    layout.position.z = -8.85;
    room.add(layout);
    exhibit = layouts[page.id](layout);
  }
  if (page.title) {
    floorText(room, page);
    const below = new THREE.Group();
    below.position.set(index % 2 ? -.55 : .63, 0, 5.62);
    below.scale.setScalar(.88);
    room.add(below);
    activity = addOfficeScene(below, page, index, person);
  } else if (index % 2) {
    activity = addOfficeScene(room, page, index, person);
  } else {
    sharedSpace(room, index);
  }
  batchFurnishings(room);
  return {
    room,
    animate(time, active) {
      detailMotion(time, active);
      cornerMotion?.(time);
      activity?.(time, active);
      if (giant) {
        if (active) arrivedAt ??= time;
        else if (arrivedAt !== null && time - arrivedAt > 16) arrivedAt = null;
        giant((arrivedAt === null ? 0 : time - arrivedAt) - 4, active);
      }
      exhibit?.actors.forEach(actor => actor(time, active));
      exhibit?.ambient?.(time, active);
    },
  };
}
