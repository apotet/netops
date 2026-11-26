import type { PracticeLink } from '../practiceLinks';

export interface LessonIllustration {
  /** Image in the site's public/lesson-images directory. */
  sprite: string;
  /** 3x2 contact sheet coordinates: 0-based column (0-2), row (0-1). */
  column: 0 | 1 | 2;
  row: 0 | 1;
  alt: string;
  caption: string;
  /** Optional dimensions for non-3×2 picture sheets. */
  spriteColumns?: 2 | 3;
  spriteRows?: 1 | 2;
}

export interface LessonCheatsheet {
  file: string;
  title: string;
  alt: string;
  note: string;
}

export interface LessonBlock {
  cheatsheet?: LessonCheatsheet;
  /** Primary visual aids can start expanded; readers may still collapse them. */
  cheatsheetInitiallyOpen?: boolean;
  /** A link-like action that expands a cheatsheet in this same lesson. */
  cheatsheetJump?: { file: string; label: string };
  /** Optional photos can be collapsed when they illustrate a secondary method. */
  imageCollapsible?: boolean;
  imageDisclosureLabel?: string;
  pinout?: 't568';
  image?: LessonIllustration;
  heading: string;
  body: string;
  practiceLink?: PracticeLink;
  relatedLesson?: { id: string; label: string };
}

export interface LessonCommand {
  title: string;
  cmd: string;
  note?: string;
}

/** Optional stand-alone reinforcement: does not alter the main question bank or user scores. */
export interface LessonCheckQuestion {
  id: string;
  prompt: string;
  choices: { id: string; label: string }[];
  correctChoiceId: string;
  explanation: string;
}

export interface LessonKnowledgeCheck {
  title: string;
  intro?: string;
  questions: LessonCheckQuestion[];
}

export interface LessonTrainerLink {
  label: string;
  target: 'ipv4' | 'cli' | 'practice';
}

export interface Lesson {
  id: string;
  title: string;
  category: string;
  osiLayers: string[];
  difficulty: 'beginner' | 'applied' | 'advanced';
  professional?: {
    summary: string;
    terms: string[];
    blocks: LessonBlock[];
    commands?: LessonCommand[];
    sources: string[];
    sourceCommit?: string;
  };
  summary: string;
  terms: string[];
  blocks: LessonBlock[];
  commands?: LessonCommand[];
  relatedQuestionIds: string[];
  trainers?: LessonTrainerLink[];
  sources: string[];
  diagram?: 'sni';
  animation?: { file: string; label: string; description: string };
  /** Optional short in-lesson self-check; intentionally separate from tracked exam attempts. */
  knowledgeCheck?: LessonKnowledgeCheck;
  /** If provided, replace the default check in the "Простыми словами" mode.
   * The full knowledgeCheck remains for professional mode; no impact on exam statistics. */
  plainKnowledgeCheck?: LessonKnowledgeCheck;
}
