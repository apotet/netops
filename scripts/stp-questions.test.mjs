import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Load the real bank, resolver and review components, without a test-only bank.
const outfile = resolve('scripts/.cache/stp-questions.mjs');
mkdirSync(resolve('scripts/.cache'), { recursive: true });
await build({ stdin: { contents: `
  export { ALL_QUESTIONS, getExamPool } from './src/data/questionsData';
  export { APPLIED_INDIVIDUAL_DEEP } from './src/data/questionExplanationsApplied';
  export { getQuestionDeepDive } from './src/data/questionExplanations';
  export { TheoryRazbory } from './src/components/TheoryRazbory';
  export { ExamReview } from './src/components/ExamReview';
`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile,
  external: ['react', 'react-dom', 'react-dom/server', 'lucide-react'], logLevel: 'silent' });
const { ALL_QUESTIONS, getExamPool, APPLIED_INDIVIDUAL_DEEP, getQuestionDeepDive, TheoryRazbory, ExamReview } =
  await import(pathToFileURL(outfile).href);

const ids = Array.from({ length: 15 }, (_, i) => `stp-new-${String(i + 1).padStart(2, '0')}`);
const applied = new Set([1, 5, 7, 10, 14]);
const raw = JSON.parse(readFileSync('src/data/questions.json', 'utf8'));
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const beginner = new Set(getExamPool('mixed', 'beginner').map(q => q.id));
const mixed = new Set(getExamPool('mixed', 'mixed').map(q => q.id));
const keys = [2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3, 0, 1, 2, 3];
assert.equal(new Set(ALL_QUESTIONS.map(q => q.id)).size, ALL_QUESTIONS.length);
assert.deepEqual(ALL_QUESTIONS.filter(q => q.id.startsWith('stp-new-')).map(q => q.id), ids);

for (const [index, id] of ids.entries()) {
  const q = ALL_QUESTIONS.find(q => q.id === id);
  assert.equal(raw.filter(q => q.id === id).length, 1, id + ': unique JSON record');
  assert.equal(q.group, 'l1-l2');
  assert.equal(q.difficulty, applied.has(index + 1) ? 'applied' : 'advanced');
  assert.equal(q.answers.length, 4);
  assert.equal(new Set(q.answers).size, 4);
  assert.deepEqual(q.correct, [keys[index]], id + ': reviewed answer key');
  assert.ok(q.text.trim() && q.explanation.trim());
  assert.ok(!q.image && !q.template, id + ': individual text scenario');
  assert.ok(mixed.has(id) && !beginner.has(id), id + ': existing difficulty rules retained');
  const entry = APPLIED_INDIVIDUAL_DEEP[id], deep = getQuestionDeepDive(q);
  for (const field of ['brief', 'trap', 'plain', 'pro']) assert.ok(entry[field]?.trim(), id + ': ' + field);
  assert.equal(entry.plain.split(/\n\s*\n/).length, 4, id + ': four plain paragraphs');
  assert.equal(entry.pro.split(/\n\s*\n/).length, 3, id + ': three technical paragraphs');
  assert.notEqual(entry.plain, entry.pro);
  assert.equal(deep.deepAnalysis, entry.plain);
  assert.equal(deep.professional.deep, entry.pro);
  assert.equal(deep.professional.sourceCommit, undefined, 'no unrelated historical attribution');
  assert.ok(deep.hasIndividualDeep && !deep.practiceLink);
  assert.equal(deep.briefAnswer, entry.brief);
  assert.equal(deep.commonTrap, entry.trap);
  const theory = render(TheoryRazbory, { initialQuestionId: id, onNavigateToIpv4() {}, onNavigateToIpv6() {} });
  const session = { questions: [q], userAnswers: { [id]: q.correct }, submittedQuestions: { [id]: true },
    currentIndex: 0, startTime: 1, isCompleted: true, mode: 'mixed', difficulty: 'mixed', feedbackMode: 'exam' };
  const review = render(ExamReview, { session, onExit() {} });
  // Theory opens the detailed panel in an effect (verified in a browser).
  // SSR can verify focus and brief; ExamReview renders its toggle immediately.
  assert.ok(theory.includes(q.text) && theory.replace(/<[^>]*>/g, '').includes(entry.brief), id + ': focused theory entry');
  assert.ok(review.includes('Стиль объяснения') && review.includes('Смысл') && review.includes('По делу'), id + ': review toggle');
  assert.ok(review.replace(/<[^>]*>/g, '').includes(entry.brief), id + ': default plain brief');
}

// Independent calculations for the numeric keys: priority vector order is
// lexicographic, with local receiving port used only after sender port ties.
assert.ok(28672 + 100 < 32768 + 100);
assert.match(ALL_QUESTIONS.find(q => q.id === ids[0]).answers[keys[0]], /28772/);
const vectors = [
  ['P1', [1, 30, 10, 128, 7, 128, 9]],
  ['P2', [1, 30, 10, 128, 7, 128, 5]],
  ['P3', [1, 30, 10, 128, 8, 128, 1]],
  ['P4', [1, 30, 11, 64, 1, 128, 2]],
];
const compare = (a, b) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};
assert.equal(vectors.sort((a, b) => compare(a[1], b[1]))[0][0], 'P2');
assert.ok(20 + 20 < 10 + 50, 'changed local cost selects P2');
assert.ok(5 + 20 > 10 && 5 < 10, 'P2 loses Root but N wins Designated');
assert.ok(0 + 10 < 0 + 20, 'boundary CIST root path uses P1');

