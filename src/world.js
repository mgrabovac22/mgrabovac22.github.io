import * as THREE from 'three';
import { addRoom } from './diorama.js';
import { routeStep } from './story.js';
import { createRenderer, lampRig } from './scene.js';
import { stageLoop } from './stage-loop.js';

const axis = new THREE.Vector3(routeStep[0], 0, routeStep[1]).normalize();
const side = new THREE.Vector3(-axis.z, 0, axis.x);
const floorColor = '#d0d3d1';
const yieldFrame = () => new Promise(resolve => setTimeout(resolve, 0));

function floorTexture(width, depth) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 192;
  const context = canvas.getContext('2d');
  context.fillStyle = '#b9bdbb';
  context.fillRect(0, 0, 192, 192);
  for (let i = 0; i < 190; i++) {
    context.fillStyle = i % 3 ? '#929d9966' : '#e1e4e066';
    context.fillRect(5 + ((i * 61 + 11) % 183), 5 + ((i * i * 37 + i * 19) % 183), i % 6 ? 1 : 2, i % 5 ? 1 : 2);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(width / 3, depth / 3);
  map.anisotropy = 4;
  return map;
}

function makeFloor(scene, first, last) {
  const width = Math.abs(last.x - first.x) + 190;
  const depth = Math.abs(last.z - first.z) + 190;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshStandardMaterial({ map: floorTexture(width, depth), roughness: .93 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.copy(first).lerp(last, .5);
  floor.position.y = -.012;
  floor.receiveShadow = true;
  scene.add(floor);

  const count = 2 * (Math.ceil(first.distanceTo(last) / 3.8) + 8);
  const guide = new THREE.InstancedMesh(new THREE.BoxGeometry(.36, .012, .055),
    new THREE.MeshStandardMaterial({ color: '#89948e', metalness: .18 }), count);
  const matrix = new THREE.Matrix4();
  const step = new THREE.Vector3();
  const heading = -Math.atan2(axis.z, axis.x);
  for (let i = 0; i < count; i++) {
    step.copy(first).addScaledVector(axis, (Math.floor(i / 2) - 4) * 3.8).addScaledVector(side, i % 2 ? 10.55 : -10.55);
    guide.setMatrixAt(i, matrix.makeRotationY(heading).setPosition(step.x, .012, step.z));
  }
  scene.add(guide);
}

const ringGeometry = new THREE.RingGeometry(.41, .45, 36);
const pinFace = new THREE.CircleGeometry(.41, 32);
const pinInk = new THREE.MeshBasicMaterial({ color: '#29463c', side: THREE.DoubleSide, toneMapped: false });
const pinGlass = new THREE.MeshBasicMaterial({ color: '#eaf2ec', transparent: true, opacity: .8, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
const pinOutline = new THREE.MeshBasicMaterial({ color: '#78968b', side: THREE.DoubleSide, toneMapped: false });
const arrow = new THREE.Shape();
arrow.moveTo(-.055, .23);
arrow.lineTo(.055, .23);
arrow.lineTo(.055, -.055);
arrow.lineTo(.18, .07);
arrow.lineTo(.247, .005);
arrow.lineTo(0, -.242);
arrow.lineTo(-.247, .005);
arrow.lineTo(-.18, .07);
arrow.lineTo(-.055, -.055);
arrow.closePath();
const arrowGeometry = new THREE.ShapeGeometry(arrow);

function createBeacon(room, link, [x, z]) {
  const origin = new THREE.Group();
  origin.position.set(x, 0, z);
  room.add(origin);
  const halo = new THREE.Mesh(ringGeometry, pinOutline);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = .019;
  halo.scale.setScalar(1.48);
  origin.add(halo);

  const marker = new THREE.Group();
  marker.position.y = 1.74;
  marker.scale.setScalar(1.18);
  origin.add(marker);
  const hit = new THREE.Mesh(pinFace, pinGlass);
  hit.renderOrder = 2;
  marker.add(hit);
  const outline = new THREE.Mesh(ringGeometry, pinInk);
  const glyph = new THREE.Mesh(arrowGeometry, pinInk);
  for (const part of [outline, glyph]) {
    part.position.z = .007;
    part.renderOrder = 3;
    marker.add(part);
  }
  return { link, origin, x, z, marker, halo, hit };
}

export async function prepareOffice(pages) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(floorColor);
  scene.fog = new THREE.Fog(floorColor, 47, 98);
  const point = page => new THREE.Vector3(page.position[0], 0, page.position[1]);
  const first = point(pages[0]);
  const last = point(pages.at(-1));
  makeFloor(scene, first, last);

  const branches = [];
  for (let index = 0; index < pages.length; index += 2) {
    const [x, z] = pages[index].position;
    for (const edge of [-1, 1]) {
      const spread = (index % 4 ? 15.9 : 17.3) * edge;
      const along = edge * 6;
      branches.push({ position: [x + side.x * spread + axis.x * along, z + side.z * spread + axis.z * along] });
    }
  }

  const cells = [];
  let deadline = performance.now();
  for (const [index, page] of [...pages, ...branches].entries()) {
    if (performance.now() >= deadline) {
      await yieldFrame();
      deadline = performance.now() + 8;
    }
    const built = addRoom(scene, page, index);
    const actions = page.links || [];
    const pins = actions.map((waypoint, slot) => {
      const location = actions.length > 2
        ? [(slot % 2 ? 1 : -1) * 3.8, -12.85 + Math.floor(slot / 2) * 4.5]
        : [(slot - (actions.length - 1) * .5) * 5.8, -9.85];
      return createBeacon(built.room, waypoint.link, location);
    });
    built.animate(0, false);
    // Leave room for movement and shadows around the visible objects.
    const bounds = new THREE.Box3().setFromObject(built.room).expandByScalar(page.id === 'projects' ? 17 : 5);
    cells.push({ page, ...built, pins, bounds });
  }
  return { scene, cells, first, last };
}

export async function mountWorld(host, motion, route, pages, office, ready, failed) {
  const compact = matchMedia('(max-width: 760px)').matches;
  const renderer = createRenderer(host, { maxDpr: compact ? 1.25 : 1.6 });
  if (!renderer) return false;
  const { scene, cells, first, last } = office;
  const camera = new THREE.PerspectiveCamera(39, 1, .1, 112);
  const light = lampRig(scene, 23, compact ? 768 : 1024, {
    sky: '#f7f9fc', ground: '#969b99', sun: '#fff9ef',
  });
  const target = new THREE.Vector3();
  const projection = new THREE.Vector3();
  const pointer = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const size = new THREE.Vector2(1, 1);
  const frustum = new THREE.Frustum();
  const viewProjection = new THREE.Matrix4();
  const segments = pages.length - 1;
  let jump = route.jump;
  let progress = route.progress / segments;
  let flight = 0;
  let viewWidth = 30;
  let firstFrame = true;
  let nearbyPins = [];

  const textures = new Set();
  scene.traverse(object => {
    if (object.material?.map) textures.add(object.material.map);
  });
  let textureIndex = 0;
  for (const texture of textures) {
    if (textureIndex++ % 6 === 0) await yieldFrame();
    renderer.upload(texture);
  }
  await renderer.compile(scene, camera);
  // The user may have changed the starting stop while the map was prepared.
  jump = route.jump;
  progress = route.progress / segments;

  function locate(event) {
    const bounds = renderer.canvas.getBoundingClientRect();
    pointer.set(2 * (event.clientX - bounds.left) / bounds.width - 1, 1 - 2 * (event.clientY - bounds.top) / bounds.height);
    ray.setFromCamera(pointer, camera);
    return nearbyPins.find(pin => ray.intersectObject(pin.hit, false).length);
  }
  renderer.canvas.addEventListener('pointermove', event => {
    renderer.canvas.style.cursor = event.pointerType === 'mouse' && locate(event) ? 'pointer' : '';
  });
  let down;
  renderer.canvas.addEventListener('pointerdown', event => { down = [event.clientX, event.clientY]; });
  renderer.canvas.addEventListener('click', event => {
    if (down && Math.hypot(event.clientX - down[0], event.clientY - down[1]) < 8) locate(event)?.link.click();
    down = null;
  });

  const invalidate = stageLoop(host, (time, dt) => {
    const reduced = motion.matches;
    const desired = (reduced ? route.index : route.progress) / segments;
    if (route.jump !== jump) {
      jump = route.jump;
      progress = desired;
      flight = 0;
    }
    flight = reduced ? 1 : Math.min(1, flight + dt / 1.14);
    const unveil = THREE.MathUtils.smootherstep(flight, 0, 1);
    progress = reduced ? desired : THREE.MathUtils.damp(progress, desired, 8, dt);
    target.lerpVectors(first, last, progress);

    const width = viewWidth * (1.13 - .13 * unveil);
    const radius = width / (2 * camera.aspect * Math.tan(THREE.MathUtils.degToRad(camera.fov * .5)));
    const angle = THREE.MathUtils.lerp(.018, camera.aspect < .85 ? .46 : .65, unveil);
    const yaw = (Math.sin(progress * 12) * .045 + .095) * unveil;
    camera.position.set(target.x + Math.sin(yaw) * Math.sin(angle) * radius,
      Math.cos(angle) * radius, target.z + Math.cos(yaw) * Math.sin(angle) * radius);
    camera.lookAt(target.x, .20, target.z - .35);
    camera.updateMatrixWorld();
    viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(viewProjection);
    light(target.x, target.z + 1);

    nearbyPins = [];
    for (const cell of cells) {
      const visible = frustum.intersectsBox(cell.bounds);
      cell.room.visible = visible;
      if (visible && (!reduced || firstFrame || cell.needsStaticPose)) {
        cell.animate(reduced ? 0 : time, cell.page === pages[route.index]);
        cell.needsStaticPose = !reduced;
      }
      const active = visible && cell.page === pages[route.index] && Math.abs(progress - desired) * segments < .2 && flight > .44;
      for (const [index, pin] of cell.pins.entries()) {
        pin.marker.visible = active;
        pin.halo.visible = active;
        if (active) {
          const pulse = reduced ? 0 : Math.sin(time * 2.8 + index * 1.4);
          pin.marker.position.y = 1.74 + pulse * .13;
          pin.marker.quaternion.copy(camera.quaternion);
          pin.halo.scale.setScalar(1.46 + pulse * .16);
          pin.marker.getWorldPosition(projection).project(camera);
        }
        const inView = active && Math.abs(projection.x) < .98 && Math.abs(projection.y) < .96;
        pin.link.hidden = !inView;
        if (inView) {
          pin.link.style.setProperty('--pin-x', ((projection.x + 1) * size.x / 2) + 'px');
          pin.link.style.setProperty('--pin-y', ((1 - projection.y) * size.y / 2) + 'px');
          nearbyPins.push(pin);
        }
      }
    }
    renderer.draw(scene, camera);
    renderer.canvas.classList.add('world-painted');
    if (firstFrame) {
      firstFrame = false;
      ready();
    }
  }, (width, height) => {
    size.set(width, height);
    const pinOffset = width < 460 && height < 700 ? 2.15 : 0;
    const shortLandscape = width >= 460 && height < 520;
    for (const cell of cells) {
      cell.pins.forEach((pin, slot) => {
        if (shortLandscape) {
          pin.origin.position.x = (slot % 2 ? 1 : -1) * 10.55;
          pin.origin.position.z = -3.45 + Math.floor(slot / 2) * 4.75;
        } else {
          pin.origin.position.x = pin.x;
          pin.origin.position.z = pin.z + pinOffset;
        }
      });
    }
    camera.aspect = width / height;
    viewWidth = camera.aspect < .85 ? 17.2 : THREE.MathUtils.clamp(26 + camera.aspect * 4.2, 29, 36);
    camera.updateProjectionMatrix();
    renderer.size(width, height);
  }, { motion, fps: compact ? 30 : 60 });
  host.closest('.world-scroll').addEventListener('scroll', invalidate, { passive: true });
  renderer.canvas.addEventListener('webglcontextlost', failed, { once: true });
  return true;
}
