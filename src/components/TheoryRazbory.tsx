import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ALL_QUESTIONS, TOTAL_QUESTION_COUNT, resolveImageUrl } from '../data/questionsData';
import { getQuestionDeepDive } from '../data/questionExplanations';
import { getLessonForQuestion } from '../data/lessons';
import { ZoomableImage } from './ZoomableImage';
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  PlayCircle,
} from 'lucide-react';

interface Props {
  initialQuestionId?: string | null;
  fromExam?: boolean;
  onReturnToExam?: () => void;
  onNavigateToIpv4: (prefix?: number, mode?: 'calc' | 'trainer') => void;
  onClearInitialQuestion?: () => void;
  onOpenLesson?: (lessonId: string, fromQuestionId?: string) => void;
}

export const TheoryRazbory: React.FC<Props> = ({
  initialQuestionId,
  fromExam,
  onReturnToExam,
  onNavigateToIpv4,
  onClearInitialQuestion,
  onOpenLesson,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});
  const [deepOpen, setDeepOpen] = useState<Record<string, boolean>>({});
  const targetCardRef = useRef<HTMLDivElement | null>(null);

  const focusedQuestion = useMemo(() => {
    if (!initialQuestionId) return null;
    return ALL_QUESTIONS.find((q) => q.id === initialQuestionId) || null;
  }, [initialQuestionId]);

  useEffect(() => {
    if (!initialQuestionId) return;
    setExpandedQuestions((prev) => ({ ...prev, [initialQuestionId]: true }));
    setDeepOpen((prev) => ({ ...prev, [initialQuestionId]: true }));
    const target = ALL_QUESTIONS.find((q) => q.id === initialQuestionId);
    if (target?.group === 'visual-l1') setSelectedCategory('visual');
    setTimeout(() => targetCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }, [initialQuestionId]);

  const filteredQuestions = useMemo(() => {
    let list = ALL_QUESTIONS.filter((q) => {
      if (selectedCategory === 'visual' && q.group !== 'visual-l1') return false;
      if (selectedCategory === 'l1' && !(q.group === 'l1-l2' && (q.topic.includes('L1') || q.topic.includes('Оптика')))) return false;
      if (selectedCategory === 'l2' && !(q.group === 'l1-l2' && !q.topic.includes('L1') && !q.topic.includes('Оптика'))) return false;
      if (selectedCategory === 'l3' && q.group !== 'l3') return false;
      if (selectedCategory === 'l4' && q.group !== 'l4') return false;
      if (selectedCategory === 'l5-l7' && q.group !== 'l5-l7') return false;
      if (selectedCategory === 'tcpip' && q.group !== 'tcpip') return false;
      if (selectedCategory === 'troubleshooting' && q.group !== 'troubleshooting') return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return (
          q.id.toLowerCase().includes(query) ||
          q.text.toLowerCase().includes(query) ||
          q.topic.toLowerCase().includes(query) ||
          q.answers.some((a) => a.toLowerCase().includes(query)) ||
          (q.explanation || '').toLowerCase().includes(query)
        );
      }
      return true;
    });
    if (initialQuestionId) {
      const pinned = list.filter((q) => q.id === initialQuestionId);
      const rest = list.filter((q) => q.id !== initialQuestionId);
      if (pinned.length === 0 && focusedQuestion) return [focusedQuestion, ...list];
      return [...pinned, ...rest];
    }
    return list;
  }, [searchQuery, selectedCategory, initialQuestionId, focusedQuestion]);

  const renderDeepDive = (qId: string) => {
    const q = ALL_QUESTIONS.find((item) => item.id === qId);
    if (!q) return null;
    const deep = getQuestionDeepDive(q);
    const correctSet = new Set(q.correct);
    const showEngineering = !!deepOpen[qId];
    const isAdvanced = q.difficulty === 'advanced' || deep.hasIndividualDeep;

    return (
      <div className="space-y-4 max-w-full overflow-x-hidden">
        {q.image && (
          <div className="max-w-lg mx-auto">
            <ZoomableImage src={resolveImageUrl(q.image)} alt={q.imageAlt || 'Фото'} caption={q.imageAlt} imgClassName="max-h-72" />
          </div>
        )}

        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Варианты ответов</div>
          {q.answers.map((ans, idx) => {
            const ok = correctSet.has(idx);
            return (
              <div
                key={idx}
                className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-sm break-words ${
                  ok
                    ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300'
                }`}
              >
                {ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5 opacity-50" />
                )}
                <span className="min-w-0">{ans}</span>
              </div>
            );
          })}
        </div>

        <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-50/80 dark:bg-cyan-950/30 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 font-mono">
              Краткий ответ
            </div>
            {q.difficulty && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                {q.difficulty === 'beginner' ? 'basic' : q.difficulty}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line break-words">
            {deep.briefAnswer}
          </p>
        </div>

        {(isAdvanced || deep.engineeringDeep || deep.deepAnalysis) && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setDeepOpen((prev) => ({ ...prev, [qId]: !prev[qId] }))}
              className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <BookOpen className="w-4 h-4 text-cyan-500 shrink-0" />
                {isAdvanced ? 'Инженерный разбор' : 'Подробный разбор'}
              </span>
              {showEngineering ? (
                <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </button>
            {showEngineering && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-200 dark:border-slate-800">
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line break-words pt-3">
                  {deep.engineeringDeep || deep.deepAnalysis}
                </p>
                {deep.nextStudy && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Дальше: {deep.nextStudy}</p>
                )}
                {onOpenLesson && getLessonForQuestion(q.id) && (
                  <button
                    type="button"
                    onClick={() => onOpenLesson(getLessonForQuestion(q.id)!.id, q.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500 text-slate-950 cursor-pointer"
                  >
                    Изучить тему подробно
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {deep.commonTrap && (
          <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 font-mono flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Типичная ошибка
            </div>
            <p className="text-sm text-amber-900 dark:text-amber-100/90 leading-relaxed break-words">{deep.commonTrap}</p>
          </div>
        )}

        {deep.practicalTip && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-mono flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" /> Практика
            </div>
            <p className="text-sm text-emerald-900 dark:text-emerald-100/90 leading-relaxed break-words">{deep.practicalTip}</p>
          </div>
        )}

        {deep.keyTakeaways?.length > 0 && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">Запомнить</div>
            <ul className="space-y-1.5">
              {deep.keyTakeaways.map((tip, i) => (
                <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2 min-w-0">
                  <span className="text-cyan-500 font-mono text-xs mt-0.5 shrink-0">{i + 1}.</span>
                  <span className="break-words">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {deep.ipv4Practice?.enabled && (
          <button
            type="button"
            onClick={() => onNavigateToIpv4(deep.ipv4Practice?.targetPrefix, deep.ipv4Practice?.targetMode)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-bold cursor-pointer"
          >
            Открыть IPv4-тренажёр
          </button>
        )}
      </div>
    );
  };

  const categories = [
    { id: 'all', label: 'Все' },
    { id: 'visual', label: 'L1 фото' },
    { id: 'l1', label: 'L1' },
    { id: 'l2', label: 'L2' },
    { id: 'l3', label: 'L3' },
    { id: 'l4', label: 'L4' },
    { id: 'l5-l7', label: 'L5–L7' },
    { id: 'tcpip', label: 'TCP/IP' },
    { id: 'troubleshooting', label: 'CLI' },
  ];

  return (
    <div className="space-y-5 max-w-3xl mx-auto max-w-full overflow-x-hidden">
      {focusedQuestion && (
        <div
          ref={targetCardRef}
          className="p-5 rounded-2xl border-2 border-cyan-500/50 bg-cyan-50/50 dark:bg-cyan-950/20 space-y-4 shadow-lg shadow-cyan-500/10"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="text-[11px] font-mono text-cyan-700 dark:text-cyan-300">
                #{focusedQuestion.id} · {focusedQuestion.topic}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed break-words">
                {focusedQuestion.text}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {fromExam && onReturnToExam && (
                <button
                  type="button"
                  onClick={onReturnToExam}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 cursor-pointer"
                >
                  <PlayCircle className="w-3.5 h-3.5" /> Вернуться к экзамену
                </button>
              )}
              {onClearInitialQuestion && (
                <button
                  type="button"
                  onClick={() => {
                    onClearInitialQuestion();
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> К каталогу
                </button>
              )}
            </div>
          </div>
          {renderDeepDive(focusedQuestion.id)}
          {fromExam && onReturnToExam && (
            <button
              type="button"
              onClick={onReturnToExam}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 text-sm font-bold cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              Продолжить экзамен
            </button>
          )}
        </div>
      )}

      {!focusedQuestion && (
        <>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по тексту, теме, id..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  selectedCategory === c.id
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Банк: {TOTAL_QUESTION_COUNT} · найдено: {filteredQuestions.length}
          </div>
          <div className="space-y-2">
            {filteredQuestions.slice(0, 80).map((q) => {
              const isExpanded = !!expandedQuestions[q.id];
              return (
                <div
                  key={q.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedQuestions((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono text-slate-400 mb-0.5">
                        #{q.id} · {q.topic}
                        {q.difficulty ? ` · ${q.difficulty}` : ''}
                      </div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug break-words">
                        {q.text}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                    )}
                  </button>
                  {isExpanded && <div className="px-4 pb-4">{renderDeepDive(q.id)}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
