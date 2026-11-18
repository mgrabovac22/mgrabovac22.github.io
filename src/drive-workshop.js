import * as THREE from 'three';
import { createEngineDisplay, createRaceArtwork } from './drive-race-art.js';
import { modelFor, normalizeRaceBuild, raceEngineKey, raceModels, raceOptionAvailable, raceOptions, raceSpec } from './drive-race-build.js';
import './drive-workshop.css';

const storageKey = 'apex-race-builds-v1';
const copy = {
  en: {
    title: 'Circuit workshop', close: 'Back to settings', race: 'Apply & race', reset: 'Stock setup', save: 'Save build', saved: 'Build saved on this device.',
    view: 'Rotate the car with drag or arrow keys. Scroll to zoom.', orbit: 'Rotate automatically', list: 'Race cars', speed: 'Top speed', mass: 'Weight', vehicle: 'Car',
    type: ['Formula', 'GT coupe', 'Endurance prototype', 'Touring sedan', 'Open roadster', 'Hypercar', 'Muscle car', 'Rally hatch', 'Electric coupe', 'Time attack'],
    tabs: ['Paint', 'Body', 'Aero', 'Wheels', 'Lighting', 'Details', 'Powertrain'],
    views: ['Front', 'Side', 'Rear'], angle: 'Camera angle', zoom: 'Zoom', zoomIn: 'Zoom in', zoomOut: 'Zoom out', orbitShort: 'Orbit',
    force: 'Drive force', inspect: 'Inspect engine', showCar: 'Show car', rev: 'Test engine sound',
    labels: { paint:'Body paint', accent:'Accent paint', finish:'Paint finish', livery:'Livery', wing:'Rear spoiler', splitter:'Front splitter', skirts:'Side skirts', hood:'Hood',
      rims:'Rim design', rimColor:'Rim finish', caliper:'Brake calipers', tire:'Tire', exhaust:'Exhaust', glass:'Glass / visor', lights:'Light tint', glow:'Underglow', glowColor:'Glow color', number:'Race number',
      engine:'Engine swap', induction:'Forced induction', gearing:'Gearbox', suspension:'Suspension', brakes:'Brakes', drivetrain:'Driven wheels', weight:'Weight reduction',
      frontBumper:'Front bumper', rearBumper:'Rear diffuser', fenders:'Fenders', mirrors:'Mirrors', roof:'Roof panel', trim:'Exterior trim',
      headlights:'Headlight design', taillights:'Taillight design', wingFinish:'Wing finish', tipFinish:'Exhaust finish', plateStyle:'Plate style', plateText:'Plate text',
      wingWidth:'Wing span', wingMount:'Mount height', wingPitch:'Blade angle', mirrorFinish:'Mirror finish', intakeMesh:'Grille pattern', sideIntake:'Side intakes',
      hoodPins:'Hood locks', rimDiameter:'Rim diameter', tipShape:'Exhaust tip shape', fogLights:'Fog lights', lightLens:'Light lens finish' },
    options: {
      finish:['Gloss', 'Metallic', 'Satin', 'Matte', 'Chrome', 'Pearlescent'],
      livery:['Solid', 'Twin stripes', 'Offset stripe', 'Diagonal', 'Two-tone', 'Fade', 'Chevron', 'Checkerboard', 'Pinstripe'],
      wing:['Factory', 'No spoiler', 'Ducktail', 'Club wing', 'High GT', 'Swan neck', 'Endurance double', 'Swept wing', 'Split wing', 'Longtail wing'],
      wingFinish:['Factory', 'Carbon', 'Body paint', 'Accent paint', 'Brushed alloy'],
      wingWidth:['Standard', 'Narrow', 'Wide'], wingMount:['Standard', 'Low', 'High'], wingPitch:['Neutral', 'Flat', 'Steep'],
      splitter:['Factory', 'Street lip', 'Track blade', 'Blade + canards'],
      skirts:['Factory', 'Carbon blade', 'Widebody'], hood:['Factory', 'Vents', 'Scoop', 'Carbon panel', 'Power bulge', 'Louvers'],
      frontBumper:['Factory','Mesh grille','Split intake','Track bumper'], rearBumper:['Factory','Road diffuser','GT diffuser','Vertical fins'],
      fenders:['Factory','Smooth flares','Riveted flares','GT arches'],
      mirrors:['Factory','Carbon','Classic oval','Aero','Bullet','Angular','Camera pods'],
      mirrorFinish:['Factory','Body paint','Accent paint','Carbon','Alloy'],
      intakeMesh:['Factory','Honeycomb','Horizontal slats','Vertical slats'], sideIntake:['Factory','Smooth','Gills','Deep duct'],
      hoodPins:['None','Flush latches','Race pins'],
      roof:['Body paint','Gloss black','Carbon','Roof intake'], trim:['Factory','Black chrome','Bright alloy','Carbon'],
      rims:['Factory', 'Five spoke', 'Mesh', 'Turbine', 'Aero disc', 'Split spoke', 'Deep dish', 'Retro'],
      rimDiameter:['Standard','Small','Large'],
      tire:['Slick', 'Grooved', 'Whitewall', 'Semi-slick'], exhaust:['Factory', 'Twin', 'Quad', 'Center', 'Angled', 'Side exit'],
      tipFinish:['Polished steel','Black chrome','Blue titanium'], tipShape:['Round','Oval','Slash cut','Square'],
      plateStyle:['Off','Light','Dark','Circuit'],
      glass:['Clear', 'Smoke', 'Ice blue', 'Amber'],
      headlights:['Factory','Dual projector','Halo rings','Twin LED blades','Swept LED','LED arrow','Quad projector'],
      taillights:['Factory','Light bar','Pixels','Smoked','Twin rings','Claw LEDs','Split bars'],
      fogLights:['Factory','Off','Round','LED strip'], lightLens:['Clear','Smoked','Ice blue'],
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
    tabs: ['Lakiranje', 'Karoserija', 'Aerodinamika', 'Kotači', 'Svjetla', 'Detalji', 'Pogon'],
    views: ['Sprijeda', 'Bok', 'Straga'], angle: 'Kut kamere', zoom: 'Zumiranje', zoomIn: 'Približi prikaz', zoomOut: 'Udalji prikaz', orbitShort: 'Okretanje',
    force: 'Pogonska sila', inspect: 'Prikaži motor', showCar: 'Prikaži auto', rev: 'Testiraj zvuk motora',
    labels: { paint:'Boja karoserije', accent:'Boja detalja', finish:'Završna obrada', livery:'Grafika', wing:'Stražnji spojler', splitter:'Prednji splitter', skirts:'Bočni pragovi', hood:'Poklopac motora',
      rims:'Dizajn naplataka', rimColor:'Boja naplataka', caliper:'Boja čeljusti', tire:'Gume', exhaust:'Ispuh', glass:'Stakla / vizir', lights:'Boja svjetala', glow:'Neon ispod auta', glowColor:'Boja neona', number:'Trkaći broj',
      engine:'Motor', induction:'Punjenje motora', gearing:'Mjenjač', suspension:'Ovjes', brakes:'Kočnice', drivetrain:'Pogon kotača', weight:'Smanjenje mase',
      frontBumper:'Prednji branik', rearBumper:'Stražnji difuzor', fenders:'Blatobrani', mirrors:'Retrovizori', roof:'Krovni panel', trim:'Vanjske obloge',
      headlights:'Prednja svjetla', taillights:'Stražnja svjetla', wingFinish:'Materijal spojlera', tipFinish:'Materijal ispuha', plateStyle:'Stil tablice', plateText:'Tekst na tablici',
      wingWidth:'Širina spojlera', wingMount:'Visina nosača', wingPitch:'Nagib krila', mirrorFinish:'Materijal retrovizora', intakeMesh:'Uzorak maske', sideIntake:'Bočni usisi',
      hoodPins:'Brave poklopca', rimDiameter:'Promjer naplataka', tipShape:'Oblik završetka ispuha', fogLights:'Maglenke', lightLens:'Leće svjetala' },
    options: {
      finish:['Sjajna', 'Metalizirana', 'Satenska', 'Mat', 'Kromirana', 'Biserna'],
      livery:['Jednobojna', 'Dvije pruge', 'Pomaknuta pruga', 'Dijagonalna', 'Dvobojna', 'Prijelaz', 'Dvostruki V', 'Šahovnica', 'Tanka rubna pruga'],
      wing:['Tvornički', 'Bez spojlera', 'Pačji rep', 'Klupsko krilo', 'Visoki GT', 'Labudov vrat', 'Dvostruko Endurance krilo', 'Zakrivljeno krilo', 'Podijeljeno krilo', 'Produženo krilo'],
      wingFinish:['Tvornički', 'Karbon', 'Boja karoserije', 'Boja detalja', 'Brušena legura'],
      wingWidth:['Standardna','Uža','Šira'], wingMount:['Standardni','Niski','Visoki'], wingPitch:['Neutralni','Ravni','Strmi'],
      splitter:['Tvornički', 'Ulični rub', 'Trkaća oštrica', 'Oštrica i krilca'],
      skirts:['Tvornički', 'Karbonski', 'Prošireni'], hood:['Tvornički', 'Ventilacijski otvori', 'Usisnik', 'Karbonski panel', 'Ispupčeni poklopac', 'Lamele'],
      frontBumper:['Tvornički','Mrežasta maska','Podijeljeni usis','Trkaći branik'], rearBumper:['Tvornički','Ulični difuzor','GT difuzor','Okomita rebra'],
      fenders:['Tvornički','Glatka proširenja','Proširenja sa zakovicama','GT lukovi'],
      mirrors:['Tvornički','Karbonski','Klasični ovalni','Aerodinamični','Zaobljene kapsule','Uglati','Kamere'],
      mirrorFinish:['Tvornički','Boja karoserije','Boja detalja','Karbon','Legura'],
      intakeMesh:['Tvornički','Saće','Vodoravne lamele','Okomite lamele'], sideIntake:['Tvornički','Glatki panel','Škrge','Duboki usis'],
      hoodPins:['Bez brava','Upuštene','Trkaći osigurači'],
      roof:['Boja karoserije','Sjajno crni','Karbonski','Krovni usisnik'], trim:['Tvorničke','Crni krom','Polirana legura','Karbon'],
      rims:['Tvornički', 'Pet krakova', 'Mrežasti', 'Turbina', 'Aero disk', 'Dvostruki krakovi', 'Duboki rub', 'Retro'],
      rimDiameter:['Standardni','Manji','Veći'],
      tire:['Glatke', 'Profilirane', 'Bijeli rub', 'Poluglatke'], exhaust:['Tvornički', 'Dvostruki', 'Četverostruki', 'Središnji', 'Pod kutom', 'Bočni'],
      tipFinish:['Polirani čelik','Crni krom','Plavi titan'], tipShape:['Okrugli','Ovalni','Koso rezani','Četvrtasti'],
      plateStyle:['Isključena','Svijetla','Tamna','Trkaća'],
      glass:['Prozirno', 'Zatamnjeno', 'Ledeno plavo', 'Jantarno'],
      headlights:['Tvornička','Dvostruki projektor','Svjetleći prstenovi','Dvije LED trake','Zakrivljeni LED','LED strelica','Četiri projektora'],
      taillights:['Tvornička','Spojena LED traka','Pikseli','Zatamnjena','Dvostruki prstenovi','Okomite LED lamele','Dvije odvojene trake'],
      fogLights:['Tvorničke','Isključene','Okrugle','LED trake'], lightLens:['Prozirne','Zatamnjene','Ledeno plave'],
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
  ['frontBumper', 'rearBumper', 'intakeMesh', 'sideIntake', 'fenders', 'mirrors', 'mirrorFinish', 'roof', 'trim'],
  ['wing', 'wingFinish', 'wingWidth', 'wingMount', 'wingPitch', 'splitter', 'skirts', 'hood', 'hoodPins'],
  ['rims', 'rimDiameter', 'rimColor', 'caliper', 'tire'],
  ['headlights', 'taillights', 'lightLens', 'lights', 'fogLights', 'glow', 'glowColor'],
  ['exhaust', 'tipShape', 'tipFinish', 'glass', 'number', 'plateStyle', 'plateText'],
  ['engine', 'induction', 'gearing', 'suspension', 'brakes', 'drivetrain', 'weight'],
];
const partFields = ['model', 'number', 'plateText', ...Object.keys(raceOptions)];
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
        <div class="workshop-description">
          <div><span class="workshop-class"></span><h3></h3></div>
          <dl></dl>
        </div>
        <div class="workshop-view" tabindex="0" aria-label="${words.view}"></div>
        <div class="workshop-camera">
          <div class="workshop-views" role="group" aria-label="${words.angle}"></div>
          <div class="workshop-zoom" role="group" aria-label="${words.zoom}">
            <button type="button" class="workshop-zoom-out" aria-label="${words.zoomOut}">−</button>
            <button type="button" class="workshop-zoom-in" aria-label="${words.zoomIn}">+</button>
          </div>
          <label class="workshop-orbit" title="${words.orbit}">
            <input type="checkbox" aria-label="${words.orbit}"><span aria-hidden="true">${words.orbitShort}</span>
          </label>
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
  let yaw = -.63, goalYaw = yaw, pitch = .30, goalPitch = pitch, distance = 6.65, goalDistance = distance;
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 42);
  const scene = new THREE.Scene();
  scene.environment = environment;
  scene.environmentIntensity = .95;
  scene.background = new THREE.Color(0x0c1823);
  scene.fog = new THREE.FogExp2(0x0c1823, .052);
  const platform = new THREE.Group();
  const engineStand = new THREE.Group();
  engineStand.visible = false;
  scene.add(platform, engineStand, new THREE.HemisphereLight(0xd8eef6, 0x3b4b51, 1.58));
  const key = new THREE.DirectionalLight(0xffe7c5, 2.78);
  key.position.set(-5, 7, -3);
  const fill = new THREE.DirectionalLight(0x8ec8ff, 1.48);
  fill.position.set(6, 2, 4);
  const edge = new THREE.DirectionalLight(0xf4ebde, 1.16);
  edge.position.set(-4, 2.5, 7);
  scene.add(key, fill, edge);
  const stage = new THREE.Mesh(new THREE.CylinderGeometry(3.38, 3.38, .20, 64), new THREE.MeshStandardMaterial({ color: 0x203745, metalness: .3, roughness: .66 }));
  stage.position.y = -.105;
  const marker = new THREE.Mesh(new THREE.RingGeometry(3.11, 3.126, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x40baa6 }));
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { axleContact: { value: new THREE.Vector2(.54,.56) } },
    vertexShader: /* glsl */`
      varying vec2 floorUv;
      void main() { floorUv = uv * 2. - 1.; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }
    `,
    fragmentShader: /* glsl */`
      varying vec2 floorUv;
      uniform vec2 axleContact;
      void main() {
        float base = 1. - smoothstep(.26,1.,length(floorUv));
        vec2 contactOffset = (abs(floorUv)-axleContact) / vec2(.138,.114);
        float contact = exp(-dot(contactOffset,contactOffset)*2.2);
        gl_FragColor = vec4(.014,.032,.041,base*.52+contact*.24);
        #include <colorspace_fragment>
      }
    `,
  }));
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
  const angles = [-.54,-Math.PI/2,-Math.PI+.45];
  words.views.forEach((name,index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    button.addEventListener('click', () => {
      orbit.checked = false;
      goalYaw = angles[index] + Math.round((yaw-angles[index])/(Math.PI*2))*Math.PI*2;
      goalPitch = .252;
      requestRender();
    });
    find('.workshop-views').append(button);
  });
  find('.workshop-zoom-in').addEventListener('click', () => zoomBy(-.61));
  find('.workshop-zoom-out').addEventListener('click', () => zoomBy(.61));

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
      if (!raceOptionAvailable(modelFor(setup.model), key)) continue;
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
        control.type = key === 'number' ? 'number' : key === 'plateText' ? 'text' : 'color';
        if (key === 'plateText') control.maxLength = 8;
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
        if (key === 'plateText' && control.value !== setup.plateText) control.value = setup.plateText;
        updateDependencies();
        renderSpecs();
        requestRender();
      });
      if (key === 'number') control.addEventListener('change', () => { control.value = setup.number; });
      label.append(control);
      fields.append(label);
    }
    updateDependencies();
  }
  function updateDependencies() {
    const plate = fields.querySelector('[name=plateText]');
    if (plate) plate.disabled = setup.plateStyle === 'off';
    for (const key of ['wingFinish','wingWidth','wingMount','wingPitch']) {
      const option = fields.querySelector(`[name=${key}]`);
      if (option) option.disabled = setup.wing==='none';
    }
    if (modelFor(setup.model).type==='electric') for (const key of ['tipShape','tipFinish']) {
      const option = fields.querySelector(`[name=${key}]`);
      if (option) option.disabled = setup.exhaust==='stock';
    }
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
    shadow.visible = !value;
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
    const spec = artwork.model;
    shadow.scale.set(spec.width*1.68,1,spec.depth*1.23);
    shadow.material.uniforms.axleContact.value.set(spec.axle/shadow.scale.x,spec.length/shadow.scale.z);
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
    if (event.target.closest('label,button') || event.button !== 0 || pointer) return;
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
  function zoomBy(step) {
    goalDistance = THREE.MathUtils.clamp(goalDistance + step, 4.4, 11.9);
    requestRender();
  }
  display.addEventListener('wheel', event => {
    event.preventDefault();
    zoomBy(event.deltaY*.005);
  }, { passive: false });
  display.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key) || event.target !== display) return;
    event.preventDefault();
    orbit.checked = false;
    if (event.key === 'Home') {
      goalYaw = -.63; goalPitch = .30; goalDistance = inspecting ? 5.3 : 7.3;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      goalYaw += event.key === 'ArrowLeft' ? .28 : -.28;
    } else zoomBy(event.key==='ArrowUp'?-.45:.45);
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
