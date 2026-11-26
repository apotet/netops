import { EngineeringReview, type ExplanationNavigation } from './EngineeringReview';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, CheckCircle2, ChevronDown, Circle, Diamond, Info, XCircle } from 'lucide-react';
import type { ProgressSession } from '../utils/examProgress';
import { filteredReview, reviewTotals, type ReviewFilter } from '../utils/examReview';
import { TRIAL_EXAM_OPTIONS } from '../data/learningLevelExam';
import { resolveImageUrl } from '../data/questionsData';
import { ZoomableImage } from './ZoomableImage';
import { getOrAssignMemeTitle } from '../data/memeTitles';
import './ExamReview.css';

interface Props extends ExplanationNavigation {
  session: ProgressSession;
  onExit: () => void;
  onRetry?: () => void;
  onLearning?: () => void;
}

function readView(key: string, preferred: ReviewFilter = 'all'): { filter: ReviewFilter; open: string[] } {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const value = JSON.parse(raw);
      if (value && ['all', 'wrong', 'correct'].includes(value.filter) &&
        Array.isArray(value.open) && value.open.every((id: unknown) => typeof id === 'string')) return value;
    }
  } catch { /* Review remains usable when browser storage is unavailable. */ }
  return { filter: preferred, open: [] };
}

function scoreLabel(percent: number): { text: string; tone: string } {
  if (percent >= 95) return { text: 'Мастер', tone: 'master' };
  if (percent >= 85) return { text: 'Отлично', tone: 'excellent' };
  if (percent >= 70) return { text: 'Хорошо', tone: 'good' };
  if (percent >= 50) return { text: 'Нормально', tone: 'ok' };
  if (percent >= 40) return { text: 'Ниже среднего', tone: 'low' };
  return { text: 'Слабо', tone: 'weak' };
}

