import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const metal = (color, metalness, roughness) => new THREE.MeshStandardMaterial({ color, metalness, roughness });

function loft(sections, surface, crossSection, roofPaint) {
  const curves = crossSection(sections[0]).map((_, column) => new THREE.CatmullRomCurve3(sections.map(section => {
    const [x, y] = crossSection(section)[column];
    return new THREE.Vector3(x, y, section[0]);
  })));
  const points = curves.map(curve => curve.getPoints((sections.length - 1) * 5));
  const positions = [];
  const indices = [];
  const painted = [];
  const width = curves.length;
  for (let row = 0; row < points[0].length; row++) {
    for (const column of points) positions.push(...column[row]);
    if (row === 0) continue;
    for (let i = 0; i < width; i++) {
      const a = (row - 1) * width + i;
      const b = (row - 1) * width + (i + 1) % width;
      const target = roofPaint && row >= 16 && row <= 27 && i >= 3 && i <= 6 ? painted : indices;
      target.push(a, b, b + width, a, b + width, a + width);
    }
  }
  const last = positions.length / 3 - width;
  for (let i = 1; i < width - 1; i++) indices.push(0, i + 1, i, last, last + i, last + i + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex([...indices, ...painted]);
  if (roofPaint) {
    geometry.addGroup(0, indices.length, 0);
    geometry.addGroup(indices.length, painted.length, 1);
  }
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, roofPaint ? [surface, roofPaint] : surface);
}

function line(parent, points, radius, surface) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, points.length * 4, radius, 6, false), surface);
  parent.add(mesh);
}

