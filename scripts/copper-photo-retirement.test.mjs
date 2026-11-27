import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { bundleEntry } from './load-bank.mjs';
import { bankBeforeCopperPhotoChanges, bankBeforeOpticalWordingChange, previousOpticalInspection, previousCopperUtp, retiredPvcPhoto as retired } from './copper-photo-history-fixtures.mjs';

const runtime = await bundleEntry('scripts/learning-level-exam-entry.ts', 'retired-pvc-photo-runtime.mjs');
const { BASE_FOUNDATIONS_BATCH5 } = await bundleEntry('src/data/baseFoundationsBatch5.ts', 'retired-pvc-photo-overlays.mjs');
const { LESSONS, QUESTION_SECTION_LINKS } = await bundleEntry('scripts/lesson-section-links-entry.ts', 'retired-pvc-photo-lesson-map.mjs');
const { createProgressStore, PROGRESS_KEY } = await bundleEntry('src/utils/userProgress.ts', 'retired-pvc-photo-progress.mjs');
const { ALL_QUESTIONS: bank, QUESTION_LEARNING_LEVELS: registry, QUIZ_MODES } = runtime;
const id = 'l1v2-a-pvc-read';
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Exact post-filter projections derived independently from staging 3da4d9c, not today's candidate.
assert.equal(bank.length, 861);
const copperEraBank = bankBeforeOpticalWordingChange(bank);
assert.equal(hash(copperEraBank.filter(q => q.id !== previousCopperUtp.id)), 'e82c26e7f46fdca5a529347fc5489f720be6d53807b3bbab442f36e4ae9b0553');
assert.equal(hash(copperEraBank), 'e16e9241a6c47173fcd05ad5109e1faa490bcba762cf51fc9b517c2842bff335');
const currentUtp = bank.find(q => q.id === previousCopperUtp.id);
assert.equal(currentUtp.image, 'assets/photos/copper-utp-section.webp');
assert.equal(currentUtp.imageAlt, 'Поперечный срез кабеля рядом с масштабной линейкой');
assert.equal(currentUtp.text, 'Какое обозначение экранирования соответствует кабелю на этом срезе?');
assert.deepEqual(currentUtp.answers, ['F/UTP', 'S/FTP', 'F/FTP', 'U/UTP']);
assert.deepEqual(currentUtp.correct, [3]);
const oldUtp = { ...currentUtp, ...previousCopperUtp };
assert.equal(hash(registry), '7947d3faf8b94d7f4ad1074d8be01d8ecc1d0290da67720e33c5ddc0902ff5a6');
assert.equal(hash(retired), '9c2dc555dd1819b7561115e54ede3734cf1a373995a275eff35c50747eb2672f');
assert.equal(retired.id, id);
assert.equal(retired.image, 'assets/photos/copper-pvc-label.webp');
assert.equal(runtime.resolveImageUrl(retired.image),
  'https://raw.githubusercontent.com/apotet/osi-tcpip-exam-public/1c52fa81222167dc4377fe4788de86f3e36ad444/assets/photos/copper-pvc-label.webp');
assert.ok(!bank.some(q => q.id === id || q.image === retired.image));
assert.ok(!Object.hasOwn(registry, id));
assert.ok(!Object.hasOwn(BASE_FOUNDATIONS_BATCH5, id));
assert.equal(runtime.getLessonForQuestion(id), undefined);
assert.ok(!LESSONS.some(lesson => lesson.relatedQuestionIds.includes(id)));
assert.ok(!QUESTION_SECTION_LINKS.some(link => link.questionIds.includes(id)));

const clean = questions => assert.ok(!questions.some(q => q.id === id), 'not selectable');
for (const { id: mode } of QUIZ_MODES) {
  for (const difficulty of ['beginner', 'in-depth', 'applied', 'mixed']) clean(runtime.getTestingPool(mode, difficulty));
  for (const level of [1, 2, 3, 4, 5]) clean(runtime.getLearningLevelPool(mode, level));
}
assert.equal(runtime.getTestingPool('mixed', 'beginner').length, 215);
assert.equal(runtime.getTestingPool('visual-l1', 'mixed').length, 192);
for (const difficulty of ['basic', 'advanced', 'mixed']) for (let seed = 1; seed <= 100; seed++) {
  let state = seed;
  const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  const selected = runtime.getTrialExamQuestions(difficulty, random);
  assert.equal(selected.length, 20);
  clean(selected);
}

