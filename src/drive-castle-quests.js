import * as THREE from 'three';
import { castleBridges, castleIsland, castleIslandDistance } from './drive-rally-terrain.js';

const tasks = {
  charter: [['ledger',0,3.55]],
  seals: [['sealLion',-13.2,10.5], ['sealWave',12,-10.9], ['sealPalm',-12.9,-10.8]],
  cistern: [['valveNorth',-13.6,-7.3], ['valveSouth',-13.6,-2.75]],
  courier: [['dispatch',-18.6,0], ['passage',0,0], ['delivery',18.6,0]],
  garden: [['flowerRed',12.6,14.1], ['flowerWhite',16.7,11.2], ['flowerGold',16.4,17.3]],
  beacons: [['beaconNorth',16.5,-16.0], ['beaconWest',-16.5,-16.0], ['beaconSouth',-16.6,16.3]],
  stars: [['dialWest',-3.9,-12.8], ['dialCenter',0,-13.65], ['dialEast',3.9,-12.8]],
  treasury: [['royalChest',-11.1,16.4]],
};
const positions = Object.values(tasks).flat();
const stages = Object.keys(tasks);
const starPositions = [2, 3, 1];
const clay = new THREE.MeshStandardMaterial({ color: 0xac8c6d, roughness: .84 });
const stone = new THREE.MeshStandardMaterial({ color: 0x8a9a88, roughness: .88 });
const green = new THREE.MeshStandardMaterial({ color: 0x3e775f, roughness: .8 });
const walnut = new THREE.MeshStandardMaterial({ color: 0x765036, roughness: .85 });
const bronze = new THREE.MeshStandardMaterial({ color: 0xbf975c, metalness: .60, roughness: .35 });
const paper = new THREE.MeshStandardMaterial({ color: 0xf2d993, roughness: .7 });
const flowerColors = [0xbc4b4c, 0xf0e9cd, 0xe6b745].map(color => new THREE.MeshStandardMaterial({ color, roughness: .72 }));
const amber = new THREE.MeshBasicMaterial({ color: 0xffbd63 });
const jewel = new THREE.OctahedronGeometry(.20);
const box = new THREE.BoxGeometry();
const column = new THREE.CylinderGeometry(.48, .57, 1, 14);
const sphere = new THREE.IcosahedronGeometry(.5, 1);
const disk = new THREE.CylinderGeometry(.5, .5, 1, 18).rotateX(Math.PI / 2);
const ring = new THREE.TorusGeometry(.44, .052, 7, 21);
const ringPath = new THREE.RingGeometry(1.20,1.43,38).rotateX(-Math.PI / 2);

function part(group, material, x, y, z, w, h, d, geometry = box) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x,y,z);
  mesh.scale.set(w,h,d);
  group.add(mesh);
  return mesh;
}

function plinth(group, height = .70) {
  part(group, stone, 0, .13, 0, .96, .24, .96, column);
  part(group, stone, 0, height / 2 + .14, 0, .55, height-.03, .55, column);
  part(group, clay, 0, height + .15, 0, .70, .13, .70, column);
}

function book(group) {
  plinth(group);
  part(group, walnut, 0,.91,0,.71,.09,.46).rotation.x = .13;
  for (const s of [-1, 1]) {
    part(group, paper, s*.158,.967,0,.315,.049,.40).rotation.z = s*.09;
    for (let row=0; row<4; row++) part(group, walnut, s*.155,.999,(row-1.5)*.063,.20,.008,.008);
  }
}

function wheel(group) {
  plinth(group);
  part(group, green, 0,1.16,0,.64,.64,.13,disk);
  const turn = new THREE.Group();
  turn.position.set(0,1.16,.14);
  group.add(turn);
  part(turn, bronze, 0,0,0,.57,.57,.19,ring);
  for (let i=0; i<4; i++) part(turn, bronze,0,0,0,.50,.042,.035).rotation.z=i*Math.PI/4;
  part(turn, paper, 0,.175,.036,.088,.17,.04);
  return turn;
}

function seal(group, index) {
  plinth(group);
  const badge = part(group, flowerColors[index], 0,1.06,0,.47,.52,.11,disk);
  part(group, bronze, 0,1.06,.065,.49,.50,.17,ring);
  const stamp = part(group, paper, 0,1.06,.085, .27,.30,.12,jewel);
  stamp.rotation.z = index * .66;
  return badge;
}

