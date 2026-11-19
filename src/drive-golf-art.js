import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { batchVehicleParts, loftShell, vehicleBeam as beam, vehicleLicense as license,
  vehicleMolding as molding, vehiclePaint as paint, vehiclePiece as piece } from './drive-vehicle-art.js';

const block = new RoundedBoxGeometry(1,1,1,1,.09);
const box = new THREE.BoxGeometry();
const cylinder = new THREE.CylinderGeometry(.5,.5,1,24);
const ring = new THREE.TorusGeometry(.5,.027,6,24);
const optics = new THREE.SphereGeometry(.5,12,8);
const rubber = new THREE.MeshStandardMaterial({ color: 0x232628, roughness: .77 });
const grille = new THREE.MeshStandardMaterial({ color: 0x161a1d, roughness: .55, metalness: .09 });
const silver = new THREE.MeshStandardMaterial({ color: 0xadb0af, metalness: .68, roughness: .28 });
const clear = new THREE.MeshPhysicalMaterial({ color: 0xdce3df, metalness: .34, roughness: .23, clearcoat: .7 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0x293b43, metalness: .39, roughness: .14,
  clearcoat: 1, side: THREE.DoubleSide });
const amber = new THREE.MeshStandardMaterial({ color: 0xbd6819, emissive: 0xfb801b, emissiveIntensity: .21, roughness: .28 });
const tail = new THREE.MeshStandardMaterial({ color: 0x8d1829, emissive: 0xd22229, emissiveIntensity: .37, roughness: .25 });
const brightRed = new THREE.MeshStandardMaterial({ color: 0xcf2333, roughness: .37 });

function panel(parent, material, points) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(),3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
  geometry.setIndex([0,1,2,0,2,3]);
  geometry.computeVertexNormals();
  geometry.userData.vehicleOwned = true;
  parent.add(new THREE.Mesh(geometry,material));
}

function glassPanel(body, points) {
  panel(body,glass,points);
  molding(body,rubber,[...points,points[0]],.013);
}

function hatchCabin(body, color) {
  const roof = [[-.513,.646,.681],[-.383,.672,.726],[.192,.662,.722],[.965,.649,.719],[1.272,.604,.655]];
  loftShell(body,color,roof,([,w,y]) => [
    [0,y-.060],[w*.94,y-.061],[w,y-.038],[w*.98,y-.012],[w*.84,y],
    [0,y+.007],[-w*.84,y],[-w*.98,y-.012],[-w,y-.038],[-w*.94,y-.061],
  ]);
  // Glazed faces sit inside painted A, B and C pillars.
  glassPanel(body,[[-.653,.270,-1.008],[.653,.270,-1.008],[.617,.655,-.483],[-.617,.655,-.483]]);
  glassPanel(body,[[-.657,.325,1.818],[.657,.325,1.818],[.580,.648,1.244],[-.580,.648,1.244]]);
  for (const side of [-1,1]) {
    const x=(width)=>side*width;
    glassPanel(body,[[x(.749),.220,-.923],[x(.746),.265,.285],[x(.641),.649,.279],[x(.642),.650,-.395]]);
    glassPanel(body,[[x(.744),.263,.364],[x(.736),.269,1.096],[x(.628),.613,.953],[x(.639),.649,.363]]);
    molding(body,color,[[x(.698),.246,-.983],[x(.688),.360,-.822],[x(.662),.543,-.589],[x(.642),.662,-.439]],.041);
    beam(body,color,[x(.740),.234,.321],[x(.641),.667,.322],.081);
    molding(body,color,[[x(.639),.660,.925],[x(.687),.536,1.149],[x(.713),.374,1.454],[x(.714),.252,1.785]],.041);
    molding(body,color,[[x(.589),.650,1.236],[x(.625),.520,1.472],[x(.665),.319,1.828]],.036);
    const quarter=[[x(.641),.657,.961],[x(.584),.650,1.244],[x(.672),.321,1.819],[x(.745),.245,1.097]];
    panel(body,color,side>0 ? quarter : quarter.reverse());
    beam(body,rubber,[x(.662),.605,.818],[x(.744),.275,.941],.017);
    molding(body,rubber,[[x(.626),.698,-.418],[x(.634),.728,.040],[x(.628),.724,.830],[x(.584),.665,1.258]],.010);
    molding(body,rubber,[[x(.12),.272,-.982],[x(.31),.305,-.939],[x(.47),.328,-.907]],.012);
    piece(body,rubber,.065,.074,.139,x(.755),.283,-.664,block);
    piece(body,rubber,.146,.085,.123,x(.817),.305,-.670,block).rotation.y=side*.148;
    piece(body,glass,.124,.068,.018,x(.821),.305,-.595,block).rotation.y=side*.148;
  }
  piece(body,rubber,1.208,.048,.141,0,.652,1.265,block).rotation.x=.21;
  beam(body,rubber,[0,.713,.798],[.021,.891,1.001],.012);
  beam(body,rubber,[.049,.347,1.792],[-.341,.428,1.654],.015);
}

