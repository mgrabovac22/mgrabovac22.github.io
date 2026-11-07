import * as THREE from 'three';
import { ball, box, cylinder, surface } from './scene.js';

const graphite = surface('#334345', .62, .21);
const frame = surface('#728782', .54, .27);
const deck = surface('#a7b2ab', .71);
const porcelain = surface('#e5e4d9', .62);
const oak = surface('#ae9779');
const brass = surface('#c29255', .43, .28);
const teal = surface('#517b75', .63);
const fern = surface('#6b8863', .78);
const paleLeaf = surface('#94aa73', .73);
const navy = surface('#435c67', .61);
const glass = new THREE.MeshStandardMaterial({
  color: '#a5cac2', transparent: true, opacity: .32, roughness: .28, depthWrite: false,
});
const beacon = new THREE.MeshBasicMaterial({ color: '#b1e2ce' });
const amber = new THREE.MeshBasicMaterial({ color: '#f0c17d' });
const steelRing = new THREE.TorusGeometry(1, .058, 7, 36);
const ramp = (value, from, to) => THREE.MathUtils.smoothstep(value, from, to);
const mix = THREE.MathUtils.lerp;

function group(parent, x = 0, y = 0, z = 0, yaw = 0) {
  const item = new THREE.Group();
  item.position.set(x, y, z);
  item.rotation.y = yaw;
  parent.add(item);
  return item;
}

function moving(parent, x, y, z) {
  const part = group(parent, x, y, z);
  part.userData.dynamic = true;
  return part;
}

function ring(parent, material, radius, x, y, z, flat = true) {
  const item = new THREE.Mesh(steelRing, material);
  item.scale.setScalar(radius);
  item.position.set(x, y, z);
  if (flat) item.rotation.x = -Math.PI / 2;
  parent.add(item);
  return item;
}

function pane(parent, w, h, d, x, y, z) {
  const panel = box(parent, glass, w, h, d, x, y, z);
  panel.castShadow = false;
  return panel;
}

function elevated(parent, width, depth, height, edgeMaterial = teal) {
  const upper = group(parent, 0, height, 0);
  box(upper, deck, width, .19, depth, 0, -.10, 0);
  box(upper, edgeMaterial, width, .14, depth + .026, 0, -.215, 0);
  box(upper, graphite, width - .19, .067, depth - .18, 0, -.31, 0);
  box(parent, frame, width - .61, .094, depth - .61, 0, .055, 0);
  for (const x of [-width / 2 + .43, width / 2 - .43]) {
    for (const z of [-depth / 2 + .40, depth / 2 - .40]) {
      box(parent, graphite, .33, .10, .36, x, .102, z);
      box(parent, frame, .135, height - .38, .14, x, (height - .12) / 2, z);
      box(parent, edgeMaterial, .225, .55, .23, x, .38, z);
    }
    box(parent, frame, .083, .088, depth - .81, x, height - .43, 0);
  }
  return upper;
}

function partition(parent, x, z, width, yaw, panels, base = frame) {
  const wall = group(parent, x, 0, z, yaw);
  box(wall, base, width, .29, .15, 0, .15, 0);
  const gap = width / panels;
  for (let i = 0; i <= panels; i++) box(wall, graphite, .082, 1.68, .102, i * gap - width / 2, .85, 0);
  for (let i = 0; i < panels; i++) pane(wall, gap - .085, 1.28, .034, (i + .5) * gap - width / 2, .96, 0);
  box(wall, base, width, .081, .12, 0, 1.66, 0);
  box(wall, porcelain, width - .17, .023, .026, 0, 1.60, .065).castShadow = false;
}

function rail(parent, x, z, width, yaw = 0) {
  const fence = group(parent, x, 0, z, yaw);
  for (const xx of [-width / 2, 0, width / 2]) box(fence, frame, .06, .58, .06, xx, .30, 0);
  box(fence, graphite, width + .07, .052, .078, 0, .57, 0);
  pane(fence, width - .06, .41, .026, 0, .30, 0);
}

