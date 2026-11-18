import * as THREE from 'three';
import { createEngineDisplay, createRaceArtwork } from './drive-race-art.js';
import { modelFor, normalizeRaceBuild, raceEngineKey, raceModels, raceOptions, raceSpec } from './drive-race-build.js';
import './drive-workshop.css';

const storageKey = 'apex-race-builds-v1';
const copy = {
  en: {
    title: 'Circuit workshop', close: 'Back to settings', race: 'Apply & race', reset: 'Stock setup', save: 'Save build', saved: 'Build saved on this device.',
    view: 'Rotate the car with drag or arrow keys. Scroll to zoom.', orbit: 'Rotate automatically', list: 'Race cars', speed: 'Top speed', mass: 'Weight', vehicle: 'Car',
    type: ['Formula', 'GT coupe', 'Endurance prototype', 'Touring sedan', 'Open roadster', 'Hypercar', 'Muscle car', 'Rally hatch', 'Electric coupe', 'Time attack'],
    tabs: ['Paint', 'Aero', 'Wheels', 'Details', 'Powertrain'],
    force: 'Drive force', inspect: 'Inspect engine', showCar: 'Show car', rev: 'Test engine sound',
    labels: { paint:'Body paint', accent:'Accent paint', finish:'Paint finish', livery:'Livery', wing:'Rear spoiler', splitter:'Front splitter', skirts:'Side skirts', hood:'Hood',
      rims:'Rim design', rimColor:'Rim finish', caliper:'Brake calipers', tire:'Tire', exhaust:'Exhaust', glass:'Glass / visor', lights:'Light tint', glow:'Underglow', glowColor:'Glow color', number:'Race number',
      engine:'Engine swap', induction:'Forced induction', gearing:'Gearbox', suspension:'Suspension', brakes:'Brakes', drivetrain:'Driven wheels', weight:'Weight reduction' },
    options: {
      finish:['Gloss', 'Metallic', 'Satin', 'Matte', 'Chrome'], livery:['Solid', 'Twin stripes', 'Offset stripe', 'Diagonal', 'Two-tone', 'Fade'],
      wing:['Factory', 'No spoiler', 'Ducktail', 'Club wing', 'High GT', 'Swan neck'], splitter:['Factory', 'Street lip', 'Track blade', 'Blade + canards'],
      skirts:['Factory', 'Carbon blade', 'Widebody'], hood:['Factory', 'Vents', 'Scoop', 'Carbon panel'], rims:['Factory', 'Five spoke', 'Mesh', 'Turbine', 'Aero disc'],
      tire:['Slick', 'Grooved', 'Whitewall'], exhaust:['Factory', 'Twin', 'Quad', 'Center'], glass:['Clear', 'Smoke', 'Ice blue', 'Amber'],
      lights:['White', 'Amber', 'Ice blue', 'Mint'], glow:['Off', 'On'],
      engine:['Factory', '3.0 Inline Six', '3.8 V6', '6.2 V8', '7.0 Big Block V8', '5.2 V10', '6.5 V12', 'Dual electric motors'],
      induction:['Factory', 'Twin turbo', 'Supercharger'], gearing:['Factory', 'Short ratio', 'Close ratio', 'Long ratio'],
      suspension:['Factory', 'Comfort', 'Sport', 'Track'], brakes:['Factory', 'Sport', 'Carbon ceramic'],
      drivetrain:['Factory', 'Rear wheel', 'All wheel', 'Front wheel'], weight:['Factory', 'Clubsport', 'Race'],
    },
  },
  hr: {
    title: 'Trkaća radionica', close: 'Natrag u postavke', race: 'Primijeni i utrkuj se', reset: 'Tvornički izgled', save: 'Spremi izgled', saved: 'Izgled spremljen na ovom uređaju.',
    view: 'Okreći auto povlačenjem ili strelicama. Kotačić približava prikaz.', orbit: 'Automatsko okretanje', list: 'Trkaći automobili', speed: 'Najveća brzina', mass: 'Masa', vehicle: 'Auto',
    type: ['Formula', 'GT kupe', 'Prototip za izdržljivost', 'Trkaća limuzina', 'Otvoreni roadster', 'Hiperautomobil', 'Muscle car', 'Rally kompakt', 'Električni kupe', 'Time attack'],
    tabs: ['Lakiranje', 'Aerodinamika', 'Kotači', 'Detalji', 'Pogon'],
    force: 'Pogonska sila', inspect: 'Prikaži motor', showCar: 'Prikaži auto', rev: 'Testiraj zvuk motora',
    labels: { paint:'Boja karoserije', accent:'Boja detalja', finish:'Završna obrada', livery:'Grafika', wing:'Stražnji spojler', splitter:'Prednji splitter', skirts:'Bočni pragovi', hood:'Poklopac motora',
      rims:'Dizajn naplataka', rimColor:'Boja naplataka', caliper:'Boja čeljusti', tire:'Gume', exhaust:'Ispuh', glass:'Stakla / vizir', lights:'Boja svjetala', glow:'Neon ispod auta', glowColor:'Boja neona', number:'Trkaći broj',
      engine:'Motor', induction:'Punjenje motora', gearing:'Mjenjač', suspension:'Ovjes', brakes:'Kočnice', drivetrain:'Pogon kotača', weight:'Smanjenje mase' },
    options: {
      finish:['Sjajna', 'Metalizirana', 'Satenska', 'Mat', 'Kromirana'], livery:['Jednobojna', 'Dvije pruge', 'Pomaknuta pruga', 'Dijagonalna', 'Dvobojna', 'Prijelaz'],
      wing:['Tvornički', 'Bez spojlera', 'Pačji rep', 'Klupsko krilo', 'Visoki GT', 'Labudov vrat'], splitter:['Tvornički', 'Ulični rub', 'Trkaća oštrica', 'Oštrica i krilca'],
      skirts:['Tvornički', 'Karbonski', 'Prošireni'], hood:['Tvornički', 'Ventilacijski otvori', 'Usisnik', 'Karbonski panel'], rims:['Tvornički', 'Pet krakova', 'Mrežasti', 'Turbina', 'Aero disk'],
      tire:['Glatke', 'Profilirane', 'Bijeli rub'], exhaust:['Tvornički', 'Dvostruki', 'Četverostruki', 'Središnji'], glass:['Prozirno', 'Zatamnjeno', 'Ledeno plavo', 'Jantarno'],
      lights:['Bijela', 'Jantarna', 'Ledeno plava', 'Mint'], glow:['Isključeno', 'Uključeno'],
      engine:['Tvornički', 'Redni I6 3.0', 'V6 3.8', 'V8 6.2', 'V8 7.0 Big Block', 'V10 5.2', 'V12 6.5', 'Dva elektromotora'],
      induction:['Tvorničko', 'Dvostruki turbo', 'Kompresor'], gearing:['Tvornički', 'Kratki prijenos', 'Zbijeni omjeri', 'Dugi prijenos'],
      suspension:['Tvornički', 'Udobni', 'Sportski', 'Trkaći'], brakes:['Tvorničke', 'Sportske', 'Karbonsko-keramičke'],
      drivetrain:['Tvornički', 'Stražnji', 'Na sva četiri', 'Prednji'], weight:['Tvornička masa', 'Klupski paket', 'Trkaći paket'],
    },
  },
};
const sections = [
  ['paint', 'accent', 'finish', 'livery'],
  ['wing', 'splitter', 'skirts', 'hood'],
  ['rims', 'rimColor', 'caliper', 'tire'],
  ['exhaust', 'glass', 'lights', 'glow', 'glowColor', 'number'],
  ['engine', 'induction', 'gearing', 'suspension', 'brakes', 'drivetrain', 'weight'],
];
const partFields = ['model', 'number', ...Object.keys(raceOptions)];
const motion = matchMedia('(prefers-reduced-motion: reduce)');