function bloom(group, index) {
  part(group, clay,0,.23,0,.73,.43,.72,column);
  for (let i=0; i<5; i++) {
    const a=i*2.40, x=Math.sin(a)*.23,z=Math.cos(a)*.24;
    part(group, green,x,.57,z,.14,.52,.16,column).rotation.z=Math.cos(a)*.30;
    for (let j=0; j<5; j++) {
      const phase=j*Math.PI*2/5;
      part(group,flowerColors[index],x+Math.cos(phase)*.089,.82,z+Math.sin(phase)*.089,.15,.079,.13,sphere);
    }
  }
}

function brazier(group) {
  plinth(group,1.12);
  part(group, bronze,0,1.32,0,.84,.28,.84,column);
  return part(group, amber,0,1.53,0,.31,.57,.35,sphere);
}

function chest(group) {
  part(group, stone,0,.12,0,1.94,.24,1.40);
  part(group, walnut,0,.51,0,1.48,.53,.91);
  for (const x of [-.47,.47]) part(group, bronze,x,.49,.47,.14,.48,.07);
  for (let i=0; i<14; i++) part(group, bronze, Math.sin(i*2.4)*.50,.75+(i%3)*.022,Math.cos(i*2.4)*.33,.17,.056,.17,column);
  const lid=new THREE.Group();
  lid.position.set(0,.79,-.47);
  group.add(lid);
  part(lid,walnut,0,.14,.47,1.54,.29,.94);
  part(lid,bronze,0,.10,.94,.21,.16,.09);
  for (const x of [-.47,.47]) part(lid,bronze,x,.27,.47,.14,.05,.92);
  return lid;
}

