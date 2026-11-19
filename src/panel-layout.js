import { routeStep } from './story.js';

const panelColumns = 1160;
const panelBottom = 770;
const pageFonts = [1, .93, .86, .80];
const smallest = pageFonts.at(-1);
const styles = {
  title: { size: 78, weight: 800, gap: 9, role: 'title', limit: 2 },
  meta: { size: 42, weight: 700, gap: 15, role: 'accent', limit: 2 },
  body: { size: 45, weight: 400, gap: 13, role: 'body' },
  point: { size: 42, weight: 400, gap: 8, role: 'body', indent: 33 },
  tags: { size: 40, weight: 700, gap: 0, role: 'accent' },
};

export function wrapText(text, measure, width) {
  const lines = [];
  let line = '';
  for (const word of String(text ?? '').trim().split(/\s+/u)) {
    if (!word) continue;
    const joined = line ? line + ' ' + word : word;
    if (measure(joined) <= width) {
      line = joined;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    if (measure(word) <= width) {
      line = word;
      continue;
    }
    for (const character of word) {
      if (line && measure(line + character) > width) {
        lines.push(line);
        line = '';
      }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function ellipsis(text, measure, width) {
  const characters = Array.from(text.trimEnd());
  while (characters.length && measure(characters.join('') + '…') > width) characters.pop();
  return characters.join('').trimEnd() + '…';
}

function paragraph(context, field, text, scale) {
  const style = styles[field];
  const size = Math.round(style.size * scale);
  const font = style.weight + ' ' + size + 'px Arial, sans-serif';
  context.font = font;
  const width = panelColumns - (style.indent ?? 0);
  const measure = value => context.measureText(value).width;
  const lines = wrapText(text, measure, width);
  if (style.limit && lines.length > style.limit) {
    lines.length = style.limit;
    lines[lines.length - 1] = ellipsis(lines.at(-1), measure, width);
  }
  return { ...style, font, size, lines };
}

function panelRows(context, page, scale) {
  let y = 151;
  const rows = [];
  function add(field, text) {
    const { font, size, gap, role, indent = 0, lines } = paragraph(context, field, text, scale);
    for (const [i, value] of lines.entries()) {
      rows.push({ value, x: 60 + indent, y, font, role, bullet: field === 'point' && i === 0 });
      y += size * 1.24;
    }
    if (lines.length) y += gap;
  }
  add('title', page.title);
  add('meta', [page.meta, page.date].filter(Boolean).join('  ·  '));
  add('body', page.body);
  for (const point of page.points ?? []) add('point', point);
  add('tags', page.tags?.join('   ·   '));
  return { rows, fits: y <= panelBottom };
}

function fitPanel(context, page) {
  for (const scale of pageFonts) {
    const { rows, fits } = panelRows(context, page, scale);
    if (fits) return rows;
  }
  return null;
}

function paginate(context, page, sentences) {
  const full = fitPanel(context, page);
  if (full && page.links.length <= 4) return [{ ...page, floorRows: full }];

  const lines = (field, text) => paragraph(context, field, text, smallest).lines;
  const { body, points, tags, links, ...heading } = page;
  const description = String(body ?? '').trim();
  const bodyParts = sentences ? Array.from(sentences.segment(description), part => part.segment.trim()) : [description];
  const prose = bodyParts.filter(Boolean).flatMap(text =>
    panelRows(context, { ...heading, body: text }, smallest).fits ? [text] : lines('body', text));
  const units = [
    ...prose.map(text => ({ field: 'body', text })),
    ...(points ?? []).flatMap((point, index) =>
      lines('point', point).map(text => ({ field: 'point', text, index }))),
    ...(tags ?? []).flatMap(tag => lines('tags', tag).map(text => ({ field: 'tag', text }))),
    ...links.map(action => ({ field: 'link', action })),
  ];
  const owner = page.entryId ?? page.id;
  const result = [];
  function content(items) {
    const continuation = result.length > 0;
    const draft = {
      ...heading,
      body: items.filter(item => item.field === 'body').map(item => item.text).join(' '),
      tags: items.filter(item => item.field === 'tag').map(item => item.text),
      links: items.filter(item => item.field === 'link').map(item => item.action),
    };
    const bullets = new Map();
    for (const { field, text, index } of items) if (field === 'point') {
      bullets.set(index, bullets.has(index) ? bullets.get(index) + ' ' + text : text);
    }
    draft.points = [...bullets.values()];
    if (continuation) Object.assign(draft, {
      id: owner + '--panel-' + (result.length + 1), entryId: undefined, panelOwner: owner,
      meta: undefined, date: undefined, first: false, towers: undefined,
    });
    return draft;
  }
  let items = [];
  for (const unit of units) {
    const next = [...items, unit];
    const draft = content(next);
    if (items.length && (draft.links.length > 4 || !panelRows(context, draft, smallest).fits)) {
      const current = content(items);
      result.push({ ...current, floorRows: fitPanel(context, current) });
      items = [unit];
    } else items = next;
  }
  const last = content(items);
  result.push({ ...last, floorRows: fitPanel(context, last) });
  return result.map((part, index) => ({ ...part, panelNumber: index + 1, panelCount: result.length }));
}

export function officePanels(entries, context, language) {
  const sentences = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(language, { granularity: 'sentence' }) : null;
  const pages = entries.flatMap(page => paginate(context, page, sentences));
  const totals = new Map();
  for (const page of pages) totals.set(page.chapterId, (totals.get(page.chapterId) ?? 0) + 1);
  const indexes = new Map();
  return pages.map((page, index) => {
    const order = (indexes.get(page.chapterId) ?? 0) + 1;
    indexes.set(page.chapterId, order);
    return { ...page, index: order, total: totals.get(page.chapterId), position: routeStep.map(step => step * index) };
  });
}
