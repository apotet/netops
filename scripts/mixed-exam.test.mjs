import assert from 'node:assert/strict';
import { bundleEntry } from './load-bank.mjs';

const { ALL_QUESTIONS, getRandomQuestions, resolveImageUrl } = await bundleEntry('src/data/questionsData.ts', 'mixed-data.mjs');
const { selectMixedQuestions, MIXED_GROUPS, mixedGroup, isMixedPhoto } = await bundleEntry('src/data/mixedExam.ts', 'mixed-picker.mjs');

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function verify(questions) {
  assert.equal(questions.length, 10);
  assert.equal(new Set(questions.map(q => q.id)).size, 10, 'unique IDs');
  assert.equal(new Set(questions.map(q => q.family || q.id)).size, 10, 'unique families');
  assert.ok(questions.filter(q => q.template).length <= 2, 'template cap');
  const counts = Object.fromEntries(MIXED_GROUPS.map(group => [group, questions.filter(q => mixedGroup(q) === group).length]));
  for (const count of Object.values(counts)) assert.ok(count >= 1 && count <= 2, 'curriculum quota');
  const photos = questions.filter(isMixedPhoto);
  assert.equal(photos.length, 1, 'exactly one visual L1');
  assert.ok(questions.every(q => MIXED_GROUPS.includes(mixedGroup(q))), 'no unknown groups');
  if (counts['l1-l2'] === 2) assert.equal(questions.filter(q => q.group === 'l1-l2' && !q.image).length, 1);
  for (const photo of photos) {
    const url = new URL(resolveImageUrl(photo.image));
    assert.equal(url.protocol, 'https:');
    assert.ok(url.pathname.endsWith(photo.image), 'relative photo resolves without changing the path');
    assert.ok(!url.pathname.includes('/netops/'), 'photo ref is independent of deployment base');
  }
  return counts;
}

assert.equal(ALL_QUESTIONS.length, 657, 'test the complete current bank');
const totals = Object.fromEntries(MIXED_GROUPS.map(group => [group, { min: 2, max: 0, total: 0 }]));
const signatures = new Set();
let storageReads = 0;
const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
try {
  // 100 clean + 100 error-heavy runs, paired with the same seed.
  // History must not reweight quotas or candidate selection.
  for (let seed = 1; seed <= 100; seed++) {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } });
    const clean = getRandomQuestions('mixed', 10, seeded(seed));
    const counts = verify(clean);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: () => {
        storageReads++;
        return JSON.stringify({ questions: Object.fromEntries(ALL_QUESTIONS.filter(q => q.group === 'l3')
          .map(q => [q.id, { wrong: 1_000_000, streak: 0, seen: 0 }])) });
      },
    } });
    const weighted = getRandomQuestions('mixed', 10, seeded(seed));
    verify(weighted);
    assert.deepEqual(weighted, clean, 'past errors cannot alter the seeded exam');
    signatures.add(clean.map(q => q.id).sort().join(','));
    for (const group of MIXED_GROUPS) {
      totals[group].min = Math.min(totals[group].min, counts[group]);
      totals[group].max = Math.max(totals[group].max, counts[group]);
      totals[group].total += counts[group];
    }
  }
  assert.equal(storageReads, 0, 'picker never reads error history');
} finally {
  if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
  else delete globalThis.localStorage;
}
assert.ok(signatures.size > 80, 'random selection has varied exams');

const question = (id, group, extra = {}) => ({ id, group, topic: group, text: id, answers: ['yes'], correct: [0], explanation: id, ...extra });
// Only this quota pattern is possible: L1–L2, L3, L4, L5–L7 get two.
const sparse = [question('photo', 'visual-l1', { image: 'assets/photos/lc-connector.webp' }),
  question('text', 'l1-l2'), ...MIXED_GROUPS.slice(1).map(group => question(group, group)),
  ...['l3', 'l4', 'l5-l7'].map(group => question(group + '-second', group))];
verify(selectMixedQuestions(sparse, seeded(7)));
const insufficient = bank => assert.throws(() => selectMixedQuestions(bank, seeded(7)),
  error => error.code === 'MIXED_POOL_INSUFFICIENT' && error.message.includes('Квоты не изменены'));
insufficient(sparse.filter(q => q.group !== 'l4'));
insufficient(sparse.filter(q => q.id !== 'photo'));
insufficient(sparse.map(q => q.id === 'photo' ? { ...q, image: 'javascript:bad' } : q));
insufficient(sparse.map(q => ({ ...q, family: 'one-family' })));
insufficient(sparse.map(q => ({ ...q, template: ['l3', 'l4', 'l5-l7'].includes(q.group) })));
insufficient(sparse.map(q => ({ ...q, id: 'same-id' })));
verify(selectMixedQuestions([...sparse, ...sparse], seeded(8)));
const shared = sparse.map(q => ({ ...q, family: q.id === 'l3' || q.id === 'l4' ? 'shared' : q.id }));
verify(selectMixedQuestions([...shared, question('alternative', 'l3')], seeded(9)));

// Other existing modes and sizes retain their original seeded shuffle and pool.
function previousSelection(mode, count, random) {
  const result = ALL_QUESTIONS.filter(q => mode === 'mixed' ? q.group !== 'visual-l1' : q.group === mode);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, count);
}
for (const mode of [...MIXED_GROUPS, 'visual-l1', 'mixed']) {
  for (const count of [5, 10, 15, 20, 30]) {
    if (mode === 'mixed' && count === 10) continue;
    const actual = getRandomQuestions(mode, count, seeded(12));
    assert.deepEqual(actual, previousSelection(mode, count, seeded(12)), `${mode}/${count} unchanged`);
    assert.equal(new Set(actual.map(q => q.id)).size, actual.length);
  }
}
console.log('OK: mixed-exam tests, 200 full-bank seeded runs, sparse/error paths, history independence, other modes unchanged');
console.table(totals);
