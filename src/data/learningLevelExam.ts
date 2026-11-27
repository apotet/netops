import type { ExamDifficulty, Question, QuizModeId, QuizSession, TrialDifficulty } from '../types/quiz';
import { LEARNING_LEVELS, isLearningLevel, type LearningLevel } from '../types/learningLevel';
import { ALL_QUESTIONS, filterExamDifficulty, getExamPool, getRandomQuestions } from './questionsData';
import { getLearningLevelMetadata, getLearningLevelStatistics } from './learningLevels';
import { hasBasePhotoPlan, selectBaseQuestionsWithPhotoPlan, selectFamilyQuestions } from './beginnerExam';

export const LEARNING_LEVEL_REVIEW_COUNT = getLearningLevelStatistics().reviewIds.length;

/** REVIEW has no assigned level. Unknown IDs fail explicitly in the registry lookup. */
export function filterLearningLevel(questions: readonly Question[], level: LearningLevel): Question[] {
  if (!isLearningLevel(level)) throw new RangeError('Unknown learning level');
  return questions.filter(question => {
    const metadata = getLearningLevelMetadata(question.id);
    return metadata.status === 'ASSIGNED' && metadata.learningLevel === level;
  });
}

export function getLearningLevelPool(mode: QuizModeId, level: LearningLevel): Question[] {
  return filterLearningLevel(ALL_QUESTIONS.filter(q => mode === 'mixed' || q.group === mode), level);
}

/** Custom topics/mistakes are closed pools: never top up from the rest of the bank. */
export function getLearningLevelQuestions(
  mode: QuizModeId, count: number, random: () => number, level: LearningLevel,
  customQuestions?: readonly Question[],
): Question[] {
  const pool = customQuestions ? filterLearningLevel(customQuestions, level) : getLearningLevelPool(mode, level);
  return selectFamilyQuestions(pool, count, random);
}

const BASIC_TRIAL_COUNT = 20;

export const TRIAL_EXAM_OPTIONS: Record<TrialDifficulty, {
  title: string;
  description: string;
  quotas: readonly (readonly [level: LearningLevel, count: number])[];
}> = {
  basic: { title: 'Базовый', description: '20 вопросов на основы', quotas: [[1, BASIC_TRIAL_COUNT]] },
  advanced: { title: 'Продвинутый', description: '10 на понимание и 10 на применение', quotas: [[2, 10], [3, 10]] },
  mixed: { title: 'Смешанный', description: '6 на основы, 7 на понимание и 7 на применение', quotas: [[1, 6], [2, 7], [3, 7]] },
};

export function getTrialExamQuestions(difficulty: TrialDifficulty, random = Math.random): Question[] {
  if (difficulty === 'basic') {
    return selectBaseQuestionsWithPhotoPlan(getLearningLevelPool('mixed', 1), BASIC_TRIAL_COUNT, random);
  }
  const questions = TRIAL_EXAM_OPTIONS[difficulty].quotas.flatMap(([level, count]) =>
    getLearningLevelQuestions('mixed', count, random, level));
  return selectFamilyQuestions(questions, questions.length, random);
}

const FOUNDATION_LEVEL = 1;
const UNDERSTANDING_LEVEL = 2;

/** The visible Base/Foundations card uses the approved L1 registry, not legacy beginner. */
export function getTestingPool(mode: QuizModeId, difficulty: ExamDifficulty): Question[] {
  if (difficulty === 'beginner') return getLearningLevelPool(mode, FOUNDATION_LEVEL);
  if (difficulty === 'in-depth') return getLearningLevelPool(mode, UNDERSTANDING_LEVEL);
  return getExamPool(mode, difficulty);
}

/** Eligibility for closed custom pools, including the "work on mistakes" count and action. */
export function getTestingEligibleQuestions(questions: readonly Question[], difficulty: ExamDifficulty): Question[] {
  if (difficulty === 'beginner') return filterLearningLevel(questions, FOUNDATION_LEVEL);
  if (difficulty === 'in-depth') return filterLearningLevel(questions, UNDERSTANDING_LEVEL);
  return filterExamDifficulty(questions, difficulty);
}

export function getTestingQuestions(
  mode: QuizModeId, count: number, random: () => number, difficulty: ExamDifficulty,
  customQuestions?: readonly Question[],
): Question[] {
  if (difficulty === 'beginner' && mode !== 'visual-l1' && hasBasePhotoPlan(count)) {
    const eligible = customQuestions ? getTestingEligibleQuestions(customQuestions, difficulty) : getTestingPool(mode, difficulty);
    return selectBaseQuestionsWithPhotoPlan(eligible, count, random);
  }
  if (customQuestions) {
    const eligible = getTestingEligibleQuestions(customQuestions, difficulty);
    return difficulty === 'beginner' || difficulty === 'in-depth'
      ? selectFamilyQuestions(eligible, count, random)
      : eligible.slice(0, count);
  }
  // New Base attempts strictly use L1, including closed custom/mistake pools.
  // The L1 sampler retains the existing photo and distinct-family guarantees.
  if (difficulty === 'beginner') {
    return getLearningLevelQuestions(mode, count, random, FOUNDATION_LEVEL, customQuestions);
  }
  if (difficulty === 'in-depth') {
    return getLearningLevelQuestions(mode, count, random, UNDERSTANDING_LEVEL, customQuestions);
  }
  return getRandomQuestions(mode, count, random, difficulty);
}

export function getExamLevelLabel(session: Pick<QuizSession, 'learningLevel' | 'difficulty'>): string {
  if (isLearningLevel(session.learningLevel)) return LEARNING_LEVELS[session.learningLevel].ru;
  return session.difficulty === 'beginner' ? 'База (старый режим)' : 'Смешанный (старый режим)';
}

export const LEARNING_LEVEL_DESCRIPTIONS: Record<LearningLevel, string> = {
  1: 'Термины, базовые понятия и назначение оборудования',
  2: 'Принципы работы сетей, причины и следствия',
  3: 'Настройка, расчёты и выбор практических действий',
  4: 'Поиск неисправностей и анализ результатов команд',
  5: 'Многошаговые инженерные кейсы и обоснование решений',
};