function stairs(parent, x, topZ, height) {
  const steps = 10;
  const run = 2.45;
  for (let i = 0; i < steps; i++) {
    const rise = height * (1 - i / steps);
    const z = topZ + (i + .5) * run / steps;
    box(parent, graphite, .84, .091, run / steps + .012, x, rise - .05, z);
    box(parent, frame, .85, .032, .048, x, rise - .02, z + .098);
  }
  const length = Math.hypot(height, run);
  for (const side of [-1, 1]) {
    const stringer = box(parent, frame, .055, .085, length, x + side * .45, height / 2 - .05, topZ + run / 2);
    stringer.rotation.x = Math.atan2(height, run);
    const handrail = box(parent, graphite, .051, .053, length, x + side * .45, height / 2 + .47, topZ + run / 2);
    handrail.rotation.x = stringer.rotation.x;
    for (const along of [0, .5, 1]) {
      box(parent, frame, .042, .52, .05, x + side * .45, height * (1 - along) + .22, topZ + run * along);
    }
  }
}

function pod(parent, cargo = true) {
  const drone = moving(parent, 0, 0, 0);
  ball(drone, porcelain, .37, .17, .48, 0, 0, 0);
  ball(drone, graphite, .26, .135, .31, 0, -.08, .05);
  box(drone, beacon, .28, .036, .052, 0, -.01, .456);
  for (const x of [-.49, .49]) {
    box(drone, frame, .78, .056, .075, x * .54, .062, 0);
    box(drone, graphite, .058, .053, .66, x, .063, 0);
  }
  const rotors = [];
  for (const x of [-.52, .52]) {
    for (const z of [-.29, .29]) {
      ring(drone, graphite, .235, x, .105, z);
      cylinder(drone, brass, .069, .063, x, .105, z);
      const rotor = group(drone, x, .146, z);
      box(rotor, graphite, .39, .019, .046, 0, 0, 0);
      box(rotor, frame, .043, .018, .38, 0, 0, 0);
      rotors.push(rotor);
    }
  }
  const load = cargo ? parcel(drone) : null;
  if (load) load.position.y = -.28;
  return {
    drone, load,
    spin(time, rate = 17) {
      rotors.forEach((rotor, i) => { rotor.rotation.y = time * (i % 2 ? -rate : rate); });
    },
  };
}

function parcel(parent) {
  const load = group(parent);
  box(load, oak, .42, .24, .32, 0, 0, 0);
  box(load, porcelain, .088, .013, .319, 0, .122, 0);
  box(load, brass, .092, .235, .013, 0, 0, .164);
  return load;
}

function dronePort(parent, person) {
  const upper = elevated(parent, 6.25, 3.85, 2.28, navy);
  partition(upper, .25, -1.83, 5.55, 0, 3, navy);
  rail(upper, 2.96, .20, 2.82, Math.PI / 2);
  box(upper, graphite, 2.2, .037, 2.25, -1.47, .024, .22);
  ring(upper, brass, .83, -1.47, .057, .22);
  ring(upper, beacon, .51, -1.47, .058, .22);
  for (const side of [-1, 1]) box(upper, porcelain, .052, .012, .44, -1.47 + side * .16, .069, .22).castShadow = false;
  box(upper, porcelain, .36, .014, .046, -1.47, .071, .22).castShadow = false;
  box(upper, frame, 3.8, .19, .64, .38, .139, .25);
  for (let i = 0; i < 15; i++) cylinder(upper, i % 3 ? graphite : brass, .055, .52, -1.41 + i * .252, .244, .25).rotation.x = Math.PI / 2;
  box(upper, navy, 1.14, 1.04, .88, 2.31, .51, .25);
  box(upper, graphite, .065, .49, .64, 1.729, .42, .25);
  const shutter = moving(upper, 1.69, .43, .25);
  box(shutter, brass, .079, .39, .55, 0, 0, 0);
  box(upper, amber, .031, .054, .35, 1.722, .79, .25);
  const boxOnBelt = moving(upper, -1.47, .39, .25);
  parcel(boxOnBelt);
  const { drone, load, spin } = pod(upper);
  const handler = person(upper, .68, 1.19, navy, 'gesture', 1.45, { facing: -.62 });
  const dockLight = moving(upper, -2.62, .09, .98);
  cylinder(dockLight, beacon, .082, .059, 0, 0, 0);
  return time => {
    const t = time % 16;
    const arrive = ramp(t, 0, 4.3);
    const depart = ramp(t, 8.1, 13.3);
    drone.position.set(mix(-3.65, -1.47, arrive) - depart * 2.18,
      mix(1.63, .665, arrive) + depart * .965 + Math.sin(t * .95) * .10 * (1 - arrive + depart),
      mix(-2.1, .25, arrive) - depart * 2.35);
    drone.rotation.set((arrive - depart) * Math.sin(t * .81) * .09, mix(.52, -.30, arrive) + depart * .82, -.09 * Math.sin(t * .7));
    load.visible = t < 5.1;
    boxOnBelt.visible = t >= 5.1 && t < 12.9;
    boxOnBelt.position.x = mix(-1.47, 2.27, ramp(t, 5.5, 12.9));
    shutter.position.y = .43 + .44 * (ramp(t, 9.25, 10.5) - ramp(t, 13.0, 14.5));
    dockLight.scale.y = .67 + (1 + Math.sin(t * 5)) * .44;
    spin(time);
    handler(time, t > 3 && t < 13);
  };
}

