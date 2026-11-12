import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

mkdirSync('scripts/.cache', { recursive: true });
const outfile = resolve('scripts/.cache/l2-security.mjs');
await build({ stdin: { contents: `
export { ALL_QUESTIONS } from './src/data/questionsData';
export { getQuestionDeepDive } from './src/data/questionExplanations';
export { APPLIED_INDIVIDUAL_DEEP } from './src/data/questionExplanationsApplied';
export { LESSONS, getLessonForQuestion } from './src/data/lessons';
export { PRACTICE_DESTINATIONS } from './src/data/practiceLinks';
export { GLOSSARY_TOOLTIPS } from './src/data/glossary';
export { splitGlossaryText } from './src/utils/glossaryText';
`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent' });
const data = await import(pathToFileURL(outfile).href);
const raw = JSON.parse(readFileSync('src/data/questions.json', 'utf8'));
const ids = Array.from({ length: 20 }, (_, i) => `l2-sec-${String(i + 1).padStart(2, '0')}`);
assert.equal(raw.filter(q => q.id.startsWith('l2-sec-')).length, 20);
for (const id of ids) {
  const q = raw.find(q => q.id === id);
  assert.equal(data.ALL_QUESTIONS.filter(q => q.id === id).length, 1);
  assert.equal(q.group, 'l1-l2');
  assert.ok(['applied', 'advanced'].includes(q.difficulty));
  assert.equal(q.correct.length, 1);
  assert.ok(q.answers[q.correct[0]]);
  assert.ok(q.text && q.explanation && q.topic && q.hashtags.length >= 2);
  const entry = data.APPLIED_INDIVIDUAL_DEEP[id];
  assert.ok(entry.brief && entry.trap && entry.pro);
  assert.equal(entry.plain.split(/\n\s*\n/).length, 3);
  assert.equal(entry.deep, entry.plain);
  const view = data.getQuestionDeepDive(q);
  assert.ok(view.hasIndividualDeep && view.professional?.deep);
  if (entry.practiceLink) {
    assert.ok(data.PRACTICE_DESTINATIONS[entry.practiceLink]);
    assert.equal(view.practiceLink, entry.practiceLink);
  }
  const lesson = data.getLessonForQuestion(id);
  assert.ok(lesson?.professional?.blocks.length);
  assert.equal(data.LESSONS.filter(l => l.relatedQuestionIds.includes(id)).length, 1);
}
for (const term of ['DTP', 'double tagging', 'VLAN hopping', 'BPDU Guard', 'Root Guard', 'Loop Guard', 'MSTP', 'MSTI', 'CIST', 'secure MAC', 'restrict', 'protect', 'sticky', '802.1X', 'EAP', 'PVID', 'ASIC', 'Option 82']) {
  assert.ok(data.GLOSSARY_TOOLTIPS[term], term);
  assert.ok(data.splitGlossaryText(`Проверка: ${term}.`).some(p => p.term === term), term);
}
console.log('PASS: 20 L2 security questions, three-paragraph dual explanations, lesson links, live practice destinations and tooltip matching');
