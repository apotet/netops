import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bundleEntry } from './load-bank.mjs';
const { ALL_QUESTIONS, QUIZ_MODES, QUESTION_LEARNING_LEVELS: registry, filterLearningLevel,
  getLearningLevelPool, getLearningLevelQuestions, getTestingPool, getTestingQuestions, getExamLevelLabel, LEARNING_LEVEL_REVIEW_COUNT,
  prepareAttemptQuestions, restoreSession, confirmAnswer, recordConfirmedAnswers,
  expireTrial, TRIAL_MINUTES, TRIAL_QUESTION_COUNT, getTrialExamQuestions,
  serializeReview, restoreReview, reviewRows, getQuestionDeepDive, getLessonForQuestion,
  GLOSSARY, GLOSSARY_TOOLTIPS, splitGlossaryText } =
  await bundleEntry('scripts/learning-level-exam-entry.ts', 'learning-level-exam-tests.mjs');
const seeded = seed => () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
const originalBank = JSON.stringify(ALL_QUESTIONS);
const originalRegistry = JSON.stringify(registry);
// Independent acceptance oracle: read the source JSON, not the selector's derived pools.
const sourceRegistry = JSON.parse(readFileSync(new URL('../src/data/questionLearningLevels.json', import.meta.url), 'utf8'));
const totals = [215, 164, 376, 88, 18];

// Issue #257: content + selector + legacy-session regression for six concrete tickets.
// Previously the photo questions displayed a technically true explanation of a DIFFERENT question.
const sixL1Review = {
  'l1v2-a-poe-limit': { level: 1, index: 1, answer: /PSE Type 1\/2.*3,6.*1,2/s, detail: /положительные 3,6.*отрицательные 1,2/s },
  'l1v2-c-otdr-pulse': { level: 1, index: 1, answer: /100 нс|100 ns/i, detail: /100 ns/i },
  'l3-d05': { level: 2, index: 0, answer: /адрес|порт/i, detail: /PAT/i },
  'l4-d03': { level: 2, index: 0, answer: /TIME-WAIT/i, detail: /2MSL/i },
  'l4-d05': { level: 2, index: 0, answer: /SACK|част/i, detail: /SACK/i },
  'tcpip-d05': { level: 2, index: 0, answer: /перегруз/i, detail: /ECN/i },
};
for (const [id, expected] of Object.entries(sixL1Review)) {
  const q = ALL_QUESTIONS.find(question => question.id === id);
  assert.ok(q, 'approved ticket exists: ' + id);
  assert.equal(sourceRegistry[id].learningLevel, expected.level, id + ': reviewed level');
  assert.deepEqual(q.correct, [expected.index], id + ': original answer key');
  const deep = getQuestionDeepDive(q);
  assert.match(deep.briefAnswer, expected.answer, id + ': answers the actual question');
  assert.match(deep.deepAnalysis, expected.detail, id + ': plain materially addresses question');
  assert.ok(deep.professional?.deep?.length > 55, id + ': professional explanation is substantial');
  const lesson = getLessonForQuestion(id);
  assert.ok(lesson?.blocks?.length && lesson?.professional?.blocks?.length,
    id + ': both styles of a real linked lesson');
}
const poe = getQuestionDeepDive(ALL_QUESTIONS.find(q => q.id === 'l1v2-a-poe-limit'));
assert.doesNotMatch(poe.briefAnswer, /54,6|60 Вт/, 'PoE photo answer must not be replaced with unrelated power budget');
const otdr = getQuestionDeepDive(ALL_QUESTIONS.find(q => q.id === 'l1v2-c-otdr-pulse'));
assert.doesNotMatch(otdr.briefAnswer, /уменьшить|укоротить/i, 'OTDR reading is not a pulse-selection task');
const movedFromBase = ['l3-d05', 'l4-d03', 'l4-d05', 'tcpip-d05'];
const movedOldAttempt = {
  ...prepareAttemptQuestions(ALL_QUESTIONS.filter(q => movedFromBase.includes(q.id)), seeded(17)),
  currentIndex: 0, userAnswers: {}, submittedQuestions: {}, startTime: Date.now() - 1000,
  isCompleted: false, mode: 'mixed', feedbackMode: 'exam', difficulty: 'beginner', requestedCount: 4,
};
const recoveredMovedOldAttempt = restoreSession(JSON.stringify(movedOldAttempt), ALL_QUESTIONS, Date.now());
assert.ok(recoveredMovedOldAttempt, 'existing Base attempts with relocated L2 questions still restore');
assert.deepEqual(recoveredMovedOldAttempt.questions, movedOldAttempt.questions,
  'reclassified L2 tickets are not resampled or have their shuffled answers changed');
