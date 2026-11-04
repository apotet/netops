/**
 * Entry for Node validation: mirrors questionsData composition without React/Vite UI.
 */
import rawQuestions from '../src/data/questions.json';
import { EXTRA_QUESTIONS } from '../src/data/questionsExtra';
import { EXTRA_DIFFICULTY_QUESTIONS } from '../src/data/questionsExtraDifficulty';
import { getQuestionDeepDive } from '../src/data/questionExplanations';
import type { Question } from '../src/types/quiz';

export const ALL_QUESTIONS: Question[] = [
  ...(rawQuestions as Question[]),
  ...EXTRA_QUESTIONS,
  ...EXTRA_DIFFICULTY_QUESTIONS,
];

export function buildCoverageRows() {
  return ALL_QUESTIONS.map((q) => {
    const d = getQuestionDeepDive(q);
    const eng = d.engineeringDeep || d.deepAnalysis || '';
    return {
      id: q.id,
      group: q.group,
      topic: q.topic,
      difficulty: q.difficulty || 'unset',
      hasIndividualDeep: d.hasIndividualDeep,
      briefLen: (d.briefAnswer || '').length,
      engLen: eng.length,
      hasBrief: Boolean(d.briefAnswer && d.briefAnswer.length > 10),
      hasEngineering: eng.length > 40,
      hasNextStudy: Boolean(d.nextStudy),
      hasIpv4Link: Boolean(d.ipv4Practice?.enabled),
      correctCount: q.correct?.length ?? 0,
      answersCount: q.answers?.length ?? 0,
    };
  });
}

export { getQuestionDeepDive };
