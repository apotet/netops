import React from 'react';
import type { StudyTextMode } from '../utils/studyTextMode';

interface Props {
  value: StudyTextMode;
  onChange: (value: StudyTextMode) => void;
}

export function StudyTextToggle({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Стиль объяснения" className="flex flex-wrap gap-1.5 py-2 font-sans">
      {([{ id: 'meaning', label: 'Смысл' }, { id: 'professional', label: 'По делу' }] as const).map(item => (
        <button key={item.id} type="button" aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
          className={`min-h-9 rounded-lg border px-3 py-1.5 text-sm font-bold transition-colors ${value === item.id
            ? 'border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
            : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
          {item.label}
        </button>
      ))}
    </div>
  );
}
