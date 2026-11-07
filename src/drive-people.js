import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Body, Box, PointToPointConstraint, Vec3 } from 'cannon-es';

const surface = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .86 });
const unit = new THREE.SphereGeometry(1, 12, 9);
const styles = [
  [0x384a54, 0x262d33, 0xba9075, 0x352d29, 0xd7dce0],
  [0x887b68, 0x34414a, 0xa57a5d, 0x2b2423, 0xf2e9d6],
  [0x465952, 0x41454b, 0xdaa48a, 0x684b33, 0xe6e8e2],
  [0x343d4e, 0x2e3138, 0x815a42, 0x241f1e, 0xe0d7c2],
  [0x596370, 0x5a5147, 0xd0a38a, 0x47403c, 0xead2ac],
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

function ellipsoid(color, x, y, z, w, h, d) {
  return colored(unit.clone().scale(w, h, d).translate(x, y, z), color);
}

function garment(color, profile, depth) {
  const shape = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 12);
  return colored(shape.scale(1, 1, depth), color);
}

const models = styles.map(([coat, pants, skin, hair, shirt], style) => skeleton.map((_, bone) => {
  let pieces;
  if (bone === 0) {
    pieces = [
      garment(coat, [[0, -.06], [.145, -.06], [.165, .02], [.151, .18], [.181, .342], [.158, .419], [.075, .445], [0, .445]], .69),
      ellipsoid(shirt, 0, .316, .102, .062, .125, .027),
      ellipsoid(skin, 0, .468, 0, .054, .067, .053),
      ellipsoid(0x262c32, 0, .29, .127, .019, .084, .008),
    ];
    for (const side of [-1, 1]) {
      pieces.push(ellipsoid(coat, side * .064, .329, .113, .035, .10, .016));
      pieces.push(ellipsoid(shirt, side * .084, .303, .113, .008, .053, .012));
    }
  } else if (bone === 1) {
    pieces = [
      ellipsoid(skin, 0, .101, 0, .091, .122, .094),
      ellipsoid(skin, 0, .059, .028, .071, .072, .070),
      ellipsoid(hair, style === 1 ? -.018 : 0, .157, -.025, .097, .077, .092),
      ellipsoid(hair, -.054, .139, -.051, .048, style === 2 ? .111 : .066, .053),
      ellipsoid(skin, 0, .091, .091, .021, .029, .028),
      ellipsoid(0x754b42, 0, .048, .092, .027, .007, .008),
    ];
    for (const side of [-1, 1]) {
      pieces.push(ellipsoid(skin, side * .086, .095, -.003, .018, .032, .021));
      pieces.push(ellipsoid(0x352f30, side * .036, .117, .086, .016, .006, .006));
    }
  } else if (bone < 4) {
    pieces = [garment(coat, [[0, -.271], [.044, -.271], [.051, -.19], [.066, -.044], [.058, .018], [0, .025]], .93)];
  } else if (bone < 6) {
    pieces = [
      garment(coat, [[0, -.219], [.032, -.219], [.043, -.13], [.05, -.01], [0, .02]], .88),
      ellipsoid(shirt, 0, -.208, 0, .035, .023, .035),
      ellipsoid(skin, 0, -.255, .014, .034, .058, .034),
    ];
  } else if (bone < 8) {
    pieces = [garment(pants, [[0, -.43], [.051, -.426], [.068, -.25], [.087, -.047], [.072, .04], [0, .051]], 1.06)];
  } else {
    pieces = [
      garment(pants, [[0, -.373], [.041, -.371], [.058, -.224], [.064, -.041], [.05, .022], [0, .041]], 1.08),
      ellipsoid(0x24262a, 0, -.383, .048, .055, .043, .107),
      ellipsoid(0x586063, 0, -.413, .057, .052, .013, .103),
    ];
  }
  const combined = mergeGeometries(pieces);
  pieces.forEach(piece => piece.dispose());
  return combined;
}));

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

export function createWalker(parent, style, phase, direction, path = circuits[style % circuits.length]) {
  const view = new THREE.Group();
  const parts = [];
  skeleton.forEach(([joint, x, y, z], i) => {
    const part = new THREE.Mesh(models[style][i], surface);
    part.position.set(x, y, z);
    (joint < 0 ? view : parts[joint]).add(part);
    parts.push(part);
  });
  parent.add(view);
  const collider = new Body({ type: Body.KINEMATIC, shape: new Box(new Vec3(.245, .84, .21)),
    collisionFilterGroup: 8, collisionFilterMask: 4, collisionResponse: false });
  const pace = (.0105 + style * .00034) * circuits[style % circuits.length].getLength() / path.getLength();
  return { view, parts, collider, path, pace, phase, direction, style, knocked: false };
}

export function updateWalker(walker, time, originX, originZ, animated) {
  const { view, parts, path, pace, phase, direction, style, collider } = walker;
  const progress = (phase + time * pace * direction) % 1;
  const f = (progress + 1) % 1;
  const point = path.getPoint(f);
  const next = path.getPoint((f + .0008) % 1);
  const heading = Math.atan2((next.x - point.x) * direction, (next.y - point.y) * direction);
  const beat = animated ? time * (7.3 + style * .17) + phase * 53 : 0;
  const stride = animated ? Math.sin(beat) : 0;
  view.position.set(point.x, .075 + Math.abs(stride) * .028, point.y);
  view.rotation.y = heading;
  parts[0].rotation.z = stride * .035;
  parts[1].rotation.y = animated ? Math.sin(time * .65 + phase * 18) * .11 : 0;
  for (let side = 0; side < 2; side++) {
    const swing = stride * (side ? -1 : 1);
    parts[2 + side].rotation.x = swing * .34;
    parts[4 + side].rotation.x = -.11 - Math.max(swing, 0) * .32;
    parts[6 + side].rotation.x = -swing * .44;
    parts[8 + side].rotation.x = Math.max(swing, 0) * .65;
  }
  collider.position.set(originX + point.x, .93, originZ + point.y);
  collider.quaternion.setFromAxisAngle(new Vec3(0, 1, 0), heading);
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
