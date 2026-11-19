const formula = { mass: 770, axle: .93, length: 1.45, radius: .337, rest: .22, stance: .67,
  power: 8100, stiffness: 60, max: 52, steer: .55, width: .96, depth: 2.28, roof: .68, grip: 6.8, color: 0xc73830 };

function model(id, name, type, setup) {
  return { id, name, type, ...formula, ...setup };
}

export const raceModels = [
  model('formula', 'Apex Formula', 'formula', {}),
  model('vela', 'Vela GT', 'gt', { color: 0x4f87a9, mass: 1170, power: 10700, max: 49, axle: .92, radius: .365, depth: 2.36, roof: .79, steer: .51 }),
  model('meridian', 'Meridian LMP', 'prototype', { color: 0xc2dadd, mass: 905, power: 9500, max: 54, width: 1.02, length: 1.53, roof: .57, stance: .63, grip: 7.2 }),
  model('vector', 'Vector Touring', 'touring', { color: 0xd5ae59, mass: 1300, power: 10800, max: 47, radius: .375, roof: .98, stance: .72, grip: 6.4 }),
  model('coast', 'Coast Roadster', 'roadster', { color: 0x4b9d89, mass: 940, power: 8500, max: 46, width: .86, axle: .83, length: 1.32, depth: 2.13, radius: .33, roof: .60, steer: .59 }),
  model('vortex', 'Vortex Hyper', 'hyper', { color: 0x8779ca, mass: 1210, power: 12700, max: 57, width: 1.01, axle: .99, depth: 2.43, roof: .66, grip: 7.0 }),
  model('atlas', 'Atlas V8 Muscle', 'muscle', { color: 0xbe5740, mass: 1470, power: 13200, max: 50, axle: .98, length: 1.54, depth: 2.47, radius: .365, roof: .88, steer: .49 }),
  model('kestrel', 'Kestrel S', 'rally', { color: 0xe4e2d2, mass: 1120, power: 10100, max: 45, width: .91, axle: .87, length: 1.24, depth: 1.99, radius: .36, roof: 1.06, stance: .72, stiffness: 50, steer: .60 }),
  model('ion', 'Ion R', 'electric', { color: 0x385a93, mass: 1460, power: 13900, max: 51, length: 1.54, depth: 2.39, radius: .37, roof: .85, steer: .50 }),
  model('summit', 'Summit TA', 'attack', { color: 0x697873, mass: 1060, power: 10500, max: 51, width: .99, axle: .98, radius: .35, roof: .91, grip: 7.1 }),
];

const models = new Map(raceModels.map(car => [car.id, car]));
export const modelFor = id => models.get(id) ?? formulaModel;
const formulaModel = raceModels[0];

export const raceOptions = {
  finish: ['gloss', 'metallic', 'satin', 'matte', 'chrome', 'pearl'],
  livery: ['none', 'twin', 'offset', 'diagonal', 'lower', 'fade', 'chevron', 'checker', 'pinstripe'],
  wing: ['stock', 'none', 'ducktail', 'club', 'gt', 'swan', 'endurance', 'swept', 'split', 'longtail'],
  wingFinish: ['stock', 'carbon', 'body', 'accent', 'alloy'],
  wingWidth: ['stock', 'narrow', 'wide'],
  wingMount: ['stock', 'low', 'high'],
  wingPitch: ['stock', 'flat', 'steep'],
  splitter: ['stock', 'street', 'track', 'canards'],
  skirts: ['stock', 'blade', 'wide'],
  hood: ['stock', 'vents', 'scoop', 'carbon', 'power', 'louvers'],
  frontBumper: ['stock', 'mesh', 'split', 'track'],
  rearBumper: ['stock', 'road', 'gt', 'vertical'],
  fenders: ['stock', 'flared', 'riveted', 'gt'],
  mirrors: ['stock', 'carbon', 'classic', 'aero', 'bullet', 'angular', 'camera'],
  mirrorFinish: ['stock', 'body', 'accent', 'carbon', 'alloy'],
  intakeMesh: ['stock', 'honeycomb', 'horizontal', 'vertical'],
  sideIntake: ['stock', 'smooth', 'gills', 'duct'],
  hoodPins: ['off', 'flush', 'race'],
  roof: ['stock', 'black', 'carbon', 'scoop'],
  trim: ['stock', 'black', 'chrome', 'carbon'],
  rims: ['stock', 'five', 'mesh', 'turbine', 'disc', 'split', 'deep', 'retro'],
  rimDiameter: ['stock', 'small', 'large'],
  tire: ['slick', 'grooved', 'whitewall', 'semiSlick'],
  exhaust: ['stock', 'twin', 'quad', 'center', 'angled', 'side'],
  tipFinish: ['steel', 'black', 'blued'],
  tipShape: ['round', 'oval', 'slash', 'square'],
  plateStyle: ['off', 'light', 'dark', 'race'],
  glass: ['clear', 'smoke', 'ice', 'amber'],
  headlights: ['stock', 'projector', 'halo', 'blade', 'swept', 'arrow', 'quad'],
  taillights: ['stock', 'bar', 'pixel', 'smoke', 'ring', 'claw', 'split'],
  fogLights: ['stock', 'off', 'round', 'led'],
  lightLens: ['clear', 'smoke', 'ice'],
  lights: ['white', 'amber', 'ice', 'mint'],
  glow: ['off', 'on'],
  engine: ['factory', 'i6', 'v6', 'v8', 'bigV8', 'v10', 'v12', 'electric'],
  induction: ['factory', 'turbo', 'supercharger'],
  gearing: ['factory', 'short', 'close', 'long'],
  suspension: ['factory', 'comfort', 'sport', 'race'],
  brakes: ['factory', 'sport', 'ceramic'],
  drivetrain: ['factory', 'rear', 'all', 'front'],
  weight: ['factory', 'clubsport', 'race'],
};

