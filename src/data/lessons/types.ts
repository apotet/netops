export interface LessonBlock {
  heading: string;
  body: string;
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
  summary: string;
  terms: string[];
  blocks: LessonBlock[];
  commands?: LessonCommand[];
  relatedQuestionIds: string[];
  trainers?: LessonTrainerLink[];
  sources: string[];
  diagram?: 'sni';
}