export function createBodywork() {
  const paint = new THREE.MeshPhysicalMaterial({
    color: 0x828d97, metalness: .68, roughness: .26, clearcoat: 1, clearcoatRoughness: .19,
  });
  const trim = metal(0x19202a, .42, .34);
  const satin = metal(0xb8bdbe, .78, .24);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x23333e, metalness: .55, roughness: .19, clearcoat: .8, clearcoatRoughness: .15,
  });
  const tail = new THREE.MeshBasicMaterial({ color: 0xf6324d });
  const running = new THREE.MeshBasicMaterial({ color: 0xc4f5ff });
  const body = new THREE.Group();
  function part(surface, w, h, d, x, y, z, round = .045) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, round), surface);
    mesh.position.set(x, y, z);
    body.add(mesh);
    return mesh;
  }
  // Track widths and belt lines narrow around the doors and flare above both axles.
  const sections = [
    [-2.30, .63, .76, -.22, -.10, -.04], [-2.22, .80, .92, -.27, -.03, .01],
    [-1.96, .90, 1.00, -.31, .11, .095], [-1.61, .96, 1.035, -.31, .24, .16],
    [-1.27, .97, 1.034, -.31, .27, .19], [-.91, .93, .998, -.32, .21, .22],
    [-.61, .87, .925, -.33, .19, .225], [-.18, .86, .914, -.34, .17, .24],
    [.27, .87, .967, -.34, .19, .245], [.70, .94, 1.035, -.33, .25, .25],
    [1.10, .97, 1.068, -.32, .32, .26], [1.45, 1.004, 1.077, -.31, .33, .275],
    [1.83, .97, 1.060, -.29, .29, .257], [2.10, .89, .998, -.26, .255, .23],
    [2.22, .84, .95, -.19, .17, .185],
  ];
  body.add(loft(sections, paint, ([z, lower, width, floor, shoulder, hood]) => {
    const arc = Math.max(...[-1.36, 1.35].map(axle => {
      const distance = Math.abs(z - axle) / .59;
      return distance < 1 ? -.34 + .49 * Math.sqrt(1 - distance ** 2) : -.34;
    }));
    const edge = [
      [lower * .66, floor], [lower * .91, Math.max(floor, arc - .035)],
      [lower, Math.max(floor + .085, arc)], [width, Math.max(arc + .02, shoulder - .12)],
      [width * .97, shoulder - .018], [width * .83, shoulder], [width * .60, hood],
    ];
    return [...edge, [0, hood + .022], ...edge.toReversed().map(([x, y]) => [-x, y])];
  }));
  const cockpit = [
    [-1.06, .57, .18, .22], [-.80, .70, .21, .32], [-.53, .67, .20, .55],
    [-.24, .626, .21, .716], [.08, .616, .21, .758], [.45, .633, .225, .746],
    [.72, .67, .24, .64], [1.05, .74, .24, .46], [1.50, .80, .25, .32], [1.74, .78, .25, .268],
  ];
  const roofLine = ([, width, floor, top]) => [
    [width * .96, floor], [width, floor + .03], [width * .94, (floor + top) * .50],
    [width * .80, top - .04], [width * .52, top], [0, top + .018],
  ];
  const roofSection = section => {
    const edge = roofLine(section);
    return [...edge, ...edge.slice(0, -1).reverse().map(([x, y]) => [-x, y])];
  };
  body.add(loft(cockpit, glass, roofSection, paint));
  part(trim, 1.76, .079, .24, 0, -.265, -2.19);
  part(trim, 1.81, .131, .32, 0, -.243, 2.062);
  part(trim, .44, .135, .033, 0, -.053, 2.223, .015);
  part(satin, .246, .072, .02, 0, -.05, 2.246, .009);
  for (const s of [-1, 1]) {
    const side = points => points.map(([x, y, z]) => [s * x, y, z]);
    line(body, side([[.46, .093, 2.221], [.55, .129, 2.224], [.78, .148, 2.226], [.925, .169, 2.153], [1.011, .20, 1.98]]), .047, trim);
    line(body, side([[.47, .096, 2.25], [.56, .123, 2.255], [.77, .147, 2.253], [.915, .164, 2.184], [1.0, .195, 2.018]]), .021, tail);
    line(body, side([[.49, .041, 2.245], [.61, .062, 2.246], [.83, .082, 2.228]]), .013, tail);
    line(body, side([[.39, .012, -2.275], [.66, .035, -2.22], [.86, .113, -2.09], [.97, .166, -1.92]]), .022, running);
    line(body, side([[.83, -.244, -.86], [.90, -.254, -.30], [.927, -.248, .22], [.985, -.213, .73]]), .041, trim);
    line(body, side([[.864, .04, -.66], [.917, .052, -.29], [.929, .085, .11], [.994, .137, .56], [1.019, .165, .76]]), .010, trim);
    line(body, side([[.668, .245, -.80], [.588, .491, -.52], [.511, .691, -.25], [.519, .736, .25], [.557, .654, .67], [.739, .317, 1.40]]), .022, trim);
    part(trim, .037, .17, .53, s * .987, -.003, .53, .017).rotation.y = s * .13;
    part(paint, .24, .096, .26, s * .91, .305, -.51, .042).rotation.y = s * .19;
    part(trim, .127, .062, .021, s * .951, .306, -.374, .008);
    part(trim, .083, .13, .13, s * .73, .245, 1.91, .018);
    for (let fin = 0; fin < 4; fin++) {
      part(trim, .039, .088, .29, s * (.24 + .104 * fin), -.278, 2.11, .013);
    }
    for (let pipe = 0; pipe < 2; pipe++) {
      const x = s * (.60 + pipe * .17);
      const outlet = new THREE.Mesh(new THREE.CylinderGeometry(.055, .065, .25, 14, 1, true), satin);
      outlet.rotation.x = Math.PI / 2;
      outlet.position.set(x, -.184, 2.10);
      body.add(outlet);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(.062, .011, 8, 20), satin);
      rim.position.set(x, -.184, 2.226);
      body.add(rim);
    }
  }
  line(body, [[-.86, .333, 1.92], [-.58, .349, 2.01], [0, .355, 2.055], [.58, .349, 2.01], [.86, .333, 1.92]], .039, paint);
  for (let i = 0; i < 5; i++) part(trim, .47, .012, .039, 0, .493 - i * .031, .98 + i * .108, .005).rotation.x = .31;
  return { body, tail };
}