assert.ok(getTestingPool('mixed', 'beginner').every(q => !movedFromBase.includes(q.id)));
assert.ok(movedFromBase.every(id => getTestingPool('mixed', 'in-depth').some(q => q.id === id)));
console.log('PASS: six ID question/answer/plain/pro/lesson links and legacy Base attempt restoration');

const review = ALL_QUESTIONS.filter(q => registry[q.id].status === 'REVIEW');
assert.equal(review.length, 0);
assert.equal(LEARNING_LEVEL_REVIEW_COUNT, 0);
const understanding = ALL_QUESTIONS.filter(({ id }) =>
  sourceRegistry[id].status === 'ASSIGNED' && sourceRegistry[id].learningLevel === 2);
assert.equal(understanding.length, 164);
for (const { id: mode } of QUIZ_MODES) {
  const pool = understanding.filter(q => mode === 'mixed' || q.group === mode);
  assert.deepEqual(getTestingPool(mode, 'in-depth'), pool);
  const questions = getTestingQuestions(mode, 30, seeded(17), 'in-depth');
  assert.equal(questions.length, Math.min(pool.length, 30));
  assert.ok(questions.every(q => pool.includes(q)));
}
const understandingCustom = [...understanding.slice(0, 3), ...review];
assert.deepEqual(new Set(getTestingQuestions('mixed', 10, seeded(17), 'in-depth', understandingCustom)),
  new Set(understanding.slice(0, 3)));
