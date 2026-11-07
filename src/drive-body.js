import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const metal = (color, metalness, roughness) => new THREE.MeshStandardMaterial({ color, metalness, roughness });

function loft(sections, surface, crossSection, roofPaint) {
  const curves = crossSection(sections[0]).map((_, column) => new THREE.CatmullRomCurve3(sections.map(section => {
    const [x, y] = crossSection(section)[column];
    return new THREE.Vector3(x, y, section[0]);
  })));
  const steps = (sections.length - 1) * 8;
  const points = curves.map(curve => curve.getPoints(steps));
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
      const roof = roofPaint && row / steps >= .35 && row / steps <= .60 && i >= 3 && i <= 6;
      const target = roof ? painted : indices;
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
    color: 0x586977, metalness: .70, roughness: .25, clearcoat: 1, clearcoatRoughness: .15,
  });
  const trim = metal(0x19202a, .42, .34);
  const carbon = metal(0x131b20, .25, .47);
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
    [-2.30, .59, .74, -.238, -.15, -.057], [-2.22, .76, .89, -.272, -.045, .015],
    [-1.96, .90, 1.00, -.31, .145, .082], [-1.61, .96, 1.035, -.31, .274, .144],
    [-1.27, .97, 1.034, -.31, .27, .19], [-.91, .93, .998, -.32, .21, .22],
    [-.61, .87, .925, -.33, .19, .225], [-.18, .86, .914, -.34, .17, .24],
    [.27, .87, .967, -.34, .19, .245], [.70, .94, 1.035, -.33, .25, .25],
    [1.10, .98, 1.078, -.32, .343, .248], [1.45, 1.008, 1.088, -.31, .364, .266],
    [1.83, .98, 1.067, -.29, .318, .254], [2.10, .90, 1.009, -.26, .276, .224],
    [2.24, .855, .957, -.22, .204, .182],
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
    [-1.14, .55, .17, .224], [-.85, .679, .20, .315], [-.53, .658, .20, .542],
    [-.24, .615, .21, .688], [.08, .606, .21, .739], [.45, .617, .225, .727],
    [.72, .65, .24, .624], [1.05, .73, .24, .454], [1.50, .79, .25, .313], [1.74, .78, .25, .268],
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
  part(carbon, 1.72, .081, .33, 0, -.265, -2.176);
  part(carbon, 1.81, .147, .37, 0, -.25, 2.09);
  part(trim, .45, .133, .048, 0, -.053, 2.247, .017);
  part(satin, .261, .073, .019, 0, -.052, 2.272, .008);
  part(carbon, .45, .102, .032, 0, -.168, -2.298, .02);
  for (const s of [-1, 1]) {
    const side = points => points.map(([x, y, z]) => [s * x, y, z]);
    part(carbon, .67, .169, .047, s * .589, .043, 2.244, .05).rotation.y = s * .082;
    line(body, side([[.37, .099, 2.271], [.56, .109, 2.275], [.77, .126, 2.264], [.931, .174, 2.183], [1.019, .223, 2.001]]), .019, tail);
    line(body, side([[.40, .047, 2.266], [.62, .065, 2.269], [.81, .088, 2.235]]), .011, tail);
    line(body, side([[.36, -.007, -2.277], [.66, .028, -2.222], [.87, .13, -2.079], [.973, .207, -1.91]]), .033, carbon);
    line(body, side([[.36, -.004, -2.293], [.66, .034, -2.237], [.871, .14, -2.094], [.98, .214, -1.923]]), .014, running);
    part(carbon, .45, .142, .091, s * .523, -.162, -2.241, .04).rotation.y = -s * .19;
    line(body, side([[.83, -.244, -.86], [.90, -.254, -.30], [.927, -.248, .22], [.985, -.213, .73]]), .041, trim);
    line(body, side([[.864, .04, -.66], [.917, .052, -.29], [.929, .085, .11], [.994, .137, .56], [1.019, .165, .76]]), .010, trim);
    line(body, side([[.668, .245, -.80], [.588, .491, -.52], [.511, .691, -.25], [.519, .736, .25], [.557, .654, .67], [.739, .317, 1.40]]), .022, trim);
    part(carbon, .045, .182, .58, s * .991, -.008, .54, .022).rotation.y = s * .16;
    line(body, side([[.923, -.106, .18], [.979, -.116, .47], [1.021, -.073, .75]]), .018, satin);
    part(paint, .24, .096, .26, s * .91, .305, -.51, .042).rotation.y = s * .19;
    part(trim, .127, .062, .021, s * .951, .306, -.374, .008);
    part(trim, .083, .13, .13, s * .73, .245, 1.91, .018);
    for (let fin = 0; fin < 4; fin++) {
      part(trim, .036, .096, .37, s * (.15 + .095 * fin), -.302, 2.114, .012);
    }
    for (let pipe = 0; pipe < 2; pipe++) {
      const x = s * (.60 + pipe * .17);
      const outlet = new THREE.Mesh(new THREE.CylinderGeometry(.059, .066, .25, 24, 1, true), carbon);
      outlet.rotation.x = Math.PI / 2;
      outlet.position.set(x, -.184, 2.10);
      body.add(outlet);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(.063, .009, 10, 24), satin);
      rim.position.set(x, -.184, 2.27);
      body.add(rim);
    }
  }
  line(body, [[-.89, .327, 1.83], [-.58, .35, 1.94], [0, .351, 2.01], [.58, .35, 1.94], [.89, .327, 1.83]], .033, paint);
  for (let i = 0; i < 6; i++) part(carbon, .60 - i * .023, .015, .034, 0, .488 - i * .028, .93 + i * .108, .005).rotation.x = .32;
  return { body, tail };
}
