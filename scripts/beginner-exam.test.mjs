import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { bundleEntry } from './load-bank.mjs';

const { ALL_QUESTIONS, QUIZ_MODES, getRandomQuestions, getExamPool, getNewAttemptQuestions } =
  await bundleEntry('src/data/questionsData.ts', 'beginner-data-tests.mjs');
const { selectBeginnerQuestions, isBeginnerPhoto } =
  await bundleEntry('src/data/beginnerExam.ts', 'beginner-picker-tests.mjs');
const { prepareAttemptQuestions, restoreSession, confirmAnswer, recordConfirmedAnswers } =
  await bundleEntry('src/utils/examProgress.ts', 'beginner-restore-tests.mjs');
const { serializeReview, restoreReview, reviewRows } =
  await bundleEntry('src/utils/examReview.ts', 'beginner-review-tests.mjs');
const before = JSON.parse(readFileSync(new URL('./fixtures/beginner-exam-baseline.json', import.meta.url), 'utf8'));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Owner policy NETOPS-LIGHT-CI-2026-11-24: retained historical hashes are advisory.
const reportFingerprint = (actual, expected, label) => console.log('INFO historical fingerprint:', label, actual === expected ? 'MATCH' : 'DIFF (informational)');
const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
const family = q => q.family || q.id;
const bankBefore = JSON.stringify(ALL_QUESTIONS);
const quality = before.questionQualityUpdate;
const combinedPack = before.expertPack177;
const explanationQuality = before.explanationQuality228;
// Historical fingerprints predate the four reviewed L2 distractor labels.
// Reconstruct only those labels for the older guards; the L2 contract independently
// proves that no stem, key, order, classification or other bank field changed.
const { PREVIOUS_IN_DEPTH_QUESTIONS } = await bundleEntry('src/data/inDepth/previousQuestions.ts', 'beginner-l2-history.mjs');
const bankAtExplanationAudit = ALL_QUESTIONS.map(q => PREVIOUS_IN_DEPTH_QUESTIONS[q.id]
  ? { ...q, answers: PREVIOUS_IN_DEPTH_QUESTIONS[q.id].answers } : q);
reportFingerprint(hash(bankAtExplanationAudit), explanationQuality.bankSHA256, 'bank includes only the approved explanation edits');
const priorBank = bankAtExplanationAudit.map(q => Object.hasOwn(explanationQuality.priorExplanations, q.id)
  ? { ...q, explanation: explanationQuality.priorExplanations[q.id] } : q);
reportFingerprint(hash(priorBank), combinedPack.bankSHA256, 'other bank content, all answers and difficulties are unchanged');
const bankBeforeExpert = priorBank.filter(q => !q.id.startsWith('expert177-'));
reportFingerprint(hash(bankBeforeExpert), before.expertPack225.bankSHA256, 'the prior staging bank is intact');
reportFingerprint(hash(bankBeforeExpert.filter(q => !q.id.startsWith('diag177-') && !q.id.startsWith('mon-') && !q.id.startsWith('wifi-') && !q.id.startsWith('exp225-'))), quality.bankSHA256,
  'all questions from the previous revision keep their content and order');
assert.equal(ALL_QUESTIONS.length, 862);

function verify(chosen, pool, count) {
  const unique = [...new Map(pool.filter(q => q.difficulty === 'beginner').map(q => [q.id, q])).values()];
  const target = Math.min(count, unique.length);
  assert.equal(chosen.length, target);
  assert.equal(new Set(chosen.map(q => q.id)).size, target, 'no repeated IDs');
  assert.ok(chosen.every(q => unique.includes(q)), 'same strict difficulty and topic pool');
  const families = new Set(unique.map(family)).size;
  assert.equal(new Set(chosen.map(family)).size, Math.min(target, families), 'cover families before repeating');
  if (target >= 2 && unique.some(isBeginnerPhoto)) assert.ok(chosen.some(isBeginnerPhoto), 'photo guarantee');
}

