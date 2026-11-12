import type { LabMode } from './types';

/**
 * Single completion gate used by the actual CLI and mock UI.
 * Learn needs completed steps AND all scenario goals; Task/Drill need goals.
 */
export function shouldShowCompletion(
  mode: LabMode, stepIndex: number, totalSteps: number, allPassed: boolean,
): boolean {
  return (mode !== 'learn' || stepIndex >= totalSteps) && allPassed;
}
