import { localAsset, safeLink } from './portfolio.js';

export const routeStep = [18.3, 11.8];

export function storyIndexForHash(pages, hash) {
  const id = hash.slice(1);
  return pages.findIndex(page => page.id === id || page.entryId === id);
}

export function createStory(data) {
  const { profile, t } = data;
  const website = item => safeLink(item.website);
  const detail = item => ({
    id: item.id, title: item.title || item.name, meta: item.organization || item.type, date: item.dates,
    body: item.description, points: item.points, tags: item.stack,
    links: website(item) ? [{ label: t.website, href: website(item) }] : [],
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
    const entries = pages[stop.id].length ? pages[stop.id] : [{ title: stop.title, body: stop.description }];
    return entries.map((page, index) => ({
      ...page, chapter, chapterId: stop.id, chapterTitle: stop.title, district: stop.place, first: index === 0,
      id: index === 0 ? stop.id : page.id,
      entryId: index === 0 && page.id !== stop.id ? page.id : undefined,
      links: (page.links || []).filter(action => safeLink(action.href)),
      index: index + 1, total: entries.length,
    }));
  });
  const routeIds = route.flatMap(page => page.entryId ? [page.id, page.entryId] : [page.id]);
  if (new Set(routeIds).size !== routeIds.length) throw new Error('Portfolio story IDs must be unique.');
  return route.map((page, index) => ({ ...page, position: routeStep.map(step => step * index) }));
}
