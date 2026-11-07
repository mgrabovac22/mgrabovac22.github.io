import * as THREE from 'three';
import { ball, box, cylinder, surface } from './scene.js';

const ink = surface('#303d43');
const metal = surface('#879091', .57, .19);
const pale = surface('#c6cbc7');
const fabric = surface('#586f69');
const green = surface('#748c78');
const amber = surface('#bd9461');
const paper = surface('#e6e8df');
const teal = new THREE.MeshBasicMaterial({ color: '#95cabc' });
const gold = new THREE.MeshBasicMaterial({ color: '#e8bb73' });

function group(parent, x, z, rotation = 0) {
  const item = new THREE.Group();
  item.position.set(x, 0, z);
  item.rotation.y = rotation;
  parent.add(item);
  return item;
}

function table(parent, x, z, width, depth) {
  const item = group(parent, x, z);
  box(item, pale, width, .085, depth, 0, .68, 0);
  for (const side of [-1, 1]) box(item, ink, .12, .61, depth * .72, side * (width / 2 - .19), .33, 0);
  return item;
}

function stool(parent, x, z) {
  cylinder(parent, ink, .145, .36, x, .19, z);
  cylinder(parent, fabric, .23, .095, x, .416, z);
}

function moving(object) {
  object.userData.dynamic = true;
  return object;
}

function floorMat(parent, x, z, width, depth) {
  const mat = box(parent, green, width, .018, depth, x, .013, z);
  mat.castShadow = false;
}

function note(parent, x, z, angle = 0) {
  const sheet = box(parent, paper, .37, .014, .26, x, .739, z);
  sheet.rotation.y = angle;
  return sheet;
}

function projector(parent, width, z) {
  for (const side of [-1, 1]) box(parent, metal, .065, 1.85, .11, side * width / 2, .94, z);
  box(parent, ink, width, 1.34, .085, 0, 1.52, z);
  box(parent, pale, width - .16, 1.17, .018, 0, 1.52, z + .05);
  const cursor = moving(box(parent, gold, .070, .070, .027, -1, 1.51, z + .076));
  const bars = Array.from({ length: 7 }, (_, i) => moving(box(parent, i % 3 ? teal : metal,
    .17, .42, .024, (i - 3) * width / 9, 1.32, z + .076)));
  return time => {
    bars.forEach((bar, i) => {
      const height = .55 + Math.sin(time * 1.1 + i * .63) * .32;
      bar.scale.y = .86 * height;
      bar.position.y = 1.15 + bar.scale.y / 2;
    });
    cursor.position.x = Math.sin(time * 1.5) * width * .31;
    cursor.position.y = 1.53 + Math.cos(time * 1.1) * .22;
  };
}

function meeting(parent, actor) {
  floorMat(parent, 0, .2, 6.9, 4.8);
  const conference = table(parent, .2, .39, 3.82, 1.58);
  box(conference, ink, .47, .028, .36, .14, .74, -.09);
  note(conference, -1.22, .2, .33);
  note(conference, 1.15, -.21, -.17);
  const pointer = projector(parent, 3.65, -1.97);
  for (const x of [-.91, .73]) {
    stool(parent, x, 1.57);
    actor(x, 1.57, 'read', x + 1.1, Math.PI);
  }
  actor(-2.37, -.75, 'present', .3, .32);
  actor(2.34, .46, 'gesture', 1.8, -.7);
  return pointer;
}

function classroom(parent, actor) {
  const board = projector(parent, 3.35, -2.1);
  actor(-2.05, -1.08, 'present', 1.4, .5);
  for (let i = 0; i < 4; i++) {
    const x = i % 2 ? 1.1 : -.95;
    const z = i > 1 ? 1.61 : .05;
    const row = table(parent, x, z, 1.37, .62);
    note(row, -.2, 0, i * .2);
    box(row, ink, .32, .052, .20, .28, .77, -.09);
    stool(parent, x, z + .62);
    actor(x, z + .61, i % 2 ? 'read' : 'type', i * .8, Math.PI);
  }
  return board;
}

