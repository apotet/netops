import type { ProgressSession } from './examProgress';
import { answerCorrect } from './examProgress';
import { getLessonForQuestion } from '../data/lessons';

export const LAST_REVIEW_KEY = 'osi_last_exam_review_v1';
export type ReviewFilter = 'all' | 'wrong' | 'correct';
export function explanationText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return !text || /RESTORED_FULL_CONTENT|UPDATED_CONTENT|FULL_FILE_CONTENT_WILL_BE_INCLUDED|^(?:TODO|TBD|undefined|null)$/i.test(text) ? null : text;
}
/** Read-only projection of the saved attempt, never of a newly sampled bank. */
export function reviewRows(session: ProgressSession) {
  if (!session.isCompleted) return [];
  return session.questions.map((question, index) => {
    const chosen = session.userAnswers[question.id] || [];
    const confirmed = session.submittedQuestions[question.id] === true && chosen.length > 0;
    const valid = chosen.every(i => Number.isInteger(i) && i >= 0 && i < question.answers.length);
    const status = !confirmed ? 'unanswered' : valid && answerCorrect(chosen, question.correct) ? 'correct' : 'wrong';
    return { question, index, chosen, confirmed, status, explanation: explanationText(question.explanation),
      lesson: getLessonForQuestion(question.id) };
  });
}
export function filteredReview(session: ProgressSession, filter: ReviewFilter) {
  return reviewRows(session).filter(row => filter === 'all' || row.status === filter);
}
export function reviewTotals(session: ProgressSession) {
  const rows = reviewRows(session);
  const correct = rows.filter(row => row.status === 'correct').length;
  return { total: rows.length, correct, wrong: rows.filter(row => row.status === 'wrong').length,
    unanswered: rows.filter(row => row.status === 'unanswered').length,
    percentage: rows.length ? Math.round(correct / rows.length * 100) : 0 };
}
export function serializeReview(session: ProgressSession): string {
  if (!session.isCompleted) throw Error('Only completed attempts can be saved for review');
  return JSON.stringify({ version: 1, session });
}
/** Validate the snapshot itself: replacing questions from today's bank would rewrite history. */
export function restoreReview(raw: string, epoch: string): ProgressSession | null {
  try {
    const wrapper = JSON.parse(raw);
    const s = wrapper?.session;
    const object = (value: unknown) => Boolean(value && typeof value === 'object' && !Array.isArray(value));
    if (wrapper.version !== 1 || !s || s.isCompleted !== true || s.progressEpoch !== epoch ||
        !['instant', 'exam'].includes(s.feedbackMode) || !Array.isArray(s.questions) || !s.questions.length ||
        s.questions.length > 617 || !object(s.userAnswers) || !object(s.submittedQuestions)) return null;
    const ids = new Set<string>();
    for (const q of s.questions) {
      if (!q || typeof q.id !== 'string' || ids.has(q.id) || typeof q.text !== 'string' || typeof q.topic !== 'string' ||
          !Array.isArray(q.answers) || !q.answers.length || q.answers.some((a: unknown) => typeof a !== 'string') ||
          !Array.isArray(q.correct) || !q.correct.length || new Set(q.correct).size !== q.correct.length ||
          q.correct.some((i: unknown) => !Number.isInteger(i) || Number(i) < 0 || Number(i) >= q.answers.length) ||
          (q.image !== undefined && typeof q.image !== 'string') || (q.imageAlt !== undefined && typeof q.imageAlt !== 'string')) return null;
      ids.add(q.id);
      const chosen = s.userAnswers[q.id];
      if (chosen !== undefined && (!Array.isArray(chosen) || new Set(chosen).size !== chosen.length ||
          chosen.some((i: unknown) => !Number.isInteger(i) || Number(i) < 0 || Number(i) >= q.answers.length))) return null;
      if (s.submittedQuestions[q.id] !== undefined && typeof s.submittedQuestions[q.id] !== 'boolean') return null;
    }
    return s;
  } catch { return null; }
}
