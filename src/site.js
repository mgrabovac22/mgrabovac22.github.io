import { profile, projects, skills, experience, education, towers, credentials, volunteering, languages, softSkills, interests, stops, number } from './data.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const asset = path => './' + path;
const icons = {
  arrow: '<path d="M3 8h10m-4-4 4 4-4 4"/>',
  diagonal: '<path d="M4 12 12 4M5 4h7v7"/>',
  down: '<path d="M8 3v10m-4-4 4 4 4-4"/>',
  download: '<path d="M8 2.5v7m-3-3 3 3 3-3M3 10.5v2.8h10v-2.8"/>',
  close: '<path d="m4 4 8 8m0-8-8 8"/>',
};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">${icons[name]}</svg>`;
const link = (label, href, symbol = 'diagonal', className = 'text-link') =>
  `<a class="${className}" href="${escape(href)}"><span>${escape(label)}</span>${icon(symbol)}</a>`;
const cv = className => `<a class="${className}" href="${escape(asset(profile.cv.file))}" download><span>Download CV</span>${icon('download')}</a>`;
const list = (items, className = 'bullets') => items?.length
  ? `<ul class="${className}">${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`
  : '';
const group = (title, items, className) => `<div class="detail-group"><h4>${escape(title)}</h4>${list(items, className)}</div>`;
const entry = (item, index) => `<article class="entry" id="${escape(item.id)}">
  <p class="mono entry-index"><span>${number(index)}</span><span>${escape(item.dates || item.type)}</span></p>
  <h4>${escape(item.title || item.name)}</h4>
  ${item.organization ? `<p class="entry-org">${escape(item.organization)}</p>` : ''}
  <p>${escape(item.description)}</p>
  ${list(item.points)}
  ${list(item.stack, 'tags')}
  ${item.github ? `<div class="entry-links">${link('View source', item.github)}</div>` : ''}
</article>`;

function details(id) {
  switch (id) {
    case 'about': return [
      group('Where I focus', ['Software development and quality assurance at MT-lab', 'Software engineering and information systems at FOI', 'Web, Android and desktop applications']),
      group('How I work', softSkills, 'tags'),
      group('Outside of code', interests, 'tags'),
      group('Languages', languages),
    ].join('');
    case 'projects': return projects.map(entry).join('');
    case 'qualifications': return `
      <div class="detail-group"><h4>Technology columns</h4><ul class="tower-list">${towers.map(tower => `<li><b>${escape(tower.mark)}</b><span>${escape(tower.name)}</span><span class="mono">${tower.level} / 3 stars</span></li>`).join('')}</ul></div>
      ${skills.map(skill => group(skill.title, skill.items, 'tags')).join('')}
      ${group('Certificates & distinctions', credentials)}`;
    case 'career': return experience.map(entry).join('');
    case 'education': return education.map(entry).join('') + group('Volunteering', volunteering);
    case 'contact': return `<div class="contact-links">${link('Email', 'mailto:' + profile.email)}${link('LinkedIn', profile.linkedin)}${link('GitHub', profile.github)}${cv('button button-outline')}</div>`;
    default: return '';
  }
}

const officePlan = `<div class="world-fallback" aria-hidden="true">
  <svg viewBox="0 0 650 490" fill="none">
    <path d="M39 254 252 74l357 138-210 184z" fill="#d6d8c8" stroke="#909987" stroke-width="2"/>
    <path d="m67 258 333 122 185-163M119 211l337 125m-274-177 332 126m-267-181 327 129M182 133l347 130M122 304l211-183m-122 219 208-180m-116 213 208-181" stroke="#b2bca6" stroke-width="2"/>
    <path d="m113 247 80-71 89 34-80 73zm145-100 48-43 116 42-48 45zm-21 148 53-48 84 32-54 49zm159 6 53-46 96 34-53 46z" fill="#a7b589" stroke="#79896f" stroke-width="2"/>
    <path d="m159 218 63 23 87-72 88 32-76 68 90 32 85-75" stroke="#4f644a" stroke-width="3" stroke-dasharray="5 8"/>
    <path d="M76 345h20m-10-10v20m463-197h20m-10-10v20" stroke="#879982" stroke-width="2"/>
  </svg><span class="mono">OFFICE PLAN</span></div>`;