function roadHeadlight(body, x, y, z, diameter) {
  piece(body,silver,diameter*1.07,.041,diameter*1.07,x,y,z,cylinder).rotation.x=Math.PI/2;
  piece(body,clear,diameter,.026,diameter,x,y,z-.021,cylinder).rotation.x=Math.PI/2;
  piece(body,clear,diameter*.70,diameter*.67,.033,x,y,z-.030,optics);
  for (let slot=-3;slot<=3;slot++) {
    const offset=slot*diameter*.106;
    const length=2*Math.sqrt((diameter*.45)**2-offset**2);
    beam(body,silver,[x+offset,y-length/2,z-.034],[x+offset,y+length/2,z-.034],.0048);
  }
}

function badge(body, x, y, z, facing) {
  piece(body,silver,.094,.094,.014,x,y,z,ring);
  const at=([a,b])=>[x+a,y+b,z+facing*.004];
  for (const line of [
    [[-.026,.026],[0,.001],[.026,.026]],
    [[-.031,.003],[-.015,-.030],[0,-.009],[.015,-.030],[.031,.003]],
  ]) for (let i=1;i<line.length;i++) beam(body,silver,at(line[i-1]),at(line[i]),.007);
}

export function buildGolfBody(body, p) {
  const color = paint(p.color);
  const brakeLights = tail.clone();
  const curve = [
    [-2.0,.747,.207,.254],[-1.82,.803,.221,.282],[-1.46,.828,.233,.299],[-1.07,.824,.249,.311],
    [-.64,.815,.245,.282],[.37,.819,.248,.282],[.83,.827,.258,.287],[1.33,.833,.269,.300],
    [1.73,.804,.256,.286],[1.96,.771,.216,.243],[2.00,.752,.206,.227],
  ];
  function sill(z) {
    const distance = (Math.abs(z)-p.length)/.407;
    return -.467+.566*Math.sqrt(Math.max(0,1-distance*distance));
  }
  function shoulder(z) {
    const index = Math.max(1,curve.findIndex(point=>point[0]>=z));
    const [a,b] = [curve[index-1],curve[index]];
    const blend=(z-a[0])/(b[0]-a[0]);
    return a.slice(1).map((value,i)=>THREE.MathUtils.lerp(value,b[i+1],blend));
  }
  const stations = [...new Set([...curve.map(([z])=>z),...[-p.length,p.length].flatMap(axle =>
    [-.42,-.38,-.31,-.20,0,.20,.31,.38,.42].map(offset=>axle+offset))])].sort((a,b)=>a-b);
  loftShell(body,color,stations.map(z=>[z,...shoulder(z)]),([z,w,edge,top])=>{
    const bottom=sill(z);
    return [[0,-.395],[w*.72,-.419],[w*.945,bottom],[w,edge-.090],[w*.986,edge-.021],
      [w*.843,edge],[0,top],[-w*.843,edge],[-w*.986,edge-.021],[-w,edge-.090],[-w*.945,bottom],[-w*.72,-.419]];
  },3);
  hatchCabin(body,color);

  const front=-p.depth, rear=p.depth;
  piece(body,grille,1.490,.233,.073,0,.102,front-.004,block);
  piece(body,brightRed,1.451,.018,.041,0,.209,front-.041,box);
  piece(body,brightRed,1.449,.013,.039,0,-.007,front-.042,box);
  for (let row=0;row<5;row++) piece(body,rubber,1.414,.013,.031,0,.018+row*.039,front-.043,box);
  piece(body,rubber,1.544,.165,.198,0,-.119,front+.013,block);
  piece(body,color,1.500,.128,.175,0,-.243,front+.024,block);
  piece(body,grille,.838,.078,.028,0,-.244,front-.071,block);
  piece(body,rubber,1.50,.039,.156,0,-.324,front+.031,block);
  piece(body,grille,1.574,.156,.195,0,-.145,rear-.025,block);
  piece(body,color,1.490,.093,.127,0,-.237,rear-.031,block);
  piece(body,rubber,1.514,.039,.131,0,-.293,rear-.026,block);
  piece(body,grille,.490,.118,.032,0,-.048,rear+.037,block);
  license(body,'WOB GT 2',.405,.102,-.048,rear+.055);
  license(body,'WOB GT 2',.399,.104,-.113,front-.096,0,Math.PI);
  badge(body,0,.123,front-.066,-1);
  badge(body,0,.160,rear+.041,1);
  for (const side of [-1,1]) {
    roadHeadlight(body,side*.598,.104,front-.035,.219);
    roadHeadlight(body,side*.363,.111,front-.037,.156);
    piece(body,amber,.180,.049,.029,side*.545,-.104,front-.091,block);
    piece(body,clear,.134,.052,.028,side*.574,-.239,front-.062,block);
    piece(body,grille,.322,.168,.052,side*.605,.079,rear+.015,block);
    piece(body,brakeLights,.285,.073,.028,side*.605,.048,rear+.052,block);
    piece(body,amber,.181,.050,.021,side*.658,.125,rear+.051,block);
    piece(body,clear,.088,.050,.024,side*.525,.124,rear+.050,block);
    const x=side*.824;
    molding(body,rubber,[[x*.968,-.167,-.84],[x,-.163,-.40],[x,-.164,.23],[x*1.006,-.166,.85]],.021);
    for (const z of [-.956,.327,1.082]) {
      molding(body,grille,[[x*.926,.226,z],[x*.995,-.037,z+.019],[x*.969,-.370,z+.031]],.007);
    }
    for (const z of [.18,.885]) {
      piece(body,rubber,.024,.037,.131,x,.115,z,block);
      piece(body,silver,.029,.016,.103,x*1.02,.120,z-.009,block);
    }
    for (const axle of [-p.length,p.length]) {
      const arch=[];
      for (let i=0;i<=16;i++) {
        const z=axle+Math.cos(i/16*Math.PI)*.405;
        arch.push([side*(shoulder(z)[0]*.947+.014),sill(z)+.012,z]);
      }
      molding(body,rubber,arch,.032);
    }
    piece(body,rubber,.087,.056,1.57,side*.747,-.399,0,block);
    molding(body,grille,[[side*.695,.244,rear+.038],[side*.704,.290,1.882],[side*.663,.326,1.820]],.011);
  }
  piece(body,grille,.021,.121,.126,.812,.032,1.532,block);
  piece(body,silver,.18,.022,.019,-.479,.193,rear+.044,block);
  beam(body,silver,[-.48,-.329,1.57],[-.49,-.328,2.018],.074,true);
  beam(body,grille,[-.49,-.328,1.969],[-.49,-.328,2.013],.051,true);
  batchVehicleParts(body);
  return { brakeLights };
}
