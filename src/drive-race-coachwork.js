import * as THREE from 'three';
import { crossSection, loftShell, vehiclePiece as part } from './drive-vehicle-art.js';

const box = new THREE.BoxGeometry();
const circle = new THREE.CylinderGeometry(.5, .5, 1, 16);
const ring = new THREE.TorusGeometry(.5, .068, 6, 24);
const darkLens = new THREE.MeshStandardMaterial({ color: 0x192229, roughness: .33, metalness: .42 });
const clearLens = new THREE.MeshPhysicalMaterial({ color: 0x8495a0, roughness: .17, metalness: .57, clearcoat: .84 });
const smokeLens = new THREE.MeshPhysicalMaterial({ color: 0x351e28, roughness: .23, metalness: .37, clearcoat: .61 });
const bolt = new THREE.MeshStandardMaterial({ color: 0xa6b2b5, metalness: .72, roughness: .44 });

function trace(body, material, points, radius) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const geometry = new THREE.TubeGeometry(curve, Math.max(8, points.length * 3), radius, 6);
  geometry.userData.vehicleOwned = true;
  body.add(new THREE.Mesh(geometry, material));
}

function bodyDimensions(model, z) {
  const { shape, width, length, radius, depth } = model;
  const nose = THREE.MathUtils.smoothstep(-z, length - .24, depth);
  const tail = THREE.MathUtils.smoothstep(z, length - .20, depth);
  const half = width * (shape.shoulders - nose * (shape.shoulders - shape.nose) - tail * (shape.shoulders - shape.tail));
  const fromAxle = Math.abs(Math.abs(z) - length);
  const clearance = radius + .072;
  const arc = Math.sqrt(Math.max(0, clearance ** 2 - fromAxle ** 2));
  const bottom = -.25;
  const arch = Math.max(bottom, -.349 + arc);
  const high = THREE.MathUtils.lerp(shape.hood, shape.deck, THREE.MathUtils.smoothstep(z, -.50, depth - .17));
  return [z, half, arch, Math.max(arch + .09, high - nose * .065 - tail * .030)];
}

function bodySection([, w, arch, high], square) {
  const shoulder = square ? .931 : .864;
  const bank = [
    [0,-.25], [w * .68,-.254], [w * .90,arch], [w * .971,arch + .025],
    [w, THREE.MathUtils.lerp(arch, high, .63)], [w * .987, high - .027],
    [w * shoulder, high], [0, high + .021],
  ];
  return [...bank, ...bank.slice(1,-1).reverse().map(([x, y]) => [-x,y])];
}

function sidePoint(model, side, z, amount, gap = .008) {
  const section = bodyDimensions(model, z);
  const [, , arch, high] = section;
  const outline = bodySection(section, model.type === 'muscle' || model.type === 'touring');
  const y = THREE.MathUtils.lerp(arch + .024, high - .028, amount);
  for (let index = 4; index <= 5; index++) {
    const [x0,y0] = outline[index-1];
    const [x1,y1] = outline[index];
    if (y <= y1) return [side*(THREE.MathUtils.lerp(x0,x1,THREE.MathUtils.inverseLerp(y0,y1,y))+gap),y,z];
  }
  return [side*(outline[5][0]+gap),y,z];
}

function bodySkin(body, model, paint, carbon) {
  const { depth, length, radius, width, type } = model;
  const clearance = radius + .072;
  const stations = [-depth, -depth + .10, -depth + .24, -.62, .09, .62, depth - .18, depth - .083, depth];
  for (const axle of [-length, length]) for (const t of [-1.07,-.85,-.55,0,.55,.85,1.07]) {
    stations.push(axle + t * clearance);
  }
  const sections = [...new Set(stations)].filter(z => Math.abs(z) <= depth).sort((a, b) => a - b);
  loftShell(body, paint, sections.map(z => bodyDimensions(model,z)),
    data => bodySection(data, type === 'muscle' || type === 'touring'), 2);
  part(body, carbon, width * 1.56, .073, depth * 1.50, 0, -.259, 0, box);
}