const now = 1_800_000_000_000;
const common = {
  currentIndex: 0, userAnswers: {}, submittedQuestions: {}, startTime: now - 2000,
  isCompleted: false, mode: 'visual-l1', feedbackMode: 'instant', progressEpoch: 'before-retirement',
};
const legacy = { ...common, questions: [retired] };
assert.deepEqual(runtime.restoreSession(JSON.stringify(legacy), bank, now)?.questions, [retired]);
const shuffled = runtime.prepareAttemptQuestions([retired], () => 0.5);
const attempt = { ...common, ...shuffled, attemptId: 'retired-photo-attempt' };
const confirmed = runtime.confirmAnswer(attempt, shuffled.questions[0].correct, now - 1000);
const restored = runtime.restoreSession(JSON.stringify(confirmed), bank, now);
assert.deepEqual(restored?.questions, confirmed.questions);
assert.deepEqual(restored?.answerOrders, confirmed.answerOrders);
assert.deepEqual(restored?.userAnswers, confirmed.userAnswers);
assert.equal(runtime.restoreSession(JSON.stringify({
  ...common, questions: bankBeforeCopperPhotoChanges(bank), mode: 'mixed',
}), bank, now)?.questions.length, 862);
for (const mutate of [
  current => { current.questions[0].correct = [0]; },
  current => { current.questions[0].text = 'Not the retired question'; },
  current => { current.questions[0].id = 'unknown-question'; },
  current => { current.questions[0].image = 'assets/photos/not-retired.webp'; },
  current => { current.questions[0].answers[0] = 'Not the saved option'; },
  current => { current.answerOrders = {}; },
  current => { current.answerOrders = { [id]: [0, 1, 1, 3] }; },
]) {
  const modified = structuredClone(legacy);
  mutate(modified);
  assert.equal(runtime.restoreSession(JSON.stringify(modified), bank, now), null);
}
const duplicate = { ...legacy, questions: [retired, retired] };
assert.equal(runtime.restoreSession(JSON.stringify(duplicate), bank, now), null);
for (const source of [oldUtp, currentUtp]) {
  for (const saved of [{ questions: [source] }, runtime.prepareAttemptQuestions([source], () => 0.5)]) {
    const combined = { ...common, ...saved };
    assert.deepEqual(runtime.restoreSession(JSON.stringify(combined), bank, now)?.questions, saved.questions);
  }
}
for (const wrongUtp of [
  { ...oldUtp, text: currentUtp.text },
  { ...currentUtp, answers: oldUtp.answers },
  { ...oldUtp, correct: [0] },
  { ...oldUtp, text: 'Unrecognized wording' },
]) assert.equal(runtime.restoreSession(JSON.stringify({ ...common, questions: [wrongUtp] }), bank, now), null);
const completed = { ...restored, isCompleted: true };
const review = runtime.restoreReview(runtime.serializeReview(completed), common.progressEpoch);
assert.deepEqual(review.questions, confirmed.questions);
const [row] = runtime.reviewRows(review);
assert.equal(row.lesson, undefined);
assert.equal(row.status, 'correct');

