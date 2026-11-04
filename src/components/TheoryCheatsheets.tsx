import React, { useState } from 'react';
import { LEVEL_NOTES } from '../data/levelNotes';
import { ZoomableImage } from './ZoomableImage';

export const TheoryCheatsheets: React.FC = () => {
  const [cheatLevel, setCheatLevel] = useState(1);
  const activeCheat = LEVEL_NOTES.find((n) => n.level === cheatLevel) ?? LEVEL_NOTES[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {LEVEL_NOTES.map((n) => (
          <button
            key={n.level}
            type="button"
            onClick={() => setCheatLevel(n.level)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              cheatLevel === n.level
                ? 'bg-cyan-500 text-slate-950'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            L{n.level}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-4 sm:p-5 space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{activeCheat.title}</h2>

        <ZoomableImage
          src={activeCheat.cheatWebp}
          alt={`Шпаргалка ${activeCheat.title}`}
          caption="Нажмите на картинку — откроется на весь экран с зумом"
          imgClassName="max-h-96"
          fullscreenOnClick
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activeCheat.sections.map((sec) => (
            <div
              key={sec.title}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40 space-y-1"
            >
              <div className="text-xs font-bold text-amber-700 dark:text-amber-300">{sec.title}</div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{sec.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
