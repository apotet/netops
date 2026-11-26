import type { PracticeLink } from '../practiceLinks';
import type { Lesson } from '../lessons/types';
export interface InDepthExplanationPatch {
  brief?: string;
  plain?: string;
  pro?: string;
  trap?: string;
  practicalTip?: string;
  practiceLink?: PracticeLink | null;
  visualDiagram?: string | null;
  nextStudy?: string | null;
}
/** Only explicitly reviewed fields change; other authored lesson material is preserved. */
export interface InDepthLessonPatch {
  professional?: Lesson['professional'];
  plainBlocks?: Record<string, string>;
  professionalBlocks?: Record<string, string>;
  plainSummary?: string;
  professionalSummary?: string;
  terms?: string[];
  professionalTerms?: string[];
}
export interface InDepthTermPatch {
  english: string;
  russian: string;
  abbreviation?: boolean;
  description?: string;
  relatesTo?: string;
  lessonId?: string;
}
export interface InDepthBatch {
  id: string;
  title: string;
  questionIds: string[];
}
