import { useSyncExternalStore } from 'react';

export type StudyTextMode = 'meaning' | 'professional';
export const STUDY_TEXT_MODE_KEY = 'osi_study_text_mode_v1';
const CHANGE_EVENT = 'osi-study-text-mode-change';
let memoryMode: StudyTextMode = 'meaning';

/** Tab-session preference, shared by lessons and all engineering-review cards. */
export function getStudyTextMode(): StudyTextMode {
  if (typeof window === 'undefined') return 'meaning';
  try {
    const saved = window.sessionStorage.getItem(STUDY_TEXT_MODE_KEY);
    if (saved === 'meaning' || saved === 'professional') return saved;
  } catch { /* Keep the tab usable when storage is blocked. */ }
  return memoryMode;
}

export function setStudyTextMode(mode: StudyTextMode) {
  if (typeof window === 'undefined') return;
  memoryMode = mode;
  try { window.sessionStorage.setItem(STUDY_TEXT_MODE_KEY, mode); } catch { /* Memory fallback. */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}

export function useStudyTextMode() {
  const mode = useSyncExternalStore(subscribe, getStudyTextMode, () => 'meaning' as const);
  return [mode, setStudyTextMode] as const;
}
