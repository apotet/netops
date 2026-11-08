import assert from 'node:assert/strict';
import { bundleEntry } from './load-bank.mjs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const { reviewRows, filteredReview, reviewTotals, serializeReview, restoreReview, explanationText,
  createProgressStore, recordConfirmedAnswers, ALL_QUESTIONS } = await bundleEntry('scripts/review-entry.ts', 'review-tests.mjs');

const questions = Array.from({ length: 10 }, (_, index) => ({
  id: `review-${index}`, group: 'l3', topic: 'ARP, не IPv4-подсети', text: `Вопрос ${index}`,
  answers: ['вариант A', 'вариант B', 'вариант C'], correct: index === 1 ? [0, 2] : [0],
  explanation: index === 2 ? '' : index === 3 ? 'TODO' : `Индивидуальное объяснение ${index}`,
}));
const now = Date.now();
const session = { questions, userAnswers: Object.fromEntries(questions.map((q, i) => [q.id, i === 1 ? [2, 0] : i === 2 ? [1] : [0]])),
  submittedQuestions: Object.fromEntries(questions.map(q => [q.id, true])), currentIndex: 9, isCompleted: true,
  startTime: now - 1000, feedbackMode: 'exam', mode: 'mixed', attemptId: 'review-attempt', progressEpoch: 'test-epoch' };
delete session.submittedQuestions['review-3']; // saved draft must not become a confirmed mistake
session.userAnswers['review-4'] = []; delete session.submittedQuestions['review-4'];
assert.deepEqual(reviewTotals(session), { total: 10, correct: 7, wrong: 1, unanswered: 2, percentage: 70 });
assert.equal(filteredReview(session, 'all').length, 10);
assert.equal(filteredReview(session, 'correct').length, 7);
assert.equal(filteredReview(session, 'wrong').length, 1);
assert.equal(reviewRows(session)[1].status, 'correct', 'multi comparison is order-independent');
assert.deepEqual(reviewRows(session)[1].chosen, [2, 0]);
assert.deepEqual(reviewRows(session)[1].question.correct, [0, 2]);
for (const choice of [[0], [0, 1, 2], [0, 0], [5]]) {
  assert.equal(reviewRows({ ...session, userAnswers: { ...session.userAnswers, 'review-1': choice } })[1].status, 'wrong');
}
assert.equal(reviewRows(session)[3].status, 'unanswered');
assert.equal(reviewRows(session)[2].explanation, null);
assert.equal(reviewRows(session)[3].explanation, null);
for (const value of ['', '  ', null, {}, 'RESTORED_FULL_CONTENT', 'undefined']) assert.equal(explanationText(value), null);
assert.equal(explanationText('  Точное объяснение  '), 'Точное объяснение');
assert.ok(reviewRows(session).every(row => !row.lesson), 'ARP does not link to a random lesson/trainer');
const sni = ALL_QUESTIONS.find(q => q.id === 'l57-d02');
assert.ok(sni);
const mapped = reviewRows({ ...session, questions: [sni] });
assert.ok(mapped[0].lesson?.relatedQuestionIds.includes(sni.id), 'only exact lesson metadata');
assert.deepEqual(reviewRows({ ...session, isCompleted: false }), [], 'no answers leaked before exam completion');
assert.equal(reviewRows({ ...session, feedbackMode: 'instant' })[1].status, 'correct', 'same review for instant/exam');

const raw = serializeReview(session);
assert.deepEqual(restoreReview(raw, session.progressEpoch), session, 'snapshot retained verbatim');
assert.equal(restoreReview(raw, 'new-reset-epoch'), null);
assert.equal(restoreReview('{bad', session.progressEpoch), null);
assert.equal(restoreReview(JSON.stringify({ version: 2, session }), session.progressEpoch), null);
assert.equal(restoreReview(serializeReview({ ...session, questions: [{ ...questions[0], correct: [10] }] }), session.progressEpoch), null);
assert.throws(() => serializeReview({ ...session, isCompleted: false }));
// Current bank changes must not rewrite answer text/options inside a saved attempt.
const restored = restoreReview(raw, session.progressEpoch);
assert.equal(restored.questions[0].answers[0], 'вариант A');
const activeRaw = JSON.stringify({ ...session, isCompleted: false, attemptId: 'other-attempt' });
restoreReview(raw, session.progressEpoch);
assert.equal(activeRaw, JSON.stringify({ ...session, isCompleted: false, attemptId: 'other-attempt' }), 'review never rewrites active session');

