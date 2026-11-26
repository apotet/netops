import { GROUP5_PATCHES, GROUP5_LINKS, GROUP5_BATCHES, GROUP5_SECTIONS, GROUP5_TERMS } from './group5';
import { SPECIFIC_PRACTICAL_TIPS } from './specificPracticalTips';
import { IN_DEPTH_REVIEWED_TERMS } from './reviewedTerms';
import { PREVIOUS_IN_DEPTH_QUESTIONS } from './previousQuestions';
import type { Question } from '../../types/quiz';
import { IN_DEPTH_SHARED_TERMS } from './sharedTerms';
import type { QuestionDeepDive } from '../questionExplanations';
import type { Lesson } from '../lessons/types';
import type { InDepthExplanationPatch, InDepthLessonPatch, InDepthTermPatch } from './types';
import { GROUP1_PATCHES, GROUP1_LINKS, GROUP1_SECTIONS, GROUP1_LESSON_PATCHES, GROUP1_TERMS, GROUP1_BATCHES } from './group1';
import { GROUP2_PATCHES, GROUP2_LINKS, GROUP2_SECTIONS, GROUP2_LESSON_PATCHES, GROUP2_TERMS, GROUP2_BATCHES } from './group2';
import { GROUP3_PATCHES, GROUP3_LINKS, GROUP3_SECTIONS, GROUP3_LESSON_PATCHES, GROUP3_TERMS, GROUP3_BATCHES } from './group3';
import { GROUP4_PATCHES, GROUP4_LINKS, GROUP4_SECTIONS, GROUP4_LESSON_PATCHES, GROUP4_TERMS, GROUP4_BATCHES } from './group4';

function mergeExact<T>(...maps: Record<string, T>[]): Record<string, T> {
  const result: Record<string, T> = {};
  for (const map of maps) for (const [id, value] of Object.entries(map)) {
    if (Object.hasOwn(result, id) && JSON.stringify(result[id]) !== JSON.stringify(value)) throw new Error(`Conflicting reviewed L2 data: ${id}`);
    result[id] = value;
  }
  return result;
}
export const IN_DEPTH_PATCHES = mergeExact<InDepthExplanationPatch>(GROUP1_PATCHES, GROUP2_PATCHES, GROUP3_PATCHES, GROUP4_PATCHES, GROUP5_PATCHES);
export const IN_DEPTH_LESSON_LINKS = mergeExact<string>(GROUP1_LINKS, GROUP2_LINKS, GROUP3_LINKS, GROUP4_LINKS, GROUP5_LINKS);
export const IN_DEPTH_SECTIONS = [...GROUP1_SECTIONS, ...GROUP2_SECTIONS, ...GROUP3_SECTIONS, ...GROUP4_SECTIONS, ...GROUP5_SECTIONS];
export const IN_DEPTH_TERMS = mergeExact<InDepthTermPatch>(GROUP1_TERMS, GROUP2_TERMS, GROUP3_TERMS, GROUP4_TERMS, GROUP5_TERMS, IN_DEPTH_SHARED_TERMS, IN_DEPTH_REVIEWED_TERMS);
export const IN_DEPTH_BATCHES = [...GROUP1_BATCHES, ...GROUP2_BATCHES, ...GROUP3_BATCHES, ...GROUP4_BATCHES, ...GROUP5_BATCHES];
export const IN_DEPTH_IDS = IN_DEPTH_BATCHES.flatMap(batch => batch.questionIds);
const scope = new Set(IN_DEPTH_IDS);

// Different topical batches may repair different blocks of the same shared lesson.
const lessonPatches: Record<string, InDepthLessonPatch> = {};
for (const map of [GROUP1_LESSON_PATCHES, GROUP2_LESSON_PATCHES, GROUP3_LESSON_PATCHES, GROUP4_LESSON_PATCHES]) {
  for (const [id, patch] of Object.entries(map) as [string, InDepthLessonPatch][]) {
    const previous = lessonPatches[id] ?? {};
    for (const field of ['professional', 'plainSummary', 'professionalSummary'] as const) {
      if (previous[field] !== undefined && patch[field] !== undefined && JSON.stringify(previous[field]) !== JSON.stringify(patch[field])) throw new Error(`Conflicting L2 lesson field ${id}/${field}`);
    }
    lessonPatches[id] = { ...previous, ...patch,
      plainBlocks: mergeExact(previous.plainBlocks ?? {}, patch.plainBlocks ?? {}),
      professionalBlocks: mergeExact(previous.professionalBlocks ?? {}, patch.professionalBlocks ?? {}),
      terms: [...new Set([...(previous.terms ?? []), ...(patch.terms ?? [])])],
      professionalTerms: [...new Set([...(previous.professionalTerms ?? []), ...(patch.professionalTerms ?? [])])],
    };
  }
}
export const IN_DEPTH_LESSON_PATCHES = lessonPatches;

