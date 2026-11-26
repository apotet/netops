import previousProductionQuestions from '../data/previousProductionQuestions.json';
import { PREVIOUS_IN_DEPTH_QUESTIONS, previousInDepthSnapshot } from '../data/inDepth/previousQuestions';
import { PREVIOUS_DIAGNOSTIC_QUESTIONS } from '../data/previousDiagnosticQuestions';
import { EXAM_DIFFICULTIES, TRIAL_DIFFICULTIES } from '../types/quiz';
import type { QuizSession, Question, QuizModeId } from '../types/quiz';
import { isLearningLevel } from '../types/learningLevel';
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
export const TRIAL_QUESTION_COUNT = 20;
export const TRIAL_MINUTES = 15;

export function hasValidTrialTiming(session: Pick<ProgressSession, 'startTime' | 'trialDeadline' | 'trialDifficulty' | 'endTime' | 'feedbackMode' | 'isCompleted'>): boolean {
  const deadline = session.trialDeadline;
  if (deadline === undefined) return session.trialDifficulty === undefined;
  if (session.trialDifficulty !== undefined && !TRIAL_DIFFICULTIES.includes(session.trialDifficulty)) return false;
  return Number.isSafeInteger(deadline) && deadline === session.startTime + TRIAL_MINUTES * 60_000 &&
    session.feedbackMode === 'exam' && (!session.isCompleted || (
      Number.isSafeInteger(session.endTime) && session.endTime! >= session.startTime && session.endTime! <= deadline
    ));
}

export function expireTrial(session: ProgressSession, now = Date.now()): ProgressSession {
  if (session.isCompleted || session.trialDeadline === undefined || now < session.trialDeadline) return session;
  return { ...session, isCompleted: true, endTime: session.trialDeadline };
}

// Retain the displayed question and scoring of N4 attempts whose bank entry changed.
const productionSnapshots = previousProductionQuestions as Readonly<Partial<Record<string, Question>>>;

/** The stored order can differ from the bank order even in a completed review. */
export function isPreviousProductionQuestion(question: Question): boolean {
  const previous = productionSnapshots[question.id];
  if (!previous || question.text !== previous.text) return false;
  const answerContent = (item: Question) => JSON.stringify([
    [...item.answers].sort(),
    item.correct.map(index => item.answers[index]).sort(),
    item.image,
    item.imageAlt,
  ]);
  return answerContent(question) === answerContent(previous);
}

function savedProductionQuestion(
  id: string,
  saved: { text?: unknown; answers?: unknown; correct?: unknown },
  order: unknown,
): Question | undefined {
  const previous = productionSnapshots[id];
  if (!previous || saved.text !== previous.text) return undefined;
  const indices = order === undefined ? previous.answers.map((_, index) => index) : order;
  if (!Array.isArray(indices) || indices.length !== previous.answers.length || new Set(indices).size !== indices.length ||
      indices.some(index => !Number.isInteger(index) || index < 0 || index >= previous.answers.length)) return undefined;
  const answers = indices.map(index => previous.answers[index]);
  const correct = indices.flatMap((index, displayed) => previous.correct.includes(index) ? [displayed] : []);
  if (JSON.stringify(saved.answers) !== JSON.stringify(answers) ||
      JSON.stringify(saved.correct) !== JSON.stringify(correct)) return undefined;
  return { ...previous, answers, correct };
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
    if (!hasValidTrialTiming(saved)) return null;
    if (saved.difficulty !== undefined && !EXAM_DIFFICULTIES.includes(saved.difficulty)) return null;
    if (saved.learningLevel !== undefined && !isLearningLevel(saved.learningLevel)) return null;
    if (saved.requestedCount !== undefined && (!Number.isSafeInteger(saved.requestedCount) || saved.requestedCount <= 0)) return null;
    if (saved.answerOrders !== undefined && !object(saved.answerOrders)) return null;
    const questions: Question[] = [];
    for (const item of saved.questions as Array<{ id?: unknown; text?: unknown; answers?: unknown; correct?: unknown } | null>) {
      const current = bank.find(q => q.id === item?.id);
      if (!current) return null;
      const order = saved.answerOrders?.[current.id];
      const productionPrevious = savedProductionQuestion(current.id, item ?? {}, order);
      if (productionPrevious && (saved.answerOrders === undefined || order !== undefined)) {
        questions.push(productionPrevious);
        continue;
      }
      const previous = PREVIOUS_DIAGNOSTIC_QUESTIONS[current.id];
      const usePrevious = previous !== undefined && previous.text === item?.text;
      const inDepthPrevious = previousInDepthSnapshot(current, item ?? {}, saved.answerOrders?.[current.id]);
      const question = inDepthPrevious ?? (usePrevious ? { ...current, ...previous } : current);
      if (saved.answerOrders === undefined) {
        // Old attempts used bank order. Never shuffle an answer already selected there.
        if ((usePrevious || PREVIOUS_IN_DEPTH_QUESTIONS[current.id] || productionSnapshots[current.id]) && (JSON.stringify(item?.answers) !== JSON.stringify(question.answers) ||
            JSON.stringify(item?.correct) !== JSON.stringify(question.correct))) return null;
        questions.push(question);
      } else {
        if (!Array.isArray(order) || order.length !== question.answers.length || new Set(order).size !== order.length ||
            order.some(index => !Number.isInteger(index) || index < 0 || index >= question.answers.length)) return null;
        const answers = order.map(index => question.answers[index]);
        const correct = order.flatMap((index, displayed) => question.correct.includes(index) ? [displayed] : []);
        // Reject bank drift/corrupt snapshots instead of silently changing saved answer meaning.
        const savedAnswers = question.id === 'l4-x05' && Array.isArray(item?.answers)
          ? item.answers.map(answer => answer === 'Высоких портов (часто ≥49152 по IANA)' ? '49152–65535' : answer)
          : item?.answers;
        if (JSON.stringify(savedAnswers) !== JSON.stringify(answers) || JSON.stringify(item?.correct) !== JSON.stringify(correct)) return null;
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
      if (time !== undefined && (!Number.isSafeInteger(time) || time <= 0 || time > now || (saved.trialDeadline !== undefined && time >= saved.trialDeadline))) return null;
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
  if (!session.attemptId || !session.progressEpoch || (session.trialDeadline !== undefined && !session.isCompleted)) return;
  for (const q of session.questions) {
    const chosen = session.userAnswers[q.id];
    if (session.legacySubmittedIds?.includes(q.id) || !session.submittedQuestions[q.id] || !Array.isArray(chosen) || !chosen.length ||
        chosen.some(index => !Number.isInteger(index) || index < 0 || index >= q.answers.length)) continue;
    record(q.id, answerCorrect(chosen, q.correct), `${session.attemptId}:${q.id}`, session.progressEpoch, session.answerTimes?.[q.id]);
  }
}
export function confirmAnswer(session: ProgressSession, chosen: number[], now = Date.now()): ProgressSession {
  const q = session.questions[session.currentIndex];
  if (!q || session.isCompleted || (session.trialDeadline !== undefined && now >= session.trialDeadline) || session.submittedQuestions[q.id] || !chosen.length ||
      new Set(chosen).size !== chosen.length || chosen.some(index => !Number.isInteger(index) || index < 0 || index >= q.answers.length)) return session;
  return { ...session, userAnswers: { ...session.userAnswers, [q.id]: [...chosen] },
    answerTimes: { ...session.answerTimes, [q.id]: now },
    submittedQuestions: { ...session.submittedQuestions, [q.id]: true } };
}
