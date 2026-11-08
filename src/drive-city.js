import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Body, Box, Vec3 } from 'cannon-es';
import { createWalker, ragdoll, updateWalker } from './drive-people.js';
import { buildPark, linkedinParkBlock } from './drive-park.js';
import { crateServices, roadCrateSlots } from './drive-crates.js';

export const blockSize = 44;
const road = 11.6;
const boxGeometry = new THREE.BoxGeometry();
const orbGeometry = new THREE.SphereGeometry(.5, 16, 12);
const architecture = new RoundedBoxGeometry(1, 1, 1, 2, .018);
const columnGeometry = new THREE.CylinderGeometry(.5, .5, 1, 10);
const signPlane = new THREE.PlaneGeometry();
const material = (color, roughness = .83) => new THREE.MeshStandardMaterial({ color, roughness });
const luminous = color => new THREE.MeshBasicMaterial({ color });
const assets = {
  asphalt: material(0x394345), curb: material(0x9b9f98), slab: material(0x879391),
  roof: material(0x565e5c), steel: material(0x354343), silver: material(0xa2aeac), trim: material(0x55615f),
  paint: material(0xa8c0bf), amber: material(0xcdab64), dirt: material(0x34423b), leaf: material(0x455e55),
  leafLight: material(0x6b8171), trunk: material(0x4a4438), glass: material(0x548b9c, .29),
  amberLight: luminous(0xffdc98), cyan: luminous(0x91e8ff), signal: luminous(0xff7e62),
  green: luminous(0xb7dbaf), sandstone: material(0xa99d84, .6), bronze: material(0x8d7655, .47),
  marble: material(0x9ba7a1, .44), water: material(0x466f72, .23),
  crate: material(0x604e39), crateEdge: material(0xb28d59),
};

function seeded(i, j) {
  let n = Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ 479107;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

function textureCanvas(width, height, draw, anisotropy = 4) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

function facade(style, anisotropy) {
  const random = seeded(style + 1, 7);
  const map = textureCanvas(512, 1024, ctx => {
    ctx.scale(2, 2);
    const walls = ['#787d73', '#a59986', '#546c73', '#647d7d'];
    const bays = style === 1 ? 4 : style === 3 ? 7 : 5;
    const rows = style === 1 ? 9 : 13;
    const width = 256 / bays;
    const height = 512 / rows;
    ctx.fillStyle = walls[style];
    ctx.fillRect(0, 0, 256, 512);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < bays; col++) {
        const x = col * width + 3;
        const y = row * height + 3;
        const trim = style === 1 ? 7 : 2;
        ctx.fillStyle = style === 1 ? '#666a65' : '#35464a';
        ctx.fillRect(x, y, width - 6, height - 5);
        const light = random();
        const glass = ctx.createLinearGradient(x, y, x + width, y + height);
        glass.addColorStop(0, light < .15 ? '#dec097' : '#789eaa');
        glass.addColorStop(.66, light < .15 ? '#ad895e' : '#415f68');
        glass.addColorStop(1, light < .15 ? '#785d48' : '#273e44');
        ctx.fillStyle = glass;
        ctx.fillRect(x + trim, y + 2, width - trim * 2 - 6, height - 10);
        if (light > .22 && light < .43) {
          ctx.fillStyle = '#c5d0cd39';
          for (let line = 0; line < 5; line++) ctx.fillRect(x + trim, y + 4 + line * 3, width - trim * 2 - 6, 1);
        }
        ctx.fillStyle = '#263338';
        ctx.fillRect(x + width * .49, y + 2, 1.5, height - 7);
      }
      ctx.fillStyle = style === 1 ? '#d2bf9b' : '#c3d6d28c';
      ctx.fillRect(0, row * height + height - 2, 256, style === 1 ? 2 : 1);
    }
  }, anisotropy);
  return new THREE.MeshStandardMaterial({ roughness: style === 1 ? .71 : .37, metalness: style === 1 ? .11 : .31, map, envMapIntensity: .61 });
}

