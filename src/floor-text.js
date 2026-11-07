import * as THREE from 'three';

const width = 15.7;
const depth = 9.1;
const accent = ['#314831', '#50382a', '#26443e', '#354627', '#47372a', '#24443d'];

function format(context, text, maxWidth) {
  const words = text.split(/\s+/);
  const result = [];
  let line = '';
  for (const word of words) {
    if (line && context.measureText(line + ' ' + word).width > maxWidth) {
      result.push(line);
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  }
  if (line) result.push(line);
  return result;
}

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
  ctx.fillText(String(page.index).padStart(2, '0') + ' / ' + String(page.total).padStart(2, '0'), 1221, 86);
  ctx.textAlign = 'left';
  ctx.strokeStyle = '#7a887a';
  ctx.beginPath();
  ctx.moveTo(60, 112);
  ctx.lineTo(465, 112);
  ctx.stroke();

  let rows = [];
  for (const ratio of [1, .93, .86, .80]) {
    let y = 151;
    rows = [];
    const add = (value, size, weight, color, gap, bullet = false) => {
      if (!value) return;
      const fontSize = Math.round(size * ratio);
      const font = weight + ' ' + fontSize + 'px Arial, sans-serif';
      ctx.font = font;
      const indent = bullet ? 33 : 0;
      for (const [index, line] of format(ctx, value, 1160 - indent).entries()) {
        rows.push({ value: line, x: 60 + indent, y, font, color, bullet: bullet && index === 0 });
        y += fontSize * 1.24;
      }
      y += gap;
    };
    add(page.title, 78, 800, '#24352b', 9);
    add([page.meta, page.date].filter(Boolean).join('  ·  '), 42, 700, tone, 15);
    add(page.body, 45, 400, '#27382d', 13);
    for (const point of page.points || []) add(point, 42, 400, '#27382d', 8, true);
    add(page.tags?.join('   ·   '), 40, 700, tone, 0);
    if (y <= 768) break;
  }
  ctx.textBaseline = 'top';
  for (const row of rows) {
    ctx.font = row.font;
    ctx.fillStyle = row.color;
    if (row.bullet) {
      ctx.fillStyle = tone;
      ctx.fillRect(60, row.y + 14, 11, 11);
      ctx.fillStyle = row.color;
    }
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