function windshield(body, model, build, surfaces) {
  const { shape, type, width, roof } = model;
  const { glass, paint, carbon, accent, trim, bucket } = surfaces;
  const [nose, approach, departure, tail] = shape.cabin;
  const half = width * shape.glass;
  const base = shape.hood * .47 + shape.deck * .53 - .032;
  if (type === 'roadster') {
    const screen = part(body, glass, half * 1.85, .31, .042, 0, base + .164, approach - .12);
    screen.rotation.x = -.30;
    trace(body, trim, [[-half*.89,base+.286,approach-.147],[0,base+.317,approach-.164],[half*.89,base+.286,approach-.147]], .018);
    for (const side of [-1,1]) {
      part(body, bucket, .34, .282, .29, side*.29, base+.128, .28);
      part(body, accent, .217, .176, .066, side*.29, base+.32, .35);
      part(body, trim, .29, .27, .064, side*.29, base+.216, .43, ring);
    }
  } else {
    const square = type === 'muscle' || type === 'rally' || type === 'touring';
    const taper = square ? .86 : .77;
    const middle = (approach + departure) / 2;
    const endRoof = roof - (type === 'muscle' ? .09 : .027);
    loftShell(body, glass, [
      [nose,half * 1.02,base,base+.045], [approach,half,base,roof], [middle,half*.98,base,roof+.013],
      [departure,half*.93,base,endRoof], [tail,half*.84,base,Math.max(base+.023,shape.deck+.021)],
    ], ([,w,bottom,top]) => crossSection(w,bottom,top,taper), 5);
    const topSkin = build.roof === 'black' ? bucket : build.roof === 'carbon' || build.roof === 'scoop' ? carbon : paint;
    const cap = [
      [approach-.014, half*taper*.985, roof+.002], [middle, half*taper*.986, roof+.023],
      [departure+.025, half*taper*.929, endRoof+.003],
    ];
    loftShell(body, topSkin, cap, ([,w,high]) => crossSection(w,high-.007,high+.020,.945), 6);
    for (const side of [-1,1]) {
      trace(body, trim, [
        [side*half*.969,base+.072,nose+.064], [side * half*taper,roof+.008,approach+.014],
        [side*half*taper*.955,roof+.023,middle], [side*half*taper*.933,endRoof+.007,departure],
        [side*half*.81,Math.max(base+.036,shape.deck+.022),tail-.064],
      ], .015);
      trace(body, trim, [[side*half*.983,base+.058,nose+.085],
        [side*half*.988,base+.067,middle],[side*half*.81,base+.061,tail-.079]], .012);
      if (departure - approach > .57) {
        const z = middle + (departure - middle) * .37;
        trace(body, bucket, [[side*half*.952,base+.071,z],[side*half*.902,base+(roof-base)*.56,z+.02],
          [side*half*taper*.961,roof-.004,z+.058]], .025);
      }
    }
    if (build.roof === 'scoop') {
      part(body, carbon, .60, .127, Math.max(.46, departure-approach) * .66, 0, roof+.096, middle);
      part(body, bucket, .46, .063, .033, 0, roof+.092, middle-Math.max(.46, departure-approach)*.322, box);
      part(body, accent, .37, .019, .063, 0, roof+.144, middle-.08);
    }
  }
  return { x: half, y: base + .14, z: nose + .21 };
}

export function fitMirrors(body, build, { x, y, z }, { carbon, bucket, trim, accent, alloy }) {
  const profile = build.mirrors === 'classic' ? [.189,.117,.21] : build.mirrors === 'aero' ? [.294,.057,.18] : [.234,.079,.161];
  const material = build.mirrors === 'carbon' || build.mirrors === 'aero' ? carbon : build.mirrors === 'classic' ? alloy : accent;
  for (const sign of [-1,1]) {
    const extending = build.mirrors === 'aero' ? .149 : .109;
    const stem = part(body, bucket, .19, .045, .092, sign*(x+extending*.40), y-.022, z-.017);
    stem.rotation.z = sign*.25;
    const cap = part(body, material, ...profile, sign*(x+extending), y+.014, z);
    cap.rotation.y = sign*.12;
    const glass = part(body, trim, profile[0]*.75, profile[1]*.68, .014, sign*(x+extending), y+.014, z+profile[2]*.45);
    glass.rotation.y = sign*.12;
  }
}

