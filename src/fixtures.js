import * as THREE from 'three';
import { ball, box, cylinder, surface } from './scene.js';

const steel = surface('#818789', .53, .35);
const silver = surface('#b5b9b9', .52, .22);
const slate = surface('#4b5459');
const graphite = surface('#303a41');
const fabric = surface('#757e83');
const concrete = surface('#a8aaa6');
const white = surface('#dee1db');
const amber = surface('#c0955a');
const sage = surface('#8e9d8a');
const glass = new THREE.MeshStandardMaterial({ color: '#b8c9c8', opacity: .30, transparent: true, depthWrite: false });
const glow = new THREE.MeshBasicMaterial({ color: '#a9d8d0' });
const warning = new THREE.MeshBasicMaterial({ color: '#e0bc78' });
const torus = new THREE.TorusGeometry(1, .075, 6, 28);

function fixture(parent, x, z, angle) {
  const item = new THREE.Group();
  item.position.set(x, 0, z);
  item.rotation.y = angle;
  parent.add(item);
  return item;
}

function ring(parent, material, radius, x, y, z) {
  const mesh = new THREE.Mesh(torus, material);
  mesh.scale.setScalar(radius);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function coffee(parent) {
  box(parent, graphite, 2.34, .87, .83, 0, .46, 0);
  box(parent, silver, 2.44, .09, .94, 0, .93, 0);
  box(parent, steel, .82, .56, .52, -.55, 1.25, -.07);
  box(parent, slate, .72, .23, .025, -.55, 1.37, .20);
  box(parent, glow, .22, .077, .032, -.64, 1.37, .218);
  for (const x of [-.73, -.39, .32, .60, .88]) {
    cylinder(parent, white, .095, .14, x, 1.03, .23);
    ring(parent, silver, .049, x + .102, 1.04, .23);
  }
  const steam = ball(parent, white, .095, .16, .075, -.56, 1.12, .23);
  steam.castShadow = false;
  steam.userData.dynamic = true;
  return time => {
    const rise = (time * .7) % 1;
    steam.position.y = 1.10 + rise * .38;
    steam.scale.set(.045 + rise * .08, .07 + rise * .09, .06);
    steam.visible = rise < .76;
  };
}

function servers(parent) {
  const lights = [];
  for (const x of [-.94, 0, .94]) {
    box(parent, graphite, .80, 1.98, .74, x, 1.04, 0);
    box(parent, silver, .69, 1.78, .03, x, 1.06, .381);
    for (let row = 0; row < 7; row++) {
      const y = .33 + row * .21;
      box(parent, slate, .57, .119, .024, x, y, .405);
      const light = box(parent, row % 3 ? glow : warning, .040, .035, .026, x + .21, y, .428);
      light.castShadow = false;
      light.userData.dynamic = true;
      lights.push(light);
    }
  }
  return time => {
    lights.forEach((light, i) => { light.visible = Math.sin(time * 2.1 + i * 1.63) > -.65; });
  };
}

function workshop(parent) {
  box(parent, steel, 2.6, .12, 1.18, 0, .77, .17);
  for (const x of [-1.12, 1.12]) box(parent, graphite, .23, .74, .89, x, .38, .17);
  box(parent, slate, 2.6, 1.06, .10, 0, 1.33, -.47);
  for (let i = 0; i < 10; i++) {
    const x = -.99 + i * .22;
    box(parent, i % 3 ? silver : amber, .057, .24 + (i % 3) * .10, .08, x, 1.45 - (i % 2) * .19, -.405).rotation.z = (i % 4 - 1.5) * .19;
  }
  box(parent, concrete, .52, .14, .43, .72, .90, .19);
  box(parent, graphite, .45, .18, .36, .72, 1.06, .19);
  const arm = fixture(parent, -.65, .08, 0);
  arm.userData.dynamic = true;
  cylinder(arm, graphite, .22, .15, 0, .87, 0);
  box(arm, amber, .135, .43, .14, 0, 1.07, 0).rotation.z = -.30;
  box(arm, silver, .45, .1, .1, .17, 1.29, 0).rotation.z = .17;
  box(arm, graphite, .10, .18, .12, .38, 1.24, 0);
  return time => { arm.rotation.y = Math.sin(time * .85) * .65; };
}

function copier(parent) {
  box(parent, slate, 1.00, .88, .76, 0, .48, 0);
  box(parent, white, 1.12, .25, .84, 0, 1.02, 0);
  box(parent, steel, .88, .055, .59, 0, 1.17, -.05);
  box(parent, graphite, .7, .16, .047, 0, .94, .433);
  box(parent, glow, .15, .063, .019, .36, 1.08, .431);
  const sheet = box(parent, white, .46, .016, .41, -.05, .909, .43);
  sheet.userData.dynamic = true;
  for (let i = 0; i < 4; i++) box(parent, silver, .61, .044, .38, 1.02, .09 + i * .055, -.10).rotation.y = i * .12;
  return time => { sheet.position.z = .39 + .17 * (1 + Math.sin(time * 1.2)); };
}

function terrarium(parent) {
  box(parent, concrete, 1.7, .52, .74, 0, .28, 0);
  const shell = box(parent, glass, 1.63, .75, .68, 0, .91, 0);
  shell.castShadow = false;
  for (const x of [-.82, .82]) {
    for (const z of [-.35, .35]) box(parent, slate, .027, .77, .027, x, .91, z);
  }
  box(parent, silver, 1.67, .06, .74, 0, 1.30, 0);
  for (let i = 0; i < 7; i++) {
    const height = .11 + (i % 4) * .048;
    ball(parent, i % 3 ? sage : amber, .11, height, .086, -.63 + i * .21, .56 + height, Math.sin(i * 2.3) * .19).rotation.z = Math.sin(i) * .47;
  }
}

function bench(parent) {
  for (const x of [-.77, .77]) box(parent, slate, .19, .40, .55, x, .21, 0);
  box(parent, fabric, 1.94, .18, .57, 0, .49, 0);
  box(parent, silver, 1.96, .33, .12, 0, .73, -.26);
  for (const x of [-.9, .9]) ring(parent, steel, .17, x, .60, .09).rotation.y = Math.PI / 2;
  const bag = box(parent, amber, .35, .37, .19, -.43, .74, .01);
  bag.rotation.z = -.12;
  ring(parent, graphite, .102, -.43, .94, .025);
}

function signage(parent) {
  cylinder(parent, slate, .47, .095, 0, .054, 0);
  cylinder(parent, steel, .085, 1.30, 0, .72, 0);
  box(parent, graphite, .87, .60, .11, 0, 1.40, 0);
  box(parent, glow, .62, .049, .017, 0, 1.49, .062);
  for (let i = 0; i < 3; i++) box(parent, silver, .43 - i * .08, .027, .018, -.07, 1.39 - i * .08, .064);
}

function freight(parent) {
  const cart = fixture(parent, 0, 0, 0);
  cart.userData.dynamic = true;
  box(cart, graphite, 1.10, .105, .66, 0, .18, 0);
  for (const x of [-.39, .39]) {
    for (const z of [-.23, .23]) ball(cart, steel, .092, .092, .051, x, .10, z);
  }
  for (const x of [-.46, .46]) box(cart, steel, .049, .56, .048, x, .49, -.28);
  box(cart, silver, .99, .052, .051, 0, .77, -.28);
  box(cart, concrete, .68, .34, .42, -.12, .402, .04);
  box(cart, white, .21, .01, .42, -.12, .578, .04);
  box(cart, warning, .083, .050, .024, .39, .242, .327);
  return time => {
    cart.position.x = Math.sin(time * .55) * 1.36;
    cart.rotation.y = Math.cos(time * .55) > 0 ? .20 : -.20;
  };
}

const catalog = [coffee, servers, workshop, copier, terrarium, bench, signage, freight];

export function furnishDetails(parent, index, branch) {
  const places = branch
    ? [[-3.8, -1.9], [3.3, .2], [-.6, -4.9], [2.0, 6.4]]
    : [[-6.6, 6.4], [7.0, -5.85], [-6.25, -6.75], [5.65, 12.6], [-7.6, 2.6]];
  const updates = [];
  places.forEach(([x, z], slot) => {
    const design = (index * 3 + slot * 5 + Math.floor(index / 4)) % catalog.length;
    const item = fixture(parent, x + Math.sin(index * 2 + slot) * .46, z, Math.sin(index + slot * 2.2) * .62);
    const update = catalog[design](item);
    if (update) updates.push(update);
  });
  return time => updates.forEach(update => update(time + index * .83));
}
