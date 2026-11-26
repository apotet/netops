/** One contextual glossary policy shared by lesson and question review screens. */
const POE_LESSON_IDS = new Set([
  'l1-poe-budget',
  'l1-poe-screen-reading',
  'cli-poe-diagnostics',
  'l1-poe-injectors-splitters',
  'l1-copper-fault-poe',
]);

export type LessonGlossaryScope = 'poe' | 'ipv6' | 'http' | undefined;

export function getLessonGlossaryScope(lessonId: string | undefined): LessonGlossaryScope {
  if (lessonId === 'l7-http-status-basics') return 'http';
  if (lessonId === 'l3-ipv6') return 'ipv6';
  if (lessonId && POE_LESSON_IDS.has(lessonId)) return 'poe';
  return undefined;
}
