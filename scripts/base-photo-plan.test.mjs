import assert from 'node:assert/strict';
import { bundleEntry } from './load-bank.mjs';

const m = await bundleEntry('scripts/learning-level-exam-entry.ts', 'base-photo-plan.mjs');
const { isBeginnerPhoto, selectFamilyQuestions } = await bundleEntry('src/data/beginnerExam.ts', 'base-photo-predicate.mjs');
const seeded = seed => () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
const family = q => q.family || q.id;
const distinctFamilies = qs => new Set(qs.map(family)).size;
const base = m.getTestingPool('mixed', 'beginner');
const photos = base.filter(isBeginnerPhoto);
const text = base.filter(q => !isBeginnerPhoto(q));
assert.equal(base.length, 215);
assert.equal(photos.length, 113);
assert.ok(base.every(q => isBeginnerPhoto(q) === Boolean(m.resolveImageUrl(q.image))),
  'supported photo predicate agrees with actual rendered image paths');

const plan = [[5, 1, 1], [10, 1, 2], [15, 3, 4], [20, 3, 4], [30, 5, 5]];
const shape = questions => ({
  photos: questions.filter(isBeginnerPhoto).length,
  adjacent: questions.some((q, i) => i > 0 && isBeginnerPhoto(q) && isBeginnerPhoto(questions[i - 1])),
});
const verify = (questions, source, max) => {
  assert.ok(shape(questions).photos <= max, 'photo cap');
  assert.ok(!shape(questions).adjacent, 'photos are separated');
  assert.equal(new Set(questions.map(q => q.id)).size, questions.length);
  assert.ok(questions.every(q => source.includes(q) && m.QUESTION_LEARNING_LEVELS[q.id].learningLevel === 1));
};
const oldTrial = (difficulty, random) => {
  const questions = m.TRIAL_EXAM_OPTIONS[difficulty].quotas.flatMap(([level, count]) =>
    m.getLearningLevelQuestions('mixed', count, random, level));
  return selectFamilyQuestions(questions, questions.length, random);
};

const baseline = {};
for (const [count, min, max] of plan) {
  const positions = new Set(), photoCounts = new Set();
  baseline[count] = { overCap: 0, adjacent: 0 };
  for (let seed = 1; seed <= 1000; seed++) {
    // Original ordinary branch used this unchanged low-level sampler.
    const old = shape(m.getLearningLevelQuestions('mixed', count, seeded(seed), 1));
    baseline[count].overCap += old.photos > max;
    baseline[count].adjacent += old.adjacent;
    const picked = m.getTestingQuestions('mixed', count, seeded(seed), 'beginner');
    verify(picked, base, max);
    assert.equal(picked.length, count);
    assert.equal(distinctFamilies(picked), count);
    assert.ok(shape(picked).photos >= min);
    assert.deepEqual(picked, m.getTestingQuestions('mixed', count, seeded(seed), 'beginner'));
    picked.forEach((q, i) => { if (isBeginnerPhoto(q)) positions.add(i); });
    photoCounts.add(shape(picked).photos);
  }
  assert.equal(positions.size, count, 'every position can contain a photo');
  assert.deepEqual(photoCounts, new Set(Array.from({ length: max - min + 1 }, (_, i) => min + i)));
}
assert.deepEqual(baseline[10], { overCap: 949, adjacent: 866 });

const baselineBasic = { overCap: 0, adjacent: 0 };
for (let seed = 1; seed <= 1000; seed++) {
  const old = shape(oldTrial('basic', seeded(seed)));
  baselineBasic.overCap += old.photos > 4;
  baselineBasic.adjacent += old.adjacent;
  const trial = m.getTrialExamQuestions('basic', seeded(seed));
  verify(trial, base, 4);
  assert.equal(trial.length, 20);
  assert.equal(distinctFamilies(trial), 20);
  assert.ok(shape(trial).photos >= 3);
  assert.deepEqual(trial, m.getTrialExamQuestions('basic', seeded(seed)));
}
for (const difficulty of ['advanced', 'mixed']) for (let seed = 1; seed <= 100; seed++) {
  assert.deepEqual(m.getTrialExamQuestions(difficulty, seeded(seed)), oldTrial(difficulty, seeded(seed)));
}

for (const { id: mode } of m.QUIZ_MODES) {
  const scope = m.getTestingPool(mode, 'beginner');
  for (const count of [1, 5, 10, 15, 20, 30]) {
    const rule = plan.find(row => row[0] === count);
    const picked = m.getTestingQuestions(mode, count, seeded(74), 'beginner');
    if (!rule || mode === 'visual-l1' || !scope.some(isBeginnerPhoto)) {
      assert.deepEqual(picked, m.getLearningLevelQuestions(mode, count, seeded(74), 1),
        'explicit photo practice, text-only pools and unplanned sizes keep exact seeded order');
    } else {
      verify(picked, scope, rule[2]);
    }
  }
}