function savedBuilds() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
    return Object.fromEntries(raceModels.filter(model => stored?.[model.id])
      .map(model => [model.id, normalizeRaceBuild({ ...stored[model.id], model: model.id })]));
  } catch {
    return {};
  }
}

export function openRaceWorkshop({ renderer, environment, language, active, playEngine, onClose }) {
  const words = copy[language] ?? copy.en;
  const dialog = document.createElement('dialog');
  dialog.id = 'race-workshop';
  dialog.className = 'race-workshop';
  dialog.setAttribute('aria-labelledby', 'workshop-title');
  dialog.innerHTML = `
    <header class="workshop-header">
      <div><p class="workshop-track">APEX CIRCUIT</p><h2 id="workshop-title">${words.title}</h2></div>
      <button type="button" class="workshop-back">${words.close}</button>
    </header>
    <div class="workshop-workspace">
      <section class="workshop-display">
        <div class="workshop-view" tabindex="0" aria-label="${words.view}">
          <div class="workshop-description">
            <span class="workshop-class"></span><h3></h3><dl></dl>
          </div>
          <label class="workshop-orbit"><input type="checkbox"> ${words.orbit}</label>
        </div>
        <div class="workshop-cars" role="group" aria-label="${words.list}"></div>
      </section>
      <section class="workshop-controls">
        <label class="workshop-model">${words.vehicle}<select></select></label>
        <nav class="workshop-tabs" aria-label="${words.title}"></nav>
        <div class="workshop-fields"></div>
        <div class="workshop-engine-tools" hidden>
          <button type="button" class="workshop-inspect" aria-pressed="false">${words.inspect}</button>
          <button type="button" class="workshop-rev">${words.rev}</button>
        </div>
        <p class="workshop-status" role="status"></p>
      </section>
    </div>
    <footer class="workshop-footer">
      <button type="button" class="workshop-reset">${words.reset}</button>
      <div><button type="button" class="workshop-save">${words.save}</button><button type="button" class="workshop-apply">${words.race}</button></div>
    </footer>`;
  const find = selector => dialog.querySelector(selector);
  const display = find('.workshop-view');
  const modelMenu = find('.workshop-model select');
  const cars = find('.workshop-cars');
  const fields = find('.workshop-fields');
  const tabs = find('.workshop-tabs');
  const orbit = find('.workshop-orbit input');
  const status = find('.workshop-status');
  const engineTools = find('.workshop-engine-tools');
  const inspect = find('.workshop-inspect');
  const builds = savedBuilds();
  const live = normalizeRaceBuild(active);
  let setup = builds[live.model] ?? live;
  const drafts = new Map([[setup.model, setup]]);
  const originalShadows = renderer.shadowMap.enabled;
  let tab = 0, artwork = null, preview = null, dirty = true, result = null;
  let engineView = null, engineKey = '', inspecting = false;
  let frame = 0, previous = 0, pointer = null;
  let yaw = -.63, goalYaw = yaw, pitch = .30, goalPitch = pitch, distance = 7.3, goalDistance = distance;
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 42);
  const scene = new THREE.Scene();
  scene.environment = environment;
  scene.environmentIntensity = 1.04;
  scene.background = new THREE.Color(0x0c1823);
  scene.fog = new THREE.FogExp2(0x0c1823, .052);
  const platform = new THREE.Group();
  const engineStand = new THREE.Group();
  engineStand.visible = false;
  scene.add(platform, engineStand, new THREE.HemisphereLight(0xd8eef6, 0x3b4b51, 2.09));
  const key = new THREE.DirectionalLight(0xffe0b5, 3.0);
  key.position.set(-5, 7, -3);
  const fill = new THREE.DirectionalLight(0x8ec8ff, 1.8);
  fill.position.set(6, 2, 4);
  scene.add(key, fill);
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(3.38, 3.38, .20, 64), new THREE.MeshStandardMaterial({ color: 0x203745, metalness: .3, roughness: .66 }));
  stage.position.y = -.105;
  const marker = new THREE.Mesh(new THREE.RingGeometry(3.11, 3.126, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x40baa6 }));
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 35).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x06131b, opacity: .40, transparent: true, depthWrite: false }));
  shadow.scale.set(1.25, 1, 2.27);
  shadow.position.y = .005;
  marker.position.y = .004;
  const grid = new THREE.GridHelper(44, 44, 0x27505c, 0x1d3543);
  grid.position.y = -.22;
  scene.add(stage, marker, shadow, grid);

  for (const [index, entry] of raceModels.entries()) {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = entry.name;
    modelMenu.append(option);
    const button = document.createElement('button');
    button.type = 'button';
    button.value = entry.id;
    button.setAttribute('aria-label', entry.name);
    button.innerHTML = `<b>${String(index + 1).padStart(2, '0')}</b><span>${entry.name}</span>`;
    button.addEventListener('click', () => switchModel(entry.id));
    cars.append(button);
  }
  for (const [index, name] of words.tabs.entries()) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    button.addEventListener('click', () => {
      tab = index;
      if (tab !== sections.length - 1 && inspecting) showEngine(false);
      renderFields();
    });
    tabs.append(button);
  }
  modelMenu.addEventListener('change', () => switchModel(modelMenu.value));

  function switchModel(id) {
    if (id === setup.model) return;
    setup = drafts.get(id) ?? builds[id] ?? normalizeRaceBuild({ model: id });
    drafts.set(id, setup);
    dirty = true;
    syncModel();
  }
  function syncModel() {
    const spec = modelFor(setup.model);
    modelMenu.value = spec.id;
    for (const button of cars.children) button.setAttribute('aria-pressed', String(button.value === spec.id));
    find('.workshop-description h3').textContent = spec.name;
    renderSpecs();
    status.textContent = '';
    renderFields();
    requestRender();
  }
  function renderFields() {
    fields.replaceChildren();
    [...tabs.children].forEach((button, index) => button.setAttribute('aria-pressed', String(index === tab)));
    engineTools.hidden = tab !== sections.length - 1;
    for (const key of sections[tab]) {
      const label = document.createElement('label');
      label.textContent = words.labels[key];
      let control;
      if (raceOptions[key]) {
        control = document.createElement('select');
        for (const [index, value] of raceOptions[key].entries()) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = words.options[key][index];
          control.append(option);
        }
      } else {
        control = document.createElement('input');
        control.type = key === 'number' ? 'number' : 'color';
        if (key === 'number') {
          control.min = '0';
          control.max = '99';
          control.inputMode = 'numeric';
        }
      }
      control.name = key;
      control.value = setup[key];
      control.addEventListener('input', () => {
        setup = normalizeRaceBuild({ ...setup, [key]: control.value });
        drafts.set(setup.model, setup);
        status.textContent = '';
        dirty = true;
        updateInduction();
        renderSpecs();
        requestRender();
      });
      if (key === 'number') control.addEventListener('change', () => { control.value = setup.number; });
      label.append(control);
      fields.append(label);
    }
    updateInduction();
  }
  function updateInduction() {
    const induction = fields.querySelector('[name=induction]');
    if (!induction) return;
    induction.disabled = raceEngineKey(setup) === 'electric';
    induction.value = setup.induction;
  }
  function renderSpecs() {
    const spec = raceSpec(setup);
    const engine = words.options.engine[raceOptions.engine.indexOf(raceEngineKey(setup))];
    find('.workshop-class').textContent = inspecting ? engine : words.type[raceModels.indexOf(modelFor(setup.model))];
    find('.workshop-description dl').innerHTML = `<div><dt>${words.speed}</dt><dd>${Math.round(spec.max * 3.6)} km/h</dd></div><div><dt>${words.mass}</dt><dd>${spec.mass} kg</dd></div><div><dt>${words.force}</dt><dd>${Math.round(spec.power)} N</dd></div>`;
  }
  function showEngine(value) {
    inspecting = value;
    platform.visible = !value;
    engineStand.visible = value;
    inspect.setAttribute('aria-pressed', String(value));
    inspect.textContent = value ? words.showCar : words.inspect;
    goalDistance = value ? 5.3 : 7.3;
    renderSpecs();
    requestRender();
  }
  function refreshModel() {
    if (!dirty) return;
    dirty = false;
    if (preview && partFields.every(key => setup[key] === preview[key])) {
      artwork.recolor(setup);
      return;
    }
    platform.clear();
    artwork?.dispose();
    artwork = createRaceArtwork(setup);
    preview = setup;
    const model = artwork.instantiate();
    model.view.position.y = artwork.model.stance;
    model.view.add(...model.wheels);
    platform.add(model.view);
  }
  function persist() {
    const build = normalizeRaceBuild(setup);
    builds[build.model] = build;
    try {
      localStorage.setItem(storageKey, JSON.stringify(builds));
      status.textContent = words.saved;
    } catch {
      status.textContent = '';
    }
  }

  function resize() {
    const { clientWidth: width, clientHeight: height } = display;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.fov = camera.aspect < 1 ? 53 : 42;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.65, Math.sqrt(1_350_000 / (width * height))));
    renderer.setSize(width, height, false);
    requestRender();
  }
  function requestRender() {
    if (!frame && dialog.open) frame = requestAnimationFrame(render);
  }
  function render(now) {
    frame = 0;
    refreshModel();
    if (inspecting) {
      const key = [raceEngineKey(setup), setup.induction, setup.accent].join(':');
      if (engineKey !== key) {
        engineStand.clear();
        engineView?.dispose();
        engineView = createEngineDisplay(setup);
        engineStand.add(engineView.view);
        engineKey = key;
      }
    }
    const dt = Math.min(.045, previous ? (now - previous) / 1000 : 0);
    previous = now;
    if (orbit.checked && !pointer) goalYaw += dt * .38;
    const damping = motion.matches ? 1 : 1 - Math.exp(-dt * 11);
    yaw = THREE.MathUtils.lerp(yaw, goalYaw, damping);
    pitch = THREE.MathUtils.lerp(pitch, goalPitch, damping);
    distance = THREE.MathUtils.lerp(distance, goalDistance, damping);
    const focusY = inspecting ? 1.16 : .50;
    camera.position.set(Math.sin(yaw) * distance * Math.cos(pitch), focusY + Math.sin(pitch) * distance,
      -Math.cos(yaw) * distance * Math.cos(pitch));
    camera.lookAt(0, focusY, 0);
    renderer.render(scene, camera);
    if (orbit.checked && !pointer || Math.abs(goalYaw - yaw) + Math.abs(goalPitch - pitch) + Math.abs(goalDistance - distance) > .004) {
      requestRender();
    }
  }

  display.addEventListener('pointerdown', event => {
    if (event.target.closest('label') || event.button !== 0 || pointer) return;
    orbit.checked = false;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    display.setPointerCapture(event.pointerId);
  });
  display.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer?.id) return;
    goalYaw -= (event.clientX - pointer.x) * .012;
    goalPitch = THREE.MathUtils.clamp(goalPitch + (event.clientY - pointer.y) * .008, .06, 1.22);
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    requestRender();
  });
  display.addEventListener('lostpointercapture', () => { pointer = null; });
  display.addEventListener('wheel', event => {
    goalDistance = THREE.MathUtils.clamp(goalDistance + event.deltaY * .005, 4.4, 11.9);
    event.preventDefault();
    requestRender();
  }, { passive: false });
  display.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key) || event.target !== display) return;
    event.preventDefault();
    orbit.checked = false;
    if (event.key === 'Home') {
      goalYaw = -.63; goalPitch = .30; goalDistance = inspecting ? 5.3 : 7.3;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      goalYaw += event.key === 'ArrowLeft' ? .28 : -.28;
    } else goalDistance = THREE.MathUtils.clamp(goalDistance + (event.key === 'ArrowUp' ? -.45 : .45), 4.4, 11.9);
    requestRender();
  });
  orbit.addEventListener('change', requestRender);
  inspect.addEventListener('click', () => showEngine(!inspecting));
  find('.workshop-rev').addEventListener('click', () => playEngine?.(raceSpec(setup)));
  find('.workshop-reset').addEventListener('click', () => {
    setup = normalizeRaceBuild({ model: setup.model });
    drafts.set(setup.model, setup);
    dirty = true;
    syncModel();
  });
  find('.workshop-save').addEventListener('click', persist);
  find('.workshop-back').addEventListener('click', () => dialog.close());
  find('.workshop-apply').addEventListener('click', () => {
    refreshModel();
    persist();
    result = { build: setup, artwork };
    dialog.close();
  });
  const observer = new ResizeObserver(resize);
  dialog.addEventListener('close', () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    renderer.shadowMap.enabled = originalShadows;
    if (!result) artwork?.dispose();
    engineView?.dispose();
    for (const mesh of [stage, marker, shadow, grid]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    onClose(result);
    dialog.remove();
  }, { once: true });
  document.body.append(dialog);
  dialog.showModal();
  display.prepend(renderer.domElement);
  renderer.shadowMap.enabled = false;
  observer.observe(display);
  orbit.checked = !motion.matches;
  syncModel();
  resize();
  return dialog;
}