function groundTextures(anisotropy) {
  const random = seeded(412, 22);
  assets.asphalt.map = textureCanvas(512, 512, ctx => {
    ctx.fillStyle = '#929894';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 11500; i++) {
      ctx.fillStyle = i % 3 ? '#47534d24' : '#f6e9d32c';
      ctx.fillRect(random() * 512, random() * 512, .8 + random() * 2.8, .9 + random() * 2.4);
    }
  }, anisotropy);
  assets.asphalt.map.wrapS = assets.asphalt.map.wrapT = THREE.RepeatWrapping;
  assets.asphalt.map.repeat.set(5, 5);
  assets.slab.map = textureCanvas(512, 512, ctx => {
    ctx.scale(2, 2);
    ctx.fillStyle = '#aaa9a0';
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 8; col++) {
        const tone = 157 + Math.round(random() * 37);
        const x = col * 32 + row % 2 * 16;
        const y = row * 32;
        const stone = ctx.createLinearGradient(x, y, x + 32, y + 32);
        stone.addColorStop(0, 'rgb(' + (tone + 4) + ' ' + (tone + 2) + ' ' + (tone - 4) + ')');
        stone.addColorStop(1, 'rgb(' + tone + ' ' + (tone - 2) + ' ' + (tone - 8) + ')');
        ctx.fillStyle = stone;
        ctx.fillRect(x, y, 31.3, 31.3);
      }
    }
  }, anisotropy);
  assets.slab.map.wrapS = assets.slab.map.wrapT = THREE.RepeatWrapping;
  assets.slab.map.repeat.set(3, 3);
}

const blockKey = (i, j) => i + ':' + j;

function makeBatches(parent) {
  const entries = new Map();
  const transform = new THREE.Object3D();
  function add(surface, x, y, z, w, h, d, rotation = 0, geometry = boxGeometry) {
    const key = surface.id + ':' + geometry.id;
    if (!entries.has(key)) entries.set(key, { surface, geometry, items: [] });
    entries.get(key).items.push([x, y, z, w, h, d, rotation]);
  }
  function commit() {
    for (const { surface, geometry, items } of entries.values()) {
      const mesh = new THREE.InstancedMesh(geometry, surface, items.length);
      items.forEach(([x, y, z, w, h, d, rotation], index) => {
        transform.position.set(x, y, z);
        transform.scale.set(w, h, d);
        transform.rotation.set(0, rotation, 0);
        transform.updateMatrix();
        mesh.setMatrixAt(index, transform.matrix);
      });
      mesh.computeBoundingSphere();
      mesh.castShadow = geometry === architecture;
      mesh.receiveShadow = surface === assets.asphalt || surface === assets.slab;
      parent.add(mesh);
    }
  }
  return { add, commit };
}

function mesh(parent, surface, w, h, d, x = 0, y = 0, z = 0, geometry = boxGeometry) {
  const object = new THREE.Mesh(geometry, surface);
  object.position.set(x, y, z);
  object.scale.set(w, h, d);
  parent.add(object);
  return object;
}

function createCrate(parent, x, z, size, { id, elevation = 0, label, skin, shortcut = null }) {
  const view = skin ? mesh(parent, skin, size, size, size) : new THREE.Group();
  view.position.set(x, elevation + size / 2 + .035, z);
  if (!skin) {
    parent.add(view);
    mesh(view, assets.crate, size, size, size);
    for (const side of [-1, 1]) {
      mesh(view, assets.crateEdge, size * 1.035, size * .075, size * 1.035, 0, side * size * .43, 0);
      mesh(view, assets.crateEdge, size * .105, size * .91, size * 1.036, side * size * .35);
    }
    for (let face = 0; face < 4; face++) {
      const angle = face * Math.PI / 2;
      const marking = mesh(view, label, size * .89, size * .43, 1,
        Math.sin(angle) * size * .521, .02, Math.cos(angle) * size * .521, signPlane);
      marking.rotation.y = angle;
    }
  }
  const collider = new Body({ mass: 0, shape: new Box(new Vec3(size / 2 + .045, size / 2, size / 2 + .045)),
    collisionFilterGroup: 16, collisionFilterMask: 4, collisionResponse: false });
  collider.position.set(x, elevation + size / 2, z);
  return { id, view, collider, x, z, shortcut, spent: false };
}

