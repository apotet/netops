import assert from 'node:assert/strict';
import { bundleEntry } from './load-bank.mjs';
import { readFileSync } from 'node:fs';

const { ALL_QUESTIONS } = await bundleEntry('src/data/questionsData.ts', 'production-compat-bank.mjs');
const { restoreSession, isPreviousProductionQuestion } = await bundleEntry('src/utils/examProgress.ts', 'production-compat-progress.mjs');
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