function greenhouse(parent, person) {
  const upper = elevated(parent, 5.35, 4.35, 1.62, fern);
  partition(upper, 0, -2.08, 5.15, 0, 4, fern);
  partition(upper, 2.57, -.58, 2.95, Math.PI / 2, 2, fern);
  rail(upper, -.69, 2.03, 3.53);
  stairs(parent, 1.55, 2.14, 1.62);
  const leaves = [];
  for (const x of [-1.58, 1.55]) {
    box(upper, porcelain, 1.13, .37, 2.85, x, .20, -.07);
    box(upper, oak, 1.01, .051, 2.71, x, .397, -.07);
    for (let i = 0; i < 5; i++) {
      const stem = moving(upper, x, .43, (i - 2) * .52);
      cylinder(stem, fern, .025, .55, 0, .27, 0);
      for (let n = 0; n < 3; n++) {
        const angle = n * 2.1 + i * .53;
        const leaf = ball(stem, n % 2 ? paleLeaf : fern, .23, .091, .12,
          Math.sin(angle) * .19, .26 + n * .094, Math.cos(angle) * .14);
        leaf.rotation.set(.24, angle, -.36);
      }
      leaves.push(stem);
    }
  }
  for (const x of [-2.21, 2.20]) {
    for (const z of [-1.75, 1.68]) box(upper, frame, .085, 1.58, .085, x, .80, z);
    box(upper, frame, .089, .085, 3.56, x, 1.58, -.03);
  }
  const irrigator = moving(upper, 0, 1.51, -.88);
  box(irrigator, graphite, 4.48, .075, .096, 0, 0, 0);
  box(irrigator, beacon, .51, .032, .069, 0, .06, 0);
  const spray = [];
  for (const x of [-1.58, 1.55]) {
    cylinder(irrigator, brass, .084, .09, x, -.06, 0);
    for (let k = 0; k < 4; k++) {
      const drop = ball(irrigator, beacon, .019, .072, .019, x + (k - 1.5) * .12, 0, 0);
      drop.castShadow = false;
      spray.push(drop);
    }
  }
  const gardener = person(upper, 0, 1.30, teal, 'present', .84, { facing: Math.PI * .72 });
  return time => {
    const p = (time * .09) % 1;
    irrigator.position.z = Math.cos(p * Math.PI * 2) * 1.39;
    spray.forEach((drop, i) => {
      drop.position.y = -.14 - ((time * 1.55 + i * .237) % 1) * .82;
      drop.visible = p < .79;
    });
    leaves.forEach((leaf, i) => { leaf.rotation.z = Math.sin(time * 1.16 + i * 1.28) * .17; });
    gardener(time, true);
  };
}

