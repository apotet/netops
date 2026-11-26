import type { Question } from '../types/quiz';

/** Same supported image paths as mixed, without restricting the selected topic. */
export function isBeginnerPhoto(question: Question): boolean {
  return Boolean(question.image &&
    /^(?:assets\/photos\/|https:\/\/)[^\s]+\.(?:webp|png|jpe?g)(?:\?[^\s]*)?$/i.test(question.image));
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * New beginner attempts only. The caller supplies the already topic-filtered pool.
 * Cover distinct families first; if they run out, fill from remaining unique IDs
 * in seeded shuffle order. Never expand the pool or shorten for family scarcity.
 */
export function selectBeginnerQuestions(pool: readonly Question[], count: number, random = Math.random): Question[] {
  return selectFamilyQuestions(pool.filter(q => q.difficulty === 'beginner'), count, random);
}

/** Shared bounded sampler; eligibility is decided by the caller, never by legacy difficulty. */
export function selectFamilyQuestions(pool: readonly Question[], count: number, random = Math.random): Question[] {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Beginner count must be a non-negative safe integer');
  if (count === 0) return [];
  const candidates = shuffled([...new Map(pool.map(q => [q.id, q])).values()], random);
  const target = Math.min(count, candidates.length);
  const chosen: Question[] = [];
  const ids = new Set<string>();
  const families = new Set<string>();
  const take = (question: Question) => {
    chosen.push(question);
    ids.add(question.id);
    families.add(question.family || question.id);
  };

  // Reserve before family selection: a text sibling cannot displace the only photo.
  const photo = target >= 2 ? candidates.find(isBeginnerPhoto) : undefined;
  if (photo) take(photo);
  for (const question of candidates) {
    if (chosen.length === target) break;
    if (!families.has(question.family || question.id)) take(question);
  }
  for (const question of candidates) {
    if (chosen.length === target) break;
    if (!ids.has(question.id)) take(question);
  }
  // A guaranteed photo need not always occupy the first position.
  return shuffled(chosen, random);
}
