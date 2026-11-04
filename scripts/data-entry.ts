/** Data-only entry: same composition as questionsData (no UI). */
import rawQuestions from '../src/data/questions.json';
import { EXTRA_QUESTIONS } from '../src/data/questionsExtra';
import { EXTRA_DIFFICULTY_QUESTIONS } from '../src/data/questionsExtraDifficulty';
import type { Question } from '../src/types/quiz';

export const ALL_QUESTIONS: Question[] = [
  ...(rawQuestions as Question[]),
  ...EXTRA_QUESTIONS,
  ...EXTRA_DIFFICULTY_QUESTIONS,
];
