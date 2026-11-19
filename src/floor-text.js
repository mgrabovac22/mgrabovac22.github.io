import * as THREE from 'three';

const width = 15.7;
const depth = 9.1;
const accent = ['#314831', '#50382a', '#26443e', '#354627', '#47372a', '#24443d'];

function panelTexture(page) {
  const canvas = document.createElement('canvas');
  const density = matchMedia('(max-width: 760px)').matches ? .60 : .8;
  canvas.width = Math.ceil(1280 * density);
  canvas.height = Math.ceil(815 * density);
  const ctx = canvas.getContext('2d');
  ctx.scale(density, density);
  const tone = accent[page.chapter];
  ctx.fillStyle = tone;
  ctx.fillRect(60, 38, 100, 6);
  ctx.font = '700 29px monospace';
  ctx.fillText(String(page.chapter + 1).padStart(2, '0') + '  /  ' + page.chapterTitle.toLocaleUpperCase(), 60, 86);
  ctx.textAlign = 'right';
  const number = page.panelNumber ?? page.index;
  const total = page.panelCount ?? page.total;
  ctx.fillText(String(number).padStart(2, '0') + ' / ' + String(total).padStart(2, '0'), 1221, 86);
  ctx.textAlign = 'left';
  ctx.strokeStyle = '#7a887a';
  ctx.beginPath();
  ctx.moveTo(60, 112);
  ctx.lineTo(465, 112);
  ctx.stroke();

  const colors = { title: '#24352b', body: '#27382d', accent: tone };
  ctx.textBaseline = 'top';
  for (const row of page.floorRows ?? []) {
    ctx.font = row.font;
    if (row.bullet) {
      ctx.fillStyle = tone;
      ctx.fillRect(60, row.y + 14, 11, 11);
    }
    ctx.fillStyle = colors[row.role];
    ctx.fillText(row.value, row.x, row.y);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = density < .8 ? 3 : 6;
  return texture;
}

export function floorText(room, page) {
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({ map: panelTexture(page), toneMapped: false, transparent: true, depthWrite: false, alphaTest: .025 }));
  panel.position.set(0, .033, 0);
  panel.rotation.x = -Math.PI / 2;
  panel.renderOrder = 1;
  room.add(panel);
  return panel;
}