const other = m.getTestingPool('mixed', 'in-depth')[0];
const ordinary = (count, source) => m.getTestingQuestions('mixed', count, seeded(34), 'beginner', source);
for (const [count] of plan) {
  assert.equal(ordinary(count, []).length, 0);
  assert.equal(ordinary(count, [other]).length, 0);
  assert.equal(ordinary(count, photos.slice(0, 10)).length, 1, 'photos-only closed ordinary pool cannot be spaced');
}
assert.equal(ordinary(5, [...text.slice(0, 3), ...photos.slice(0, 8)]).length, 4);
assert.equal(ordinary(10, [text[0], ...photos.slice(0, 10)]).length, 3);
assert.equal(ordinary(10, [...text.slice(0, 7), ...photos.slice(0, 8)]).length, 9);
assert.equal(ordinary(10, [...text.slice(0, 8), ...photos.slice(0, 8)]).length, 10);
assert.deepEqual(shape(ordinary(15, [...text.slice(0, 13), ...photos.slice(0, 2)])), { photos: 2, adjacent: false });
assert.equal(ordinary(15, [...text.slice(0, 10), ...photos.slice(0, 8)]).length, 14);
assert.deepEqual(shape(ordinary(20, [...text.slice(0, 18), ...photos.slice(0, 2)])), { photos: 2, adjacent: false });
assert.equal(ordinary(20, [...text.slice(0, 15), ...photos.slice(0, 8)]).length, 19);
assert.deepEqual(shape(ordinary(30, [...text.slice(0, 28), ...photos.slice(0, 2)])), { photos: 2, adjacent: false });
assert.equal(ordinary(30, [...text.slice(0, 24), ...photos.slice(0, 8)]).length, 29);
assert.equal(m.getTestingQuestions('visual-l1', 30, seeded(34), 'beginner', photos.slice(0, 30)).filter(isBeginnerPhoto).length, 30);

// Verify maximum size and family count against enumerated subsets independently.
function optimum(pool, count, min, max) {
  const possibilities = [];
  let highestPhotos = 0;
  for (let mask = 1; mask < 2 ** pool.length; mask++) {
    const subset = pool.filter((_, i) => mask & (1 << i));
    const p = subset.filter(isBeginnerPhoto).length;
    if (subset.length > count || p > max || subset.length - p < p - 1) continue;
    possibilities.push([subset.length, distinctFamilies(subset), p]);
    highestPhotos = Math.max(highestPhotos, p);
  }
  const eligible = possibilities.filter(tuple => tuple[2] >= Math.min(highestPhotos, min));
  eligible.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  return eligible[0]?.slice(0, 2) ?? [0, 0];
}
for (let seed = 1; seed <= 100; seed++) {
  const random = seeded(seed * 1023);
  const source = [
    ...photos.slice(0, Math.floor(random() * 7)),
    ...text.slice(0, Math.floor(random() * 9)),
  ].map(q => ({ ...q, family: `fixture-${Math.floor(random() * 6)}` }));
  const before = JSON.stringify(source);
  for (const [count, min, max] of plan) {
    const expected = optimum(source, count, min, max);
    for (const input of [source, [...source, other], [...source, ...source.slice(0, 2)]]) {
      const picked = m.getTestingQuestions('mixed', count, seeded(seed), 'beginner', input);
      verify(picked, source, max);
      assert.deepEqual([picked.length, distinctFamilies(picked)], expected, `largest legal set, then most families: ${count}/${seed}`);
    }
  }
  assert.equal(JSON.stringify(source), before, 'no pool mutation');
}

// Winning new quotas never retroactively reshape an ordinary or a trial attempt.
const legacyOrdinary = m.getLearningLevelQuestions('mixed', 10, seeded(1), 1);
assert.deepEqual(legacyOrdinary.flatMap((q, i) => isBeginnerPhoto(q) ? [i + 1] : []), [1, 2, 4, 9]);
const legacyBasic = oldTrial('basic', seeded(1));
assert.ok(shape(legacyBasic).photos > 4);
const now = 1_800_000_000_000;
for (const [source, trial] of [[legacyOrdinary, false], [legacyBasic, true]]) {
  const startTime = now - 1000;
  const attempt = { ...m.prepareAttemptQuestions(source, seeded(17)),
    currentIndex: 0, userAnswers: {}, submittedQuestions: {}, startTime, isCompleted: false,
    mode: 'mixed', difficulty: trial ? 'mixed' : 'beginner', requestedCount: source.length,
    feedbackMode: trial ? 'exam' : 'instant', attemptId: 'pre-photo-plan', progressEpoch: 'pre-policy-stats',
    ...(trial ? { trialDeadline: startTime + m.TRIAL_MINUTES * 60_000, trialDifficulty: 'basic' } : {}),
  };
  const restored = m.restoreSession(JSON.stringify(attempt), m.ALL_QUESTIONS, now);
  assert.deepEqual(restored?.questions, attempt.questions);
  assert.deepEqual(restored?.answerOrders, attempt.answerOrders);
  assert.equal(restored?.trialDeadline, attempt.trialDeadline);
}
console.log('PASS: 5000 ordinary seeds, 1000 basic trials, zero quota/adjacency violations; sparse/family optimum and legacy guards',
  JSON.stringify({ priorOrdinary: baseline, priorBasic: baselineBasic }));