const fakeStorage = (data = {}) => ({
  getItem: key => data[key] ?? null, setItem: (key, value) => { data[key] = value; },
});
const storage = fakeStorage();
const before = createProgressStore(bankBeforeCopperPhotoChanges(bank), () => storage, () => now);
assert.equal(before.record(id, false, 'old-receipt', common.progressEpoch, now - 1000), false);
const old = before.load();
assert.equal(before.record(id, false, 'old-receipt', old.epoch, now - 1000), true);
const oldRaw = storage.getItem(PROGRESS_KEY);
const after = createProgressStore(bank, () => storage, () => now, [retired]);
assert.equal(after.summary().answeredCount, 1, 'historic answer remains visible');
assert.equal(after.summary().levels['visual-l1'].total, 1, 'historic photo statistics stay counted');
assert.equal(after.summary().visualTotal, 192, 'active photo coverage does not count retired items');
assert.deepEqual(after.mistakes(), [], 'retired mistakes cannot start new questions');
assert.equal(storage.getItem(PROGRESS_KEY), oldRaw, 'startup/review do not rewrite history');
const active = { ...restored, progressEpoch: old.epoch };
runtime.recordConfirmedAnswers(active, after.record);
runtime.recordConfirmedAnswers(active, after.record);
assert.equal(after.summary().answeredCount, 2);
assert.equal(after.summary().correctCount, 1);
assert.equal(after.load().receipts['old-receipt'], true);
assert.equal(after.load().receipts[attempt.attemptId + ':' + id], true);
const oldShuffledStorage = fakeStorage({ osi_active_session: JSON.stringify(confirmed) });
const migrated = createProgressStore(bank, () => oldShuffledStorage, () => now, [retired]);
assert.equal(migrated.summary().correctCount, 1, 'historical shuffled answer is graded by its saved order');
const oldShuffledUtp = runtime.prepareAttemptQuestions([oldUtp], () => 0.5);
assert.notDeepEqual(oldShuffledUtp.questions[0].correct, oldUtp.correct);
const confirmedUtp = { ...common, ...oldShuffledUtp,
  userAnswers: { [oldUtp.id]: oldShuffledUtp.questions[0].correct }, submittedQuestions: { [oldUtp.id]: true },
};
const migratedUtp = createProgressStore(bank, () => fakeStorage({ osi_active_session: JSON.stringify(confirmedUtp) }), () => now, [retired]);
assert.equal(migratedUtp.summary().correctCount, 1, 'old U/UTP labels also replay the confirmed displayed slot');
const wrongLegacyUtp = structuredClone(confirmedUtp);
wrongLegacyUtp.questions[0].answers[0] = 'Unrecognized label';
const sanitized = createProgressStore(bank, () => fakeStorage({ osi_active_session: JSON.stringify(wrongLegacyUtp) }), () => now, [retired]);
assert.equal(sanitized.summary().answeredCount, 0, 'an invalid old form does not become a migrated statistic');

// A terminology-only edit must keep both forms and the shuffled grading of older attempts.
const currentOptical = bank.find(q => q.id === previousOpticalInspection.id);
const oldOptical = { ...currentOptical, ...previousOpticalInspection };
assert.notEqual(currentOptical.text, oldOptical.text);
for (const optical of [oldOptical, currentOptical]) {
  for (const saved of [{ questions: [optical] }, runtime.prepareAttemptQuestions([optical], () => 0.5)]) {
    const session = { ...common, ...saved };
    const restoredOptical = runtime.restoreSession(JSON.stringify(session), bank, now);
    assert.deepEqual(restoredOptical?.questions, saved.questions);
    const completedOptical = { ...restoredOptical, isCompleted: true };
    assert.deepEqual(runtime.restoreReview(runtime.serializeReview(completedOptical), common.progressEpoch)?.questions, saved.questions);
    const activeOptical = { ...session, userAnswers: { [optical.id]: saved.questions[0].correct },
      submittedQuestions: { [optical.id]: true } };
    const migratedOptical = createProgressStore(bank, () => fakeStorage({ osi_active_session: JSON.stringify(activeOptical) }), () => now);
    assert.equal(migratedOptical.summary().correctCount, 1);
  }
}
for (const question of [
  { ...oldOptical, text: 'Unknown stem' }, { ...oldOptical, correct: [0] },
  { ...oldOptical, image: 'assets/photos/unknown.webp' },
]) assert.equal(runtime.restoreSession(JSON.stringify({ ...common, questions: [question] }), bank, now), null);
console.log('PASS: one exact removal, one narrow U/UTP edit, other 860 identical, no active links/sampling, trusted historical attempts and receipts restored');
