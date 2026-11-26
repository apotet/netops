import React, { useState } from 'react';
import type { LessonKnowledgeCheck as LessonKnowledgeCheckData } from '../data/lessons/types';
import { GlossaryText } from './GlossaryText';

/** The post-answer feedback only enables PoE hints for the PoE lesson context. */
export const LessonKnowledgeCheckExplanation: React.FC<{ explanation: string; glossaryScope?: 'poe' | 'ipv6' | 'http' }> =
  ({ explanation, glossaryScope }) => (
    <p className="leading-relaxed">{glossaryScope
      ? <GlossaryText scope={glossaryScope}>{explanation}</GlossaryText>
      : explanation}</p>
  );

/**
 * Four-question reinforcement inside a lesson.
 * This is deliberately not an exam: no saved attempts or global statistics.
 */
export const LessonKnowledgeCheck: React.FC<{ check: LessonKnowledgeCheckData; glossaryScope?: 'poe' | 'ipv6' | 'http' }> = ({ check, glossaryScope }) => {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  if (check.questions.length === 0) return null;

  const question = check.questions[questionIndex];
  const answeredCorrectly = selected === question.correctChoiceId;

  const choose = (choiceId: string) => {
    if (selected !== null || finished) return;
    setSelected(choiceId);
    if (choiceId === question.correctChoiceId) setCorrectCount((count) => count + 1);
  };

  const next = () => {
    if (selected === null) return;
    if (questionIndex === check.questions.length - 1) {
      setFinished(true);
      return;
    }
    setQuestionIndex((index) => index + 1);
    setSelected(null);
  };

  const restart = () => {
    setQuestionIndex(0);
    setCorrectCount(0);
    setSelected(null);
    setFinished(false);
  };

  return (
    <section data-lesson-knowledge-check className="rounded-2xl border border-cyan-400/40 bg-cyan-50/60 p-4 dark:bg-cyan-950/20 dark:border-cyan-400/25 space-y-3" aria-labelledby="lesson-check-heading">
      <h3 id="lesson-check-heading" className="text-base font-bold text-slate-900 dark:text-white">{check.title}</h3>
      {check.intro && <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{check.intro}</p>}
      {finished ? (
        <div className="space-y-3" aria-live="polite">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Результат: {correctCount} из {check.questions.length}</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {correctCount === check.questions.length
              ? 'Все ситуации разобраны верно. Можешь переходить к связанным вопросам.'
              : 'Ошибки здесь — повод ещё раз посмотреть расчёт или разбор, а не штраф к общей статистике.'}
          </p>
          <button type="button" onClick={restart} className="cursor-pointer rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">
            Пройти ещё раз
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium text-cyan-800 dark:text-cyan-200">Вопрос {questionIndex + 1} из {check.questions.length}</p>
          <p className="text-sm font-semibold leading-relaxed text-slate-900 dark:text-white">{question.prompt}</p>
          <div className="grid gap-2" role="group" aria-label={`Варианты ответа: вопрос ${questionIndex + 1}`}>
            {question.choices.map((choice) => {
              const isCorrect = choice.id === question.correctChoiceId;
              const isSelected = choice.id === selected;
              const stateClass = selected === null
                ? 'border-slate-300 dark:border-slate-600 hover:border-cyan-500 hover:bg-cyan-100/60 dark:hover:bg-cyan-950/40'
                : isCorrect
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/35'
                  : isSelected
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/35'
                    : 'border-slate-200 opacity-70 dark:border-slate-700';
              return (
                <button key={choice.id} type="button" disabled={selected !== null}
                  onClick={() => choose(choice.id)} aria-pressed={isSelected}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm leading-relaxed text-slate-800 dark:text-slate-100 ${stateClass} ${selected === null ? 'cursor-pointer' : 'cursor-default'}`}>
                  <span className="mr-2 font-mono text-xs font-semibold">{choice.id}.</span>{choice.label}
                </button>
              );
            })}
          </div>
          {selected !== null && (
            <div aria-live="polite" className="space-y-2 rounded-xl bg-white/70 p-3 text-sm text-slate-800 dark:bg-slate-900/50 dark:text-slate-100">
              <p className={`font-semibold ${answeredCorrectly ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                {answeredCorrectly ? 'Верно' : 'Не совсем'}
              </p>
              <LessonKnowledgeCheckExplanation explanation={question.explanation} glossaryScope={glossaryScope} />
              <button type="button" onClick={next} className="cursor-pointer rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500">
                {questionIndex === check.questions.length - 1 ? 'Посмотреть результат' : 'Следующий вопрос'}
              </button>
            </div>
          )}
        </div>
      )}
      <p className="text-[11px] text-slate-500 dark:text-slate-400">Самопроверка без оценки и записи в статистику тестирования.</p>
    </section>
  );
};
