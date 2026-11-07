import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cache = resolve(root, 'scripts/.cache');
mkdirSync(cache, { recursive: true });
const outfile = resolve(cache, 'answer-shuffle-tests.mjs');
await build({
  stdin: { contents: `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { ExamReview } from './src/components/ExamReview';
    export * from './src/utils/examProgress';
    export * from './src/utils/examReview';
    export { createProgressStore } from './src/utils/userProgress';
    export const renderReview = session => renderToStaticMarkup(React.createElement(ExamReview, { session, onExit() {} }));
  `, resolveDir: root, sourcefile: 'answer-shuffle-tests.ts' },
  bundle: true, platform: 'node', format: 'esm', outfile,
  external: ['react', 'react-dom/server', 'lucide-react'], logLevel: 'silent',
});
const { prepareAttemptQuestions, restoreSession, confirmAnswer, answerCorrect, recordConfirmedAnswers,
  reviewRows, reviewTotals, serializeReview, restoreReview, renderReview, createProgressStore } =
  await import(pathToFileURL(outfile).href);

const single = { id: 'shuffle-single', group: 'l3', topic: 'Routing', text: 'Single',
  answers: ['single-correct', 'single-other-1', 'single-other-2', 'single-other-3'],
  correct: [0], explanation: 'Single explanation' };
const multi = { ...single, id: 'shuffle-multi', text: 'Multi',
  answers: ['multi-correct-1', 'multi-other-1', 'multi-correct-2', 'multi-other-2'], correct: [0, 2] };
const photo = { ...single, id: 'shuffle-photo', group: 'visual-l1', text: 'Photo',
  image: 'assets/photos/lc-connector.webp', imageAlt: 'LC-коннектор' };
const bank = [single, multi, photo];
const original = JSON.stringify(bank);
const now = Date.now();
const prepared = prepareAttemptQuestions(bank, () => 0);
assert.deepEqual(prepared.answerOrders[single.id], [1, 2, 3, 0]);
for (let i = 0; i < bank.length; i++) {
  const q = prepared.questions[i];
  assert.deepEqual(q.correct.map(index => q.answers[index]).sort(),
    bank[i].correct.map(index => bank[i].answers[index]).sort());
}
assert.deepEqual(prepared.questions[1].correct, [1, 3]);
assert.equal(prepared.questions[2].image, photo.image);
assert.equal(JSON.stringify(bank), original, 'bank arrays and keys stay unchanged');
assert.ok(answerCorrect([3, 1], prepared.questions[1].correct));
assert.ok(!answerCorrect([3], prepared.questions[1].correct));
assert.ok(!answerCorrect([3, 1, 2], prepared.questions[1].correct));

// Exhaust all Fisher–Yates random branches for four options: 24 equiprobable permutations.
const permutations = new Set();
const positions = [0, 0, 0, 0];
for (let j3 = 0; j3 < 4; j3++) for (let j2 = 0; j2 < 3; j2++) for (let j1 = 0; j1 < 2; j1++) {
  const values = [(j3 + 0.5) / 4, (j2 + 0.5) / 3, (j1 + 0.5) / 2];
  const q = prepareAttemptQuestions([single], () => values.shift()).questions[0];
  permutations.add(q.answers.join('|'));
  positions[q.correct[0]]++;
}
assert.equal(permutations.size, 24);
assert.deepEqual(positions, [6, 6, 6, 6]);