const data = new Map();
const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
const store = createProgressStore(questions, () => storage, () => now);
const tracked = { ...session, progressEpoch: store.load().epoch };
recordConfirmedAnswers(tracked, store.record);
assert.equal(store.summary().answeredCount, 8, 'only confirmed answers count in N1B');
const before = store.export();
const reviewRaw = serializeReview(tracked);
for (let i = 0; i < 3; i++) {
  const review = restoreReview(reviewRaw, tracked.progressEpoch);
  reviewRows(review); filteredReview(review, 'wrong'); reviewTotals(review);
}
assert.equal(store.export(), before, 'view/filter/reload review never touches counters or streaks');
const reloaded = createProgressStore(questions, () => storage, () => now);
recordConfirmedAnswers(tracked, reloaded.record);
assert.equal(reloaded.export(), before, 'existing N1B receipt replay still idempotent');

// One cheap server render of the actual component, no browser/device matrix.
const { build } = await import('esbuild');
const outfile = resolve('scripts/.cache/review-ui.mjs');
await build({ stdin: { contents: `
  import React from 'react';
  import { renderToStaticMarkup } from 'react-dom/server';
  import { ExamReview } from './src/components/ExamReview';
  export const render = session => renderToStaticMarkup(React.createElement(ExamReview,
    { session, onExit() {}, onRetry() {}, onNavigateToTheory() {} }));
`, resolveDir: process.cwd(), sourcefile: 'review-ui.ts' }, bundle: true, platform: 'node', format: 'esm',
  external: ['react-dom', 'react', 'react-dom/server', 'lucide-react'], outfile, logLevel: 'silent' });
const { render } = await import(pathToFileURL(outfile).href);
// The current UI starts on mistakes when the attempt has any. This fixture has
// one wrong answer, seven correct answers and two unconfirmed answers.
const defaultHtml = render(session);
assert.equal((defaultHtml.match(/<details\b/g) || []).length, 1, 'default mistakes filter shows the one wrong answer');
assert.ok(defaultHtml.includes('Показано 1 из 10'));
assert.ok(defaultHtml.includes('Вопрос 2</span>'), 'default card is the wrong question, not the first question');

function renderWithFilter(session, filter) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const key = `osi_review_view:${session.attemptId || session.startTime}`;
  try {
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
      getItem(requestedKey) {
        return requestedKey === key ? JSON.stringify({ filter, open: [] }) : null;
      },
    } });
    return render(session);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'sessionStorage', previous);
    else delete globalThis.sessionStorage;
  }
}

// Exercise the real component with each saved filter, including all unanswered
// drafts. Checking question texts catches both omitted and duplicated cards.
for (const [filter, indexes] of [
  ['all', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]],
  ['wrong', [2]],
  ['correct', [0, 1, 5, 6, 7, 8, 9]],
]) {
  const filteredHtml = renderWithFilter(session, filter);
  assert.equal((filteredHtml.match(/<details\b/g) || []).length, indexes.length, filter + ': card count');
  assert.deepEqual([...filteredHtml.matchAll(/class="review-question-text">([^<]*)<\/span>/g)].map(match => match[1]),
    indexes.map(index => questions[index].text), filter + ': exact questions in order');
  assert.ok(filteredHtml.includes(`Показано ${indexes.length} из 10`), filter + ': visible total');
}
const html = renderWithFilter(session, 'all');
assert.ok(html.includes('Правильный ответ:'));
assert.ok(html.includes('Ваш выбор'));
assert.ok(html.includes('Индивидуальное объяснение 0'));
assert.ok(html.includes('Индивидуальное объяснение в сохранённом вопросе отсутствует.'));
assert.ok(!html.includes('TODO'));
assert.ok(!html.includes('Разобрать подробнее:'), 'no theory button without exact mapping');
assert.ok(html.includes('aria-pressed="true"'));
assert.equal(render({ ...session, isCompleted: false }), '', 'actual review UI hidden until completion');
assert.ok(render({ ...session, questions: [sni] }).includes('Разобрать подробнее:'), 'mapped lesson visible');
const photoHtml = render({ ...session, questions: [{ ...questions[0], image: 'assets/photos/lc-connector.webp', imageAlt: 'LC-коннектор' }] });
assert.ok(photoHtml.includes('alt="LC-коннектор"') && photoHtml.includes('lc-connector.webp'), 'photo context preserved in review');
assert.equal(store.export(), before, 'render does not record progress');
console.log('OK: N1C ten-question review, strict single/multi sets, drafts, visibility, exact theory mapping, snapshot restore, no progress writes');
