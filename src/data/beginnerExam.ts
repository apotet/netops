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

const BASE_PHOTO_LIMITS = {
  5: { min: 1, max: 1 },
  10: { min: 1, max: 2 },
  15: { min: 3, max: 4 },
  20: { min: 3, max: 4 },
  30: { min: 5, max: 5 },
} as const;

export function hasBasePhotoPlan(count: number): count is keyof typeof BASE_PHOTO_LIMITS {
  return Object.hasOwn(BASE_PHOTO_LIMITS, count);
}

/** Prepare a new Base test or basic trial with separated photos. */
export function selectBaseQuestionsWithPhotoPlan(
  pool: readonly Question[], count: keyof typeof BASE_PHOTO_LIMITS, random: () => number,
): Question[] {
  const unique = [...new Map(pool.map(q => [q.id, q])).values()];
  if (!unique.some(isBeginnerPhoto)) return selectFamilyQuestions(pool, count, random);
  const photos: Question[] = [], text: Question[] = [];
  for (const q of shuffled(unique, random)) (isBeginnerPhoto(q) ? photos : text).push(q);

  const family = (q: Question) => q.family || q.id;
  const textFamilies = new Set(text.map(family));
  // Prefer photo-only families first. They won't consume a distinct family
  // that could cover one of the text slots.
  const photoOrder = [
    ...photos.filter(q => !textFamilies.has(family(q))),
    ...photos.filter(q => textFamilies.has(family(q))),
  ];
  const take = (items: readonly Question[], count: number, families: Set<string>) => {
    const chosen: Question[] = [];
    const picked = new Set<string>();
    for (const q of items) {
      if (chosen.length === count) break;
      if (families.has(family(q))) continue;
      chosen.push(q);
      picked.add(q.id);
      families.add(family(q));
    }
    for (const q of items) {
      if (chosen.length === count) break;
      if (!picked.has(q.id)) chosen.push(q);
    }
    return chosen;
  };

  let bestPhotos: Question[] = [], bestText: Question[] = [], bestFamilies = 0;
  // Text supplies at most one more gap than its length. If the intended
  // photo minimum is impossible in this closed pool, use fewer photos.
  const limits = BASE_PHOTO_LIMITS[count];
  const maxPhotos = Math.min(limits.max, photos.length, text.length + 1, Math.ceil(count / 2));
  const minPhotos = Math.min(limits.min, maxPhotos);
  const splits = shuffled(Array.from({ length: maxPhotos - minPhotos + 1 }, (_, i) => i + minPhotos), random);
  for (const photoCount of splits) {
    const textCount = Math.min(count - photoCount, text.length);
    const families = new Set<string>();
    const selectedPhotos = take(photoOrder, photoCount, families);
    const selectedText = take(text, textCount, families);
    const bestSize = bestPhotos.length + bestText.length;
    if (photoCount + textCount > bestSize || (photoCount + textCount === bestSize && families.size > bestFamilies)) {
      bestPhotos = selectedPhotos;
      bestText = selectedText;
      bestFamilies = families.size;
    }
  }

  // Placing photos in distinct gaps always leaves a text question
  // between them. Include the gaps before the first and after the last.
  const arrangedText = shuffled(bestText, random);
  const gaps = shuffled(Array.from({ length: arrangedText.length + 1 }, (_, i) => i), random);
  const photoAt = new Map(bestPhotos.map((q, i) => [gaps[i], q]));
  return Array.from({ length: arrangedText.length + 1 }, (_, i) =>
    [photoAt.get(i), arrangedText[i]].filter((q): q is Question => q !== undefined)).flat();
}
