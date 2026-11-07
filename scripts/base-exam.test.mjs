import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = resolve(root, 'scripts/.cache/base-exam-tests.mjs');
mkdirSync(dirname(outfile), { recursive: true });
await build({ stdin: { contents: `
  export { ALL_QUESTIONS, QUIZ_MODES, getExamPool, filterExamDifficulty, getRandomQuestions } from './src/data/questionsData';
  export { selectMixedQuestions } from './src/data/mixedExam';
  export { prepareAttemptQuestions, restoreSession, confirmAnswer } from './src/utils/examProgress';
  export { reviewRows, serializeReview, restoreReview } from './src/utils/examReview';
`, resolveDir: root, sourcefile: 'base-exam-tests.ts' },
  bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent' });
const { ALL_QUESTIONS, QUIZ_MODES, getExamPool, filterExamDifficulty, getRandomQuestions,
  selectMixedQuestions, prepareAttemptQuestions, restoreSession, confirmAnswer,
  reviewRows, serializeReview, restoreReview } = await import(pathToFileURL(outfile).href);
const seeded = () => {
  let state = 123456789;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
};
const bankBefore = JSON.stringify(ALL_QUESTIONS);
const base = ALL_QUESTIONS.filter(q => q.difficulty === 'beginner');
assert.ok(base.length);
assert.equal(getExamPool('mixed', 'beginner').length, base.length);
const fixtures = ['beginner', 'applied', 'advanced', 'basic', undefined].map((difficulty, i) => ({ id: String(i), difficulty }));
assert.deepEqual(filterExamDifficulty(fixtures, 'beginner').map(q => q.id), ['0']);
assert.equal(filterExamDifficulty(fixtures, 'mixed').length, fixtures.length);
for (const mode of QUIZ_MODES) for (const count of [5, 10, 20, 30, ALL_QUESTIONS.length + 1]) {
  const chosen = getRandomQuestions(mode.id, count, seeded(), 'beginner');
  assert.ok(chosen.every(q => q.difficulty === 'beginner'), mode.id + ': no applied/advanced/basic/unlabelled');
  assert.equal(chosen.length, Math.min(count, new Set(getExamPool(mode.id, 'beginner').map(q => q.id)).size));
  assert.equal(new Set(chosen.map(q => q.id)).size, chosen.length);
}
const photos = ALL_QUESTIONS.filter(q => q.group === 'visual-l1' && q.difficulty === 'beginner');
assert.ok(photos.length);
assert.ok(photos.every(photo => getExamPool('mixed', 'beginner').some(q => q.id === photo.id)));
assert.equal(getRandomQuestions('visual-l1', ALL_QUESTIONS.length, seeded(), 'beginner').length, photos.length);
assert.deepEqual(getRandomQuestions('mixed', 10, seeded(), 'mixed'), selectMixedQuestions(ALL_QUESTIONS, seeded()),
  'all-level mixed keeps its original selector and quotas');
assert.deepEqual(getRandomQuestions('mixed', 10, seeded()), getRandomQuestions('mixed', 10, seeded(), 'mixed'),
  'existing callers keep their all-level behavior');

const now = Date.now();
const createSession = (questions, difficulty) => ({ ...prepareAttemptQuestions(questions, seeded()),
  currentIndex: 0, userAnswers: {}, submittedQuestions: {}, startTime: now - 1000,
  isCompleted: false, mode: 'mixed', feedbackMode: 'exam', attemptId: 'base-test', progressEpoch: 'epoch',
  ...(difficulty ? { difficulty, requestedCount: 10 } : {}) });
let session = createSession(getRandomQuestions('mixed', 10, seeded(), 'beginner'), 'beginner');
session = confirmAnswer(session, session.questions[0].correct, now);
const restored = restoreSession(JSON.stringify(session), ALL_QUESTIONS, now);
assert.deepEqual(restored.questions, session.questions);
assert.equal(restored.difficulty, 'beginner');
assert.deepEqual(restored.userAnswers, session.userAnswers);
const reviewed = restoreReview(serializeReview({ ...restored, isCompleted: true }), 'epoch');
assert.equal(reviewed.difficulty, 'beginner');
assert.equal(reviewRows(reviewed)[0].status, 'correct', 'base still supports completed review');
assert.ok(reviewRows(reviewed).length);

// Legacy attempts are not filtered/resampled; their saved answers and shuffled order survive.
const legacyQuestions = ['beginner', 'applied', 'advanced'].map(d => ALL_QUESTIONS.find(q => q.difficulty === d));
assert.ok(legacyQuestions.every(Boolean));
let legacy = createSession(legacyQuestions);
legacy = confirmAnswer(legacy, legacy.questions[0].correct, now);
const old = restoreSession(JSON.stringify(legacy), ALL_QUESTIONS, now);
assert.deepEqual(old.questions, legacy.questions);
assert.deepEqual(old.userAnswers, legacy.userAnswers);
assert.equal(old.difficulty, undefined);
const preShuffle = { ...legacy, questions: legacyQuestions };
delete preShuffle.answerOrders;
assert.deepEqual(restoreSession(JSON.stringify(preShuffle), ALL_QUESTIONS, now).questions, legacyQuestions);
assert.equal(restoreSession(JSON.stringify({ ...session, difficulty: 'advanced' }), ALL_QUESTIONS, now), null);
assert.equal(JSON.stringify(ALL_QUESTIONS), bankBefore, 'bank not mutated');
console.log('PASS: strict beginner pools, shortages without refill, photos, original mixed quotas, session level/order, legacy continuation and review');