export function createCastleQuests(parent, route) {
  const scenery = new THREE.Group();
  parent.add(scenery);
  const points = Object.fromEntries(positions.map(([id,x,z]) => [id,{x,y:0,z}]));
  const triggers = new Map();
  const wheels = new Map();
  const flames = new Map();
  let lid;
  for (const [stage, entries] of Object.entries(tasks)) {
    for (const [index, [id,x,z]] of entries.entries()) {
      const stand = new THREE.Group();
      stand.position.set(x,.07,z);
      scenery.add(stand);
      const marker = part(stand, amber,0,1.82,0,.70,.70,.70,jewel);
      marker.visible = false;
      triggers.set(id, marker);
      if (stage === 'charter') book(stand);
      if (stage === 'seals') seal(stand, index);
      if (stage === 'cistern' || stage === 'stars') wheels.set(id, wheel(stand));
      if (stage === 'garden') bloom(stand, index);
      if (stage === 'beacons') flames.set(id, brazier(stand));
      if (stage === 'courier' && id !== 'passage') book(stand);
      if (id === 'passage') {
        part(stand, new THREE.MeshBasicMaterial({ color: 0xdac088, transparent: true, opacity: .70, side: THREE.DoubleSide }),
          0,-.02,0,1,1,1,ringPath);
      }
      if (stage === 'treasury') lid=chest(stand);
    }
  }

  let stage = 0, timer = 0, through = false, flowing = false;
  const finished = new Set();
  const settings = new Map();
  const stops = Object.fromEntries(Object.entries(tasks).map(([key, [[id]]]) => [key, points[id]]));
  const idsForStage = () => (tasks[stages[stage]] ?? []).map(([id]) => id);
  const within = (position, point, meters) => Math.hypot(position.x-point.x,position.z-point.z) <= meters && Math.abs(position.y-point.y-.8)<1.8;

  function nearby(position, onFoot) {
    if (!onFoot) return null;
    const phase = stages[stage];
    for (const id of idsForStage()) {
      if (id === 'passage' || id === 'delivery' && (!timer || !through) || id === 'dispatch' && timer) continue;
      if (phase !== 'stars' && !finished.has(id) || phase === 'stars') {
        if (within(position, points[id], 2.1)) return id;
      }
    }
    return null;
  }
  function target(position = castleIsland) {
    const phase = stages[stage];
    if (!phase) return null;
    const inside = castleIslandDistance(position.x, position.z) < .98;
    if (!inside) {
      const bridge = castleBridges.reduce((best, entry) =>
        Math.hypot(position.x-entry.outer.x,position.z-entry.outer.z) <
        Math.hypot(position.x-best.outer.x,position.z-best.outer.z) ? entry : best);
      const dx = bridge.inner.x - bridge.outer.x, dz = bridge.inner.z - bridge.outer.z;
      const offsetX = position.x - bridge.outer.x, offsetZ = position.z - bridge.outer.z;
      const along = (offsetX * dx + offsetZ * dz) / (dx * dx + dz * dz);
      const crossing = along >= -.04 && along <= 1.02 && Math.hypot(offsetX - along * dx, offsetZ - along * dz) < 3.6;
      return { point: crossing ? bridge.inner : bridge.outer, id: crossing ? 'crossing' : 'bridge' };
    }
    let id = idsForStage().find(id => !finished.has(id));
    if (phase === 'courier' && timer) id = through ? 'delivery' : 'passage';
    if (phase === 'stars') id = idsForStage().find((key,index) => settings.get(key) !== starPositions[index]);
    return { point: points[id], id };
  }
  function complete(message) {
    stage++;
    return message;
  }
  function interact(position, onFoot) {
    const id = nearby(position, onFoot);
    if (!id) return null;
    const phase = stages[stage];
    if (phase === 'courier') {
      if (id === 'dispatch') {
        timer = 19;
        through = false;
        return 'courierStart';
      }
      timer = 0;
      return complete('courierDone');
    }
    if (phase === 'cistern' && id === 'valveSouth' && !finished.has('valveNorth')) {
      settings.clear();
      return 'valveWrong';
    }
    if (phase === 'stars') {
      const turn = (settings.get(id) ?? 0) + 1;
      settings.set(id,turn%4);
      const aligned = idsForStage().every((key,index) => settings.get(key) === starPositions[index]);
      return aligned ? complete('starsDone') : 'dialTurned';
    }
    finished.add(id);
    if (phase === 'cistern') settings.set(id,1);
    if (idsForStage().some(key => !finished.has(key))) return phase+'Piece';
    if (phase === 'cistern') flowing = true;
    return complete(phase+'Done');
  }
  function update(dt, position, onFoot) {
    if (!timer) return null;
    timer = Math.max(0, timer-dt);
    if (!timer || !onFoot) {
      timer = 0;
      through = false;
      return 'courierRetry';
    }
    if (!through && within(position,points.passage,2.35)) {
      through = true;
      return 'courierStamped';
    }
    return null;
  }
  function render(time, dt, motion, position) {
    const targetId = target(position)?.id;
    for (const [id, marker] of triggers) {
      marker.visible = id === targetId;
      if (marker.visible) {
        marker.position.y = 1.89 + (motion ? Math.sin(time*3.1)*.14 : 0);
        marker.rotation.y = motion ? time*1.1 : 0;
      }
    }
    for (const [id, rotor] of wheels) {
      const angle = (settings.get(id) ?? 0) * -Math.PI / 2;
      rotor.rotation.z = motion ? THREE.MathUtils.damp(rotor.rotation.z,angle,8,dt) : angle;
    }
    for (const [id, flame] of flames) {
      flame.visible = finished.has(id);
      flame.scale.y = .58 + (motion ? Math.sin(time * 8 + flame.id) * .13 : 0);
    }
    const open = stage === stages.length ? -1.66 : 0;
    lid.rotation.x = motion ? THREE.MathUtils.damp(lid.rotation.x,open,7,dt) : open;
  }

  return {
    route, stops, points, target, nearby, interact, update, render,
    status() {
      const phase=stages[stage];
      const ids=idsForStage();
      const progress=phase==='stars' ? ids.filter((id,index)=>settings.get(id)===starPositions[index]).length : ids.filter(id=>finished.has(id)).length;
      return { stage, seconds:timer, gate:Number(through), gates:1, progress, total:ids.length };
    },
    contains(position) { return castleIslandDistance(position.x,position.z)<.96; },
    get flowing() { return flowing; },
    cancelTrail() { timer=0; through=false; },
  };
}
