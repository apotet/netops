import { EngineeringReview, type ExplanationNavigation } from './EngineeringReview';
import React, { useState, useEffect, useCallback, useRef, useImperativeHandle } from 'react';
import {
  Question,
  QuizModeId,
  ExamDifficulty,
  EXAM_DIFFICULTIES,
  TRIAL_DIFFICULTIES,
  type TrialDifficulty,
} from '../types/quiz';
import {
  ALL_QUESTIONS,
  QUIZ_MODES,
  resolveImageUrl,
} from '../data/questionsData';
import { getTestingPool, getTestingQuestions, getTestingEligibleQuestions, getTrialExamQuestions, TRIAL_EXAM_OPTIONS } from '../data/learningLevelExam';
import { playSuccessSound, playErrorSound, playClickSound } from '../utils/sound';
import { triggerHaptic } from '../utils/haptics';
import { getInitialProgress, getMistakeQuestions, getProgressEpoch, subscribeProgress, retainProgressBackup, getLegacyAttemptBackups, LEGACY_ACTIVE_ATTEMPT_KEY, N5_ACTIVE_ATTEMPT_KEY } from '../utils/userProgress';
import { prepareAttemptQuestions, restoreSession, readSavedAttempts, writeAttemptSlot, withAttemptCommitLock, confirmAnswer, recordConfirmedAnswers, hasDurableAnswerReceipts, expireTrial, TRIAL_MINUTES, TRIAL_QUESTION_COUNT, type AttemptSlot, type SavedAttempt, type ProgressSession } from '../utils/examProgress';
import { ExamReview } from './ExamReview';
import { getLessonForQuestion } from '../data/lessons';
import { LAST_REVIEW_KEY, reconcileLastReview, restoreReview, reviewTime } from '../utils/examReview';
import { KnowledgeRadar } from './KnowledgeRadar';
import { LivingOsiStack as HomeOsiStack } from './HomeOsiStack';
import { ZoomableImage } from './ZoomableImage';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Award,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BookmarkCheck,
  Timer,
  Image as ImageIcon,
  BookOpen,
} from 'lucide-react';

const examLevels: Record<ExamDifficulty, { title: string; description: string }> = {
  beginner: { title: 'База', description: 'Основы сетей' },
  'in-depth': { title: 'Углублённый', description: 'Понимание работы сети' },
  applied: { title: 'Прикладной', description: 'Применение знаний' },
  mixed: { title: 'Смешанный', description: 'Все уровни сложности' },
};

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20, 30] as const;

