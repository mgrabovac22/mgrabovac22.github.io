import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Body, Box, PointToPointConstraint, Vec3 } from 'cannon-es';

const surface = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .86 });
const unit = new THREE.SphereGeometry(1, 14, 10);
export const outdoorStyle = 6;
const weave = new Uint8Array(32 * 32 * 4);
for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
  const shade = 142 + ((x + y) % 4 < 2 ? 24 : -24) + (y % 4 < 2 ? 11 : -11);
  weave.set([shade, shade, shade, 255], (y * 32 + x) * 4);
}
const fabric = new THREE.DataTexture(weave, 32, 32);
fabric.wrapS = fabric.wrapT = THREE.RepeatWrapping;
fabric.repeat.set(5, 6);
fabric.magFilter = THREE.LinearFilter;
fabric.minFilter = THREE.LinearMipmapLinearFilter;
fabric.generateMipmaps = true;
fabric.needsUpdate = true;
const jacketSurface = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: .87, bumpMap: fabric, bumpScale: .003,
});
const styles = [
  [0x384a54, 0x262d33, 0xba9075, 0x352d29, 0xd7dce0],
  [0x887b68, 0x34414a, 0xa57a5d, 0x2b2423, 0xf2e9d6],
  [0x465952, 0x41454b, 0xdaa48a, 0x684b33, 0xe6e8e2],
  [0x343d4e, 0x2e3138, 0x815a42, 0x241f1e, 0xe0d7c2],
  [0x596370, 0x5a5147, 0xd0a38a, 0x47403c, 0xead2ac],
  [0x344550, 0x2e333a, 0xc4937b, 0x2d2725, 0xb7c7bc],
  [0x4c756d, 0x8c7e62, 0xbe8c70, 0x302b25, 0xe6ce9d],
];
const skeleton = [
  [-1, 0, 1.025, 0, .35, .47, .219, .21],
  [0, 0, .494, 0, .187, .235, .198, .088],
  [0, -.202, .385, 0, .103, .286, .109, -.12],
  [0, .202, .385, 0, .103, .286, .109, -.12],
  [2, 0, -.257, 0, .083, .257, .092, -.11],
  [3, 0, -.257, 0, .083, .257, .092, -.11],
  [0, -.096, -.044, 0, .145, .416, .161, -.18],
  [0, .096, -.044, 0, .145, .416, .161, -.18],
  [6, 0, -.409, 0, .107, .416, .128, -.18],
  [7, 0, -.409, 0, .107, .416, .128, -.18],
];

function colored(geometry, color) {
  const c = new THREE.Color(color);
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) c.toArray(colors, i);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function tint(color, amount) {
  return new THREE.Color(color).multiplyScalar(amount);
}

function ellipsoid(color, x, y, z, w, h, d) {
  return colored(unit.clone().scale(w, h, d).translate(x, y, z), color);
}

function garment(color, profile, depth) {
  const shape = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 12);
  return colored(shape.scale(1, 1, depth), color);
}