function makeParkSigns(copy, anisotropy) {
  const sign = (width, height, paint) => new THREE.MeshBasicMaterial({
    map: textureCanvas(width, height, paint, anisotropy), toneMapped: false,
  });
  return {
    park: sign(512, 166, ctx => {
      ctx.fillStyle = '#173933';
      ctx.fillRect(0, 0, 512, 166);
      ctx.strokeStyle = '#b5ceb4';
      ctx.lineWidth = 5;
      ctx.strokeRect(7, 7, 498, 152);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f6f4e4';
      ctx.font = '800 53px system-ui';
      ctx.fillText(copy.title, 256, 75, 466);
      ctx.fillStyle = '#c4dbbc';
      ctx.font = '700 34px system-ui';
      ctx.fillText(copy.crates, 256, 126, 466);
    }),
    crate: sign(320, 160, ctx => {
      ctx.fillStyle = '#084d80';
      ctx.fillRect(0, 0, 320, 160);
      ctx.strokeStyle = '#d2e7f2';
      ctx.lineWidth = 4;
      ctx.strokeRect(5, 5, 310, 150);
      ctx.fillStyle = '#f7faf9';
      ctx.textAlign = 'center';
      ctx.font = '800 57px system-ui';
      ctx.fillText('LinkedIn', 160, 78, 294);
      ctx.fillStyle = '#d2e7f2';
      ctx.font = '700 26px system-ui';
      ctx.fillText(copy.crate, 160, 125, 280);
    }),
  };
}

function makeRoadCrateSkins(kinds, label, anisotropy) {
  const regular = new THREE.MeshStandardMaterial({ roughness: .88, map: textureCanvas(128, 128, ctx => {
    for (let board = 0; board < 4; board++) {
      ctx.fillStyle = board % 2 ? '#78583d' : '#65472f';
      ctx.fillRect(0, board * 32, 128, 31);
    }
    const random = seeded(41, 78);
    for (let i = 0; i < 65; i++) {
      ctx.fillStyle = i % 2 ? '#d2a67438' : '#30251840';
      ctx.fillRect(random() * 128, random() * 128, 4 + random() * 39, 1);
    }
    ctx.strokeStyle = '#c49d68';
    ctx.lineWidth = 9;
    ctx.strokeRect(5, 5, 118, 118);
    ctx.strokeStyle = '#e2ab59';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(36, 74);
    ctx.lineTo(92, 54);
    ctx.stroke();
  }, anisotropy) });
  const skins = { regular };
  for (const kind of kinds) {
    const [base, stripe] = kind === 'linkedin' ? ['#0a5188', '#9bd4f4'] : ['#302740', '#d0b5ed'];
    skins[kind] = new THREE.MeshBasicMaterial({ toneMapped: false, map: textureCanvas(256, 256, ctx => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = stripe;
      ctx.lineWidth = 8;
      ctx.strokeRect(9, 9, 238, 238);
      ctx.fillStyle = '#faf9f1';
      ctx.textAlign = 'center';
      ctx.font = '800 50px system-ui';
      ctx.fillText(crateServices[kind], 128, 119, 213);
      ctx.fillStyle = stripe;
      ctx.font = '700 24px system-ui';
      ctx.fillText(label, 128, 167, 208);
    }, anisotropy) });
  }
  return skins;
}

