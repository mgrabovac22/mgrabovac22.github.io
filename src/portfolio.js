const recordGroups = ['sections', 'experience', 'education', 'projects', 'skills'];
const textLists = ['credentials', 'volunteering', 'languages', 'softSkills', 'interests'];
const stopIds = ['about', 'career', 'education', 'projects', 'qualifications', 'contact'];
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function localAsset(path) {
  if (typeof path !== 'string' || !/^[\w./-]+$/.test(path) || path.startsWith('/') || path.split('/').includes('..')) {
    throw new Error('Expected a local portfolio asset path.');
  }
  return './' + path;
}

export function safeLink(value) {
  if (typeof value !== 'string') return '';
  if (/^https?:\/\/[^/\s]/i.test(value) || /^mailto:[^\s]+$/i.test(value)) return value;
  return /^\.\/(?![\\/])[\w./-]+$/.test(value) ? value : '';
}

export function getLocale(source, requestedLanguage) {
  const language = requestedLanguage === 'hr' ? 'hr' : 'en';
  const localize = ({ en, hr, ...shared }) => ({ ...shared, ...en, ...(language === 'hr' ? hr : null) });
  const profile = localize(source.profile);
  if (!profile.name || !source.copy?.[language]?.studio || !source.copy?.[language]?.drive ||
      !Array.isArray(source.homepage?.featuredProjects) || !Array.isArray(source.homepage?.technologies)) {
    throw new Error('Portfolio data is incomplete.');
  }
  localAsset(profile.cv?.file);
  localAsset(profile.portrait?.image);
  const records = Object.fromEntries(recordGroups.map(key => [key, source[key].map(localize)]));
  const { sections, ...groups } = records;
  if (sections.length !== stopIds.length || stopIds.some(id => !sections.some(section => section.id === id)) ||
      Object.values(records).flat().some(item => typeof item.id !== 'string' || !slug.test(item.id))) {
    throw new Error('Portfolio sections and entries must have valid IDs.');
  }
  const titles = Object.fromEntries(textLists.map(key => {
    const list = source[key][language] ?? source[key].en;
    if (!Array.isArray(list)) throw new Error('Expected a portfolio list for ' + key);
    return [key, list];
  }));
  const towers = source.towers.filter(tower => typeof tower.mark === 'string' && Number.isInteger(tower.level) && tower.level >= 1 && tower.level <= 3);
  return { language, profile, ...groups, ...titles, stops: sections, towers, homepage: source.homepage, t: source.copy[language] };
}

export async function loadPortfolio(language) {
  const response = await fetch('./portfolio.json', { cache: 'no-cache', signal: AbortSignal.timeout(4500) });
  if (!response.ok) throw new Error('Portfolio data is unavailable.');
  return getLocale(await response.json(), language);
}
