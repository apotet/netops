import { GLOSSARY_TOOLTIPS } from '../data/glossary';

const terms = Object.keys(GLOSSARY_TOOLTIPS).sort((a, b) => b.length - a.length);
const canonical = new Map(terms.map(term => [term.toLowerCase(), term]));
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])(${terms.map(escape).join('|')})(?![\\p{L}\\p{N}_])`, 'giu');

export function splitGlossaryText(text: string): { text: string; term?: string }[] {
  const parts: { text: string; term?: string }[] = [];
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > offset) parts.push({ text: text.slice(offset, match.index) });
    parts.push({ text: match[0], term: canonical.get(match[0].toLowerCase()) });
    offset = match.index + match[0].length;
  }
  if (offset < text.length) parts.push({ text: text.slice(offset) });
  return parts;
}
