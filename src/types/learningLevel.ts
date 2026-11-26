/** Educational metadata only; neither Question.difficulty nor ExamDifficulty. */
export type LearningLevel = 1 | 2 | 3 | 4 | 5;

export function isLearningLevel(value: unknown): value is LearningLevel {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

export const LEARNING_LEVELS = {
  1: { ru: 'Основы', en: 'Fundamentals' },
  2: { ru: 'Понимание', en: 'Understanding' },
  3: { ru: 'Применение', en: 'Application' },
  4: { ru: 'Диагностика', en: 'Troubleshooting' },
  5: { ru: 'Эксперт', en: 'Expert' },
} as const satisfies Record<LearningLevel, { ru: string; en: string }>;

interface AuditEvidence {
  readonly confidence: 'high' | 'medium';
  /** Verbatim rationale from the published CSV; may describe pre-fix content. */
  readonly auditRationale: string;
}

export type LearningLevelEntry = AuditEvidence & (
  | {
    readonly status: 'ASSIGNED';
    readonly auditAction: 'KEEP' | 'RELABEL';
    readonly learningLevel: LearningLevel;
  }
  | {
    readonly status: 'REVIEW';
    readonly auditAction: 'REVIEW';
    /** Historical proposal, deliberately not an assigned learningLevel. */
    readonly auditProposedLevel: LearningLevel;
    readonly followUp: string;
    readonly reviewReason: string;
  }
);

export type LearningLevelRegistry = Readonly<Record<string, LearningLevelEntry>>;
