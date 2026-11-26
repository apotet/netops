import { FormattedExplanation } from './FormattedExplanation';
import { GlossaryText } from './GlossaryText';
import { ZoomableImage } from './ZoomableImage';
import { PracticeLinkButton } from './PracticeLinkButton';
import type { PracticeLink } from '../data/practiceLinks';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Lesson, type LessonIllustration } from '../data/lessons/types';
import { getLessonBlocksWithSections, getLessonSectionForQuestion } from '../data/lessons/lessonSectionLinks';
import { StudyTextToggle } from './StudyTextToggle';
import { LessonKnowledgeCheck } from './LessonKnowledgeCheck';
import { useStudyTextMode } from '../utils/studyTextMode';
import { getLessonGlossaryScope } from '../utils/lessonGlossaryScope';
import { LessonTermTags } from './LessonTermTags';
import { LessonReviewBadge } from './LessonReviewBadge';
import { EthernetPinout } from './EthernetPinout';
import { SniDiagram } from './SniDiagram';
import { ArrowLeft, Copy, Check, BookOpen } from 'lucide-react';

interface LessonViewProps {
  lesson: Lesson;
  onBack: () => void;
  onOpenLesson?: (lessonId: string) => void;
  onOpenQuestion?: (questionId: string) => void;
  onOpenPractice?: (link: PracticeLink) => void;
  returnQuestionId?: string | null;
}