assert.deepEqual(getTestingQuestions('mixed', 10, seeded(17), 'in-depth', review), []);
const assigned = [];
for (const level of [1, 2, 3, 4, 5]) {
  const all = getLearningLevelPool('mixed', level);
  assert.equal(all.length, totals[level - 1]);
  assigned.push(...all.map(q => q.id));
  assert.deepEqual(filterLearningLevel(review, level), []);
  assert.deepEqual(getLearningLevelQuestions('mixed', 10, seeded(1), level, review), []);
  for (const { id: mode } of QUIZ_MODES) {
    const expected = ALL_QUESTIONS.filter(q => (mode === 'mixed' || q.group === mode) &&
      registry[q.id].status === 'ASSIGNED' && registry[q.id].learningLevel === level);
    assert.deepEqual(getLearningLevelPool(mode, level), expected, 'counts and topic scope match registry exactly');
    for (const count of [1, 5, 10, 15, 20, 30]) for (let seed = 1; seed <= 20; seed++) {
      const selected = getLearningLevelQuestions(mode, count, seeded(seed), level);
      assert.equal(selected.length, Math.min(count, expected.length));
      assert.equal(new Set(selected.map(q => q.id)).size, selected.length);
      assert.ok(selected.every(q => expected.includes(q)));
      assert.deepEqual(selected, getLearningLevelQuestions(mode, count, seeded(seed), level));
    }
  }
}
assert.equal(assigned.length, 861);
assert.equal(new Set(assigned).size, 861);
assert.equal(getLearningLevelQuestions('mixed', 30, seeded(1), 5).length, 18, 'no top-up of Expert');
assert.equal(getLearningLevelQuestions('visual-l1', 10, seeded(1), 5).length, 0, 'no foreign topic/level');
const appliedWithBeginner = getLearningLevelPool('mixed', 3).find(q => q.difficulty === 'beginner');
const fundamentalsWithAdvanced = getLearningLevelPool('mixed', 1).find(q => q.difficulty === 'advanced');
assert.ok(appliedWithBeginner && fundamentalsWithAdvanced, 'registry wins over legacy difficulty');
for (const level of [1, 2, 3, 4, 5]) {
  const expectedIds = ALL_QUESTIONS.filter(q => sourceRegistry[q.id].status === 'ASSIGNED' &&
    sourceRegistry[q.id].learningLevel === level).map(q => q.id);
  assert.deepEqual(getLearningLevelPool('mixed', level).map(q => q.id), expectedIds);
  // Even if every legacy difficulty claims beginner/advanced, registry membership wins.
  for (const difficulty of ['beginner', 'advanced', undefined]) {
    const altered = ALL_QUESTIONS.map(q => ({ ...q, difficulty }));
    assert.deepEqual(filterLearningLevel(altered, level).map(q => q.id), expectedIds);
  }
  for (let seed = 1; seed <= 1000; seed++) {
    const selected = getLearningLevelQuestions('mixed', 10, seeded(seed), level);
    assert.equal(selected.length, Math.min(10, expectedIds.length));
    assert.equal(new Set(selected.map(q => q.id)).size, selected.length);
    for (const q of selected) {
      assert.equal(sourceRegistry[q.id].status, 'ASSIGNED', `REVIEW leaked into L${level}: ${q.id}`);
      assert.equal(sourceRegistry[q.id].learningLevel, level, `foreign level leaked into L${level}: ${q.id}`);
    }
    if (level === 1) {
      assert.equal(new Set(selected.map(q => q.family || q.id)).size, 10);
      assert.ok(selected.some(q => q.image), 'shared photo/family guarantees still apply');
    }
  }
}
const formerlyReviewed = ALL_QUESTIONS.find(q => q.id === 'ts-x09');
const custom = [formerlyReviewed, appliedWithBeginner, fundamentalsWithAdvanced, appliedWithBeginner];
assert.deepEqual(getLearningLevelQuestions('mixed', 10, seeded(2), 3, custom), [appliedWithBeginner]);
assert.deepEqual(getLearningLevelQuestions('mixed', 10, seeded(2), 1, custom), [fundamentalsWithAdvanced]);
assert.deepEqual(getLearningLevelQuestions('mixed', 10, seeded(2), 4, custom), []);
assert.deepEqual(getLearningLevelQuestions('mixed', 10, seeded(2), 1, []), []);
assert.throws(() => filterLearningLevel([{ ...appliedWithBeginner, id: 'unknown' }], 3), /unknown ID/);
for (const value of [0, 6, '3', null, 1.5]) assert.throws(() => filterLearningLevel([], value), RangeError);

