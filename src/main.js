import './style.css';
import './world.css';
import { mountPortrait } from './portrait.js';
import { createStory } from './story.js';
import { getLocale } from './locale.js';

const motion = matchMedia('(prefers-reduced-motion: reduce)');
const locale = getLocale(document.documentElement.lang);
const { t } = locale;
const pages = createStory(locale.language);
const root = document.documentElement;
const world = document.querySelector('#world');
const scroller = document.querySelector('#world-scroll');
const stage = document.querySelector('#world-stage');
const viewport = document.querySelector('#world-viewport');
const sections = pages.map(page => document.getElementById(page.id));
const counter = document.querySelector('#world-counter');
const district = document.querySelector('#district-name');
const languageLink = world.querySelector('.language-control');
const alternateUrl = new URL(languageLink.href);
const closeButton = document.querySelector('#world-close');
const readButton = document.querySelector('#read-mode');
const stepButtons = [...world.querySelectorAll('[data-step]')];
const fallbackLinks = [...world.querySelectorAll('.fallback-links a')];
const route = { progress: 0, index: 0, jump: 0 };

for (const page of pages) {
  page.links.forEach((action, index) => {
    action.link = document.querySelector(`[data-pin="${page.id}-${index}"] a`);
    action.link.hidden = true;
  });
}

world.removeAttribute('open');
root.classList.add('js-ready');
[closeButton, ...stepButtons].forEach(button => { button.hidden = false; });

function setIndex(index) {
  route.index = index;
  counter.textContent = String(index + 1).padStart(2, '0') + ' / ' + pages.length;
  district.textContent = pages[index].district;
  alternateUrl.hash = pages[index].id;
  languageLink.href = alternateUrl.href;
  stepButtons[0].disabled = index === 0;
  stepButtons[1].disabled = index === pages.length - 1;
}

let frame = 0;
function measureScroll() {
  frame = 0;
  if (!world.open) return;
  const scroll = scroller.scrollTop + 1;
  let index = 0;
  while (index < sections.length - 1 && scroll >= sections[index + 1].offsetTop) index++;
  const next = sections[index + 1]?.offsetTop;
  const duration = Math.min(scroller.clientHeight * .66, (next - sections[index].offsetTop) * .77);
  const blend = next === undefined ? 0 : Math.min(1, Math.max(0, (scroll - next + duration) / duration));
  route.progress = index + blend;
  const visible = Math.round(route.progress);
  if (visible !== route.index) setIndex(visible);
}
function scheduleScroll() {
  if (world.open && !frame) frame = requestAnimationFrame(measureScroll);
}
scroller.addEventListener('scroll', scheduleScroll, { passive: true });
new ResizeObserver(scheduleScroll).observe(document.querySelector('#world-route'));

let modulePromise;
let mapState = 'idle';
let flightTimer;
function prepareWorld() {
  modulePromise ??= import('./world.js').catch(() => null);
  return modulePromise;
}

function fly() {
  world.classList.remove('waiting');
  clearTimeout(flightTimer);
  if (!motion.matches) {
    world.classList.add('flying');
    flightTimer = setTimeout(() => world.classList.remove('flying'), 1070);
  }
}
function mapLoaded() {
  mapState = 'ready';
  readButton.hidden = false;
  if (world.open) fly();
}
function textAccessibility(reading) {
  fallbackLinks.forEach(link => { link.tabIndex = reading ? 0 : -1; });
  stage.inert = reading;
}
function useFallback() {
  world.classList.remove('waiting', 'flying', 'has-3d');
  textAccessibility(true);
  mapState = 'fallback';
  scrollToLevel(route.index, false);
}
async function ensureWorld() {
  if (mapState !== 'idle') return;
  const module = await prepareWorld();
  if (!world.open || mapState !== 'idle') return;
  if (!module) {
    useFallback();
    return;
  }
  const selected = route.index;
  mapState = 'loading';
  world.classList.add('has-3d');
  textAccessibility(false);
  scrollToLevel(selected, false);
  try {
    if (!module.mountWorld(viewport, motion, route, pages, mapLoaded)) useFallback();
  } catch {
    useFallback();
  }
}
function scrollToLevel(index, animated = true) {
  scroller.scrollTo({ top: sections[index].offsetTop, behavior: animated && !motion.matches ? 'smooth' : 'instant' });
  scheduleScroll();
}
function navigate(index) {
  const safe = Math.max(0, Math.min(index, pages.length - 1));
  if (safe === route.index && Math.abs(scroller.scrollTop - sections[safe].offsetTop) < 2) return;
  history.replaceState(null, '', '#' + pages[safe].id);
  scrollToLevel(safe);
}

