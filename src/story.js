import { localAsset, safeLink } from './portfolio.js';

export const routeStep = [18.3, 11.8];

export function storyIndexForHash(pages, hash) {
  const id = hash.slice(1);
  const index = pages.findIndex(page => page.id === id || page.entryId === id);
  if (index >= 0) return index;
  const entry = id.match(/^(.+)--panel-\d+$/)?.[1];
  return entry ? pages.findIndex(page => page.id === entry || page.entryId === entry) : -1;
}

export function createStory(data) {
  const { profile, t } = data;
  const detail = item => ({
    id: item.id, title: item.title || item.name, meta: item.organization || item.type, date: item.dates,
    body: item.description, points: item.points, tags: item.stack,
    links: [
      ...(item.website ? [{ label: t.website, href: item.website }] : []),
      ...(Array.isArray(item.links) ? item.links : []),
    ],
  });
  const pages = {
    about: [
      { title: profile.name, meta: profile.role, body: profile.about, tags: [profile.current, profile.focus], links: [
        { label: t.linkedin, href: profile.linkedin, icon: 'IN' },
        { label: t.github, href: profile.github, icon: 'GH' },
      ] },
      { id: 'profile-notes', title: t.profile, meta: t.languages, points: data.languages, tags: [...data.softSkills, ...data.interests] },
    ],
    career: data.experience.map(detail),
    projects: data.projects.map(detail),
    qualifications: [
      { title: t.tools, body: data.stops.find(stop => stop.id === 'qualifications').description, tags: data.towers.map(tower => tower.mark + ' · ' + '★'.repeat(tower.level)), towers: data.towers },
      ...data.skills.map(group => ({ id: group.id, title: group.title, tags: group.items })),
      { id: 'credentials', title: t.certificates, points: data.credentials },
    ],
    education: [
      ...data.education.map(detail),
      { id: 'volunteering', title: t.volunteering, points: data.volunteering },
    ],
    contact: [{
      title: profile.name, meta: profile.focus,
      body: data.stops.find(stop => stop.id === 'contact').description,
      links: [
        { label: t.linkedin, href: profile.linkedin, icon: 'IN' },
        { label: t.github, href: profile.github, icon: 'GH' },
        { label: t.email, href: 'mailto:' + profile.email, icon: '@' },
        { label: t.cv, href: localAsset(profile.cv.file), icon: 'CV', download: true },
      ],
    }],
  };

  const route = data.stops.flatMap((stop, chapter) => {
    const entries = [...pages[stop.id], ...(data.panels ?? []).filter(panel => panel.section === stop.id).map(detail)];
    if (!entries.length) entries.push({ title: stop.title, body: stop.description });
    return entries.map((page, index) => ({
      ...page, title: page.title || stop.title, chapter, chapterId: stop.id, chapterTitle: stop.title, district: stop.place, first: index === 0,
      id: index === 0 ? stop.id : page.id,
      entryId: index === 0 && page.id !== stop.id ? page.id : undefined,
      links: (page.links || []).filter(action => safeLink(action?.href)).map(action => ({
        href: action.href, label: action.label || t.website, icon: action.icon, download: action.download === true,
      })),
      index: index + 1, total: entries.length,
    }));
  });
  const routeIds = route.flatMap(page => page.entryId ? [page.id, page.entryId] : [page.id]);
  if (new Set(routeIds).size !== routeIds.length) throw new Error('Portfolio story IDs must be unique.');
  return route.map((page, index) => ({ ...page, position: routeStep.map(step => step * index) }));
}
