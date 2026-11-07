import './drive.css';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Body, SAPBroadphase, Vec3, World } from 'cannon-es';
import { createCar, flatYaw, isTipped, launcherImpulse } from './drive-car.js';
import { createCity } from './drive-city.js';
import { createSkyStories } from './drive-story.js';

const text = {
  en: {
    back: 'Portfolio', reset: 'Reset', pause: 'Pause', resume: 'Resume', route: 'CV in the city',
    controls: 'Controls', move: 'Drive and steer', brake: 'Brake', loading: 'Preparing the city…',
    start: 'Start driving', ready: 'Explore the city and read the stories above the streets.',
    noGraphics: 'WebGL is unavailable on this device. The portfolio is still available.',
    lost: 'The graphics connection was lost. Reload the page to try again.',
    launch: 'Crate blast!', recovered: 'Back on your wheels', paused: 'Drive paused',
    left: 'Steer left', right: 'Steer right', forward: 'Accelerate', reverse: 'Reverse', speed: 'Speed',
  },
  hr: {
    back: 'Portfolio', reset: 'Vrati auto', pause: 'Pauza', resume: 'Nastavi', route: 'Životopis iznad grada',
    controls: 'Kontrole', move: 'Vozi i skreći', brake: 'Kočnica', loading: 'Pripremam grad…',
    start: 'Kreni voziti', ready: 'Istraži grad i prati priče iznad ulica.',
    noGraphics: 'WebGL nije dostupan na ovom uređaju. Portfolio je i dalje dostupan.',
    lost: 'Veza s grafikom je prekinuta. Ponovno učitaj stranicu za novi pokušaj.',
    launch: 'Eksplozija kutije!', recovered: 'Ponovno na kotačima', paused: 'Vožnja pauzirana',
    left: 'Skreni lijevo', right: 'Skreni desno', forward: 'Ubrzaj', reverse: 'Vozi unatrag', speed: 'Brzina',
  },
};
const language = new URLSearchParams(location.search).get('lang') === 'hr' ? 'hr' : 'en';
const t = text[language];
const find = selector => document.querySelector(selector);
const touchButtons = [...document.querySelectorAll('[data-input]')];
const touch = find('.touch');
const view = find('#view');
const cover = find('#cover');
const coverText = find('#cover-text');
const errorBack = find('.error-back');
const start = find('#start');
const pause = find('#pause');
const reset = find('#reset');
const notice = find('#notice');
const speedValue = find('#speed');
const stationName = find('#station-name');
const chapter = find('#chapter');
const chapterIndex = find('#chapter-index');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const coarse = matchMedia('(any-pointer: coarse)');
const compact = coarse.matches || innerWidth < 700;
document.documentElement.lang = language;
for (const node of document.querySelectorAll('[data-copy]')) node.textContent = t[node.dataset.copy];
for (const link of document.querySelectorAll('a.button')) link.href = language === 'hr' ? './hr.html' : './';
for (const button of touchButtons) button.setAttribute('aria-label', t[button.dataset.input]);
find('.route').setAttribute('aria-label', t.route);
find('.speed').setAttribute('aria-label', t.speed);

