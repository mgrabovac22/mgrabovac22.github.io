import { readFileSync } from 'node:fs';
import { createStory } from './story.js';
import { getLocale, localAsset } from './portfolio.js';
import { contentCards, escape, external, heroActions, icon, mapPins, profileSummary, screenContent } from './portfolio-markup.js';
import { deliveryHand, studioArtwork, studioDispatch } from './studio.js';

function laptop(data) {
  const keys = Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 15 }, (_, column) => {
      if (row === 5 && column > 4 && column < 10) return '';
      const wide = row === 5 && column === 4;
      return `<rect x="${column * 12.5 + 2}" y="${row * 10.4 + 2}" width="${wide ? 60 : 10.4}" height="7.7" rx="1.1"/>`;
    }).join('')).join('');
  return `<div class="laptop" id="laptop-visual" aria-hidden="true">
    <div class="laptop-model">
      <div class="laptop-deck">
        <div class="laptop-hinges"></div>
        <div class="laptop-speaker left"></div><div class="laptop-speaker right"></div>
        <svg class="laptop-keys" viewBox="0 0 190 64" fill="currentColor" stroke="#789085" stroke-width=".24">${keys}</svg>
        <div class="laptop-trackpad"></div>
      </div>
      <div class="laptop-lid">
        <div class="lid-cover"><img src="/art/mark.svg" alt="" width="64" height="64"></div>
        <div class="lid-display">
          <div class="screen-copy">${screenContent(data)}</div>
        </div>
      </div>
    </div>
    ${deliveryHand('laptop')}
  </div>`;
}

