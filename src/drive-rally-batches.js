import * as THREE from 'three';
import { Body, Quaternion, Vec3 } from 'cannon-es';

// Keep animated pivots and picking surfaces as independent objects.
export function batchIslandDetails(parent, moving) {
  const groups = new Map();
  parent.updateWorldMatrix(true, true);
  const local = parent.matrixWorld.clone().invert();
  function visit(object) {
    if (moving.has(object)) return;
    if (object.isMesh && !object.isInstancedMesh && object.visible && !object.material.transparent) {
      const key = [object.geometry.id, object.material.id, Number(object.receiveShadow), Number(object.castShadow)].join(':');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(object);
    }
    for (const children of object.children) visit(children);
  }
  visit(parent);
  for (const parts of groups.values()) {
    if (parts.length < 2) continue;
    const sample = parts[0];
    const batch = new THREE.InstancedMesh(sample.geometry, sample.material, parts.length);
    batch.receiveShadow = sample.receiveShadow;
    batch.castShadow = sample.castShadow;
    const matrix = new THREE.Matrix4();
    for (const [index, part] of parts.entries()) {
      batch.setMatrixAt(index, matrix.multiplyMatrices(local, part.matrixWorld));
      part.removeFromParent();
    }
    batch.computeBoundingSphere();
    parent.add(batch);
  }
}

// Smaller spatial compounds keep the castle's collision shapes and smooth stair ramps.
export function packKeepColliders(world, bodies) {
  const cells = new Map();
  const offset = new Vec3(), orientation = new Quaternion();
  for (const body of bodies) {
    const { x, y, z } = body.position;
    const key = [Math.floor(x / 8), Math.floor(y / 4.45), Math.floor(z / 8)].join(':');
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(body);
  }
  for (const cell of cells.values()) {
    if (cell.length === 1) continue;
    const merged = new Body({ mass: 0, material: world.defaultMaterial, position: cell[0].position });
    for (const body of cell) {
      world.removeBody(body);
      for (const [index, shape] of body.shapes.entries()) {
        body.quaternion.vmult(body.shapeOffsets[index], offset);
        offset.vadd(body.position, offset);
        offset.vsub(merged.position, offset);
        body.quaternion.mult(body.shapeOrientations[index], orientation);
        merged.addShape(shape, offset, orientation);
      }
    }
    world.addBody(merged);
  }
}
