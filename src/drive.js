import './drive.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Body, SAPBroadphase, Vec3, World } from 'cannon-es';
import { createCar, flatYaw, isTipped, launcherImpulse } from './drive-car.js';
import { createCity } from './drive-city.js';
import { createSkyStories } from './drive-story.js';
import { loadPortfolio } from './portfolio.js';
import { createStory } from './story.js';
import { crateProfileUrl, crateServices, createCrateCountdown } from './drive-crate-links.js';
import { createUtilityVehicle, tankBay, vehicleTypes } from './drive-vehicle.js';
import { createPlayer } from './drive-player.js';
import { createDriveAudio } from './drive-audio.js';
import { createToolKit, tools } from './drive-tools.js';

const language = new URLSearchParams(location.search).get('lang') === 'hr' ? 'hr' : 'en';
const content = loadPortfolio(language).then(data => ({ data, pages: createStory(data) })).catch(() => null);
const find = selector => document.querySelector(selector);
const game = find('#game');
const touchButtons = [...document.querySelectorAll('[data-input]')];
const touch = find('.touch');
const view = find('#view');
const cover = find('#cover');
const coverText = find('#cover-text');
const errorBack = find('.error-back');
const start = find('#start');
const reset = find('#reset');
const healButton = find('#heal');
const readButton = find('#read-story');
const reader = find('#story-reader');
const entry = find('#story-entry');
const notice = find('#notice');
const speedValue = find('#speed');
const coinCount = find('#coin-count');
const stationName = find('#station-name');
const chapter = find('#chapter');
const chapterIndex = find('#chapter-index');
const settings = find('#drive-settings');
const settingsButton = find('#settings-open');
const vehicleSelect = find('#drive-vehicle');
const toolHud = find('#tool-hud');
const toolToggle = find('#tool-toggle');
const toolWheel = find('#tool-wheel');
const modTouch = find('#vehicle-touch');
const fireButton = find('#touch-fire');
const sprintButton = find('#touch-sprint');
const aim = find('#aim');
const vehiclePrompt = find('#vehicle-prompt');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const coarse = matchMedia('(any-pointer: coarse)');
const compact = coarse.matches || innerWidth < 700;
document.documentElement.lang = language;
for (const link of document.querySelectorAll('a.button')) link.href = language === 'hr' ? './hr.html' : './';

const controls = new Map([
  ['KeyW', 'forward'], ['ArrowUp', 'forward'], ['KeyS', 'reverse'], ['ArrowDown', 'reverse'],
  ['KeyA', 'left'], ['ArrowLeft', 'left'], ['KeyD', 'right'], ['ArrowRight', 'right'], ['Space', 'brake'],
]);
const initial = { x: 3, y: .77, z: 9 };
const parkedInput = { forward: false, reverse: false, left: false, right: false, brake: true };

