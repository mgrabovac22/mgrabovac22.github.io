import * as THREE from 'three';
import { createWalker } from './drive-people.js';

const matte = color => new THREE.MeshStandardMaterial({ color, roughness: .74 });
const masonry = matte(0x9fa18b);
const dark = matte(0x34464a);
const oak = matte(0xb59770);
const hedge = matte(0x58785c);
const blue = matte(0x457679);
const peach = matte(0xb78b73);
const glow = new THREE.MeshBasicMaterial({ color: 0xffd792 });
const glass = new THREE.MeshStandardMaterial({ color: 0x88b4bd, opacity: .28, transparent: true, roughness: .28, depthWrite: false });
const round = new THREE.CylinderGeometry(.5, .5, 1, 12);
const leaves = new THREE.SphereGeometry(.5, 9, 6);
const plane = new THREE.PlaneGeometry();

function signage(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 86;
  const ink = canvas.getContext('2d');
  ink.fillStyle = '#192d32';
  ink.fillRect(0, 0, 384, 86);
  ink.strokeStyle = color;
  ink.lineWidth = 5;
  ink.strokeRect(7, 7, 370, 72);
  ink.fillStyle = color;
  ink.textAlign = 'center';
  ink.font = '750 41px system-ui';
  ink.fillText(text, 192, 56, 333);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map, toneMapped: false });
}

export function createVenues() {
  const signs = [signage('AFTER HOURS CAFÉ', '#ffcf98'), signage('BLOCK SUPPLY', '#9ce6db'), signage('WATER CANNON', '#aaf3e7')];

  function build(parent, add, x, z, cafe, crowded) {
    const awning = cafe ? peach : blue;
    add(masonry, x, .105, z, 9.8, .046, 9.8);
    add(dark, x, 3.11, z, 9.0, .23, 5.3);
    add(awning, x, 2.89, z + 2.40, 9.0, .35, .46);
    add(glow, x, 2.71, z + 2.61, 8.9, .032, .032);
    add(signs[cafe ? 0 : 1], x, 3.14, z + 2.69, 4.40, .87, 1, 0, plane);
    add(signs[cafe ? 0 : 1], x - 4.53, 3.14, z, 4.08, .79, 1, -Math.PI / 2, plane);
    for (const side of [-1, 1]) {
      for (const face of [-1, 1]) add(dark, x + side * 4.31, 1.56, z + face * 2.30, .16, 3.0, .16);
      add(glass, x + side * 4.30, 1.31, z - 1.12, .045, 2.47, 2.38);
      add(dark, x + side * 4.3, .46, z - 1.1, .10, .63, 2.39);
      add(glow, x + side * 2.78, 2.93, z - 1.30, 2.31, .043, .083);
      add(oak, x + side * 2.61, .71, z - 1.77, 2.3, 1.22, .54);
      for (let item = 0; item < 5; item++) {
        add(item % 2 ? awning : masonry, x + side * 2.61 + (item - 2) * .34, 1.44, z - 1.77, .23, .23 + item * .024, .21);
      }
    }

    for (const side of [-1, 1]) {
      const tx = x + side * 3.05, tz = z + 3.78;
      add(dark, tx, .50, tz, .12, .79, .12, 0, round);
      add(oak, tx, .91, tz, 1.35, .095, 1.35, 0, round);
      add(masonry, tx + .17, 1.03, tz, .13, .15, .13, 0, round);
      for (const direction of [-1, 1]) {
        const cx = tx + direction * .91;
        add(awning, cx, .56, tz, .43, .14, .46);
        add(dark, cx + direction * .18, .76, tz, .09, .51, .46);
        for (const leg of [-.15, .15]) add(dark, cx, .33, tz + leg, .27, .45, .045);
      }
      add(masonry, x + side * 3.9, .23, z - 3.65, 1.11, .29, .9);
      add(hedge, x + side * 3.9, .57, z - 3.65, 1.02, .64, .68, 0, leaves);
    }

    const actors = crowded ? [
      [x + 2.14, z + 3.78, Math.PI / 2, cafe ? 'sit' : 'browse'],
      [x - 2, z + .51, .90, 'talk'],
      [x - 1.15, z + 1.10, -2.20, cafe ? 'talk' : 'perform'],
    ] : [[x + 2.3, z + 3.78, 1.35, cafe ? 'sit' : 'browse']];
    return actors.map(([cx, cz, yaw, activity], i) => {
      const walker = createWalker(parent, (i + (cafe ? 1 : 2)) % 5, .29 + i * .28, 1);
      walker.activity = { x: cx, z: cz, yaw, type: activity };
      walker.view.scale.setScalar(1 + (i - 1) * .055);
      return walker;
    });
  }

  function markTank(add, x, z) {
    for (const side of [-1, 1]) {
      add(glow, x, .115, z + side * 1.58, 5.0, .018, .062);
      add(blue, x + 2.4, 1.42, z + side * 1.38, .084, 2.64, .084);
    }
    add(signs[2], x + 2.42, 2.51, z, 2.62, .56, 1, -Math.PI / 2, plane);
  }

  return { build, markTank };
}
