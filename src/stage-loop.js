export function stageLoop(host, step, resize, { motion, container, fps = 60 } = {}) {
  let visible = false;
  let frame = 0;
  let time = 0;
  let last = null;
  let dirty = true;
  const interval = 1000 / fps;

  function schedule() {
    const active = visible && !document.hidden && !container?.inert;
    if (active && !frame && (dirty || !motion?.matches)) frame = requestAnimationFrame(update);
    if (!active) {
      cancelAnimationFrame(frame);
      frame = 0;
      last = null;
    }
  }

  function update(now) {
    frame = 0;
    if (!visible || document.hidden || container?.inert) return;
    if (dirty || last === null || now - last >= interval - 1) {
      const dt = last === null ? 0 : Math.min((now - last) / 1000, .085);
      last = now;
      dirty = false;
      if (!motion?.matches) time += dt;
      step(time, dt);
    }
    schedule();
  }

  function invalidate() {
    dirty = true;
    if (motion?.matches) last = null;
    schedule();
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    invalidate();
  }).observe(host);
  new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (!width || !height) return;
    resize(width, height);
    invalidate();
  }).observe(host);
  if (container) new MutationObserver(invalidate).observe(container, { attributeFilter: ['inert'] });
  motion?.addEventListener('change', invalidate);
  document.addEventListener('visibilitychange', invalidate);
  return invalidate;
}
