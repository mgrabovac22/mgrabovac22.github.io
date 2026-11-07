import './style.css';
import './studio.css';
import './world.css';
import { mountPortrait } from './portrait.js';
import { createStory, storyIndexForHash } from './story.js';
import { loadPortfolio, localAsset } from './portfolio.js';
import { chapterLinks, contentCards, heroActions, mapPins, profileSummary, screenContent } from './portfolio-markup.js';
import { studioDispatch } from './studio.js';

const motion = matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;
const homeShell = document.querySelector('.home-shell');
const world = document.querySelector('#world');
world.removeAttribute('open');
root.classList.add('js-ready');

const snapshot = JSON.parse(document.querySelector('#portfolio-snapshot').textContent);
const loaded = await loadPortfolio(root.lang).then(data => ({ data, pages: createStory(data) })).catch(() => null);
const locale = loaded?.data ?? snapshot;
const pages = loaded?.pages ?? createStory(snapshot);
const { t } = locale;
const sectionMenuLabel = t.sections ?? snapshot.t.sections;

function refreshPortfolio() {
  const { profile } = locale;
  const setText = (selector, value) => { document.querySelector(selector).textContent = value; };
  const setAttribute = (selector, name, value) => { document.querySelector(selector).setAttribute(name, value); };
  document.title = profile.name + ' — ' + t.title;
  setAttribute('meta[name=description]', 'content', t.description);
  setText('.wordmark span', profile.name);
  setAttribute('.wordmark', 'aria-label', profile.name);
  setText('#hero-title', profile.name);
  document.querySelector('#hero-summary').innerHTML = profileSummary(locale);
  document.querySelector('.screen-copy').innerHTML = screenContent(locale);
  document.querySelector('.hero-actions').innerHTML = heroActions(locale);
  setAttribute('.hero-actions', 'aria-label', t.at);
  setText('.cv-control span', t.cv);
  setAttribute('.cv-control', 'href', localAsset(profile.cv.file));
  setAttribute('.portrait-fallback', 'src', localAsset(profile.portrait.image));
  setAttribute('.portrait-fallback', 'alt', t.portrait);
  document.querySelector('.studio-dispatch').outerHTML = studioDispatch(locale);
  document.querySelector('.stops').innerHTML = contentCards(pages);
  document.querySelector('.pin-layer').innerHTML = mapPins(pages);
  document.querySelector('.chapter-menu ul').innerHTML = chapterLinks(locale.stops);
  setAttribute('.chapter-menu', 'aria-label', sectionMenuLabel);
  setText('.skip-link', t.skip);
  setText('#skip-intro', t.skipIntro);
  setText('#read-mode', t.read);
  setText('#world-title', t.world);
  setText('.scroll-hint', t.scroll);
  setText('.world-portal span', t.portal);
  setAttribute('#world-scroll', 'aria-label', t.region);
  for (const [selector, label] of [['#world-close', t.close], ['[data-step="-1"]', t.previous], ['[data-step="1"]', t.next]]) {
    setAttribute(selector, 'aria-label', label);
    setAttribute(selector, 'title', label);
  }
  for (const node of document.querySelectorAll('.language-control')) node.setAttribute('aria-label', t.locale);
  for (const node of document.querySelectorAll('.world-hud, .world-arrows')) node.setAttribute('aria-label', t.controls);
}
if (loaded && JSON.stringify(locale) !== JSON.stringify(snapshot)) refreshPortfolio();

const scroller = document.querySelector('#world-scroll');
const stage = document.querySelector('#world-stage');
const viewport = document.querySelector('#world-viewport');
const sections = pages.map(page => document.getElementById(page.id));
const counter = document.querySelector('#world-counter');
const chapterPicker = world.querySelector('.chapter-picker');
const chapterToggle = chapterPicker.querySelector('summary');
const chapterName = chapterPicker.querySelector('#chapter-name');
const chapterOptions = new Map([...chapterPicker.querySelectorAll('a')].map(link => [link.hash, link]));
let activeChapter;
const languageLink = world.querySelector('.language-control');
const alternateUrl = new URL(languageLink.href);
const closeButton = document.querySelector('#world-close');
const readButton = document.querySelector('#read-mode');
const stepButtons = [...world.querySelectorAll('[data-step]')];
const fallbackLinks = [...world.querySelectorAll('.fallback-links a')];
const route = { progress: 0, index: 0, jump: 0 };

