import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { box, cylinder, createRenderer, lampRig, stageLoop, surface } from './scene.js';

function makeDisplay({ profile, language }) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 610;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  let previousFrame;

  function paint(time, awake, reduced) {
    const pulse = awake && !reduced && Math.floor(time * 1.6) % 2 === 0;
    const frame = (awake ? 2 : 0) + Number(pulse);
    if (frame === previousFrame) return;
    previousFrame = frame;
    const fill = (color, x, y, width, height) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, width, height);
    };
    const label = (text, x, y, font, color, max = 916) => {
      ctx.fillStyle = color;
      ctx.font = font;
      ctx.fillText(text, x, y, max);
    };
    fill('#15231f', 0, 0, 1024, 610);
    if (awake) {
      fill('#223730', 0, 0, 1024, 71);
      fill('#c4dfc4', 53, 32, 13, 13);
      label('M/G  /  PORTFOLIO', 86, 45, '700 24px monospace', '#e5eee6');
      label(profile.name, 49, 213, '800 95px Arial, sans-serif', '#f4f7f0');
      label(profile.role, 55, 286, '700 44px Arial, sans-serif', '#c2e0c2');
      fill('#54746a', 55, 321, 916, 2);
      label(language === 'hr' ? 'STUDIJ' : 'EDUCATION', 55, 380, '700 23px monospace', '#a9c6b7');
      label(profile.current, 55, 432, '700 40px Arial, sans-serif', '#f0f4eb');
      label(language === 'hr' ? 'RAD' : 'WORK', 55, 490, '700 23px monospace', '#a9c6b7');
      label(profile.focus, 55, 542, '700 40px Arial, sans-serif', '#f0f4eb');
      if (pulse) fill('#d5e8c5', 951, 567, 14, 14);
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
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 40);
  camera.zoom = 1.05;
  const light = lampRig(scene, 7, 1024);
  light(0, 0);
  const fill = new THREE.DirectionalLight('#e0ebea', .85);
  fill.position.set(4, 2, 7);
  scene.add(fill);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), new THREE.ShadowMaterial({ opacity: .23 }));
  table.rotation.x = -Math.PI / 2;
  table.receiveShadow = true;
  scene.add(table);

  const laptop = new THREE.Group();
  laptop.rotation.y = -.09;
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
    lid.rotation.x = THREE.MathUtils.lerp(Math.PI / 2 - .008, -.12, hinge);
    const wake = progress > .76;
    display.paint(time, wake, motion.matches);
    laptop.rotation.y = motion.matches ? -.09 : THREE.MathUtils.damp(laptop.rotation.y, -.09 + pointerX * .11, 4, dt);
    camera.position.set(1.16 + (motion.matches ? 0 : pointerX * .21), 3.28 + (motion.matches ? 0 : pointerY * .17), cameraDistance);
    camera.lookAt(-.06, 1.39, .0);
    if (!motion.matches || !settledFrame) renderer.draw(scene, camera);
    settledFrame = motion.matches;
  }, (width, height) => {
    camera.aspect = width / height;
    cameraDistance = Math.max(7.4, 10.05 / camera.aspect);
    camera.updateProjectionMatrix();
    renderer.size(width, height);
    settledFrame = false;
  });
}