export function renderSite(html) {
  const name = escape(profile.name);
  const title = `${name} — Developer Portfolio`;
  const description = 'Explore Marin Grabovac’s projects, career and qualifications in an interactive 3D office.';
  const meta = `<title>${title}</title>
    <meta name="description" content="${description}">
    <link rel="canonical" href="${escape(profile.url)}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${escape(profile.url)}">
    <meta property="og:image" content="${escape(profile.url)}art/social.png">
    <meta name="twitter:card" content="summary_large_image">`;
  const content = `
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="home-shell">
    <header class="site-header">
      <div class="shell header-inner">
        <a href="#home" class="wordmark" aria-label="${name}, home"><img src="/art/mark.svg" alt="" width="34" height="34"><span>${name}</span></a>
        ${cv('button button-cv')}
      </div>
    </header>
    <main id="main">
      <section class="shell hero" id="home" aria-labelledby="hero-title">
        <div class="hero-main">
          <div class="hero-copy">
            <p class="eyebrow mono"><span class="signal" aria-hidden="true"></span> Interactive developer portfolio</p>
            <h1 id="hero-title"><span>${escape(profile.firstName)}</span> <span>${escape(profile.lastName)}<i>.</i></span></h1>
            <p class="hero-role">${escape(profile.role)}</p>
            <p class="hero-intro">${escape(profile.intro)}</p>
            <nav class="hero-actions" aria-label="Explore the portfolio">
              ${link('Learn about me', '#about', 'diagonal', 'button button-primary')}
              <div class="hero-shortcuts">
                ${link('Career', '#career', 'diagonal', 'text-link')}
                ${link('Projects', '#projects', 'diagonal', 'text-link')}
                ${link('Qualifications', '#qualifications', 'diagonal', 'text-link')}
              </div>
            </nav>
          </div>
          <figure class="hero-art" aria-label="Developer’s desk study">
            <div class="art-field">
              <div class="art-top mono"><span>FIG. 01 <b> / </b> THE WORKBENCH</span><span>DESK STUDY</span></div>
              <div class="art-grid" aria-hidden="true"></div>
              <svg class="drafting" viewBox="0 0 700 460" preserveAspectRatio="none" fill="none" aria-hidden="true">
                <path d="M34 66v-15h15m612 0h15v15M34 396v15h15m612 0h15v-15M54 344h595M347 70v322"/>
                <path class="draft-orbit" d="M69 288C92 208 270 134 477 127c164-6 224 48 171 105-72 78-279 135-441 126-102-6-159-24-138-70Z"/>
                <path d="M63 369h45m-45 6h23m475-267h66m-35 6h35"/>
                <path class="draft-signal" d="M42 128h13m-6.5-6.5v13m609 208h13m-6.5-6.5v13M293 89h9m-4.5-4.5v9"/>
              </svg>
              <div class="desk-sweep" aria-hidden="true"></div>
              <div class="laptop" id="laptop-visual">
                <img src="/art/laptop.svg" alt="" class="laptop-fallback" width="600" height="490" fetchpriority="high">
              </div>
              <div class="portrait" id="portrait" data-drawing="${escape(asset(profile.portrait.drawing))}"${profile.portrait.image ? ` data-photo="${escape(asset(profile.portrait.image))}"` : ''}>
                <div class="portrait-top mono"><span>MG / 01</span><span>+</span></div>
                <img src="${escape(asset(profile.portrait.drawing))}" alt="${profile.portrait.isPlaceholder ? 'Abstract placeholder for the portrait' : 'Line portrait of ' + name}" class="portrait-fallback">
                <div class="portrait-footer mono">${profile.portrait.isPlaceholder ? 'Portrait study · Placeholder' : 'Portrait study · Graphite'}</div>
              </div>
              <div class="art-readout mono" aria-hidden="true"><span class="signal"></span><span id="art-status">DESK STUDY</span></div>
              <button type="button" class="skip-intro mono" id="skip-intro" hidden>Skip intro ${icon('arrow')}</button>
            </div>
            <figcaption class="art-caption mono"><span>01 / A desk in motion</span><span>PROCEDURAL 3D <b>+</b> INK</span></figcaption>
          </figure>
        </div>
        <div class="hero-footer mono">
          <span><span class="signal"></span> OPEN A LEVEL TO EXPLORE</span>
          <span class="hero-footer-center">${name} · Software development &amp; QA</span>
          <span>WORKBENCH <b>/</b> 01</span>
        </div>
      </section>
    </main>
  </div>

  <dialog id="world" class="world" aria-labelledby="world-title" open>
    <div class="world-interior">
      <aside class="level-rail" aria-label="World controls">
        <button class="world-close" type="button" id="world-close" aria-label="Close portfolio world" autofocus hidden>${icon('close')}<span>Close</span></button>
        <div class="level-heading mono"><span class="signal"></span> LEVELS</div>
        <nav class="route-nav" aria-label="Portfolio levels">
          ${stops.map((stop, index) => `<a href="#${stop.id}"${index === 0 ? ' aria-current="location"' : ''}><span class="mono">${number(index)}</span><span>${stop.title}</span></a>`).join('')}
        </nav>
        <div class="level-counter mono"><span id="current-level">01</span><b>/</b> 06</div>
      </aside>
      <div class="world-scroll" id="world-scroll" tabindex="0" role="region" aria-label="Scroll through the portfolio levels">
        <h2 class="sr-only" id="world-title">The Portfolio World</h2>
        <div class="world-route" id="world-route">
          <figure class="world-stage" id="world-stage">
            <div class="stage-top mono"><span><span class="signal"></span> THE PORTFOLIO WORLD</span><span>OFFICE FLOOR / 01</span></div>
            <div class="viewport" id="world-viewport">
              ${officePlan}
              <span class="stage-cross cross-one" aria-hidden="true">+</span><span class="stage-cross cross-two" aria-hidden="true">+</span>
              <div class="stage-label mono" aria-hidden="true"><span id="stage-number">01</span><span id="stage-place">THE STUDIO</span></div>
              <span id="exhibit-hint" class="exhibit-hint mono" aria-hidden="true" hidden></span>
            </div>
            <figcaption class="stage-caption mono"><span><span class="signal"></span> CONTINUOUS OFFICE</span><span>SCROLL TO TRAVEL ${icon('down')}</span></figcaption>
            <div class="stage-progress" aria-hidden="true"><span id="stage-progress"></span></div>
          </figure>
          <div class="stops">
            ${stops.map((stop, index) => `<section id="${stop.id}" class="stop" tabindex="-1" aria-labelledby="${stop.id}-title">
              <div class="stop-content">
                <p class="eyebrow mono">LEVEL ${number(index)} <b>/</b> ${escape(stop.place)}</p>
                <h3 id="${stop.id}-title">${stop.title}<i>.</i></h3>
                <p class="stop-tag mono">${escape(stop.tag)}</p>
                <p class="stop-description">${escape(stop.description)}</p>
                <button class="text-link exhibit-link" type="button" data-exhibit="${index}" hidden>Inspect ${escape(stop.exhibit.toLowerCase())} ${icon('diagonal')}</button>
                <div class="stop-details" id="${stop.id}-details">${details(stop.id)}</div>
              </div>
            </section>`).join('')}
          </div>
        </div>
      </div>
    </div>
  </dialog>

  <dialog class="exhibit-dialog" id="exhibit-dialog" aria-labelledby="exhibit-title">
    <form method="dialog"><button class="icon-button" aria-label="Close exhibit">${icon('close')}</button></form>
    <p class="eyebrow mono" id="exhibit-label"></p>
    <h2 id="exhibit-title"></h2>
    <p id="exhibit-content"></p>
    <a class="text-link" href="#about" id="exhibit-anchor">Read this level ${icon('arrow')}</a>
  </dialog>`;
  return html.replace('<!-- portfolio-meta -->', meta).replace('<!-- portfolio-content -->', content).replace(/[ \t]+$/gm, '');
}