function syncMotion() {
  root.classList.toggle('motion-paused', motion.matches);
  if (motion.matches) world.classList.remove('flying');
}
motion.addEventListener('change', syncMotion);
syncMotion();

for (const page of pages) {
  page.links.forEach((action, index) => {
    action.link = document.querySelector(`[data-pin="${page.id}-${index}"] a`);
    action.link.hidden = true;
  });
}

[closeButton, ...stepButtons].forEach(button => { button.hidden = false; });

function setIndex(index) {
  if (index !== route.index && document.activeElement?.classList.contains('map-pin')) scroller.focus({ preventScroll: true });
  route.index = index;
  const { chapterId, chapterTitle, id } = pages[index];
  counter.textContent = String(index + 1).padStart(2, '0') + ' / ' + pages.length;
  const option = chapterOptions.get('#' + chapterId);
  if (option !== activeChapter) {
    chapterName.textContent = chapterTitle;
    chapterToggle.setAttribute('aria-label', sectionMenuLabel + ': ' + chapterTitle);
    activeChapter?.removeAttribute('aria-current');
    option?.setAttribute('aria-current', 'location');
    activeChapter = option;
  }
  alternateUrl.hash = id;
  languageLink.href = alternateUrl.href;
  stepButtons[0].disabled = index === 0;
  stepButtons[1].disabled = index === pages.length - 1;
}

let frame = 0;
let scrollWidth = 0;
let scrollHeight = 0;
function measureScroll() {
  frame = 0;
  if (!world.open) return;
  const { clientWidth, clientHeight } = scroller;
  if (scrollHeight && (scrollWidth !== clientWidth || scrollHeight !== clientHeight)) {
    // Stop offsets change with the viewport. Keep the current stop anchored.
    scroller.scrollTo({ top: sections[route.index].offsetTop, behavior: 'instant' });
    route.jump++;
  }
  scrollWidth = clientWidth;
  scrollHeight = clientHeight;
  const scroll = scroller.scrollTop + 1;
  let index = 0;
  while (index < sections.length - 1 && scroll >= sections[index + 1].offsetTop) index++;
  const next = sections[index + 1]?.offsetTop;
  const duration = Math.min(clientHeight * .66, (next - sections[index].offsetTop) * .77);
  const blend = next === undefined ? 0 : Math.min(1, Math.max(0, (scroll - next + duration) / duration));
  route.progress = index + blend;
  const visible = Math.round(route.progress);
  if (visible !== route.index) setIndex(visible);
}
function scheduleScroll() {
  if (world.open && !frame) frame = requestAnimationFrame(measureScroll);
}
scroller.addEventListener('scroll', scheduleScroll, { passive: true });
const resizeScroll = new ResizeObserver(scheduleScroll);
resizeScroll.observe(scroller);
resizeScroll.observe(document.querySelector('#world-route'));

