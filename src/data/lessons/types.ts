import type { PracticeLink } from '../practiceLinks';

export interface LessonBlock {
  heading: string;
  body: string;
  practiceLink?: PracticeLink;
}

export interface LessonCommand {
  title: string;
  cmd: string;
  note?: string;
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
    sourceCommit: string;
  };
  summary: string;
  terms: string[];
  blocks: LessonBlock[];
  commands?: LessonCommand[];
  relatedQuestionIds: string[];
  trainers?: LessonTrainerLink[];
  sources: string[];
  diagram?: 'sni';
}
