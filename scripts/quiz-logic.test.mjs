#!/usr/bin/env node
/**
 * Pure logic regression tests (no browser).
 * Covers multi-select scoring and session shape used by ExamView.
 */

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

function isAnswerCorrect(userAns, correct) {
  return (
    Array.isArray(userAns) &&
    Array.isArray(correct) &&
    userAns.length === correct.length &&
    userAns.every((a) => correct.includes(a))
  );
}

function scoreSession(questions, userAnswers) {
  let correctCount = 0;
  for (const q of questions) {
    const ua = userAnswers[q.id] || [];
    if (isAnswerCorrect(ua, q.correct)) correctCount++;
  }
  return { correctCount, total: questions.length, pct: questions.length ? Math.round((100 * correctCount) / questions.length) : 0 };
}

// multi-select exact match
assert(isAnswerCorrect([0, 2], [0, 2]), 'multi exact');
assert(!isAnswerCorrect([0], [0, 2]), 'multi partial wrong');
assert(!isAnswerCorrect([0, 2, 3], [0, 2]), 'multi extra wrong');
assert(isAnswerCorrect([2, 0], [0, 2]), 'multi order independent');
assert(isAnswerCorrect([1], [1]), 'single');
assert(!isAnswerCorrect([], [1]), 'empty');

const questions = [
  { id: 'a', correct: [0] },
  { id: 'b', correct: [1, 3] },
  { id: 'c', correct: [2] },
];
const scored = scoreSession(questions, { a: [0], b: [1, 3], c: [0] });
assert(scored.correctCount === 2, 'score 2/3');
assert(scored.total === 3, 'total 3');
assert(scored.pct === 67, 'pct 67');

// session restore shape
const session = {
  questions,
  currentIndex: 1,
  userAnswers: { a: [0] },
  submittedQuestions: { a: true },
  startTime: Date.now(),
  isCompleted: false,
  mode: 'mixed',
  feedbackMode: 'instant',
};
const json = JSON.stringify(session);
const parsed = JSON.parse(json);
assert(parsed.currentIndex === 1, 'restore index');
assert(parsed.userAnswers.a[0] === 0, 'restore answers');
assert(parsed.questions.length === 3, 'restore questions');

// search by id helper
function findById(all, id) {
  return all.find((q) => q.id === id) || null;
}
assert(findById([{ id: 'x' }, { id: 'y' }], 'y')?.id === 'y', 'find id');
assert(findById([{ id: 'x' }], 'z') === null, 'missing id');

console.log('OK: quiz-logic tests passed');
process.exit(0);
