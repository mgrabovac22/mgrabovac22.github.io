import * as THREE from 'three';
import { loftShell, vehiclePiece as part } from './drive-vehicle-art.js';
import { silhouettes } from './drive-race-silhouettes.js';

const box = new THREE.BoxGeometry();
const circle = new THREE.CylinderGeometry(.5, .5, 1, 16);
const ring = new THREE.TorusGeometry(.5, .068, 6, 24);
const grilleCell = new THREE.RingGeometry(.71,1,6);
const bulletPod = new THREE.SphereGeometry(.5,16,8);
const wedgePod = new THREE.CylinderGeometry(.50,.65,1,5).rotateX(Math.PI/2);
const darkLens = new THREE.MeshStandardMaterial({ color: 0x192229, roughness: .33, metalness: .42 });
const clearLens = new THREE.MeshPhysicalMaterial({ color: 0x8495a0, roughness: .17, metalness: .57, clearcoat: .84 });
const smokeLens = new THREE.MeshPhysicalMaterial({ color: 0x351e28, roughness: .23, metalness: .37, clearcoat: .61 });
const coldLens = new THREE.MeshPhysicalMaterial({ color: 0x648fb0, roughness: .17, metalness: .48, clearcoat: .71 });
const mirrorGlass = new THREE.MeshStandardMaterial({ color: 0xb9c9d6, roughness: .12, metalness: .87 });
const amberMarker = new THREE.MeshStandardMaterial({ color: 0xda9137, roughness: .27, emissive: 0x422305, emissiveIntensity: .48 });
const bolt = new THREE.MeshStandardMaterial({ color: 0xa6b2b5, metalness: .72, roughness: .44 });

function trace(body, material, points, radius) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const geometry = new THREE.TubeGeometry(curve, Math.max(8, points.length * 3), radius, 6);
  geometry.userData.vehicleOwned = true;
  body.add(new THREE.Mesh(geometry, material));
}

function curveValue(rows, last, distance, column) {
  const a = rows[last-1], b = rows[last];
  const length = b[0] - a[0];
  const slope = (b[column] - a[column]) / length;
  function joined(left, right) {
    return left * right > 0 ? 2 * left * right / (left + right) : 0;
  }
  const before = rows[last-2], after = rows[last+1];
  const start = before ? joined(slope,(a[column]-before[column])/(a[0]-before[0])) : slope;
  const end = after ? joined(slope,(after[column]-b[column])/(after[0]-b[0])) : slope;
  const t = (distance-a[0])/length;
  return THREE.MathUtils.lerp(a[column],b[column],t*t*(3-2*t)) +
    length * (start*t*(1-t)**2-end*t*t*(1-t));
}

function bodyDimensions(model, z) {
  const { width, length, radius, depth } = model;
  const { body, crown } = silhouettes[model.id];
  const normalized = THREE.MathUtils.clamp(z / depth, -1, 1);
  const upper = Math.max(1, body.findIndex(([distance]) => distance >= normalized));
  const half = width * curveValue(body,upper,normalized,1);
  const high = curveValue(body,upper,normalized,2);
  const fromAxle = Math.abs(Math.abs(z) - length);
  const clearance = radius + .078;
  const arc = Math.sqrt(Math.max(0, clearance ** 2 - fromAxle ** 2));
  const arch = Math.max(-.249, radius - model.stance + arc);
  return [z, half, arch, Math.max(arch + .087, high), crown];
}

function wrapEnd(model, z, x, width) {
  const end = silhouettes[model.id].ends[z < 0 ? 0 : 1];
  const fade = THREE.MathUtils.smoothstep(Math.abs(z), model.depth - .77, model.depth);
  return z - Math.sign(z) * end * fade * (Math.abs(x) / width) ** 2;
}

export function bodySurfaceHeight(model, z) {
  if (model.id === 'formula') return .14;
  const [, , , shoulder, crown] = bodyDimensions(model,z);
  return shoulder + crown;
}

