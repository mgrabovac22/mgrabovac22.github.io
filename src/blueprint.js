import { stageLoop } from './scene.js';

export function mountBlueprint(canvas, motion) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const shell = canvas.parentElement;
  let width = 0;
  let height = 0;
  let cursorX = -1;
  let cursorY = -1;
  let lastDraw = -1;
  const columns = 32;
  const rows = 21;
  const vertices = Array.from({ length: (columns + 1) * (rows + 1) }, () => ({ x: 0, y: 0 }));
  const corners = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const diagrams = [[.08, .29, 37], [.92, .21, 55], [.87, .76, 52], [.16, .79, 51], [.56, .15, 32], [.46, .88, 25]];

  shell.addEventListener('pointermove', event => {
    if (motion.matches || event.pointerType !== 'mouse') return;
    const bounds = shell.getBoundingClientRect();
    cursorX = event.clientX - bounds.left;
    cursorY = event.clientY - bounds.top;
  });
  shell.addEventListener('pointerleave', () => { cursorX = cursorY = -1; });

  stageLoop(canvas, time => {
    if (!width || (motion.matches ? lastDraw >= 0 : time - lastDraw < .030)) return;
    lastDraw = time;
    const t = motion.matches ? 0 : time;
    const active = cursorX >= 0 && !motion.matches;
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#687b7333';
    ctx.beginPath();
    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        const point = vertices[row * (columns + 1) + column];
        const x = column / columns * width;
        const y = row / rows * height;
        const dx = x - cursorX;
        const dy = y - cursorY;
        const influence = active ? Math.exp(-(dx * dx + dy * dy) / 19500) : 0;
        point.x = x + Math.sin(row * .36 + t * .63) * 10 + dx * influence * .34;
        point.y = y + Math.sin(column * .41 - t * .78) * 8 + dy * influence * .34;
        if (column) {
          const left = vertices[row * (columns + 1) + column - 1];
          ctx.moveTo(left.x, left.y);
          ctx.lineTo(point.x, point.y);
        }
        if (row) {
          const above = vertices[(row - 1) * (columns + 1) + column];
          ctx.moveTo(above.x, above.y);
          ctx.lineTo(point.x, point.y);
        }
      }
    }
    ctx.stroke();

    diagrams.forEach(([x, y, radius], index) => {
      const px = x * width;
      const py = y * height;
      const pull = active ? Math.exp(-Math.hypot(px - cursorX, py - cursorY) / 170) : 0;
      const turn = t * (.27 + index * .033) + index * .83 + pull * 1.2;
      const tilt = turn * .68 + .4;
      const scale = Math.min(1.6, width / 800) * radius;
      const shape = corners.map(([a, b, c]) => {
        const horizontal = a * Math.cos(turn) - c * Math.sin(turn);
        const depth = a * Math.sin(turn) + c * Math.cos(turn);
        const vertical = b * Math.cos(tilt) - depth * Math.sin(tilt);
        const perspective = 1 + (depth * Math.cos(tilt) + b * Math.sin(tilt)) * .18;
        return [px + horizontal * scale * perspective, py + vertical * scale * perspective + Math.sin(t * .67 + index) * 10];
      });
      ctx.strokeStyle = pull > .32 ? '#4a766b' : '#5d736d76';
      ctx.beginPath();
      for (const [start, end] of edges) {
        ctx.moveTo(...shape[start]);
        ctx.lineTo(...shape[end]);
      }
      ctx.stroke();
      ctx.fillStyle = '#52716691';
      ctx.fillRect(px - 2, py - 2, 4, 4);
      if (width > 650) {
        ctx.font = '10px monospace';
        ctx.fillText(String(index + 1).padStart(2, '0') + ' / ' + (index % 2 ? 'Z' : 'XY'), px + scale + 13, py - 7);
      }
    });

    const scan = ((t * .065) % 1) * width;
    ctx.strokeStyle = '#53817044';
    ctx.beginPath();
    ctx.moveTo(scan, 0);
    ctx.lineTo(scan + width * .18, height);
    ctx.stroke();
    for (let i = 0; i < 18; i++) {
      const v = vertices[(Math.floor(t * (2 + i % 3)) + i * 37) % vertices.length];
      ctx.fillStyle = i % 3 ? '#628374b8' : '#a17f4fc7';
      ctx.fillRect(v.x - 1, v.y - 1, i % 3 ? 3 : 4, i % 3 ? 3 : 4);
    }
    if (active) {
      ctx.strokeStyle = '#446f6394';
      ctx.beginPath();
      ctx.arc(cursorX, cursorY, 19, 0, Math.PI * 2);
      ctx.moveTo(cursorX - 30, cursorY);
      ctx.lineTo(cursorX - 23, cursorY);
      ctx.moveTo(cursorX + 23, cursorY);
      ctx.lineTo(cursorX + 30, cursorY);
      ctx.stroke();
    }
  }, (w, h) => {
    width = w;
    height = h;
    const dpr = Math.min(devicePixelRatio, 1.5);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastDraw = -1;
  });
  motion.addEventListener('change', () => { lastDraw = -1; });
}
