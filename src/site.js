import { createStory } from './story.js';
import { getLocale } from './locale.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const asset = path => './' + path;
const icons = {
  diagonal: '<path d="M4 12 12 4M5 4h7v7"/>',
  down: '<path d="M8 3v10m-4-4 4 4 4-4"/>',
  up: '<path d="M8 13V3m-4 4 4-4 4 4"/>',
  download: '<path d="M8 2.5v7m-3-3 3 3 3-3M3 10.5v2.8h10v-2.8"/>',
  close: '<path d="m4 4 8 8m0-8-8 8"/>',
};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35">${icons[name]}</svg>`;
const link = (label, href, mark = 'diagonal', style = 'text-link') =>
  `<a class="${style}" href="${escape(href)}"><span>${escape(label)}</span>${icon(mark)}</a>`;
const list = (items, className) => items?.length
  ? `<ul class="${className}">${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`
  : '';
const pageNumber = index => String(index + 1).padStart(2, '0');

function external(action, classes = '', content = escape(action.label) + ' ' + icon(action.download ? 'download' : 'diagonal')) {
  const browserLink = action.href.startsWith('https:') ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a class="${classes}" href="${escape(action.href)}"${action.download ? ' download' : browserLink}>${content}</a>`;
}

function waypoint(action) {
  return external(action, 'map-pin mono', `<span class="pin-label">${escape(action.label)}</span><span class="pin-hit" aria-hidden="true"></span>`);
}

function contentCard(page, index) {
  return `<section id="${page.id}" class="stop" aria-labelledby="${page.id}-title">
    <article>
      <p class="mono fallback-index">${pageNumber(index)} / ${escape(page.chapterTitle)}</p>
      <h3 id="${page.id}-title">${escape(page.title)}</h3>
      ${page.meta || page.date ? `<p class="fallback-meta">${escape([page.meta, page.date].filter(Boolean).join(' · '))}</p>` : ''}
      ${page.body ? `<p>${escape(page.body)}</p>` : ''}
      ${list(page.points, 'fallback-points')}${list(page.tags, 'fallback-tags')}
      ${page.links.length ? `<div class="fallback-links">${page.links.map(action => external(action, 'text-link')).join('')}</div>` : ''}
    </article>
  </section>`;
}

export function renderSite(html, context) {
  const language = context.path.endsWith('/hr.html') ? 'hr' : 'en';
  const { profile, stops, t } = getLocale(language);
  const story = createStory(language);
  const name = escape(profile.name);
  const title = `${name} — ${t.title}`;
  const alternate = language === 'hr' ? 'en' : 'hr';
  const switchTo = language === 'hr' ? './' : './hr.html';
  const localeLink = `<a class="language-control mono" href="${switchTo}" hreflang="${alternate}" lang="${alternate}" aria-label="${t.locale}">${alternate.toUpperCase()}</a>`;
  const description = language === 'hr'
    ? 'Istraži projekte, iskustvo i vještine Marina Grabovca u interaktivnom 3D uredu.'
    : 'Explore Marin Grabovac’s projects, career and qualifications in an interactive 3D office.';
  const canonical = profile.url + (language === 'hr' ? 'hr.html' : '');
  const meta = `<title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${escape(canonical)}">
    <link rel="alternate" hreflang="en" href="${escape(profile.url)}">
    <link rel="alternate" hreflang="hr" href="${escape(profile.url)}hr.html">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${escape(canonical)}">
    <meta property="og:image" content="${escape(profile.url)}art/social.png">
    <meta name="twitter:card" content="summary_large_image">`;
  const { image: photo, drawing } = profile.portrait;
  const content = `
  <a class="skip-link" href="#main">${t.skip}</a>
  <div class="home-shell">
    <canvas id="home-blueprint" class="home-blueprint" aria-hidden="true"></canvas>
    <header class="site-header shell">
      ${localeLink}
      <a href="#home" class="wordmark" aria-label="${name}"><img src="/art/mark.svg" alt="" width="33" height="33"><span>${name}</span></a>
      ${external({ href: asset(profile.cv.file), label: t.cv, download: true }, 'cv-control')}
    </header>
    <main id="main">
      <section class="hero shell" id="home" aria-labelledby="hero-title">
        <h1 id="hero-title" class="sr-only">${name}</h1>
        <p class="sr-only">${escape(profile.role)} · ${escape(profile.current)} · ${escape(profile.focus)}</p>
        <figure class="desk-stage">
          <div class="desk-sweep" aria-hidden="true"></div>
          <svg class="drafting" viewBox="0 0 1240 570" preserveAspectRatio="none" fill="none" aria-hidden="true">
            <path d="M44 80V54h25m1103 0h24v26M44 490v27h25m1103 0h24v-27M79 465h1080M828 75v436"/>
            <path class="orbit" d="M83 299C166 165 496 95 872 132c252 24 355 121 260 200-102 83-487 131-772 110C108 424 29 384 83 299Z"/>
            <path class="orbit secondary-orbit" d="M128 395C210 467 505 486 782 460c197-19 372-67 409-118M51 324c-14 45 26 66 56 78"/>
            <path d="M78 133h16m-8-8v16m1039 15h19m-9.5-9.5v19M924 489h50m-50 8h33M99 489h50m-50 8h33"/>
          </svg>
          <div class="laptop" id="laptop-visual">
            <img src="/art/laptop.svg" alt="" class="laptop-fallback" width="600" height="490" fetchpriority="high">
          </div>
          <div class="portrait" id="portrait" data-drawing="${escape(asset(drawing))}" data-photo="${escape(asset(photo))}">
            <span class="portrait-marker mono" aria-hidden="true">MG / 01 <b>+</b></span>
            <img src="/${escape(photo)}" alt="${escape(t.portrait)}" class="portrait-fallback" width="400" height="400">
          </div>
          <button type="button" class="skip-intro mono" id="skip-intro" hidden>${t.skipIntro}</button>
        </figure>
        <nav class="hero-actions" aria-label="${escape(t.at)}">
          ${link(t.about, '#about', 'diagonal', 'hero-primary')}
          ${stops.slice(1, 4).map(stop => link(stop.title, '#' + stop.id)).join('')}
        </nav>
      </section>
    </main>
  </div>

  <dialog id="world" class="world" aria-labelledby="world-title" open>
    <div class="world-hud" aria-label="${t.controls}">
      <div class="hud-left">
        <button class="world-close" type="button" id="world-close" aria-label="${t.close}" title="${t.close}" autofocus hidden>${icon('close')}</button>
        ${localeLink}
      </div>
      <div class="hud-index mono" aria-hidden="true"><span id="district-name"></span><span id="world-counter">01 / ${story.length}</span></div>
    </div>
    <div class="world-scroll" id="world-scroll" tabindex="0" role="region" aria-label="${t.region}">
      <h2 class="sr-only" id="world-title">${t.world}</h2>
      <div class="world-route" id="world-route">
        <figure class="world-stage" id="world-stage" aria-hidden="false">
          <div class="viewport" id="world-viewport"></div>
          <div class="pin-layer">
            ${story.flatMap(page => page.links.map((action, index) => `<span data-pin="${page.id}-${index}">${waypoint(action)}</span>`)).join('')}
          </div>
        </figure>
        <div class="stops">${story.map(contentCard).join('')}</div>
      </div>
    </div>
    <div class="world-footer">
      <button class="read-mode mono" type="button" id="read-mode" hidden>${t.read}</button>
      <span class="scroll-hint mono" aria-hidden="true">${t.scroll}</span>
      <div class="world-arrows" aria-label="${t.controls}">
        <button type="button" data-step="-1" aria-label="${t.previous}" title="${t.previous}" hidden>${icon('up')}</button>
        <button type="button" data-step="1" aria-label="${t.next}" title="${t.next}" hidden>${icon('down')}</button>
      </div>
    </div>
    <div class="world-portal" aria-hidden="true">
      <svg viewBox="0 0 250 200" fill="none"><path d="M25 30h200v140H25zM25 95h200M108 30v140m56-140v140M25 126h200M58 30v65" stroke="currentColor" stroke-width="1.2"/><path d="M64 147h24v12H64zm62-92h20v22h-20zm54 47h27v17h-27z" fill="currentColor"/><path d="M25 30h28m-28 0v26m200 114h-25m25 0v-26" stroke="#dbe8ac" stroke-width="3"/></svg>
      <span class="mono">${t.portal}</span>
    </div>
  </dialog>`;
  return html.replace('<!-- portfolio-meta -->', meta).replace('<!-- portfolio-content -->', content).replace(/[ \t]+$/gm, '');
}
