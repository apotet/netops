import { BookOpen } from 'lucide-react';
import { getLessonForQuestion } from '../data/lessons';
import { getQuestionDeepDive, type QuestionDeepDive } from '../data/questionExplanations';
import type { PracticeLink } from '../data/practiceLinks';
import type { Question } from '../types/quiz';
import { isPreviousProductionQuestion } from '../utils/examProgress';
import { useStudyTextMode } from '../utils/studyTextMode';
import { getLessonGlossaryScope } from '../utils/lessonGlossaryScope';
import { FormattedExplanation } from './FormattedExplanation';
import { PracticeLinkButton } from './PracticeLinkButton';
import { StudyTextToggle } from './StudyTextToggle';

export interface ExplanationNavigation {
  onOpenLesson?: (lessonId: string, questionId?: string) => void;
  onNavigateToTheory?: (questionId: string) => void;
  onOpenPractice?: (link: PracticeLink) => void;
  onNavigateToIpv4?: (prefix?: number, mode?: 'calc' | 'trainer') => void;
  onNavigateToIpv6?: (mode: NonNullable<QuestionDeepDive['ipv6Practice']>['targetMode']) => void;
}

export function ExplanationPractice({ deep, onOpenPractice, onNavigateToIpv4, onNavigateToIpv6 }:
  ExplanationNavigation & { deep: QuestionDeepDive }) {
  const ipv4 = deep.ipv4Practice;
  const ipv6 = deep.ipv6Practice;
  if (!(deep.practiceLink && onOpenPractice || ipv4?.enabled && onNavigateToIpv4 || ipv6 && onNavigateToIpv6)) return null;
  const buttonClass = 'inline-flex min-h-9 items-center rounded-lg border border-cyan-500/40 px-3 py-2 text-sm font-bold text-cyan-700 dark:text-cyan-300';
  return <div className="flex flex-wrap gap-2">
    <PracticeLinkButton link={deep.practiceLink} onOpenPractice={onOpenPractice} />
    {ipv4?.enabled && onNavigateToIpv4 && <button type="button" className={buttonClass}
      onClick={() => onNavigateToIpv4(ipv4.targetPrefix, ipv4.targetMode)}>Открыть IPv4-тренажёр</button>}
    {ipv6 && onNavigateToIpv6 && <button type="button" className={buttonClass}
      onClick={() => onNavigateToIpv6(ipv6.targetMode)}>Открыть IPv6-тренажёр</button>}
  </div>;
}

/** A real lesson ID and its originating question travel together in every review surface. */
export function ExplanationLesson({ questionId, onOpenLesson }: {
  questionId: string;
  onOpenLesson?: ExplanationNavigation['onOpenLesson'];
}) {
  const lesson = getLessonForQuestion(questionId);
  return lesson ? <button type="button" disabled={!onOpenLesson}
      className="inline-flex min-h-9 flex-wrap items-center gap-x-2 rounded-lg border border-cyan-500/40 px-3 py-2 text-sm font-bold text-cyan-700 dark:text-cyan-300"
      aria-label={`Перейти к уроку: ${lesson.title}`}
      onClick={() => onOpenLesson?.(lesson.id, questionId)}>
      <BookOpen size={16} aria-hidden="true" />
      <span>Перейти к уроку</span><span className="text-xs font-medium">{lesson.title}</span>
    </button> : <p className="text-xs text-slate-500 dark:text-slate-400">Урок по этой теме пока не подготовлен</p>;
}

/** Read-only rendering of the submitted question or saved review snapshot. */
export function EngineeringReview({ question, ...navigation }: ExplanationNavigation & { question: Question }) {
  const [mode, setMode] = useStudyTextMode();
  if (isPreviousProductionQuestion(question)) {
    return <div data-explanation-question-id={question.id} className="min-w-0 max-w-full space-y-3 text-sm">
      <div data-explanation-brief className="space-y-2">
        <h4 className="font-bold">Почему так</h4>
        <FormattedExplanation text={question.explanation} />
        <p className="text-xs text-slate-500 dark:text-slate-400">Пояснение сохранённой версии вопроса</p>
      </div>
    </div>;
  }
  const deep = getQuestionDeepDive(question);
  const glossaryScope = getLessonGlossaryScope(getLessonForQuestion(question.id)?.id);
  const hasProfessional = Boolean(deep.professional?.deep.trim());
  const professional = hasProfessional && mode === 'professional' ? deep.professional : undefined;
  const body = professional?.deep ?? deep.deepAnalysis;
  const canExpand = Boolean(hasProfessional || (deep.hasIndividualDeep || deep.engineeringDeep) && deep.deepAnalysis.trim() !== deep.briefAnswer.trim());
  const missingProfessional = <p className="text-xs text-slate-500 dark:text-slate-400">Профессиональный разбор пока не подготовлен</p>;

  return <div data-explanation-question-id={question.id} className="min-w-0 max-w-full space-y-3 text-sm">
    <div data-explanation-brief className="space-y-2">
      <h4 className="font-bold">Почему так</h4>
      <FormattedExplanation text={deep.briefAnswer} glossaryScope={glossaryScope} />
    </div>
    {canExpand && <details data-explanation-detail className="space-y-2">
      <summary className="cursor-pointer font-bold text-cyan-700 dark:text-cyan-300">Подробный разбор</summary>
      {hasProfessional && deep.deepAnalysis.trim() ? <StudyTextToggle value={mode} onChange={setMode} /> : !hasProfessional && missingProfessional}
      {professional?.notice && <FormattedExplanation text={professional.notice} glossaryScope={glossaryScope} />}
      <FormattedExplanation text={body} glossaryScope={glossaryScope} />
    </details>}
    {!canExpand && !hasProfessional && missingProfessional}
    <ExplanationLesson questionId={question.id} onOpenLesson={navigation.onOpenLesson} />
    <ExplanationPractice deep={deep} {...navigation} />
  </div>;
}
