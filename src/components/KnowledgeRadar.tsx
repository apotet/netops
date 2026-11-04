import React, { useState, useEffect } from 'react';
import { triggerHaptic } from '../utils/haptics';
import { getInitialProgress, ProgressState, resetProgress } from '../utils/userProgress';
import {
  Flame,
  Award,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  RotateCcw,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface KnowledgeRadarProps {
  onStartExam: (levelFilter?: string) => void;
  onReviewMistakes: () => void;
  onOpenVisualL1: () => void;
  mistakesCount: number;
  totalQuestionsCount?: number;
}

export const KnowledgeRadar: React.FC<KnowledgeRadarProps> = ({
  onStartExam,
  onReviewMistakes,
  onOpenVisualL1,
  mistakesCount,
  totalQuestionsCount = 502,
}) => {
  const [progress, setProgress] = useState<ProgressState>(getInitialProgress());
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false);
  const [showStreakModal, setShowStreakModal] = useState<boolean>(false);

  // Sync state whenever mistakes or localStorage changes
  useEffect(() => {
    setProgress(getInitialProgress());
  }, [mistakesCount]);

  // SVG Circular Gauge Math
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress.readinessPercent / 100) * circumference;

  const handleLevelDrill = (level: string) => {
    triggerHaptic('medium');
    onStartExam(level);
  };

  const handleReset = () => {
    triggerHaptic('heavy');
    const reset = resetProgress();
    setProgress(reset);
  };

  return (
    <div className="space-y-3 w-full">
      {/* Hero Readiness & Streak Card (Matching Mockup Bento Card) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-[#0c1c2e] dark:via-[#091524] dark:to-[#07111f] border border-slate-200 dark:border-cyan-500/30 shadow-lg dark:shadow-2xl relative overflow-hidden transition-colors">
        {/* Subtle radial glow in dark mode */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Circular Readiness Gauge & Text */}
          <div
            onClick={() => {
              triggerHaptic('selection');
              setShowBreakdown(!showBreakdown);
            }}
            className="flex items-center gap-4 cursor-pointer group"
            title="Нажмите для просмотра интерактивного разбора по 7 уровням"
          >
            {/* Circular Gauge */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 96 96">
                {/* Background Ring */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className="stroke-slate-200 dark:stroke-slate-800"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress Ring with Cyan Glow */}
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className="stroke-cyan-500 dark:stroke-cyan-400 transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                  style={{
                    filter: 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.6))',
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black font-mono text-slate-900 dark:text-white leading-none">
                  {progress.readinessPercent}%
                </span>
              </div>
            </div>

            {/* Contextual Readiness Analysis */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                  Готовность к экзамену
                </h2>
                {showBreakdown ? (
                  <ChevronUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-cyan-500" />
                )}
              </div>

              <div className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLevelDrill(progress.weakSpot.level);
                  }}
                  className="flex items-center gap-1.5 cursor-pointer hover:underline"
                  title="Нажмите, чтобы тренировать слабое место"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>
                    Слабое место:{' '}
                    <strong className="text-rose-600 dark:text-rose-300 font-semibold">
                      {progress.weakSpot.topic}
                    </strong>
                  </span>
                </div>

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLevelDrill(progress.strongSpot.level);
                  }}
                  className="flex items-center gap-1.5 cursor-pointer hover:underline"
                  title="Нажмите, чтобы закрепить сильный навык"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>
                    Сильнее всего:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-300 font-semibold">
                      {progress.strongSpot.topic}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Streak indicator badge */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => {
                triggerHaptic('light');
                setShowStreakModal(!showStreakModal);
              }}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-cyan-950/80 dark:hover:bg-cyan-900 border border-slate-300 dark:border-cyan-400/40 text-cyan-700 dark:text-cyan-300 text-xs font-mono font-bold shadow-sm transition-all cursor-pointer active:scale-95"
              title="Ваша непрерывная серия дней"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
              <span>Серия {progress.streakDays} дн.</span>
            </button>
          </div>
        </div>

        {/* Streak Details Drawer */}
        {showStreakModal && (
          <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 animate-fade-in">
            <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
              <span>🔥 Непрерывные занятия</span>
              <span className="text-amber-500">{progress.streakDays} дней подряд</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Каждый день регулярного решения 10 вопросов закрепляет переходы между уровнями модели OSI в долговременную память.
            </p>
          </div>
        )}

        {/* Interactive 7-Layer Mastery Breakdown Drawer */}
        {showBreakdown && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-cyan-500" />
                Карта мастерства по уровням OSI
              </span>
              <button
                onClick={handleReset}
                type="button"
                className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors font-mono flex items-center gap-1 cursor-pointer"
                title="Сбросить историю для проверки изменения шкалы"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Сброс статистики</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.values(progress.levels).map((lvl) => {
                const isWeak = lvl.level === progress.weakSpot.level;
                const isStrong = lvl.level === progress.strongSpot.level;

                return (
                  <div
                    key={lvl.level}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                      isWeak
                        ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/40'
                        : isStrong
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/40'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                          {lvl.level} {lvl.name.split(' ')[0]}
                        </span>
                        <span className="font-mono font-bold text-[11px] text-cyan-600 dark:text-cyan-400">
                          {lvl.masteryPercent}%
                        </span>
                      </div>

                      {/* Bar */}
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isWeak ? 'bg-rose-500' : isStrong ? 'bg-emerald-500' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${lvl.masteryPercent}%` }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleLevelDrill(lvl.level)}
                      type="button"
                      className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold shrink-0 cursor-pointer transition-colors"
                      title={`Тренировать уровень ${lvl.level}`}
                    >
                      Тест
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bento Action Cards: Mistakes Drill + Visual L1 (Exactly as in mockup) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {/* Mistakes Review Mini Card */}
        <div
          onClick={() => {
            triggerHaptic('medium');
            onReviewMistakes();
          }}
          className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#091524] border border-rose-300 dark:border-rose-500/30 hover:border-rose-400 dark:hover:border-rose-400/60 hover:bg-rose-50/50 dark:hover:bg-[#0b1a2d] transition-all cursor-pointer flex flex-col justify-between min-h-[96px] shadow-sm dark:shadow-lg dark:shadow-rose-950/20 group"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-200 transition-colors block">
              Работа над ошибками
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-600 dark:text-cyan-400">
              {mistakesCount > 0 ? mistakesCount : 14}
            </div>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
            вопросов на повтор
          </span>
        </div>

        {/* Visual L1 Equipment Cards */}
        <div
          onClick={() => {
            triggerHaptic('light');
            onOpenVisualL1();
          }}
          className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#091524] border border-cyan-300 dark:border-cyan-500/30 hover:border-cyan-400 dark:hover:border-cyan-400/60 hover:bg-cyan-50/50 dark:hover:bg-[#0b1a2d] transition-all cursor-pointer flex flex-col justify-between min-h-[96px] shadow-sm dark:shadow-lg dark:shadow-cyan-950/20 group"
        >
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-200 transition-colors block">
              Фото L1
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-600 dark:text-cyan-400">
              26/40
            </div>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
            разобрано
          </span>
        </div>
      </div>

      {/* Main Big Glow CTA Button: "Продолжить экзамен" */}
      <button
        onClick={() => {
          triggerHaptic('heavy');
          onStartExam();
        }}
        type="button"
        className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-cyan-400 to-teal-400 text-slate-950 font-black text-sm sm:text-base hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(34,211,238,0.35)] cursor-pointer tracking-wide"
      >
        <Sparkles className="w-4 h-4 fill-slate-950" />
        <span>Продолжить экзамен</span>
      </button>
    </div>
  );
};
