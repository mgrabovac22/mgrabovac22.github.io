import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { box, cylinder, createRenderer, lampRig, stageLoop, surface } from './scene.js';

const editorLines = [
  ['// a place to build', '#8ba791'],
  ["import { World } from './studio';", '#c3d89d'],
  ['', '#a6c59c'],
  ['const fieldNotes = new World({', '#e1e8d9'],
  ["  material: 'paper',", '#d4e7b0'],
  ["  light: 'soft',", '#d4e7b0'],
  ['  motion: true,', '#d4e7b0'],
  ['});', '#e1e8d9'],
  ['', '#a6c59c'],
  ['fieldNotes.open();', '#c3d89d'],
];

function makeDisplay({ profile, t }) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 470;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  let previousFrame;

  function paint(progress, time, ready, reduced) {
    const count = ready ? Math.min(10, Math.floor(progress * 11)) : 0;
    const blink = !reduced && Math.floor(time * 1.8) % 2 === 0;
    const frame = [count, blink, ready].join();
    if (frame === previousFrame) return;
    previousFrame = frame;
    const fill = (color, ...rect) => {
      context.fillStyle = color;
      context.fillRect(...rect);
    };
    const label = (text, x, y, color = '#a5b2a1') => {
      context.fillStyle = color;
      context.fillText(text, x, y);
    };
    fill('#17231c', 0, 0, 768, 470);
    if (ready) {
      fill('#2e4032', 0, 0, 768, 42);
      fill('#223127', 500, 42, 268, 388);
      fill('#2e4032', 0, 429, 768, 41);
      context.font = '500 17px monospace';
      ['#c9dbad', '#8b9e84', '#698171'].forEach((color, index) => {
        context.fillStyle = color;
        context.beginPath();
        context.arc(23 + index * 17, 22, 4, 0, Math.PI * 2);
        context.fill();
      });
      label(t.profile.toUpperCase() + ' / ACTIVE', 312, 28, '#d3decd');
      label('01 / ' + profile.name.toUpperCase().replace(' ', '.'), 32, 89, '#bcd69b');
      context.font = '700 68px Arial, sans-serif';
      label(profile.firstName, 27, 166, '#f1f4e8');
      label(profile.lastName + '.', 26, 231, '#d5e6a3');
      context.font = '500 25px Arial, sans-serif';
      label(profile.role, 32, 277, '#e0e9d7');
      fill('#526c52', 32, 301, 429, 2);
      context.font = '500 20px Arial, sans-serif';
      label(profile.current, 32, 337, '#d8e5cd');
      label(profile.focus, 32, 372, '#c4d2bd');
      context.font = '16px monospace';
      label('● ' + t.ready.toUpperCase(), 30, 456, '#c3d89d');
      label('FOI   /   MT-LAB', 573, 456);
      label('FIELDNOTES.JS', 524, 86, '#d2e3af');
      for (let i = 0; i < count; i++) {
        const [line, color] = editorLines[i];
        label(String(i + 1).padStart(2), 524, 119 + i * 23, '#8ba791');
        if (line) fill(color, 555, 113 + i * 23, 30 + line.length * 4.1, 5);
      }
      if (blink) fill('#d2e3af', 555, 114 + count * 23, 9, 13);
    }
    texture.needsUpdate = true;
  }
  return { texture, paint };
}

