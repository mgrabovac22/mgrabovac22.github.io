import * as THREE from 'three';

export function createRenderer(host, { alpha = false, shadows = true, maxDpr = 1.6 } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha, antialias: true, powerPreference: 'low-power' });
  } catch {
    return null;
  }
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);

  let contextLost = false;
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    contextLost = true;
    host.classList.remove('is-rendered');
    canvas.hidden = true;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    canvas.hidden = false;
  });

  return {
    canvas,
    upload(texture) { renderer.initTexture(texture); },
    compile(scene, camera) { return renderer.compileAsync(scene, camera); },
    size(width, height) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
      renderer.setSize(width, height, false);
    },
    draw(scene, camera) {
      if (contextLost) return;
      renderer.render(scene, camera);
      host.classList.add('is-rendered');
    },
  };
}

export function stageLoop(host, step, resize) {
  let visible = false;
  let frame = 0;
  let time = 0;
  let previous = null;
  function update(now) {
    const dt = previous === null ? 0 : Math.min((now - previous) / 1000, 0.05);
    previous = now;
    time += dt;
    step(time, dt);
    frame = requestAnimationFrame(update);
  }
  function schedule() {
    const active = visible && !document.hidden;
    if (active && !frame) frame = requestAnimationFrame(update);
    if (!active && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = null;
    }
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    schedule();
  }, { rootMargin: '40px' }).observe(host);
  new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (width && height) resize(width, height);
  }).observe(host);
  document.addEventListener('visibilitychange', schedule);
}

const cube = new THREE.BoxGeometry();
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 12);
const ballGeometry = new THREE.SphereGeometry(1, 12, 8);
export const surface = (color, roughness = .8, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

function solid(parent, geometry, material, scale, position) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export const box = (parent, material, w, h, d, x, y, z) =>
  solid(parent, cube, material, [w, h, d], [x, y, z]);
export const cylinder = (parent, material, r, h, x, y, z) =>
  solid(parent, cylinderGeometry, material, [r, h, r], [x, y, z]);
export const ball = (parent, material, w, h, d, x, y, z) =>
  solid(parent, ballGeometry, material, [w, h, d], [x, y, z]);

export function lampRig(scene, span, resolution, { sky = '#fffcef', ground = '#87967d', sun = '#fff7df' } = {}) {
  scene.add(new THREE.HemisphereLight(sky, ground, 2.25));
  const key = new THREE.DirectionalLight(sun, 2.35);
  key.castShadow = true;
  key.shadow.mapSize.set(resolution, resolution);
  Object.assign(key.shadow.camera, {
    left: -span, right: span, bottom: -span, top: span, near: .1, far: 65,
  });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.normalBias = .026;
  key.shadow.bias = -.00025;
  key.shadow.radius = 3;
  scene.add(key, key.target);
  return (x, z) => {
    key.position.set(x - 7, 14, z + 6);
    key.target.position.set(x, 0, z);
  };
}