// New snapshots and legacy ones restore by ID without applying the current registry filter.
const now = Date.now();
for (const marker of [{}, { difficulty: 'beginner' }, { difficulty: 'mixed' }, ...[1, 2, 3, 4, 5].map(learningLevel => ({ learningLevel }))]) {
  for (const shuffled of [false, true]) {
    const source = marker.learningLevel ? getLearningLevelPool('mixed', marker.learningLevel).slice(0, 3) : [formerlyReviewed, appliedWithBeginner, fundamentalsWithAdvanced];
    let saved = { ...(shuffled ? prepareAttemptQuestions(source, seeded(1)) : { questions: source }),
      currentIndex: 0, userAnswers: {}, submittedQuestions: {}, startTime: now - 1000,
      isCompleted: false, mode: 'mixed', feedbackMode: 'instant', attemptId: 'levels-compat', progressEpoch: 'level-epoch',
      requestedCount: 10, ...marker };
    saved = confirmAnswer(saved, saved.questions[0].correct, now);
    const raw = JSON.stringify(saved);
    const restored = restoreSession(raw, ALL_QUESTIONS, now);
    assert.ok(restored);
    for (const key of Object.keys(saved)) assert.deepEqual(restored[key], saved[key], key);
    // Switching a UI preference / querying another pool must never rewrite a running attempt.
    for (const level of [1, 2, 3, 4, 5]) getLearningLevelQuestions('mixed', 10, seeded(2), level);
    assert.equal(JSON.stringify(saved), raw);
    const events = [];
    recordConfirmedAnswers(restored, (...args) => events.push(args));
    assert.equal(events.length, 1);
    assert.equal(events[0][2], `levels-compat:${source[0].id}`);
    assert.equal(events[0][3], 'level-epoch');
    const completed = { ...restored, isCompleted: true };
    const reviewed = restoreReview(serializeReview(completed), 'level-epoch');
    assert.deepEqual(reviewed.questions, completed.questions);
    assert.equal(reviewed.learningLevel, marker.learningLevel);
    assert.equal(reviewRows(reviewed)[0].status, 'correct');
    for (const value of [0, 6, '3', null, 1.5]) {
      assert.equal(restoreSession(JSON.stringify({ ...saved, learningLevel: value }), ALL_QUESTIONS, now), null);
      assert.equal(restoreReview(serializeReview({ ...completed, learningLevel: value }), 'level-epoch'), null);
    }
  }
}
assert.equal(getExamLevelLabel({ learningLevel: 5 }), 'Эксперт');
assert.match(getExamLevelLabel({ difficulty: 'beginner' }), /База/);
assert.match(getExamLevelLabel({}), /Смешанный/);
assert.equal(JSON.stringify(ALL_QUESTIONS), originalBank);
assert.equal(JSON.stringify(registry), originalRegistry);
console.log('PASS: direct JSON oracle, 1000 samples per level (5000 total), no foreign levels/REVIEW/duplicate IDs, legacy-difficulty independence, counts and 16 old/new session variants');

const trialStart = Date.now();
const trialDeadline = trialStart + 15 * 60_000;
assert.equal(TRIAL_MINUTES, 15);
assert.equal(TRIAL_QUESTION_COUNT, 20);
for (const [difficulty, expected] of Object.entries({ basic: [20, 0, 0], advanced: [0, 10, 10], mixed: [6, 7, 7] })) {
  const sample = getTrialExamQuestions(difficulty, seeded(29));
  assert.equal(new Set(sample.map(q => q.id)).size, 20);
  const counts = [0, 0, 0];
  for (const q of sample) {
    const entry = sourceRegistry[q.id];
    assert.equal(entry.status, 'ASSIGNED');
    assert.ok(entry.learningLevel >= 1 && entry.learningLevel <= 3);
    counts[entry.learningLevel - 1]++;
  }
  assert.deepEqual(counts, expected);
}
const trialQuestions = getTrialExamQuestions('advanced', seeded(29));
assert.equal(new Set(trialQuestions.map(q => q.id)).size, 20);
const trial = { ...prepareAttemptQuestions(trialQuestions, seeded(29)), trialDeadline, trialDifficulty: 'advanced',
  currentIndex: 0, userAnswers: {}, submittedQuestions: {}, isCompleted: false, startTime: trialStart,
  difficulty: 'mixed', mode: 'mixed', feedbackMode: 'exam', progressEpoch: 'trial-epoch', attemptId: 'trial-1' };
const confirmedTrial = confirmAnswer(trial, trial.questions[0].correct, trialDeadline - 1);
assert.notEqual(confirmedTrial, trial);
assert.equal(confirmAnswer(trial, trial.questions[0].correct, trialDeadline), trial);
assert.equal(expireTrial(confirmedTrial, trialDeadline - 1), confirmedTrial);
assert.equal(restoreSession(JSON.stringify({ ...confirmedTrial, feedbackMode: 'instant' }), ALL_QUESTIONS, trialDeadline), null);
const restoredTrial = restoreSession(JSON.stringify(confirmedTrial), ALL_QUESTIONS, trialDeadline);
assert.equal(restoredTrial.trialDeadline, trialDeadline);
assert.equal(restoredTrial.trialDifficulty, 'advanced');
assert.ok(restoreSession(JSON.stringify({ ...confirmedTrial, trialDifficulty: undefined }), ALL_QUESTIONS, trialDeadline));
assert.equal(restoreSession(JSON.stringify({ ...confirmedTrial, trialDifficulty: 'expert' }), ALL_QUESTIONS, trialDeadline), null);
let writes = 0;
const record = () => { writes++; return true; };
recordConfirmedAnswers(restoredTrial, record);
assert.equal(writes, 0);
const expiredTrial = expireTrial(restoredTrial, trialDeadline + 1000);
assert.equal(expiredTrial.endTime, trialDeadline);
assert.equal(expireTrial(expiredTrial, trialDeadline + 2000), expiredTrial);
recordConfirmedAnswers(expiredTrial, record);
assert.equal(writes, 1);
const timedReview = restoreReview(serializeReview(expiredTrial), 'trial-epoch');
assert.equal(timedReview.trialDeadline, trialDeadline);
const reviewedRows = reviewRows(timedReview);
assert.equal(reviewedRows.filter(row => row.status === 'correct').length, 1);
assert.equal(reviewedRows.filter(row => row.status === 'unanswered').length, 19);
console.log('PASS: trial deadline survives restore, no late answers or early score, timeout reviews confirmed answers');

