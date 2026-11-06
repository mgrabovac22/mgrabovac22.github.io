import * as THREE from 'three';
import { addDiorama } from './diorama.js';
import { box, createRenderer, lampRig, stageLoop, surface } from './scene.js';
import { stops } from './data.js';

function floorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 192;
  const context = canvas.getContext('2d');
  context.fillStyle = '#b4beb1';
  context.fillRect(0, 0, 192, 192);
  context.fillStyle = '#a7b2a5';
  context.fillRect(0, 0, 192, 3);
  context.fillRect(0, 0, 3, 192);
  context.fillStyle = '#bdc8b9';
  context.fillRect(3, 3, 189, 2);
  context.fillRect(3, 3, 2, 189);
  for (let i = 0; i < 142; i++) {
    context.fillStyle = i % 3 ? '#a9b4a770' : '#d0d6c770';
    context.fillRect(5 + ((i * 61 + 11) % 183), 5 + ((i * i * 37 + i * 19) % 183), i % 6 ? 1 : 2, i % 5 ? 1 : 2);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(92, 67);
  map.anisotropy = 4;
  return map;
}

function makeFloor(scene) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(156, 114), new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: .91 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(38, -.008, -23);
  floor.receiveShadow = true;
  scene.add(floor);

  const path = new THREE.Group();
  path.position.set(37.5, .011, -14.9);
  path.rotation.y = Math.atan2(9, 15);
  scene.add(path);
  const paint = surface('#89998a');
  const edge = surface('#d2dac8');
  const stripe = box(path, paint, 103, .007, .96, 0, 0, 0);
  stripe.castShadow = false;
  for (const side of [-1, 1]) box(path, edge, 103, .009, .035, 0, 0, side * .43).castShadow = false;
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(.39, .011, .045), edge, 78);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < dashes.count; i++) dashes.setMatrixAt(i, matrix.makeTranslation(-50 + i * 1.3, .001, 0));
  path.add(dashes);
}

export function mountWorld(host, motion, route, openExhibit) {
  const compact = matchMedia('(max-width: 760px)');
  const renderer = createRenderer(host, { maxDpr: compact.matches ? 1.2 : 1.45 });
  if (!renderer) return false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d2d8cc');
  scene.fog = new THREE.Fog('#d2d8cc', 25, 59);
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 100);
  const light = lampRig(scene, 13, compact.matches ? 768 : 1536);
  makeFloor(scene);

  const stations = addDiorama(scene, stops);
  const points = stops.map(({ position: [x, z] }) => new THREE.Vector3(x, 0, z));
  const spline = new THREE.CatmullRomCurve3(points, false, 'catmullrom', .35);
  const target = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hint = document.querySelector('#exhibit-hint');
  const segments = stops.length - 1;
  let index = route.index;
  let jump = route.jump;
  let hovered = false;
  let cameraProgress = route.progress / segments;
  let readingOffset = 0;
  let cameraScale = 1;
  let lastDraw = -1;
  let needsDraw = true;

  function hover(isHovered) {
    if (hovered === isHovered) return;
    hovered = isHovered;
    hint.hidden = !isHovered;
    hint.textContent = isHovered ? stops[index].exhibit : '';
    renderer.canvas.style.cursor = isHovered ? 'pointer' : '';
    needsDraw = true;
  }

  function hit(event) {
    const bounds = renderer.canvas.getBoundingClientRect();
    pointer.set(2 * (event.clientX - bounds.left) / bounds.width - 1, 1 - 2 * (event.clientY - bounds.top) / bounds.height);
    ray.setFromCamera(pointer, camera);
    const station = stations[index];
    return ray.intersectObjects([station.marker, station.target], true).length > 0;
  }
  renderer.canvas.addEventListener('pointermove', event => hover(event.pointerType === 'mouse' && hit(event)));
  renderer.canvas.addEventListener('pointerleave', () => hover(false));
  let pointerOrigin;
  renderer.canvas.addEventListener('pointerdown', event => { pointerOrigin = [event.clientX, event.clientY]; });
  renderer.canvas.addEventListener('click', event => {
    if (pointerOrigin && Math.hypot(event.clientX - pointerOrigin[0], event.clientY - pointerOrigin[1]) < 9 && hit(event)) openExhibit(index);
    pointerOrigin = null;
  });

  stageLoop(host, (time, dt) => {
    const reduced = motion.matches;
    const next = (reduced ? route.index : route.progress) / segments;
    if (route.index !== index) {
      index = route.index;
      hover(false);
      needsDraw = true;
    }
    if (route.jump !== jump) {
      jump = route.jump;
      cameraProgress = next;
      readingOffset = 0;
      needsDraw = true;
    }
    if (reduced && !needsDraw && cameraProgress === next) return;
    if (!reduced && time - lastDraw < (compact.matches ? .029 : .013)) return;
    lastDraw = time;
    needsDraw = false;
    cameraProgress = reduced ? next : THREE.MathUtils.damp(cameraProgress, next, 7, dt);
    readingOffset = reduced ? 0 : THREE.MathUtils.damp(readingOffset, Math.sin(route.within * Math.PI) * .7, 4, dt);
    spline.getPoint(cameraProgress, target);
    const swing = Math.sin(cameraProgress * Math.PI * 2);
    const labFrame = Math.max(0, 1 - Math.abs(cameraProgress * segments - 3));
    const scale = cameraScale * (1.07 + labFrame * .065);
    camera.position.set(target.x + (7.8 + swing * 1.55) * scale + readingOffset,
      (13.5 - swing * .68) * scale, target.z + 16.9 * scale);
    camera.lookAt(target.x + readingOffset * .4 + labFrame * .34, .12, target.z - .48);
    light(target.x, target.z);
    for (let i = 0; i < stations.length; i++) {
      const station = stations[i];
      const distance = Math.abs(i - cameraProgress * segments);
      station.room.visible = distance < 2.3;
      station.marker.visible = i === index;
      if (!station.room.visible) continue;
      const t = reduced ? 0 : time;
      station.actors.forEach(animate => animate(t, i === index));
      station.ambient?.(t, i === index);
      station.marker.position.y = station.markerHeight + (reduced ? 0 : Math.sin(time * 2.05) * .085);
      station.marker.scale.setScalar(i === index && hovered ? 1.25 : 1);
    }
    renderer.draw(scene, camera);
  }, (width, height) => {
    camera.aspect = width / height;
    cameraScale = Math.max(.87, 1.03 / camera.aspect);
    camera.updateProjectionMatrix();
    renderer.size(width, height);
    needsDraw = true;
  });
  return true;
}
