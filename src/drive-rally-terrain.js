import * as THREE from 'three';
import { Body, Heightfield, Vec3 } from 'cannon-es';

export const waterline = -.37;
export const castleIsland = { x: 0, z: 0, width: 48, length: 42 };
export const castleBridges = [
  { outer: { x: 84, z: 6 }, inner: { x: 43, z: 6 } },
  { outer: { x: -94, z: 6 }, inner: { x: -43, z: 6 } },
  { outer: { x: 8, z: -87 }, inner: { x: 8, z: -38 } },
  { outer: { x: 8, z: 86 }, inner: { x: 8, z: 38 } },
];

export function castleIslandDistance(x, z) {
  return Math.hypot(x / castleIsland.width, z / castleIsland.length);
}
export const rallyJumps = [
  { meters: 111, width: 10.9, height: 2.20, gap: 5.8 },
  { meters: 275, width: 8.6, height: 2.55, gap: 6.6 },
  { meters: 618, width: 8.1, height: 2.40, gap: 6.1 },
];
export const rallyBridges = [395, 747];
export const rallyStops = [
  { id: 'stones', meters: 186, lateral: -24 },
  { id: 'linkedin', meters: 340, lateral: -16.5 },
  { id: 'cv', meters: 517, lateral: -16.5 },
  { id: 'github', meters: 805, lateral: -16.5 },
];

const floor = -3.45;
const smooth = THREE.MathUtils.smoothstep;
const drySand = new THREE.Color(0xdfbd82);
const wetSand = new THREE.Color(0x988e67);
const grass = new THREE.Color(0x658354);
const rock = new THREE.Color(0x9c9c89);

export function buildRallyTerrain(parent, world, route) {
  const cuts = [...rallyJumps.map(({ meters, gap }) => [meters, gap * .75, 1]),
    ...rallyBridges.map(meters => [meters, 7.3, .70])]
    .map(([meters, width, depth], index) => ({ ...route.sample(meters), width, depth, index }));
  const step = 1.75;
  const xs = route.checkpoints.map(point => point.x);
  const zs = route.checkpoints.map(point => point.z);
  const west = Math.min(...xs) - 68;
  const north = Math.max(...zs) + 68;
  const cols = Math.ceil((Math.max(...xs) + 68 - west) / step) + 1;
  const rows = Math.ceil((north - Math.min(...zs) + 68) / step) + 1;
  const vertices = [], indices = [], uv = [], colors = [];
  const depthImage = new Uint8Array(cols * rows * 4);
  const tint = new THREE.Color();

  function elevation(x, z) {
    const { point, meters } = route.locate({ x, z });
    const lateral = (x - point.x) * point.nx + (z - point.z) * point.nz;
    const phase = meters / route.length * Math.PI;
    const outer = 24 + 4.2 * Math.sin(phase * 8) + 3.1 * Math.sin(phase * 14);
    const inner = -49 + 5 * Math.sin(phase * 6 + .8);
    let height = floor * smooth(Math.max(lateral - outer, inner - lateral), -4, 24);
    for (const { x: cx, z: cz, tx, tz, nx, nz, width, depth, index } of cuts) {
      const along = (x - cx) * tx + (z - cz) * tz;
      const across = (x - cx) * nx + (z - cz) * nz;
      if (Math.abs(along) > 24 || across < -64 || across > 49) continue;
      const bend = Math.sin(across * .10 + index) * Math.min(5, Math.abs(across) * .07);
      const bank = Math.abs(along - bend);
      const taper = smooth(across, -64, -49) * (1 - smooth(across, 38, 49));
      height = Math.min(height, floor * depth * taper * (1 - smooth(bank, width * .39, width + 6)));
    }
    const island = castleIslandDistance(x, z);
    const bay = Math.sin(x * .17 + z * .14) * .026 + Math.cos(x * .093 - z * .067) * .044;
    height = Math.max(height, floor * smooth(island + bay, .91, 1.17));
    return { height, lateral };
  }

  const samples = Array.from({ length: cols }, (_, i) => Array.from({ length: rows }, (_, j) => {
    const x = west + i * step, z = north - j * step;
    const { height, lateral } = elevation(x, z);
    vertices.push(x, height - .026, z);
    uv.push(x * .22, z * .22);
    const noise = Math.sin(x * 4.27 + z * 3.17) * Math.cos(z * 4.21);
    tint.copy(wetSand).lerp(drySand, smooth(height, -1.65, -.08));
    if (height > -.34) tint.lerp(grass, smooth(-lateral + noise * 2, 10, 23) * smooth(height, -.34, 0));
    if (noise > .38 && height < -.1 && height > -1.9) tint.lerp(rock, .22);
    tint.multiplyScalar(.96 + noise * .067);
    colors.push(tint.r, tint.g, tint.b);
    const pixel = (j * cols + i) * 4;
    depthImage.fill(Math.round(255 * (height - floor) / -floor), pixel, pixel + 3);
    depthImage[pixel + 3] = 255;
    return height;
  }));
  for (let i = 0; i < cols - 1; i++) for (let j = 0; j < rows - 1; j++) {
    const a = i * rows + j, b = a + rows;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .98 }));
  terrain.receiveShadow = true;
  parent.add(terrain);

  const field = new Heightfield(samples, { elementSize: step, minValue: floor, maxValue: 0 });
  const body = new Body({ mass: 0, shape: field, position: new Vec3(west, 0, north), material: world.defaultMaterial });
  body.quaternion.setFromAxisAngle(new Vec3(1, 0, 0), -Math.PI / 2);
  body.aabbNeedsUpdate = true;
  world.addBody(body);
  const depthMap = new THREE.DataTexture(depthImage, cols, rows);
  depthMap.minFilter = depthMap.magFilter = THREE.LinearFilter;
  depthMap.needsUpdate = true;
  return {
    depthMap, bounds: new THREE.Vector4(west, north, step * cols, step * rows),
    height(x, z) {
      const px = x - west, pz = north - z;
      if (px < 0 || pz < 0 || px >= (cols - 1) * step || pz >= (rows - 1) * step) return floor;
      return field.getHeightAt(px, pz, true);
    },
  };
}
