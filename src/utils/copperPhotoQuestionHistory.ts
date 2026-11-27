import type { Question } from '../types/quiz';
import retiredPvcPhoto from '../data/retiredPvcPhotoQuestion.json';
import previousCopperUtp from '../data/previousCopperUtpPhotoQuestion.json';
import previousOpticalInspection from '../data/previousOpticalInspectionQuestion.json';

/** Allowlisted history only. Never use this snapshot for a new question selection. */
export const RETIRED_PVC_PHOTO = retiredPvcPhoto as Question;

const previousById = new Map([
  [previousCopperUtp.id, previousCopperUtp],
  [previousOpticalInspection.id, previousOpticalInspection],
]);

export function hasPhotoQuestionHistory(id: string): boolean {
  return id === RETIRED_PVC_PHOTO.id || previousById.has(id);
}

type SavedQuestion = { id?: unknown; text?: unknown; image?: unknown; answers?: unknown; correct?: unknown };

/** Only allowlisted photo questions reach this check. */
export function restoreHistoricalPhotoQuestion(saved: SavedQuestion | null | undefined, order: unknown, current: Question): Question | null {
  if (saved?.id !== current.id || saved.image !== current.image) return null;
  const previous = previousById.get(current.id);
  const original = previous && saved.text === previous.text ? { ...current, ...previous } : current;
  if (saved.text !== original.text) return null;
  if (order !== undefined && (!Array.isArray(order) || order.length !== original.answers.length ||
      new Set(order).size !== original.answers.length ||
      order.some(i => !Number.isInteger(i) || i < 0 || i >= original.answers.length))) return null;
  const answers = order === undefined ? original.answers : order.map(i => original.answers[i]);
  const correct = order === undefined ? original.correct :
    order.flatMap((i, displayed) => original.correct.includes(i) ? [displayed] : []);
  if (JSON.stringify(saved.answers) !== JSON.stringify(answers) || JSON.stringify(saved.correct) !== JSON.stringify(correct)) return null;
  return { ...original, answers: [...answers], correct: [...correct] };
}
