import assert from 'node:assert/strict';
import { bundleEntry } from './load-bank.mjs';
import { readFileSync } from 'node:fs';

const { ALL_QUESTIONS } = await bundleEntry('src/data/questionsData.ts', 'production-compat-bank.mjs');
const { restoreSession, isPreviousProductionQuestion, prepareAttemptQuestions, readSavedAttempts, writeAttemptSlot } = await bundleEntry('src/utils/examProgress.ts', 'production-compat-progress.mjs');
const { serializeReview, restoreReview } = await bundleEntry('src/utils/examReview.ts', 'production-compat-review.mjs');
const snapshots = Object.values(JSON.parse(readFileSync('src/data/previousProductionQuestions.json', 'utf8')));
assert.ok(snapshots.length > 30);

for (const source of snapshots) {
  assert.ok(ALL_QUESTIONS.find(question => question.id === source.id), source.id);
  for (const shuffled of [false, true]) {
    const order = source.answers.map((_, index) => index);
    if (shuffled) order.reverse();
    const answers = order.map(index => source.answers[index]);
    const correct = order.flatMap((index, displayed) => source.correct.includes(index) ? [displayed] : []);
    const questions = [{ ...source, answers, correct }];
    const attempt = {
      questions, currentIndex: 0, userAnswers: { [source.id]: correct },
      submittedQuestions: { [source.id]: true }, startTime: Date.now() - 1000,
      attemptId: 'n4-attempt', progressEpoch: 'n4-epoch', isCompleted: false,
      mode: 'mixed', feedbackMode: 'instant', difficulty: 'mixed',
      ...(shuffled ? { answerOrders: { [source.id]: order } } : {}),
    };
    const restored = restoreSession(JSON.stringify(attempt), ALL_QUESTIONS);
    assert.deepEqual(restored?.questions, questions, source.id);
    assert.equal(isPreviousProductionQuestion(restored.questions[0]), true, source.id);
    assert.deepEqual(restored?.userAnswers, attempt.userAnswers);
    assert.equal(restored?.progressEpoch, attempt.progressEpoch);

    const completed = { ...attempt, isCompleted: true, endTime: Date.now() };
    assert.deepEqual(restoreReview(serializeReview(completed), 'n4-epoch')?.questions, questions);

    const malformed = { ...attempt, questions: [{ ...questions[0], answers: ['invalid'] }] };
    assert.equal(restoreSession(JSON.stringify(malformed), ALL_QUESTIONS), null, source.id);
  }
}
console.log(`PASS: ${snapshots.length} N4 snapshots, shuffled and bank-order sessions, saved reviews and malformed variants`);


const { createProgressStore, PROGRESS_KEY, LEGACY_ACTIVE_ATTEMPT_KEY, N5_ACTIVE_ATTEMPT_KEY } =
  await bundleEntry('src/utils/userProgress.ts', 'production-compat-storage.mjs');
const storageValues = new Map();
const storage = {
  getItem: (key) => storageValues.get(key) ?? null,
  setItem: (key, value) => storageValues.set(key, value),
  removeItem: (key) => storageValues.delete(key),
};
const epoch = createProgressStore(ALL_QUESTIONS, () => storage).load().epoch;
const now = Date.now();
const n5Only = ALL_QUESTIONS.find(question => question.id === 'l4-new-01');
assert.ok(n5Only, 'Known new N5-only bank entry');
const n5Data = prepareAttemptQuestions([n5Only], () => 0);
const n4Data = { questions: [snapshots[0]] };
const sample = (id, data) => ({
  ...data, attemptId: id, progressEpoch: epoch, startTime: now - 2000,
  currentIndex: 0, isCompleted: false, mode: 'mixed', feedbackMode: 'instant',
  userAnswers: { [data.questions[0].id]: [0] },
  submittedQuestions: { [data.questions[0].id]: true },
});
const n5 = JSON.stringify({ ...sample('old-n5', n5Data), difficulty: 'in-depth' });
const n4 = JSON.stringify(sample('newer-n4', n4Data));
const view = (backups = [], currentEpoch = epoch) => readSavedAttempts(storage, backups, ALL_QUESTIONS, currentEpoch, now);