export function renderSite(html, context, source) {
  if (context.path.endsWith('/drive.html')) {
    const { en, hr } = source.copy;
    const title = escape(en.drive.title + ' — ' + source.profile.name);
    return html.replace('<!-- drive-title -->', () => '<title>' + title + '</title>')
      .replace('<!-- drive-description -->', () => `<meta name="description" content="${escape(en.drive.description)}">`)
      .replace('data-copy="loading"', () => `data-copy="loading" data-unavailable="${escape(en.drive.unavailable)}" data-unavailable-hr="${escape(hr.drive.unavailable)}"`);
  }
  const language = context.path.endsWith('/hr.html') ? 'hr' : 'en';
  const data = getLocale(source, language);
  const { profile, t } = data;
  const story = createStory(data);
  const name = escape(profile.name);
  const title = `${name} — ${escape(t.title)}`;
  const alternate = language === 'hr' ? 'en' : 'hr';
  const switchTo = language === 'hr' ? './' : './hr.html';
  const localeLink = `<a class="language-control mono" href="${switchTo}" hreflang="${alternate}" lang="${alternate}" aria-label="${escape(t.locale)}">${alternate.toUpperCase()}</a>`;
  const description = escape(t.description);
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
  const portraitInk = readFileSync(new URL('../public/art/portrait.svg', import.meta.url), 'utf8');
  const snapshot = JSON.stringify(data).replaceAll('<', '\\u003c');
  const content = `
  <a class="skip-link" href="#main">${escape(t.skip)}</a>
  <div class="home-shell">
    ${studioArtwork()}
    <canvas id="home-blueprint" class="home-blueprint" aria-hidden="true"></canvas>
    <header class="site-header shell">
      <a href="#home" class="wordmark" aria-label="${name}"><img src="/art/mark.svg" alt="" width="33" height="33"><span>${name}</span></a>
      <div class="header-actions">${localeLink}${external({ href: localAsset(profile.cv.file), label: t.cv, download: true }, 'cv-control', `<span>${escape(t.cv)}</span>${icon('download')}`)}</div>
    </header>
    ${studioDispatch(t.studio)}
    <main id="main" tabindex="-1">
      <section class="hero shell" id="home" aria-labelledby="hero-title">
        <h1 id="hero-title" class="sr-only">${name}</h1>
        <p class="sr-only" id="hero-summary">${profileSummary(data)}</p>
        <figure class="desk-stage">
          <div class="desk-sweep" aria-hidden="true"></div>
          <svg class="drafting" viewBox="0 0 1240 570" preserveAspectRatio="none" fill="none" aria-hidden="true">
            <path d="M44 80V54h25m1103 0h24v26M44 490v27h25m1103 0h24v-27M79 465h1080M828 75v436"/>
            <path class="orbit" d="M83 299C166 165 496 95 872 132c252 24 355 121 260 200-102 83-487 131-772 110C108 424 29 384 83 299Z"/>
            <path class="orbit secondary-orbit" d="M128 395C210 467 505 486 782 460c197-19 372-67 409-118M51 324c-14 45 26 66 56 78"/>
            <path d="M78 133h16m-8-8v16m1039 15h19m-9.5-9.5v19M924 489h50m-50 8h33M99 489h50m-50 8h33"/>
          </svg>
          ${laptop(data)}
          <div class="portrait" id="portrait">
            <span class="portrait-marker mono" aria-hidden="true">MG / 01 <b>+</b></span>
            <img src="/${escape(profile.portrait.image)}" alt="${escape(t.portrait)}" class="portrait-fallback" width="400" height="400" fetchpriority="high">
            <template>${portraitInk}</template>
            ${deliveryHand('portrait')}
          </div>
          <button type="button" class="skip-intro mono" id="skip-intro" hidden>${escape(t.skipIntro)}</button>
        </figure>
        <nav class="hero-actions" aria-label="${escape(t.at)}">
          ${heroActions(data)}
        </nav>
      </section>
    </main>
  </div>

  <dialog id="world" class="world" aria-labelledby="world-title" open>
    <div class="world-hud" aria-label="${escape(t.controls)}">
      <div class="hud-left">
        <button class="world-close" type="button" id="world-close" aria-label="${escape(t.close)}" title="${escape(t.close)}" autofocus hidden>${icon('close')}</button>
        ${localeLink}
      </div>
      <div class="hud-index mono" aria-hidden="true"><span id="district-name"></span><span id="world-counter">01 / ${story.length}</span></div>
    </div>
    <div class="world-scroll" id="world-scroll" tabindex="0" role="region" aria-label="${escape(t.region)}">
      <h2 class="sr-only" id="world-title">${escape(t.world)}</h2>
      <div class="world-route" id="world-route">
        <figure class="world-stage" id="world-stage" aria-hidden="false">
          <div class="viewport" id="world-viewport"></div>
          <div class="pin-layer">
            ${mapPins(story)}
          </div>
        </figure>
        <div class="stops">${contentCards(story)}</div>
      </div>
    </div>
    <div class="world-footer">
      <button class="read-mode mono" type="button" id="read-mode" hidden>${escape(t.read)}</button>
      <span class="scroll-hint mono" aria-hidden="true">${escape(t.scroll)}</span>
      <div class="world-arrows" aria-label="${escape(t.controls)}">
        <button type="button" data-step="-1" aria-label="${escape(t.previous)}" title="${escape(t.previous)}" hidden>${icon('up')}</button>
        <button type="button" data-step="1" aria-label="${escape(t.next)}" title="${escape(t.next)}" hidden>${icon('down')}</button>
      </div>
    </div>
    <div class="world-portal" aria-hidden="true">
      <svg viewBox="0 0 250 200" fill="none"><path d="M25 30h200v140H25zM25 95h200M108 30v140m56-140v140M25 126h200M58 30v65" stroke="currentColor" stroke-width="1.2"/><path d="M64 147h24v12H64zm62-92h20v22h-20zm54 47h27v17h-27z" fill="currentColor"/><path d="M25 30h28m-28 0v26m200 114h-25m25 0v-26" stroke="#dbe8ac" stroke-width="3"/></svg>
      <span class="mono">${escape(t.portal)}</span>
    </div>
  </dialog>
  <script type="application/json" id="portfolio-snapshot">${snapshot}</script>`;
  return html.replace('<!-- portfolio-meta -->', () => meta).replace('<!-- portfolio-content -->', () => content).replace(/[ \t]+$/gm, '');
}
