import assert from 'node:assert/strict';
import { bundleEntry } from './load-bank.mjs';
import { readFileSync } from 'node:fs';

const { ALL_QUESTIONS } = await bundleEntry('src/data/questionsData.ts', 'production-compat-bank.mjs');
const { restoreSession, isPreviousProductionQuestion, prepareAttemptQuestions, readSavedAttempts, writeAttemptSlot, recordConfirmedAnswers, hasDurableAnswerReceipts, expireTrial } = await bundleEntry('src/utils/examProgress.ts', 'production-compat-progress.mjs');
const { serializeReview, restoreReview, reconcileLastReview, LAST_REVIEW_KEY } = await bundleEntry('src/utils/examReview.ts', 'production-compat-review.mjs');
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


// A slot write and its derives are separate durable transactions. Derivatives
// can replay only from an accepted slot and must not cache a failed update.
const progressData = new Map();
let blocked = new Set();
const baseStorage = {
  getItem: key => progressData.get(key) ?? null,
  setItem: (key, value) => progressData.set(key, value),
  removeItem: key => progressData.delete(key),
};
const storeAStorage = {
  ...baseStorage,
  setItem(key, value) {
    if (blocked.has(key)) throw Error('quota');
    baseStorage.setItem(key, value);
  },
};
const replicaA = createProgressStore(ALL_QUESTIONS, () => storeAStorage, () => now);
const replicaB = createProgressStore(ALL_QUESTIONS, () => baseStorage, () => now);
const reviewEpoch = replicaA.load().epoch;
const completed = { ...sample('durable-completed', n5Data),
  progressEpoch: reviewEpoch, isCompleted: true, endTime: now - 1 };
const chosenId = completed.questions[0].id;
const acceptedRaw = JSON.stringify(completed);
writeAttemptSlot(baseStorage, N5_ACTIVE_ATTEMPT_KEY, null, acceptedRaw);
blocked = new Set([PROGRESS_KEY, LAST_REVIEW_KEY, N5_ACTIVE_ATTEMPT_KEY]);
const failedReplacement = JSON.stringify({ ...completed, attemptId: 'never-accepted' });
assert.throws(() => writeAttemptSlot(storeAStorage, N5_ACTIVE_ATTEMPT_KEY, acceptedRaw, failedReplacement), /quota/);
assert.equal(baseStorage.getItem(N5_ACTIVE_ATTEMPT_KEY), acceptedRaw);
recordConfirmedAnswers(completed, replicaA.recordDurably);
assert.equal(hasDurableAnswerReceipts(baseStorage, completed), false);
assert.throws(() => reconcileLastReview(storeAStorage, completed), /quota/);
assert.equal(baseStorage.getItem(LAST_REVIEW_KEY), null);
assert.equal(replicaB.recordDurably(chosenId, false, 'other-tab-receipt', reviewEpoch, now - 6), true);
blocked.clear();
recordConfirmedAnswers(completed, replicaA.recordDurably);
assert.equal(hasDurableAnswerReceipts(baseStorage, completed), true);
assert.equal(reconcileLastReview(storeAStorage, completed).attemptId, completed.attemptId);
const afterRepair = baseStorage.getItem(PROGRESS_KEY);
recordConfirmedAnswers(completed, replicaA.recordDurably);
reconcileLastReview(storeAStorage, completed);
assert.equal(baseStorage.getItem(PROGRESS_KEY), afterRepair);
assert.equal(JSON.parse(afterRepair).receipts['other-tab-receipt'], true);
assert.equal(JSON.parse(afterRepair).questions[chosenId].seen, 2);
assert.equal(restoreReview(baseStorage.getItem(LAST_REVIEW_KEY), reviewEpoch).attemptId, completed.attemptId);

const trialRaw = { ...completed, attemptId: 'durable-trial', startTime: now - 15 * 60_000 - 5,
  feedbackMode: 'exam', trialDeadline: now - 5, isCompleted: false, endTime: undefined };
recordConfirmedAnswers(trialRaw, replicaB.recordDurably);
assert.equal(baseStorage.getItem(PROGRESS_KEY), afterRepair, 'incomplete timed attempt never counts');
const trialCompleted = expireTrial(trialRaw, now);
writeAttemptSlot(baseStorage, LEGACY_ACTIVE_ATTEMPT_KEY, null, JSON.stringify(trialCompleted));
recordConfirmedAnswers(trialCompleted, replicaB.recordDurably);
assert.equal(hasDurableAnswerReceipts(baseStorage, trialCompleted), true);
assert.equal(reconcileLastReview(baseStorage, trialCompleted).attemptId, completed.attemptId,
  'replayed older trial must not replace a newer valid review');
console.log('PASS: rejected slot unchanged, durable replay repairs stats and review, concurrent receipts survive quota and trial replay');