const portQuestion = ALL_QUESTIONS.find(q => q.id === 'l4-x05');
const preEditPort = { ...portQuestion, answers: portQuestion.answers.map((answer, index) => index === 0
  ? 'Высоких портов (часто ≥49152 по IANA)' : answer) };
const preEditAttempt = { ...trial, ...prepareAttemptQuestions([preEditPort], seeded(17)), mode: 'l4' };
const oldCorrect = preEditAttempt.questions[0].correct;
const oldConfirmed = confirmAnswer(preEditAttempt, oldCorrect, trialStart + 1000);
const restoredPort = restoreSession(JSON.stringify(oldConfirmed), ALL_QUESTIONS, trialStart + 1000);
assert.deepEqual(restoredPort.questions[0].correct, oldCorrect);
assert.deepEqual(restoredPort.userAnswers[portQuestion.id], oldCorrect);
assert.equal(restoredPort.questions[0].answers[oldCorrect[0]], '49152–65535');

const technicalTopics = {
  'gap-pack2-29': ['tcp-window-retransmit', ['TCP', 'FIN']],
  'tcpip-x03': ['tcpip-encapsulation', ['TCP', 'FCS', '802.1Q']],
  'l4-x05': ['l4-tcp', ['IANA']],
  'ts-x02': ['ts-method', ['ICMP', 'NAT']],
  'ts-x09': ['l3-arp', ['ARP', 'incomplete']],
  'l4-d04': ['l7-dns', ['TC', 'EDNS', 'AXFR', 'IXFR']],
  'tcpip-d01': ['tcpip-encapsulation', ['IPv4', 'TTL', 'Ethernet']],
  'ts-d05': ['ts-method', ['uRPF', 'FIB']],
  'l3-vrrp02': ['l3-vrrp', ['VRRP', 'VRID', 'VIP']],
};
for (const [id, [lessonId, terms]] of Object.entries(technicalTopics)) {
  const question = ALL_QUESTIONS.find(q => q.id === id);
  const detail = getQuestionDeepDive(question);
  assert.ok(detail.hasIndividualDeep, id);
  assert.ok(detail.deepAnalysis.length > 100, id);
  assert.ok(detail.professional?.deep.length > 100, id);
  assert.ok(detail.glossaryInProfessional, id);
  assert.ok(splitGlossaryText(detail.deepAnalysis).some(t => t.term), id);
  assert.ok(splitGlossaryText(detail.professional.deep).some(t => t.term), id);
  const lesson = getLessonForQuestion(id);
  assert.equal(lesson?.id, lessonId, id);
  for (const tag of [...lesson.terms, ...(lesson.professional?.terms ?? [])]) {
    assert.ok(GLOSSARY[tag]?.description && GLOSSARY[tag].relatesTo, `${lessonId}: ${tag}`);
  }
  for (const term of terms) {
    assert.ok(GLOSSARY_TOOLTIPS[term]?.summary, term);
    assert.equal(splitGlossaryText(term)[0]?.term, term);
  }
}
console.log('PASS: nine linked lessons, plain/pro explanations, scoped tooltips and tag cards');

