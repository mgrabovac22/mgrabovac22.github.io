import './drive.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Body, SAPBroadphase, Vec3, World } from 'cannon-es';
import { createCar, flatYaw, isTipped, launcherImpulse } from './drive-car.js';
import { createCity } from './drive-city.js';
import { createSkyStories } from './drive-story.js';
import { loadPortfolio, localAsset } from './portfolio.js';
import { createStory } from './story.js';
import { crateProfileUrl, crateServices, createCrateCountdown } from './drive-crate-links.js';
import { createUtilityVehicle, tankBay, vehicleTypes } from './drive-vehicle.js';
import { createPlayer } from './drive-player.js';
import { createDriveAudio } from './drive-audio.js';
import { createShotTrigger, createToolKit, tools } from './drive-tools.js';

const query = new URLSearchParams(location.search);
const language = query.get('lang') === 'hr' ? 'hr' : 'en';
const circuitModes = new Map([['race', 'formula'], ['rally', 'buggy']]);
const requestedMap = query.get('map');
const cityMode = !circuitModes.has(requestedMap);
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
const mapSelect = find('#drive-map');
const toolHud = find('#tool-hud');
const toolToggle = find('#tool-toggle');
const toolWheel = find('#tool-wheel');
const toolSlotsHost = find('#tool-slots');
const holsterButton = find('#holster');
const closeInventory = find('#close-inventory');
const modTouch = find('#vehicle-touch');
const footTouch = find('#foot-touch');
const walkStick = find('#walk-stick');
const lookStick = find('#look-stick');
const jumpButton = find('#touch-jump');
const fireButton = find('#touch-fire');
const aim = find('#aim');
const tankHud = find('#tank-hud');
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
const parkedInput = { forward: false, reverse: false, left: false, right: false, brake: true };

