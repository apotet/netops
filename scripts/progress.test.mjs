import assert from 'node:assert/strict';
import { bundleEntry } from './load-bank.mjs';
const { createProgressStore, PROGRESS_KEY, ALL_QUESTIONS, calendarStreak, localDate,
  confirmAnswer, identifySession, restoreSession, recordConfirmedAnswers } = await bundleEntry('scripts/progress-entry.ts', 'progress-tests.mjs');

class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, value); }
  removeItem(key) { this.data.delete(key); }
}
let now = +new Date('2026-11-04T12:00:00');
const storage = new MemoryStorage();
let store = createProgressStore(ALL_QUESTIONS, () => storage, () => now);
const [a, b] = ALL_QUESTIONS;
let serial = 0;
const answer = (id, ok) => store.record(id, ok, `answer-${++serial}`, store.load().epoch, now);
const mistakes = () => store.mistakes().map(q => q.id);
assert.equal(store.summary().answeredCount, 0);
assert.equal(store.summary().correctCount, 0);
assert.equal(store.summary().mistakesCount, 0);
assert.equal(store.summary().streakDays, 0);
assert.equal(store.summary().readinessPercent, null);
assert.equal(store.summary().weakSpot, null);
assert.equal(store.summary().strongSpot, null);
assert.ok(Object.values(store.summary().levels).every(q => q.total === 0));
assert.equal(store.mistakes(20).length, 0, 'empty review never draws from main bank');
answer(a.id, false);
answer(b.id, true);
assert.deepEqual(mistakes(), [a.id]);
answer(a.id, true);
assert.deepEqual(mistakes(), [a.id]);
answer(a.id, false);
assert.equal(store.load().questions[a.id].streak, 0);
answer(a.id, true); answer(a.id, true);
assert.deepEqual(mistakes(), []);
assert.equal(store.summary().streakDays, 1, 'same day counted once');
answer(a.id, false);
assert.deepEqual(mistakes(), [a.id], 'new wrong returns mastered question');
const before = store.summary().answeredCount;
const token = 'once'; const ep = store.load().epoch;
assert.equal(store.record(a.id, true, token, ep), true);
assert.equal(store.record(a.id, false, token, ep), false);
assert.equal(store.summary().answeredCount, before + 1);
store = createProgressStore(ALL_QUESTIONS, () => storage, () => now);
assert.equal(store.record(a.id, true, token, ep), false, 'receipt persists on reload');
assert.equal(store.load().questions[b.id].streak, 1, 'IDs independent');
assert.equal(store.record('missing-id', false, 'unknown', ep), false);
let notified = 0; const unsubscribe = store.subscribe(() => notified++);
answer(b.id, true); assert.equal(notified, 1); unsubscribe();
const otherTab = createProgressStore(ALL_QUESTIONS, () => storage, () => now);
otherTab.record(b.id, false, 'other-tab', otherTab.load().epoch);
assert.ok(mistakes().includes(b.id), 'reads fresh storage across instances');

// Calendar dates, midnight, missing days, yesterday grace and DST in local zones.
const oldTZ = process.env.TZ;
for (const zone of ['UTC', 'Asia/Tokyo', 'America/New_York']) {
  process.env.TZ = zone;
  const date = text => +new Date(text);
  const first = date('2026-03-07T23:59:00');
  const second = date('2026-03-08T00:01:00');
  assert.notEqual(localDate(first), localDate(second), zone + ' midnight');
  const days = [localDate(first), localDate(second), '2026-03-09'];
  assert.equal(calendarStreak([], second), 0);
  assert.equal(calendarStreak([days[0]], first), 1);
  assert.equal(calendarStreak(days.slice(0, 2), second), 2);
  assert.equal(calendarStreak(days, date('2026-03-09T12:00:00')), 3);
  assert.equal(calendarStreak(days, date('2026-03-10T12:00:00')), 3);
  assert.equal(calendarStreak(days, date('2026-03-11T12:00:00')), 0);
  assert.equal(calendarStreak([days[0], days[2]], date('2026-03-09T12:00:00')), 1);
}
if (oldTZ === undefined) delete process.env.TZ; else process.env.TZ = oldTZ;

// Real sample threshold and deterministic group mapping, never text guessing.
const metricStorage = new MemoryStorage();
const metric = createProgressStore(ALL_QUESTIONS, () => metricStorage, () => now);
const l3 = ALL_QUESTIONS.find(q => q.group === 'l3');
const tcpip = ALL_QUESTIONS.find(q => q.group === 'tcpip');
for (let i = 0; i < 10; i++) metric.record(tcpip.id, true, `tcp-${i}`, metric.load().epoch);
assert.equal(metric.summary().readinessPercent, 100);
assert.equal(metric.summary().strongSpot, null, 'one group cannot imply comparative mastery');
for (let i = 0; i < 10; i++) metric.record(l3.id, false, `ip-${i}`, metric.load().epoch);
assert.equal(metric.summary().levels.tcpip.correct, 10);
assert.equal(metric.summary().levels.l3.correct, 0);
assert.equal(metric.summary().weakSpot.level, 'l3');
assert.equal(metric.summary().strongSpot.level, 'tcpip');
assert.equal(metric.summary().readinessPercent, 50);