const diagnosticLevel = getLearningLevelPool('mixed', 4);
assert.equal(diagnosticLevel.length, 88);
for (const question of diagnosticLevel) {
  const detail = getQuestionDeepDive(question);
  assert.ok(detail.hasIndividualDeep, question.id);
  assert.ok(detail.professional?.brief.trim() && detail.professional.deep.trim(), question.id);
}
console.log('PASS: all 88 Diagnostics questions have a visible professional explanation');

const { PREVIOUS_DIAGNOSTIC_QUESTIONS } = await bundleEntry(
  'src/data/previousDiagnosticQuestions.ts', 'previous-diagnostic-questions.mjs',
);
for (const [id, previous] of Object.entries(PREVIOUS_DIAGNOSTIC_QUESTIONS)) {
  const current = ALL_QUESTIONS.find(q => q.id === id);
  assert.notEqual(current.text, previous.text);
  assert.deepEqual(current.correct, previous.correct);
  assert.equal(current.answers.length, 4);
  const detail = getQuestionDeepDive(current);
  assert.equal(detail.glossaryInProfessional, true);
  assert.ok(getLessonForQuestion(id));
  assert.ok(splitGlossaryText(detail.professional.deep).some(token => token.term));
  assert.match(detail.deepAnalysis, /\n\n[\s\S]+\n\n/);
  const historical = { ...current, ...previous };
  const historicalDetail = getQuestionDeepDive(historical);
  assert.ok(historicalDetail.professional.deep);
  assert.notEqual(historicalDetail.professional.deep, detail.professional.deep);
  for (const question of [current, historical]) for (const shuffled of [false, true]) {
    const startTime = 1_800_000_000_000;
    const saved = {
      ...(shuffled ? prepareAttemptQuestions([question], seeded(17)) : { questions: [question] }),
      currentIndex: 0, userAnswers: {}, submittedQuestions: {}, startTime,
      isCompleted: false, mode: 'mixed', feedbackMode: 'exam', learningLevel: 4,
    };
    const confirmed = confirmAnswer(saved, saved.questions[0].correct, startTime + 100);
    const restored = restoreSession(JSON.stringify(confirmed), ALL_QUESTIONS, startTime + 200);
    assert.deepEqual(restored?.questions, confirmed.questions);
    assert.deepEqual(restored?.userAnswers, confirmed.userAnswers);
    if (question === historical) {
      const malformed = { ...confirmed, questions: confirmed.questions.map(q => ({
        ...q, answers: ['altered', ...q.answers.slice(1)],
      })) };
      assert.equal(restoreSession(JSON.stringify(malformed), ALL_QUESTIONS, startTime + 200), null);
    }
  }
}
for (const term of ['PMTUD', 'SIP', 'RTP', 'SDP']) {
  assert.ok(GLOSSARY_TOOLTIPS[term]?.summary);
  assert.equal(splitGlossaryText(term)[0]?.term, term);
}
for (const [left, right, family] of [
  ['l4-08', 'l4-x01', 'tcp-rst-meaning'],
  ['tcp-02', 'tcpip-x02', 'tcpip-application-mapping'],
]) {
  const siblings = [left, right].map(id => ALL_QUESTIONS.find(q => q.id === id));
  assert.ok(siblings.every(q => q.family === family));
  const alternative = getLearningLevelPool('mixed', 1).find(q => !q.image && q.family !== family);
  for (let seed = 1; seed <= 20; seed++) {
    const sample = getLearningLevelQuestions('mixed', 2, seeded(seed), 1, [...siblings, alternative]);
    assert.ok(sample.includes(alternative));
    assert.equal(sample.filter(q => q.family === family).length, 1);
  }
}
console.log('PASS: revised diagnostics preserve saved answers and duplicate families get one slot when alternatives exist');

