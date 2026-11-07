import { ALL_QUESTIONS } from '../data/questionsData';
import type { Question } from '../types/quiz';

export const PROGRESS_KEY = 'osi_user_progress_v4';
const LEGACY_KEYS = ['osi_user_progress_v3', 'osi_last_mistakes', 'osi_exam_history', 'osi_active_session'];
const GROUP_NAMES: Record<string, string> = {
  'visual-l1': 'Фото L1', 'l1-l2': 'L1–L2', l3: 'L3', l4: 'L4', 'l5-l7': 'L5–L7',
  tcpip: 'TCP/IP', troubleshooting: 'Диагностика',
};
export interface QuestionProgress {
  seen: number; correct: number; wrong: number; streak: number; lastSeen: number; lastWrong: number;
}
export interface ProgressModel {
  version: 4;
  epoch: string;
  questions: Record<string, QuestionProgress>;
  receipts: Record<string, true>;
  dates: string[];
  backup: Record<string, string>;
  migrationNotice: boolean;
}
export interface LevelMastery { level: string; name: string; total: number; correct: number; masteryPercent: number }
export interface ProgressState {
  answeredCount: number; correctCount: number; readinessPercent: number | null; streakDays: number;
  weakSpot: { level: string; topic: string } | null;
  strongSpot: { level: string; topic: string } | null;
  levels: Record<string, LevelMastery>;
  mistakesCount: number; visualAnswered: number; visualTotal: number;
  migrationNotice: boolean; storageWarning: boolean;
}
const emptyQuestion = (): QuestionProgress => ({ seen: 0, correct: 0, wrong: 0, streak: 0, lastSeen: 0, lastWrong: 0 });
const epoch = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
export const emptyProgress = (): ProgressModel => ({ version: 4, epoch: epoch(), questions: {}, receipts: {}, dates: [], backup: {}, migrationNotice: false });
export function localDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function calendarStreak(dates: string[], now = Date.now()): number {
  const days = new Set(dates);
  const cursor = new Date(now);
  // Local calendar arithmetic (not 24-hour milliseconds) also works across DST.
  if (!days.has(localDate(+cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(localDate(+cursor))) { count++; cursor.setDate(cursor.getDate() - 1); }
  return count;
}
const object = (value: unknown): value is Record<string, any> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const count = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
function parse(raw?: string | null): any { try { return raw ? JSON.parse(raw) : null; } catch { return null; } }
function validModel(value: unknown): value is ProgressModel {
  if (!object(value) || value.version !== 4 || typeof value.epoch !== 'string' || !object(value.questions) ||
      !object(value.receipts) || !object(value.backup) || typeof value.migrationNotice !== 'boolean' || !Array.isArray(value.dates)) return false;
  return Object.values(value.questions).every(q => object(q) &&
    ['seen', 'correct', 'wrong', 'streak', 'lastSeen', 'lastWrong'].every(key => count(q[key])) &&
    q.seen === q.correct + q.wrong && q.streak <= q.correct) &&
    Object.values(value.receipts).every(v => v === true) && Object.values(value.backup).every(v => typeof v === 'string') &&
    value.dates.every(date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && localDate(+new Date(date + 'T12:00:00')) === date);
}

/** One isolated store per browser runtime; storage is injected in targeted tests. */
export function createProgressStore(bank: readonly Question[], storage: () => Storage | null, now = Date.now) {
  const byId = new Map(bank.map(q => [q.id, q]));
  let memory: ProgressModel | null = null;
  let dirty = false;
  let readBlocked = false;
  let storageWarning = false;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());
  function persist(model: ProgressModel) {
    memory = model;
    try {
      if (readBlocked) throw Error('Cannot overwrite storage that could not be read');
      const target = storage();
      if (!target) throw Error('Storage unavailable');
      target.setItem(PROGRESS_KEY, JSON.stringify(model));
      storageWarning = false; dirty = false;
    } catch { storageWarning = true; dirty = true; }
  }
  function load(): ProgressModel {
    let target: Storage | null;
    try { target = storage(); if (!target) throw Error('Storage unavailable'); }
    catch { readBlocked = true; storageWarning = true; return memory ||= emptyProgress(); }
    try {
      // Never replace newer in-memory answers with an older persisted copy after a quota failure.
      if (dirty && memory) { persist(memory); return memory; }
      const raw = target.getItem(PROGRESS_KEY);
      const parsed = parse(raw);
      if (validModel(parsed)) { memory = parsed; return parsed; }
      const model = emptyProgress();
      if (raw) model.backup[PROGRESS_KEY] = raw;
      for (const key of LEGACY_KEYS) {
        const old = target.getItem(key);
        if (old !== null) model.backup[key] = old;
      }
      model.migrationNotice = Object.keys(model.backup).length > 0;
      const legacy = parse(model.backup.osi_user_progress_v3);
      if (object(legacy?.answeredQuestions)) {
        for (const [id, answer] of Object.entries(legacy.answeredQuestions)) {
          if (!byId.has(id) || !object(answer) || typeof answer.correct !== 'boolean' ||
              !count(answer.timestamp) || answer.timestamp === 0 || answer.timestamp > now()) continue;
          model.questions[id] = { seen: 1, correct: Number(answer.correct), wrong: Number(!answer.correct),
            streak: Number(answer.correct), lastSeen: answer.timestamp, lastWrong: answer.correct ? 0 : answer.timestamp };
          model.dates.push(localDate(answer.timestamp));
        }
      }
      const active = parse(model.backup.osi_active_session);
      if (Array.isArray(active?.questions) && object(active.submittedQuestions) && object(active.userAnswers)) {
        for (const item of active.questions) {
          const question = byId.get(item?.id);
          const chosen = active.userAnswers[item?.id];
          if (!question || model.questions[question.id] || active.submittedQuestions[question.id] !== true ||
              !Array.isArray(chosen) || !chosen.length || new Set(chosen).size !== chosen.length ||
              chosen.some(i => !Number.isInteger(i) || i < 0 || i >= question.answers.length)) continue;
          const correct = chosen.length === question.correct.length && chosen.every(i => question.correct.includes(i));
          // A saved confirmation is real, but its submission date is unknown in old sessions.
          model.questions[question.id] = { ...emptyQuestion(), seen: 1, correct: Number(correct), wrong: Number(!correct), streak: Number(correct) };
        }
      }
      const mistakes = parse(model.backup.osi_last_mistakes);
      if (Array.isArray(mistakes)) for (const id of new Set(mistakes)) {
        if (typeof id !== 'string' || !byId.has(id)) continue;
        const q = model.questions[id] ||= emptyQuestion();
        if (q.wrong === 0) { q.wrong = 1; q.seen++; }
        q.streak = 0; // Unknown chronology cannot establish two consecutive successes.
      }
      model.dates = [...new Set(model.dates)].sort();
      // Aggregate exam history has no trustworthy per-ID answer order. Keep it in raw backup.
      persist(model);
      return model;
    } catch { readBlocked = true; storageWarning = true; return memory ||= emptyProgress(); }
  }
  function record(id: string, correct: boolean, receipt: string, expectedEpoch: string, timestamp = now()): boolean {
    const model = load();
    if (!byId.has(id) || !receipt || model.epoch !== expectedEpoch || Object.hasOwn(model.receipts, receipt) ||
        !count(timestamp) || timestamp > now()) return false;
    const q = model.questions[id] ||= emptyQuestion();
    q.seen++; q.lastSeen = timestamp;
    if (correct) { q.correct++; q.streak++; } else { q.wrong++; q.streak = 0; q.lastWrong = timestamp; }
    model.receipts[receipt] = true;
    model.dates = [...new Set([...model.dates, localDate(timestamp)])].sort();
    persist(model); notify(); return true;
  }
  function mistakes(limit = bank.length): Question[] {
    const model = load();
    return bank.filter(q => model.questions[q.id]?.wrong > 0 && model.questions[q.id].streak < 2).slice(0, limit);
  }
  function summary(): ProgressState {
    const model = load();
    const levels: Record<string, LevelMastery> = Object.fromEntries(Object.entries(GROUP_NAMES)
      .map(([level, name]) => [level, { level, name, total: 0, correct: 0, masteryPercent: 0 }]));
    let answeredCount = 0, correctCount = 0;
    for (const [id, value] of Object.entries(model.questions)) {
      const question = byId.get(id);
      if (!question) continue;
      answeredCount += value.seen; correctCount += value.correct;
      const level = levels[question.group];
      if (level) { level.total += value.seen; level.correct += value.correct; }
    }
    for (const level of Object.values(levels)) level.masteryPercent = level.total ? Math.round(level.correct / level.total * 100) : 0;
    const sufficient = Object.values(levels).filter(level => level.total >= 10)
      .sort((a, b) => a.masteryPercent - b.masteryPercent);
    const spot = (level?: LevelMastery) => level ? { level: level.level, topic: level.name } : null;
    const distinct = sufficient.length >= 2 && sufficient[0].masteryPercent !== sufficient.at(-1)!.masteryPercent;
    return { answeredCount, correctCount, readinessPercent: answeredCount >= 10 ? Math.round(correctCount / answeredCount * 100) : null,
      streakDays: calendarStreak(model.dates, now()), levels, weakSpot: distinct ? spot(sufficient[0]) : null,
      strongSpot: distinct ? spot(sufficient.at(-1)) : null, mistakesCount: mistakes().length,
      visualAnswered: bank.filter(q => q.group === 'visual-l1' && model.questions[q.id]?.seen > 0).length,
      visualTotal: bank.filter(q => q.group === 'visual-l1').length, migrationNotice: model.migrationNotice, storageWarning };
  }
  function reset() {
    // The caller confirms irreversible deletion or exports first. Write the new epoch before cleanup.
    persist(emptyProgress());
    if (!dirty) for (const key of LEGACY_KEYS) {
      try { storage()?.removeItem(key); } catch { storageWarning = true; }
    }
    notify(); return summary();
  }
  function retainBackup(key: string, raw: string) {
    const model = load();
    const name = model.backup[key] && model.backup[key] !== raw ? `${key}:${epoch()}` : key;
    model.backup[name] = raw; model.migrationNotice = true;
    persist(model); notify();
  }
  return { load, record, mistakes, summary, reset, retainBackup, subscribe(listener: () => void) {
    listeners.add(listener); return () => { listeners.delete(listener); };
  }, refresh: notify, export: () => JSON.stringify(load(), null, 2) };
}
const store = createProgressStore(ALL_QUESTIONS, () => { try { return localStorage; } catch { return null; } });
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === PROGRESS_KEY || event.key === null) store.refresh();
});
export const getInitialProgress = store.summary;
export const getProgressEpoch = () => store.load().epoch;
export const getMistakeQuestions = store.mistakes;
export const recordQuestionResult = store.record;
export const subscribeProgress = store.subscribe;
export const resetProgress = store.reset;
export const exportProgress = store.export;
export const retainProgressBackup = store.retainBackup;