/** A compact, theme-aware menu avoids oversized/unreadable native select popups on Windows. */
const QuestionCountDropdown: React.FC<{ value: number; onChange: (count: number) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]')
      ?.focus({ preventScroll: true });

    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const handleMenuKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
    const activeIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex = event.key === 'Home' ? 0
      : event.key === 'End' ? items.length - 1
      : (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[nextIndex]?.focus({ preventScroll: true });
  };

  return (
    <div className="relative" ref={rootRef}>
      <button type="button" ref={triggerRef}
        aria-label={`Вопросов в тесте: ${value}`}
        aria-haspopup="menu" aria-expanded={open} aria-controls="exam-question-count-menu"
        onClick={() => setOpen(previous => !previous)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-slate-700">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Вопросов в тесте</span>
        <span aria-hidden="true" className="flex items-center gap-1 text-sm font-bold tabular-nums text-slate-900 dark:text-white">
          {value}<ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {open && (
        <div id="exam-question-count-menu" role="menu" aria-label="Количество вопросов в тесте"
          ref={menuRef} onKeyDown={handleMenuKeys}
          className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/20 dark:border-slate-700 dark:bg-slate-900">
          {QUESTION_COUNT_OPTIONS.map(count => (
            <button type="button" key={count} role="menuitemradio" aria-checked={value === count}
              onClick={() => {
                onChange(count);
                setOpen(false);
                triggerRef.current?.focus({ preventScroll: true });
              }}
              className={`flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${value === count
                ? 'bg-cyan-100 font-semibold text-cyan-900 dark:bg-cyan-950 dark:text-cyan-100'
                : 'text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800'}`}>
              {count} вопросов
              {value === count && <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

type AttemptTarget = { slot: AttemptSlot; expectedRaw: string | null; archiveUnreadable?: boolean };

function restoreAcceptedAttempt(raw: string, epoch: string): ProgressSession | null {
  const attempt = restoreReview(`{"version":1,"session":${raw}}`, epoch) ?? restoreSession(raw, ALL_QUESTIONS);
  return attempt?.progressEpoch === epoch ? attempt : null;
}

export interface ExamViewHandle {
  returnToParameters: () => void;
}

interface ExamViewProps extends ExplanationNavigation {
  ref?: React.Ref<ExamViewHandle>;
  soundEnabled: boolean;
  onNavigateToLearning?: () => void;
  onSelectLevel?: (level: string) => void;
}

export const ExamView: React.FC<ExamViewProps> = ({ ref, soundEnabled, onNavigateToLearning, ...navigation }) => {
  const [session, setSession] = useState<ProgressSession | null>(null);
  const [selectedMode, setSelectedMode] = useState<QuizModeId>('mixed');
  const [selectedDifficulty, setSelectedDifficulty] = useState<ExamDifficulty>('beginner');
  const [startNotice, setStartNotice] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [feedbackMode, setFeedbackMode] = useState<'instant' | 'exam'>('instant');
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false);
  const sessionRef = useRef<ProgressSession | null>(null);
  const sessionSlot = useRef<AttemptSlot>(N5_ACTIVE_ATTEMPT_KEY);
  const sessionRaw = useRef<string | null>(null);
  const transitionPending = useRef(false);
  const [savedAttempts, setSavedAttempts] = useState<SavedAttempt[]>([]);
  const inspectAttempts = useCallback(() =>
    readSavedAttempts(localStorage, getLegacyAttemptBackups(), ALL_QUESTIONS, getProgressEpoch()), []);
  const [, refreshProgress] = useState(0);
  const [emptyMistakes, setEmptyMistakes] = useState(false);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [statisticsWarning, setStatisticsWarning] = useState(false);
  const [lastReview, setLastReview] = useState<ProgressSession | null>(null);
  const [reviewSession, setReviewSession] = useState<ProgressSession | null>(null);
  const [reviewWarning, setReviewWarning] = useState(false);
  const [showParameters, setShowParameters] = useState(true);
  const parametersRef = useRef<HTMLDivElement>(null);
  const [moreModesOpen, setMoreModesOpen] = useState(false);
  const [showTrialOptions, setShowTrialOptions] = useState(false);
  const trialOptionsRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = trialOptionsRef.current;
    if (showTrialOptions && dialog && !dialog.open) dialog.showModal();
  }, [showTrialOptions]);
  const [remainingSeconds, setRemainingSeconds] = useState(TRIAL_MINUTES * 60);
  const [pendingNewQuiz, setPendingNewQuiz] = useState<{ questions?: Question[]; count: number; mode: QuizModeId; trial?: TrialDifficulty; expectedRaw: string | null; epoch: string; reason: 'active' | 'backup' | 'unreadable' } | null>(null);
  const epochRef = useRef(getProgressEpoch());
  useEffect(() => subscribeProgress(() => {
    if (sessionRef.current && sessionRef.current.progressEpoch !== getProgressEpoch()) {
      sessionRef.current = null; setSession(null); setSelectedAnswers([]); setIsAnswerSubmitted(false);
    }
    const epoch = getProgressEpoch();
    if (epochRef.current !== epoch) {
      epochRef.current = epoch;
      setLastReview(null); setReviewSession(null); setSavedAttempts([]); setPendingNewQuiz(null); setStatisticsWarning(false);
      try { localStorage.removeItem(LAST_REVIEW_KEY); } catch { setReviewWarning(true); }
    }
    refreshProgress(value => value + 1);
  }), []);
  const adoptAttempt = useCallback((next: ProgressSession, slot: AttemptSlot, raw: string) => {
    sessionSlot.current = slot;
    sessionRaw.current = raw;
    sessionRef.current = next;
    setSession(next);
    const questionId = next.questions[next.currentIndex]?.id;
    setSelectedAnswers(next.userAnswers[questionId] || []);
    setIsAnswerSubmitted(next.submittedQuestions[questionId] || false);
  }, []);

  const replayStatistics = useCallback((saved: ProgressSession): boolean => {
    try {
      recordConfirmedAnswers(saved);
      return hasDurableAnswerReceipts(localStorage, saved);
    } catch { return false; }
  }, []);

  const repairReview = useCallback((saved: ProgressSession): boolean => {
    if (!saved.isCompleted) return true;
    if (saved.progressEpoch !== getProgressEpoch()) return false;
    setLastReview(previous => previous && reviewTime(previous) > reviewTime(saved) ? previous : saved);
    try {
      const latest = reconcileLastReview(localStorage, saved);
      setLastReview(latest);
      setReviewWarning(false);
      return true;
    } catch { setReviewWarning(true); return false; }
  }, []);

  const saveSession = useCallback(async (
    next: ProgressSession,
    target: AttemptTarget = { slot: sessionSlot.current, expectedRaw: sessionRaw.current },
  ): Promise<boolean> => {
    if (transitionPending.current) return false;
    transitionPending.current = true;
    try {
      return await withAttemptCommitLock(() => {
        const epoch = getProgressEpoch();
        if (next.progressEpoch !== epoch || localStorage.getItem(target.slot) !== target.expectedRaw) {
          throw Error('Saved attempt or progress epoch changed');
        }
        if (target.expectedRaw !== null) {
          const prior = restoreAcceptedAttempt(target.expectedRaw, epoch);
          if (prior && prior.attemptId !== next.attemptId) {
            // A new attempt would erase our only replay source. Repair and
            // verify the old durable state first; never depend on dirty memory.
            const statsOK = replayStatistics(prior);
            const reviewOK = repairReview(prior);
            setStatisticsWarning(!statsOK);
            if (!statsOK || !reviewOK) throw Error('Previous durable attempt still needs repair');
          }
          if (target.archiveUnreadable && !retainProgressBackup(target.slot, target.expectedRaw)) {
            throw Error('Unreadable attempt could not be archived');
          }
        }
        if (next.progressEpoch !== getProgressEpoch()) throw Error('Progress was reset');
        const raw = JSON.stringify(next);
        writeAttemptSlot(localStorage, target.slot, target.expectedRaw, raw);
        // No state advance, receipt, completion or review before slot acceptance.
        adoptAttempt(next, target.slot, raw);
        setSessionWarning(false);
        setStatisticsWarning(!replayStatistics(next));
        repairReview(next);
        try { setSavedAttempts(inspectAttempts().attempts); }
        catch { setSessionWarning(true); }
        return true;
      });
    } catch { setSessionWarning(true); return false; }
    finally { transitionPending.current = false; }
  }, [adoptAttempt, inspectAttempts, repairReview, replayStatistics]);

  const deadline = session && !session.isCompleted ? session.trialDeadline : undefined;
  useEffect(() => {
    if (deadline === undefined) return;
    let expiryPending = false;
    const tick = async () => {
      const current = sessionRef.current;
      if (!current || current.trialDeadline !== deadline || current.isCompleted) return;
      const now = Date.now();
      setRemainingSeconds(Math.max(0, Math.ceil((deadline - now) / 1000)));
      const expired = expireTrial(current, now);
      if (expired === current || expiryPending) return;
      expiryPending = true;
      const accepted = await saveSession(expired);
      expiryPending = false;
      if (!accepted) return;
      setPendingNewQuiz(null);
      setShowTrialOptions(false);
      setReviewSession(null);
      setShowParameters(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    void tick();
    const interval = window.setInterval(tick, 500);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [deadline, saveSession]);

  const clock = `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`;

  const loadAttempt = useCallback(async (attempt: SavedAttempt, expectedRaw: string | null, open: boolean) => {
    const restored = expireTrial(attempt.session);
    const slot = attempt.origin === 'backup' ? N5_ACTIVE_ATTEMPT_KEY : attempt.origin;
    if (restored !== attempt.session || attempt.origin === 'backup') {
      if (!await saveSession(restored, { slot, expectedRaw })) return;
    } else {
      if (transitionPending.current) return;
      transitionPending.current = true;
      try {
        await withAttemptCommitLock(() => {
          if (expectedRaw === null || restored.progressEpoch !== getProgressEpoch() || localStorage.getItem(slot) !== expectedRaw) {
            throw Error('Saved attempt changed');
          }
          adoptAttempt(restored, slot, expectedRaw);
        });
      } catch { setSessionWarning(true); return; }
      finally { transitionPending.current = false; }
    }
    setReviewSession(null);
    if (open || restored.isCompleted) setShowParameters(false);
  }, [adoptAttempt, saveSession]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const active = await withAttemptCommitLock(() => {
        if (cancelled) return undefined;
        const result = inspectAttempts();
        const epoch = getProgressEpoch();
        try {
          const last = localStorage.getItem(LAST_REVIEW_KEY);
          const previous = last === null ? null : restoreReview(last, epoch);
          if (previous) setLastReview(previous);
          else if (last !== null) setReviewWarning(true);
        } catch { setReviewWarning(true); }
        const completedAttempts: ProgressSession[] = [];
        let statsOK = true;
        const currentAttempts = result.attempts.filter(attempt => attempt.origin !== 'backup');
        for (const key of [N5_ACTIVE_ATTEMPT_KEY, LEGACY_ACTIVE_ATTEMPT_KEY] as const) {
          const raw = result.raws[key];
          if (raw === null || localStorage.getItem(key) !== raw || getProgressEpoch() !== epoch) continue;
          const completed = restoreReview(`{"version":1,"session":${raw}}`, epoch);
          const active = currentAttempts.find(attempt => attempt.origin === key);
          if (completed) {
            statsOK = replayStatistics(completed) && statsOK;
            completedAttempts.push(completed);
          } else if (active) {
            statsOK = replayStatistics(active.session) && statsOK;
          } else if (result.unreadable.includes(key)) {
            if (key === LEGACY_ACTIVE_ATTEMPT_KEY && !getLegacyAttemptBackups().includes(raw)) retainProgressBackup(key, raw);
            setSessionWarning(true);
          }
        }
        setStatisticsWarning(!statsOK);
        const latest = completedAttempts.sort((a, b) => reviewTime(b) - reviewTime(a))[0];
        if (latest && latest.progressEpoch === getProgressEpoch()) repairReview(latest);
        setSavedAttempts(result.attempts);
        return currentAttempts[0];
      });
      if (active && !cancelled) await loadAttempt(active, active.raw, false);
    };
    void init().catch(() => { if (!cancelled) setSessionWarning(true); });
    return () => { cancelled = true; };
  }, [inspectAttempts, loadAttempt, replayStatistics, repairReview]);

  useEffect(() => {
    const refresh = (event: StorageEvent) => {
      if (event.key === null || event.key === N5_ACTIVE_ATTEMPT_KEY || event.key === LEGACY_ACTIVE_ATTEMPT_KEY) {
        try {
          const result = inspectAttempts();
          setSavedAttempts(result.attempts);
          if (sessionRef.current && result.raws[sessionSlot.current] !== sessionRaw.current) setSessionWarning(true);
        } catch { setSessionWarning(true); }
      }
    };
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [inspectAttempts]);

  const chooseSavedAttempt = (shown: SavedAttempt) => {
    try {
      const result = inspectAttempts();
      setSavedAttempts(result.attempts);
      const attempt = result.attempts.find(item => item.origin === shown.origin && item.raw === shown.raw);
      if (!attempt) { setSessionWarning(true); return; }
      const target = attempt.origin === 'backup' ? N5_ACTIVE_ATTEMPT_KEY : attempt.origin;
      void loadAttempt(attempt, result.raws[target], true);
    } catch { setSessionWarning(true); }
  };

  const selectDifficulty = (difficulty: ExamDifficulty) => {
    setSelectedDifficulty(difficulty);
    setStartNotice('');
  };

  const beginNewQuiz = async (customQuestions: Question[] | undefined, count: number, mode: QuizModeId, trial: TrialDifficulty | undefined, expectedRaw: string | null, archiveUnreadable = false) => {
    const difficulty = trial ? 'mixed' : selectedDifficulty;
    const questions = trial
      ? getTrialExamQuestions(trial)
      : getTestingQuestions(mode, count, Math.random, difficulty, customQuestions);
    if (!questions.length || (trial && questions.length !== count)) {
      setStartNotice(trial
        ? 'Пробный экзамен временно недоступен. В банке недостаточно вопросов.'
        : 'В выбранном уровне и теме нет билетов. Выберите другую тему или смешанный уровень.');
      setShowParameters(true);
      return;
    }
    const startTime = Date.now();
    const newSession: ProgressSession = {
      attemptId: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      progressEpoch: getProgressEpoch(),
      ...prepareAttemptQuestions(questions),
      currentIndex: 0,
      userAnswers: {},
      submittedQuestions: {},
      startTime,
      ...(trial ? { trialDeadline: startTime + TRIAL_MINUTES * 60_000, trialDifficulty: trial } : {}),
      isCompleted: false,
      mode,
      difficulty,
      requestedCount: count,
      feedbackMode: trial ? 'exam' : feedbackMode,
    };
    if (!await saveSession(newSession, { slot: N5_ACTIVE_ATTEMPT_KEY, expectedRaw, archiveUnreadable })) return;
    setStartNotice('');
    setReviewSession(null);
    setShowParameters(false);
    if (trial) {
      setRemainingSeconds(TRIAL_MINUTES * 60);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    setEmptyMistakes(false);
  };

  const startNewQuiz = (customQuestions?: Question[], count = questionCount, mode = selectedMode, trial?: TrialDifficulty) => {
    let expectedRaw: string | null = null;
    try {
      const result = inspectAttempts();
      expectedRaw = result.raws[N5_ACTIVE_ATTEMPT_KEY];
      const activeN5 = result.attempts.some(attempt => attempt.origin === N5_ACTIVE_ATTEMPT_KEY);
      const unreadable = result.unreadable.includes(N5_ACTIVE_ATTEMPT_KEY);
      const hadRecovery = result.attempts.some(attempt => attempt.origin === 'backup');
      if (unreadable || activeN5 || hadRecovery || (sessionSlot.current === N5_ACTIVE_ATTEMPT_KEY && sessionRef.current && !sessionRef.current.isCompleted)) {
        setPendingNewQuiz({ questions: customQuestions, count, mode, trial, expectedRaw, epoch: getProgressEpoch(),
          reason: unreadable ? 'unreadable' : hadRecovery ? 'backup' : 'active' });
        return;
      }
    } catch { setSessionWarning(true); }
    void beginNewQuiz(customQuestions, count, mode, trial, expectedRaw);
  };

  const confirmNewQuiz = () => {
    const request = pendingNewQuiz;
    if (!request) return;
    setPendingNewQuiz(null);
    try {
      if (request.epoch !== getProgressEpoch() || localStorage.getItem(N5_ACTIVE_ATTEMPT_KEY) !== request.expectedRaw) {
        throw Error('Saved attempt changed');
      }
    } catch { setSessionWarning(true); return; }
    void beginNewQuiz(request.questions, request.count, request.mode, request.trial, request.expectedRaw, request.reason === 'unreadable');
  };

  const startTrial = (difficulty: TrialDifficulty) => startNewQuiz(undefined, TRIAL_QUESTION_COUNT, 'mixed', difficulty);
  const retryAttempt = (attempt: ProgressSession) => {
    if (attempt.trialDeadline === undefined) startNewQuiz();
    else startTrial(attempt.trialDifficulty ?? 'mixed');
  };

  const currentQuestion = session ? session.questions[session.currentIndex] : null;
  const isMultiSelect = currentQuestion ? currentQuestion.correct.length > 1 : false;

  const handleSelectAnswer = (index: number) => {
    if (isAnswerSubmitted) return;
    triggerHaptic('selection');
    if (soundEnabled) playClickSound();
    if (isMultiSelect) {
      setSelectedAnswers((prev) =>
        prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
      );
    } else {
      setSelectedAnswers([index]);
    }
  };

  const handleSubmitAnswer = async () => {
    const current = sessionRef.current;
    if (!current) return;
    const now = Date.now();
    const updated = confirmAnswer(current, selectedAnswers, now);
    if (updated === current || !await saveSession(updated)) return;
    if (current.trialDeadline === undefined) {
      const question = current.questions[current.currentIndex];
      const isCorrect = selectedAnswers.length === question.correct.length && selectedAnswers.every(a => question.correct.includes(a));
      triggerHaptic(isCorrect ? 'success' : 'error');
      if (soundEnabled) { if (isCorrect) playSuccessSound(); else playErrorSound(); }
    } else {
      triggerHaptic('selection');
    }
  };

  const handleNext = async () => {
    const current = sessionRef.current;
    if (!current || !current.submittedQuestions[current.questions[current.currentIndex]?.id]) return;
    const now = Date.now();
    if (current.trialDeadline !== undefined && now >= current.trialDeadline) return;
    const nextIndex = current.currentIndex + 1;
    if (nextIndex >= current.questions.length) {
      const completed: ProgressSession = { ...current, isCompleted: true, endTime: now };
      if (await saveSession(completed) && current.trialDeadline !== undefined) window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    await saveSession({ ...current, currentIndex: nextIndex });
  };

  const handleExit = () => {
    setReviewSession(null);
    setShowParameters(true);
    if (!sessionRef.current || sessionRef.current.isCompleted) {
      // Keep the completed slot as a snapshot; only a new attempt or progress
      // reset replaces it. Closing a review must never alter the legacy slot.
      sessionRef.current = null;
      setSession(null);
      setSelectedAnswers([]);
      setIsAnswerSubmitted(false);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useImperativeHandle(ref, () => ({
    returnToParameters: () => {
      setShowParameters(true);
      if (reviewSession || session?.isCompleted) {
        handleExit();
        return;
      }
      if (showParameters || !session || !currentQuestion) {
        // Wait for the navbar's mobile menu to close before measuring its height.
        requestAnimationFrame(() => {
          const target = parametersRef.current;
          if (!target) return;
          const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
          const top = window.scrollY + target.getBoundingClientRect().top - headerBottom - 12;
          window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        });
      }
    },
  }));

  const lastMistakes = getMistakeQuestions();
  // The radar count must match exactly which mistakes the selected testing level can launch.
  const eligibleMistakes = getTestingEligibleQuestions(lastMistakes, selectedDifficulty);
  const progressStatus = getInitialProgress();

  const replacementDialog = pendingNewQuiz && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4" role="presentation">
      <div role="alertdialog" aria-modal="true" aria-labelledby="replace-exam-title" aria-describedby="replace-exam-description" className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-white p-6 text-slate-900 shadow-2xl dark:bg-[#101e30] dark:text-slate-100 sm:p-7">
        <h2 id="replace-exam-title" className="text-2xl font-bold leading-tight sm:text-3xl">Начать заново?</h2>
        <p id="replace-exam-description" className="mt-4 text-lg leading-relaxed text-slate-700 dark:text-slate-200">{pendingNewQuiz.reason === 'unreadable'
          ? 'Сохранение текущей версии не читается. Новый тест начнётся только после сохранения его копии для экспорта. Попытка предыдущей версии останется.'
          : pendingNewQuiz.reason === 'backup' ? 'Можно восстановить сохранённую попытку вместо нового теста. Резервная копия останется в экспорте.'
            : 'Новый тест заменит незавершённую попытку текущей версии. Сохранённая попытка предыдущей версии останется.'}</p>
        <div className="mt-7 grid gap-3">
          <button type="button" onClick={confirmNewQuiz} className="min-h-12 rounded-xl bg-cyan-400 px-4 py-3 text-base font-bold text-slate-950 hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">{pendingNewQuiz.reason === 'backup' ? 'Начать новый тест' : 'Заменить попытку'}</button>
          <button type="button" onClick={() => setPendingNewQuiz(null)} className="min-h-12 rounded-xl border border-slate-400/50 px-4 py-3 text-base font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">Отмена, сохранить попытку</button>
        </div>
      </div>
    </div>
  );

  const availableReview = lastReview?.progressEpoch === getProgressEpoch() ? lastReview : null;
  if (reviewSession && reviewSession.progressEpoch === getProgressEpoch()) {
    return <><ExamReview {...navigation} key={reviewSession.attemptId || reviewSession.startTime} session={reviewSession} onExit={handleExit} onLearning={onNavigateToLearning} onRetry={session && !session.isCompleted ? undefined : () => retryAttempt(reviewSession)} />{replacementDialog}</>;
  }

  if (showParameters || !session || !currentQuestion) {
    const primaryIds: QuizModeId[] = ['mixed', 'visual-l1'];
    const primaryModes = QUIZ_MODES.filter((m) => primaryIds.includes(m.id));
    const moreModes = QUIZ_MODES.filter((m) => !primaryIds.includes(m.id));
    const selectedInMore = moreModes.some((m) => m.id === selectedMode);
    const availableCount = getTestingPool(selectedMode, selectedDifficulty).length;
    return (
      <div className="space-y-5 max-w-3xl mx-auto pb-16 lg:pb-6">
        {sessionWarning && <p role="alert">Не удалось прочитать или сохранить попытку. Если её открыли в другой вкладке, обновите страницу.</p>}
        {statisticsWarning && <p role="status">Сохранённые ответы есть в попытке, но статистику пока не удалось записать.</p>}
        {reviewWarning && <p role="status">Последний разбор не удалось прочитать или сохранить. Он может быть недоступен после reload.</p>}
        {savedAttempts.filter(attempt => attempt.session.attemptId !== session?.attemptId).map(attempt => (
          <button key={attempt.session.attemptId} type="button" onClick={() => chooseSavedAttempt(attempt)}
            className="block min-h-11 w-full rounded-xl border border-cyan-500/50 px-4 py-2 text-left text-sm font-semibold text-cyan-800 hover:bg-cyan-500/10 dark:text-cyan-200">
            {attempt.origin === 'backup' ? 'Восстановить попытку из резервной копии'
              : attempt.origin === LEGACY_ACTIVE_ATTEMPT_KEY ? 'Продолжить попытку предыдущей версии' : 'Продолжить попытку текущей версии'}
            {' · '}{examLevels[attempt.session.difficulty ?? 'mixed'].title} · вопрос {attempt.session.currentIndex + 1} из {attempt.session.questions.length}
          </button>
        ))}
        {availableReview && <button type="button" onClick={() => setReviewSession(availableReview)} className="mx-auto block min-h-11 max-w-full rounded-xl border border-cyan-500/50 px-4 py-2 text-center text-sm font-semibold text-cyan-800 dark:text-cyan-200 hover:bg-cyan-500/10 cursor-pointer">Посмотреть разбор последней попытки</button>}
        <fieldset aria-labelledby="exam-level-title" className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 space-y-3">
          <div id="exam-level-title" className="sr-only text-sm font-bold text-cyan-400 sm:not-sr-only">Выбери свой уровень</div>
          <label className="relative flex min-h-12 items-center justify-between gap-3 rounded-xl border border-cyan-500 px-3 py-2 focus-within:ring-2 focus-within:ring-cyan-500 sm:hidden">
            <span className="text-sm font-bold text-cyan-400">Выбери свой уровень</span>
            <span aria-hidden="true" className="flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-white">
              {examLevels[selectedDifficulty].title}
              <ChevronDown className="h-4 w-4 shrink-0" />
            </span>
            <select
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              value={selectedDifficulty}
              onChange={event => selectDifficulty(event.currentTarget.value as ExamDifficulty)}
            >
              {EXAM_DIFFICULTIES.map(level => <option key={level} value={level}>{examLevels[level].title}</option>)}
            </select>
          </label>
          <div className="hidden gap-2 sm:grid sm:grid-cols-4">
            {EXAM_DIFFICULTIES.map(level => (
              <button key={level} type="button" aria-pressed={selectedDifficulty === level}
                onClick={() => selectDifficulty(level)}
                className={`min-w-0 rounded-xl border p-3 text-left text-sm transition-colors ${selectedDifficulty === level ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40' : 'border-slate-200 dark:border-slate-700'}`}>
                <span className="block font-bold text-slate-900 dark:text-white">{examLevels[level].title}</span>
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{examLevels[level].description}</span>
              </button>
            ))}
          </div>
          <QuestionCountDropdown value={questionCount} onChange={setQuestionCount} />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Доступно по выбранной теме: {availableCount}.
            {availableCount < questionCount && ` Будет ${availableCount} из запрошенных ${questionCount}; другой уровень не добавляется.`}
          </p>
          {session && !session.isCompleted && <p className="text-xs text-slate-500 dark:text-slate-400">
            {session.trialDeadline === undefined
              ? `Текущая попытка: ${examLevels[session.difficulty ?? 'mixed'].title}, ${session.questions.length} вопр. Настройки выше относятся к новому тесту.`
              : `Пробный экзамен в процессе · осталось ${clock}. Таймер продолжает идти в меню.`}
          </p>}
        </fieldset>
        <button type="button" onClick={() => setShowTrialOptions(true)} className="flex w-full items-center gap-3 rounded-xl border border-cyan-500/35 bg-cyan-50/50 px-4 py-3 text-left hover:bg-cyan-100/70 dark:bg-cyan-950/25 dark:hover:bg-cyan-950/50">
          <Timer className="h-5 w-5 shrink-0 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
          <span>
            <span className="block text-sm font-bold text-slate-900 dark:text-white">Пробный экзамен</span>
            <span className="mt-1 block text-xs text-slate-600 dark:text-slate-300">{TRIAL_QUESTION_COUNT} вопросов · {TRIAL_MINUTES} минут · ответы в конце</span>
          </span>
        </button>
        {showTrialOptions && (
          <dialog ref={trialOptionsRef} onClose={() => setShowTrialOptions(false)} aria-labelledby="trial-options-title"
            className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-cyan-500/35 bg-white p-4 text-slate-900 backdrop:bg-slate-950/75 dark:bg-slate-900 dark:text-slate-100 sm:p-6">
            <h2 id="trial-options-title" className="text-lg font-bold">Сложность пробного экзамена</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{TRIAL_QUESTION_COUNT} вопросов · {TRIAL_MINUTES} минут · ответы в конце</p>
            <div className="mt-4 grid gap-2">
              {TRIAL_DIFFICULTIES.map(difficulty => (
                <button key={difficulty} type="button"
                  onClick={() => { setShowTrialOptions(false); startTrial(difficulty); }}
                  className="min-h-12 rounded-xl border border-slate-200 px-3 py-2 text-left hover:border-cyan-500 dark:border-slate-700 dark:hover:border-cyan-400">
                  <span className="block font-bold">{TRIAL_EXAM_OPTIONS[difficulty].title}</span>
                  <span className="block text-xs text-slate-600 dark:text-slate-300">{TRIAL_EXAM_OPTIONS[difficulty].description}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => trialOptionsRef.current?.close()}
              className="mt-3 min-h-11 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Отмена</button>
          </dialog>
        )}
        {startNotice && <p role="status" className="text-sm text-slate-500 dark:text-slate-400">{startNotice}</p>}
        <KnowledgeRadar mistakesCount={eligibleMistakes.length} totalQuestionsCount={ALL_QUESTIONS.length} hasActiveSession={Boolean(session && !session.isCompleted)} onStartNewExam={() => startNewQuiz()} onStartExam={(levelFilter) => {
          if (!levelFilter && sessionRef.current && !sessionRef.current.isCompleted) { setShowParameters(false); return; }
          if (levelFilter) {
            const mode = QUIZ_MODES.find(item => item.id === levelFilter)?.id;
            if (mode) startNewQuiz(ALL_QUESTIONS.filter(q => q.group === levelFilter), 10, mode);
          } else { startNewQuiz(); }
        }} onReviewMistakes={() => {
          const pool = getTestingEligibleQuestions(getMistakeQuestions(), selectedDifficulty);
          if (!pool.length) { setEmptyMistakes(true); return; }
          startNewQuiz(pool, 5);
        }} onOpenVisualL1={() => {
          setSelectedMode('visual-l1');
          startNewQuiz(ALL_QUESTIONS.filter(q => q.group === 'visual-l1'), questionCount, 'visual-l1');
        }} />
        {emptyMistakes && <p role="status" className="text-sm text-slate-500">Ошибок на повторение нет. Новые ошибки появятся здесь; для освоения нужны два верных ответа подряд.</p>}
        <HomeOsiStack />
        <div ref={parametersRef} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2"><Layers className="w-4 h-4 text-cyan-500" />Параметры тестирования</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {primaryModes.map((mode) => (
                <button key={mode.id} type="button" onClick={() => setSelectedMode(mode.id)} className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${selectedMode === mode.id ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40' : 'border-slate-200 dark:border-slate-800 hover:border-cyan-400/50'}`}>
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">{mode.id === 'mixed' ? 'Все темы' : mode.title}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{mode.subtitle}</div>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">{getTestingPool(mode.id, selectedDifficulty).length} вопр.</div>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setMoreModesOpen((v) => !v)} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 text-left hover:border-cyan-400/40 transition-colors">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {moreModesOpen ? 'Скрыть остальные режимы' : 'Ещё режимы'}
                <span className="ml-1.5 font-mono font-normal text-slate-400">· {moreModes.length}</span>
                {selectedInMore && !moreModesOpen && (<span className="ml-2 text-[10px] font-mono text-cyan-600 dark:text-cyan-400">выбран: {QUIZ_MODES.find((m) => m.id === selectedMode)?.title}</span>)}
              </span>
              {moreModesOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
            </button>
            {moreModesOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {moreModes.map((mode) => (
                  <button key={mode.id} type="button" onClick={() => setSelectedMode(mode.id)} className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${selectedMode === mode.id ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40' : 'border-slate-200 dark:border-slate-800 hover:border-cyan-400/50'}`}>
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">{mode.id === 'mixed' ? 'Все темы' : mode.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{mode.subtitle}</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">{getTestingPool(mode.id, selectedDifficulty).length} вопр.</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">Режим:<select value={feedbackMode} onChange={(e) => setFeedbackMode(e.target.value as 'instant' | 'exam')} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs"><option value="instant">Мгновенный разбор</option><option value="exam">Разбор в конце</option></select></label>
            <button type="button" onClick={() => startNewQuiz()} className="ml-auto px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold cursor-pointer">Начать тестирование</button>
          </div>
        </div>
        {replacementDialog}
      </div>
    );
  }

  if (session.isCompleted) {
    return <div className="space-y-3">{statisticsWarning && <p role="status">Сохранённые ответы есть в попытке, но статистику пока не удалось записать.</p>}{reviewWarning && <p role="status">Разбор доступен сейчас, но его сохранение не удалось.</p>}<ExamReview {...navigation} key={session.attemptId || session.startTime} session={session} onExit={handleExit} onLearning={onNavigateToLearning} onRetry={() => retryAttempt(session)} />{replacementDialog}</div>;
  }

  const progress = ((session.currentIndex + 1) / session.questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-20">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {session.trialDeadline === undefined ? `Уровень: ${examLevels[session.difficulty ?? 'mixed'].title}` : session.trialDifficulty ? `Пробный экзамен · ${TRIAL_EXAM_OPTIONS[session.trialDifficulty].title}` : 'Пробный экзамен'}
        {session.requestedCount && session.questions.length < session.requestedCount
          ? ` · Доступно ${session.questions.length} из запрошенных ${session.requestedCount}; попытка содержит ${session.questions.length} билетов.`
          : ''}
      </p>
      {sessionWarning && <p role="alert">Не удалось сохранить попытку. Если её открыли в другой вкладке, обновите страницу.</p>}
      {(statisticsWarning || progressStatus.storageWarning) && <p role="status">Статистику пока не удалось сохранить. Сохранённые ответы остаются в попытке.</p>}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <button type="button" onClick={handleExit} className="hover:text-cyan-500 cursor-pointer">Выйти в меню</button>
        {availableReview && session.trialDeadline === undefined && <button type="button" onClick={() => setReviewSession(availableReview)} className="px-2 py-2 underline">Последний разбор</button>}
        {session.trialDeadline !== undefined && <span role="timer" aria-label="Осталось времени" className={`rounded-lg px-2 py-1 font-mono text-sm font-bold tabular-nums ${remainingSeconds <= 60 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' : 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200'}`}>{clock}</span>}
        <span className="font-mono">Вопрос {session.currentIndex + 1} из {session.questions.length}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-cyan-500 transition-all" style={{ width: `${progress}%` }} /></div>
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">{currentQuestion.topic}</span>
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 font-mono">{isMultiSelect ? '✦ Выберите все подходящие ответы' : '✦ Выберите один правильный ответ'}</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">{currentQuestion.text}</h2>
        {currentQuestion.image && (<ZoomableImage src={resolveImageUrl(currentQuestion.image)} alt={currentQuestion.imageAlt || 'Фото оборудования к вопросу'} caption={currentQuestion.imageAlt} />)}
        <div className="space-y-2.5">
          {currentQuestion.answers.map((answerText, ansIdx) => {
            const isSelected = selectedAnswers.includes(ansIdx);
            const isCorrect = currentQuestion.correct.includes(ansIdx);
            let itemClass = 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-cyan-400 text-slate-800 dark:text-slate-200';
            if (isAnswerSubmitted && session.feedbackMode === 'instant') {
              if (isCorrect) itemClass = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-medium shadow-md shadow-emerald-500/10';
              else if (isSelected && !isCorrect) itemClass = 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200';
            } else if (isSelected) itemClass = 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-500 text-cyan-900 dark:text-cyan-100';
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            return (
              <button key={ansIdx} type="button" onClick={() => handleSelectAnswer(ansIdx)} className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all text-sm cursor-pointer flex items-start gap-3 ${itemClass}`}>
                <span className="font-mono text-xs font-bold opacity-70 mt-0.5">{letters[ansIdx]}</span>
                <span className="flex-1">{answerText}</span>
                {isAnswerSubmitted && session.feedbackMode === 'instant' && isCorrect && (<CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />)}
                {isAnswerSubmitted && session.feedbackMode === 'instant' && isSelected && !isCorrect && (<XCircle className="w-4 h-4 text-rose-500 shrink-0" />)}
              </button>
            );
          })}
        </div>
        {isAnswerSubmitted && session.feedbackMode === 'instant' && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300"><EngineeringReview key={currentQuestion.id} question={currentQuestion} {...navigation} /></div>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          {!isAnswerSubmitted ? (
            <button type="button" onClick={handleSubmitAnswer} disabled={selectedAnswers.length === 0} className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-sm cursor-pointer">Подтвердить</button>
          ) : (
            <button type="button" onClick={handleNext} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold text-sm cursor-pointer flex items-center gap-2">
              <span>{session.currentIndex + 1 >= session.questions.length ? 'Завершить' : 'Следующий вопрос'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {replacementDialog}
    </div>
  );
};
