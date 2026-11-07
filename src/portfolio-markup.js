export const escape = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const icons = {
  diagonal: '<path d="M4 12 12 4M5 4h7v7"/>',
  down: '<path d="M8 3v10m-4-4 4 4 4-4"/>',
  up: '<path d="M8 13V3m-4 4 4-4 4 4"/>',
  download: '<path d="M8 2.5v7m-3-3 3 3 3-3M3 10.5v2.8h10v-2.8"/>',
  close: '<path d="m4 4 8 8m0-8-8 8"/>',
  wheel: '<circle cx="8" cy="8" r="5.4"/><path d="m3 7 5 1.7L13 7M8 8.7v4.7"/>',
};
export const icon = name => `<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.35">${icons[name]}</svg>`;
const link = (label, href, mark = 'diagonal', style = 'text-link') =>
  `<a class="${style}" href="${escape(href)}"><span>${escape(label)}</span>${icon(mark)}</a>`;
const list = (items, className) => items?.length
  ? `<ul class="${className}">${items.map(item => `<li>${escape(item)}</li>`).join('')}</ul>`
  : '';
const pageNumber = index => String(index + 1).padStart(2, '0');

export function external(action, classes = '', content = escape(action.label) + ' ' + icon(action.download ? 'download' : 'diagonal')) {
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
      <h3 id="${page.id}-title" tabindex="-1">${escape(page.title)}</h3>
      ${page.meta || page.date ? `<p class="fallback-meta">${escape([page.meta, page.date].filter(Boolean).join(' · '))}</p>` : ''}
      ${page.body ? `<p>${escape(page.body)}</p>` : ''}
      ${list(page.points, 'fallback-points')}${list(page.tags, 'fallback-tags')}
      ${page.links.length ? `<div class="fallback-links">${page.links.map(action => external(action, 'text-link')).join('')}</div>` : ''}
    </article>
  </section>`;
}

export const profileProjects = data => data.homepage.featuredProjects
  .map(id => data.projects.find(project => project.id === id))
  .filter(Boolean);

export function profileSummary(data) {
  const { profile, homepage } = data;
  return [profile.role, profile.current, profile.focus, ...profileProjects(data).map(project => project.name),
    ...homepage.technologies].filter(Boolean).map(escape).join(' · ');
}

export function screenContent(data) {
  const { profile, t, homepage } = data;
  const featured = profileProjects(data);
  return `<div class="screen-kicker"><i></i> M/G <b> / </b> PORTFOLIO <span>01 — ${escape(t.profile.toUpperCase())}</span></div>
    <div class="screen-name">${escape(profile.name)}</div>
    <div class="screen-role">${escape(profile.role)}</div>
    <div class="screen-facts">
      <div class="screen-detail"><span>${escape(t.educationLabel)}</span>${escape(profile.current)}</div>
      <div class="screen-detail"><span>${escape(t.workLabel)}</span>${escape(profile.focus)}</div>
    </div>
    ${featured.length ? `<div class="screen-detail screen-projects"><span>${escape(t.selectedProjects)}</span>${featured.map(project => escape(project.name)).join(' · ')}</div>` : ''}
    <div class="screen-stack">${homepage.technologies.map(technology => `<span>${escape(technology)}</span>`).join('')}<i class="screen-light"></i></div>`;
}

export function heroActions({ language, t, stops }) {
  return `${link(t.about, '#about', 'diagonal', 'hero-primary')}
    ${link(t.explore, language === 'hr' ? './drive.html?lang=hr' : './drive.html', 'wheel', 'hero-primary drive-link')}
    ${stops.filter(stop => !['about', 'contact'].includes(stop.id)).map(stop => link(stop.title, '#' + stop.id)).join('')}`;
}

export const contentCards = story => story.map(contentCard).join('');
export const mapPins = story => story.flatMap(page => page.links.map((action, index) =>
  `<span data-pin="${page.id}-${index}">${waypoint(action)}</span>`)).join('');