function sideDetails(body, model, build, { trim, bucket, paint, alloy }) {
  for (const sign of [-1,1]) {
    const from = Math.max(-model.length + model.radius + .12, model.shape.cabin[0]-.085);
    const to = Math.min(model.length - model.radius - .12, model.shape.cabin[2]+.20);
    const handle = part(body, trim, .029, .046, .172, ...sidePoint(model, sign, to-.18, .77, .018));
    handle.rotation.y = sign*.089;
    const lower = [[from,.94],[from+.014,.52],[from+.071,.19],[from+.132,.13],
      [to-.14,.13],[to-.054,.19],[to-.012,.53],[to,.94]];
    trace(body, bucket, lower.map(([z,y]) => sidePoint(model,sign,z,y)), .008);
    if (sign > 0) {
      const panelZ = model.length * .68;
      part(body, trim, .112,.014,.112,...sidePoint(model,1,panelZ,.87,.011),circle).rotation.z = Math.PI/2;
    }
    if (build.fenders !== 'stock') {
      for (const axle of [-model.length, model.length]) {
        const rim = model.radius + .08;
        const points = Array.from({ length: 9 }, (_, i) => {
          const angle = -.23 + i * (Math.PI + .46) / 8;
          const z = axle + Math.cos(angle)*rim;
          return [sign*(bodyDimensions(model,z)[1]+.019), -.34 + Math.sin(angle)*rim, z];
        });
        trace(body, build.fenders === 'gt' ? trim : paint, points, build.fenders === 'flared' ? .039 : .058);
        if (build.fenders === 'riveted') for (const [x,y,z] of points.slice(1,-1)) {
          part(body, alloy, .026,.024,.024,x+sign*.045,y+.010,z,box);
        }
      }
    }
  }
}

function bumpers(body, model, build, { paint, bucket, carbon, trim }) {
  const { depth:d, width:w, shape, type } = model;
  const frontY = type === 'muscle' ? .105 : shape.hood * .30;
  const style = build.frontBumper;
  part(body, type==='muscle' ? trim : paint, w*1.81, .129, .166, 0, -.120, -d + .007);
  const width = style === 'track' ? 1.64 : style === 'split' ? 1.39 : type === 'muscle' ? 1.09 : 1.12;
  part(body, bucket, w*width, style==='track'?.255:.158, .075, 0, frontY, -d-.011);
  if (style !== 'stock' || type === 'muscle') {
    const bars = style === 'mesh' ? 5 : 3;
    for (let i=0;i<bars;i++) part(body, trim, w*width*.91, .014, .021, 0, frontY+(i-(bars-1)/2)*.036, -d-.051, box);
    if (style === 'mesh') for (let i=-5;i<=5;i++) part(body, trim, .010, .157,.018, i*w*width*.079,frontY,-d-.052,box);
    if (style === 'split') part(body, paint, .079,.174,.104, 0,frontY,-d-.048);
    if (style === 'track') for (const side of [-1,1]) part(body, carbon, .22,.075,.22,side*w*.88,-.13,-d-.044).rotation.z=side*.34;
  }
  const back = build.rearBumper;
  part(body, type==='muscle' ? trim : paint, w*1.74,.109,.153,0,-.095,d+.006);
  part(body, carbon, w*(back==='stock'?1.40:1.79), back==='gt' || back==='vertical' ? .205 : .136, .34, 0,-.154,d-.032);
  const fins = back === 'gt' ? 5 : back === 'vertical' ? 7 : back === 'road' ? 3 : 0;
  for (let i=0;i<fins;i++) {
    part(body, back==='road' ? trim : bucket,.035,back==='vertical'?.198:.146,.37,
      (i-(fins-1)/2)*w*.211,-.189,d+.043,box).rotation.x = -.13;
  }
}

