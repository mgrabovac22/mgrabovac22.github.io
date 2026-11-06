import { getLocale } from './locale.js';

export const routeStep = [18.3, -11.8];

export function createStory(language) {
  const data = getLocale(language);
  const { profile, t } = data;
  const detail = item => ({
    id: item.id, title: item.title || item.name, meta: item.organization || item.type, date: item.dates,
    body: item.description, points: item.points, tags: item.stack,
    links: item.github ? [{ label: t.source, href: item.github, icon: 'GH' }] : [],
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
      { title: t.tools, body: data.stops.find(stop => stop.id === 'qualifications').description, tags: data.towers.map(tower => tower.mark + ' · ' + '★'.repeat(tower.level)) },
      ...data.skills.map((group, index) => ({ id: 'skills-' + (index + 1), title: group.title, tags: group.items })),
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
        { label: t.cv, href: './' + profile.cv.file, icon: 'CV', download: true },
      ],
    }],
  };

  return data.stops.flatMap((stop, chapter) => pages[stop.id].map((page, index) => {
    return {
      ...page, chapter, chapterTitle: stop.title, district: stop.place, first: index === 0,
      id: index === 0 ? stop.id : page.id,
      links: page.links || [],
      index: index + 1, total: pages[stop.id].length,
    };
  })).map((page, index) => ({ ...page, position: routeStep.map(step => step * index) }));
}