// Diagnostic pack #177 must surface both layers, a return link from its lesson,
// at least one working glossary term in each layer, and a practice task.
const diagnosticPack = diagnosticLevel.filter(q => q.id.startsWith('diag177-'));
const expectedPractices = new Map([
  ['diag177-ipv4-onlink-return', 'packet'],
  ['diag177-dhcp-renew-rebind', 'dhcp'],
  ['diag177-nat-return-path', 'nat'],
]);
assert.equal(diagnosticPack.length, 12);
assert.equal(expectedPractices.size, diagnosticPack.filter(q => getQuestionDeepDive(q).practiceLink).length);
for (const q of diagnosticPack) {
  const detail = getQuestionDeepDive(q);
  const lesson = getLessonForQuestion(q.id);
  assert.ok(lesson?.relatedQuestionIds.includes(q.id), q.id);
  assert.equal(q.answers.length, 4, q.id);
  assert.equal(new Set(q.answers).size, 4, q.id);
  assert.equal(q.correct.length, 1, q.id);
  assert.ok(!q.text.includes(q.answers[q.correct[0]]), q.id);
  assert.equal(detail.deepAnalysis.split('\n\n').length, 3, q.id);
  assert.ok(detail.professional?.deep.includes('\n\nПрактика. '), q.id);
  assert.ok(detail.glossaryInProfessional, q.id);
  assert.ok(splitGlossaryText(detail.deepAnalysis).some(token => token.term), q.id + ' plain glossary');
  assert.ok(splitGlossaryText(detail.professional.deep).some(token => token.term), q.id + ' pro glossary');
  assert.equal(detail.practiceLink, expectedPractices.get(q.id), q.id);
  assert.ok(!getTestingPool(q.group, 'beginner').includes(q), q.id);
  assert.ok(!getTestingPool(q.group, 'in-depth').includes(q), q.id);
  assert.ok(!getTestingPool(q.group, 'applied').includes(q), q.id);
}
console.log('PASS: issue #177 pack has 12 linked diagnostics with both layers, glossary, and practice tasks');

const monitoringPack = ALL_QUESTIONS.filter(q => q.id.startsWith('mon-'));
assert.equal(monitoringPack.length, 20);
for (const q of monitoringPack) {
  const detail = getQuestionDeepDive(q);
  const lesson = getLessonForQuestion(q.id);
  assert.ok(lesson?.relatedQuestionIds.includes(q.id), q.id);
  assert.equal(q.answers.length, 4, q.id);
  assert.equal(new Set(q.answers).size, 4, q.id);
  assert.equal(q.correct.length, 1, q.id);
  assert.ok(!q.text.includes(q.answers[q.correct[0]]), q.id);
  assert.ok(q.remember?.trim(), q.id + ' remember');
  assert.equal(detail.deepAnalysis.split('\n\n').length, 3, q.id);
  assert.ok(detail.professional?.deep.includes('\n\nПрактика. '), q.id);
  assert.ok(detail.glossaryInProfessional, q.id);
  assert.ok(splitGlossaryText(detail.deepAnalysis).some(token => token.term), q.id + ' plain glossary');
  assert.ok(splitGlossaryText(detail.professional.deep).some(token => token.term), q.id + ' pro glossary');
}
console.log('PASS: monitoring pack has 20 linked SNMP/Syslog/Zabbix/Diagnostics questions with both layers, hints, and glossary');

const wifiPack = ALL_QUESTIONS.filter(q => q.id.startsWith('wifi-'));
assert.equal(wifiPack.length, 20);
for (const q of wifiPack) {
  const detail = getQuestionDeepDive(q);
  const lesson = getLessonForQuestion(q.id);
  assert.ok(lesson?.relatedQuestionIds.includes(q.id), q.id);
  assert.equal(q.answers.length, 4, q.id);
  assert.equal(new Set(q.answers).size, 4, q.id);
  assert.equal(q.correct.length, 1, q.id);
  assert.ok(!q.text.includes(q.answers[q.correct[0]]), q.id);
  assert.ok(q.remember?.trim(), q.id + ' remember');
  assert.equal(detail.deepAnalysis.split('\n\n').length, 3, q.id);
  assert.ok(detail.professional?.deep.includes('\n\nПрактика. '), q.id);
  assert.ok(detail.glossaryInProfessional, q.id);
  assert.ok(splitGlossaryText(detail.deepAnalysis).some(token => token.term), q.id + ' plain glossary');
  assert.ok(splitGlossaryText(detail.professional.deep).some(token => token.term), q.id + ' pro glossary');
}
console.log('PASS: wifi pack has 20 linked 802.11/roaming/security/diagnostics questions with both layers, hints, and glossary');