// Conservative, repeatable migration. Ignore demo aggregates and preserve raw data.
const legacy = new MemoryStorage();
const raw = JSON.stringify({ answeredCount: 84, correctCount: 61, readinessPercent: 72, streakDays: 7,
  answeredQuestions: { [a.id]: { correct: true, timestamp: now - 1000, level: 'bogus' },
    invalid: { correct: true, timestamp: now }, [b.id]: { correct: false, timestamp: 'bad' } }, unknown: 'preserved' });
legacy.setItem('osi_user_progress_v3', raw);
legacy.setItem('osi_last_mistakes', JSON.stringify([a.id, a.id, b.id, 'missing-id']));
legacy.setItem('osi_exam_history', '[{"score":10,"date":"2026-01-01"}]');
legacy.setItem('osi_active_session', '{bad session');
const migrated = createProgressStore(ALL_QUESTIONS, () => legacy, () => now);
assert.equal(migrated.summary().answeredCount, 3, 'one verified success and two known wrong IDs, not demo totals');
assert.equal(migrated.summary().correctCount, 1);
assert.equal(migrated.load().questions[a.id].streak, 0, 'lastMistakes cannot invent successful streaks');
assert.equal(migrated.summary().mistakesCount, 2);
assert.equal(migrated.summary().streakDays, 1);
assert.equal(migrated.summary().migrationNotice, true);
assert.equal(JSON.parse(migrated.export()).backup.osi_user_progress_v3, raw);
assert.equal(legacy.getItem('osi_user_progress_v3'), raw, 'source not destroyed');
const migratedAgain = createProgressStore(ALL_QUESTIONS, () => legacy, () => now);
assert.deepEqual(migratedAgain.load(), migrated.load(), 'idempotent migration');
const demo = new MemoryStorage();
demo.setItem('osi_user_progress_v3', JSON.stringify({ answeredCount: 84, correctCount: 61, streakDays: 7, answeredQuestions: {} }));
const cleanDemo = createProgressStore(ALL_QUESTIONS, () => demo, () => now);
assert.equal(cleanDemo.summary().answeredCount, 0); assert.equal(cleanDemo.summary().streakDays, 0);
const corrupt = new MemoryStorage(); corrupt.setItem(PROGRESS_KEY, '{corrupt'); corrupt.setItem('osi_last_mistakes', 'oops');
const recovered = createProgressStore(ALL_QUESTIONS, () => corrupt, () => now);
assert.equal(recovered.summary().answeredCount, 0);
assert.equal(JSON.parse(recovered.export()).backup[PROGRESS_KEY], '{corrupt');
assert.equal(JSON.parse(recovered.export()).backup.osi_last_mistakes, 'oops');

// Storage denied/read failure/quota: preserve memory, warn, never overwrite unread data.
const denied = createProgressStore(ALL_QUESTIONS, () => { throw Error('disabled'); }, () => now);
denied.record(a.id, false, 'denied', denied.load().epoch);
assert.equal(denied.summary().mistakesCount, 1); assert.equal(denied.summary().storageWarning, true);
assert.equal(JSON.parse(denied.export()).questions[a.id].wrong, 1);
const quotaStorage = new MemoryStorage();
const quota = createProgressStore(ALL_QUESTIONS, () => quotaStorage, () => now);
quota.load(); const original = quotaStorage.getItem(PROGRESS_KEY);
quotaStorage.setItem = () => { throw Error('quota'); };
quota.record(a.id, false, 'quota', quota.load().epoch);
assert.equal(quota.summary().answeredCount, 1); assert.equal(quota.summary().storageWarning, true);
assert.equal(quotaStorage.getItem(PROGRESS_KEY), original);
const unreadable = new MemoryStorage(); let writes = 0;
unreadable.getItem = () => { throw Error('read'); };
unreadable.setItem = () => writes++;
const protectedStore = createProgressStore(ALL_QUESTIONS, () => unreadable, () => now);
protectedStore.record(a.id, true, 'safe', protectedStore.load().epoch);
assert.equal(writes, 0, 'never overwrite unreadable source');