function transit(parent, person) {
  const upper = elevated(parent, 6.86, 3.16, 2.04, brass);
  partition(upper, 0, -1.49, 6.53, 0, 4, graphite);
  rail(upper, -1.29, 1.46, 3.66);
  for (const x of [-3.02, 3.01]) {
    box(upper, graphite, .20, 2.62, .23, x, 1.30, .16);
    box(upper, frame, .50, .25, .54, x, 2.54, .16);
  }
  box(upper, graphite, 6.35, .15, .25, 0, 2.52, .16);
  box(upper, brass, 6.22, .055, .23, 0, 2.42, .16);
  const carrier = moving(upper, 0, 2.36, .16);
  box(carrier, graphite, .41, .13, .30, 0, -.03, 0);
  const cabin = group(carrier);
  box(cabin, frame, .07, .77, .13, -.22, -.44, 0);
  box(cabin, frame, .07, .77, .13, .22, -.44, 0);
  box(cabin, navy, 1.28, .24, .73, 0, -.88, 0);
  box(cabin, porcelain, 1.36, .12, .75, 0, -.38, 0);
  pane(cabin, 1.16, .38, .054, 0, -.59, .355);
  pane(cabin, .052, .39, .60, -.612, -.58, 0);
  pane(cabin, .052, .39, .60, .612, -.58, 0);
  box(cabin, amber, .13, .047, .04, -.44, -.89, .38);
  const load = parcel(cabin);
  load.position.set(.2, -.67, -.01);
  box(upper, graphite, .64, .11, .56, 2.72, .04, 1.01);
  const tech = person(upper, 2.22, 1.07, navy, 'present', 1.1, { facing: -2.74 });
  return time => {
    const t = (time % 13) / 13;
    carrier.position.x = Math.cos(t * Math.PI * 2) * -2.36;
    cabin.rotation.z = Math.sin(t * Math.PI * 2) * .095;
    tech(time, t > .37 && t < .65);
  };
}

function controlRoom(parent, person) {
  const upper = elevated(parent, 5.87, 4.03, 2.56, navy);
  partition(upper, 0, -1.93, 5.65, 0, 4, navy);
  partition(upper, 2.82, -.47, 2.88, Math.PI / 2, 2, navy);
  partition(upper, -2.82, -.78, 2.25, Math.PI / 2, 2, navy);
  rail(upper, .73, 1.94, 3.88);
  stairs(parent, -1.93, 1.99, 2.56);
  box(upper, graphite, 3.65, .92, .10, 0, 1.32, -1.50);
  box(upper, teal, 3.45, .76, .028, 0, 1.32, -1.432);
  const display = [-1, 0, 1].map(i => {
    const row = moving(upper, i * 1.12, 1.26, -1.409);
    return Array.from({ length: 4 }, (_, n) => box(row, (n + i) % 3 ? beacon : amber, .11, .23, .014, (n - 1.5) * .171, 0, 0));
  });
  const scanner = moving(upper, 0, 1.34, -1.386);
  box(scanner, beacon, .022, .73, .027, 0, 0, 0);
  for (const x of [-1.33, 1.32]) {
    box(upper, porcelain, 1.64, .08, .73, x, .66, .43);
    box(upper, graphite, .10, .64, .49, x - .64, .33, .43);
    box(upper, graphite, .10, .64, .49, x + .64, .33, .43);
    box(upper, graphite, .56, .28, .052, x, .92, .21);
    box(upper, teal, .48, .207, .019, x, .938, .246);
    box(upper, oak, .29, .027, .19, x, .716, .53);
  }
  const ops = [
    person(upper, -1.31, .96, teal, 'type', .62, { facing: Math.PI }),
    person(upper, 1.32, .97, navy, 'type', 1.69, { facing: Math.PI }),
    person(upper, -.18, -.69, navy, 'present', 2.7, { facing: 2.71 }),
  ];
  return time => {
    scanner.position.x = Math.sin(time * .76) * 1.60;
    display.forEach((bars, i) => bars.forEach((bar, j) => {
      const height = .10 + .42 * (.5 + .5 * Math.sin(time * 2.1 + i * .88 + j * 1.45));
      bar.scale.y = height;
      bar.position.y = -.23 + height / 2;
    }));
    ops.forEach(actor => actor(time, true));
  };
}