const colors = { paint: '#c73830', accent: '#f1e8ce', rimColor: '#a8b1b3', caliper: '#cf5945', glowColor: '#57eed5' };
const engines = {
  i6: { cylinders: 6, inline: true, power: 1.03, limit: 1.02, mass: 0, root: 38, range: 2.54, wave: 'triangle' },
  v6: { cylinders: 6, power: 1.10, limit: 1.025, mass: 14, root: 49, range: 3.22, wave: 'triangle' },
  v8: { cylinders: 8, power: 1.14, limit: 1.04, mass: 36, root: 28, range: 2.19, wave: 'sawtooth' },
  bigV8: { cylinders: 8, power: 1.25, limit: 1.065, mass: 76, root: 25, range: 2.34, wave: 'sawtooth' },
  v10: { cylinders: 10, power: 1.21, limit: 1.09, mass: 54, root: 44, range: 3.51, wave: 'triangle' },
  v12: { cylinders: 12, power: 1.29, limit: 1.13, mass: 86, root: 48, range: 3.85, wave: 'triangle' },
  electric: { cylinders: 0, power: 1.23, limit: 1.02, mass: 118, root: 72, range: 4.40, wave: 'sine' },
};
const factoryEngines = { formula: 'v6', vela: 'v8', meridian: 'v6', vector: 'i6', coast: 'i6', vortex: 'v12',
  atlas: 'v8', kestrel: 'v6', ion: 'electric', summit: 'i6' };
const gearSets = { factory: [1, 1, 0], short: [1.15, .94, 7], close: [1.08, 1.015, 6], long: [.91, 1.11, 5] };
const springs = { factory: [1, 1, 1, 1], comfort: [1.05, .81, .98, .97],
  sport: [.94, 1.10, 1.04, 1.02], race: [.86, 1.24, 1.08, 1.04] };
const tyreGrip = { slick: 1, grooved: 1.025, whitewall: .976, semiSlick: 1.044 };
const brakePower = { factory: .11, sport: .139, ceramic: .173 };
const frontDrive = { factory: .42, rear: 0, all: .50, front: 1 };
const weightTargets = { factory: 1, clubsport: .945, race: .88 };
const closedBody = new Set(['frontBumper', 'rearBumper', 'fenders', 'headlights', 'plateStyle', 'plateText',
  'intakeMesh', 'sideIntake', 'hoodPins', 'fogLights']);

export function raceOptionAvailable(model, key) {
  if (key === 'roof') return model.id !== 'formula' && model.type !== 'roadster';
  return model.id !== 'formula' || !closedBody.has(key);
}

export function normalizeRaceBuild(input) {
  const model = modelFor(input?.model);
  const setup = { model: model.id };
  for (const [key, values] of Object.entries(raceOptions)) {
    setup[key] = raceOptionAvailable(model, key) && values.includes(input?.[key]) ? input[key] : values[0];
  }
  for (const [key, fallback] of Object.entries(colors)) {
    setup[key] = typeof input?.[key] === 'string' && /^#[0-9a-f]{6}$/i.test(input[key])
      ? input[key].toLowerCase() : key === 'paint' ? '#' + model.color.toString(16).padStart(6, '0') : fallback;
  }
  if (raceEngineKey(setup) === 'electric') setup.induction = 'factory';
  const number = Number(input?.number);
  setup.number = Number.isInteger(number) && number >= 0 && number <= 99 ? number : 0;
  setup.plateText = raceOptionAvailable(model, 'plateText') && typeof input?.plateText === 'string'
    ? input.plateText.toUpperCase().replace(/[^A-Z0-9 -]/g, '').slice(0, 8) : '';
  return setup;
}

export const raceEngineKey = build => build.engine === 'factory' ? factoryEngines[build.model] : build.engine;

export function raceSpec(build) {
  const model = modelFor(build.model);
  const engineKey = raceEngineKey(build);
  const engine = engines[engineKey];
  const factory = build.engine === 'factory';
  const [ratio, limit, gears] = gearSets[build.gearing];
  const [ride, stiffness, grip, steer] = springs[build.suspension];
  const boost = build.induction === 'supercharger' ? 1.15 : build.induction === 'turbo' ? 1.18 : 1;
  return {
    ...model, engine, engineKey, gears, induction: build.induction,
    power: model.power * (factory ? 1 : engine.power) * ratio * boost,
    max: model.max * (factory ? 1 : engine.limit) * limit * (boost > 1 ? 1.025 : 1),
    mass: Math.round((model.mass + (factory ? 0 : engine.mass)) * weightTargets[build.weight]),
    rest: model.rest * ride,
    stance: model.stance + model.rest * (ride - 1),
    stiffness: model.stiffness * stiffness,
    grip: model.grip * grip * tyreGrip[build.tire],
    steer: model.steer * steer,
    brakePower: brakePower[build.brakes], frontDrive: frontDrive[build.drivetrain],
  };
}

export function raceWheelWidth(model, z) {
  if (model.id === 'formula') return z < 0 ? .38 : .49;
  return z < 0 ? .34 : model.width > .97 ? .46 : .38;
}
