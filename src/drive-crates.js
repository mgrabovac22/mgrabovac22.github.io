const roadPositions = [7.9, 17.3, 26.7, 36.1];
const interval = 10;
const modulo = (value, base) => ((value % base) + base) % base;
export const crateServices = { linkedin: 'LinkedIn', github: 'GitHub' };
const serviceKinds = Object.keys(crateServices);

// Each block owns its west and north streets. Index slots by street and distance
// so the pattern stays fixed regardless of which blocks the camera loads first.
export function roadCrateSlots(column, row) {
  return ['z', 'x'].flatMap(axis => {
    const alongZ = axis === 'z';
    const street = alongZ ? column : row;
    const segment = alongZ ? row : column;
    return roadPositions.map((along, index) => {
      const slot = segment * roadPositions.length + index;
      const sequence = slot + street * 3 + (alongZ ? -1 : 5);
      const lane = modulo(slot + street, 2) ? 2.7 : -2.7;
      const serviceIndex = modulo(sequence / interval + street + Number(!alongZ), serviceKinds.length);
      const kind = modulo(sequence, interval) === 0 ? serviceKinds[serviceIndex] : null;
      return { id: `${axis}:${street}:${slot}`, x: alongZ ? lane : along, z: alongZ ? along : lane, kind };
    });
  });
}