let modulePromise;
let mapState = 'idle';
let mapView;
let flightTimer;
function prepareWorld() {
  modulePromise ??= import('./world.js')
    .then(async module => ({ module, office: await module.prepareOffice(pages) }))
    .catch(() => null);
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
  cancelReadingLift();
  world.classList.remove('waiting', 'flying', 'has-3d');
  textAccessibility(true);
  mapState = 'fallback';
  readButton.hidden = true;
  scrollToLevel(route.index, false);
}
async function ensureWorld() {
  if (mapState !== 'idle') return;
  const prepared = await prepareWorld();
  if (!world.open || mapState !== 'idle') return;
  if (!prepared) {
    useFallback();
    return;
  }
  const selected = route.index;
  mapState = 'loading';
  world.classList.add('has-3d');
  textAccessibility(false);
  scrollToLevel(selected, false);
  try {
    const { module, office } = prepared;
    mapView = await module.mountWorld(viewport, motion, route, pages, office, mapLoaded, useFallback);
    if (!mapView) useFallback();
  } catch {
    useFallback();
  }
}
function scrollToLevel(index, animated = true) {
  scroller.scrollTo({ top: sections[index].offsetTop, behavior: animated && !motion.matches ? 'smooth' : 'instant' });
  scheduleScroll();
}
function navigate(index, jump = false) {
  if (world.classList.contains('lifting-reader')) return;
  const safe = Math.max(0, Math.min(index, pages.length - 1));
  if (!jump && safe === route.index && Math.abs(scroller.scrollTop - sections[safe].offsetTop) < 2) return;
  history.replaceState(null, '', '#' + pages[safe].id);
  if (jump) {
    route.progress = safe;
    route.jump++;
    setIndex(safe);
  }
  scrollToLevel(safe, !jump);
}

function cancelReadingLift() {
  mapView?.cancelLift();
  world.classList.remove('lifting-reader');
  readButton.disabled = false;
}

function showReading(index, reading) {
  world.classList.toggle('reading', reading);
  readButton.textContent = reading ? t.map : t.read;
  textAccessibility(reading);
  scrollToLevel(index, false);
  if (reading) sections[index].querySelector('h3').focus({ preventScroll: true });
}

readButton.addEventListener('click', () => {
  const index = route.index;
  const reading = !world.classList.contains('reading');
  if (!reading || motion.matches || !mapView) {
    showReading(index, reading);
    return;
  }
  world.classList.remove('flying');
  world.classList.add('lifting-reader');
  readButton.disabled = true;
  mapView.liftPanel(index, () => {
    cancelReadingLift();
    if (world.open) showReading(index, true);
  });
});

