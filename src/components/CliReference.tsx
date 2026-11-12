import React, { useMemo, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { GLOSSARY } from '../data/glossary';
import { LESSONS, getLesson } from '../data/lessons';

interface Props {
  onOpenLesson: (id: string) => void;
}

/** A scoped reference for CLI lessons, not a replacement for the full network glossary. */
export function CliReference({ onOpenLesson }: Props) {
  const [query, setQuery] = useState('');
  const entries = useMemo(() => {
    const terms = new Set<string>();
    for (const lesson of LESSONS) {
      if (!lesson.osiLayers.includes('CLI')) continue;
      for (const term of [...lesson.terms, ...(lesson.professional?.terms ?? [])]) terms.add(term);
    }
    return [...terms].filter(term => GLOSSARY[term])
      .sort((a, b) => a.localeCompare(b, 'ru'));
  }, []);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('ru');
    return entries.filter(term => {
      const entry = GLOSSARY[term];
      return !needle || [term, entry.description, entry.relatesTo]
        .some(value => value.toLocaleLowerCase('ru').includes(needle));
    });
  }, [entries, query]);

  return (
    <section className="space-y-4" aria-label="Справочник CLI">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 font-bold text-lg text-slate-900 dark:text-white">
          <BookOpen className="w-5 h-5 text-cyan-500" /> Справочник CLI
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Режимы Cisco IOS, команды и термины управления. Определения общие с плашками в уроках.
        </p>
      </div>
      <label className="relative block">
        <span className="sr-only">Найти термин CLI</span>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="search" value={query} onChange={event => setQuery(event.target.value)}
          placeholder="Поиск: enable, VTY, SSH…"
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white" />
      </label>
      <p className="text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
        {filtered.length} из {entries.length} терминов
      </p>
      {!filtered.length ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Ничего не найдено. Попробуй название команды или понятие.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map(term => {
            const entry = GLOSSARY[term];
            const lesson = entry.lessonId ? getLesson(entry.lessonId) : undefined;
            return (
              <article key={term} className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091524] p-4 space-y-2">
                <h4 className="font-semibold text-slate-900 dark:text-white break-words">{term}</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300">{entry.description}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{entry.relatesTo}</p>
                {lesson && (
                  <button type="button" onClick={() => onOpenLesson(lesson.id)}
                    className="text-left text-sm text-cyan-700 dark:text-cyan-300 underline underline-offset-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-500">
                    Разобрать в теме: {lesson.title}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
