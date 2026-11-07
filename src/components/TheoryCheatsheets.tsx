import React, { useEffect, useRef, useState } from 'react';
import { LEVEL_NOTES } from '../data/levelNotes';
import { ZoomableImage } from './ZoomableImage';

const sectionId = (level: number) => `cheatsheet-l${level}`;

export const TheoryCheatsheets: React.FC = () => {
  const [activeLevel, setActiveLevel] = useState(LEVEL_NOTES[0].level);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nodes = LEVEL_NOTES.map((n) => document.getElementById(sectionId(n.level))).filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target as HTMLElement | undefined;
        const level = Number(top?.dataset.level);
        if (level) setActiveLevel(level);
      },
      { rootMargin: '-30% 0px -50% 0px', threshold: [0.1, 0.25, 0.5] }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const btn = navRef.current?.querySelector('[aria-current="location"]');
    btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeLevel]);

  const scrollToLevel = (level: number) => {
    setActiveLevel(level);
    document.getElementById(sectionId(level))?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="font-sans">
      <div className="h-14" aria-hidden />
      <nav aria-label="Навигация по шпаргалкам L1–L7" className="fixed top-16 left-0 right-0 z-30 px-3 sm:px-6">
        <div ref={navRef} className="max-w-5xl mx-auto flex gap-1 rounded-xl border border-white/10 dark:border-cyan-500/15 bg-[#07111f]/55 p-1 backdrop-blur-md">
          {LEVEL_NOTES.map((note) => (
            <a
              key={note.level}
              href={`#${sectionId(note.level)}`}
              aria-current={activeLevel === note.level ? 'location' : undefined}
              onClick={(event) => {
                event.preventDefault();
                scrollToLevel(note.level);
              }}
              className={`flex-1 min-w-0 px-1 py-1.5 rounded-lg text-xs font-bold text-center transition-colors ${
                activeLevel === note.level
                  ? 'bg-cyan-400/90 text-slate-950'
                  : 'text-slate-300/80 hover:bg-white/10'
              }`}
            >
              L{note.level}
            </a>
          ))}
        </div>
      </nav>

      <div className="space-y-16 sm:space-y-20 pb-[55vh]">
        {LEVEL_NOTES.map((note) => (
          <section
            key={note.level}
            id={sectionId(note.level)}
            data-level={note.level}
            aria-labelledby={`${sectionId(note.level)}-heading`}
            className="scroll-mt-40"
          >
            <div className="flex items-end gap-3 mb-4">
              <span className="text-4xl sm:text-5xl font-bold tracking-tight text-cyan-400 leading-none">L{note.level}</span>
              <h2 id={`${sectionId(note.level)}-heading`} className="text-lg sm:text-xl text-slate-900 dark:text-white pb-1 font-sans font-bold">
                {note.title.replace(/^L\d\s·\s/, '')}
              </h2>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/40 p-3 sm:p-5 space-y-4">
              <div className="mx-auto max-w-3xl">
                <ZoomableImage
                  src={note.cheatWebp}
                  alt={`Шпаргалка ${note.title}`}
                  caption="Нажмите на картинку — откроется на весь экран"
                  imgClassName="!max-h-none h-auto w-full"
                  fullscreenOnClick
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {note.sections.map((section) => (
                  <div key={section.title} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-slate-50 dark:bg-slate-950/50">
                    <div className="text-xs font-bold text-cyan-700 dark:text-cyan-300 mb-1">{section.title}</div>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{section.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