function sky(scene) {
  const gradient = new THREE.Mesh(new THREE.SphereGeometry(210, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      horizon: { value: new THREE.Color(0xb0bbb5) }, zenith: { value: new THREE.Color(0x3c5a65) },
      glow: { value: new THREE.Color(0xf0c08b) }, direction: { value: new THREE.Vector3(-.56, .15, -.82).normalize() },
    },
    vertexShader: 'varying vec3 v; void main(){v=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 v;
      uniform vec3 horizon,zenith,glow,direction;
      void main(){
        vec3 d=normalize(v);
        float sky=pow(max(d.y,0.),.48);
        float sun=pow(max(dot(d,direction),0.),5.);
        float disc=smoothstep(.99955,.99967,dot(d,direction));
        vec3 c=mix(horizon,zenith,sky);
        c=mix(c,glow,.53*sun*(1.-sky)+.48*disc);
        gl_FragColor=vec4(c,1.);
        #include <colorspace_fragment>
      }`,
  }));
  gradient.frustumCulled = false;
  scene.add(gradient);
  return gradient;
}

function makeEffects(scene) {
  const pool = [];
  const pending = [];
  const random = () => Math.random() * 2 - 1;
  const colors = [0xffe1a3, 0xfda259, 0xd29266, 0x715545];
  const geometry = new THREE.BoxGeometry(.12, .12, .12);
  const bits = colors.map(color => new THREE.MeshBasicMaterial({ color }));
  const ringGeometry = new THREE.RingGeometry(.88, 1, 40);
  function blast(x, z, strength = 1) {
    const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({
      color: 0xffc378, transparent: true, opacity: .88, depthWrite: false, side: THREE.DoubleSide,
    }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, .23, z);
    scene.add(ring);
    const count = reduced.matches ? 8 : strength < 1 ? 14 : strength > 1 ? 42 : 28;
    const parts = Array.from({ length: count }, (_, index) => {
      const mesh = new THREE.Mesh(geometry, bits[index % bits.length]);
      mesh.scale.setScalar((.60 + Math.random() * 2.1) * strength);
      mesh.position.set(x + random() * .28, .43, z + random() * .28);
      scene.add(mesh);
      return { mesh, velocity: new THREE.Vector3(random() * 9, 3 + Math.random() * 8, random() * 9).multiplyScalar(strength) };
    });
    pool.push({ ring, parts, strength, age: 0 });
  }

  function chain(x, z, pile) {
    blast(x, z, 1.6);
    const positions = [...new Map(pile.map(crate => [crate.x + ':' + crate.z, crate])).values()];
    const secondary = positions.filter(crate => crate.x !== x || crate.z !== z)
      .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
    const stride = Math.ceil(secondary.length / 6);
    secondary.filter((_, index) => index % stride === 0).forEach((crate, index) => {
      pending.push({ x: crate.x, z: crate.z, delay: (index + 1) * .095 });
    });
  }

  function update(dt) {
    for (let i = pending.length - 1; i >= 0; i--) {
      const burst = pending[i];
      burst.delay -= dt;
      if (burst.delay > 0) continue;
      blast(burst.x, burst.z, .72);
      pending.splice(i, 1);
    }
    for (let i = pool.length - 1; i >= 0; i--) {
      const event = pool[i];
      event.age += dt;
      event.ring.scale.setScalar((.55 + event.age * 8.5) * event.strength);
      event.ring.material.opacity = Math.max(0, .76 - event.age * 1.22);
      for (const part of event.parts) {
        part.velocity.y -= 16 * dt;
        part.mesh.position.addScaledVector(part.velocity, dt);
        part.mesh.position.y = Math.max(.1, part.mesh.position.y);
        part.mesh.rotation.x += dt * 8;
        part.mesh.rotation.z += dt * 5;
        part.mesh.scale.multiplyScalar(Math.pow(.47, dt));
      }
      if (event.age > 1.16) {
        scene.remove(event.ring, ...event.parts.map(part => part.mesh));
        event.ring.material.dispose();
        pool.splice(i, 1);
      }
    }
  }
  return { blast, chain, update };
}

function fail(message) {
  cover.hidden = false;
  coverText.textContent = message;
  start.hidden = true;
  errorBack.hidden = false;
  reset.disabled = true;
  healButton.disabled = true;
  readButton.disabled = true;
  settingsButton.disabled = true;
  touch.hidden = true;
  modTouch.hidden = true;
  aim.hidden = true;
  toolHud.hidden = true;
  vehiclePrompt.hidden = true;
}

async function boot() {
  const portfolio = await content;
  if (!portfolio) {
    fail(language === 'hr' ? coverText.dataset.unavailableHr : coverText.dataset.unavailable);
    return;
  }
  const { data, pages } = portfolio;
  const t = data.t.drive;
  const copy = t.sandbox ?? {};
  const label = (key, fallback) => copy[key] ?? fallback;
  const crateCopy = typeof t.crateLink?.countdown === 'string' ? t.crateLink : null;
  const profileParks = new Map();
  if (crateCopy) for (const [kind, label] of Object.entries(crateServices)) {
    const href = crateProfileUrl(data.profile[kind], kind);
    const copy = t[kind + 'Park'];
    if (href && copy) profileParks.set(kind, { ...copy, href, label });
  }
  document.title = t.title + ' — ' + data.profile.name;
  document.querySelector('meta[name=description]').content = t.description;
  for (const node of document.querySelectorAll('[data-copy]')) node.textContent = t[node.dataset.copy];
  for (const node of document.querySelectorAll('[data-game-copy]')) {
    node.textContent = label(node.dataset.gameCopy, node.textContent);
  }
  for (const button of touchButtons) {
    const key = button.dataset.input;
    button.setAttribute('aria-label', t[key] ?? label(key, button.getAttribute('aria-label')));
  }
  find('.current-route').setAttribute('aria-label', t.route);
  find('.speed').setAttribute('aria-label', t.speed);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: compact ? 'low-power' : 'high-performance' });
  } catch {
    fail(t.noGraphics);
    return;
  }
  view.append(renderer.domElement);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  renderer.shadowMap.enabled = !compact;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xb0bbb5, .014);
  const skybox = sky(scene);
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(environment, .045).texture;
  scene.environmentIntensity = .87;
  environment.dispose();
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(55, 1, .18, 245);
  const fill = new THREE.HemisphereLight(0xd9eff2, 0x817660, 1.66);
  const sun = new THREE.DirectionalLight(0xffe3b9, 2.45);
  const bounce = new THREE.DirectionalLight(0xa0c4cd, .48);
  sun.position.set(-30, 21, -36);
  bounce.position.set(12, 9, 20);
  sun.castShadow = !compact;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -33, right: 33, top: 33, bottom: -33, near: 1, far: 105 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = .057;
  sun.shadow.bias = -.00028;
  scene.add(fill, sun, sun.target, bounce);

  const world = new World({ gravity: new Vec3(0, -9.81, 0), allowSleep: true });
  world.broadphase = new SAPBroadphase(world);
  world.broadphase.axisIndex = 0;
  world.solver.iterations = 9;
  world.defaultContactMaterial.friction = .42;
  world.defaultContactMaterial.restitution = .06;
  const sport = createCar(scene, world);
  const tank = createUtilityVehicle(scene, world, 'tank');
  tank.setPose(tankBay.x, tank.stance, tankBay.z, tankBay.yaw);
  const fleet = new Map([['sport', sport], ['tank', tank]]);
  const spawned = new Set([sport, tank]);
  const city = createCity(scene, world, compact, renderer.capabilities.getMaxAnisotropy(), profileParks);
  const stories = createSkyStories(scene, world, pages);
  const effects = makeEffects(scene);
  const crateCountdown = createCrateCountdown(find('#crate-redirect'), crateCopy);
  const audio = createDriveAudio();
  const player = createPlayer(scene, world, audio);
  const keys = new Set();
  const pointers = new Map();
  const input = {};
  let car = sport;
  let position = car.chassis.position;
  let walking = false;
  let lookYaw = 0;
  let lookPitch = -.05;
  let firing = false;
  let exitRequested = false;
  let aimPointer = null;
  let selectedKind = 'sport';
  let nearbyCar = null;
  const cameraGoal = new THREE.Vector3();
  const focus = new THREE.Vector3();
  const focusGoal = new THREE.Vector3();
  const forward = new THREE.Vector3(0, 0, -1);
  const routeHeading = new THREE.Vector3(0, 0, -1);
  const shotDirection = new THREE.Vector3();
  const shotPoint = new THREE.Vector3();
  const staticRayStart = new Vec3();
  const staticRayEnd = new Vec3();
  const still = new Vec3();
  let activeTool = 0;
  const toolSlots = tools.map(({ id }, index) => {
    const button = document.createElement('button');
    const angle = index / tools.length * Math.PI * 2;
    button.type = 'button';
    button.style.setProperty('--x', (50 + Math.sin(angle) * 30) + '%');
    button.style.setProperty('--y', (50 - Math.cos(angle) * 33) + '%');
    button.textContent = (index + 1) + ' · ' + label(id, id);
    toolWheel.append(button);
    return button;
  });
  const kit = createToolKit(scene, world, city, player.held, audio, compact, (index, owned) => {
    activeTool = index;
    for (const [slot, button] of toolSlots.entries()) {
      button.disabled = !owned.has(slot);
      button.setAttribute('aria-pressed', String(slot === index));
    }
    showTool();
  }, index => announce(label('pickup', '{tool} equipped').replace('{tool}', label(tools[index].id, tools[index].id))));
  let yaw = 0;
  let cameraYaw = 0;
  let cameraClearance = 1;
  let time = 0;
  let noticeUntil = 0;
  let coins = 0;
  let stopped = true;
  let started = false;
  let graphicsLost = false;
  let tippedFor = 0;
  let launched = false;
  let launchedAt = 0;
  let launchYaw = 0;
  let lastChapter = -1;
  let currentPage;
  let hudAt = 0;
  let previous = 0;
  let frame = 0;
  let resolution = 1;
  let baseRatio = 1;
  let elapsedFrameTime = 0;
  let frameSamples = 0;

  function showTool() {
    const equipped = tools[activeTool];
    const tankMode = !walking && car === tank;
    find('#tool-number').textContent = tankMode ? '◎' : String(activeTool + 1);
    find('#tool-name').textContent = tankMode ? label('tank', 'Water Cannon') : label(equipped.id, equipped.id);
    toolToggle.disabled = tankMode;
  }
  function openWheel(open, focusSlot = false) {
    if (open && !walking) return;
    toolWheel.hidden = !open;
    toolToggle.setAttribute('aria-expanded', String(open));
    if (open) {
      releaseLook();
      if (focusSlot) toolSlots[activeTool].focus({ preventScroll: true });
    }
  }
  function releaseLook() {
    firing = false;
    aimPointer = null;
    if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
  }
  function updateFleet() {
    for (const vehicle of fleet.values()) {
      const p = vehicle.chassis.position;
      vehicle.setActive(spawned.has(vehicle) && (vehicle === car && !walking || Math.hypot(p.x - position.x, p.z - position.z) < 52));
    }
  }
  function updateMode() {
    const aiming = walking || car === tank;
    game.toggleAttribute('data-walking', walking);
    aim.hidden = toolHud.hidden = !started || !aiming;
    fireButton.hidden = !aiming;
    sprintButton.hidden = !walking;
    find('[data-input=brake]').textContent = walking ? '⬆' : '■';
    find('[data-input=brake]').setAttribute('aria-label', walking ? label('jump', 'Jump') : t.brake);
    find('[data-input=forward]').setAttribute('aria-label', walking ? label('walkForward', 'Walk forward') : t.forward);
    find('[data-input=reverse]').setAttribute('aria-label', walking ? label('walkBack', 'Walk backwards') : t.reverse);
    if (!walking) openWheel(false);
    showTool();
    showTouch();
  }
  function getNearbyCar() {
    let closest = null;
    let best = Infinity;
    for (const vehicle of spawned) {
      const p = vehicle.chassis.position;
      const distance = Math.hypot(p.x - position.x, p.y - position.y, p.z - position.z);
      if (distance > (vehicle === tank ? 3.65 : 3.05) || distance > best || isTipped(vehicle.chassis)) continue;
      closest = vehicle;
      best = distance;
    }
    return closest;
  }
  function updatePrompt() {
    nearbyCar = walking ? getNearbyCar() : null;
    vehiclePrompt.hidden = !nearbyCar;
    if (nearbyCar) {
      const name = label(nearbyCar.kind, nearbyCar.kind);
      const hint = touch.hidden ? 'F · ' + label('enter', 'Enter {vehicle}') : label('enter', 'Enter {vehicle}');
      const next = hint.replace('{vehicle}', name);
      if (vehiclePrompt.textContent !== next) vehiclePrompt.textContent = next;
    }
  }
  function exitVehicle() {
    const { chassis } = car;
    const center = chassis.position;
    const heading = flatYaw(chassis);
    const offset = car.width + .72;
    staticRayStart.set(center.x, center.y + .21, center.z);
    for (const side of [-1, 1, -2, 2]) {
      const lateral = Math.abs(side) === 1;
      const dx = (lateral ? Math.cos(heading) : Math.sin(heading)) * Math.sign(side);
      const dz = (lateral ? -Math.sin(heading) : Math.cos(heading)) * Math.sign(side);
      const distance = lateral ? offset : 2.92;
      const x = center.x + dx * distance;
      const z = center.z + dz * distance;
      staticRayEnd.set(x + dx * .27, staticRayStart.y, z + dz * .27);
      let blocked = false;
      world.raycastAll(staticRayStart, staticRayEnd, { skipBackfaces: true, collisionFilterMask: 5 }, hit => {
        if (hit.body !== chassis) blocked = true;
      });
      if (blocked) continue;
      walking = true;
      exitRequested = false;
      lookYaw = heading;
      lookPitch = -.03;
      player.place(x, .91, z, heading);
      player.setActive(true);
      position = player.body.position;
      clearInput();
      updateMode();
      audio.play('click');
      return;
    }
    exitRequested = false;
    announce(label('blocked', 'Move the vehicle to make room to exit.'));
  }
  function enterVehicle(vehicle) {
    walking = false;
    exitRequested = false;
    player.setActive(false);
    car = vehicle;
    position = car.chassis.position;
    lookYaw = flatYaw(car.chassis);
    lookPitch = -.04;
    launched = false;
    tippedFor = 0;
    clearInput();
    releaseLook();
    updateMode();
    updatePrompt();
    if (car !== tank) vehicleSelect.value = selectedKind = car.kind;
    audio.play('click');
  }
  function interact() {
    if (stopped || !started) return;
    if (walking) {
      const target = getNearbyCar();
      if (target) enterVehicle(target);
      else announce(label('noVehicle', 'Move closer to a vehicle.'));
    } else if (Math.hypot(car.chassis.velocity.x, car.chassis.velocity.z) > 4 || position.y > car.stance + .7) {
      exitRequested = true;
      announce(label('stopping', 'Stopping to exit…'));
    } else exitVehicle();
  }
  function getVehicle(kind) {
    if (!fleet.has(kind)) fleet.set(kind, createUtilityVehicle(scene, world, kind));
    return fleet.get(kind);
  }
  function switchVehicle(kind) {
    if (!vehicleTypes.includes(kind)) return;
    const replacement = getVehicle(kind);
    if (!walking && replacement === car) return;
    const previousCar = car;
    const [x, z, road] = city.safeLanding(position.x, position.z);
    const driverYaw = walking ? lookYaw : flatYaw(car.chassis);
    const axis = road === 'east-west' ? Math.PI / 2 : 0;
    const heading = road ? axis + Math.round((driverYaw - axis) / Math.PI) * Math.PI : driverYaw;
    let spawnX = x, spawnZ = z;
    if (previousCar === tank && Math.hypot(x - tank.chassis.position.x, z - tank.chassis.position.z) < 5) {
      [spawnX, spawnZ] = city.safeLanding(x - Math.sin(heading) * 5.5, z - Math.cos(heading) * 5.5);
    }
    for (const vehicle of spawned) {
      if (vehicle === replacement || vehicle === tank) continue;
      vehicle.setActive(false);
      spawned.delete(vehicle);
    }
    spawned.add(replacement);
    replacement.setPose(spawnX, replacement.stance + .055, spawnZ, heading);
    enterVehicle(replacement);
    updateFleet();
    city.sync(position);
    draw(0);
  }

  function announce(message, duration = 2.8) {
    notice.textContent = message;
    noticeUntil = time + duration;
  }
  function draw(dt, snap = false) {
    for (const vehicle of spawned) {
      const occupied = vehicle === car && !walking;
      vehicle.render(dt, occupied && started && !reduced.matches, occupied);
    }
    if (walking) player.render(lookPitch);
    const aimed = walking || car === tank;
    const visual = walking ? player.body.interpolatedPosition : car.viewPosition;
    if (walking) yaw = lookYaw;
    else if (!launched && !isTipped(car.chassis)) yaw = flatYaw(car.chassis);
    if (car === tank && !walking) tank.aim(lookYaw - yaw, lookPitch);
    const heading = aimed ? lookYaw : yaw;
    const angularError = Math.atan2(Math.sin(heading - cameraYaw), Math.cos(heading - cameraYaw));
    cameraYaw = snap || reduced.matches ? heading : cameraYaw + angularError * (1 - Math.exp(-(aimed ? 21 : 5.4) * dt));
    forward.set(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const narrow = camera.aspect < .9;
    const airborne = Math.max(0, visual.y - car.stance);
    const backDistance = walking ? (narrow ? 3.7 : 3.45) : (narrow ? 8.75 : 7.65);
    const height = walking ? 1.38 : (narrow ? 3.25 : 3.05) + airborne * .52;
    const shoulder = walking ? .63 : 0;
    const eye = new Vec3(visual.x, visual.y + .75, visual.z);
    const offsetY = aimed ? -Math.sin(lookPitch) * backDistance * .72 : 0;
    const back = new Vec3(-forward.x * backDistance + Math.cos(cameraYaw) * shoulder, height - .75 + offsetY,
      -forward.z * backDistance - Math.sin(cameraYaw) * shoulder);
    let clearance = 1;
    world.raycastAll(eye, eye.vadd(back), { skipBackfaces: true }, hit => {
      if (hit.body.type === Body.STATIC && hit.body.position.y > 0) {
        clearance = Math.min(clearance, Math.max(.39, (hit.distance - .43) / back.length()));
      }
    });
    cameraClearance = snap || reduced.matches ? clearance :
      THREE.MathUtils.damp(cameraClearance, clearance, clearance < cameraClearance ? 22 : 5.6, dt);
    cameraGoal.set(visual.x + back.x * cameraClearance, eye.y + back.y * cameraClearance, visual.z + back.z * cameraClearance);
    if (snap || reduced.matches) camera.position.copy(cameraGoal);
    else camera.position.lerp(cameraGoal, 1 - Math.exp(-9.4 * dt));
    if (aimed) {
      focusGoal.set(cameraGoal.x + forward.x * 18, cameraGoal.y + Math.tan(lookPitch - (walking ? .045 : .08)) * 18,
        cameraGoal.z + forward.z * 18);
    } else focusGoal.set(visual.x + forward.x * 7.3, Math.max(1.18, visual.y + .15), visual.z + forward.z * 7.3);
    if (narrow && !aimed) {
      const alongAvenue = THREE.MathUtils.smoothstep(Math.abs(forward.z), .78, .98);
      const nearCenter = 1 - THREE.MathUtils.smoothstep(Math.abs(visual.x), 4, 8);
      focusGoal.x -= visual.x * alongAvenue * nearCenter * .46;
    }
    if (snap || reduced.matches) focus.copy(focusGoal);
    else focus.lerp(focusGoal, 1 - Math.exp(-12 * dt));
    camera.lookAt(focus);
    skybox.position.copy(camera.position);
    const anchorX = Math.round(visual.x * 16) / 16;
    const anchorZ = Math.round(visual.z * 16) / 16;
    sun.target.position.set(anchorX, 0, anchorZ);
    sun.position.set(anchorX - 35, 32, anchorZ - 30);
    routeHeading.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    const story = stories.update(position, walking ? still : car.chassis.velocity, routeHeading, camera.position, dt, reduced.matches);
    if (story.shattered) announce(t.shattered, 5);
    if (lastChapter !== story.index) {
      lastChapter = story.index;
      currentPage = story.page;
      chapter.textContent = story.page.chapterTitle;
      stationName.textContent = story.page.title;
      chapterIndex.textContent = String(story.index + 1).padStart(2, '0') + ' / ' + String(story.total).padStart(2, '0');
      readButton.setAttribute('aria-label', `${story.page.chapterTitle} · ${t.read}: ${story.page.title}`);
      readButton.title = t.read + ': ' + story.page.title;
    }
    renderer.render(scene, camera);
  }
  function resize() {
    const { clientWidth, clientHeight } = view;
    if (!clientWidth || !clientHeight || graphicsLost) return;
    camera.aspect = clientWidth / clientHeight;
    camera.fov = camera.aspect < .9 ? 64 : 53;
    camera.updateProjectionMatrix();
    const pixelBudget = compact ? 1_900_000 : 4_000_000;
    const maxRatio = compact ? 1.85 : 2;
    const budgetRatio = Math.sqrt(pixelBudget / (clientWidth * clientHeight));
    baseRatio = Math.min(Math.max(devicePixelRatio, 1.45), maxRatio, budgetRatio);
    renderer.setPixelRatio(baseRatio * resolution);
    renderer.setSize(clientWidth, clientHeight, false);
    draw(0, true);
    showTouch();
  }
  function showHud() {
    const velocity = walking ? player.body.velocity : car.chassis.velocity;
    const speed = Math.hypot(velocity.x, velocity.z) * 3.6;
    speedValue.textContent = String(Math.round(speed)).padStart(3, '0');
  }
  function resetCar() {
    crateCountdown.cancel();
    city.resetParkCrates();
    if (walking || car === tank) {
      car = getVehicle(selectedKind);
      spawned.add(car);
      enterVehicle(car);
    }
    car.setPose(initial.x, car.stance, initial.z);
    exitRequested = false;
    clearInput();
    updateFleet();
    tippedFor = 0;
    launched = false;
    yaw = 0;
    forward.set(0, 0, -1);
    city.sync(position);
    stories.reset();
    city.update(time, position, !reduced.matches);
    showHud();
    draw(0, true);
  }
  function clearInput() {
    keys.clear();
    pointers.clear();
    firing = false;
    aimPointer = null;
  }
  function recovery(dt) {
    const altitude = position.y - car.stance;
    if (!isTipped(car.chassis) || altitude > .93) {
      if (launched && time - launchedAt > .35 && car.grounded && !isTipped(car.chassis)) launched = false;
      tippedFor = 0;
      return;
    }
    const touchingDown = world.contacts.some(contact =>
      (contact.bi === car.chassis || contact.bj === car.chassis) && Math.abs(contact.ni.y) > .45);
    if (touchingDown || tippedFor) tippedFor += dt;
    if (tippedFor >= 1 && altitude < .63 && Math.abs(car.chassis.velocity.y) < 1.8) {
      const [x, z, road] = city.safeLanding(position.x, position.z);
      const heading = launched ? launchYaw : yaw;
      const roadAxis = road === 'east-west' ? Math.PI / 2 : 0;
      const safeYaw = road ? roadAxis + Math.round((heading - roadAxis) / Math.PI) * Math.PI : heading;
      car.setPose(x, car.stance + .14, z, safeYaw, !reduced.matches);
      yaw = safeYaw;
      launched = false;
      tippedFor = 0;
      announce(t.recovered);
    }
  }
  function shoot() {
    if (walking) {
      camera.getWorldDirection(shotDirection);
      shotPoint.copy(camera.position).addScaledVector(shotDirection, 26);
      let closest = 26;
      world.raycastAll(staticRayStart.copy(camera.position), staticRayEnd.copy(shotPoint),
        { skipBackfaces: true, checkCollisionResponse: false }, hit => {
          if (hit.body === player.body || hit.distance >= closest) return;
          closest = hit.distance;
          shotPoint.copy(hit.hitPointWorld);
        });
      const muzzle = player.muzzle(tools[activeTool].id === 'firework');
      shotDirection.subVectors(shotPoint, muzzle).normalize();
      kit.fire(muzzle, shotDirection, player.body);
    } else if (car === tank) {
      const { muzzle, direction } = tank.shot();
      kit.fire(muzzle, direction, tank.chassis, true);
    }
  }
  function tick(now) {
    frame = 0;
    if (stopped || document.hidden || graphicsLost) return;
    const elapsed = now - previous;
    const dt = Math.min(elapsed / 1000, .045);
    previous = now;
    elapsedFrameTime += Math.min(elapsed, 100);
    frameSamples++;
    if (frameSamples >= 84) {
      const average = elapsedFrameTime / frameSamples;
      const target = average > 22 ? Math.max(.67, resolution - .10) : average < 15 ? Math.min(1, resolution + .05) : resolution;
      if (target !== resolution) {
        resolution = target;
        renderer.setPixelRatio(baseRatio * resolution);
      }
      elapsedFrameTime = frameSamples = 0;
    }
    time += dt;
    const velocity = walking ? player.body.velocity : car.chassis.velocity;
    const speed = Math.hypot(velocity.x, velocity.z);
    city.sync(position, velocity);
    updateFleet();
    for (const action of controls.values()) input[action] = false;
    input.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
    for (const code of keys) if (controls.has(code)) input[controls.get(code)] = true;
    for (const action of pointers.values()) input[action] = true;
    if (exitRequested) input.brake = true;
    for (const vehicle of spawned) {
      if (!vehicle.chassis.world) continue;
      if (vehicle === car && !walking) vehicle.drive(input, dt);
      else vehicle.drive(parkedInput, dt);
    }
    if (walking) player.step(input, lookYaw, dt);
    world.step(1 / 60, dt, 4);
    if (!walking) {
      recovery(dt);
      if (exitRequested && speed < 4 && position.y < car.stance + .7) exitVehicle();
    } else if (position.y < -3) player.place(position.x, 1.04, position.z, lookYaw);
    city.update(time, position, !reduced.matches, dt, speed);
    if (firing && toolWheel.hidden) shoot();
    kit.update(dt, time, position, walking, !reduced.matches);
    city.process(time, ({ x, z, driver, impact, localHit, localCrate, pile, shortcut, coins: earned }) => {
      if (earned) {
        coins += earned;
        coinCount.textContent = String(coins);
      }
      const occupied = !walking && driver === car.chassis;
      if (occupied) {
        if (!launched) launchYaw = flatYaw(driver);
        launched = true;
        launchedAt = time;
      }
      launcherImpulse(driver, x, z, impact, localHit, localCrate, pile && !shortcut ? 1.45 : 1);
      if (pile) effects.chain(x, z, pile);
      else effects.blast(x, z);
      audio.play('blast');
      if (occupied && shortcut) crateCountdown.start(profileParks.get(shortcut));
      else if (occupied) announce(t.launch);
    });
    if (noticeUntil <= time && notice.textContent) notice.textContent = '';
    if (time >= hudAt) {
      showHud();
      updatePrompt();
      audio.engine(walking ? null : car.kind, speed, input.forward || input.reverse);
      hudAt = time + .11;
    }
    effects.update(dt);
    draw(dt);
    frame = requestAnimationFrame(tick);
  }
  function wake() {
    if (!frame && !stopped && !document.hidden && !graphicsLost) {
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }
  function setPaused(value) {
    stopped = value;
    clearInput();
    if (stopped) {
      releaseLook();
      audio.engine(null);
    }
    if (!stopped) wake();
  }
  function showTouch() {
    touch.hidden = !started || !(coarse.matches || view.clientWidth < 640) || graphicsLost;
    modTouch.hidden = touch.hidden;
  }
  function healSigns() {
    const restored = stories.heal(stopped || reduced.matches);
    announce(restored ? t.healed : t.intact);
    if (stopped) draw(0, true);
  }
  function readEntry() {
    if (!currentPage || reader.open) return;
    const { title, chapterTitle, meta, date, body, points, tags, links } = currentPage;
    entry.replaceChildren();
    const append = (parent, tag, value) => {
      const item = document.createElement(tag);
      item.textContent = value;
      parent.append(item);
      return item;
    };
    append(entry, 'p', chapterTitle).className = 'label';
    append(entry, 'h2', title).id = 'entry-title';
    if (meta || date) append(entry, 'p', [meta, date].filter(Boolean).join(' · '));
    if (body) append(entry, 'p', body);
    if (points?.length) {
      const list = append(entry, 'ul', '');
      for (const point of points) append(list, 'li', point);
    }
    if (tags?.length) append(entry, 'p', tags.join(' · '));
    for (const { label, href, download } of links) {
      const link = append(entry, 'a', label);
      link.href = href;
      if (download) link.download = '';
      if (href.startsWith('https:')) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    }
    setPaused(true);
    reader.showModal();
  }
  reader.addEventListener('close', () => {
    if (!graphicsLost) setPaused(false);
  });
  const soundToggle = find('#drive-sound');
  const volume = find('#drive-volume');
  const volumeValue = find('#drive-volume-value');
  function syncAudio() {
    audio.configure(Number(volume.value) / 100, !soundToggle.checked);
    volumeValue.value = volume.value + '%';
  }
  soundToggle.addEventListener('change', () => { syncAudio(); audio.play('click'); });
  volume.addEventListener('input', syncAudio);
  settingsButton.setAttribute('aria-label', label('settings', 'Settings'));
  toolWheel.setAttribute('aria-label', label('wheel', 'Tool wheel'));
  find('#touch-interact').setAttribute('aria-label', label('enterExit', 'Enter or exit vehicle'));
  fireButton.setAttribute('aria-label', label('fire', 'Fire'));
  settingsButton.addEventListener('click', () => {
    audio.unlock();
    audio.play('click');
    openWheel(false);
    setPaused(true);
    settings.showModal();
  });
  settings.addEventListener('close', () => {
    if (!graphicsLost && !reader.open) setPaused(false);
  });
  vehicleSelect.addEventListener('change', () => {
    switchVehicle(vehicleSelect.value);
    audio.play('click');
  });
  toolToggle.addEventListener('click', () => openWheel(toolWheel.hidden, true));
  for (const [index, button] of toolSlots.entries()) {
    button.addEventListener('click', () => {
      if (!kit.select(index)) return;
      openWheel(false);
      audio.play('click');
      toolToggle.focus({ preventScroll: true });
    });
  }
  coarse.addEventListener('change', showTouch);
  start.addEventListener('click', () => {
    audio.unlock();
    audio.play('click');
    started = true;
    cover.hidden = true;
    reset.disabled = false;
    healButton.disabled = false;
    readButton.disabled = false;
    settingsButton.disabled = false;
    updateMode();
    game.focus({ preventScroll: true });
    setPaused(false);
  });
  reset.addEventListener('click', () => { audio.play('click'); resetCar(); });
  healButton.addEventListener('click', () => { audio.play('click'); healSigns(); });
  readButton.addEventListener('click', () => { audio.play('click'); openWheel(false); readEntry(); });
  find('#touch-interact').addEventListener('click', interact);
  const aimed = () => started && !stopped && !graphicsLost && (walking || car === tank) && toolWheel.hidden;
  function turnLook(dx, dy) {
    lookYaw -= dx * .0034;
    lookPitch = THREE.MathUtils.clamp(lookPitch - dy * .00325, -.82, .70);
  }
  view.addEventListener('pointerdown', event => {
    if (!aimed() || event.button !== 0) return;
    aimPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    view.setPointerCapture(event.pointerId);
    game.focus({ preventScroll: true });
    if (event.pointerType !== 'mouse') return;
    firing = true;
    if (document.pointerLockElement === renderer.domElement) return;
    try {
      const lock = renderer.domElement.requestPointerLock?.();
      lock?.catch(() => {});
    } catch {
      // Drag aiming still works when pointer lock is not available.
    }
  });
  document.addEventListener('pointermove', event => {
    if (!aimed()) return;
    if (document.pointerLockElement === renderer.domElement) turnLook(event.movementX, event.movementY);
    else if (aimPointer?.id === event.pointerId) {
      turnLook(event.clientX - aimPointer.x, event.clientY - aimPointer.y);
      aimPointer.x = event.clientX;
      aimPointer.y = event.clientY;
    }
  });
  function stopPointer(event) {
    if (aimPointer?.id === event.pointerId) aimPointer = null;
    if (event.pointerType === 'mouse') firing = false;
  }
  document.addEventListener('pointerup', stopPointer);
  document.addEventListener('pointercancel', stopPointer);
  document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement) firing = false; });
  let lastScroll = -Infinity;
  game.addEventListener('wheel', event => {
    if (!walking || stopped || !event.deltaY || event.target.closest('dialog')) return;
    event.preventDefault();
    if (event.timeStamp - lastScroll < 105) return;
    lastScroll = event.timeStamp;
    kit.cycle(Math.sign(event.deltaY));
  }, { passive: false });
  fireButton.addEventListener('pointerdown', event => {
    if (!aimed() || event.button !== 0) return;
    event.preventDefault();
    fireButton.setPointerCapture(event.pointerId);
    firing = true;
    shoot();
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture', 'blur']) {
    fireButton.addEventListener(name, () => { firing = false; });
  }
  fireButton.addEventListener('click', event => { if (event.detail === 0 && aimed()) shoot(); });
  window.addEventListener('keydown', event => {
    if (!started || stopped || graphicsLost || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === 'Tab' && walking && !event.shiftKey && toolWheel.hidden && document.activeElement === game) {
      event.preventDefault();
      openWheel(true, true);
      return;
    }
    if (event.code === 'Escape' && !toolWheel.hidden) {
      openWheel(false);
      toolToggle.focus({ preventScroll: true });
      return;
    }
    if (!event.repeat && event.code === 'KeyF') {
      event.preventDefault();
      interact();
      return;
    }
    if (walking && /^Digit[1-5]$/.test(event.code)) {
      if (kit.select(Number(event.code.at(-1)) - 1)) openWheel(false);
      return;
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      keys.add(event.code);
      return;
    }
    if (!event.repeat && event.code === 'KeyR') {
      resetCar();
    } else if (!event.repeat && event.code === 'KeyH') {
      healSigns();
    } else if (controls.has(event.code) &&
      !(event.code === 'Space' && event.target.closest?.('button, a, summary'))) {
      event.preventDefault();
      if (walking && event.code === 'Space' && !event.repeat) player.jump();
      keys.add(event.code);
    }
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => { clearInput(); releaseLook(); });
  document.addEventListener('visibilitychange', () => {
    clearInput();
    if (document.hidden && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    if (document.hidden) audio.engine(null);
    wake();
  });
  for (const button of touchButtons) {
    const keyboard = Symbol(button.dataset.input);
    button.addEventListener('pointerdown', event => {
      if (stopped || event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      if (walking && button.dataset.input === 'brake') player.jump();
      pointers.set(event.pointerId, button.dataset.input);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(name, event => pointers.delete(event.pointerId));
    }
    button.addEventListener('keydown', event => {
      if (stopped || (event.code !== 'Space' && event.code !== 'Enter')) return;
      event.preventDefault();
      if (walking && button.dataset.input === 'brake' && !event.repeat) player.jump();
      pointers.set(keyboard, button.dataset.input);
    });
    button.addEventListener('keyup', event => {
      if (event.code === 'Space' || event.code === 'Enter') pointers.delete(keyboard);
    });
    button.addEventListener('blur', () => pointers.delete(keyboard));
  }
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    graphicsLost = true;
    crateCountdown.cancel();
    setPaused(true);
    fail(t.lost);
  });
  game.tabIndex = -1;
  resetCar();
  resize();
  window.addEventListener('resize', resize);
  try {
    await renderer.compileAsync(scene, camera);
  } catch {
    // Drivers without asynchronous compilation can still render the city normally.
  }
  if (graphicsLost) return;
  coverText.textContent = t.ready;
  start.hidden = false;
}

requestAnimationFrame(() => requestAnimationFrame(boot));