function lenses(body, model, build, { lamp, brakeLamp, bucket, trim }) {
  const { depth:d, width:w, shape, type }=model;
  const wideRear = type === 'electric' || build.taillights === 'bar';
  const tailY = Math.max(.058,shape.deck-.093);
  if (wideRear) {
    part(body,bucket,w*1.51,.105,.061,0,tailY,d+.017);
    part(body,brakeLamp,w*1.46,.031,.024,0,tailY+.014,d+.050,box);
  }
  for (const side of [-1,1]) {
    const frontY = Math.max(.065,shape.hood*.71);
    const round = build.headlights==='halo' || build.headlights==='stock' && type==='muscle';
    if (round) {
      for (const offset of [.59,.82]) {
        const x = side * w * shape.nose * offset;
        part(body,bucket,.208,.058,.208,x,frontY,-d-.013,circle).rotation.x=Math.PI/2;
        part(body,build.headlights==='halo' ? lamp : trim,.169,.169,.112,x,frontY,-d-.038,ring);
        part(body,clearLens,.128,.033,.128,x,frontY,-d-.049,circle).rotation.x=Math.PI/2;
        part(body,lamp,.091,.028,.091,x,frontY,-d-.066,circle).rotation.x=Math.PI/2;
      }
    } else {
      const x = side*w*shape.nose*.71;
      const scale = w*(type==='electric' ? .52 : .389);
      part(body,darkLens,scale+.062,.151,.101,x,frontY,-d+.010);
      part(body,clearLens,scale,.112,.048,x,frontY,-d-.046);
      if (build.headlights==='projector') {
        for (const p of [-.21,.21]) part(body,lamp,.089,.049,.089,x+p*scale,frontY-.013,-d-.065,circle).rotation.x=Math.PI/2;
      } else {
        const blade = build.headlights==='blade';
        part(body,lamp,scale*.94,blade?.022:.042,.027,x,frontY+.018,-d-.070,box).rotation.z=side*(blade?.15:.025);
        if (blade) part(body,lamp,scale*.72,.014,.022,x,frontY-.016,-d-.067,box).rotation.z=side*.15;
      }
    }
    if (wideRear) continue;
    const x = side*w*shape.tail*.64;
    const light = build.taillights==='smoke' ? smokeLens : brakeLamp;
    part(body,darkLens,w*.60,.131,.065,x,tailY,d+.020);
    if (build.taillights==='pixel') {
      for (let i=-2;i<=2;i++) part(body,light,.068,.055,.028,x+i*w*.096,tailY,d+.059,box);
    } else {
      part(body,light,w*.542,.077,.043,x,tailY,d+.058);
      part(body,brakeLamp,w*.472,.018,.021,x,tailY+.013,d+.083,box);
    }
  }
}

export function coachwork(body, model, build, surfaces) {
  bodySkin(body,model,surfaces.paint,surfaces.carbon);
  const mirrors = windshield(body,model,build,surfaces);
  fitMirrors(body,build,mirrors,surfaces);
  sideDetails(body,model,build,surfaces);
  bumpers(body,model,build,surfaces);
  lenses(body,model,build,surfaces);
}

export function fitFormulaTail(body, model, build, { bucket, brakeLamp }) {
  if (build.taillights==='stock') return;
  const z=model.depth-.202;
  part(body,bucket,.250,.107,.076,0,-.019,z);
  const width=build.taillights==='pixel'?.046:.184;
  for (const x of build.taillights==='pixel'?[-.065,0,.065]:[0]) {
    part(body,build.taillights==='smoke'?smokeLens:brakeLamp,width,.051,.049,x,-.013,z+.036,box);
  }
}