function attempt(extra = {}) {
  return { ...prepared, currentIndex: 0, userAnswers: {}, submittedQuestions: {},
    startTime: now - 1000, isCompleted: false, mode: 'mixed', feedbackMode: 'instant',
    attemptId: 'shuffled-attempt', progressEpoch: 'shuffle-epoch', ...extra };
}
const reload = session => restoreSession(JSON.stringify(session), bank, now);
for (const feedbackMode of ['instant', 'exam']) {
  let session = attempt({ feedbackMode });
  assert.deepEqual(reload(session).questions, session.questions, 'reload before choosing');
  session.userAnswers[single.id] = [3];
  assert.deepEqual(reload(session).userAnswers, session.userAnswers, 'reload draft selection');
  for (let i = 0; i < bank.length; i++) {
    session = { ...session, currentIndex: i };
    session = confirmAnswer(session, [...session.questions[i].correct].reverse(), now);
    session = reload(session);
    assert.ok(session, 'reload after confirmation');
  }
  const returned = reload({ ...session, currentIndex: 0 });
  assert.deepEqual(returned.questions, prepared.questions, 'returning to a question never reshuffles');
  assert.deepEqual(returned.userAnswers[single.id], [3]);
  assert.equal(confirmAnswer(returned, [0], now), returned, 'confirmed answer cannot be changed');

  const completed = { ...session, isCompleted: true };
  const restored = restoreReview(serializeReview(completed), completed.progressEpoch);
  assert.deepEqual(restored.questions, prepared.questions);
  assert.equal(reviewTotals(restored).correct, 3);
  const rows = reviewRows(restored);
  assert.deepEqual(rows[1].chosen.map(index => rows[1].question.answers[index]).sort(),
    ['multi-correct-1', 'multi-correct-2']);
  const html = renderReview(restored);
  assert.ok(html.includes('Твой ответ: single-correct'));
  assert.ok(html.includes('Правильно: single-correct'));
  assert.ok(html.includes('lc-connector.webp') && html.includes('LC-коннектор'));
  const answerListStart = html.indexOf('<ul class="review-answers"');
  const singleCard = html.slice(answerListStart, html.indexOf('</ul>', answerListStart));
  assert.ok(singleCard.indexOf('single-other-1') < singleCard.indexOf('single-correct'),
    'actual review renderer keeps shuffled order');
}
const wrong = { ...attempt(), isCompleted: true,
  userAnswers: { [single.id]: [0] }, submittedQuestions: { [single.id]: true } };
assert.equal(reviewRows(wrong)[0].status, 'wrong');
assert.ok(renderReview(wrong).includes('Твой ответ: single-other-1'));

// No permutation metadata means legacy bank order, even with an existing draft/confirmation.
const legacy = { ...attempt(), questions: bank, userAnswers: { [single.id]: [0] },
  submittedQuestions: { [single.id]: true } };
delete legacy.answerOrders;
assert.deepEqual(reload(legacy).questions, bank);
assert.deepEqual(reload(legacy).userAnswers, legacy.userAnswers);
const corrupt = attempt({ answerOrders: { ...prepared.answerOrders, [single.id]: [0, 0, 2, 3] } });
assert.equal(reload(corrupt), null);
assert.equal(reload(attempt({ answerOrders: {} })), null);
const changedBank = bank.map(q => q.id === single.id ? { ...q, answers: [...q.answers].reverse() } : q);
assert.equal(restoreSession(JSON.stringify(attempt()), changedBank, now), null, 'bank drift must not reinterpret a saved choice');

// Record by question ID with remapped keys; receipts keep replay and review idempotent.
const data = new Map();
const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
const store = createProgressStore(bank, () => storage, () => now);
store.record(single.id, false, 'initial-mistake', store.load().epoch, now);
for (let i = 0; i < 2; i++) {
  const s = confirmAnswer(attempt({ attemptId: 'retry-' + i, progressEpoch: store.load().epoch }),
    prepared.questions[0].correct, now);
  recordConfirmedAnswers(s, store.record);
  recordConfirmedAnswers(reload(s), store.record);
  assert.equal(store.load().questions[single.id].streak, i + 1);
  assert.equal(store.mistakes().some(q => q.id === single.id), i === 0);
}
const before = store.export();
renderReview({ ...attempt(), isCompleted: true });
assert.equal(store.export(), before);

// The common attempt constructor serves sampled, custom/mistake and photo pools.
const view = readFileSync(resolve(root, 'src/components/ExamView.tsx'), 'utf8');
assert.ok(view.includes('...prepareAttemptQuestions(questions)'));
assert.ok(view.includes('customQuestions || getRandomQuestions(selectedMode, questionCount)'));
assert.ok(view.includes('currentQuestion.answers.map('));
console.log('PASS: single/multi/photo, all 24 permutations, attempt restore/revisit, legacy restore, actual review render, receipts/streak');