const controls = new Map([
  ['KeyW', 'forward'], ['ArrowUp', 'forward'], ['KeyS', 'reverse'], ['ArrowDown', 'reverse'],
  ['KeyA', 'left'], ['ArrowLeft', 'left'], ['KeyD', 'right'], ['ArrowRight', 'right'], ['Space', 'brake'],
]);
const initial = { x: 3, y: .77, z: 9 };

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
  const random = () => Math.random() * 2 - 1;
  const colors = [0xffe1a3, 0xfda259, 0xd29266, 0x715545];
  const geometry = new THREE.BoxGeometry(.12, .12, .12);
  const bits = colors.map(color => new THREE.MeshBasicMaterial({ color }));
  const ringGeometry = new THREE.RingGeometry(.88, 1, 40);
  function blast(x, z) {
    const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({
      color: 0xffc378, transparent: true, opacity: .88, depthWrite: false, side: THREE.DoubleSide,
    }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, .23, z);
    scene.add(ring);
    const parts = Array.from({ length: reduced.matches ? 8 : 28 }, (_, index) => {
      const mesh = new THREE.Mesh(geometry, bits[index % bits.length]);
      mesh.scale.setScalar(.60 + Math.random() * 2.1);
      mesh.position.set(x + random() * .28, .43, z + random() * .28);
      scene.add(mesh);
      return { mesh, velocity: new THREE.Vector3(random() * 9, 3 + Math.random() * 8, random() * 9) };
    });
    pool.push({ ring, parts, age: 0 });
  }
  function update(dt) {
    for (let i = pool.length - 1; i >= 0; i--) {
      const event = pool[i];
      event.age += dt;
      event.ring.scale.setScalar(.55 + event.age * 8.5);
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
  return { blast, update };
}

function fail(message) {
  cover.hidden = false;
  coverText.textContent = message;
  start.hidden = true;
  errorBack.hidden = false;
  pause.disabled = true;
  reset.disabled = true;
  touch.hidden = true;
}

function boot() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !compact, powerPreference: compact ? 'low-power' : 'high-performance' });
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
  renderer.setPixelRatio(Math.min(devicePixelRatio, compact ? 1.12 : 1.65));
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
  sun.shadow.mapSize.set(1024, 1024);
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
  const car = createCar(scene, world);
  const city = createCity(scene, world, car.chassis, compact);
  const stories = createSkyStories(scene, language);
  const effects = makeEffects(scene);
  const keys = new Set();
  const pointers = new Map();
  const input = {};
  const position = car.chassis.position;
  const cameraGoal = new THREE.Vector3();
  const focus = new THREE.Vector3();
  const forward = new THREE.Vector3(0, 0, -1);
  let yaw = 0;
  let cameraYaw = 0;
  let time = 0;
  let noticeUntil = 0;
  let stopped = true;
  let started = false;
  let graphicsLost = false;
  let tippedFor = 0;
  let launched = false;
  let launchedAt = 0;
  let launchYaw = 0;
  let lastChapter = -1;
  let hudAt = 0;
  let previous = 0;
  let frame = 0;

  function announce(message, duration = 2.8) {
    notice.textContent = message;
    noticeUntil = time + duration;
  }
  function draw(dt, snap = false) {
    car.render();
    if (!launched && !isTipped(car.chassis)) yaw = flatYaw(car.chassis);
    const angularError = Math.atan2(Math.sin(yaw - cameraYaw), Math.cos(yaw - cameraYaw));
    cameraYaw = snap || reduced.matches ? yaw : cameraYaw + angularError * (1 - Math.exp(-5.4 * dt));
    forward.set(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const narrow = camera.aspect < .9;
    const airborne = Math.max(0, position.y - .75);
    const backDistance = narrow ? 8.75 : 7.65;
    const height = (narrow ? 3.25 : 3.05) + airborne * .52;
    const eye = new Vec3(position.x, position.y + .75, position.z);
    const back = new Vec3(-forward.x * backDistance, height - .75, -forward.z * backDistance);
    let clearance = 1;
    world.raycastAll(eye, eye.vadd(back), { skipBackfaces: true }, hit => {
      if (hit.body.type === Body.STATIC && hit.body.position.y > 0) {
        clearance = Math.min(clearance, Math.max(.39, (hit.distance - .43) / back.length()));
      }
    });
    cameraGoal.set(position.x + back.x * clearance, eye.y + back.y * clearance, position.z + back.z * clearance);
    if (snap || reduced.matches) camera.position.copy(cameraGoal);
    else camera.position.lerp(cameraGoal, 1 - Math.exp(-9.4 * dt));
    focus.set(position.x + forward.x * 7.3, Math.max(1.18, position.y + .15), position.z + forward.z * 7.3);
    camera.lookAt(focus);
    skybox.position.copy(camera.position);
    const anchorX = Math.round(position.x / 4) * 4;
    const anchorZ = Math.round(position.z / 4) * 4;
    sun.target.position.set(anchorX, 0, anchorZ);
    sun.position.set(anchorX - 35, 32, anchorZ - 30);
    const story = stories.update(position, forward, camera, dt, reduced.matches);
    if (lastChapter !== story.index) {
      lastChapter = story.index;
      chapter.textContent = story.card.chapter;
      stationName.textContent = story.card.title;
      chapterIndex.textContent = String(story.index + 1).padStart(2, '0') + ' / ' + String(story.total).padStart(2, '0');
    }
    renderer.render(scene, camera);
  }
  function resize() {
    const { clientWidth, clientHeight } = view;
    if (!clientWidth || !clientHeight || graphicsLost) return;
    camera.aspect = clientWidth / clientHeight;
    camera.fov = camera.aspect < .9 ? 60 : 53;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight, false);
    draw(0, true);
    showTouch();
  }
  function showHud() {
    const speed = Math.hypot(car.chassis.velocity.x, car.chassis.velocity.z) * 3.6;
    speedValue.textContent = String(Math.round(speed)).padStart(3, '0');
  }
  function resetCar() {
    car.setPose(initial.x, initial.y, initial.z);
    tippedFor = 0;
    launched = false;
    yaw = 0;
    forward.set(0, 0, -1);
    city.sync(position);
    stories.reset(position, forward);
    city.update(time, position, !reduced.matches);
    showHud();
    draw(0, true);
  }
  function clearInput() {
    keys.clear();
    pointers.clear();
  }
  function recovery(dt) {
    if (!isTipped(car.chassis) || position.y > 1.7) {
      if (launched && time - launchedAt > .35 && car.grounded && !isTipped(car.chassis)) launched = false;
      tippedFor = 0;
      return;
    }
    const touchingDown = world.contacts.some(contact =>
      (contact.bi === car.chassis || contact.bj === car.chassis) && Math.abs(contact.ni.y) > .45);
    if (touchingDown || tippedFor) tippedFor += dt;
    if (tippedFor >= 1 && position.y < 1.4 && Math.abs(car.chassis.velocity.y) < 1.8) {
      const [x, z, road] = city.safeLanding(position.x, position.z);
      const heading = launched ? launchYaw : yaw;
      const roadAxis = road === 'east-west' ? Math.PI / 2 : 0;
      const safeYaw = road ? roadAxis + Math.round((heading - roadAxis) / Math.PI) * Math.PI : heading;
      car.setPose(x, .91, z, safeYaw);
      yaw = safeYaw;
      launched = false;
      tippedFor = 0;
      announce(t.recovered);
    }
  }
  function tick(now) {
    frame = 0;
    if (stopped || document.hidden || graphicsLost) return;
    const dt = Math.min((now - previous) / 1000, .045);
    previous = now;
    time += dt;
    city.sync(position);
    for (const action of controls.values()) input[action] = false;
    for (const code of keys) input[controls.get(code)] = true;
    for (const action of pointers.values()) input[action] = true;
    car.drive(input, dt);
    world.step(1 / 60, dt, 4);
    recovery(dt);
    city.process(time, (x, z, impact, variant) => {
      if (!launched) launchYaw = flatYaw(car.chassis);
      launched = true;
      launchedAt = time;
      launcherImpulse(car.chassis, x, z, impact, variant);
      effects.blast(x, z);
      announce(t.launch);
    });
    city.update(time, position, !reduced.matches);
    if (noticeUntil <= time && notice.textContent) notice.textContent = '';
    if (time >= hudAt) {
      showHud();
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
    pause.textContent = stopped ? t.resume : t.pause;
    pause.setAttribute('aria-pressed', String(stopped));
    clearInput();
    if (stopped) announce(t.paused, Infinity);
    else {
      notice.textContent = '';
      wake();
    }
  }
  function showTouch() {
    touch.hidden = !started || !(coarse.matches || view.clientWidth < 640) || graphicsLost;
  }
  coarse.addEventListener('change', showTouch);
  start.addEventListener('click', () => {
    started = true;
    cover.hidden = true;
    pause.disabled = false;
    reset.disabled = false;
    showTouch();
    find('#game').focus({ preventScroll: true });
    setPaused(false);
  });
  pause.addEventListener('click', () => setPaused(!stopped));
  reset.addEventListener('click', resetCar);
  window.addEventListener('keydown', event => {
    if (!started || graphicsLost || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!event.repeat && event.code === 'KeyP') {
      setPaused(!stopped);
    } else if (!event.repeat && event.code === 'KeyR') {
      resetCar();
    } else if (!stopped && controls.has(event.code) &&
      !(event.code === 'Space' && event.target.closest?.('button, a, summary'))) {
      event.preventDefault();
      keys.add(event.code);
    }
  });
  window.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', () => {
    clearInput();
    if (document.hidden && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
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
    clearInput();
    fail(t.lost);
  });
  find('#game').tabIndex = -1;
  resetCar();
  resize();
  window.addEventListener('resize', resize);
  coverText.textContent = t.ready;
  start.hidden = false;
}

requestAnimationFrame(() => requestAnimationFrame(boot));
