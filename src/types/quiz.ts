export interface Question {
  id: string;
  group: string;
  topic: string;
  text: string;
  answers: string[];
  correct: number[];
  explanation: string;
  remember?: string;
  image?: string;
  imageAlt?: string;
  template?: boolean;
  family?: string;
  /** beginner kept for bank compatibility (legacy alias of basic). */
  difficulty?: 'basic' | 'beginner' | 'applied' | 'advanced';
}

export type QuizModeId =
  | 'mixed'
  | 'l1-l2'
  | 'l3'
  | 'l4'
  | 'l5-l7'
  | 'tcpip'
  | 'troubleshooting'
  | 'visual-l1';

export interface QuizMode {
  id: QuizModeId;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  groupFilter?: string;
  count: number;
}

export type ExamDifficulty = 'beginner' | 'mixed';

export interface QuizSession {
  /** Missing in legacy attempts, which retain their original all-level question set. */
  difficulty?: ExamDifficulty;
  requestedCount?: number;
  questions: Question[];
  currentIndex: number;
  userAnswers: Record<string, number[]>;
  submittedQuestions: Record<string, boolean>;
  startTime: number;
  endTime?: number;
  isCompleted: boolean;
  mode: QuizModeId;
  feedbackMode: 'instant' | 'exam';
}

export interface QuizStats {
  totalAttempts: number;
  highestScore: number;
  passedCount: number;
  history: Array<{
    date: string;
    mode: string;
    score: number;
    total: number;
    percentage: number;
  }>;
}