function liftArchive(parent, person) {
  const upper = elevated(parent, 4.75, 3.32, 2.84, brass);
  partition(upper, 0, -1.54, 4.49, 0, 3, graphite);
  rail(upper, -.99, 1.54, 2.42);
  for (const x of [-2.03, -1.08, -.13]) {
    box(upper, graphite, .76, 1.62, .63, x, .82, -.79);
    for (let i = 0; i < 5; i++) {
      box(upper, i % 2 ? brass : oak, .65, .214, .029, x, .27 + i * .256, -.457);
      box(upper, porcelain, .215, .039, .012, x + .10, .274 + i * .256, -.433);
    }
  }
  const shaft = group(parent, 2.78, 0, .34);
  box(shaft, frame, 1.58, .13, 1.41, 0, .09, 0);
  box(shaft, graphite, 1.58, .16, 1.41, 0, 3.88, 0);
  for (const x of [-.64, .64]) {
    for (const z of [-.55, .55]) box(shaft, frame, .105, 3.75, .10, x, 1.93, z);
    pane(shaft, .033, 3.45, 1.07, x, 1.97, 0);
  }
  pane(shaft, 1.21, 3.44, .035, 0, 1.94, -.55);
  const car = moving(shaft, 0, .32, 0);
  box(car, teal, 1.22, .09, 1.05, 0, 0, 0);
  box(car, graphite, 1.16, .09, 1.02, 0, .86, 0);
  box(car, beacon, .76, .037, .027, 0, .826, .522);
  box(car, frame, .065, .82, .066, -.53, .44, .48);
  box(car, frame, .065, .82, .066, .53, .44, .48);
  const freight = parcel(car);
  freight.position.set(.02, .17, -.04);
  const door = moving(shaft, 0, .61, .56);
  pane(door, .596, .81, .036, -.293, 0, 0);
  pane(door, .596, .81, .036, .293, 0, 0);
  const runner = person(upper, .45, .83, navy, 'carry', .54, { stride: .83, pace: .68 });
  const clerk = person(parent, 1.48, 1.23, teal, 'gesture', 2.4, { facing: 2.05 });
  return time => {
    const t = time % 12;
    car.position.y = .22 + 2.63 * (ramp(t, 1.4, 5.8) - ramp(t, 8.0, 11.4));
    const aperture = 1 - ramp(t, .64, 1.4) + ramp(t, 11.4, 12);
    door.children[0].position.x = -.293 - aperture * .27;
    door.children[1].position.x = .293 + aperture * .27;
    runner(time, true);
    clerk(time, t < 1.4 || t > 11.4);
  };
}

function observatory(parent) {
  const upper = elevated(parent, 4.74, 4.31, 1.87, navy);
  rail(upper, -1.44, 2.03, 1.52);
  rail(upper, 1.44, 2.03, 1.52);
  ring(upper, frame, 1.24, -.52, .044, -.08);
  cylinder(upper, graphite, .76, .19, -.52, .12, -.08);
  cylinder(upper, navy, .43, .58, -.52, .47, -.08);
  const mount = moving(upper, -.52, .82, -.08);
  box(mount, frame, .77, .20, .33, 0, .03, 0);
  const tilt = group(mount, 0, .19, 0);
  const dish = ball(tilt, porcelain, .96, .91, .16, 0, .37, 0);
  dish.rotation.x = -.33;
  const reflector = ring(tilt, brass, .83, 0, .40, .135, false);
  reflector.rotation.x = -.33;
  for (const x of [-.52, .52]) {
    box(tilt, graphite, .046, .075, .69, x * .53, .42, .35).rotation.y = x;
  }
  ball(tilt, beacon, .11, .10, .11, 0, .44, .68);
  box(upper, navy, .17, 1.91, .17, 1.70, .96, -.94);
  const anemometer = moving(upper, 1.70, 1.96, -.94);
  for (let i = 0; i < 3; i++) {
    const arm = group(anemometer, 0, 0, 0, i * 2.094);
    box(arm, frame, .55, .053, .058, .22, 0, 0);
    ball(arm, brass, .114, .104, .15, .52, .02, 0);
  }
  return time => {
    mount.rotation.y = Math.sin(time * .46) * .87;
    tilt.rotation.x = -.26 + Math.sin(time * .79) * .23;
    anemometer.rotation.y = time * 4.7;
  };
}

