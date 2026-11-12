import { FlaskConical } from 'lucide-react';
import type { PracticeLink } from '../data/practiceLinks';

interface Props {
  link?: PracticeLink;
  onOpenPractice?: (link: PracticeLink) => void;
  className?: string;
}

export function PracticeLinkButton({ link, onOpenPractice, className }: Props) {
  if (!link || !onOpenPractice) return null;
  return (
    <button type="button" onClick={() => onOpenPractice(link)}
      className={className ?? 'inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 cursor-pointer'}>
      <FlaskConical className="w-4 h-4 shrink-0" aria-hidden="true" />
      Открыть стенд
    </button>
  );
}