readButton.addEventListener('click', () => {
  const index = route.index;
  const reading = world.classList.toggle('reading');
  readButton.textContent = reading ? t.map : t.read;
  textAccessibility(reading);
  scrollToLevel(index, false);
});

let entryTrigger;
function openLevel(index, trigger) {
  const opening = !world.open;
  if (opening) {
    entryTrigger = trigger;
    root.classList.add('world-open');
    world.showModal();
    world.classList.remove('flying');
    closeButton.focus({ preventScroll: true });
    route.progress = index;
    route.jump++;
    setIndex(index);
    finishIntro();
    if (!world.classList.contains('reading')) {
      if (mapState === 'ready') fly();
      if (mapState === 'idle' || mapState === 'loading') {
        if (!motion.matches) world.classList.add('waiting');
        void ensureWorld();
      }
    }
  }
  scrollToLevel(index, !opening);
  if (opening && document.fonts.status !== 'loaded') {
    const initialScroll = scroller.scrollTop;
    void document.fonts.ready.then(() => {
      if (world.open && route.index === index && Math.abs(scroller.scrollTop - initialScroll) < 2) scrollToLevel(index, false);
    });
  }
}

const levelFromHash = () => pages.findIndex(page => '#' + page.id === location.hash);
function followLocation() {
  const index = levelFromHash();
  if (index >= 0) openLevel(index);
  else if (world.open) world.close();
}
closeButton.addEventListener('click', () => world.close());
world.addEventListener('close', () => {
  root.classList.remove('world-open');
  world.classList.remove('waiting', 'flying');
  if (levelFromHash() >= 0) history.replaceState(null, '', location.pathname + location.search);
  entryTrigger?.focus({ preventScroll: true });
});
window.addEventListener('popstate', followLocation);
window.addEventListener('hashchange', followLocation);
stepButtons.forEach(button => button.addEventListener('click', () => navigate(route.index + Number(button.dataset.step))));
world.addEventListener('keydown', event => {
  if (world.classList.contains('reading') || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key === 'PageDown' || event.key === 'ArrowDown') {
    event.preventDefault();
    navigate(route.index + 1);
  } else if (event.key === 'PageUp' || event.key === 'ArrowUp') {
    event.preventDefault();
    navigate(route.index - 1);
  }
});

for (const link of document.querySelectorAll('.hero-actions a')) {
  link.addEventListener('pointerenter', prepareWorld, { once: true });
  link.addEventListener('focus', prepareWorld, { once: true });
  link.addEventListener('click', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const hash = link.getAttribute('href');
    const index = pages.findIndex(page => '#' + page.id === hash);
    if (index < 0) return;
    event.preventDefault();
    history.pushState(null, '', hash);
    openLevel(index, link);
  });
}

const status = document.querySelector('#art-status');
const skip = document.querySelector('#skip-intro');
const portrait = document.querySelector('#portrait');
const intro = { skipped: levelFromHash() >= 0, drawingDone: false };
function finishIntro() {
  intro.skipped = true;
  skip.hidden = true;
  status.textContent = t.ready;
}
if (motion.matches || intro.skipped) finishIntro();
else {
  portrait.classList.add('portrait-waiting');
  status.textContent = t.opening;
  skip.hidden = false;
  setTimeout(finishIntro, 4800);
}
skip.addEventListener('click', finishIntro);
motion.addEventListener('change', () => { if (motion.matches) finishIntro(); });
document.addEventListener('visibilitychange', () => root.classList.toggle('is-hidden', document.hidden));
void mountPortrait(portrait, motion, intro).finally(() => portrait.classList.remove('portrait-waiting'));
import('./laptop.js')
  .then(({ mountLaptop }) => mountLaptop(document.querySelector('#laptop-visual'), motion, intro, locale))
  .catch(() => {});
followLocation();