let entryTrigger;
function openLevel(index, trigger) {
  const opening = !world.open;
  if (opening) {
    entryTrigger = trigger;
    root.classList.add('world-open');
    world.showModal();
    homeShell.inert = true;
    world.classList.remove('flying');
    closeButton.focus({ preventScroll: true });
    route.progress = index;
    route.jump++;
    setIndex(index);
    finishIntro();
    if (!world.classList.contains('reading')) {
      if (mapState === 'ready') fly();
      if (mapState === 'idle' || mapState === 'loading') {
        world.classList.add('waiting');
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

const levelFromHash = () => storyIndexForHash(pages, location.hash);
function followLocation() {
  const index = levelFromHash();
  if (index >= 0) openLevel(index);
  else if (world.open) world.close();
}
closeButton.addEventListener('click', () => world.close());
world.addEventListener('close', () => {
  cancelReadingLift();
  chapterPicker.open = false;
  root.classList.remove('world-open');
  homeShell.inert = false;
  world.classList.remove('waiting', 'flying');
  if (levelFromHash() >= 0) history.replaceState(null, '', location.pathname + location.search);
  (entryTrigger ?? document.querySelector('.hero-primary')).focus({ preventScroll: true });
});
window.addEventListener('popstate', followLocation);
window.addEventListener('hashchange', followLocation);
stepButtons.forEach(button => button.addEventListener('click', () => navigate(route.index + Number(button.dataset.step))));
chapterPicker.addEventListener('click', event => {
  const link = event.target.closest('.chapter-link');
  if (!link || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const index = storyIndexForHash(pages, link.hash);
  if (index < 0) return;
  event.preventDefault();
  chapterPicker.open = false;
  chapterToggle.focus({ preventScroll: true });
  if (world.classList.contains('lifting-reader')) cancelReadingLift();
  navigate(index, true);
});
world.addEventListener('pointerdown', event => {
  if (chapterPicker.open && !chapterPicker.contains(event.target)) chapterPicker.open = false;
});
world.addEventListener('keydown', event => {
  if (chapterPicker.open && event.key === 'Escape') {
    event.preventDefault();
    chapterPicker.open = false;
    chapterToggle.focus({ preventScroll: true });
    return;
  }
  if (chapterPicker.open && chapterPicker.contains(event.target)) return;
  if (!world.classList.contains('has-3d') || world.classList.contains('reading') || world.classList.contains('lifting-reader') || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key === 'PageDown' || event.key === 'ArrowDown') {
    event.preventDefault();
    navigate(route.index + 1);
  } else if (event.key === 'PageUp' || event.key === 'ArrowUp') {
    event.preventDefault();
    navigate(route.index - 1);
  }
});

for (const link of document.querySelectorAll('.hero-actions a[href^="#"]')) {
  link.addEventListener('pointerenter', prepareWorld, { once: true });
  link.addEventListener('focus', prepareWorld, { once: true });
  link.addEventListener('click', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const hash = link.getAttribute('href');
    const index = storyIndexForHash(pages, hash);
    if (index < 0) return;
    event.preventDefault();
    history.pushState(null, '', hash);
    openLevel(index, link);
  });
}

const skip = document.querySelector('#skip-intro');
const portrait = document.querySelector('#portrait');
const desk = document.querySelector('.desk-stage');
const studio = document.querySelector('.studio-dispatch');
const portraitDelivery = portrait.getAnimations().find(animation => animation.animationName === 'portrait-delivery');
const intro = { skipped: levelFromHash() >= 0, drawingDone: false };
function finishIntro() {
  if (document.activeElement === skip) document.querySelector('.hero-primary').focus({ preventScroll: true });
  intro.skipped = true;
  desk.classList.add('intro-done');
  studio.classList.remove('studio-playing');
  studio.classList.add('studio-complete');
  skip.hidden = true;
}
function startStudioIntro() {
  if (intro.skipped) return;
  desk.classList.add('intro-done');
  studio.classList.add('studio-playing');
}
if (motion.matches || intro.skipped) finishIntro();
else {
  skip.hidden = false;
  const animatedPortrait = (portraitDelivery?.currentTime ?? 0) < 850 && mountPortrait(portrait, motion, intro, startStudioIntro);
  if (!animatedPortrait) {
    const lidOpening = desk.querySelector('.laptop-lid').getAnimations().find(animation => animation.animationName === 'lid-opening');
    if (lidOpening) void lidOpening.finished.then(startStudioIntro, () => {});
    else startStudioIntro();
  }
}
studio.addEventListener('animationend', event => { if (event.animationName === 'studio-greeting') finishIntro(); });
skip.addEventListener('click', finishIntro);
motion.addEventListener('change', () => { if (motion.matches) finishIntro(); });
const syncVisibility = () => root.classList.toggle('is-hidden', document.hidden);
document.addEventListener('visibilitychange', syncVisibility);
syncVisibility();
desk.addEventListener('pointermove', event => {
  if (motion.matches || event.pointerType !== 'mouse') return;
  const bounds = desk.getBoundingClientRect();
  desk.style.setProperty('--draft-x', `${((event.clientX - bounds.left) / bounds.width - .5) * 7}px`);
  desk.style.setProperty('--draft-y', `${((event.clientY - bounds.top) / bounds.height - .5) * 7}px`);
});
desk.addEventListener('pointerleave', () => {
  desk.style.removeProperty('--draft-x');
  desk.style.removeProperty('--draft-y');
});
import('./blueprint.js')
  .then(({ mountBlueprint }) => mountBlueprint(document.querySelector('#home-blueprint'), motion))
  .catch(() => {});
if (!navigator.connection?.saveData && navigator.hardwareConcurrency > 4) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (document.hidden) return;
      if ('requestIdleCallback' in window) requestIdleCallback(prepareWorld, { timeout: 1800 });
      else void prepareWorld();
    }, 1900);
  }, { once: true });
}
followLocation();