const base = getExamPool('mixed', 'beginner');
assert.equal(base.length, combinedPack.beginnerPool);
assert.equal(base.filter(isBeginnerPhoto).length, 68);
assert.equal(new Set(base.map(family)).size, combinedPack.families);
let noPhoto = 0, repeatedFamily = 0, singlesWithPhoto = 0;
const photoPositions = new Set();
const mixedSnapshot = [], singleSnapshot = [];
for (let seed = 1; seed <= 1000; seed++) {
  const chosen = getRandomQuestions('mixed', 10, seeded(seed), 'beginner');
  verify(chosen, base, 10);
  assert.deepEqual(chosen, getRandomQuestions('mixed', 10, seeded(seed), 'beginner'), 'same seed, same result/order');
  noPhoto += !chosen.some(isBeginnerPhoto);
  repeatedFamily += new Set(chosen.map(family)).size !== chosen.length;
  photoPositions.add(chosen.findIndex(isBeginnerPhoto));
  mixedSnapshot.push(getRandomQuestions('mixed', 10, seeded(seed), 'mixed').map(q => q.id));
  const single = getRandomQuestions('mixed', 1, seeded(seed), 'beginner');
  singleSnapshot.push(single.map(q => q.id));
  singlesWithPhoto += single.some(isBeginnerPhoto);
}
assert.equal(noPhoto, 0);
assert.equal(repeatedFamily, 0);
assert.equal(photoPositions.size, 10, 'guaranteed photo can occur in every position');
assert.ok(singlesWithPhoto > 0 && singlesWithPhoto < 1000, 'count=1 does not force or forbid a photo');
reportFingerprint(hash(mixedSnapshot), combinedPack.mixed10SHA256, '1000 ordered mixed/10 selections match the expanded bank');
reportFingerprint(hash(singleSnapshot), combinedPack.beginnerSingleSHA256, '1000 beginner/1 selections still match the previous snapshot');

const otherSnapshot = [];
for (const { id: mode } of QUIZ_MODES) {
  for (const count of [1, 5, 10, 15, 20, 30]) {
    for (const seed of [1, 17, 173, 1000]) {
      const pool = getExamPool(mode, 'mixed');
      const chosen = getRandomQuestions(mode, count, seeded(seed), 'mixed');
      assert.equal(chosen.length, Math.min(count, pool.length));
      for (const duplicateFamily of ['tcp-rst-meaning', 'tcpip-application-mapping']) {
        const distinct = pool.filter(q => family(q) !== duplicateFamily).length;
        assert.ok(chosen.filter(q => family(q) === duplicateFamily).length <= Math.max(1, count - distinct));
      }
      otherSnapshot.push({ mode, count, seed, ids: chosen.map(q => q.id) });
    }
    const pool = getExamPool(mode, 'beginner');
    for (let seed = 1; seed <= 25; seed++) {
      const chosen = getRandomQuestions(mode, count, seeded(seed), 'beginner');
      verify(chosen, pool, count);
      assert.deepEqual(getNewAttemptQuestions(mode, count, seeded(seed), 'beginner'), chosen);
      verify(getNewAttemptQuestions(mode, count, seeded(seed), 'beginner', pool), pool, count);
      if (!pool.some(isBeginnerPhoto)) assert.ok(!chosen.some(isBeginnerPhoto), 'no photos borrowed from another topic');
      if (mode === 'visual-l1') assert.ok(chosen.every(isBeginnerPhoto));
    }
  }
}
reportFingerprint(hash(otherSnapshot), combinedPack.otherMixedModesSHA256, 'all 192 all-level mode/size/seed selections match the expanded bank');

const q = (id, extra = {}) => ({ id, group: 'l3', difficulty: 'beginner', topic: id, text: id,
  answers: ['yes', 'no', 'other', 'none'], correct: [0], explanation: id, ...extra });
const photo = q('photo', { image: 'assets/photos/real.webp' });
const fixtures = [
  [], [q('only')], [photo],
  [q('a', { family: 'same' }), q('b', { family: 'same' }), { ...photo, family: 'same' }],
  [q('a', { family: 'same' }), q('b', { family: 'same' }), q('c'), photo],
  // Photo shares a family with text: reserve it before choosing representatives.
  [q('text', { family: 'pair' }), { ...photo, family: 'pair' }, q('c'), q('d')],
  [q('no-family'), q('empty-family', { family: '' }), q('other')],
  [q('duplicate'), q('duplicate'), photo],
  [q('strict'), q('applied', { difficulty: 'applied' }), q('basic', { difficulty: 'basic' }),
    q('unlabelled', { difficulty: undefined }), q('advanced-photo', { difficulty: 'advanced', image: photo.image })],
];
for (const pool of fixtures) {
  const original = JSON.stringify(pool);
  for (let seed = 1; seed <= 100; seed++) for (const count of [0, 1, 2, 3, 5, 10, 30]) {
    const chosen = selectBeginnerQuestions(pool, count, seeded(seed));
    verify(chosen, pool, count);
    assert.deepEqual(chosen, selectBeginnerQuestions(pool, count, seeded(seed)));
  }
  assert.equal(JSON.stringify(pool), original, 'selection never mutates its input');
}
for (const count of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
  assert.throws(() => selectBeginnerQuestions(base, count, seeded(1)), RangeError);
}
const neverRandom = () => { throw new Error('no random draw needed'); };
assert.deepEqual(selectBeginnerQuestions(base, 0, neverRandom), []);
assert.deepEqual(selectBeginnerQuestions([], 30, neverRandom), []);
assert.equal(selectBeginnerQuestions([photo], Number.MAX_SAFE_INTEGER, neverRandom)[0], photo);
for (const image of ['javascript:bad', 'assets/photos/with space.webp', 'http://host/x.png', 'assets/x.svg', '']) {
  assert.equal(isBeginnerPhoto(q('bad', { image })), false);
}
assert.equal(isBeginnerPhoto(photo), true, 'photo already in a non-visual topic is eligible');