// Prior rollout wrote N5 into the shared key. N4 can reject and back it up,
// then replace the shared key with its new attempt. Read-only discovery must
// leave that new N4 attempt intact and offer the old backup separately.
storage.setItem(LEGACY_ACTIVE_ATTEMPT_KEY, n4);
assert.deepEqual(view([n5, n5, 'malformed']).attempts.map(item => [item.origin, item.session.attemptId]),
  [[LEGACY_ACTIVE_ATTEMPT_KEY, 'newer-n4'], ['backup', 'old-n5']]);
assert.equal(storage.getItem(LEGACY_ACTIVE_ATTEMPT_KEY), n4);
assert.equal(storage.getItem(N5_ACTIVE_ATTEMPT_KEY), null);
const archived = view([n5]).attempts[1].session;
assert.deepEqual(archived.questions, n5Data.questions);
assert.deepEqual(archived.answerOrders, n5Data.answerOrders);
assert.deepEqual(archived.userAnswers, JSON.parse(n5).userAnswers);
writeAttemptSlot(storage, N5_ACTIVE_ATTEMPT_KEY, null, n5);
assert.equal(storage.getItem(LEGACY_ACTIVE_ATTEMPT_KEY), n4);
assert.deepEqual(view([n5]).attempts.map(item => [item.origin, item.session.attemptId]),
  [[N5_ACTIVE_ATTEMPT_KEY, 'old-n5'], [LEGACY_ACTIVE_ATTEMPT_KEY, 'newer-n4']]);

// A rollback can update the legacy slot even in another same-origin tab.
const nextN4 = JSON.stringify(sample('next-n4', n4Data));
storage.setItem(LEGACY_ACTIVE_ATTEMPT_KEY, nextN4);
assert.throws(() => writeAttemptSlot(storage, LEGACY_ACTIVE_ATTEMPT_KEY, n4, 'stale'), /changed/);
assert.equal(storage.getItem(LEGACY_ACTIVE_ATTEMPT_KEY), nextN4);
assert.equal(storage.getItem(N5_ACTIVE_ATTEMPT_KEY), n5);
assert.deepEqual(view([n5], 'reset-in-n4').attempts, []);
storage.setItem(N5_ACTIVE_ATTEMPT_KEY, JSON.stringify({ ...JSON.parse(n5), isCompleted: true, endTime: now }));
assert.deepEqual(view([n5]).attempts.map(item => item.session.attemptId), ['next-n4'],
  'A completed recovery must not revive its abandoned partial snapshot');
createProgressStore(ALL_QUESTIONS, () => storage).reset();
assert.equal(storage.getItem(LEGACY_ACTIVE_ATTEMPT_KEY), null);
assert.equal(storage.getItem(N5_ACTIVE_ATTEMPT_KEY), null);
console.log('PASS: production N4/N5 rollback slots, explicit backup recovery, stale writes and reset epochs');

const unreadableN5 = '{"questions":[]}';
storage.setItem(N5_ACTIVE_ATTEMPT_KEY, unreadableN5);
assert.deepEqual(view().unreadable, [N5_ACTIVE_ATTEMPT_KEY]);
let rejectArchive = true;
const archiveStore = createProgressStore(ALL_QUESTIONS, () => ({
  ...storage,
  setItem(key, value) {
    if (key === PROGRESS_KEY && rejectArchive) throw Error('quota');
    storage.setItem(key, value);
  },
}));
assert.equal(archiveStore.retainBackup(N5_ACTIVE_ATTEMPT_KEY, unreadableN5), false);
assert.equal(storage.getItem(N5_ACTIVE_ATTEMPT_KEY), unreadableN5);
assert.equal(JSON.parse(storage.getItem(PROGRESS_KEY)).backup[N5_ACTIVE_ATTEMPT_KEY], undefined);
rejectArchive = false;
assert.equal(archiveStore.retainBackup(N5_ACTIVE_ATTEMPT_KEY, unreadableN5), true);
assert.equal(JSON.parse(storage.getItem(PROGRESS_KEY)).backup[N5_ACTIVE_ATTEMPT_KEY], unreadableN5);
writeAttemptSlot(storage, N5_ACTIVE_ATTEMPT_KEY, unreadableN5, n5);
assert.equal(JSON.parse(storage.getItem(PROGRESS_KEY)).backup[N5_ACTIVE_ATTEMPT_KEY], unreadableN5);
console.log('PASS: unreadable N5 slot is not replaced unless archived');