function face(skin, detail) {
  const around = detail ? 30 : 18;
  const rings = [
    [0, .032, .029, .017], [.020, .047, .052, .030], [.047, .066, .068, .010],
    [.080, .078, .083, -.005], [.113, .086, .085, -.006], [.145, .085, .089, -.013],
    [.174, .079, .084, -.022], [.201, .062, .065, -.029], [.222, .027, .036, -.029], [.229, .001, .001, -.030],
  ];
  const vertices = [], indices = [], uvs = [];
  rings.forEach(([y, width, depth, mid], row) => {
    for (let j = 0; j <= around; j++) {
      const angle = j / around * Math.PI * 2 - Math.PI;
      const cosine = Math.cos(angle);
      // Broad cheekbones, flatter planes beside the nose, and a rounded cranium.
      const forward = cosine >= 0 ? cosine ** .70 : cosine;
      vertices.push(Math.sin(angle) * width, y, mid + forward * depth);
      uvs.push(j / around, y / .23);
      if (row && j) {
        const p = row * (around + 1) + j;
        indices.push(p - around - 2, p - around - 1, p, p - around - 2, p, p - 1);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  colored(geometry, skin);
  const colors = geometry.attributes.color;
  for (let i = 0; i < colors.count; i++) {
    const y = vertices[i * 3 + 1], z = vertices[i * 3 + 2];
    const light = .84 + y * .66 + Math.max(0, z) * .56;
    const warmth = y < .095 && z > .03 ? .035 : 0;
    colors.setXYZ(i, colors.getX(i) * light * (1 + warmth), colors.getY(i) * light, colors.getZ(i) * light * (1 - warmth));
  }
  return geometry;
}

function head(skin, hair, style, detail) {
  const hairline = style === 2 ? .171 : style === 1 ? .174 : .183;
  const pieces = [
    face(skin, detail),
    ellipsoid(hair, style % 2 ? -.006 : .009, hairline, -.032, .087, .056, .088),
    ellipsoid(tint(hair, .81), 0, .121, -.071, .074, style === 2 ? .094 : .061, .035),
    ellipsoid(tint(skin, 1.06), 0, .091, .079, .014, .027, .023),
    ellipsoid(tint(skin, .96), 0, .074, .095, .019, .010, .014),
    ellipsoid(tint(skin, .62), 0, .044, .064, .023, .004, .010),
    ellipsoid(tint(skin, 1.03), 0, .039, .065, .021, .004, .006),
  ];
  for (const side of [-1, 1]) {
    pieces.push(ellipsoid(skin, side * .082, .097, -.006, .016, .026, .020));
    pieces.push(ellipsoid(tint(skin, .72), side * .091, .098, .003, .008, .014, .009));
    pieces.push(ellipsoid(tint(hair, .91), side * .074, hairline - .015, -.008, .015, .032, .047));
    pieces.push(ellipsoid(tint(skin, .76), side * .036, .116, .072, .020, .008, .009));
    pieces.push(ellipsoid(0xdad3c5, side * .036, .115, .075, .013, .004, .008));
    pieces.push(ellipsoid(0x3b3734, side * .034, .115, .082, .0045, .0042, .0027));
    const brow = ellipsoid(tint(hair, 1.14), 0, 0, 0, .018, .0037, .0044)
      .rotateZ(side * -.16).translate(side * .036, .135, .074);
    pieces.push(brow);
    if (style === 3 || detail) pieces.push(ellipsoid(tint(skin, .71), side * .034, .035, .047, .017, .022, .016));
  }
  if (detail) {
    for (let i = -4; i <= 4; i++) {
      const height = .208 - Math.abs(i) * .0032;
      pieces.push(ellipsoid(tint(hair, 1 + (i + 4) * .022), 0, 0, 0, .012, .021, .085)
        .rotateY(-.33).translate(i * .015, height, -.018));
      if (i % 2 === 0) pieces.push(ellipsoid(tint(hair, .86), 0, 0, 0, .012, .040, .010)
        .rotateZ(i * .052).translate(i * .014, .146, -.100 + Math.abs(i) * .004));
    }
  }
  return pieces;
}

const models = new Map();
function model(style, detail = false) {
  const key = style * 2 + Number(detail);
  if (models.has(key)) return models.get(key);
  const [coat, pants, skin, hair, shirt] = styles[style];
  const outdoors = style === outdoorStyle;
  const piecesByBone = skeleton.map((_, bone) => {
    let pieces;
    if (bone === 0) {
      pieces = [
        garment(coat, [[0, -.084], [.13, -.084], [.156, -.044], [.16, .025], [.144, .126], [.157, .24], [.177, .337], [.165, .387], [.132, .418], [.071, .445], [0, .445]], .73),
        garment(tint(coat, .79), [[0, -.081], [.131, -.081], [.15, -.060], [.151, -.043], [.139, -.036], [0, -.036]], .74),
        ellipsoid(shirt, 0, .316, .102, .062, .125, .027),
        ellipsoid(skin, 0, .468, 0, .054, .067, .053),
        ellipsoid(0x262c32, 0, .29, .127, .019, .084, .008),
      ];
      for (const side of [-1, 1]) {
        pieces.push(ellipsoid(coat, side * .064, .329, .113, .035, .10, .016));
        pieces.push(ellipsoid(shirt, side * .084, .303, .113, .008, .053, .012));
        pieces.push(ellipsoid(tint(coat, 1.21), 0, 0, 0, .006, .099, .015)
          .rotateZ(side * -.24).translate(side * .097, .125, .099));
        if (detail) {
          pieces.push(ellipsoid(tint(coat, .82), side * .123, .278, -.090, .022, .121, .023));
          pieces.push(ellipsoid(tint(coat, 1.18), side * .094, .383, -.080, .054, .016, .021));
        }
      }
      if (detail) {
        pieces.push(ellipsoid(tint(pants, .90), 0, -.080, .004, .145, .072, .094));
        pieces.push(ellipsoid(tint(coat, .91), 0, .365, -.108, .109, .079, .058));
        pieces.push(ellipsoid(tint(coat, .70), 0, .377, -.158, .056, .028, .008));
        pieces.push(ellipsoid(tint(coat, 1.20), 0, .063, -.106, .051, .0045, .009));
        pieces.push(ellipsoid(tint(coat, .69), 0, .068, .114, .008, .101, .009));
        pieces.push(ellipsoid(0x8e9693, .006, .182, .125, .007, .018, .005));
      }
      if (outdoors) {
        pieces.push(ellipsoid(0x726447, 0, .234, -.158, .113, .173, .076));
        pieces.push(ellipsoid(0x9d865d, 0, .266, -.214, .101, .113, .041));
        pieces.push(ellipsoid(0x5f543d, 0, .128, -.203, .104, .056, .039));
        pieces.push(ellipsoid(0xa69067, 0, .078, -.199, .128, .026, .030));
        pieces.push(ellipsoid(0x423b2b, 0, .228, -.252, .069, .004, .004));
        pieces.push(ellipsoid(0xc5aa71, .031, .225, -.256, .009, .006, .003));
        for (const side of [-1, 1]) {
          pieces.push(ellipsoid(0x615940, 0, 0, 0, .014, .151, .012).rotateZ(side * -.16).translate(side * .103, .260, .103));
          pieces.push(ellipsoid(0xb79c62, side * .108, .204, .113, .016, .012, .007));
          pieces.push(ellipsoid(0x776949, side * .09, .123, -.226, .008, .024, .008));
        }
      }
    } else if (bone === 1) {
      pieces = head(skin, hair, style, detail);
      if (outdoors) {
        pieces.push(garment(0xb79762, [[0,.189],[.109,.181],[.132,.165],[.135,.158],
          [.104,.154],[.091,.182],[.079,.239],[.054,.253],[0,.26]], 1.12).translate(0, 0, -.014));
        pieces.push(garment(0x715e43, [[.094,.177],[.093,.189],[.091,.198],[.089,.200]], 1.13).translate(0, 0, -.015));
        pieces.push(ellipsoid(0xcdad72, .029, .246, -.036, .046, .009, .047));
      }
    } else if (bone < 4) {
      if (outdoors) {
        pieces = [
          garment(coat, [[0,-.156],[.052,-.163],[.061,-.141],[.071,-.073],[.062,.006],[.042,.029],[0,.034]], .95),
          garment(skin, [[0,-.285],[.035,-.281],[.046,-.234],[.048,-.174],[.043,-.121],[0,-.114]], 1.03),
          garment(tint(coat,.87), [[.050,-.162],[.055,-.158],[.057,-.149],[.055,-.144]], .95),
        ];
      } else pieces = [garment(coat, [[0, -.271], [.044, -.271], [.051, -.19], [.066, -.044], [.058, .018], [0, .025]], .93)];
      if (detail && !outdoors) {
        const side = bone === 2 ? -1 : 1;
        pieces.push(ellipsoid(tint(coat, .84), side * .047, -.150, -.004, .012, .076, .040));
        pieces.push(ellipsoid(0x8c9d8e, side * .062, -.064, .006, .008, .020, .024));
      }
    } else if (bone < 6) {
      pieces = [
        garment(coat, [[0, -.219], [.032, -.219], [.043, -.13], [.05, -.01], [0, .02]], .88),
        ellipsoid(shirt, 0, -.208, 0, .035, .023, .035),
        ellipsoid(skin, 0, -.255, .014, .034, .058, .034),
      ];
      if (detail) {
        pieces.push(ellipsoid(skin, bone === 5 ? -.021 : .021, -.248, .038, .016, .029, .021));
        pieces.push(ellipsoid(tint(coat, .73), 0, -.200, 0, .046, .025, .043));
      }
      if (outdoors) {
        const sign = bone === 4 ? -1 : 1;
        pieces.forEach(piece => piece.dispose());
        pieces = [garment(skin, [[0,-.231],[.029,-.231],[.035,-.182],[.043,-.091],[.045,-.032],
          [.038,.016],[0,.028]], .98),
          ellipsoid(skin, 0,-.249,.014,.033,.045,.027),
          ellipsoid(tint(skin,.94), -sign*.025,-.246,.031,.012,.026,.014),
        ];
        for (let finger = 0; finger < 4; finger++) {
          const spread = (finger - 1.5) * .012;
          pieces.push(ellipsoid(tint(skin, .97 + finger*.018), spread,-.282 - (finger%3)*.0025,.023,.007,.019,.009));
        }
        if (bone === 4) {
          pieces.push(garment(0x4b534b, [[.033,-.201],[.036,-.199],[.037,-.182],[.033,-.177]], .98));
          pieces.push(ellipsoid(0x273c3d,-.021,-.190,-.030,.019,.018,.008));
        }
      }
    } else if (bone < 8) {
      pieces = [garment(pants, [[0, -.43], [.051, -.426], [.068, -.25], [.087, -.047], [.072, .04], [0, .051]], 1.06)];
      if (detail) pieces.push(ellipsoid(tint(pants, 1.18), bone === 6 ? -.066 : .066, -.11, -.004, .011, .074, .059));
      if (outdoors) {
        const side = bone === 6 ? -1 : 1;
        pieces.push(ellipsoid(tint(pants,.83), side*.069,-.17,.024,.021,.082,.056));
        pieces.push(ellipsoid(tint(pants,1.12), side*.085,-.116,.022,.012,.019,.055));
      }
    } else {
      pieces = [
        garment(pants, [[0, -.373], [.041, -.371], [.058, -.224], [.064, -.041], [.05, .022], [0, .041]], 1.08),
        ellipsoid(0x252b2d, 0, -.358, .035, .059, .063, .110),
        ellipsoid(0x302f2c, 0, -.387, .088, .055, .030, .066),
        ellipsoid(0x60656a, 0, -.414, .061, .057, .013, .108),
      ];
      if (detail) for (let lace = 0; lace < 3; lace++) {
        pieces.push(ellipsoid(0x9b9380, 0, -.338 - lace * .012, .086 + lace * .013, .029, .004, .009));
      }
      if (outdoors) {
        pieces.push(ellipsoid(0x755c44,0,-.359,.032,.060,.060,.108));
        for (let notch = 0; notch < 4; notch++) {
          const z = notch * .042 - .006;
          pieces.push(ellipsoid(0x333b34,0,-.421,z,.055,.009,.013));
          pieces.push(ellipsoid(0xab9574, 0, -.327 - notch * .012, .073 + notch * .013, .029,.004,.007));
        }
      }
    }
    const combined = mergeGeometries(pieces);
    pieces.forEach(piece => piece.dispose());
    return combined;
  });
  models.set(key, piecesByBone);
  return piecesByBone;
}

// One continuous pavement circuit, including curved corners.
export function walkingLoop(left, top, right, bottom, radius) {
  const p = (x, z) => new THREE.Vector2(x, z);
  const path = new THREE.CurvePath();
  path.add(new THREE.LineCurve(p(left, bottom - radius), p(left, top + radius)));
  path.add(new THREE.QuadraticBezierCurve(p(left, top + radius), p(left, top), p(left + radius, top)));
  path.add(new THREE.LineCurve(p(left + radius, top), p(right - radius, top)));
  path.add(new THREE.QuadraticBezierCurve(p(right - radius, top), p(right, top), p(right, top + radius)));
  path.add(new THREE.LineCurve(p(right, top + radius), p(right, bottom - radius)));
  path.add(new THREE.QuadraticBezierCurve(p(right, bottom - radius), p(right, bottom), p(right - radius, bottom)));
  path.add(new THREE.LineCurve(p(right - radius, bottom), p(left + radius, bottom)));
  path.add(new THREE.QuadraticBezierCurve(p(left + radius, bottom), p(left, bottom), p(left, bottom - radius)));
  return path;
}
const circuits = [7.25, 7.88].map((inset, index) => walkingLoop(inset, inset, 44 - inset, 44 - inset, index ? 1.75 : 1.56));

export function createPerson(parent, style, detail = false) {
  const view = new THREE.Group();
  const parts = [];
  const shapes = model(style, detail);
  skeleton.forEach(([joint, x, y, z], i) => {
    const part = new THREE.Mesh(shapes[i], detail && i !== 1 ? jacketSurface : surface);
    part.castShadow = detail;
    const shoulder = style === outdoorStyle && (i === 2 || i === 3);
    part.position.set(shoulder ? x * .883 : x, shoulder ? y - .007 : y, z);
    (joint < 0 ? view : parts[joint]).add(part);
    parts.push(part);
  });
  parent.add(view);
  return { view, parts };
}

export function createWalker(parent, style, phase, direction, path = circuits[style % circuits.length]) {
  const { view, parts } = createPerson(parent, style);
  for (const part of parts) part.visible = false;
  const collider = new Body({ type: Body.KINEMATIC, shape: new Box(new Vec3(.245, .84, .21)),
    collisionFilterGroup: 8, collisionFilterMask: 4, collisionResponse: false });
  const pace = (.0105 + style * .00034) * circuits[style % circuits.length].getLength() / path.getLength();
  return { view, parts, collider, path, pace, phase, direction, style, knocked: false };
}

export function createCrowd(scene) {
  const capacity = 64;
  const batches = new Map();

  return {
    begin() {
      for (const batch of batches.values()) batch.count = 0;
    },
    add(walker) {
      if (!batches.has(walker.style)) {
        const meshes = walker.parts.map(({ geometry }) => {
          const mesh = new THREE.InstancedMesh(geometry, surface, capacity);
          mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          mesh.frustumCulled = false;
          scene.add(mesh);
          return mesh;
        });
        batches.set(walker.style, { meshes, count: 0 });
      }
      const { meshes, count } = batches.get(walker.style);
      if (count >= capacity) return;
      walker.view.updateWorldMatrix(true, true);
      for (let i = 0; i < meshes.length; i++) meshes[i].setMatrixAt(count, walker.parts[i].matrixWorld);
      batches.get(walker.style).count++;
    },
    end() {
      for (const { meshes, count } of batches.values()) for (const mesh of meshes) {
        mesh.count = count;
        if (count) {
          mesh.instanceMatrix.clearUpdateRanges();
          mesh.instanceMatrix.addUpdateRange(0, count * 16);
          mesh.instanceMatrix.needsUpdate = true;
        }
      }
    },
  };
}

const personUp = new Vec3(0, 1, 0);
const pointOnPath = new THREE.Vector2();
const aheadOnPath = new THREE.Vector2();

export function updateWalker(walker, time, originX, originZ, animated, startled = false) {
  const { view, parts, path, pace, phase, direction, style, collider } = walker;
  const activity = walker.activity;
  if (activity) {
    const gesture = animated ? Math.sin(time * 2.7 + phase * 14) : 0;
    const seated = activity.type === 'sit';
    const performing = activity.type === 'perform';
    view.position.set(activity.x, seated ? -.34 : .081 + (performing ? Math.abs(gesture) * .10 : 0), activity.z);
    view.rotation.y = activity.yaw;
    parts[0].rotation.x = seated ? .16 : -.055 * gesture;
    parts[1].rotation.y = activity.type === 'browse' ? gesture * .47 : gesture * .22;
    parts[1].rotation.x = startled ? -.21 : gesture * .11;
    for (const side of [0, 1]) {
      parts[2 + side].rotation.x = seated ? -.72 : performing ? -.78 + gesture * (side ? -.77 : .77) : -.12 + gesture * (side ? .44 : .20);
      parts[2 + side].rotation.z = (startled ? .74 : performing ? .30 : 0) * (side ? 1 : -1);
      parts[4 + side].rotation.x = -.48 - gesture * .22;
      parts[6 + side].rotation.x = seated ? -1.57 : 0;
      parts[8 + side].rotation.x = seated ? 1.58 : 0;
    }
    collider.position.set(originX + activity.x, seated ? .69 : .93, originZ + activity.z);
    collider.quaternion.setFromAxisAngle(personUp, activity.yaw);
    collider.aabbNeedsUpdate = true;
    return;
  }
  const progress = (phase + time * pace * direction) % 1;
  const f = (progress + 1) % 1;
  const point = path.getPoint(f, pointOnPath);
  const next = path.getPoint((f + .0008) % 1, aheadOnPath);
  const heading = Math.atan2((next.x - point.x) * direction, (next.y - point.y) * direction);
  const beat = animated ? time * (7.3 + style * .17) * (walker.jogging ? 1.28 : 1) + phase * 53 : 0;
  const stride = animated ? Math.sin(beat) : 0;
  walker.caution = THREE.MathUtils.lerp(walker.caution ?? 0, startled ? .59 : 0, .10);
  const px = point.x + Math.cos(heading) * walker.caution;
  const pz = point.y - Math.sin(heading) * walker.caution;
  view.position.set(px, .075 + Math.abs(stride) * .028, pz);
  view.rotation.y = heading;
  parts[0].rotation.z = stride * .035;
  parts[1].rotation.y = animated ? Math.sin(time * .65 + phase * 18) * .11 + walker.caution : 0;
  for (let side = 0; side < 2; side++) {
    const swing = stride * (side ? -1 : 1);
    parts[2 + side].rotation.x = swing * .34;
    parts[4 + side].rotation.x = -.11 - Math.max(swing, 0) * .32;
    parts[6 + side].rotation.x = -swing * .44;
    parts[8 + side].rotation.x = Math.max(swing, 0) * .65;
  }
  collider.position.set(originX + px, .93, originZ + pz);
  collider.quaternion.setFromAxisAngle(personUp, heading);
  collider.aabbNeedsUpdate = true;
}

export function ragdoll(scene, world, walker, impact, now) {
  const group = new THREE.Group();
  scene.add(group);
  walker.view.updateWorldMatrix(true, true);
  const limbs = walker.parts.map((part, index) => {
    const [, , , , w, h, d, center] = skeleton[index];
    const object = new THREE.Mesh(part.geometry, surface);
    group.add(object);
    const body = new Body({ mass: index === 0 ? 7 : 1.6, linearDamping: .27, angularDamping: .34,
      collisionFilterGroup: 2, collisionFilterMask: 1 });
    body.addShape(new Box(new Vec3(w / 2, h / 2, d / 2)), new Vec3(0, center, 0));
    body.position.copy(part.getWorldPosition(new THREE.Vector3()));
    body.quaternion.copy(part.getWorldQuaternion(new THREE.Quaternion()));
    body.velocity.set(impact.x, 1.35 + index * .045, impact.z);
    body.angularVelocity.set(.85, index * .13, .91 - index * .11);
    body.aabbNeedsUpdate = true;
    world.addBody(body);
    return { object, body };
  });
  const joints = skeleton.slice(1).map(([parent, x, y, z], index) => {
    const joint = new PointToPointConstraint(limbs[parent].body, new Vec3(x, y, z), limbs[index + 1].body, new Vec3(), 830);
    joint.collideConnected = false;
    world.addConstraint(joint);
    return joint;
  });
  return { group, limbs, joints, expires: now + 6, walker };
}