function coffeeBreak(parent, actor) {
  const counter = table(parent, -.55, -1.02, 3.74, .85);
  box(counter, ink, .75, .51, .48, -.85, .94, -.02);
  box(counter, metal, .62, .13, .50, -.85, 1.12, .05);
  box(counter, teal, .20, .06, .019, -.93, 1.13, .31);
  for (const x of [.38, .63, .88, 1.13]) cylinder(counter, paper, .07, .14, x, .78, .02);
  const steam = Array.from({ length: 3 }, (_, i) => moving(ball(counter, pale, .06, .12, .054, -.85 + i * .045, .92, .21)));
  cylinder(parent, metal, .74, .08, 1.55, .68, 1.24);
  cylinder(parent, ink, .115, .65, 1.55, .35, 1.24);
  cylinder(parent, amber, .08, .16, 1.43, .79, 1.19);
  stool(parent, 2.47, 1.3);
  actor(2.47, 1.3, 'read', .9, -Math.PI / 2);
  actor(-1.4, -.25, 'present', 1.2, Math.PI);
  actor(.14, 1.62, 'gesture', 2.4, .8);
  return time => steam.forEach((puff, i) => {
    const rise = (time * .69 + i / 3) % 1;
    puff.position.y = .87 + rise * .43;
    puff.position.x = -.85 + Math.sin(rise * 5.2 + i) * .08;
    puff.visible = rise < .71;
  });
}

function receiving(parent, actor) {
  const shelf = group(parent, 1.48, -1.62);
  for (const x of [-1.25, 1.25]) box(shelf, metal, .075, 1.58, .69, x, .82, 0);
  for (let row = 0; row < 3; row++) {
    box(shelf, ink, 2.52, .064, .69, 0, .23 + row * .46, 0);
    for (let slot = 0; slot < 5; slot++) {
      const height = .18 + (slot % 3) * .055;
      box(shelf, (slot + row) % 3 ? pale : amber, .31, height, .42, (slot - 2) * .43,
        .27 + row * .46 + height / 2, -.02);
    }
  }
  const belt = table(parent, -.9, .42, 2.6, .71);
  box(belt, ink, 2.6, .076, .63, 0, .77, 0);
  for (let i = 0; i < 12; i++) box(belt, metal, .061, .018, .58, -1.19 + i * .215, .817, 0);
  const packages = [-.84, -.13, .64].map((x, i) => moving(box(belt, i % 2 ? pale : amber, .28, .19, .32, x, .917, 0)));
  actor(1.2, .9, 'carry', 2.1, .4, 1.08);
  actor(-1.72, -.36, 'present', 1.2, .2);
  return time => packages.forEach((parcel, i) => {
    parcel.position.x = ((time * .46 + i * .71) % 2.13) - 1.06;
    parcel.scale.y = i % 2 ? .19 : .24;
  });
}

function laboratory(parent, actor) {
  const island = table(parent, -.5, -.39, 3.9, 1.42);
  box(island, ink, 1.13, .07, .69, .76, .752, .03);
  for (let i = 0; i < 6; i++) box(island, i % 2 ? pale : green, .16, .10 + (i % 3) * .08, .13, .39 + (i % 3) * .27, .84, -.1 + Math.floor(i / 3) * .27);
  const arm = moving(group(island, -.85, 0));
  cylinder(arm, ink, .21, .14, 0, .82, 0);
  box(arm, amber, .11, .53, .12, -.06, 1.09, 0).rotation.z = .18;
  const joint = moving(group(arm, -.09, 0));
  joint.position.y = 1.30;
  box(joint, metal, .49, .093, .099, .2, 0, 0);
  box(joint, ink, .075, .18, .098, .44, -.04, 0);
  const update = projector(parent, 2.1, -1.82);
  stool(parent, -.65, .88);
  actor(-.65, .88, 'type', .8, Math.PI);
  actor(1.77, .27, 'present', 2.4, -.85);
  return time => {
    arm.rotation.y = Math.sin(time * 1.0) * .9;
    joint.rotation.z = -.22 + Math.sin(time * 1.6) * .34;
    update(time);
  };
}