const expertPack225 = ALL_QUESTIONS.filter(q => q.id.startsWith('exp225-'));
assert.equal(expertPack225.length, 20);
assert.equal(expertPack225.filter(q => registry[q.id].learningLevel === 4).length, 8);
assert.equal(expertPack225.filter(q => registry[q.id].learningLevel === 5).length, 12);
for (const q of expertPack225) {
  const detail = getQuestionDeepDive(q);
  const lesson = getLessonForQuestion(q.id);
  assert.ok(lesson?.relatedQuestionIds.includes(q.id), q.id);
  assert.equal(q.answers.length, 4, q.id);
  assert.equal(new Set(q.answers).size, 4, q.id);
  assert.equal(q.correct.length, 1, q.id);
  assert.ok(!q.text.includes(q.answers[q.correct[0]]), q.id);
  assert.ok(q.remember?.trim(), q.id + ' remember');
  assert.equal(detail.deepAnalysis.split('\n\n').length, 3, q.id);
  assert.ok(detail.professional?.deep.includes('\n\nПрактика. '), q.id);
  assert.ok(detail.glossaryInProfessional, q.id);
  assert.ok(splitGlossaryText(detail.deepAnalysis).some(token => token.term), q.id + ' plain glossary');
  assert.ok(splitGlossaryText(detail.professional.deep).some(token => token.term), q.id + ' pro glossary');
}
console.log('PASS: issue #225 expert pack has 20 linked L4/L5 diagnostics (8 L4, 12 L5) with both layers, hints, and glossary');

const expertPack = getLearningLevelPool('mixed', 5).filter(q => q.id.startsWith('expert177-'));
assert.equal(expertPack.length, 3);
for (const q of expertPack) {
  const detail = getQuestionDeepDive(q);
  const lesson = getLessonForQuestion(q.id);
  assert.equal(q.answers.length, 4, q.id);
  assert.equal(new Set(q.answers).size, 4, q.id);
  assert.equal(q.correct.length, 1, q.id);
  assert.equal(lesson?.difficulty, 'advanced', q.id);
  assert.equal(lesson?.category, 'Экспертные кейсы', q.id);
  assert.ok(lesson.relatedQuestionIds.includes(q.id), q.id);
  assert.ok(lesson.sources.every(s => s.includes('https://')), q.id);
  for (const blocks of [lesson.blocks, lesson.professional?.blocks]) {
    assert.ok(blocks?.some(block => block.heading.startsWith('Практика')), q.id);
    assert.ok(blocks.some(block => splitGlossaryText(block.body).some(token => token.term)), q.id);
    if (q.id === 'expert177-dnat-reply-policy') {
      assert.ok(blocks.some(block => block.practiceLink === 'nat'));
      assert.equal(detail.practiceLink, 'nat');
    }
  }
  assert.equal(detail.deepAnalysis.split('\n\n').length, 3, q.id);
  assert.ok(detail.professional?.deep && detail.glossaryInProfessional, q.id);
  assert.ok(splitGlossaryText(detail.deepAnalysis).some(token => token.term), q.id);
  assert.ok(splitGlossaryText(detail.professional.deep).some(token => token.term), q.id);
  for (const difficulty of ['basic', 'advanced', 'mixed']) {
    assert.ok(getTrialExamQuestions(difficulty, seeded(29)).every(question => question.id !== q.id), q.id);
  }
}
assert.ok(GLOSSARY.DNAT.description && GLOSSARY.DNAT.relatesTo);
assert.equal(splitGlossaryText('DNAT')[0]?.term, 'DNAT');
console.log('PASS: three Expert incidents have layered explanations and advanced lessons with practice');