export function applyInDepthExplanation(id: string, original: QuestionDeepDive, question?: Question): QuestionDeepDive {
  if (!scope.has(id)) return original;
  const patch = IN_DEPTH_PATCHES[id] ?? {};
  const brief = patch.brief ?? original.briefAnswer;
  const trap = patch.trap ?? original.commonTrap;
  const professional = patch.pro !== undefined ? {
    ...original.professional, brief, deep: patch.pro, trap,
    // A newly authored layer must not inherit another text's historical provenance.
    sourceCommit: undefined,
  } : original.professional ? { ...original.professional, ...(patch.brief !== undefined ? {brief} : {}), ...(patch.trap !== undefined ? {trap} : {}), ...((patch.brief !== undefined || patch.trap !== undefined) ? {sourceCommit: undefined} : {}) } : undefined;
  const result: QuestionDeepDive = { ...original, briefAnswer: brief, commonTrap: trap, professional,
    ...(patch.plain !== undefined ? { deepAnalysis: patch.plain, plain: patch.plain, engineeringDeep: patch.plain, hasIndividualDeep: true } : {}),
    ...(patch.pro !== undefined ? { pro: patch.pro } : {}),
    ...(patch.practicalTip !== undefined ? { practicalTip: patch.practicalTip } : SPECIFIC_PRACTICAL_TIPS[id] !== undefined ? { practicalTip: SPECIFIC_PRACTICAL_TIPS[id] } : {}),
    ...(patch.practiceLink !== undefined ? { practiceLink: patch.practiceLink ?? undefined } : {}),
    ...(patch.visualDiagram !== undefined ? { visualDiagram: patch.visualDiagram ?? undefined } : {}),
    ...(patch.nextStudy !== undefined ? { nextStudy: patch.nextStudy ?? undefined,
      professional: professional ? { ...professional,
      sourceCommit: undefined, next: patch.nextStudy ?? undefined } : undefined } : {}),
    glossaryInProfessional: true,
  };
  if (id === 'wifi-std-04' && question?.answers.includes(PREVIOUS_IN_DEPTH_QUESTIONS[id].answers[3])) {
    const notice = 'Сохранены прежняя формулировка ответа и историческая оценка. Уточнение: Wi-Fi 6E добавляет 6 ГГц; 802.11be развивает возможности, а отсутствие помех не гарантируется.';
    return { ...result, briefAnswer: `${notice} ${result.briefAnswer}`, professional: result.professional ? { ...result.professional, notice } : undefined };
  }
  return result;
}

export function applyInDepthLesson(lesson: Lesson): Lesson {
  const patch = IN_DEPTH_LESSON_PATCHES[lesson.id];
  if (!patch) return lesson;
  const professional = patch.professional ?? lesson.professional;
  for (const [mode, replacements, blocks] of [
    ['plain', patch.plainBlocks, lesson.blocks],
    ['professional', patch.professionalBlocks, professional?.blocks],
  ] as const) for (const heading of Object.keys(replacements ?? {})) {
    if (!blocks?.some(block => block.heading === heading)) throw new Error(`Missing reviewed L2 heading ${lesson.id}/${mode}/${heading}`);
  }
  const professionalEdited = patch.professional !== undefined || patch.professionalSummary !== undefined || Object.keys(patch.professionalBlocks ?? {}).length > 0 || Boolean(patch.professionalTerms?.length);
  return { ...lesson,
    summary: patch.plainSummary ?? lesson.summary,
    terms: [...new Set([...lesson.terms, ...(patch.terms ?? [])])],
    blocks: lesson.blocks.map(block => patch.plainBlocks?.[block.heading] !== undefined ? { ...block, body: patch.plainBlocks[block.heading] } : block),
    professional: professional ? { ...professional,
      sourceCommit: professionalEdited ? undefined : professional.sourceCommit,
      summary: patch.professionalSummary ?? professional.summary,
      terms: [...new Set([...professional.terms, ...(patch.professionalTerms ?? [])])],
      blocks: professional.blocks.map(block => patch.professionalBlocks?.[block.heading] !== undefined ? { ...block, body: patch.professionalBlocks[block.heading] } : block),
    } : undefined,
  };
}