function facilities(parent, actor) {
  floorMat(parent, .2, -.1, 6.1, 3.6);
  const planter = box(parent, metal, 3.65, .44, .51, 0, .24, -1.84);
  planter.receiveShadow = true;
  for (let i = 0; i < 8; i++) {
    const height = .22 + (i % 3) * .11;
    ball(parent, i % 2 ? green : fabric, .24, height, .22, (i - 3.5) * .43, .42 + height, -1.84).rotation.z = Math.sin(i) * .28;
  }
  const robot = moving(group(parent, 0, 0));
  cylinder(robot, ink, .40, .13, 0, .095, 0);
  cylinder(robot, metal, .36, .11, 0, .208, 0);
  box(robot, teal, .17, .055, .071, 0, .184, .355);
  const brush = moving(box(robot, pale, .85, .046, .066, 0, .076, .17));
  actor(-2.6, .72, 'walk', 1.2, .3, .95);
  actor(2.3, -1.0, 'gesture', 3, -.7);
  return time => {
    const path = time * .50;
    robot.position.set(Math.sin(path) * 1.63, 0, Math.cos(path) * .96 + .48);
    robot.rotation.y = Math.atan2(Math.cos(path) * 1.63, -Math.sin(path) * .96);
    brush.rotation.y = time * 5.7;
  };
}

function inspectionDrone(parent) {
  const drone = moving(group(parent, 0, 0));
  box(drone, ink, .36, .15, .28, 0, 0, 0);
  box(drone, teal, .22, .035, .036, 0, -.032, .143);
  const rotors = [-1, 1].map(side => {
    box(drone, metal, .34, .047, .073, side * .25, .026, 0);
    const rotor = moving(group(drone, side * .37, 0));
    rotor.position.y = .09;
    box(rotor, ink, .32, .024, .055, 0, 0, 0);
    box(rotor, pale, .055, .025, .31, 0, 0, 0);
    return rotor;
  });
  return time => {
    const orbit = time * .45;
    drone.position.set(Math.sin(orbit) * 2.6, 2.04 + Math.sin(time * 1.23) * .22, Math.cos(orbit) * .84 - .7);
    drone.rotation.set(.10 * Math.sin(orbit), Math.atan2(Math.cos(orbit) * 2.6, -Math.sin(orbit) * .84), .09 * Math.cos(orbit));
    rotors.forEach((rotor, i) => { rotor.rotation.y = time * (i === 0 ? 17 : -19); });
  };
}

function plotter(parent) {
  const unit = group(parent, 2.64, -.91, -.25);
  box(unit, ink, .67, .82, .51, 0, .42, 0);
  box(unit, metal, .70, .19, .54, 0, .87, 0);
  box(unit, ink, .41, .027, .055, 0, .855, .284);
  box(unit, teal, .085, .045, .018, .24, .91, .282);
  const sheet = moving(box(unit, paper, .31, .013, .24, 0, .846, .18));
  const mark = box(sheet, green, .68, .13, .07, -.035, .5, -.13);
  mark.castShadow = false;
  return time => {
    const phase = time % 7;
    sheet.position.z = .16 + Math.min(1, phase / 4.2) * .31;
    sheet.position.y = .847 - Math.max(0, phase - 5.6) * .33;
    sheet.rotation.x = -Math.max(0, phase - 5.6) * .6;
  };
}

const scenarios = [meeting, classroom, coffeeBreak, receiving, laboratory, facilities];
const anchors = { about: 2, career: 0, education: 1, projects: 4, qualifications: 5, contact: 3 };

export function addOfficeScene(parent, page, index, person) {
  const actors = [];
  const area = group(parent, 0, 2.7, (index % 3 - 1) * .13);
  const addActor = (x, z, behavior, phase, facing, stride) => {
    actors.push(person(area, x, z, phase % 2 > 1 ? fabric : green, behavior, phase + index * .53, { facing, stride }));
  };
  const scene = scenarios[anchors[page.id] ?? (index * 5 + Math.floor(index / 3)) % scenarios.length];
  const ambient = scene(area, addActor);
  const extra = index % 5 === 2 ? inspectionDrone(area) : index % 7 === 3 ? plotter(area) : null;
  return (time, active) => {
    const local = time + index * .81;
    ambient(local);
    extra?.(local);
    for (const actor of actors) actor(local, active);
  };
}
