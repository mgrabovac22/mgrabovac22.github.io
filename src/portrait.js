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

export async function mountPortrait(host, motion, intro) {
  const fallback = host.querySelector('img');
  let svg;
  try {
    const response = await fetch(host.dataset.drawing);
    if (!response.ok) throw new Error('Portrait drawing unavailable');
    const source = new DOMParser().parseFromString(await response.text(), 'image/svg+xml').documentElement;
    if (source.localName !== 'svg') throw new Error('Portrait drawing must be SVG');
    svg = svgNode('svg', { viewBox: source.getAttribute('viewBox') || '0 0 230 230', class: 'portrait-ink', role: 'img', 'aria-label': fallback.alt });
    const drawing = svgNode('g', {
      fill: 'none', stroke: source.getAttribute('stroke') || '#333d33',
      'stroke-width': source.getAttribute('stroke-width') || '1.35',
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    });
    for (const original of source.querySelectorAll('path[data-ink]')) {
      const stroke = svgNode('path', { d: original.getAttribute('d') });
      for (const attribute of ['stroke', 'stroke-width', 'stroke-dasharray', 'opacity']) {
        if (original.hasAttribute(attribute)) stroke.setAttribute(attribute, original.getAttribute(attribute));
      }
      drawing.append(stroke);
    }
    if (!drawing.childElementCount) throw new Error('Portrait SVG has no ink paths');
    svg.append(drawing);
  } catch {
    if (host.dataset.photo) fallback.src = host.dataset.photo;
    return;
  }

  const pen = makePen();
  const paths = [...svg.querySelectorAll('path')];
  svg.append(pen);
  fallback.replaceWith(svg);
  let total = 0;
  const strokes = paths.map(path => {
    const length = path.getTotalLength();
    const stroke = { path, start: total, length, dash: path.getAttribute('stroke-dasharray') };
    total += length;
    return stroke;
  });
  const box = svg.viewBox.baseVal;
  const restX = box.x + box.width * .86;
  const restY = box.y + box.height * .94;
  const pose = (x, y, angle) => pen.setAttribute('transform', `translate(${x} ${y}) rotate(${angle}) scale(${box.width / 230})`);
  function finish() {
    strokes.forEach(({ path, dash }) => {
      if (dash) path.setAttribute('stroke-dasharray', dash);
      else path.removeAttribute('stroke-dasharray');
      path.removeAttribute('stroke-dashoffset');
    });
    pose(restX, restY, 27);
    intro.drawingDone = true;
  }
  if (intro.skipped || motion.matches) {
    finish();
    return;
  }

  strokes.forEach(({ path, length }) => {
    path.setAttribute('stroke-dasharray', `${length} ${length}`);
    path.setAttribute('stroke-dashoffset', length);
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
    if (intro.skipped || motion.matches || elapsed >= 4.05) {
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
    const distance = Math.min(1, Math.max(0, (elapsed - 1.12) / 2.45)) * total;
    let current = strokes.at(-1);
    for (const stroke of strokes) {
      const ink = Math.min(stroke.length, Math.max(0, distance - stroke.start));
      stroke.path.setAttribute('stroke-dashoffset', stroke.length - ink);
      if (distance < stroke.start + stroke.length) {
        current = stroke;
        break;
      }
    }
    const offset = Math.max(0, Math.min(current.length, distance - current.start));
    const tip = current.path.getPointAtLength(offset);
    const near = current.path.getPointAtLength(Math.min(current.length, offset + 2));
    const angle = 32 + Math.atan2(near.y - tip.y, near.x - tip.x) * 5;
    if (elapsed < 1.12) {
      const t = Math.min(1, Math.max(0, (elapsed - .28) / .84));
      const u = 1 - t;
      const startX = box.x + box.width * 1.58;
      const startY = box.y - box.height * .40;
      const x = u ** 3 * startX + 3 * u ** 2 * t * (box.x + box.width * .28) + 3 * u * t ** 2 * (box.x - box.width * .25) + t ** 3 * tip.x;
      const y = u ** 3 * startY + 3 * u ** 2 * t * (box.y - box.height * .62) + 3 * u * t ** 2 * (box.y + box.height * .51) + t ** 3 * tip.y;
      pose(x, y, -83 + (angle + 83) * t + Math.sin(t * Math.PI) * 102);
    } else {
      const exit = Math.min(1, Math.max(0, (elapsed - 3.57) / .48));
      const ease = exit * exit * (3 - 2 * exit);
      pose(tip.x + (restX - tip.x) * ease, tip.y + (restY - tip.y) * ease, angle + (27 - angle) * ease);
    }
    schedule();
  }
  schedule();
}