function rounded(parent, material, width, height, depth, radius, x, y, z) {
  const geometry = new RoundedBoxGeometry(width, height, depth, 3, radius);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function mountLaptop(host, motion, intro, locale) {
  const renderer = createRenderer(host, { alpha: true });
  if (!renderer) return;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, .1, 40);
  camera.zoom = 1.01;
  const light = lampRig(scene, 7, 1024);
  light(0, 0);
  const fill = new THREE.DirectionalLight('#e0ebea', .85);
  fill.position.set(4, 2, 7);
  scene.add(fill);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), new THREE.ShadowMaterial({ opacity: .23 }));
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  scene.add(table);

  const wire = new THREE.LineBasicMaterial({ color: '#758b6b', transparent: true, opacity: .43 });
  const tokenShape = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1, 0));
  const ambient = Array.from({ length: 9 }, (_, index) => {
    const token = new THREE.LineSegments(tokenShape, wire);
    token.scale.setScalar(.075 + (index % 4) * .027);
    scene.add(token);
    return token;
  });

  const laptop = new THREE.Group();
  laptop.rotation.y = -.20;
  scene.add(laptop);
  const metal = surface('#737e75', .37, .52);
  const dark = surface('#222a25', .65, .28);
  const deck = surface('#9ca79c', .45, .42);
  const trim = surface('#c1c9bd', .38, .26);
  const rubber = surface('#171e1a');
  rounded(laptop, metal, 5.15, .16, 3.31, .075, 0, .11, .03);
  rounded(laptop, deck, 5.11, .055, 3.27, .024, 0, .195, .03);
  rounded(laptop, dark, 4.45, .03, 1.65, .012, 0, .232, -.36);
  rounded(laptop, trim, 1.78, .022, .78, .01, 0, .235, 1.02);
  rounded(laptop, deck, 1.71, .022, .72, .01, 0, .244, 1.02);
  box(laptop, dark, .46, .024, .026, 0, .203, 1.677);
  box(laptop, rubber, .23, .048, .025, 1.65, .118, 1.684);
  box(laptop, rubber, .15, .048, .025, 1.3, .118, 1.684);
  for (const x of [-2.2, 2.2]) {
    for (const z of [-1.27, 1.3]) cylinder(laptop, rubber, .12, .042, x, .03, z);
    for (let z = 0; z < 15; z++) box(laptop, dark, .13, .009, .022, x + Math.sign(x) * .18, .227, -.95 + .092 * z);
    const hinge = cylinder(laptop, dark, .065, .60, x * .8, .228, -1.46);
    hinge.rotation.z = Math.PI / 2;
  }

  const keyGeometry = new RoundedBoxGeometry(.275, .036, .242, 2, .015);
  const keyCaps = new THREE.InstancedMesh(keyGeometry, surface('#262d29'), 75);
  const glyphs = new THREE.InstancedMesh(new THREE.BoxGeometry(.046, .003, .018), trim, 75);
  const matrix = new THREE.Matrix4();
  let keys = 0;
  for (let row = 0; row < 5; row++) {
    for (let column = 0; column < 15; column++) {
      if (row === 4 && column >= 5 && column <= 9) continue;
      const x = (column - 7) * .291;
      const z = row * .28 - .92;
      keyCaps.setMatrixAt(keys, matrix.makeTranslation(x, .255, z));
      glyphs.setMatrixAt(keys, matrix.makeTranslation(x - .055, .275, z - .049));
      keys++;
    }
  }
  keyCaps.count = glyphs.count = keys;
  keyCaps.castShadow = true;
  laptop.add(keyCaps, glyphs);
  rounded(laptop, dark, 1.44, .035, .242, .014, 0, .255, .20);

  const lid = new THREE.Group();
  lid.position.set(0, .226, -1.48);
  laptop.add(lid);
  rounded(lid, metal, 5.11, 3.14, .118, .052, 0, 1.57, 0);
  rounded(lid, dark, 5.0, 3.04, .040, .018, 0, 1.57, .055);
  const display = makeDisplay(locale);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.82, 2.87), new THREE.MeshBasicMaterial({ map: display.texture, toneMapped: false }));
  screen.position.set(0, 1.53, .079);
  lid.add(screen);
  const webcam = new THREE.Mesh(new THREE.CircleGeometry(.019, 10), new THREE.MeshBasicMaterial({ color: '#838d84' }));
  webcam.position.set(0, 3.013, .081);
  lid.add(webcam);

  let pointerX = 0;
  let pointerY = 0;
  let cameraDistance = 10;
  const art = host.parentElement;
  art.addEventListener('pointermove', event => {
    const bounds = art.getBoundingClientRect();
    pointerX = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
    pointerY = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
    if (!motion.matches && event.pointerType === 'mouse') {
      art.style.setProperty('--draft-x', pointerX * 2.6 + 'px');
      art.style.setProperty('--draft-y', pointerY * 2.6 + 'px');
    }
  });
  art.addEventListener('pointerleave', () => {
    pointerX = pointerY = 0;
    art.style.removeProperty('--draft-x');
    art.style.removeProperty('--draft-y');
  });

  let settledFrame = false;
  stageLoop(host, (time, dt) => {
    const settled = motion.matches || intro.skipped;
    const progress = settled ? 1 : THREE.MathUtils.clamp((time - .16) / 1.24, 0, 1);
    const hinge = THREE.MathUtils.smootherstep(progress, 0, 1);
    lid.rotation.x = THREE.MathUtils.lerp(Math.PI / 2 - .008, -.22, hinge);
    const wake = progress > .76;
    display.paint(settled ? 1 : (time - 1.04) / 1.15, time, wake, motion.matches);
    laptop.rotation.y = motion.matches ? -.20 : THREE.MathUtils.damp(laptop.rotation.y, -.20 + pointerX * .12, 4, dt);
    ambient.forEach((token, index) => {
      const phase = index * 2.4 + (motion.matches ? 0 : time * .16);
      token.position.set((index % 2 ? 1 : -1) * (3.28 + Math.sin(phase) * .63),
        .55 + (index % 4) * .72 + Math.sin(phase * 1.4) * .21,
        Math.sin(phase) * 2.75 - .33);
      token.rotation.set(phase * .55, phase * .71, phase);
    });
    camera.position.set(3.35 + (motion.matches ? 0 : pointerX * .15), 4.4, cameraDistance);
    camera.lookAt(.22, 1.31, .0);
    if (!motion.matches || !settledFrame) renderer.draw(scene, camera);
    settledFrame = motion.matches;
  }, (width, height) => {
    camera.aspect = width / height;
    cameraDistance = Math.max(8.9, 8.15 / camera.aspect);
    camera.updateProjectionMatrix();
    renderer.size(width, height);
    settledFrame = false;
  });
}
