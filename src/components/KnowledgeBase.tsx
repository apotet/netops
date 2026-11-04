import React, { useMemo, useState } from 'react';
import { LESSONS, searchLessons, getLesson } from '../data/lessons';
import { LessonView } from './LessonView';
import { Library, Search } from 'lucide-react';

interface KnowledgeBaseProps {
  initialLessonId?: string | null;
  returnQuestionId?: string | null;
  onOpenQuestion?: (questionId: string) => void;
  onClearLesson?: () => void;
}

const LAYERS = ['all', 'L1', 'L2', 'L3', 'L4', 'L5–L7', 'L7'];

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  initialLessonId,
  returnQuestionId,
  onOpenQuestion,
  onClearLesson,
}) => {
  const [query, setQuery] = useState('');
  const [layer, setLayer] = useState('all');
  const [openId, setOpenId] = useState<string | null>(initialLessonId || null);

  React.useEffect(() => {
    if (initialLessonId) setOpenId(initialLessonId);
  }, [initialLessonId]);

  const lesson = openId ? getLesson(openId) : undefined;
  const list = useMemo(() => searchLessons(query, layer === 'all' ? undefined : layer), [query, layer]);

  if (lesson) {
    return (
      <LessonView
        lesson={lesson}
        returnQuestionId={returnQuestionId}
        onOpenQuestion={onOpenQuestion}
        onBack={() => {
          setOpenId(null);
          onClearLesson?.();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
        <Library className="w-4 h-4 text-cyan-500" />
        <h2 className="text-base font-semibold">База знаний</h2>
        <span className="text-[11px] font-mono text-slate-500">{LESSONS.length} урок</span>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск: SNI, TLS, сертификат…"
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {LAYERS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLayer(l)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
              layer === l ? 'bg-cyan-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {l === 'all' ? 'Все уровни' : l}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-slate-500">Ничего не найдено. Пустые карточки не показываем — в каталоге только готовые уроки.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setOpenId(l.id)}
              className="text-left rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#091524] p-4 space-y-2 cursor-pointer hover:border-cyan-500/40"
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-300">
                {l.category} · {l.difficulty}
              </div>
              <div className="font-semibold text-slate-900 dark:text-white">{l.title}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">{l.summary}</p>
              <div className="text-[11px] text-slate-500">Вопросов: {l.relatedQuestionIds.length}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