export function createCity(scene, world, car, isCompact, maxAnisotropy, { parkCopy, crateKinds = [], crateLabel } = {}) {
  const blocks = new Map();
  const collectedCrates = new Set();
  const anisotropy = Math.min(maxAnisotropy, isCompact ? 8 : 12);
  const parkSigns = parkCopy ? makeParkSigns(parkCopy, anisotropy) : null;
  const roadSkins = makeRoadCrateSkins(crateKinds, crateLabel, anisotropy);
  groundTextures(anisotropy);
  const facades = [0, 1, 2, 3].map(style => facade(style, anisotropy));
  const plaques = ['ATRIUM', 'FORUM', 'NORTH HOUSE', 'EXCHANGE'].map(name => new THREE.MeshBasicMaterial({
    map: textureCanvas(256, 48, ctx => {
      ctx.fillStyle = '#223234';
      ctx.fillRect(0, 0, 256, 48);
      ctx.strokeStyle = '#bfa57c';
      ctx.strokeRect(3, 3, 250, 42);
      ctx.font = '650 24px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f2dab0';
      ctx.fillText(name, 128, 32, 233);
    }),
    toneMapped: false,
  }));
  const ragdolls = [];
  const queue = [];
  const signalGreen = luminous(0xb5d4a3);
  const signalRed = luminous(0xf68167);
  const warmPool = new THREE.MeshBasicMaterial({
    map: textureCanvas(64, 64, ctx => {
      const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      glow.addColorStop(0, '#ffd58b74');
      glow.addColorStop(1, '#ffd58b00');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 64, 64);
    }),
    transparent: true, depthWrite: false,
  });
  const groundLight = new THREE.PlaneGeometry().rotateX(-Math.PI / 2);
  const listener = (kind, target) => event => {
    const minimumSpeed = kind === 'crate' && !target.shortcut ? .35 : 1.6;
    if (event.body === car && !target.spent && !target.knocked && car.velocity.length() >= minimumSpeed) {
      const contact = event.contact;
      const offset = contact.bi === car ? contact.ri : contact.rj;
      const localHit = kind === 'crate' ? car.vectorToLocalFrame(offset) : null;
      const localCrate = kind === 'crate' ? car.pointToLocalFrame(target.collider.position) : null;
      queue.push({ kind, target, impact: car.velocity.clone(), localHit, localCrate });
    }
  };

  function build(i, j) {
    const parent = new THREE.Group();
    const x = i * blockSize;
    const z = j * blockSize;
    parent.position.set(x, 0, z);
    scene.add(parent);
    const random = seeded(i, j);
    const batches = makeBatches(parent);
    const { add } = batches;
    const colliders = [];
    const crates = [];
    const walkers = [];
    const isPark = linkedinParkBlock(i, j);
    function collider(cx, cz, width, height, depth, y = height / 2) {
      const body = new Body({ mass: 0, shape: new Box(new Vec3(width / 2, height / 2, depth / 2)) });
      body.position.set(x + cx, y, z + cz);
      colliders.push(body);
    }

    add(assets.asphalt, 22, -.045, 22, 44, .07, 44);
    const midpoint = blockSize / 2;
    collider(midpoint, midpoint, blockSize, .5, blockSize, -.25);
    const sidewalk = blockSize - road;
    add(assets.curb, midpoint, .025, midpoint, sidewalk, .096, sidewalk);
    add(assets.slab, midpoint, .075, midpoint, sidewalk - .24, .014, sidewalk - .24);
    collider(midpoint, midpoint, sidewalk, .081, sidewalk);
    for (let p = 9; p <= 36; p += 6) {
      add(assets.amber, 0, .012, p, .105, .018, 2.6);
      add(assets.amber, p, .012, 0, 2.6, .018, .105);
      add(assets.paint, 5.42, .009, p, .072, .012, 5.15);
      add(assets.paint, p, .009, 5.42, 5.15, .012, .072);
      if (p % 4 === 1) {
        add(assets.trim, 5.55, .022, p - 1.72, .25, .034, .73);
        add(assets.trim, p - 1.72, .022, 5.55, .73, .034, .25);
      }
    }
    for (let stripe = -4; stripe <= 4; stripe++) {
      for (const direction of [-1, 1]) {
        add(assets.paint, stripe * 1.08, .015, direction * 6.7, .56, .021, 1.64);
        add(assets.paint, direction * 6.7, .016, stripe * 1.08, 1.64, .021, .56);
      }
    }
    const park = isPark ? buildPark(parent, add, collider, parkSigns?.park, isCompact) : null;
    const buildingLots = isPark ? [] : [[15, 15], [29, 15], [15, 29], [29, 29]];
    for (const [bx, bz] of buildingLots) {
      if (random() < .19) {
        add(assets.marble, bx, .105, bz, 9.6, .043, 9.6);
        add(assets.dirt, bx, .131, bz, 9.05, .026, 9.05);
        add(assets.marble, bx, .27, bz, 2.66, .36, 2.66, 0, columnGeometry);
        add(assets.water, bx, .47, bz, 2.42, .052, 2.42, 0, columnGeometry);
        add(assets.bronze, bx, .64, bz, .34, .53, .34, 0, columnGeometry);
        for (const tx of [-2.7, 2.7]) {
          add(assets.trunk, bx + tx, 1.24, bz, .29, 2.25, .29);
          add(assets.leafLight, bx + tx, 3.03, bz, 3.35, 2.9, 2.98, 0, orbGeometry);
        }
        add(assets.steel, bx, .44, bz + 3.6, 2.5, .41, .43);
        continue;
      }
      const w = 9.4 + random() * 3.2;
      const d = 9.4 + random() * 3.2;
      const height = 7 + random() * 16 + (random() > .72 ? random() * 16 : 0);
      const color = facades[Math.floor(random() * facades.length)];
      const plaque = plaques[facades.indexOf(color)];
      const stepped = color === facades[2] || color === facades[3];
      add(color, bx, height / 2 + .12, bz, w, height, d, 0, architecture);
      if (stepped) {
        add(color, bx + .37, height + 1.46, bz + .25, w * .78, 2.93, d * .78, 0, architecture);
        add(assets.roof, bx + .37, height + 2.96, bz + .25, w * .8, .16, d * .8);
        add(assets.bronze, bx, height * .64, bz, w + .12, .13, d + .12);
      } else {
        add(assets.sandstone, bx, height + .30, bz, w + .31, .35, d + .31);
      }
      add(assets.steel, bx, 1.29, bz, w + .14, 2.43, d + .14);
      add(assets.marble, bx, .21, bz, w + .22, .27, d + .22);
      add(assets.bronze, bx, 2.47, bz, w + .22, .064, d + .22);
      add(assets.roof, bx, height + .43, bz, w + .44, .52, d + .44);
      add(assets.silver, bx - w * .19, height + .88, bz, 2.6, .52, 1.9);
      add(assets.trim, bx + w * .21, height + 1.08, bz + d * .23, 1.4, .93, 2.6);
      add(assets.glass, bx, 1.31, bz - d / 2 - .09, w * .62, 1.68, .08);
      add(assets.glass, bx, 1.31, bz + d / 2 + .09, w * .66, 1.68, .08);
      add(assets.amberLight, bx, 2.32, bz - d / 2 - .13, w * .58, .07, .13);
      add(assets.glass, bx - w / 2 - .09, 1.31, bz, .08, 1.68, d * .61);
      add(assets.glass, bx + w / 2 + .09, 1.31, bz, .08, 1.68, d * .61);
      add(assets.trim, bx - w / 2 - .48, 2.36, bz, .96, .13, d * .75);
      add(assets.cyan, bx - w / 2 - .93, 2.35, bz, .10, .065, d * .71);
      add(plaque, bx, 2.64, bz + d / 2 + .1, 2.54, .477, 1, 0, signPlane);
      add(plaque, bx, 2.64, bz - d / 2 - .1, 2.54, .477, 1, Math.PI, signPlane);
      add(plaque, bx - w / 2 - .1, 2.69, bz, 2.54, .477, 1, -Math.PI / 2, signPlane);
      add(plaque, bx + w / 2 + .1, 2.69, bz, 2.54, .477, 1, Math.PI / 2, signPlane);
      for (const side of [-1, 1]) {
        add(assets.trim, bx + side * w * .43, height / 2 + .17, bz - d / 2, .16, height, .25);
        add(assets.trim, bx - w / 2, height / 2 + .17, bz + side * d * .43, .25, height, .16);
      }
      if (height > 22) {
        add(assets.silver, bx + 1.5, height + 1.82, bz - 2, .11, 2.7, .11);
        add(assets.signal, bx + 1.5, height + 3.19, bz - 2, .19, .14, .19);
        add(assets.cyan, bx, height + .41, bz - d / 2 - .28, w * .68, .075, .08);
      }
      for (const side of [-1, 1]) {
        for (const slot of [-2, -1, 0, 1, 2]) {
          add(assets.bronze, bx + slot * w * .127, 1.32, bz + side * (d / 2 + .104), .042, 1.95, .060);
          add(assets.bronze, bx + side * (w / 2 + .104), 1.32, bz + slot * d * .127, .061, 1.95, .043);
        }
      }
      collider(bx, bz, w + .13, height + (stepped ? 3 : .45), d + .13);
    }
    for (const k of [9, 22, 35]) {
      if (isPark && k === 22) continue;
      add(assets.steel, 6.23, 2.1, k, .17, 3.91, .17, 0, columnGeometry);
      add(assets.steel, 5.65, 4.08, k, 1.36, .11, .16);
      add(assets.amberLight, 5.02, 3.99, k, .44, .095, .34);
      if (!isCompact) add(warmPool, 4.7, .034, k, 6.8, 1, 8.6, 0, groundLight);
      add(assets.trunk, k, 1.33, 6.96, .22, 2.4, .22);
      add(assets.leaf, k - .3, 2.61, 6.96, 1.92, 2.24, 1.65, 0, orbGeometry);
      add(assets.leaf, k + .49, 2.93, 7.26, 1.49, 1.89, 1.52, 0, orbGeometry);
      add(assets.leafLight, k + .05, 3.14, 6.85, 1.24, 1.42, 1.44, 0, orbGeometry);
      add(assets.marble, 6.46, .142, k - 2.1, .97, .19, 2.02);
      for (let stem = 0; stem < 4; stem++) add(assets.leafLight, 6.46, .31, k - 2.76 + stem * .44, .45, .32, .48, 0, orbGeometry);
      add(assets.steel, k, .44, 7.8, 1.64, .43, .37);
      add(assets.silver, k, .69, 7.99, 1.68, .26, .07);
      add(assets.steel, 6.93, .47, k + 2, .56, .60, .51);
      add(assets.silver, 6.93, .80, k + 2, .61, .10, .56);
      add(assets.curb, 8.25, .196, k + 1.4, 1.56, .061, 1.18);
      add(assets.dirt, 8.25, .24, k + 1.4, 1.41, .061, 1.03);
    }
    for (const [cx, cz] of [[6.12, 6.04], [-6.12, -6.04]]) {
      add(assets.steel, cx, 1.65, cz, .15, 3.29, .15);
      add(assets.steel, cx, 2.78, cz, .38, .77, .28);
      add(signalRed, cx, 2.98, cz, .17, .13, .297);
      add(signalGreen, cx, 2.60, cz, .17, .13, .297);
    }
    for (const slot of roadCrateSlots(i, j)) {
      if (collectedCrates.has(slot.id)) continue;
      const shortcut = roadSkins[slot.kind] ? slot.kind : null;
      const skin = shortcut ? roadSkins[shortcut] : roadSkins.regular;
      crates.push(createCrate(parent, slot.x, slot.z, shortcut ? 1.13 : .88, { id: slot.id, skin, shortcut }));
    }
    let linkedinPile;
    if (isPark && parkSigns) {
      linkedinPile = [];
      for (let row = 0; row < 3; row++) {
        for (let column = 0; column < 4; column++) {
          const x = 8.55 + row * 1.38;
          const z = 17.0 + column * 1.45;
          const settings = { id: `park:${row}:${column}`, label: parkSigns.crate, shortcut: 'linkedin' };
          linkedinPile.push(createCrate(parent, x, z, 1.20, { ...settings, elevation: .09 }));
          if (row > 0 && (column === 1 || column === 2)) {
            linkedinPile.push(createCrate(parent, x, z, 1.04, { ...settings, id: settings.id + ':top', elevation: 1.29 }));
          }
        }
      }
      for (const crate of linkedinPile) crate.pile = linkedinPile;
      crates.push(...linkedinPile);
    }
    walkers.push(createWalker(parent, (i === 0 && j === 0) ? 0 : Math.floor(random() * 5),
      (i === 0 && j === 0) ? .216 : random(), 1));
    walkers.push(createWalker(parent, Math.floor(random() * 5), .29 + random() * .55, -1));
    if (!isCompact && random() > .46) walkers.push(createWalker(parent, Math.floor(random() * 5), random(), 1));
    if (park) walkers.push(...park.walkers);
    let courier = null;
    if ((Math.abs(i) + Math.abs(j)) % 3 === 1) {
      const body = new THREE.Group();
      parent.add(body);
      mesh(body, assets.silver, .62, .21, .72);
      mesh(body, assets.cyan, .34, .045, .075, 0, -.055, .385);
      mesh(body, assets.bronze, .37, .24, .33, 0, -.20, 0);
      const rotors = [-1, 1].map(side => {
        mesh(body, assets.steel, .39, .058, .12, side * .39, .09, 0);
        return mesh(body, assets.steel, .43, .037, .08, side * .56, .132, 0);
      });
      courier = { body, rotors };
      for (const corner of [-1, 1]) {
        add(assets.silver, 7.47, 1.34, 7.85 + corner * 1.65, .12, 2.38, .12, 0, columnGeometry);
        add(assets.amberLight, 7.14, 2.52, 7.85 + corner * 1.58, .68, .10, .12);
      }
      add(assets.steel, 7.42, 2.58, 7.85, 1.53, .14, 3.63);
      add(assets.bronze, 6.63, 2.58, 7.85, .07, .087, 3.63);
      add(assets.glass, 8.07, 1.45, 7.85, .078, 1.87, 3.39);
      add(assets.steel, 7.67, .56, 7.85, .62, .18, 2.52);
    }
    batches.commit();
    for (const crate of crates) {
      crate.x += x;
      crate.z += z;
      crate.collider.position.x += x;
      crate.collider.position.z += z;
      crate.collider.addEventListener('collide', listener('crate', crate));
    }
    for (const walker of walkers) {
      walker.collider.addEventListener('collide', listener('walker', walker));
      walker.originX = x;
      walker.originZ = z;
    }
    return { parent, colliders, crates, walkers, courier, park, linkedinPile, active: false, i, j };
  }

  function setActive(block, active) {
    if (block.active === active) return;
    block.active = active;
    const handle = body => {
      if (active) {
        body.aabbNeedsUpdate = true;
        world.addBody(body);
      } else {
        world.removeBody(body);
      }
    };
    for (const body of block.colliders) handle(body);
    for (const crate of block.crates) if (!crate.spent) handle(crate.collider);
    for (const walker of block.walkers) if (!walker.knocked) handle(walker.collider);
  }

  let lastI = null;
  let lastJ = null;
  const reach = 2;
  function warmUpcoming(position, velocity) {
    const nextI = Math.floor((position.x + velocity.x * .95) / blockSize);
    const nextJ = Math.floor((position.z + velocity.z * .95) / blockSize);
    if (nextI === lastI && nextJ === lastJ) return;
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dz = -reach; dz <= reach; dz++) {
        const i = nextI + dx;
        const j = nextJ + dz;
        const key = blockKey(i, j);
        if (blocks.has(key)) continue;
        blocks.set(key, build(i, j));
        return;
      }
    }
  }

  function sync(position, velocity) {
    const i = Math.floor(position.x / blockSize);
    const j = Math.floor(position.z / blockSize);
    if (lastI === i && lastJ === j) {
      if (velocity) warmUpcoming(position, velocity);
      return;
    }
    lastI = i;
    lastJ = j;
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dz = -reach; dz <= reach; dz++) {
        const key = blockKey(i + dx, j + dz);
        if (!blocks.has(key)) blocks.set(key, build(i + dx, j + dz));
      }
    }
    for (const [key, block] of blocks) {
      const range = Math.max(Math.abs(i - block.i), Math.abs(j - block.j));
      setActive(block, range <= 1);
      if (range > reach) {
        scene.remove(block.parent);
        block.park?.dispose();
        block.parent.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
        blocks.delete(key);
      }
    }
  }

  function update(time, position, motion = true) {
    signalGreen.color.setHex(time % 12 < 7 ? 0xb5d4a3 : 0x424c3c);
    signalRed.color.setHex(time % 12 < 7 ? 0x654346 : 0xf68167);
    for (const block of blocks.values()) {
      const local = Math.hypot(position.x - (block.i + .5) * blockSize, position.z - (block.j + .5) * blockSize);
      for (const walker of block.walkers) {
        if (walker.knocked) continue;
        walker.view.visible = local < 88;
        if (block.active || walker.view.visible) updateWalker(walker, time, walker.originX, walker.originZ, motion && local < 64);
      }
      block.park?.update(time, motion && local < 64);
      if (!block.courier) continue;
      const { body, rotors } = block.courier;
      const phase = time * .39 + block.i + block.j;
      body.position.set(6.8 + Math.sin(phase) * 2.6, 4.5 + Math.cos(phase * 2) * .28, 9.3 + Math.cos(phase) * 3.8);
      body.rotation.set(.1 * Math.cos(phase), Math.atan2(Math.cos(phase) * 2.6, -Math.sin(phase) * 3.8), -.12 * Math.sin(phase));
      rotors.forEach((rotor, i) => { rotor.rotation.y = time * (i ? -20 : 20); });
    }
  }

  function safeLanding(x, z) {
    const i = Math.floor(x / blockSize);
    const j = Math.floor(z / blockSize);
    const block = blocks.get(blockKey(i, j));
    if (!block?.colliders.some(body => {
      if (body.position.y <= .1) return false;
      const { halfExtents } = body.shapes[0];
      return Math.abs(x - body.position.x) < halfExtents.x + 2.2 &&
        Math.abs(z - body.position.z) < halfExtents.z + 2.2;
    })) return [x, z];
    const roadX = Math.round(x / blockSize) * blockSize;
    const roadZ = Math.round(z / blockSize) * blockSize;
    return Math.abs(x - roadX) < Math.abs(z - roadZ)
      ? [roadX + Math.sign(x - roadX) * 2.5, z, 'north-south']
      : [x, roadZ + Math.sign(z - roadZ) * 2.5, 'east-west'];
  }

  function process(time, onBlast) {
    for (const { kind, target, impact, localHit, localCrate } of queue.splice(0)) {
      if (kind === 'crate' && !target.spent) {
        let coins = 0;
        for (const crate of target.pile ?? [target]) {
          if (!collectedCrates.has(crate.id)) {
            collectedCrates.add(crate.id);
            coins++;
          }
          crate.spent = true;
          crate.view.visible = false;
          world.removeBody(crate.collider);
        }
        const { x, z, pile, shortcut } = target;
        onBlast({ x, z, impact, localHit, localCrate, pile, shortcut, coins });
      } else if (kind === 'walker' && !target.knocked) {
        target.knocked = true;
        target.view.visible = false;
        world.removeBody(target.collider);
        const scale = Math.min(.60, 11 / impact.length());
        ragdolls.push(ragdoll(scene, world, target, impact.scale(scale), time));
      }
    }
    for (let i = ragdolls.length - 1; i >= 0; i--) {
      const entry = ragdolls[i];
      if (entry.expires < time) {
        for (const joint of entry.joints) world.removeConstraint(joint);
        for (const { body } of entry.limbs) world.removeBody(body);
        scene.remove(entry.group);
        ragdolls.splice(i, 1);
        const block = blocks.get(blockKey(Math.round(entry.walker.originX / blockSize), Math.round(entry.walker.originZ / blockSize)));
        if (block?.walkers.includes(entry.walker)) {
          entry.walker.knocked = false;
          entry.walker.view.visible = true;
          if (block.active) world.addBody(entry.walker.collider);
        }
      } else {
        for (const { body, object } of entry.limbs) {
          object.position.copy(body.position);
          object.quaternion.copy(body.quaternion);
        }
      }
    }
  }

  function resetParkCrates() {
    for (const block of blocks.values()) {
      for (const crate of block.linkedinPile ?? []) {
        if (!crate.spent) continue;
        crate.spent = false;
        crate.view.visible = true;
        if (block.active) world.addBody(crate.collider);
      }
    }
  }

  return { sync, update, process, safeLanding, resetParkCrates };
}