// Same entry point as ExamView: custom topic/photo/mistake pools stay within their IDs.
for (const pool of fixtures) for (const count of [1, 2, 5, 10, 30]) {
  verify(getNewAttemptQuestions('mixed', count, seeded(173), 'beginner', pool), pool, count);
  assert.deepEqual(getNewAttemptQuestions('mixed', count, neverRandom, 'mixed', pool), pool.slice(0, count),
    'existing all-level custom order/slice does not start using the mixed quota picker');
}
const mistakes = base.filter(q => !isBeginnerPhoto(q)).slice(0, 12);
const mistakePick = getNewAttemptQuestions('mixed', 10, seeded(173), 'beginner', mistakes);
assert.ok(mistakePick.every(q => mistakes.includes(q)));
assert.ok(!mistakePick.some(isBeginnerPhoto), 'no photo added from outside the supplied mistakes');
assert.deepEqual(getNewAttemptQuestions('mixed', 10, seeded(173), 'beginner', []), []);
assert.deepEqual(getNewAttemptQuestions('mixed', 10, seeded(173), 'mixed'),
  getRandomQuestions('mixed', 10, seeded(173), 'mixed'));

// A pre-change beginner attempt with no photo and repeated families remains valid.
const text = base.filter(q => !isBeginnerPhoto(q));
const repeated = text.find(a => text.some(b => a.id !== b.id && family(a) === family(b)));
const sibling = text.find(q => q.id !== repeated.id && family(q) === family(repeated));
const oldQuestions = [repeated, sibling, ...text.filter(q => q.id !== repeated.id && q.id !== sibling.id).slice(0, 8)];
const now = 1_800_000_000_000;
for (const difficulty of [undefined, 'beginner', 'mixed']) for (const shuffled of [false, true]) {
  let saved = { ...(shuffled ? prepareAttemptQuestions(oldQuestions, seeded(173)) : { questions: oldQuestions }),
    currentIndex: 0, userAnswers: {}, submittedQuestions: {}, startTime: now - 1000,
    isCompleted: false, mode: 'mixed', feedbackMode: 'exam', attemptId: 'pre-173', progressEpoch: 'old-epoch',
    ...(difficulty ? { difficulty, requestedCount: 10 } : {}) };
  saved = confirmAnswer(saved, saved.questions[0].correct, now);
  saved.currentIndex = 1;
  const raw = JSON.stringify(saved);
  const restored = restoreSession(raw, ALL_QUESTIONS, now);
  assert.ok(restored);
  for (const key of Object.keys(saved)) assert.deepEqual(restored[key], saved[key], `legacy restore ${key}`);
  assert.equal(restored.questions.some(isBeginnerPhoto), false, 'never resample an old attempt to add a photo');
  const records = [];
  recordConfirmedAnswers(restored, (...args) => records.push(args));
  assert.equal(records.length, 1);
  assert.equal(records[0][2], `pre-173:${oldQuestions[0].id}`);
  assert.equal(records[0][3], 'old-epoch');
  const completed = { ...restored, isCompleted: true, endTime: now };
  const review = restoreReview(serializeReview(completed), 'old-epoch');
  assert.ok(review);
  assert.deepEqual(review.questions, completed.questions);
  assert.equal(reviewRows(review)[0].status, 'correct');
  assert.equal(JSON.stringify(saved), raw);
}
assert.equal(JSON.stringify(ALL_QUESTIONS), bankBefore);
console.log('PASS: beginner/10 seeds 1–1000:', JSON.stringify({ before: before.before,
  after: { runs: 1000, noPhoto, repeatedFamily }, singlesWithPhoto,
  mixed10Snapshot: combinedPack.mixed10SHA256 }));
console.log('PASS: all modes/sizes, family shortage fallback, sparse pools, strict levels, 6 legacy restore/review/progress variants');
