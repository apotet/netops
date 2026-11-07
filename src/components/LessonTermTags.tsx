import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { GLOSSARY } from '../data/glossary';
import { getLesson } from '../data/lessons';

interface Props {
  terms: string[];
  onOpenLesson?: (lessonId: string) => void;
}

/** Inline card: opening a definition keeps the reader in the current lesson. */
export function LessonTermTags({ terms, onOpenLesson }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const entry = selected ? GLOSSARY[selected] : undefined;
  const related = entry?.lessonId ? getLesson(entry.lessonId) : undefined;
  const close = () => {
    setSelected(null);
    trigger.current?.focus();
  };

  return (
    <div className="space-y-3" onKeyDown={event => {
      if (event.key === 'Escape' && selected) {
        event.preventDefault();
        close();
      }
    }}>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {terms.map(term => (
          <button
            key={term}
            type="button"
            aria-expanded={selected === term}
            aria-controls={selected === term ? 'lesson-term-card' : undefined}
            onClick={event => {
              trigger.current = event.currentTarget;
              setSelected(selected === term ? null : term);
            }}
            className="px-2 py-1 rounded-lg text-[11px] bg-slate-100 dark:bg-slate-800 text-cyan-800 dark:text-cyan-200 underline decoration-dotted underline-offset-2 cursor-pointer hover:bg-cyan-100 dark:hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            {term}
          </button>
        ))}
      </div>
      {selected && entry && (
        <section id="lesson-term-card" role="region" aria-labelledby="lesson-term-title"
          className="min-w-0 rounded-xl border border-cyan-500/30 bg-cyan-50 dark:bg-slate-900 p-4 space-y-3 text-sm break-words">
          <div className="flex items-start justify-between gap-3">
            <h3 id="lesson-term-title" className="font-semibold text-slate-900 dark:text-white">{selected}</h3>
            <button type="button" onClick={close} aria-label="Закрыть карточку термина"
              className="shrink-0 p-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-slate-700 dark:text-slate-300">{entry.description}</p>
          <p className="text-slate-600 dark:text-slate-400"><span className="font-semibold">К чему относится: </span>{entry.relatesTo}</p>
          {related && onOpenLesson && (
            <a href={`#lesson-${related.id}`} onClick={event => {
              event.preventDefault();
              setSelected(null);
              onOpenLesson(related.id);
            }} className="inline-block text-cyan-800 dark:text-cyan-300 underline underline-offset-2">
              разобрать в теме<span className="sr-only">: {related.title}</span>
            </a>
          )}
        </section>
      )}
    </div>
  );
}
