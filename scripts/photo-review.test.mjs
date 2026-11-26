import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { bundleEntry } from './load-bank.mjs';

const read = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fixture = read('scripts/fixtures/photo-review-baseline.json');
const questions = read('src/data/questions.json');
const registry = read('src/data/questionLearningLevels.json');
const levels = { 'photo-cable-colors': 3, 'l1v2-a-contact-solid': 1, 'l1v2-b-strip-hole': 1,
  'l1v2-b-cleave-sequence': 3, 'l1v2-c-closure-service': 2 };
const changed = fixture.originalQuestions.map(q => q.id);
const questionsAtPhotoReview = questions.map(question => {
  if (question.id !== 'l4-08') return question;
  // This later audit assigned a family to the TCP RST ticket. Preserve the photo-era content snapshot.
  const { family, ...original } = question;
  assert.equal(family, 'tcp-rst-meaning');
  return original;
});
const { PREVIOUS_IN_DEPTH_QUESTIONS } = await bundleEntry('src/data/inDepth/previousQuestions.ts', 'photo-l2-history.mjs');
const photoEraQuestions=questionsAtPhotoReview.map(q =>
  (q.id==='tr-03'||q.id==='tr-10') ? {...q,answers:PREVIOUS_IN_DEPTH_QUESTIONS[q.id].answers} : q);
assert.equal(hash(photoEraQuestions.filter(q => !changed.includes(q.id))), fixture.unchangedQuestionsSHA256,
  'all other questions, including the three PASS and photo-cable-terminate, remain unchanged');
const baseline = read('docs/audits/issue-171-baseline.json');
const { previousRegistryEntries } = baseline.technicalReviewClosure;
// Restore only the four independently reviewed 2026-11-19 classifications to the
// previous photo-era snapshot, while asserting the exact approved current metadata.
const sixReviewLevelChanges = {
  'l3-d05': {
    previous: 'Распознать (L3 · NAT): Комбинации адресов и портов (и протокола)',
    current: 'L2: требуется понимание many-to-one NAT/PAT — различение сессий по адресам, портам и протоколу.',
  },
  'l4-d03': {
    previous: 'Распознать (L4 · TCP): Корректно обработать запоздалые сегменты и обеспечить надежность закрытия',
    current: 'L2: TIME-WAIT и обработка запоздалых сегментов — концепция FSM закрытия TCP, выше чистой базы.',
  },
  'l4-d05': {
    previous: 'Распознать (L4 · TCP): Подтверждать несмежные блоки и эффективнее догонять потери',
    current: 'L2: SACK — подтверждение несмежных блоков TCP, требует понимания потерь и восстановления.',
  },
  'tcpip-d05': {
    previous: 'Распознать (TCP/IP · ECN): Сигнализировать перегрузку без обязательного drop (CE mark)',
    current: 'L2: ECN — сигнализация перегрузки без обязательного drop; выше начального уровня.',
  },
};
const registryAtPhotoReview = Object.fromEntries(Object.entries(registry)
  .filter(([id]) => !Object.hasOwn(levels, id) && !baseline.diagnosticPack177.added.includes(id) && !baseline.monitoringPack.added.includes(id) && !baseline.wifiPack.added.includes(id) && !baseline.expertPack225.added.includes(id) && !baseline.expertPack177.added.includes(id))
  .map(([id, entry]) => {
    // Issue #257: only these four previously L1 assignments were independently moved to L2.
    // Reconstruct the photo-era registry for the original unchanged-scope fingerprint;
    // every other ID and metadata field remains protected by the original hash.
    const reviewed = sixReviewLevelChanges[id];
    if (reviewed) {
      assert.equal(entry.status, 'ASSIGNED', id);
      assert.equal(entry.learningLevel, 2, id + ': approved L1->L2 migration');
      assert.equal(entry.auditRationale, reviewed.current, id + ': approved explanation for L2');
      return [id, { ...entry, learningLevel: 1, auditRationale: reviewed.previous }];
    }
    return [id, previousRegistryEntries[id] ?? entry];
  }));
assert.equal(hash(registryAtPhotoReview),
  fixture.unchangedRegistrySHA256, 'all other metadata, including nine technical REVIEW, remain unchanged');
const byId = Object.fromEntries(questions.map(q => [q.id, q]));
for (const [id, level] of Object.entries(levels)) {
  const q = byId[id], entry = registry[id];
  assert.equal(q.answers.length, 4);
  assert.equal(q.correct.length, 1);
  assert.ok(Number.isInteger(q.correct[0]) && q.correct[0] >= 0 && q.correct[0] < 4);
  assert.equal(new Set(q.answers).size, 4);
  assert.ok(!q.text.includes(q.answers[q.correct[0]]), 'condition does not quote the correct option');
  assert.equal(entry.status, 'ASSIGNED');
  assert.equal(entry.learningLevel, level);
}
const contactBefore = fixture.originalQuestions.find(q => q.id === 'l1v2-a-contact-solid');
assert.deepEqual({ ...byId[contactBefore.id], imageAlt: contactBefore.imageAlt }, contactBefore,
  'contact question changes only its alt description');
const stripBefore = fixture.originalQuestions.find(q => q.id === 'l1v2-b-strip-hole');
assert.doesNotMatch(`${byId[stripBefore.id].text} ${byId[stripBefore.id].imageAlt}`,
  /раскрыт|развед|сомкнут|волокна между|слева/i,
  'condition and alt must not disclose the observed jaw/fibre state or its position');
for (const field of ['id', 'group', 'topic', 'image', 'template', 'family', 'difficulty']) {
  assert.deepEqual(byId[stripBefore.id][field], stripBefore[field]);
}

const { ALL_QUESTIONS, getLearningLevelQuestions, prepareAttemptQuestions, restoreSession,
  serializeReview, restoreReview } =
  await bundleEntry('scripts/learning-level-exam-entry.ts', 'photo-review-tests.mjs');
assert.equal(byId['photo-cable-colors'].family, byId['photo-cable-terminate'].family);
for (let seed = 1; seed <= 100; seed++) {
  let state = seed;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 2 ** 32; };
  const selected = getLearningLevelQuestions('visual-l1', 10, random, 3);
  assert.ok(selected.filter(q => q.family === byId['photo-cable-colors'].family).length <= 1,
    'sufficient photo pool does not repeat the cable family');
}
// Production restores an exact N4 snapshot and rejects mismatched stored keys.
const now = 1_800_000_000_000;
const snapshot = { ...prepareAttemptQuestions([stripBefore], () => 0.5), currentIndex: 0,
  userAnswers: {}, submittedQuestions: {}, startTime: now - 1000, isCompleted: false,
  mode: 'visual-l1', feedbackMode: 'instant', attemptId: 'pre-photo-review', progressEpoch: 'old-epoch' };
const restored = restoreSession(JSON.stringify(snapshot), ALL_QUESTIONS, now);
assert.deepEqual(restored?.questions, snapshot.questions, 'known N4 photo keeps the historical content and key');
const invalid = { ...snapshot, questions: [{ ...snapshot.questions[0], correct: [1] }] };
assert.equal(restoreSession(JSON.stringify(invalid), ALL_QUESTIONS, now), null);
const completed = { ...snapshot, isCompleted: true };
const review = restoreReview(serializeReview(completed), snapshot.progressEpoch);
assert.ok(review);
assert.deepEqual(review.questions, snapshot.questions, 'completed review keeps the historical content/key');
console.log('PASS: five photo levels, four options/one key, unchanged photo review scope, cable family sampling, trusted N4 attempt, invalid key rejection and historical review');
