/**
 * Only the user's explicit approval of an individual lesson permits that ID
 * to be listed here. Publishing, CI checks and moving between levels do not.
 * No lesson is approved initially.
 */
const USER_APPROVED_LESSON_IDS: ReadonlySet<string> = new Set<string>([
  'l1-copper-fault-poe',
  // Owner confirmed USER ACCEPT after the final PoE budget lesson release, 23 Nov 2026.
  'l1-poe-budget',
]);

export type LessonReviewStatus = 'needs-review' | 'approved';

export function getLessonReviewStatus(lessonId: string): LessonReviewStatus {
  return USER_APPROVED_LESSON_IDS.has(lessonId) ? 'approved' : 'needs-review';
}
