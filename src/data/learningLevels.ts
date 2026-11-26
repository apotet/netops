import rawRegistry from './questionLearningLevels.json';
import { ALL_QUESTIONS } from './questionsData';
import type { LearningLevel, LearningLevelEntry, LearningLevelRegistry } from '../types/learningLevel';

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isLevel(value: unknown): value is LearningLevel {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

/** Fail on gaps, extras, duplicate bank IDs or ambiguous REVIEW; never infer from difficulty. */
export function validateLearningLevelRegistry(
  value: unknown,
  bank: readonly { id: string }[],
): asserts value is LearningLevelRegistry {
  if (!object(value)) throw new Error('Learning levels: expected an ID registry');
  const ids = new Set<string>();
  for (const question of bank) {
    if (!question.id || ids.has(question.id)) throw new Error(`Learning levels: invalid/duplicate bank ID ${question.id}`);
    ids.add(question.id);
    if (!Object.hasOwn(value, question.id)) throw new Error(`Learning levels: missing ID ${question.id}`);
  }
  for (const [id, entry] of Object.entries(value)) {
    if (!ids.has(id)) throw new Error(`Learning levels: unknown ID ${id}`);
    if (!object(entry) || (entry.confidence !== 'high' && entry.confidence !== 'medium') ||
        typeof entry.auditRationale !== 'string' || !entry.auditRationale.trim()) {
      throw new Error(`Learning levels: invalid audit evidence for ${id}`);
    }
    if (entry.status === 'ASSIGNED') {
      if ((entry.auditAction !== 'KEEP' && entry.auditAction !== 'RELABEL') || !isLevel(entry.learningLevel) ||
          Object.hasOwn(entry, 'auditProposedLevel') || Object.hasOwn(entry, 'reviewReason') || Object.hasOwn(entry, 'followUp')) {
        throw new Error(`Learning levels: invalid assigned level for ${id}`);
      }
    } else if (entry.status === 'REVIEW') {
      if (entry.auditAction !== 'REVIEW' || !isLevel(entry.auditProposedLevel) || Object.hasOwn(entry, 'learningLevel') ||
          typeof entry.followUp !== 'string' || !entry.followUp.trim() ||
          typeof entry.reviewReason !== 'string' || !entry.reviewReason.trim()) {
        throw new Error(`Learning levels: invalid REVIEW for ${id}`);
      }
    } else throw new Error(`Learning levels: invalid status for ${id}`);
  }
}

validateLearningLevelRegistry(rawRegistry, ALL_QUESTIONS);
for (const entry of Object.values(rawRegistry)) Object.freeze(entry);
export const QUESTION_LEARNING_LEVELS: LearningLevelRegistry = Object.freeze(rawRegistry);

/** Caller must handle REVIEW explicitly. Unknown IDs throw, including inherited object keys. */
export function getLearningLevelMetadata(id: string): LearningLevelEntry {
  if (!Object.hasOwn(QUESTION_LEARNING_LEVELS, id)) throw new Error(`Learning levels: unknown ID ${id}`);
  return QUESTION_LEARNING_LEVELS[id];
}

export function getLearningLevelStatistics(registry: LearningLevelRegistry = QUESTION_LEARNING_LEVELS) {
  const levels: Record<LearningLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const auditProposals: Record<LearningLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const auditActions = { KEEP: 0, RELABEL: 0, REVIEW: 0 };
  const reviewIds: string[] = [];
  for (const [id, entry] of Object.entries(registry)) {
    auditActions[entry.auditAction]++;
    if (entry.status === 'ASSIGNED') {
      levels[entry.learningLevel]++;
      auditProposals[entry.learningLevel]++;
    } else {
      reviewIds.push(id);
      auditProposals[entry.auditProposedLevel]++;
    }
  }
  return { total: Object.keys(registry).length, assigned: Object.values(levels).reduce((a, b) => a + b, 0),
    levels, reviewIds, auditActions, auditProposals };
}