function waterCourt(parent, person) {
  box(parent, deck, 5.04, .064, 3.7, 0, .029, 0);
  for (const x of [-2.09, 2.09]) {
    box(parent, graphite, .72, .34, 2.68, x, .19, 0);
    box(parent, oak, .66, .081, 2.56, x, .396, 0);
  }
  cylinder(parent, graphite, 1.25, .30, 0, .18, -.12);
  cylinder(parent, teal, 1.11, .024, 0, .336, -.12);
  ring(parent, frame, 1.13, 0, .343, -.12);
  const ripple = ring(parent, beacon, .51, 0, .352, -.12);
  ripple.userData.dynamic = true;
  const jets = [];
  for (let i = 0; i < 7; i++) {
    const theta = i * Math.PI * 2 / 7;
    cylinder(parent, brass, .081, .056, Math.cos(theta) * .48, .37, -.12 + Math.sin(theta) * .48);
    const jet = moving(parent, 0, .43, 0);
    ball(jet, beacon, .033, .074, .033, 0, 0, 0).castShadow = false;
    jets.push([jet, theta]);
  }
  const visitor = person(parent, -.61, 1.32, teal, 'walk', .61, { stride: 1.05, pace: .68 });
  return time => {
    jets.forEach(([jet, theta], i) => {
      const t = (time * .76 + i * .21) % 1;
      jet.position.set(Math.cos(theta) * (.49 - t * .35), .38 + Math.sin(t * Math.PI) * .79, -.12 + Math.sin(theta) * (.49 - t * .35));
    });
    ripple.scale.setScalar(.45 + (time * .51 % 1) * .48);
    visitor(time, true);
  };
}

function kineticDisplay(parent, person) {
  cylinder(parent, deck, 1.93, .096, 0, .049, 0);
  cylinder(parent, graphite, .79, .32, 0, .21, 0);
  ring(parent, brass, .67, 0, .381, 0);
  const turntable = moving(parent, 0, 1.16, 0);
  cylinder(turntable, frame, .12, .79, 0, -.40, 0);
  const outer = ring(turntable, brass, .87, 0, .08, 0, false);
  const inner = ring(turntable, navy, .64, 0, .08, 0, false);
  const core = ball(turntable, porcelain, .29, .29, .29, 0, .08, 0);
  const visitor = person(parent, -1.34, 1.35, navy, 'read', 1.4);
  cylinder(parent, frame, .23, .27, -1.34, .15, 1.39);
  return time => {
    turntable.rotation.y = time * .38;
    outer.rotation.x = Math.sin(time * .76) * .55;
    inner.rotation.y = time * -.85;
    core.position.y = .08 + Math.sin(time * 1.23) * .13;
    visitor(time, true);
  };
}

function patrol(parent) {
  const { drone, spin } = pod(parent, false);
  drone.scale.setScalar(.78);
  return time => {
    const p = time * .35;
    drone.position.set(Math.sin(p) * 1.8, 2.7 + Math.sin(p * 2) * .52, Math.cos(p) * 3.6);
    drone.rotation.set(.13 * Math.sin(p), Math.atan2(Math.cos(p) * 1.8, -Math.sin(p) * 3.6), .16 * Math.cos(p));
    spin(time, 19);
  };
}

const upperScenes = [dronePort, greenhouse, transit, controlRoom, liftArchive, observatory];
const layouts = [
  [0, 1], [5, 2], [3, 4], [1, 5], [4, 0], [2, 3],
  [5, 1], [3, 0], [4, 2], [0, 5], [1, 4], [2, 0],
];

export function addOfficeDistricts(parent, index, person) {
  const variation = layouts[index % layouts.length];
  const left = group(parent, -11.30 - (index % 3) * .47, 0, -4.34 + (index % 3) * .39, -.10 - (index % 3) * .13);
  const right = group(parent, 10.68 + (index % 4) * .35, 0, -7.2 + (index % 3) * 1.34, .12 + (index % 3) * .10);
  const leftAction = upperScenes[variation[0]](left, person);
  const rightAction = upperScenes[variation[1]](right, person);
  const side = index % 2 ? 1 : -1;
  const isSculpture = index % 3 === 1;
  const low = group(parent, side * (isSculpture ? 13.5 : 10.95 + (index % 3) * .65), 0,
    isSculpture ? 2.95 : 5.80 - (index % 3) * .57, -.24 * side);
  const lowAction = isSculpture ? kineticDisplay(low, person) : waterCourt(low, person);
  const air = index % 3 === 0 ? patrol(group(parent, -side * 9.3, 0, 5.44)) : null;
  return time => {
    leftAction(time + .64 + index * 1.17);
    rightAction(time + 2.1 + index * 1.35);
    lowAction(time + .9 + index * .77);
    air?.(time + index * 1.6);
  };
}
