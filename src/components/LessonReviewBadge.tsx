import { BadgeCheck, ClipboardList } from 'lucide-react';
import { getLessonReviewStatus } from '../data/lessons/reviewStatus';

interface Props { lessonId: string }

/** Read-only status. Only the site owner's explicit approval changes it. */
export function LessonReviewBadge({ lessonId }: Props) {
  const approved = getLessonReviewStatus(lessonId) === 'approved';
  return (
    <span
      data-lesson-review-status={approved ? 'approved' : 'needs-review'}
      title={approved ? 'Урок проверен и утверждён владельцем' : 'Урок ожидает точечной проверки и одобрения'}
      className={`inline-flex w-fit max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-tight ${approved
        ? 'border-emerald-400/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
        : 'border-amber-400/40 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-300'}`}
    >
      {approved ? <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> : <ClipboardList aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
      {approved ? 'Проверен и утверждён' : 'Проверить точечно'}
    </span>
  );
}