function bodySection([z, w, arch, high, crown], model) {
  const { belt } = silhouettes[model.id];
  const opening = model.type === 'roadster'
    ? THREE.MathUtils.smoothstep(z,-.60,-.34)*(1-THREE.MathUtils.smoothstep(z,.57,.91)) : 0;
  const bank = [
    [0,-.254], [w * .66,-.254], [w * .893,arch], [w * .968,arch + .023],
    [w, THREE.MathUtils.lerp(arch, high, .61)], [w * .989, high - .024],
    [w * belt, high], [w * .45, high + crown * .66 - opening*.081], [0, high + crown - opening*.135],
  ];
  return [...bank, ...bank.slice(1,-1).reverse().map(([x, y]) => [-x,y])]
    .map(([x, y]) => [x, y, wrapEnd(model, z, x, w)]);
}

function deckPoint(model, z, across, offset = .008) {
  const section = bodyDimensions(model,z);
  const outline = bodySection(section,model);
  const x = across * section[1];
  let y = outline[8][1];
  for (let index=8;index>5;index--) {
    const [left, low] = outline[index];
    const [right, high] = outline[index-1];
    if (Math.abs(x)>right) continue;
    y = THREE.MathUtils.lerp(low,high,THREE.MathUtils.inverseLerp(left,right,Math.abs(x)));
    break;
  }
  return [x,y+offset,wrapEnd(model,z,x,section[1])];
}

export function sidePoint(model, side, z, amount, gap = .008) {
  const section = bodyDimensions(model, z);
  const [, , arch, high] = section;
  const outline = bodySection(section, model);
  const y = THREE.MathUtils.lerp(arch + .024, high - .028, amount);
  for (let index = 4; index <= 5; index++) {
    const [x0,y0] = outline[index-1];
    const [x1,y1] = outline[index];
    if (y <= y1) return [side*(THREE.MathUtils.lerp(x0,x1,THREE.MathUtils.inverseLerp(y0,y1,y))+gap),y,z];
  }
  return [side*(outline[5][0]+gap),y,z];
}

function bodySkin(body, model, paint, carbon) {
  const { depth, length, radius, width } = model;
  const clearance = radius + .078;
  const stations = silhouettes[model.id].body.map(([z]) => z * depth);
  stations.push(-depth+.063, -depth+.17, depth-.16, depth-.063);
  for (const axle of [-length, length]) for (const t of [-1.07,-.85,-.55,0,.55,.85,1.07]) {
    stations.push(axle + t * clearance);
  }
  const sections = [...new Set(stations)].filter(z => Math.abs(z) <= depth).sort((a, b) => a - b);
  loftShell(body, paint, sections.map(z => bodyDimensions(model,z)), data => bodySection(data, model), 2);
  part(body, carbon, width * 1.56, .068, depth * 1.47, 0, -.246, 0, box);
}

function panelLines(body, model, build, { bucket, paint, trim, alloy }) {
  const [screen] = silhouettes[model.id].cabin;
  const front = -model.depth + .19, back = screen - .14;
  const corners = [[front+.09,-.56],[front+.022,-.36],[front,0],[front+.022,.36],[front+.09,.56]];
  trace(body,bucket,corners.map(([z,x])=>deckPoint(model,z,x,.004)),.006);
  for (const side of [-1,1]) {
    trace(body,bucket,[[front+.09,.56],[front+.28,.57],[(front+back)*.5,.58],[back,.62]]
      .map(([z,x])=>deckPoint(model,z,side*x,.004)),.006);
    if (build.hoodPins!=='off') {
      const [x,y,z] = deckPoint(model,front+.183,side*.44,.011);
      const diameter = build.hoodPins==='race' ? .091 : .070;
      part(body,bucket,diameter,.016,diameter,x,y,z,circle);
      part(body,alloy,diameter*.70,.018,diameter*.70,x,y+.012,z,circle);
      if (build.hoodPins==='race') {
        trace(body,alloy,[[x-.041,y+.025,z],[x,y+.045,z-.006],[x+.041,y+.025,z]],.007);
      }
    }
  }
  if (model.type==='prototype') {
    const tail = silhouettes[model.id].cabin[3];
    const base = bodySurfaceHeight(model,tail);
    loftShell(body,paint,[[tail-.17,.029,base-.017,base+.163],[tail+.28,.041,base-.018,base+.231],
      [model.depth-.22,.029,base-.035,base+.120]],
    ([,w,low,high])=>[[-w,low],[w,low],[w*.49,high],[-w*.49,high]],3);
  }
  if (model.type==='rally') {
    for (const side of [-1,1]) {
      const pos = side * (model.axle + .132);
      part(body,trim,.184,.191,.033,pos,-.202,model.length+.37,box).rotation.x = -.11;
    }
  }
}

