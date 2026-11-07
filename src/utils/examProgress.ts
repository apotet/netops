import type { QuizSession, Question, QuizModeId } from '../types/quiz';
import { getProgressEpoch, recordQuestionResult } from './userProgress';

export type ProgressSession = QuizSession & { attemptId?: string; progressEpoch?: string; legacySubmittedIds?: string[]; answerTimes?: Record<string, number>; answerOrders?: Record<string, number[]> };

/** Shuffle copies once per attempt; order entries map displayed indices to bank indices. */
export function prepareAttemptQuestions(source: readonly Question[], random = Math.random): Pick<ProgressSession, 'questions' | 'answerOrders'> {
  const answerOrders: Record<string, number[]> = {};
  const questions = source.map(question => {
    const order = question.answers.map((_, index) => index);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    answerOrders[question.id] = order;
    return { ...question, answers: order.map(index => question.answers[index]),
      correct: order.flatMap((index, displayed) => question.correct.includes(index) ? [displayed] : []) };
  });
  return { questions, answerOrders };
}

export function identifySession(session: ProgressSession): ProgressSession {
  return { ...session, legacySubmittedIds: session.legacySubmittedIds || (session.attemptId ? [] : Object.keys(session.submittedQuestions || {}).filter(id => session.submittedQuestions[id])),
    attemptId: session.attemptId || `legacy:${session.startTime}:${session.questions.map(q => q.id).join(',')}`,
    progressEpoch: session.progressEpoch || getProgressEpoch() };
}
export function restoreSession(raw: string, bank: readonly Question[], now = Date.now()): ProgressSession | null {
  try {
    const saved = JSON.parse(raw);
    const modes: QuizModeId[] = ['mixed', 'l1-l2', 'l3', 'l4', 'l5-l7', 'tcpip', 'troubleshooting', 'visual-l1'];
    const object = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value);
    if (!saved || !Array.isArray(saved.questions) || !saved.questions.length || saved.questions.length > bank.length ||
        !Number.isInteger(saved.currentIndex) || saved.currentIndex < 0 || saved.currentIndex >= saved.questions.length ||
        !object(saved.userAnswers) || !object(saved.submittedQuestions) || typeof saved.isCompleted !== 'boolean' ||
        !modes.includes(saved.mode) || !['instant', 'exam'].includes(saved.feedbackMode) ||
        !Number.isFinite(saved.startTime) || saved.startTime <= 0 || saved.startTime > now ||
        (saved.attemptId !== undefined && typeof saved.attemptId !== 'string') ||
        (saved.progressEpoch !== undefined && typeof saved.progressEpoch !== 'string') ||
        (saved.legacySubmittedIds !== undefined && (!Array.isArray(saved.legacySubmittedIds) || saved.legacySubmittedIds.some((id: unknown) => typeof id !== 'string')))) return null;
    if (saved.difficulty !== undefined && !['beginner', 'mixed'].includes(saved.difficulty)) return null;
    if (saved.requestedCount !== undefined && (!Number.isSafeInteger(saved.requestedCount) || saved.requestedCount <= 0)) return null;
    if (saved.answerOrders !== undefined && !object(saved.answerOrders)) return null;
    const questions: Question[] = [];
    for (const item of saved.questions as Array<{ id?: unknown; answers?: unknown; correct?: unknown } | null>) {
      const question = bank.find(q => q.id === item?.id);
      if (!question) return null;
      if (saved.answerOrders === undefined) {
        // Old attempts used bank order. Never shuffle an answer already selected there.
        questions.push(question);
      } else {
        const order = saved.answerOrders[question.id];
        if (!Array.isArray(order) || order.length !== question.answers.length || new Set(order).size !== order.length ||
            order.some(index => !Number.isInteger(index) || index < 0 || index >= question.answers.length)) return null;
        const answers = order.map(index => question.answers[index]);
        const correct = order.flatMap((index, displayed) => question.correct.includes(index) ? [displayed] : []);
        // Reject bank drift/corrupt snapshots instead of silently changing saved answer meaning.
        if (JSON.stringify(item?.answers) !== JSON.stringify(answers) || JSON.stringify(item?.correct) !== JSON.stringify(correct)) return null;
        questions.push({ ...question, answers, correct });
      }
    }
    if (new Set(questions.map(q => q.id)).size !== questions.length) return null;
    for (const q of questions) {
      const chosen = saved.userAnswers[q.id];
      if (saved.submittedQuestions[q.id] !== undefined && typeof saved.submittedQuestions[q.id] !== 'boolean') return null;
      if (saved.submittedQuestions[q.id] && (!Array.isArray(chosen) || !chosen.length)) return null;
      if (chosen !== undefined && (!Array.isArray(chosen) || new Set(chosen).size !== chosen.length ||
          chosen.some(i => !Number.isInteger(i) || i < 0 || i >= q.answers.length))) return null;
      const time = saved.answerTimes?.[q.id];
      if (time !== undefined && (!Number.isSafeInteger(time) || time <= 0 || time > now)) return null;
    }
    return identifySession({ ...saved, questions });
  } catch { return null; }
}
export function answerCorrect(chosen: number[], correct: number[]): boolean {
  return chosen.length > 0 && new Set(chosen).size === chosen.length &&
    chosen.length === correct.length && chosen.every(index => correct.includes(index));
}
/** Replay only confirmed answers, including after a save-before-record interruption. */
export function recordConfirmedAnswers(session: ProgressSession, record = recordQuestionResult) {
  if (!session.attemptId || !session.progressEpoch) return;
  for (const q of session.questions) {
    const chosen = session.userAnswers[q.id];
    if (session.legacySubmittedIds?.includes(q.id) || !session.submittedQuestions[q.id] || !Array.isArray(chosen) || !chosen.length ||
        chosen.some(index => !Number.isInteger(index) || index < 0 || index >= q.answers.length)) continue;
    record(q.id, answerCorrect(chosen, q.correct), `${session.attemptId}:${q.id}`, session.progressEpoch, session.answerTimes?.[q.id]);
  }
}
export function confirmAnswer(session: ProgressSession, chosen: number[], now = Date.now()): ProgressSession {
  const q = session.questions[session.currentIndex];
  if (!q || session.isCompleted || session.submittedQuestions[q.id] || !chosen.length ||
      new Set(chosen).size !== chosen.length || chosen.some(index => !Number.isInteger(index) || index < 0 || index >= q.answers.length)) return session;
  return { ...session, userAnswers: { ...session.userAnswers, [q.id]: [...chosen] },
    answerTimes: { ...session.answerTimes, [q.id]: now },
    submittedQuestions: { ...session.submittedQuestions, [q.id]: true } };
}