/** Native, mobile-readable PoE cheat sheet: no tiny SVG columns or cached image. */
const PoEStandardsChart: React.FC = () => {
  const standards = [
    { standard: 'IEEE 802.3af', name: 'PoE', type: 'Type 1', powerClass: '0–3', pse: '15,4 Вт', pd: '12,95 Вт', pairs: '2 пары', accent: 'border-l-cyan-400', tag: 'text-cyan-300' },
    { standard: 'IEEE 802.3at', name: 'PoE+', type: 'Type 2', powerClass: '4', pse: '30 Вт', pd: '25,5 Вт', pairs: '2 пары', accent: 'border-l-teal-400', tag: 'text-teal-300' },
    { standard: 'IEEE 802.3bt', name: 'PoE++', type: 'Type 3', powerClass: '5–6', pse: '60 Вт', pd: '51 Вт', pairs: '4 пары', accent: 'border-l-amber-400', tag: 'text-amber-300' },
    { standard: 'IEEE 802.3bt', name: 'PoE++', type: 'Type 4', powerClass: '7–8', pse: '90 Вт', pd: '71,3 Вт', pairs: '4 пары', accent: 'border-l-blue-400', tag: 'text-blue-300' },
  ] as const;

  return (
    <div data-poe-standards-chart="responsive" className="rounded-xl bg-[#06111d] p-2 text-slate-100 sm:rounded-2xl sm:p-4">
      <p className="mb-2 text-[11px] leading-snug text-cyan-100 sm:mb-3 sm:text-sm sm:leading-relaxed">
        <strong>PSE</strong> — источник питания; <strong>PD</strong> — устройство;
        <strong> Class</strong> — класс мощности, не текущее потребление.
      </p>
      <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
        {standards.map(row => (
          <div key={row.type} data-poe-standard-card={row.type} className={`rounded-lg border border-slate-700 border-l-4 ${row.accent} bg-[#10263a] p-2 sm:rounded-xl sm:p-3`}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[13px] font-bold leading-tight text-white sm:text-sm">{row.standard}</div>
                <div className={`text-[11px] font-semibold leading-tight sm:text-xs ${row.tag}`}>{row.name} · {row.type}</div>
              </div>
              <div className="flex shrink-0 items-baseline gap-1 rounded-md border border-cyan-500/40 bg-cyan-950/70 px-2 py-1 sm:block sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-center">
                <span className="text-[10px] uppercase text-cyan-200">Class</span>
                <span className="text-base font-bold leading-none text-white sm:block sm:text-xl">{row.powerClass}</span>
              </div>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:mt-3 sm:gap-2">
              <div className="rounded-md bg-[#06111d] px-2 py-1 sm:rounded-lg sm:px-3 sm:py-2">
                <span className="text-[10px] text-cyan-200 sm:text-xs">PSE</span>
                <span className="ml-1 whitespace-nowrap text-[13px] font-bold text-white sm:ml-0 sm:block sm:text-lg">{row.pse}</span>
              </div>
              <div className="rounded-md bg-[#06111d] px-2 py-1 sm:rounded-lg sm:px-3 sm:py-2">
                <span className="text-[10px] text-cyan-200 sm:text-xs">PD</span>
                <span className="ml-1 whitespace-nowrap text-[13px] font-bold text-white sm:ml-0 sm:block sm:text-lg">{row.pd}</span>
              </div>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug text-slate-300 sm:mt-2 sm:text-xs">
              Питание: <strong className="text-white">{row.pairs}</strong>{row.type === 'Type 3' ? ' при 60 Вт' : ''}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-slate-300 sm:mt-3 sm:text-xs sm:leading-relaxed">
        Показаны классы максимальной мощности каждого Type; старшие типы поддерживают младшие классы.
        PSE/PD — пределы, а не фактическое потребление. Общий бюджет коммутатора проверяй отдельно.
      </p>
    </div>
  );
};

/** Shared photo markup; optional pass-through photos can be disclosed on demand. */
const LessonPhoto: React.FC<{ image: LessonIllustration }> = ({ image }) => (
<figure className="w-full max-w-xs space-y-2 justify-self-start md:justify-self-end">
                  <div
                    role="img"
                    aria-label={image.alt}
                    data-lesson-photo={`${image.column}-${image.row}`}
                    className="w-full aspect-square rounded-xl border border-slate-200 dark:border-slate-700 bg-white bg-no-repeat shadow-sm"
                    style={{
                      backgroundImage: `url("${import.meta.env.BASE_URL}lesson-images/${image.sprite}")`,
                      backgroundSize: `${(image.spriteColumns ?? 3) * 100}% ${(image.spriteRows ?? 2) * 100}%`,
                      backgroundPosition: `${image.column * 100 / Math.max(1, (image.spriteColumns ?? 3) - 1)}% ${image.row * 100 / Math.max(1, (image.spriteRows ?? 2) - 1)}%`,
                    }}
                  />
                  <figcaption className="text-xs leading-snug text-slate-500 dark:text-slate-400">{image.caption}</figcaption>
                </figure>
);

export const LessonView: React.FC<LessonViewProps> = ({ lesson, onBack, onOpenLesson, onOpenQuestion, onOpenPractice, returnQuestionId }) => {
  const [textMode, setTextMode] = useStudyTextMode();
  const content = textMode === 'professional' && lesson.professional ? lesson.professional : lesson;
  const glossaryScope = getLessonGlossaryScope(lesson.id);
  const activeKnowledgeCheck = textMode === 'professional'
    ? lesson.knowledgeCheck
    : (lesson.plainKnowledgeCheck ?? lesson.knowledgeCheck);
  const blocks = getLessonBlocksWithSections(lesson, textMode === 'professional' && lesson.professional ? 'professional' : 'plain');
  const targetAnchor = getLessonSectionForQuestion(lesson.id, returnQuestionId);
  const anchorElements = useRef<Record<string, HTMLElement | null>>({});
  const [highlightedAnchor, setHighlightedAnchor] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const cheatsheetElements = useRef<Record<string, HTMLDetailsElement | null>>({});
  const cheatsheetId = (file: string) => `lesson-cheatsheet-${lesson.id}-${file.replace(/[^a-z0-9-]/gi, '-')}`;
  const revealCheatsheet = (file: string) => {
    const details = cheatsheetElements.current[file];
    if (!details) return;
    details.open = true;
    window.requestAnimationFrame(() => {
      details.scrollIntoView({ behavior: 'smooth', block: 'start' });
      details.querySelector('summary')?.focus({ preventScroll: true });
    });
  };

  // Run after the lesson and selected reading mode are rendered. The same stable anchor
  // is present in both plain and professional blocks, so changing mode keeps context.
  useEffect(() => {
    if (!targetAnchor) return;
    let disposed = false;
    const keepAnchorVisible = (initial = false) => {
      if (disposed) return;
      const section = anchorElements.current[targetAnchor];
      if (!section) return;
      const bounds = section.getBoundingClientRect();
      if (initial || bounds.bottom <= 0 || bounds.top >= window.innerHeight) {
        section.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
      if (initial) section.focus({ preventScroll: true });
      setHighlightedAnchor(targetAnchor);
    };
    // After switching lesson styles, block height and glossary content can reflow.
    // Re-check visibility after layout settles, keeping the exact same anchor in view.
    const frame = window.requestAnimationFrame(() => keepAnchorVisible(true));
    const settle = window.setTimeout(() => keepAnchorVisible(), 120);
    const lateSettle = window.setTimeout(() => keepAnchorVisible(), 400);
    const timeout = window.setTimeout(() => setHighlightedAnchor(null), 2800);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.clearTimeout(lateSettle);
      window.clearTimeout(timeout);
    };
  }, [lesson.id, targetAnchor, textMode]);

  const copy = async (cmd: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(cmd);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  const related = useMemo(() => lesson.relatedQuestionIds, [lesson]);

  return (
    <article className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          К каталогу уроков
        </button>
        {returnQuestionId && onOpenQuestion && (
          <button
            type="button"
            onClick={() => onOpenQuestion(returnQuestionId)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500 text-slate-950 cursor-pointer"
          >
            Вернуться к вопросу {returnQuestionId}
          </button>
        )}
      </div>

      <header className="space-y-2">
        <div className="flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-300">
          <span>{lesson.category}</span>
          <span>·</span>
          <span>{lesson.osiLayers.join(', ')}</span>
          <span>·</span>
          <span>{lesson.difficulty}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 aria-label={lesson.title} className="text-xl font-bold text-slate-900 dark:text-white">{['l1-poe-injectors-splitters', 'l7-http-status-basics', 'l1-poe-screen-reading'].includes(lesson.id) ? lesson.title : <GlossaryText scope={glossaryScope}>{lesson.title}</GlossaryText>}</h2>
          <LessonReviewBadge lessonId={lesson.id} />
        </div>
        {lesson.professional && <StudyTextToggle value={textMode} onChange={setTextMode} />}
        {lesson.id === 'l1-poe-injectors-splitters' ? <p className="whitespace-pre-line">{content.summary}</p> : lesson.id === 'l1-poe-budget' && textMode === 'professional' && content.summary.includes('IEEE 802.3af/at/bt') ? (
          <div className="min-w-0 max-w-full space-y-2 wrap-anywhere">
            <p className="whitespace-pre-line">
              <GlossaryText>{content.summary.split('IEEE 802.3af/at/bt')[0]}</GlossaryText>
              <span data-poe-summary-standard="plain">IEEE 802.3af/at/bt</span>
              <GlossaryText>{content.summary.split('IEEE 802.3af/at/bt')[1]}</GlossaryText>
            </p>
          </div>
        ) : <FormattedExplanation text={content.summary} glossaryScope={glossaryScope} />}
        <LessonTermTags key={`${lesson.id}-${textMode}`} terms={content.terms} currentLessonId={lesson.id} onOpenLesson={onOpenLesson} showLessonLink={!['l1-copper-fault-poe', 'l1-poe-budget', 'l1-poe-injectors-splitters', 'cli-poe-diagnostics', 'l1-poe-screen-reading'].includes(lesson.id)} />
      </header>

      {lesson.animation && (lesson.id !== 'l1-poe-budget' || textMode === 'meaning') && (
        <figure className="mx-auto w-full max-w-[31rem] overflow-hidden rounded-2xl border border-cyan-400/30 bg-[#06111d] p-3 shadow-sm" data-lesson-animation={lesson.animation.file}>
          <div className="mb-2 text-sm font-semibold text-cyan-100">{lesson.animation.label}</div>
          {lesson.animation.file.endsWith('.svg') ? (
            <img
              src={`${import.meta.env.BASE_URL}lesson-images/${lesson.animation.file}`}
              alt={lesson.animation.label}
              width={lesson.id === 'l7-http-status-basics' ? 360 : undefined}
              height={lesson.id === 'l7-http-status-basics' ? 820 : undefined}
              loading="lazy"
              className="mx-auto block w-full rounded-xl"
              data-poe-motion-image
            />
          ) : (
            <video
              src={`${import.meta.env.BASE_URL}lesson-images/${lesson.animation.file}`}
              autoPlay muted loop playsInline controls preload="metadata"
              aria-label={lesson.animation.label}
              className="mx-auto block w-full rounded-xl"
            />
          )}
          <figcaption className="mt-2 text-xs leading-relaxed text-slate-300">{lesson.animation.description}</figcaption>
        </figure>
      )}
      {lesson.diagram === 'sni' && <SniDiagram />}

      <div className="space-y-4">
        {blocks.map((b) => (
          <section
            key={b.anchorId ?? b.heading}
            ref={element => { if (b.anchorId) anchorElements.current[b.anchorId] = element; }}
            data-lesson-section-anchor={b.anchorId}
            tabIndex={b.anchorId === targetAnchor ? -1 : undefined}
            className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091524] p-4 space-y-2 scroll-mt-24 motion-safe:transition-shadow motion-safe:duration-300 ${b.anchorId && highlightedAnchor === b.anchorId ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/20' : ''}`}
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-500" />
              <span className="min-w-0">{['l1-poe-injectors-splitters', 'l7-http-status-basics', 'l1-poe-screen-reading'].includes(lesson.id) ? b.heading : <GlossaryText key={textMode} scope={glossaryScope}>{b.heading}</GlossaryText>}</span>
            </h3>
            <div className={b.image && !b.imageCollapsible ? "grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(12rem,16rem)] md:items-start" : ""}>
              <div className="min-w-0 space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed"><FormattedExplanation text={b.body} glossaryScope={glossaryScope} />{b.pinout === 't568' && <EthernetPinout />}</div>
              {b.image && !b.imageCollapsible && <LessonPhoto image={b.image} />}
            </div>
            {b.image && b.imageCollapsible && (
              <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/40" data-lesson-secondary-photo>
                <summary className="cursor-pointer text-xs font-medium text-slate-600 underline decoration-dotted underline-offset-2 dark:text-slate-300">{b.imageDisclosureLabel ?? 'Показать дополнительное фото'}</summary>
                <div className="mt-3"><LessonPhoto image={b.image} /></div>
              </details>
            )}
            {b.cheatsheetJump && (
              <button type="button" onClick={() => revealCheatsheet(b.cheatsheetJump!.file)}
                data-cheatsheet-reveal={b.cheatsheetJump.file}
                aria-controls={cheatsheetId(b.cheatsheetJump.file)}
                className="inline-flex cursor-pointer text-sm font-semibold text-cyan-700 underline underline-offset-2 hover:text-cyan-800 focus-visible:outline-2 focus-visible:outline-cyan-500 dark:text-cyan-300 dark:hover:text-cyan-200">
                {b.cheatsheetJump.label}
              </button>
            )}
            {b.cheatsheet && (
              <details id={cheatsheetId(b.cheatsheet.file)} data-lesson-cheatsheet={b.cheatsheet.file}
                open={b.cheatsheetInitiallyOpen}
                ref={element => { cheatsheetElements.current[b.cheatsheet!.file] = element; }}
                className="group mt-3 overflow-hidden rounded-xl border border-cyan-300/50 bg-cyan-50/50 dark:border-cyan-500/30 dark:bg-cyan-950/20">
                <summary className="flex cursor-pointer select-none items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-cyan-900 dark:text-cyan-100">
                  <span className="flex min-w-0 items-center gap-2"><BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />Шпаргалка: {b.cheatsheet.title}</span>
                  <span className="shrink-0 text-xs font-medium text-cyan-700 dark:text-cyan-300 group-open:hidden">Развернуть</span>
                  <span className="hidden shrink-0 text-xs font-medium text-cyan-700 dark:text-cyan-300 group-open:inline">Свернуть</span>
                </summary>
                <div className="space-y-3 border-t border-cyan-300/40 p-3">
                  {b.cheatsheet.file === 'poe-standards-cheatsheet.svg' ? (
                    <PoEStandardsChart />
                  ) : (
                    <ZoomableImage
                      src={`${import.meta.env.BASE_URL}lesson-images/${b.cheatsheet.file}`}
                      alt={b.cheatsheet.alt}
                      previewFullHeight
                      className="w-full"
                    />
                  )}
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{b.cheatsheet.note}</p>
                </div>
              </details>
            )}
            {b.relatedLesson && onOpenLesson && (
              <button type="button" onClick={() => onOpenLesson(b.relatedLesson!.id)}
                data-related-lesson={b.relatedLesson.id}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-700 underline underline-offset-2 hover:bg-cyan-500/20 dark:text-cyan-300">
                <BookOpen className="h-4 w-4" aria-hidden="true" />{b.relatedLesson.label}
              </button>
            )}
            <PracticeLinkButton link={b.practiceLink} onOpenPractice={onOpenPractice} />
          </section>
        ))}
      </div>

      {content.commands && content.commands.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Команды диагностики</h3>
          {content.commands.map((c) => (
            <div key={c.cmd} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3 space-y-2">
              <div className="text-xs font-medium text-slate-700 dark:text-slate-200">{c.title}</div>
              <FormattedExplanation text={c.cmd} command />
              {c.note && <p className="text-[11px] text-slate-500 dark:text-slate-400"><GlossaryText key={textMode} scope={glossaryScope}>{c.note}</GlossaryText></p>}
              <button
                type="button"
                onClick={() => copy(c.cmd)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-200 dark:bg-slate-800 cursor-pointer"
              >
                {copied === c.cmd ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === c.cmd ? 'Скопировано' : 'Копировать'}
              </button>
            </div>
          ))}
        </section>
      )}

      {activeKnowledgeCheck && (
        <LessonKnowledgeCheck
          key={`${lesson.id}-${textMode}`}
          check={activeKnowledgeCheck}
          glossaryScope={glossaryScope}
        />
      )}

      {related.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Связанные вопросы</h3>
          <div className="flex flex-wrap gap-2">
            {related.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onOpenQuestion?.(id)}
                className="px-3 py-1.5 rounded-xl text-xs font-mono bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 cursor-pointer"
              >
                {lesson.id === 'l7-http-status-basics' ? ({ 'l57-x03': '301: постоянный переезд', 'l57-x17': '404: ресурс не найден', 'l7-01': '304: проверка кэша', 'l57-x04': 'PUT: повтор запроса', 'l7-05': '404: смысл ответа', 'l7-new-04': 'HTTP/1.1: соединение' }[id] ?? id) : id}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
        <div className="font-semibold uppercase tracking-wider">Источники</div>
        <ul className="list-disc pl-4 space-y-0.5">
          {content.sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
    </article>
  );
};