function gridSurface(body, material, rows, columns, at, reverse = false) {
  const vertices = [], uv = [], triangles = [];
  for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
    const s = row / rows, t = column / columns;
    vertices.push(...at(s, t));
    uv.push(t, s);
    if (row === rows || column === columns) continue;
    const a = row * (columns + 1) + column;
    const b = a + 1, c = a + columns + 1, d = c + 1;
    if (reverse) triangles.push(a, b, c, c, b, d);
    else triangles.push(a, c, b, c, d, b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(triangles);
  geometry.computeVertexNormals();
  geometry.userData.vehicleOwned = true;
  body.add(new THREE.Mesh(geometry, material));
}

function greenhouse(body, model, build, { glass, paint, carbon, accent, trim, bucket }) {
  const { roof, width, id, type } = model;
  const { cabin, roof: roofScale, glass: glassWidth } = silhouettes[id];
  const [nose, approach, departure, tail] = cabin;
  const half = width * glassWidth;
  const [front, middle, back] = roofScale.map(value => value * half);
  const center = (approach + departure) * .5;
  const topRake = type === 'muscle' ? .113 : type === 'rally' ? .010 : .031;
  const bodyHeight = z => {
    const [, , , belt, crown] = bodyDimensions(model, z);
    return belt + crown * .53;
  };
  const rows = [
    [nose, half * .98, half * .87, bodyHeight(nose) + .059],
    [approach, half, front, roof],
    [center, half * .976, middle, roof + .024],
    [departure, half * .931, back, roof - topRake],
    [tail, half * .802, half * .666, bodyHeight(tail) + .034],
  ];
  function cabinAt(z) {
    const stop = THREE.MathUtils.clamp(z, nose, tail);
    const last = Math.max(1, rows.findIndex(row => row[0] >= stop));
    const a = rows[last - 1], b = rows[last];
    const t = THREE.MathUtils.inverseLerp(a[0], b[0], stop);
    const eased = t * .58 + THREE.MathUtils.smoothstep(t, 0, 1) * .42;
    const values = a.slice(1).map((value, i) => THREE.MathUtils.lerp(value, b[i+1], eased));
    return [values[0], values[1], bodyHeight(z) - .033, values[2]];
  }
  function onTop(z, across, raise = 0) {
    const [, r, bottom, top] = cabinAt(z);
    const arc = THREE.MathUtils.smoothstep(top - bottom, .04, .28) * .029;
    return [r * across, top + (1 - across * across) * arc + raise, z];
  }
  function onSide(side, z, height, offset = 0) {
    const [base, top, sill, high] = cabinAt(z);
    const bulge = Math.sin(height * Math.PI) * .022;
    return [side * (THREE.MathUtils.lerp(base, top, height) + bulge + offset), THREE.MathUtils.lerp(sill, high, height), z];
  }
  const cap = build.roof === 'black' ? bucket : build.roof === 'carbon' || build.roof === 'scoop' ? carbon : paint;
  for (const [from, to, material] of [[nose,approach,glass],[approach,departure,cap],[departure,tail,glass]]) {
    gridSurface(body, material, 12, 9, (s,t) => onTop(THREE.MathUtils.lerp(from,to,s), t*2-1));
  }
  const pillar = type === 'rally' ? center + .04 : center + (departure-center)*.22;
  const rearPillar = type === 'muscle' ? .43 : type === 'rally' ? .17 : .23;
  const bands = [
    [nose,nose+.136,paint],[nose+.136,pillar-.045,glass],[pillar-.045,pillar+.05,trim],
    [pillar+.05,tail-rearPillar,glass],[tail-rearPillar,tail,paint],
  ];
  for (const side of [-1,1]) {
    for (const [from, to, material] of bands) {
      gridSurface(body, material, Math.max(3, Math.ceil((to-from)*9)), 6,
        (s,t)=>onSide(side,THREE.MathUtils.lerp(from,to,s),t),side>0);
    }
    const seam = [nose+.078, approach-.11, approach, center, departure, tail-.068];
    trace(body,trim,seam.map(z=>onSide(side,z,1,.006)),.009);
    trace(body,trim,seam.map(z=>onSide(side,z,.077,.009)),.010);
    const footZ = nose+(approach-nose)*.23;
    trace(body,bucket,[onTop(footZ,side*.79,.015),onTop(footZ+.071,side*.55,.021),onTop(footZ+.134,side*.16,.016)],.012);
  }
  if (build.roof === 'scoop') {
    const inlet = Math.max(.47, departure - approach);
    const top = onTop(center,0)[1];
    part(body,carbon,.56,.119,inlet*.67,0,top+.056,center);
    part(body,bucket,.43,.060,.032,0,top+.047,center-inlet*.326,box);
    part(body,accent,.36,.016,.039,0,top+.115,center-.064);
  }
  const mirror = onSide(1, nose+.231, .32);
  return { x: mirror[0] - .006, y: mirror[1], z: mirror[2] };
}

function windshield(body, model, build, surfaces) {
  if (model.type !== 'roadster') return greenhouse(body, model, build, surfaces);
  const { glass, accent, trim, bucket } = surfaces;
  const half = model.width * silhouettes[model.id].glass;
  const z = silhouettes[model.id].cabin[0];
  const [, , , belt, crown] = bodyDimensions(model, z);
  const base = belt + crown * .41;
  function screen(across, height) {
    return [across * half * (1 - height * .077),
      base + height * (.319 - Math.abs(across) ** 2 * .063),
      z + height * .168 + across * across * .116];
  }
  gridSurface(body, glass, 6, 12, (height,s) => screen(s*2-1,height));
  const points = [-1,-.72,-.36,0,.36,.72,1];
  for (const height of [0,1]) trace(body,trim,points.map(x => screen(x,height)),.018);
  for (const side of [-1,1]) {
    trace(body,trim,[0,.36,.68,1].map(value => screen(side,value)),.014);
    part(body,bucket,.356,.134,.576,side*.28,base-.070,.28);
    const rest = part(body,bucket,.320,.317,.116,side*.28,base+.061,.49);
    rest.rotation.x = -.19;
    part(body,accent,.196,.121,.077,side*.28,base+.217,.53);
    part(body,trim,.274,.245,.091,side*.28,base+.188,.63,ring);
  }
  return { x: half * .93, y: base+.134, z: z+.198 };
}

export function fitMirrors(body, build, { x, y, z }, { carbon, bucket, trim, paint, accent, alloy }) {
  const shape = build.mirrors;
  const proportions = {
    stock: [.224,.083,.162], carbon: [.224,.083,.162], classic: [.193,.123,.178],
    aero: [.281,.061,.166], bullet: [.162,.101,.231], angular: [.253,.091,.193], camera: [.109,.055,.155],
  };
  const [width,height,depth] = proportions[shape];
  const finish = { body:paint, accent, carbon, alloy };
  const material = finish[build.mirrorFinish] ?? (shape==='classic'?alloy:shape==='stock'?trim:carbon);
  const pod = shape==='angular'||shape==='aero'?wedgePod:shape==='bullet'||shape==='classic'?bulletPod:undefined;
  for (const sign of [-1,1]) {
    const extension = shape==='camera'?.087:shape==='aero'?.149:.116;
    const mount = part(body,bucket,extension*1.43,.038,.089,sign*(x+extension*.37),y-.026,z-.017);
    mount.rotation.z=sign*.22;
    const cap = part(body,material,width,height,depth,sign*(x+extension),y+.013,z,pod);
    cap.rotation.y=sign*(shape==='angular'?.28:.12);
    const windowWidth = shape==='camera'?.046:width*.74;
    const windowHeight = shape==='camera'?.032:height*.69;
    const bezel = part(body,bucket,windowWidth+.014,windowHeight+.015,.025,cap.position.x,y+.013,z+depth*.408);
    bezel.rotation.y=cap.rotation.y;
    part(body,shape==='camera'?darkLens:mirrorGlass,windowWidth,windowHeight,.015,
      cap.position.x,y+.013,z+depth*.467).rotation.y=cap.rotation.y;
    if (shape!=='camera' && shape!=='classic') {
      part(body,amberMarker,width*.29,.016,.024,cap.position.x+sign*width*.255,y+.004,z-depth*.38,box);
    }
  }
}

function sideDetails(body, model, build, { trim, bucket, paint, alloy }) {
  const { cabin, doors } = silhouettes[model.id];
  const from = Math.max(-model.length + model.radius + .12, cabin[0]-.085);
  const to = Math.min(model.length - model.radius - .12, cabin[2]+.20);
  for (const sign of [-1,1]) {
    for (let door = 0; door < doors; door++) {
      const a = THREE.MathUtils.lerp(from,to,door/doors)+.015;
      const b = THREE.MathUtils.lerp(from,to,(door+1)/doors)-.018;
      const handle = part(body, trim, model.type === 'electric' ? .015 : .03, .039, .141,
        ...sidePoint(model,sign,b-.119,.78,.015));
      handle.rotation.y = sign*.079;
      const lower = [[a,.96],[a+.012,.51],[a+.042,.20],[a+.080,.13],
        [b-.079,.13],[b-.042,.20],[b-.012,.53],[b,.96]];
      trace(body,bucket,lower.map(([z,y])=>sidePoint(model,sign,z,y)),.007);
    }
    const stockDuct = ['gt','prototype','hyper','attack'].includes(model.type);
    if (build.sideIntake!=='smooth' && (build.sideIntake!=='stock'||stockDuct)) {
      const inlet = model.length - model.radius - .20;
      const opening = build.sideIntake==='duct'?.54:.43;
      gridSurface(body,bucket,7,3,(s,t)=>{
        const high = THREE.MathUtils.lerp(.42,.76,s);
        return sidePoint(model,sign,inlet-opening+s*opening,THREE.MathUtils.lerp(.25,high,t),.013);
      },sign > 0);
      const fins = build.sideIntake==='duct'?1:build.sideIntake==='gills'?4:3;
      for (let slat = 0; slat < fins; slat++) {
        const z = inlet - .05 - slat*.094;
        trace(body,trim,[sidePoint(model,sign,z,.31,.019),sidePoint(model,sign,z+.052,.55,.019)],.009);
      }
    }
    if (sign > 0) {
      const panelZ = model.length * .68;
      part(body, trim, .112,.014,.112,...sidePoint(model,1,panelZ,.87,.011),circle).rotation.z = Math.PI/2;
    }
    for (const axle of [-model.length, model.length]) {
      const rim = model.radius + .078;
      const hub = model.radius - model.stance;
      const points = Array.from({ length: 9 }, (_, i) => {
        const angle = i * Math.PI / 8;
        const z = axle + Math.cos(angle)*rim;
        const y = Math.max(-.247, hub + Math.sin(angle)*rim);
        return [sign*(bodyDimensions(model,z)[1]+.014), y, z];
      });
      trace(body,bucket,points.map(([x,y,z])=>[x-sign*.056,y-.018,z]),.017);
      if (build.fenders !== 'stock') {
        trace(body, build.fenders === 'gt' ? trim : paint, points, build.fenders === 'flared' ? .039 : .058);
        if (build.fenders === 'riveted') for (const [x,y,z] of points.slice(1,-1)) {
          part(body, alloy, .026,.024,.024,x+sign*.045,y+.010,z,box);
        }
      }
    }
  }
}

function fasciaPoint(model, end, across, y, inset) {
  const z = end * model.depth;
  const [, half] = bodyDimensions(model,z);
  return [across * half, y, wrapEnd(model,z,across * half,half) + end * inset];
}

function fasciaBand(body, material, model, end, from, to, yRange, offset = .017) {
  const left = Math.min(from,to), right = Math.max(from,to);
  gridSurface(body, material, 13, 2,(s,t)=>{
    const across = THREE.MathUtils.lerp(left,right,s);
    const [bottom,top] = yRange(across);
    return fasciaPoint(model,end,across,THREE.MathUtils.lerp(bottom,top,t),offset);
  },end<0);
}

function bumpers(body, model, build, { paint, bucket, carbon, trim }) {
  const { depth, width, type } = model;
  const [, , , peak] = bodyDimensions(model,-depth);
  const modern = ['gt','hyper','prototype','attack','electric'].includes(type);
  const front = build.frontBumper;
  const pattern = build.intakeMesh;
  const grille = trim===bucket ? darkLens : trim;
  const bars = pattern==='honeycomb'||pattern==='vertical'?0:pattern==='horizontal'||front==='mesh'?4:type==='muscle'?3:2;
  const center = front === 'track' ? .83 : type === 'electric' && front === 'stock' ? .42 : .64;
  const portTop = type === 'muscle' ? .167 : Math.min(peak-.035, .052);
  const lip = type === 'muscle' ? trim : paint;
  const split = front === 'split' || front === 'stock' && type === 'hyper';

  fasciaBand(body,lip,model,-1,-.96,.96,x=>[-.210+.025*x*x,-.143+.020*x*x],.043);
  fasciaBand(body,bucket,model,-1,-center,center,x=>[-.138+.041*Math.abs(x),portTop-.052*Math.abs(x)],.033);
  if (split) fasciaBand(body,paint,model,-1,-.063,.063,()=>[-.142,portTop+.021],.047);

  for (let i=0;i<bars;i++) {
    const y = THREE.MathUtils.lerp(-.109,portTop-.028,i/Math.max(1,bars-1));
    const bound = center*.91;
    if (split) {
      for (const sign of [-1,1]) fasciaBand(body,grille,model,-1,sign*.070,sign*bound,()=>[y,y+.012],.042);
    } else fasciaBand(body,grille,model,-1,-bound,bound,()=>[y,y+.012],.041);
  }
  if (pattern==='vertical' || (pattern==='stock' && front==='mesh')) for (let i=-6;i<=6;i++) {
    const across = i*center*.167;
    if (split && Math.abs(across)<.075) continue;
    const edge = portTop - .071 * Math.abs(across) / center;
    fasciaBand(body,grille,model,-1,across-.008,across+.008,()=>[-.105,edge],.044);
  }
  if (pattern==='honeycomb') {
    const rows = portTop<.03?2:3;
    const acrossStep = center*.178;
    for (let row=0;row<rows;row++) for (let i=-4;i<=4;i++) {
      const across = (i+(row%2)*.49)*acrossStep;
      if (split && Math.abs(across)<.090) continue;
      const y = -.103+(portTop+.075)*row/rows;
      const point = fasciaPoint(model,-1,across,y,.045);
      const cell = part(body,grille,width*.038,.029,1,...point,grilleCell);
      cell.rotation.y = Math.PI + across*.28;
    }
  }
  if (modern || front === 'track') for (const side of [-1,1]) {
    const lower = x => -.131 + .185 * Math.abs(Math.abs(x)-.83);
    fasciaBand(body,bucket,model,-1,side*.69,side*.918,x=>[lower(x),lower(x)+.08],.043);
    if (front==='track') {
      const [x,y,z] = fasciaPoint(model,-1,side*.94,-.171,.073);
      part(body,carbon,.181,.069,.194,x,y,z).rotation.z = side*.24;
    }
  }

  const rear = build.rearBumper;
  fasciaBand(body,lip,model,1,-.93,.93,x=>[-.137+.015*x*x,-.071+.017*x*x],.049);
  fasciaBand(body,carbon,model,1,-.87,.87,x=>[-.222+.029*x*x,-.114+.019*x*x],.038);
  const fins = rear === 'gt' ? 5 : rear === 'vertical' ? 7 : rear === 'road' ? 3 : 0;
  for (let i=0;i<fins;i++) {
    const across = (i-(fins-1)/2)*.211;
    const [x,y,z] = fasciaPoint(model,1,across,-.184,.017);
    part(body,rear==='road' ? trim : bucket,.034,rear==='vertical'?.203:.144,.29,x,y,z,box).rotation.x = -.117;
  }
}

function lenses(body, model, build, { lamp, brakeLamp, bucket, trim }) {
  const { depth, type }=model;
  const [, , , brow] = bodyDimensions(model,-depth);
  const [, , , tail] = bodyDimensions(model,depth);
  const frontLens = build.lightLens==='ice'?coldLens:build.lightLens==='smoke'?darkLens:clearLens;
  const rearHousing = build.lightLens==='ice'?coldLens:darkLens;
  const wideRear = type==='electric' && build.taillights==='stock' || build.taillights==='bar';
  const rearLight = build.taillights==='smoke' || build.lightLens==='smoke' ? smokeLens : brakeLamp;
  const tailY = tail - .069;
  if (wideRear) {
    fasciaBand(body,rearHousing,model,1,-.845,.845,()=>[tailY-.054,tailY+.032],.027);
    fasciaBand(body,rearLight,model,1,-.805,.805,()=>[tailY-.014,tailY+.013],.034);
  }
  for (const side of [-1,1]) {
    const round = build.headlights === 'halo' || build.headlights === 'stock' && ['muscle','roadster'].includes(type);
    if (round) {
      for (const across of type === 'roadster' && build.headlights === 'stock' ? [.761] : [.601,.815]) {
        const [x,y,z] = fasciaPoint(model,-1,side*across,brow-.063,.025);
        const angle = Math.PI/2;
        const housing = type === 'muscle' || type === 'roadster' ? .208 : .157;
        part(body,bucket,housing,.070,housing,x,y,z,circle).rotation.x=angle;
        part(body,build.headlights==='halo'?lamp:trim,housing*.78,housing*.78,.082,x,y,z-.046,ring);
        part(body,frontLens,housing*.71,.020,housing*.71,x,y,z-.052,circle).rotation.x=angle;
        part(body,lamp,housing*.49,.026,housing*.49,x,y,z-.066,circle).rotation.x=angle;
      }
    } else {
      const sweep = type === 'hyper' ? .199 : type === 'touring' || type === 'rally' ? .038 : .096;
      const shape = build.headlights;
      const arc = shape==='swept'||shape==='arrow';
      const tipY = x => Math.max(0,Math.abs(x)-.66)*(shape==='swept'?.26:shape==='arrow'?.16:0);
      const edgeY = x => brow - .125 + (Math.abs(x)-.47)*sweep + tipY(x);
      const outer = arc?.966:.918;
      const inner = shape==='arrow'?.427:.467;
      fasciaBand(body,darkLens,model,-1,side*inner,side*outer,x=>[edgeY(x),edgeY(x)+.106],.024);
      fasciaBand(body,frontLens,model,-1,side*(inner+.019),side*(outer-.018),x=>[edgeY(x)+.017,edgeY(x)+.091],.033);
      if (shape==='projector'||shape==='quad') {
        const acrossSet=shape==='quad'?[.538,.640,.752,.861]:[.64,.805];
        const diameter=shape==='quad'?.043:.062;
        for (const across of acrossSet) {
          const [x,y,z] = fasciaPoint(model,-1,side*across,edgeY(across)+.046,.044);
          part(body,lamp,diameter,.023,diameter,x,y,z,circle).rotation.x=Math.PI/2;
        }
      } else {
        const blade = shape==='blade'||shape==='stock'&&type==='hyper';
        const lightY = x => edgeY(x) + (shape==='arrow'?.039 + Math.abs(Math.abs(x)-.66)*.162:.067);
        fasciaBand(body,lamp,model,-1,side*(inner+.030),side*(outer-.032),
          x=>[lightY(x),lightY(x)+(blade?.013:.022)],.042);
        if (blade || shape==='arrow') fasciaBand(body,lamp,model,-1,side*.557,side*.876,x=>[edgeY(x)+.029,edgeY(x)+.041],.044);
      }
    }
    if (build.fogLights==='round'||build.fogLights==='stock'&&type==='rally') {
        const [x,y,z] = fasciaPoint(model,-1,side*.826,-.103,.054);
        part(body,bucket,.113,.054,.113,x,y,z+.014,circle).rotation.x=Math.PI/2;
        part(body,lamp,.086,.034,.086,x,y,z,circle).rotation.x=Math.PI/2;
    } else if (build.fogLights==='led') {
      fasciaBand(body,darkLens,model,-1,side*.696,side*.921,()=>[-.131,-.088],.051);
      fasciaBand(body,lamp,model,-1,side*.724,side*.896,()=>[-.112,-.099],.060);
    }

    if (wideRear) continue;
    const taper = x => tailY + .041 * (Math.abs(x) - .65);
    fasciaBand(body,rearHousing,model,1,side*.442,side*.912,x=>[taper(x)-.051,taper(x)+.044],.037);
    if (build.taillights==='ring') {
      for (const across of [.569,.787]) {
        const [x,y,z]=fasciaPoint(model,1,side*across,taper(across),.053);
        part(body,rearLight,.096,.096,.067,x,y,z,ring).rotation.y=-side*.15;
        part(body,brakeLamp,.028,.021,.026,x,y,z+.016,box);
      }
    } else if (build.taillights==='claw') {
      for (const across of [.573,.675,.789]) {
        fasciaBand(body,rearLight,model,1,side*across,side*(across+.047),x=>[taper(x)-.036,taper(x)+.033],.053);
      }
    } else if (build.taillights==='split') {
      for (const bar of [-.021,.023]) fasciaBand(body,rearLight,model,1,side*.472,side*.880,
        x=>[taper(x)+bar,taper(x)+bar+.014],.052);
    } else if (build.taillights==='pixel') {
      for (let i=0;i<5;i++) {
        const x = .474 + i*.082;
        fasciaBand(body,rearLight,model,1,side*x,side*(x+.059),at=>[taper(at)-.023,taper(at)+.024],.045);
      }
    } else {
      fasciaBand(body,rearLight,model,1,side*.467,side*.892,x=>[taper(x)-.030,taper(x)+.027],.044);
      fasciaBand(body,brakeLamp,model,1,side*.495,side*.878,x=>[taper(x)+.012,taper(x)+.027],.052);
    }
  }
}

export function coachwork(body, model, build, surfaces) {
  bodySkin(body,model,surfaces.paint,surfaces.carbon);
  panelLines(body,model,build,surfaces);
  const mirrors = windshield(body,model,build,surfaces);
  fitMirrors(body,build,mirrors,surfaces);
  sideDetails(body,model,build,surfaces);
  bumpers(body,model,build,surfaces);
  lenses(body,model,build,surfaces);
}

export function fitFormulaTail(body, model, build, { bucket, brakeLamp }) {
  if (build.taillights==='stock' && build.lightLens==='clear') return;
  const z=model.depth-.202;
  part(body,build.lightLens==='ice'?coldLens:bucket,.250,.107,.076,0,-.019,z);
  const lamp = build.taillights==='smoke'||build.lightLens==='smoke'?smokeLens:brakeLamp;
  if (build.taillights==='ring') {
    part(body,lamp,.089,.079,.048,0,-.014,z+.050,ring);
  } else if (build.taillights==='split') {
    for (const y of [-.036,.011]) part(body,lamp,.184,.017,.041,0,y,z+.041,box);
  } else {
    const cells=build.taillights==='pixel'||build.taillights==='claw';
    const width=cells?(build.taillights==='claw'?.031:.047):.184;
    for (const x of cells?[-.064,0,.064]:[0]) {
      part(body,lamp,width,.051,.049,x,-.013,z+.036,box);
    }
  }
}