export function ExamReview({ session, onExit, onRetry, onLearning, ...navigation }: Props) {
  const viewKey = `osi_review_view:${session.attemptId || session.startTime}`;
  const totals = session.isCompleted ? reviewTotals(session) : { total: 0, correct: 0, wrong: 0, unanswered: 0, percentage: 0 };
  const preferred: ReviewFilter = totals.wrong > 0 ? 'wrong' : 'all';
  const [view, setView] = useState(() => readView(viewKey, preferred));
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    try { sessionStorage.setItem(viewKey, JSON.stringify(view)); } catch { /* Optional UI preference. */ }
  }, [view, viewKey]);
  if (!session.isCompleted) return null;
  const grade = scoreLabel(totals.percentage);
  const meme = session.trialDeadline === undefined
    ? getOrAssignMemeTitle(session.attemptId || String(session.startTime), totals.percentage)
    : null;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference - (totals.percentage / 100) * circumference;
  const rows = filteredReview(session, view.filter);
  const labels = { correct: 'Верно', wrong: 'Ошибка', unanswered: 'Без подтверждённого ответа' };
  const startedAt = Number.isFinite(new Date(session.startTime).getTime()) && session.startTime > 0 ? new Date(session.startTime) : null;
  const filters = [
    { id: 'all', label: 'Все', count: totals.total },
    { id: 'wrong', label: 'Ошибки', count: totals.wrong },
    { id: 'correct', label: 'Верные', count: totals.correct },
  ] as const;

  const openReview = () => {
    const filter = totals.wrong ? 'wrong' : 'all';
    const candidates = filteredReview(session, filter);
    const first = candidates.find(row => row.status === 'unanswered') || candidates[0];
    setView({ filter, open: first ? [first.question.id] : [] });
    reviewHeading.current?.focus({ preventScroll: true });
    reviewHeading.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };

  return (
    <section aria-label="Разбор завершённого экзамена" className="exam-review">
      <header className="review-overview">
        <h2 className="text-2xl sm:text-3xl font-sans font-bold">{session.trialDeadline === undefined ? 'Итоги экзамена' : 'Итоги пробного экзамена'}</h2>
        {session.trialDifficulty && <p className="text-sm text-slate-600 dark:text-slate-300">{TRIAL_EXAM_OPTIONS[session.trialDifficulty].title}</p>}
        {session.trialDeadline !== undefined && session.endTime === session.trialDeadline && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Время вышло. Учтены подтверждённые ответы.</p>
        )}
        <div className="review-overview-body">
          <div className="review-score-wrap">
            <div className="review-score-ring" aria-hidden="true">
              <svg viewBox="0 0 96 96">
                <circle cx="48" cy="48" r={radius} className="review-score-track" />
                <circle cx="48" cy="48" r={radius} className={`review-score-value review-score-value-${grade.tone}`} strokeDasharray={circumference} strokeDashoffset={dash} />
              </svg>
              <p className="review-score" aria-label={`Результат: ${totals.percentage} процентов`}>{totals.percentage}<span>%</span></p>
            </div>
            {meme && (
              <>
                <span className={`review-grade review-grade-${grade.tone}`}>{grade.text}</span>
                <div className="review-meme" title={meme.setName}>
                  <strong>{meme.title}</strong>
                  <span>{meme.comment}</span>
                </div>
              </>
            )}
          </div>
          <ul className="review-totals" aria-label="Результат попытки">
            <li><CheckCircle2 aria-hidden="true" /><strong>{totals.correct} из {totals.total} верно</strong></li>
            <li><XCircle aria-hidden="true" />Ошибки: {totals.wrong}</li>
            <li><Circle aria-hidden="true" />Без ответа: {totals.unanswered}</li>
          </ul>
          <div className="review-attempt">
            <CalendarDays aria-hidden="true" />
            <div><strong>Последняя попытка</strong>{startedAt && <time dateTime={startedAt.toISOString()} title="Время начала попытки">{startedAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</time>}</div>
          </div>
          <div className="review-actions">
            <button type="button" onClick={openReview} className="review-button review-button-primary">
              {totals.wrong ? 'Разобрать ошибки' : totals.unanswered ? 'Разобрать без ответа' : 'Посмотреть ответы'}
            </button>
            <button type="button" onClick={onLearning || onExit} className="review-button">К обучению</button>
            <button type="button" onClick={onExit} className="review-button">Вернуться к тестам</button>
            {onRetry && <button type="button" onClick={onRetry} className="review-button">{session.trialDeadline === undefined ? 'Новый тест' : 'Повторить пробный экзамен'}</button>}
          </div>
        </div>
      </header>

      <div className="review-list-heading">
        <h3 ref={reviewHeading} tabIndex={-1}>Разбор по вопросам</h3>
        <p role="status">Показано {rows.length} из {totals.total}</p>
      </div>
      <div role="group" aria-label="Фильтр разбора" className="review-filters">
        {filters.map(item => (
          <button key={item.id} type="button" aria-pressed={view.filter === item.id}
            onClick={() => setView(current => ({ ...current, filter: item.id }))}>
            {item.label}<span>{item.count}</span>
          </button>
        ))}
      </div>
      {totals.unanswered > 0 && <p className="review-hint">Вопросы без подтверждённого ответа: {totals.unanswered}. Они доступны в фильтре «Все».</p>}

      <div className="review-question-list">
        {rows.map(row => (
          <details key={row.question.id} open={view.open.includes(row.question.id)}
            onToggle={event => {
              const open = event.currentTarget.open;
              setView(current => {
                if (current.open.includes(row.question.id) === open) return current;
                return { ...current, open: open ? [...current.open, row.question.id] : current.open.filter(id => id !== row.question.id) };
              });
            }} className={`review-question review-question-${row.status}`}>
            <summary>
              <ChevronDown className="review-chevron" aria-hidden="true" />
              <div className="review-question-title">
                <div className="review-question-meta">
                  <span>Вопрос {row.index + 1}</span><span className={`review-status review-status-${row.status}`}>{labels[row.status as keyof typeof labels]}</span><span>{row.question.topic}</span>
                </div>
                <span className="review-question-text">{row.question.text}</span>
              </div>
            </summary>
            <div className="review-question-content">
              {row.confirmed && (
                <p className="review-verdict">
                  <span>Твой ответ: {row.chosen.map(i => row.question.answers[i]).join('; ') || '—'}</span>
                  <span className="review-verdict-arrow">→</span>
                  <span>Правильно: {row.question.correct.map(i => row.question.answers[i]).join('; ')}</span>
                </p>
              )}
              {!row.confirmed && <p className="review-draft"><Info aria-hidden="true" />{row.chosen.length ? 'Выбор не был подтверждён и не засчитан.' : 'Ответ не был выбран.'}</p>}
              <div className={`review-answer-layout${row.question.image ? ' review-with-image' : ''}`}>
                {row.question.image && <ZoomableImage src={resolveImageUrl(row.question.image)} alt={row.question.imageAlt || 'Иллюстрация к вопросу'} className="min-w-0" imgClassName="review-photo" />}
                <ul className="review-answers" aria-label={row.question.correct.length > 1 ? 'Варианты: правильных ответов несколько' : 'Варианты ответа'}>
                  {row.question.answers.map((answer, i) => {
                    const chosen = row.chosen.includes(i);
                    const correct = row.question.correct.includes(i);
                    return <li key={i} className={`review-answer${correct ? ' review-answer-correct' : ''}`}>
                      {correct ? <CheckCircle2 className="review-answer-icon" aria-hidden="true" /> : <Circle className="review-answer-icon" aria-hidden="true" />}
                      <span className="review-answer-text"><span className="sr-only">{i + 1}. {correct ? 'Правильный ответ: ' : ''}</span>{answer}</span>
                      {(chosen || correct) && <span className="review-answer-markers">
                        {chosen && <span className="review-marker review-marker-chosen"><Diamond aria-hidden="true" />Ваш выбор{!row.confirmed && <span className="sr-only"> (не подтверждён)</span>}</span>}
                        {correct && <span className="review-marker review-marker-correct"><Check aria-hidden="true" />Правильно</span>}
                      </span>}
                    </li>;
                  })}
                </ul>
              </div>
              <div className="review-explanation">
                <div className="review-explanation-text"><EngineeringReview key={row.question.id} question={row.question} {...navigation} /></div>
              </div>
            </div>
          </details>
        ))}
      </div>
      {!rows.length && <div className="review-empty"><CheckCircle2 aria-hidden="true" /><h4>{view.filter === 'wrong' ? 'Ошибок в этой попытке нет' : 'В этом фильтре вопросов нет'}</h4><button type="button" className="review-button" onClick={() => setView(current => ({ ...current, filter: 'all' }))}>Показать все ответы</button></div>}
      <button type="button" className="review-back" onClick={onExit}><ArrowLeft aria-hidden="true" />Вернуться к тестам</button>
    </section>
  );
}
