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
