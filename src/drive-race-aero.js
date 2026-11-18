import * as THREE from 'three';
import { bodySurfaceHeight } from './drive-race-coachwork.js';
import { vehiclePiece as part } from './drive-vehicle-art.js';

const blades = {
  ducktail: { lift: .09, half: .58, chord: .22, slab: .067, sweep: -.06, arch: .021 },
  club: { lift: .33, half: .81, chord: .28, slab: .064, sweep: .037, arch: .028 },
  gt: { lift: .53, half: .94, chord: .34, slab: .071, sweep: .018, arch: .024 },
  swan: { lift: .58, half: .91, chord: .36, slab: .074, sweep: .055, arch: .019 },
  endurance: { lift: .48, half: .94, chord: .38, slab: .074, sweep: .034, arch: .012 },
  swept: { lift: .42, half: .93, chord: .48, slab: .092, sweep: .29, arch: .091 },
  split: { lift: .40, half: .92, chord: .36, slab: .079, sweep: -.051, arch: .076 },
  longtail: { lift: .24, half: .96, chord: .56, slab: .076, sweep: .16, arch: .038 },
};
const foil = [
  [0,-.06],[.06,-.35],[.26,-.43],[.54,-.28],[.82,-.10],[1,0],
  [.78,.18],[.56,.39],[.28,.57],[.08,.46],
];
const beam = new THREE.BoxGeometry(1,1,1);
const unit = new THREE.Vector3(0,1,0);

function wingMesh(parent, material, interval, at) {
  const positions = [], uv = [], indices = [];
  const rows = 18;
  for (let i=0;i<=rows;i++) for (let j=0;j<foil.length;j++) {
    positions.push(...at(THREE.MathUtils.lerp(...interval,i/rows),...foil[j]));
    uv.push(i/rows,j/foil.length);
    if (i===rows) continue;
    const a=i*foil.length+j, b=i*foil.length+(j+1)%foil.length;
    indices.push(a,a+foil.length,b,b,a+foil.length,b+foil.length);
  }
  const last=rows*foil.length;
  for (let j=1;j<foil.length-1;j++) indices.push(0,j,j+1,last,last+j+1,last+j);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.vehicleOwned = true;
  parent.add(new THREE.Mesh(geometry,material));
}

function bracket(parent, material, from, to, width, depth) {
  const line = new THREE.Vector3(...to).sub(new THREE.Vector3(...from));
  const [x,y,z] = from.map((value,index)=>(value+to[index])/2);
  const strut = part(parent,material,width,line.length(),depth,x,y,z,beam);
  strut.quaternion.setFromUnitVectors(unit,line.normalize());
}

export function stockWingUnchanged(build) {
  return build.wing==='stock' && build.wingFinish==='stock' && build.wingWidth==='stock' &&
    build.wingMount==='stock' && build.wingPitch==='stock';
}

export function fitWing(body, model, build, { paint, accent, alloy, carbon }) {
  if (build.wing==='none' || model.id==='formula' && stockWingUnchanged(build)) return;
  const suggested = model.id === 'formula' ? 'gt'
    : ['gt','prototype','attack'].includes(model.type) ? 'club' : 'ducktail';
  const style = build.wing==='stock' ? suggested : build.wing;
  const blade = blades[style];
  const z = model.depth-.29, deck = bodySurfaceHeight(model,z);
  const finish = { carbon, body: paint, accent, alloy };
  const skin = finish[build.wingFinish] ?? (style==='ducktail' ? paint : carbon);
  const width = build.wingWidth==='narrow' ? .84 : build.wingWidth==='wide' ? 1.13 : 1;
  const span = model.width * blade.half * width;
  const lift = THREE.MathUtils.clamp(blade.lift + (build.wingMount==='low' ? -.137 : build.wingMount==='high' ? .176 : 0), .045, .81);
  const angle = build.wingPitch==='flat' ? .017 : build.wingPitch==='steep' ? .364 : .160;
  function point(s, t, thickness, upper = 0) {
    const tip = Math.abs(s);
    const chord = blade.chord * (1 - (style==='swept' ? .34 : .12) * tip ** 2);
    return [s*span, deck+lift+blade.arch*tip**2+(t-.39)*chord*angle+thickness*blade.slab+upper,
      z+blade.sweep*tip**1.65+(t-.42)*chord];
  }
  const halves = style==='split' ? [[-1,-.078],[.078,1]] : [[-1,1]];
  for (const segment of halves) wingMesh(body,skin,segment,point);
  if (style==='endurance') wingMesh(body,skin,[-.95,.95],(s,t,h)=>point(s,.27+t*.61,h*.72,.097));

  if (lift < .14) {
    part(body,skin,span*1.84,lift+.039,blade.chord*.68,0,deck+lift*.43,z-.027);
    return;
  }
  for (const side of [-1,1]) {
    const at = side*.48;
    const edge = point(at,.40,-.32);
    const foot = [edge[0],deck-.072,z-.157];
    if (style==='swan') {
      const tip = point(at,.28,.22,.125);
      bracket(body,carbon,foot,tip,.064,.096);
      bracket(body,alloy,tip,edge,.058,.081);
    } else {
      bracket(body,alloy,foot,edge,.073,style==='longtail'?.116:.094);
    }
    const [,tipY,tipZ] = point(side,.52,0);
    const upright = part(body,skin,.047,style==='endurance'?.217:.142,blade.chord*.92,span*side,tipY+.018,tipZ);
    upright.rotation.x = -angle;
    part(body,accent,.053,.023,blade.chord*.76,span*side,tipY+.070,tipZ-.019,beam).rotation.x=-angle;
  }
}
