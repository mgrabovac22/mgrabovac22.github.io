import * as THREE from 'three';
import { addRoom } from './diorama.js';
import { routeStep } from './story.js';
import { ball, box, createRenderer, cylinder, lampRig, stageLoop, surface } from './scene.js';

const axis = new THREE.Vector3(routeStep[0], 0, routeStep[1]).normalize();
const side = new THREE.Vector3(-axis.z, 0, axis.x);
const stone = surface('#778b78', .79);
const brass = surface('#ad8c58', .41, .18);
const signal = new THREE.MeshStandardMaterial({ color: '#d5e6a3', emissive: '#a7c278', emissiveIntensity: .65 });

function floorTexture(width, depth) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 192;
  const context = canvas.getContext('2d');
  context.fillStyle = '#c1c6b6';
  context.fillRect(0, 0, 192, 192);
    for (let i = 0; i < 142; i++) {
    context.fillStyle = i % 3 ? '#a9b4a770' : '#d0d6c770';
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

  const guide = new THREE.InstancedMesh(new THREE.BoxGeometry(.44, .012, .072), brass, 2 * (Math.ceil(first.distanceTo(last) / 3.8) + 8));
  const matrix = new THREE.Matrix4();
  const step = new THREE.Vector3();
  const heading = -Math.atan2(axis.z, axis.x);
  for (let i = 0; i < guide.count; i++) {
    step.copy(first).addScaledVector(axis, (Math.floor(i / 2) - 4) * 3.8).addScaledVector(side, i % 2 ? 10.55 : -10.55);
    guide.setMatrixAt(i, matrix.makeRotationY(heading).setPosition(step.x, .012, step.z));
  }
  scene.add(guide);
}

function createBeacon(room, waypoint, position) {
  const post = new THREE.Group();
  const [x, z] = position;
  post.position.set(x, 0, z);
  room.add(post);
  cylinder(post, stone, .48, .10, 0, .063, 0);
  cylinder(post, brass, .37, .045, 0, .133, 0);
  cylinder(post, stone, .08, 1.27, 0, .75, 0);
  const sign = box(post, stone, .87, .72, .16, 0, 1.43, 0);
  const light = ball(post, signal, .15, .15, .15, 0, 1.93, 0);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.43, .027, 6, 28), new THREE.MeshBasicMaterial({ color: '#c4de98' }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = .165;
  post.add(halo);

  const stamp = document.createElement('canvas');
  stamp.width = 128;
  stamp.height = 96;
  const context = stamp.getContext('2d');
  context.fillStyle = '#25342d';
  context.fillRect(0, 0, 128, 96);
  context.fillStyle = '#edf4d7';
  context.textAlign = 'center';
  context.font = '700 45px monospace';
  context.fillText(waypoint.icon, 64, 65);
  const map = new THREE.CanvasTexture(stamp);
  map.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(.76, .57), new THREE.MeshBasicMaterial({ map, toneMapped: false }));
  face.position.set(0, 1.44, .085);
  post.add(face);
  return { link: waypoint.link, post, sign, light, halo };
}

function createRooms(pages) {
  const branches = [];
  for (let index = 0; index < pages.length; index += 2) {
    const [x, z] = pages[index].position;
    for (const edge of [-1, 1]) {
      const spread = (index % 4 ? 15.9 : 17.3) * edge;
      const along = edge * 6;
      branches.push({ position: [x + side.x * spread + axis.x * along, z + side.z * spread + axis.z * along] });
    }
  }
  return [...pages, ...branches].map((page, index) => ({ page, index, built: null, pins: [] }));
}