// A portion never removes pending IDs from the accumulated pool.
// Stable injected storage instance for batch/reload checks.
const batchStorage = new MemoryStorage(); const batch = createProgressStore(ALL_QUESTIONS, () => batchStorage, () => now);
for (const q of ALL_QUESTIONS.slice(0, 25)) batch.record(q.id, false, `batch:${q.id}`, batch.load().epoch);
assert.equal(batch.mistakes(20).length, 20); assert.equal(batch.mistakes().length, 25);
const staleEpoch = batch.load().epoch;
const zero = batch.reset(); assert.equal(zero.answeredCount, 0); assert.equal(zero.mistakesCount, 0); assert.equal(zero.streakDays, 0);
assert.equal(batch.record(a.id, false, 'stale', staleEpoch), false, 'old session cannot undo reset');
assert.equal(new Set(ALL_QUESTIONS.map(q => q.id)).size, 657, 'reset leaves bank intact');
migrated.reset();
for (const key of ['osi_user_progress_v3', 'osi_last_mistakes', 'osi_exam_history', 'osi_active_session']) assert.equal(legacy.getItem(key), null);
assert.equal(createProgressStore(ALL_QUESTIONS, () => legacy, () => now).summary().answeredCount, 0);

const activeLegacy = new MemoryStorage();
activeLegacy.setItem('osi_active_session', JSON.stringify({ questions: [a, b],
  submittedQuestions: { [a.id]: true }, userAnswers: { [a.id]: a.correct, [b.id]: b.correct } }));
const activeRecovered = createProgressStore(ALL_QUESTIONS, () => activeLegacy, () => now);
assert.equal(activeRecovered.summary().answeredCount, 1, 'confirmed legacy answer recoverable; draft not counted');
assert.equal(activeRecovered.summary().correctCount, 1);
assert.equal(activeRecovered.summary().streakDays, 0, 'unknown confirmation date does not invent a day');
assert.equal(activeRecovered.summary().migrationNotice, true);

// Same confirmed-answer path for instant/exam; no effect/render/next double charge.
for (const feedbackMode of ['instant', 'exam']) {
  const sessionStorage = new MemoryStorage(); const progress = createProgressStore(ALL_QUESTIONS, () => sessionStorage, () => now);
  let session = { questions: [a, b], currentIndex: 0, userAnswers: {}, submittedQuestions: {}, startTime: now,
    isCompleted: false, mode: 'mixed', feedbackMode, attemptId: feedbackMode, progressEpoch: progress.load().epoch };
  const replay = value => recordConfirmedAnswers(value, progress.record);
  replay(session); assert.equal(progress.summary().answeredCount, 0);
  assert.equal(confirmAnswer(session, []), session, 'empty answer is not confirmed');
  session = confirmAnswer(session, a.correct, now);
  replay(session); replay(session);
  assert.equal(progress.summary().answeredCount, 1);
  assert.equal(confirmAnswer(session, [0]), session, 'confirmed answer locked');
  const restored = JSON.parse(JSON.stringify(session)); replay(restored);
  assert.ok(restoreSession(JSON.stringify(session), ALL_QUESTIONS, now));
  assert.equal(restoreSession('{bad', ALL_QUESTIONS, now), null);
  assert.equal(restoreSession(JSON.stringify({ ...session, currentIndex: 10000 }), ALL_QUESTIONS, now), null);
  assert.equal(restoreSession(JSON.stringify({ ...session, questions: [{ id: 'missing' }] }), ALL_QUESTIONS, now), null);
  assert.equal(progress.summary().answeredCount, 1, 'reload replay idempotent');
  session = { ...restored, currentIndex: 1 }; replay(session);
  assert.equal(progress.summary().answeredCount, 1, 'unanswered second question not wrong');
  session = confirmAnswer(session, [b.correct.includes(0) ? 1 : 0], now);
  replay(session);
  session = { ...session, isCompleted: true }; replay(session);
  assert.equal(progress.summary().answeredCount, 2);
  assert.equal(progress.summary().mistakesCount, 1);
  // Recovery after session save succeeded but recording was interrupted.
  const missed = { ...session, attemptId: feedbackMode + '-interrupted' }; replay(missed);
  assert.equal(progress.summary().answeredCount, 4);
  // Old sessions do not replay answers already counted in v3 snapshots.
  const old = { ...session }; delete old.attemptId; delete old.progressEpoch;
  const identified = identifySession(old); replay({ ...identified, progressEpoch: progress.load().epoch });
  assert.equal(progress.summary().answeredCount, 4);
}

// Save-before-record repair retains the original local submission day on next-day reload.
const midnightStorage = new MemoryStorage();
const originalTime = +new Date('2026-11-03T23:59:00');
const dayStore = createProgressStore(ALL_QUESTIONS, () => midnightStorage, () => now);
const midnightSession = confirmAnswer({ questions: [a], currentIndex: 0, userAnswers: {}, submittedQuestions: {},
  startTime: originalTime, isCompleted: false, mode: 'mixed', feedbackMode: 'exam', attemptId: 'midnight', progressEpoch: dayStore.load().epoch }, a.correct, originalTime);
recordConfirmedAnswers(JSON.parse(JSON.stringify(midnightSession)), dayStore.record);
assert.deepEqual(dayStore.load().dates, [localDate(originalTime)]);
console.log('OK: N1B progress/mistakes, once-only instant/exam, migration, storage failures, reset, calendar/midnight/DST in 3 zones');