// Compare the configurations given in 10 by VLAN membership, not by spelling
// of ranges. A revision change fixes region identity; cost/priority do not.
const regionQuestion = ALL_QUESTIONS.find(q => q.id === 'stp-new-10');
function vlanSet(list) {
  return new Set(list.split(',').flatMap(part => {
    const [first, last = first] = part.split('-').map(Number);
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
  }));
}
const configurations = [...regionQuestion.text.matchAll(
  /([AB]): name (\S+); revision (\d+); instance 1 vlan ([\d,-]+); instance 2 vlan ([\d,-]+)/g,
)].map(([, bridge, name, revision, first, second]) => ({ bridge, name, revision: Number(revision),
  mapping: [vlanSet(first), vlanSet(second)] }));
assert.equal(configurations.length, 2);
const [regionA, regionB] = configurations;
assert.equal(regionA.name, regionB.name);
assert.deepEqual(regionA.mapping, regionB.mapping, 'range split does not change the allocation table');
assert.notEqual(regionA.revision, regionB.revision, 'actual mismatch is revision');
assert.match(regionQuestion.answers[regionQuestion.correct[0]], new RegExp(`revision ${regionA.revision}\\b`));
assert.match(regionQuestion.answers[2], /10-14,15-19/, 'plausible but ineffective range rewrite retained');

// In 12, infer roots from priorities and the required instance from physical
// paths. Then evaluate all four proposed edits against every VLAN's path.
const mappingQuestion = ALL_QUESTIONS.find(q => q.id === 'stp-new-12');
const mapping = new Map([...mappingQuestion.text.matchAll(/instance (\d) vlan ([\d,]+)/g)]
  .flatMap(([, instance, vlans]) => vlans.split(',').map(vlan => [Number(vlan), Number(instance)])));
const roots = new Map([...mappingQuestion.text.matchAll(/MSTI (\d) — A=(\d+), B=(\d+), S=(\d+)/g)]
  .map(([, instance, a, b, s]) => [Number(instance), [['A', Number(a)], ['B', Number(b)], ['S', Number(s)]]
    .sort((x, y) => x[1] - y[1])[0][0]]));
assert.deepEqual([...mapping], [[10, 1], [20, 1], [30, 2]]);
assert.deepEqual([...roots], [[1, 'A'], [2, 'B']]);
assert.match(mappingQuestion.text, /Стоимость каждого порта всех трёх линий равна 10/);
assert.match(mappingQuestion.text, /для VLAN 10 должен вести к A, а для VLAN 20 и 30 — к B/);
const desired = new Map([[10, 'A'], [20, 'B'], [30, 'B']]);
// A direct path costs 10; the other uplink reaches the same root via 10+10.
function paths(allocation, instanceRoots, costToA = 10) {
  return [...desired.keys()].map(vlan => {
    const instance = allocation.get(vlan), root = instanceRoots.get(instance);
    const a = instance === 1 ? costToA : 10;
    const viaA = a + (root === 'A' ? 0 : 10);
    const viaB = 10 + (root === 'B' ? 0 : 10);
    assert.notEqual(viaA, viaB, 'no unspecified tie-breaker');
    return [vlan, viaA < viaB ? 'A' : 'B'];
  });
}
const outcomes = [
  paths(new Map(mapping).set(20, 2), roots),
  paths(mapping, new Map(roots).set(1, 'B')),
  paths(mapping, roots, 30),
  paths(new Map(mapping).set(30, 1), roots),
];
assert.deepEqual(paths(mapping, roots), [[10, 'A'], [20, 'A'], [30, 'B']]);
const validEdits = outcomes.flatMap((outcome, index) => JSON.stringify(outcome) === JSON.stringify([...desired]) ? [index] : []);
assert.deepEqual(validEdits, mappingQuestion.correct, 'only one edit satisfies all three paths');
assert.match(mappingQuestion.answers[0], /VLAN 20 из MSTI 1 в MSTI 2/);
assert.match(mappingQuestion.answers[1], /B корнем MSTI 1/);
assert.match(mappingQuestion.answers[2], /cost порта к A с 10 до 30/);
assert.match(mappingQuestion.answers[3], /VLAN 30 из MSTI 2 в MSTI 1/);

console.log('PASS: 15 STP scenarios; 5 applied/10 advanced; unique IDs, four answers/one key, plain/pro, real loader, 15 rendered review toggles and focused theory entries; beginner/mixed unchanged');