export function mountWorld(host, motion, route, pages, ready) {
  const renderer = createRenderer(host, { maxDpr: matchMedia('(max-width: 760px)').matches ? 1.5 : 1.75 });
  if (!renderer) return false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#cbd2c2');
  scene.fog = new THREE.Fog('#cbd2c2', 42, 105);
  const camera = new THREE.PerspectiveCamera(39, 1, .1, 145);
  const light = lampRig(scene, 24, 1536);
  const cells = createRooms(pages);
  const point = page => new THREE.Vector3(page.position[0], 0, page.position[1]);
  const first = point(pages[0]);
  const last = point(pages.at(-1));
  makeFloor(scene, first, last);
  const target = new THREE.Vector3();
  const position = new THREE.Vector3();
  const projection = new THREE.Vector3();
  const pointer = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const size = new THREE.Vector2(1, 1);
  const segments = pages.length - 1;
  let jump = route.jump;
  let progress = route.progress / segments;
  let flight = 0;
  let lastDraw = -1;
  let drawNext = true;
  let viewWidth = 30;
  let firstFrame = true;
  let nearbyPins = [];

  function locate(event) {
    const bounds = renderer.canvas.getBoundingClientRect();
    pointer.set(2 * (event.clientX - bounds.left) / bounds.width - 1, 1 - 2 * (event.clientY - bounds.top) / bounds.height);
    ray.setFromCamera(pointer, camera);
    return nearbyPins.find(pin => ray.intersectObjects([pin.sign, pin.light, pin.halo], false).length);
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

  stageLoop(host, (time, dt) => {
    const reduced = motion.matches;
    const desired = (reduced ? route.index : route.progress) / segments;
    if (route.jump !== jump) {
      jump = route.jump;
      progress = desired;
      flight = 0;
      drawNext = true;
    }
    if (reduced && !drawNext && progress === desired && renderer.canvas.classList.contains('world-painted')) return;
    if (!reduced && time - lastDraw < (camera.aspect < .85 ? .025 : .013)) return;
    lastDraw = time;
    drawNext = false;
    flight = reduced ? 1 : Math.min(1, flight + dt / 1.14);
    const unveil = THREE.MathUtils.smootherstep(flight, 0, 1);
    progress = reduced ? desired : THREE.MathUtils.damp(progress, desired, 8, dt);
    target.lerpVectors(first, last, progress);

    const width = viewWidth * (1.13 - .13 * unveil);
    const radius = width / (2 * camera.aspect * Math.tan(THREE.MathUtils.degToRad(camera.fov * .5)));
    const angle = THREE.MathUtils.lerp(.018, camera.aspect < .85 ? .43 : .59, unveil);
    const yaw = (Math.sin(progress * 15) * .078 + .105) * unveil;
    position.set(target.x + Math.sin(yaw) * Math.sin(angle) * radius,
      Math.cos(angle) * radius, target.z + Math.cos(yaw) * Math.sin(angle) * radius);
    camera.position.copy(position);
    camera.lookAt(target.x, .17, target.z + .14);
    camera.updateMatrixWorld();
    light(target.x, target.z + 1);

    nearbyPins = [];
    for (const cell of cells) {
      const [x, z] = cell.page.position;
      const visible = Math.abs(x - target.x) < width * .55 + 10 && Math.abs(z - target.z) < Math.min(38, width / camera.aspect * .50 + 8);
      if (visible && !cell.built) {
        cell.built = addRoom(scene, cell.page, cell.index);
        const actions = cell.page.links || [];
        cell.pins = actions.map((waypoint, index) => {
          const location = actions.length > 2
            ? [(index % 2 ? 1 : -1) * 3.7, -9.8 + Math.floor(index / 2) * 3.1]
            : [(index - (actions.length - 1) * .5) * 5.8, -7.8];
          return createBeacon(cell.built.room, waypoint, location);
        });
      }
      if (!cell.built) continue;
      cell.built.room.visible = visible;
      if (visible) cell.built.animate(reduced ? 0 : time, cell.page === pages[route.index]);
      const active = visible && cell.page === pages[route.index] && Math.abs(progress - desired) * segments < .2 && flight > .44;
      for (const [index, pin] of cell.pins.entries()) {
        const pulse = reduced ? 0 : Math.sin(time * 3 + index * 1.4);
        pin.light.position.y = 1.94 + pulse * .08;
        pin.halo.scale.setScalar(1 + pulse * .105);
        if (active) {
          pin.post.getWorldPosition(projection);
          projection.y = 2.24;
          projection.project(camera);
        }
        const inView = active && Math.abs(projection.x) < .95 && Math.abs(projection.y) < .87;
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
    camera.aspect = width / height;
    viewWidth = camera.aspect < .85 ? 16.8 : THREE.MathUtils.clamp(26 + camera.aspect * 4.2, 29, 36);
    camera.updateProjectionMatrix();
    renderer.size(width, height);
    drawNext = true;
  });
  renderer.canvas.addEventListener('webglcontextrestored', () => { drawNext = true; });
  return true;
}
