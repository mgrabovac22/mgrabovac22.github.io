import './style.css';
import './world.css';
import { mountPortrait } from './portrait.js';
import { stops, number } from './data.js';

const motion = matchMedia('(prefers-reduced-motion: reduce)');
const compact = matchMedia('(max-width: 760px)');
const landscape = matchMedia('(max-height: 460px) and (orientation: landscape)');
const world = document.querySelector('#world');
const scroller = document.querySelector('#world-scroll');
const stage = document.querySelector('#world-stage');
const sections = stops.map(({ id }) => document.getElementById(id));
const worldLinks = [...document.querySelectorAll('.route-nav a')];
const buttons = [...document.querySelectorAll('[data-exhibit]')];
const stageNumber = document.querySelector('#stage-number');
const stagePlace = document.querySelector('#stage-place');
const stageProgress = document.querySelector('#stage-progress');
const levelNumber = document.querySelector('#current-level');
const closeWorldButton = document.querySelector('#world-close');
const route = { progress: 0, index: 0, within: 0, jump: 0 };

world.removeAttribute('open');
document.documentElement.classList.add('js-ready');
closeWorldButton.hidden = false;

function offsets() {
  const cover = compact.matches && !landscape.matches ? stage.offsetHeight : 0;
  return sections.map(section => section.offsetTop - cover);
}

function setLevel(index) {
  route.index = index;
  worldLinks.forEach((link, i) => {
    if (i === index) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  stageNumber.textContent = levelNumber.textContent = number(index);
  stagePlace.textContent = stops[index].place;
}

let routeFrame = 0;
function updateRoute() {
  routeFrame = 0;
  if (!world.open) return;
  const positions = offsets();
  const scroll = scroller.scrollTop + 2;
  let index = 0;
  while (index < positions.length - 1 && scroll >= positions[index + 1]) index++;
  const start = positions[index];
  const next = positions[index + 1] ?? scroller.scrollHeight - scroller.clientHeight + 2;
  const length = Math.max(1, next - start);
  const travel = Math.min(scroller.clientHeight * .76, length * .7);
  const blend = index === stops.length - 1 ? 0 : Math.max(0, (scroll - next + travel) / travel);
  route.progress = index + blend;
  route.within = Math.min(1, Math.max(0, (scroll - start) / length));
  const active = Math.round(route.progress);
  if (active !== route.index) setLevel(active);
  stageProgress.style.setProperty('--progress', (route.progress + 1) / stops.length);
}
function scheduleRoute() {
  if (world.open && !routeFrame) routeFrame = requestAnimationFrame(updateRoute);
}
scroller.addEventListener('scroll', scheduleRoute, { passive: true });
window.addEventListener('resize', scheduleRoute);
new ResizeObserver(scheduleRoute).observe(document.querySelector('#world-route'));

const exhibit = document.querySelector('#exhibit-dialog');
let exhibitTrigger;
function openExhibit(index, trigger) {
  const stop = stops[index];
  document.querySelector('#exhibit-label').textContent = `Level ${number(index)} / ${stop.place}`;
  document.querySelector('#exhibit-title').textContent = stop.exhibit;
  document.querySelector('#exhibit-content').textContent = stop.description;
  document.querySelector('#exhibit-anchor').href = '#' + stop.id;
  exhibitTrigger = trigger || buttons[index];
  if (!exhibit.open) exhibit.showModal();
}
buttons.forEach(button => button.addEventListener('click', () => openExhibit(Number(button.dataset.exhibit), button)));
exhibit.addEventListener('close', () => exhibitTrigger?.focus({ preventScroll: true }));
exhibit.addEventListener('click', event => {
  const bounds = exhibit.getBoundingClientRect();
  const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  if (event.target === exhibit && outside) exhibit.close();
});

let worldModule;
let worldMounted = false;
function prepareWorld() {
  worldModule ??= import('./world.js').catch(() => null);
  return worldModule;
}
async function ensureWorld() {
  const module = await prepareWorld();
  if (!world.open || worldMounted || !module) return;
  worldMounted = true;
  if (module.mountWorld(document.querySelector('#world-viewport'), motion, route, openExhibit)) {
    buttons.forEach(button => { button.hidden = false; });
  }
}

function indexFor(hash) {
  return stops.findIndex(stop => '#' + stop.id === hash);
}

let entryTrigger;
function openLevel(index, trigger) {
  const opening = !world.open;
  if (opening) {
    entryTrigger = trigger;
    document.documentElement.classList.add('world-open');
    world.showModal();
    route.progress = index;
    route.within = 0;
    route.jump++;
    setLevel(index);
    closeWorldButton.focus({ preventScroll: true });
    finishIntro();
    void ensureWorld();
  }
  scroller.scrollTo({ top: Math.max(0, offsets()[index]), behavior: opening || motion.matches ? 'instant' : 'smooth' });
  if (opening && document.fonts.status !== 'loaded') {
    const jump = route.jump;
    const initialScroll = scroller.scrollTop;
    void document.fonts.ready.then(() => {
      if (world.open && route.jump === jump && indexFor(location.hash) === index && Math.abs(scroller.scrollTop - initialScroll) < 2) {
        scroller.scrollTo({ top: Math.max(0, offsets()[index]), behavior: 'instant' });
        scheduleRoute();
      }
    });
  }
  scheduleRoute();
}
function followLocation() {
  const index = indexFor(location.hash);
  if (index >= 0) openLevel(index);
  else if (world.open) world.close();
}
closeWorldButton.addEventListener('click', () => world.close());
world.addEventListener('close', () => {
  document.documentElement.classList.remove('world-open');
  if (indexFor(location.hash) >= 0) history.replaceState(null, '', location.pathname + location.search);
  entryTrigger?.focus({ preventScroll: true });
});
window.addEventListener('popstate', followLocation);
window.addEventListener('hashchange', followLocation);

document.querySelectorAll('a[href^="#"]').forEach(link => {
  if (link.closest('.hero-actions')) {
    link.addEventListener('pointerenter', prepareWorld, { once: true });
    link.addEventListener('focus', prepareWorld, { once: true });
  }
  link.addEventListener('click', event => {
    const hash = link.getAttribute('href');
    const index = indexFor(hash);
    if (index < 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    if (exhibit.open) exhibit.close();
    if (location.hash !== hash) history[world.open ? 'replaceState' : 'pushState'](null, '', hash);
    openLevel(index, link);
  });
});

const status = document.querySelector('#art-status');
const skip = document.querySelector('#skip-intro');
const portrait = document.querySelector('#portrait');
const intro = { skipped: indexFor(location.hash) >= 0, drawingDone: false };
function finishIntro() {
  intro.skipped = true;
  skip.hidden = true;
  status.textContent = 'WORKBENCH READY';
}
if (motion.matches || intro.skipped) finishIntro();
else {
  document.documentElement.classList.add('js-motion');
  portrait.classList.add('portrait-waiting');
  status.textContent = 'OPENING WORKSPACE';
  skip.hidden = false;
  setTimeout(finishIntro, 4800);
}
skip.addEventListener('click', finishIntro);
motion.addEventListener('change', () => { if (motion.matches) finishIntro(); });
document.addEventListener('visibilitychange', () => {
  document.documentElement.classList.toggle('is-hidden', document.hidden);
});
void mountPortrait(portrait, motion, intro).finally(() => portrait.classList.remove('portrait-waiting'));
import('./laptop.js')
  .then(({ mountLaptop }) => mountLaptop(document.querySelector('#laptop-visual'), motion, intro))
  .catch(() => {});
followLocation();
