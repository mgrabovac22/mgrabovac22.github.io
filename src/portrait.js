const NS = 'http://www.w3.org/2000/svg';

function svgNode(name, attributes = {}) {
  const element = document.createElementNS(NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function makePen() {
  const pen = svgNode('g', { 'data-pen': '', stroke: 'none' });
  pen.append(
    svgNode('path', { d: 'M0 0-4-13h8z', fill: '#a7afa2' }),
    svgNode('path', { d: 'M0 0-1.8-5h3.6z', fill: '#222a24' }),
    svgNode('rect', { x: -4, y: -83, width: 8, height: 70, rx: 1.8, fill: '#303b32' }),
    svgNode('path', { d: 'M-1.9-79v62m5-54v-10', fill: 'none', stroke: '#91a58e', 'stroke-width': '.8' }),
    svgNode('path', { d: 'M-2.2-83v-5h4.4v5', fill: '#a6b49e' }),
  );
  return pen;
}

export function mountPortrait(host, motion, intro, onComplete) {
  const fallback = host.querySelector('img');
  const svg = host.querySelector('template').content.querySelector('svg').cloneNode(true);
  const paths = [...svg.querySelectorAll('path[data-ink]')];
  if (!paths.length) return false;
  svg.classList.add('portrait-ink');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', fallback.alt);
  const drawing = svgNode('g', { class: 'portrait-lines' });
  drawing.append(...paths);
  svg.append(drawing);

  const pen = makePen();
  const mask = svgNode('mask', { id: 'portrait-trace', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 230, height: 230 });
  const filter = svgNode('filter', { id: 'portrait-ink-edge', x: '-20%', y: '-20%', width: '140%', height: '140%' });
  filter.append(svgNode('feGaussianBlur', { stdDeviation: 5 }));
  const brushLayer = svgNode('g', { fill: 'none', stroke: '#fff', 'stroke-width': 39, 'stroke-linecap': 'round', filter: 'url(#portrait-ink-edge)' });
  const wash = svgNode('rect', { width: 230, height: 230, fill: '#fff', opacity: 0 });
  const brushes = paths.map(path => {
    const brush = svgNode('path', { d: path.getAttribute('d') });
    brushLayer.append(brush);
    return brush;
  });
  mask.append(brushLayer, wash);
  const defs = svgNode('defs');
  defs.append(filter, mask);
  const photo = svgNode('image', { class: 'portrait-photo', href: fallback.src, x: 2, y: 2, width: 226, height: 226, mask: 'url(#portrait-trace)' });
  svg.prepend(defs, photo);
  svg.append(pen);
  fallback.replaceWith(svg);
  let total = 0;
  const strokes = paths.map((path, index) => {
    const length = path.getTotalLength();
    const stroke = { path, brush: brushes[index], start: total, length };
    total += length;
    return stroke;
  });
  const box = svg.viewBox.baseVal;
  const restX = box.x + box.width * .86;
  const restY = box.y + box.height * .94;
  const pose = (x, y, angle) => pen.setAttribute('transform', `translate(${x} ${y}) rotate(${angle}) scale(${box.width / 230})`);
  function finish() {
    drawing.setAttribute('opacity', '0');
    photo.removeAttribute('mask');
    pose(restX, restY, 27);
    intro.drawingDone = true;
    onComplete();
  }
  if (intro.skipped || motion.matches) {
    finish();
    return true;
  }

  strokes.forEach(({ path, brush, length }) => {
    for (const line of [path, brush]) {
      line.setAttribute('stroke-dasharray', `${length} ${length}`);
      line.setAttribute('stroke-dashoffset', length);
    }
  });
  pose(restX, restY, 27);
  let elapsed = 0;
  let previous = 0;
  let frame = 0;
  let visible = true;
  function schedule() {
    if (!document.hidden && visible && !intro.drawingDone && !frame) frame = requestAnimationFrame(draw);
  }
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; schedule(); });
  observer.observe(host);
  document.addEventListener('visibilitychange', schedule);

  function draw(now) {
    frame = 0;
    if (intro.skipped || motion.matches || elapsed >= 3.25) {
      finish();
      observer.disconnect();
      document.removeEventListener('visibilitychange', schedule);
      return;
    }
    if (document.hidden || !visible) {
      previous = 0;
      return;
    }
    elapsed += previous ? Math.min(.05, (now - previous) / 1000) : 0;
    previous = now;
    const distance = Math.min(1, Math.max(0, (elapsed - .93) / 1.87)) * total;
    let current = strokes.at(-1);
    for (const stroke of strokes) {
      const ink = Math.min(stroke.length, Math.max(0, distance - stroke.start));
      stroke.path.setAttribute('stroke-dashoffset', stroke.length - ink);
      stroke.brush.setAttribute('stroke-dashoffset', stroke.length - ink);
      if (distance < stroke.start + stroke.length) {
        current = stroke;
        break;
      }
    }
    const offset = Math.max(0, Math.min(current.length, distance - current.start));
    const tip = current.path.getPointAtLength(offset);
    const near = current.path.getPointAtLength(Math.min(current.length, offset + 2));
    const inkWash = Math.max(0, Math.min(1, (elapsed - 2.50) / .62));
    wash.setAttribute('opacity', inkWash);
    drawing.setAttribute('opacity', 1 - inkWash);
    const angle = 32 + Math.atan2(near.y - tip.y, near.x - tip.x) * 5;
    if (elapsed < .93) {
      const t = Math.min(1, Math.max(0, (elapsed - .52) / .41));
      const u = 1 - t;
      const startX = box.x + box.width * 1.58;
      const startY = box.y - box.height * .40;
      const x = u ** 3 * startX + 3 * u ** 2 * t * (box.x + box.width * .28) + 3 * u * t ** 2 * (box.x - box.width * .25) + t ** 3 * tip.x;
      const y = u ** 3 * startY + 3 * u ** 2 * t * (box.y - box.height * .62) + 3 * u * t ** 2 * (box.y + box.height * .51) + t ** 3 * tip.y;
      pose(x, y, -83 + (angle + 83) * t + Math.sin(t * Math.PI) * 102);
    } else {
      const exit = Math.min(1, Math.max(0, (elapsed - 2.80) / .43));
      const ease = exit * exit * (3 - 2 * exit);
      pose(tip.x + (restX - tip.x) * ease, tip.y + (restY - tip.y) * ease, angle + (27 - angle) * ease);
    }
    schedule();
  }
  schedule();
  return true;
}