function sky(scene) {
  const coast = requestedMap === 'rally';
  const gradient = new THREE.Mesh(new THREE.SphereGeometry(cityMode ? 210 : 405, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      horizon: { value: new THREE.Color(coast ? 0xc9e8df : 0xb0bbb5) }, zenith: { value: new THREE.Color(coast ? 0x4488a4 : 0x3c5a65) },
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
  gradient.renderOrder = -1;
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
  footTouch.hidden = fireButton.hidden = true;
  aim.hidden = true;
  tankHud.hidden = true;
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
  const mapKind = cityMode ? 'city' : requestedMap;
  const islandStops = new Map();
  if (mapKind === 'rally') {
    for (const [id, name] of Object.entries(crateServices)) {
      const href = crateProfileUrl(data.profile[id], id);
      if (href) islandStops.set(id, { label: name, title: label(id + 'Cove', name), href, action: data.t[id] ?? name });
    }
    islandStops.set('cv', { label: 'CV', title: label('cvShrine', 'CV Shrine'), href: localAsset(data.profile.cv.file), action: data.t.cv, download: true });
  }
  mapSelect.value = mapKind;
  const startKind = cityMode ? 'sport' : circuitModes.get(mapKind);
  const coverTitle = cityMode ? t.title : label(mapKind + 'Title', mapSelect.selectedOptions[0].textContent);
  if (!cityMode) {
    const vehicleName = find('#fixed-drive-vehicle');
    vehicleName.textContent = label(startKind, startKind === 'formula' ? 'Formula car' : 'Rally buggy');
    vehicleName.hidden = false;
    vehicleSelect.hidden = true;
    game.setAttribute('data-circuit', mapKind);
    find('.cover-inner strong').textContent = coverTitle;
    find('#drive-title').textContent = coverTitle;
    document.title = coverTitle + ' — ' + data.profile.name;
    coverText.textContent = label('courseLoading', 'Preparing the track…');
  }
  find('#map-picker').addEventListener('submit', event => {
    event.preventDefault();
    const selected = mapSelect.value;
    if (selected === mapKind) return;
    const url = new URL(location.href);
    if (circuitModes.has(selected)) url.searchParams.set('map', selected);
    else url.searchParams.delete('map');
    location.assign(url);
  });
  for (const button of touchButtons) {
    const key = button.dataset.input;
    button.setAttribute('aria-label', t[key] ?? label(key, button.getAttribute('aria-label')));
  }
  find('.current-route').setAttribute('aria-label', cityMode ? t.route : label('courseRoute', 'Portfolio along the course'));
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
  scene.fog = new THREE.FogExp2(mapKind === 'rally' ? 0xc9e8df : 0xb0bbb5, cityMode ? .014 : mapKind === 'rally' ? .0048 : .007);
  const skybox = sky(scene);
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(environment, .045).texture;
  scene.environmentIntensity = .87;
  environment.dispose();
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(55, 1, .18, cityMode ? 245 : 440);
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

  const courseModule = cityMode ? null : await import('./drive-course.js');
  const PhysicsWorld = mapKind === 'rally' ? courseModule.RallyPhysicsWorld : World;
  const world = new PhysicsWorld({ gravity: new Vec3(0, -9.81, 0), allowSleep: true });
  world.broadphase = new SAPBroadphase(world);
  world.broadphase.axisIndex = 0;
  world.solver.iterations = 9;
  world.defaultContactMaterial.friction = .42;
  world.defaultContactMaterial.restitution = .06;
  const course = courseModule?.createCourse(scene, world, mapKind, islandStops);
  const raceRank = find('#race-rank');
  const islandDialog = find('#island-stop');
  find('#race-position').hidden = !course?.grid;
  const starter = cityMode ? createCar(scene, world) : createUtilityVehicle(scene, world, startKind);
  const initial = course?.start ?? { x: 3, z: 9, yaw: 0 };
  let tank = null;
  const fleet = new Map([[startKind, starter]]);
  const spawned = new Set([starter]);
  const terrain = course ?? createCity(scene, world, compact, renderer.capabilities.getMaxAnisotropy(), profileParks);
  const stories = createSkyStories(scene, world, pages, course?.route);
  const effects = makeEffects(scene);
  const crateCountdown = createCrateCountdown(find('#crate-redirect'), crateCopy);
  const audio = createDriveAudio();
  const player = cityMode ? createPlayer(scene, world, audio, compact) : null;
  const keys = new Set();
  const pointers = new Map();
  const input = {};
  const walk = { pointer: null, x: 0, y: 0 };
  const look = { pointer: null, x: 0, y: 0 };
  const trigger = createShotTrigger();
  let car = starter;
  let position = car.chassis.position;
  let walking = false;
  let lookYaw = 0;
  let lookPitch = -.05;
  let exitRequested = false;
  let aimPointer = null;
  let mouseLook = null;
  let selectedKind = startKind;
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
  let activeTool = -1;
  const toolSlots = tools.map(({ id, color }, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.style.setProperty('--tool-color', '#' + color.toString(16));
    button.setAttribute('aria-pressed', 'false');
    const slot = document.createElement('span');
    slot.textContent = String(index + 1);
    slot.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.textContent = label(id, id);
    button.append(slot, name);
    toolSlotsHost.append(button);
    return button;
  });
  const kit = cityMode ? createToolKit(scene, world, terrain, player.held, audio, compact, index => {
    activeTool = index;
    trigger.clear();
    player.equip(index >= 0);
    for (const [slot, button] of toolSlots.entries()) {
      button.setAttribute('aria-pressed', String(slot === index));
    }
    showTool();
  }) : null;
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
    const armed = Boolean(walking && equipped || car === tank);
    find('#tool-name').textContent = equipped ? label(equipped.id, equipped.id) : '';
    holsterButton.disabled = activeTool < 0;
    aim.hidden = !started || !armed;
    const touchMode = game.hasAttribute('data-touch');
    fireButton.hidden = !touchMode || !armed;
  }
  function openWheel(open, focusSlot = false) {
    if (open && !walking) return;
    toolWheel.hidden = !open;
    game.toggleAttribute('data-inventory', open);
    toolToggle.setAttribute('aria-expanded', String(open));
    if (open) {
      releaseLook();
      resetStick(walkStick, walk);
      resetStick(lookStick, look);
      if (focusSlot) toolSlots[Math.max(0, activeTool)].focus({ preventScroll: true });
    }
  }
  function releaseLook() {
    trigger.clear();
    aimPointer = null;
    mouseLook = null;
    if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
  }
  function updateFleet() {
    if (cityMode && !tank && Math.hypot(tankBay.x - position.x, tankBay.z - position.z) < 60) {
      tank = getVehicle('tank');
      tank.setPose(tankBay.x, tank.stance, tankBay.z, tankBay.yaw);
      spawned.add(tank);
    }
    for (const vehicle of fleet.values()) {
      const p = vehicle.chassis.position;
      vehicle.setActive(spawned.has(vehicle) && (vehicle === car && !walking || Math.hypot(p.x - position.x, p.z - position.z) < 52));
    }
  }
  function updateMode() {
    game.toggleAttribute('data-walking', walking);
    toolHud.hidden = !started || !walking;
    tankHud.hidden = !started || walking || car !== tank;
    if (!walking) openWheel(false);
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
      const entry = label('enter', 'Enter {vehicle}');
      const hint = game.hasAttribute('data-touch') ? entry : 'F · ' + entry;
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
    kit.select(-1);
    updateMode();
    updatePrompt();
    if (car !== tank) vehicleSelect.value = selectedKind = car.kind;
    audio.play('click');
  }
  function interact() {
    if (!cityMode || stopped || !started) return;
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
    if (!cityMode || !vehicleTypes.includes(kind)) return;
    const replacement = getVehicle(kind);
    if (!walking && replacement === car) return;
    const previousCar = car;
    const [x, z, road] = terrain.safeLanding(position.x, position.z);
    const driverYaw = walking ? lookYaw : flatYaw(car.chassis);
    const axis = road === 'east-west' ? Math.PI / 2 : 0;
    const heading = road ? axis + Math.round((driverYaw - axis) / Math.PI) * Math.PI : driverYaw;
    let spawnX = x, spawnZ = z;
    if (previousCar === tank && Math.hypot(x - tank.chassis.position.x, z - tank.chassis.position.z) < 5) {
      [spawnX, spawnZ] = terrain.safeLanding(x - Math.sin(heading) * 5.5, z - Math.cos(heading) * 5.5);
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
    terrain.sync(position);
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
    if (walking) player.render(lookPitch, dt);
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
    const backDistance = walking ? (narrow ? 3.7 : 3.45) : car === tank ? (narrow ? 8.8 : 8.1) : (narrow ? 8.75 : 7.65);
    const height = walking ? 1.38 : (car === tank ? 3.30 : narrow ? 3.25 : 3.05) + airborne * .52;
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
      focusGoal.set(cameraGoal.x + forward.x * 18, cameraGoal.y + Math.tan(lookPitch - (walking ? .045 : .14)) * 18,
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
    if (course?.grid) {
      const { place, count } = course.grid.rank(position);
      const text = `${place} / ${count}`;
      if (raceRank.textContent !== text) raceRank.textContent = text;
    }
    const velocity = walking ? player.body.velocity : car.chassis.velocity;
    const speed = Math.hypot(velocity.x, velocity.z) * 3.6;
    speedValue.textContent = String(Math.round(speed)).padStart(3, '0');
  }
  function resetCar() {
    crateCountdown.cancel();
    if (course) course.reset();
    else terrain.resetParkCrates();
    if (walking || car === tank) {
      car = getVehicle(selectedKind);
      spawned.add(car);
      enterVehicle(car);
    }
    car.setPose(initial.x, car.stance, initial.z, initial.yaw);
    exitRequested = false;
    clearInput();
    updateFleet();
    tippedFor = 0;
    launched = false;
    yaw = initial.yaw;
    forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    terrain.sync(position);
    course?.grid?.reset();
    stories.reset();
    terrain.update(time, position, !reduced.matches);
    showHud();
    draw(0, true);
  }
  function clearInput() {
    keys.clear();
    pointers.clear();
    trigger.clear();
    aimPointer = null;
    mouseLook = null;
    resetStick(walkStick, walk);
    resetStick(lookStick, look);
  }
  function recovery(dt) {
    const tipped = isTipped(car.chassis);
    const altitude = position.y - car.stance - (course && tipped ? course.groundHeight(position) : 0);
    const outsideCourse = course?.offCourse(position);
    const rescue = course && (position.y < -2 || outsideCourse);
    if (!rescue && (!tipped || altitude > .93)) {
      if (launched && time - launchedAt > .35 && car.grounded && !tipped) launched = false;
      tippedFor = 0;
      return;
    }
    const touchingDown = world.contacts.some(contact =>
      (contact.bi === car.chassis || contact.bj === car.chassis) && Math.abs(contact.ni.y) > .45);
    if (touchingDown || tippedFor) tippedFor += dt;
    if (rescue || (tippedFor >= 1 && altitude < .63 && Math.abs(car.chassis.velocity.y) < 1.8)) {
      const [x, z, road, circuitYaw] = terrain.safeLanding(position.x, position.z);
      const heading = launched ? launchYaw : yaw;
      const roadAxis = road === 'east-west' ? Math.PI / 2 : 0;
      const safeYaw = circuitYaw ?? (road ? roadAxis + Math.round((heading - roadAxis) / Math.PI) * Math.PI : heading);
      car.setPose(x, car.stance + .14, z, safeYaw, !reduced.matches);
      yaw = safeYaw;
      launched = false;
      tippedFor = 0;
      announce(rescue && mapKind === 'rally' ? t.waterRecovery : t.recovered);
    }
  }
  function shoot() {
    if (walking && activeTool >= 0) {
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
      const fired = kit.fire(muzzle, shotDirection, player.body);
      if (fired) player.kick();
      return fired;
    } else if (car === tank) {
      const { muzzle, direction } = tank.shot();
      return kit.fire(muzzle, direction, tank.chassis, true);
    }
    return false;
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
    terrain.sync(position, velocity);
    updateFleet();
    for (const action of controls.values()) input[action] = false;
    input.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
    input.moveX = walk.x;
    input.moveZ = walk.y;
    input.sprintAmount = THREE.MathUtils.smoothstep(Math.hypot(walk.x, walk.y), .68, .97);
    for (const code of keys) if (controls.has(code)) input[controls.get(code)] = true;
    for (const action of pointers.values()) input[action] = true;
    if (exitRequested) input.brake = true;
    for (const vehicle of spawned) {
      if (!vehicle.chassis.world) continue;
      if (vehicle === car && !walking) vehicle.drive(input, dt);
      else vehicle.drive(parkedInput, dt);
    }
    if (walking) {
      lookYaw -= look.x * dt * 2.65;
      lookPitch = THREE.MathUtils.clamp(lookPitch - look.y * dt * 1.65, -.82, .70);
      player.step(input, lookYaw, dt);
    }
    course?.wade(car.chassis, dt);
    course?.advance(dt, car);
    world.step(1 / 60, dt, 4);
    if (!walking) {
      recovery(dt);
      if (exitRequested && speed < 4 && position.y < car.stance + .7) exitVehicle();
    } else if (position.y < -3) player.place(position.x, 1.04, position.z, lookYaw);
    terrain.update(time, position, !reduced.matches, dt, speed);
    if (canFire()) trigger.update(shoot);
    kit?.update(dt);
    terrain.process(time, ({ x, z, driver, impact, localHit, localCrate, pile, shortcut, coins: earned }) => {
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
    const arrival = course?.takeArrival(car.chassis);
    if (arrival) {
      openIslandStop(arrival);
      return;
    }
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
    const touchMode = started && !graphicsLost && (coarse.matches || view.clientWidth < 640);
    game.toggleAttribute('data-touch', touchMode);
    touch.hidden = !touchMode || walking;
    modTouch.hidden = !touchMode || !cityMode;
    footTouch.hidden = !touchMode || !walking;
    if (footTouch.hidden) {
      resetStick(walkStick, walk);
      resetStick(lookStick, look);
    }
    showTool();
  }
  function resetStick(element, stick) {
    if (stick.pointer === null) return;
    stick.pointer = null;
    stick.x = stick.y = 0;
    element.style.removeProperty('--stick-x');
    element.style.removeProperty('--stick-y');
  }
  function readStick(event, element, stick) {
    const dx = (event.clientX - stick.centerX) / stick.radius;
    const dy = (event.clientY - stick.centerY) / stick.radius;
    const length = Math.hypot(dx, dy);
    const amount = THREE.MathUtils.smoothstep(length, .14, 1);
    const scale = length > 0 ? amount / length : 0;
    stick.x = dx * scale;
    stick.y = dy * scale;
    stick.moved ||= Math.hypot(event.clientX - stick.startX, event.clientY - stick.startY) > 9;
    element.style.setProperty('--stick-x', stick.x * stick.radius + 'px');
    element.style.setProperty('--stick-y', stick.y * stick.radius + 'px');
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
  function openIslandStop(destination) {
    const link = find('#island-stop-link');
    find('#island-stop-title').textContent = destination.title;
    find('#island-stop-note').textContent = destination.download ? label('cvShrineNote', 'Download the portfolio CV as a PDF.') :
      label('islandLinkNote', 'Open this portfolio profile in a new tab.');
    link.href = destination.href;
    link.textContent = destination.action;
    link.toggleAttribute('download', destination.download === true);
    link.target = destination.download ? '_self' : '_blank';
    link.rel = 'noopener noreferrer';
    audio.play('click');
    setPaused(true);
    islandDialog.showModal();
  }
  islandDialog.addEventListener('close', () => {
    game.focus({ preventScroll: true });
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
  toolWheel.setAttribute('aria-label', label('inventory', 'Inventory'));
  closeInventory.setAttribute('aria-label', label('inventoryClose', 'Close inventory'));
  find('#touch-interact').setAttribute('aria-label', label('enterExit', 'Enter or exit vehicle'));
  fireButton.setAttribute('aria-label', label('fire', 'Fire'));
  jumpButton.setAttribute('aria-label', label('jump', 'Jump'));
  lookStick.setAttribute('aria-label', label('lookStick', 'Aim or tap to fire'));
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
  function dismissInventory() {
    openWheel(false);
    toolToggle.focus({ preventScroll: true });
  }
  closeInventory.addEventListener('click', dismissInventory);
  holsterButton.addEventListener('click', () => {
    kit.select(-1);
    dismissInventory();
  });
  for (const [index, button] of toolSlots.entries()) {
    button.addEventListener('click', () => {
      if (!kit.select(index)) return;
      dismissInventory();
      audio.play('click');
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
  jumpButton.addEventListener('click', () => { if (walking && !stopped) player.jump(); });
  function bindStick(element, stick, onTap) {
    element.addEventListener('pointerdown', event => {
      if (!walking || stopped || !toolWheel.hidden || stick.pointer !== null || event.button !== 0) return;
      event.preventDefault();
      const bounds = element.getBoundingClientRect();
      stick.pointer = event.pointerId;
      stick.centerX = bounds.left + bounds.width / 2;
      stick.centerY = bounds.top + bounds.height / 2;
      stick.startX = event.clientX;
      stick.startY = event.clientY;
      stick.moved = false;
      stick.radius = bounds.width * .32;
      element.setPointerCapture(event.pointerId);
      if (!onTap) readStick(event, element, stick);
    });
    element.addEventListener('pointermove', event => { if (event.pointerId === stick.pointer) readStick(event, element, stick); });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      element.addEventListener(name, event => {
        if (event.pointerId !== stick.pointer) return;
        if (name === 'pointerup' && !stick.moved) onTap?.();
        resetStick(element, stick);
      });
    }
  }
  bindStick(walkStick, walk);
  bindStick(lookStick, look, tapFire);
  lookStick.addEventListener('click', event => { if (event.detail === 0) tapFire(); });
  const canAim = () => started && !stopped && !graphicsLost && (walking || car === tank) && toolWheel.hidden;
  const canFire = () => canAim() && (car === tank || activeTool >= 0);
  function tapFire() {
    if (canFire()) trigger.tap();
  }
  function turnLook(dx, dy) {
    lookYaw -= dx * .0034;
    lookPitch = THREE.MathUtils.clamp(lookPitch - dy * .00325, -.82, .70);
  }
  const mouse = Symbol('mouse');
  window.addEventListener('mousedown', event => {
    if (!canAim() || event.button !== 0) return;
    const locked = document.pointerLockElement === renderer.domElement;
    if (!locked && !view.contains(event.target)) return;
    event.preventDefault();
    game.focus({ preventScroll: true });
    if (canFire()) trigger.press(mouse);
    if (locked) return;
    mouseLook = { x: event.clientX, y: event.clientY };
    try {
      const lock = renderer.domElement.requestPointerLock?.();
      lock?.catch(() => {});
    } catch {
      // Drag aiming still works when pointer lock is not available.
    }
  }, { capture: true });
  window.addEventListener('mouseup', event => {
    if (event.button !== 0) return;
    trigger.release(mouse);
    mouseLook = null;
  }, { capture: true });
  document.addEventListener('mousemove', event => {
    if (!canAim()) return;
    if (document.pointerLockElement === renderer.domElement) turnLook(event.movementX, event.movementY);
    else if (mouseLook) {
      turnLook(event.clientX - mouseLook.x, event.clientY - mouseLook.y);
      mouseLook.x = event.clientX;
      mouseLook.y = event.clientY;
    }
  });
  view.addEventListener('pointerdown', event => {
    if (!canAim() || event.pointerType === 'mouse') return;
    event.preventDefault();
    if (walking || aimPointer) return;
    aimPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    view.setPointerCapture(event.pointerId);
  });
  document.addEventListener('pointermove', event => {
    if (canAim() && aimPointer?.id === event.pointerId) {
      turnLook(event.clientX - aimPointer.x, event.clientY - aimPointer.y);
      aimPointer.x = event.clientX;
      aimPointer.y = event.clientY;
    }
  });
  function stopPointer(event) {
    if (aimPointer?.id === event.pointerId) aimPointer = null;
  }
  document.addEventListener('pointerup', stopPointer);
  document.addEventListener('pointercancel', stopPointer);
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement) {
      trigger.release(mouse);
      mouseLook = null;
    }
  });
  let lastScroll = -Infinity;
  game.addEventListener('wheel', event => {
    if (!walking || stopped || !event.deltaY || event.target.closest('dialog')) return;
    event.preventDefault();
    if (event.timeStamp - lastScroll < 105) return;
    lastScroll = event.timeStamp;
    kit.cycle(Math.sign(event.deltaY));
  }, { passive: false });
  fireButton.addEventListener('pointerdown', event => {
    if (!canFire() || event.button !== 0) return;
    event.preventDefault();
    fireButton.setPointerCapture(event.pointerId);
    trigger.press(event.pointerId);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    fireButton.addEventListener(name, event => trigger.release(event.pointerId));
  }
  fireButton.addEventListener('click', event => { if (event.detail === 0) tapFire(); });
  window.addEventListener('keydown', event => {
    if (!started || stopped || graphicsLost || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === 'Tab' && walking && !event.shiftKey && toolWheel.hidden && document.activeElement === game) {
      event.preventDefault();
      openWheel(true, true);
      return;
    }
    if (event.code === 'Escape' && !toolWheel.hidden) {
      dismissInventory();
      return;
    }
    if (cityMode && !event.repeat && event.code === 'KeyF') {
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
      pointers.set(event.pointerId, button.dataset.input);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      button.addEventListener(name, event => pointers.delete(event.pointerId));
    }
    button.addEventListener('keydown', event => {
      if (stopped || (event.code !== 'Space' && event.code !== 'Enter')) return;
      event.preventDefault();
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
  coverText.textContent = cityMode ? t.ready : label(mapKind + 'Ready', 'Follow the route and read the portfolio boards.');
  start.hidden = false;
}

requestAnimationFrame(() => requestAnimationFrame(boot));
