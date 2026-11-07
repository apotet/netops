import type { Question } from '../types/quiz';

export const MIXED_GROUPS = ['l1-l2', 'l3', 'l4', 'l5-l7', 'tcpip', 'troubleshooting'] as const;

// Curriculum metadata is authoritative: visual-l1 supplies the L1–L2 photo slot.
export function mixedGroup(question: Question): string {
  return question.group === 'visual-l1' ? 'l1-l2' : question.group;
}

export function isMixedPhoto(question: Question): boolean {
  return question.group === 'visual-l1' && Boolean(question.image &&
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

/** Fixed ten-question mixed exam. Never relax quotas, family or template limits. */
export function selectMixedQuestions(bank: readonly Question[], random = Math.random): Question[] {
  const pool = bank.filter(q => isMixedPhoto(q) ||
    (MIXED_GROUPS.some(group => group === q.group) && (q.group !== 'l1-l2' || !q.image)));
  const ids = new Set<string>();
  const families = new Set<string>();
  const chosen: Question[] = [];
  let work = 0;
  const tick = () => {
    if (++work > 200_000) {
      throw Object.assign(new Error('Лимит поиска mixed исчерпан. Квоты не изменены.'), { code: 'MIXED_SEARCH_LIMIT' });
    }
  };

  // Four groups receive a second slot. Try all 15 quota patterns in random order,
  // so a sparse pool is not rejected just because the first pattern was unlucky.
  const patterns: number[][] = [];
  for (let a = 0; a < MIXED_GROUPS.length; a++) {
    for (let b = a + 1; b < MIXED_GROUPS.length; b++) {
      patterns.push(MIXED_GROUPS.map((_, i) => i).filter(i => i !== a && i !== b));
    }
  }
  for (const extra of shuffled(patterns, random)) {
    const slots = MIXED_GROUPS.flatMap((group, index) =>
      Array.from({ length: extra.includes(index) ? 2 : 1 }, (_, slot) => ({
        candidates: shuffled(pool.filter(q => mixedGroup(q) === group &&
          (group !== 'l1-l2' || (slot === 0 ? isMixedPhoto(q) : !q.image))), random),
      })));

    function solve(left: typeof slots, templates: number): boolean {
      if (!left.length) return true;
      const domains = left.map(slot => slot.candidates.filter(q => {
        tick();
        return !ids.has(q.id) && !families.has(q.family || q.id) && (!q.template || templates < 2);
      }));
      if (domains.some(domain => !domain.length) ||
          domains.filter(domain => domain.every(q => q.template)).length > 2 - templates ||
          new Set(domains.flat().map(q => q.family || q.id)).size < left.length) return false;
      // Most constrained slot first; backtracking handles shared families.
      let index = 0;
      for (let i = 1; i < domains.length; i++) if (domains[i].length < domains[index].length) index = i;
      const rest = left.filter((_, i) => i !== index);
      for (const question of domains[index]) {
        chosen.push(question);
        ids.add(question.id);
        families.add(question.family || question.id);
        if (solve(rest, templates + Number(Boolean(question.template)))) return true;
        chosen.pop();
        ids.delete(question.id);
        families.delete(question.family || question.id);
      }
      return false;
    }
    if (solve(slots, 0)) return shuffled(chosen, random);
  }
  const counts = MIXED_GROUPS.map(group => `${group}=${pool.filter(q => mixedGroup(q) === group).length}`).join(', ');
  throw Object.assign(new Error(
    `Недостаточно совместимых вопросов mixed: ${counts}; фото L1=${pool.filter(isMixedPhoto).length}. ` +
    'Нужны 10 уникальных id/family, шесть групп по 1–2, фото L1, второй L1–L2 без фото и максимум 2 template. Квоты не изменены.',
  ), { code: 'MIXED_POOL_INSUFFICIENT' });
}
