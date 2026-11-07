import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = resolve(root, 'scripts/.cache/study-text-tests.mjs');
mkdirSync(dirname(outfile), { recursive: true });
await build({ stdin: { contents: `
  export { ALL_QUESTIONS } from './src/data/questionsData';
  export { LESSONS } from './src/data/lessons';
  export { getQuestionDeepDive } from './src/data/questionExplanations';
  export { getStudyTextMode, setStudyTextMode, STUDY_TEXT_MODE_KEY } from './src/utils/studyTextMode';
  export { LessonView } from './src/components/LessonView';
  export { TheoryRazbory } from './src/components/TheoryRazbory';
  export { ExamReview } from './src/components/ExamReview';
`, resolveDir: root, sourcefile: 'study-text-tests.ts' },
  bundle: true, platform: 'node', format: 'esm', outfile,
  external: ['react', 'react-dom/server', 'lucide-react'], logLevel: 'silent' });
const api = await import(pathToFileURL(outfile).href);
const { ALL_QUESTIONS, LESSONS, getQuestionDeepDive, getStudyTextMode, setStudyTextMode, STUDY_TEXT_MODE_KEY,
  LessonView, TheoryRazbory, ExamReview } = api;
const { default: React } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));

const ids = ['l12-lldp01', 'l12-dot1x01', 'l2-09', 'l12-x01', 'l12-x02', 'l12-d01', 'l12-d05',
  'l2-06', 'l2-07', 'l2-08', 'eth-vlan-benefits', 'l12-x08', 'l12-d03', 'gen-osi-a-5', 'gen-osi-a-6', 'review-ospf-27', 'review-ospf-28', 'l3-15', 'l3-d05', 'tcpip-x27', 'l57-x02', 'ts-x03', 'l4-d04', 'l57-d03', 'new-ts-dns', 'tcpip-x24', 'l57-x07', 'l57-x08', 'l57-d05', 'l12-ds01', 'l12-ds02', 'l12-ds03', 'l12-ds04', "l4-10", "l4-fr01", "l4-d01", "l4-d02", "l4-d05", "l4-d06", "tr-06", "tr-08", "l3-03", "l2-10", "l2-11", "new-l3-arp-scope", "new-l3-next-hop", "gen-diag-9", "ts-x09", "l3-d07", "gen-diag-4", "review-ndp-1", "review-ndp-3", "review-slaac-4", "review-slaac-5", "review-slaac-6", "l3-d06"];
const diagnosticDualIds = ["tr-01","tr-02","tr-04","tr-09","tr-11","tr-12","gen-diag-0","gen-diag-2","gen-diag-5","gen-diag-10","gen-diag-13","new-ts-mtu","new-ts-duplex","review-lldp-8","review-dot1x-20","review-syslog-25","review-poe-30","review-osi-35","ts-x01","ts-x02","ts-x06","ts-x07","ts-x08","ts-x10","ts-x11","ts-x13","ts-d01","ts-d02","ts-d03","ts-d04","ts-d05","ts-d06","ts-d07","ts-d08","l12-copp01","l12-storm01","ts-pfc01","ts-linux01","l1-03","l1-04","l1-06","tcpip-d02","tcpip-d04","l57-d01","l57-d02"];
ids.push(...diagnosticDualIds, 'l12-ps01', 'l12-ps02', 'l12-ps03', 'review-qos-22', 'l12-x06', 'tcpip-d05', 'l3-vrrp01', 'l3-vrrp02', 'l3-vrrp03', 'l3-vrrp04', 'l3-rpki01', "l1-01", "l1-02", "l1-05", "l2-04", "gen-osi-a-3", "gen-osi-a-4", "k-11", "l12-x05", "l12-d06", "tcpip-x06", "tcp-05", "new-tcpip-router");
const tcpipModelDualIds = ["tcp-03", "tcp-06", "review-osi-34", "tcpip-x09", "tcpip-x28", "tcpip-d03", "tcpip-d01", "tcpip-x26"];
ids.push(...tcpipModelDualIds);
const pduDualIds = ["l2-01", "k-09", "k-10", "tcpip-x20", "tcpip-x11", "new-tcpip-trailer"];
ids.push(...pduDualIds);
const tcpLossDualIds = ["l4-09", "new-l4-retransmit", "gen-osi-a-13"];
ids.push(...tcpLossDualIds);
const tlsDualIds = ["l57-x12", "l57-x18"];
ids.push(...tlsDualIds);
const tlsMeaningOnlyIds = ["new-l7-tls", "l57-x05", "l57-x06"];
const diagnosticSkippedIds = ["ts-pack1-01","ts-pack1-02","ts-pack1-03","ts-pack1-07","ts-pack1-08","ts-pack1-09","ts-pack1-10","ts-pack1-11","ts-pack1-12","ts-pack1-13","ts-pack1-14","ts-pack1-15","ts-pack1-16","ts-pack1-17","ts-pack1-18","ts-pack1-19"];
for (const id of diagnosticSkippedIds) {
  const q = ALL_QUESTIONS.find(q => q.id === id);
  assert.ok(q, id);
  assert.equal(getQuestionDeepDive(q).hasIndividualDeep, false, 'no new explanation for skipped question: ' + id);
  assert.equal(getQuestionDeepDive(q).professional, undefined);
}
assert.deepEqual(ALL_QUESTIONS.filter(q => getQuestionDeepDive(q).professional).map(q => q.id).sort(), [...ids].sort());
assert.deepEqual(LESSONS.filter(l => l.professional).map(l => l.id).sort(), ['l2-access-auth', 'l2-access-guard', 'l2-ethernet', 'l2-stp', 'l2-vlan', 'l3-arp', 'l3-ipv6', 'l3-nat', 'l3-ospf', 'l3-rpki', 'l3-vrrp', 'l4-tcp', 'l4-tcp-loss', 'l7-dhcp', 'l7-dns', 'osi-pdu', 'tcpip-model', 'tls-sni', 'ts-copp-storm', 'ts-method']);
for (const id of ids) {
  const q = ALL_QUESTIONS.find(q => q.id === id), deep = getQuestionDeepDive(q);
  assert.ok(deep.professional.brief && deep.professional.deep);
  assert.match(deep.professional.sourceCommit, /^[a-f0-9]{40}$/);
  assert.equal(deep.deepAnalysis.split(/\n\s*\n/).length, 3, id + ': current plain wording retained');
  assert.notEqual(deep.professional.deep, deep.deepAnalysis);
}
assert.equal(getQuestionDeepDive(ALL_QUESTIONS.find(q => q.id === 'review-dot1x-19')).professional, undefined, 'MISSING history stays missing');

const ospfMeaningOnly = getQuestionDeepDive(ALL_QUESTIONS.find(q => q.id === 'review-ospf-26'));
assert.ok(ospfMeaningOnly.hasIndividualDeep);
assert.equal(ospfMeaningOnly.deepAnalysis.split(/\n\s*\n/).length, 3);
assert.equal(ospfMeaningOnly.professional, undefined, 'no invented professional OSPF text');

const dnsMeaningOnlyIds = ["l4-07","l7-04","gen-port-6","gen-transport-6","gen-osi-a-19","new-l7-dns","tcpip-x25","l57-x01","l57-x11","l57-x13","l57-x20","ts-pack1-05","ts-pack1-06","ts-pack1-20","gen-diag-12","tcpip-x12"];
for (const id of dnsMeaningOnlyIds) {
  const deep = getQuestionDeepDive(ALL_QUESTIONS.find(q => q.id === id));
  assert.ok(deep.hasIndividualDeep, id);
  assert.equal(deep.deepAnalysis.split(/\n\s*\n/).length, 3);
  assert.equal(deep.professional, undefined, 'no invented professional DNS text: ' + id);
}

const dhcpMeaningOnlyIds = ["l7-02","l7-03","gen-port-7","gen-transport-7","gen-port-8","gen-transport-8","new-l7-dhcp","gen-diag-7"];
for (const id of dhcpMeaningOnlyIds) {
  const deep = getQuestionDeepDive(ALL_QUESTIONS.find(q => q.id === id));
  assert.ok(deep.hasIndividualDeep, id);
  assert.equal(deep.deepAnalysis.split(/\n\s*\n/).length, 3);
  assert.equal(deep.professional, undefined, 'no invented professional DHCP text: ' + id);
}

const tcpMeaningOnlyIds = ["l4-02", "l4-03", "l4-08", "l4-x01", "l4-x02", "l4-x06", "tcpip-x22"];
for (const id of tcpMeaningOnlyIds) {
  const deep = getQuestionDeepDive(ALL_QUESTIONS.find(q => q.id === id));
  assert.ok(deep.hasIndividualDeep, id);
  assert.equal(deep.deepAnalysis.split(/\n\s*\n/).length, 3);
  assert.equal(deep.professional, undefined, 'no invented professional TCP text: ' + id);
}

const arpMeaningOnlyIds = ["tcpip-x10","ts-pack1-04"];
for (const id of arpMeaningOnlyIds) {
  const deep = getQuestionDeepDive(ALL_QUESTIONS.find(q => q.id === id));
  assert.ok(deep.hasIndividualDeep, id);
  assert.equal(deep.deepAnalysis.split(/\n\s*\n/).length, 3);
  assert.equal(deep.professional, undefined, 'no invented professional ARP text: ' + id);
}

const ipv6MeaningOnlyIds = ["review-ndp-2"];
for (const id of ipv6MeaningOnlyIds) {
  const deep = getQuestionDeepDive(ALL_QUESTIONS.find(q => q.id === id));
  assert.ok(deep.hasIndividualDeep, id);
  assert.equal(deep.deepAnalysis.split(/\n\s*\n/).length, 3);
  assert.equal(deep.professional, undefined, 'no invented professional IPv6 text: ' + id);
  assert.ok(deep.ipv6Practice?.enabled, 'IPv6 trainer link available: ' + id);
}

const qosMeaningOnlyIds = ['review-qos-21'];
for (const id of qosMeaningOnlyIds) {
  const deep = getQuestionDeepDive(ALL_QUESTIONS.find(q => q.id === id));
  assert.ok(deep.hasIndividualDeep, id);
  assert.equal(deep.deepAnalysis.split(/\n\s*\n/).length, 3);
  assert.equal(deep.professional, undefined, 'no invented professional QoS text: ' + id);
}
const ethernetMeaningOnlyIds = ["l2-02", "l2-03", "l2-05", "new-l2-full-duplex", "eth-std-8023", "eth-min-frame", "eth-collision"];
for (const id of ethernetMeaningOnlyIds) {
  const deep = getQuestionDeepDive(ALL_QUESTIONS.find(q => q.id === id));
  assert.ok(deep.hasIndividualDeep, id);
  assert.equal(deep.deepAnalysis.split(/\n\s*\n/).length, 3);
  assert.equal(deep.professional, undefined, 'no invented professional Ethernet text: ' + id);
}

// Model questions without an individual explanation remain absent.
for (const id of ['tcp-01', 'tcp-02', 'tcp-04', 'tcp-08', 'tcpip-x01', 'tcpip-x02', 'tcpip-x03', 'tcpip-x04', 'tcpip-x05', 'tcpip-x13', 'tcpip-x15', 'k-05', 'k-06', 'k-07', 'new-tcpip-payload']) {
  const deep = getQuestionDeepDive(ALL_QUESTIONS.find(q => q.id === id));
  assert.equal(deep.hasIndividualDeep, false, id);
  assert.equal(deep.professional, undefined, id);
}

for (const id of ['gen-osi-a-12', 'k-06', 'k-07', 'k-08', 'tcpip-x04', 'tcpip-x15', 'new-tcpip-payload', 'new-l4-udp-pdu']) {
  const deep = getQuestionDeepDive(ALL_QUESTIONS.find(q => q.id === id));
  assert.equal(deep.hasIndividualDeep, false, id);
  assert.equal(deep.professional, undefined, id);
}

for (const id of tlsMeaningOnlyIds) {
  const deep = getQuestionDeepDive(ALL_QUESTIONS.find(q => q.id === id));
  assert.ok(deep.hasIndividualDeep, id);
  assert.equal(deep.deepAnalysis.split(/\n\s*\n/).length, 3, id);
  assert.equal(deep.professional, undefined, id);
}
// CoPP/storm explanations already have both styles; keep them connected.
for (const id of ['l12-copp01', 'l12-storm01']) {
  const q = ALL_QUESTIONS.find(q => q.id === id), deep = getQuestionDeepDive(q);
  assert.ok(deep.professional?.deep, id);
  assert.doesNotMatch(deep.deepAnalysis.split(/\n\s*\n/)[0], /CoPP|CPP|storm[ -]?control/i);
}
const coppLesson = LESSONS.find(l => l.id === 'ts-copp-storm');
for (const block of coppLesson.blocks) {
  assert.equal(block.body.split(/\n\s*\n/).length, 3, block.heading);
  assert.doesNotMatch(block.body.split(/\n\s*\n/)[0], /CoPP|CPP|storm[ -]?control/i);
}

const theoryProps = { onNavigateToIpv4() {}, onNavigateToIpv6() {} };
for (const id of ['l2-access-auth', 'l2-access-guard', 'l2-ethernet', 'l2-stp', 'l2-vlan', 'l3-arp', 'l3-ipv6', 'l3-nat', 'l3-ospf', 'l3-rpki', 'l3-vrrp', 'l4-tcp', 'l4-tcp-loss', 'l7-dhcp', 'l7-dns', 'osi-pdu', 'tcpip-model', 'tls-sni', 'ts-copp-storm', 'ts-method']) {
  const l = LESSONS.find(l => l.id === id), html = render(LessonView, { lesson: l, onBack() {} });
  assert.ok(html.includes('Стиль объяснения') && html.includes('По делу'));
  assert.ok(html.includes(l.blocks[0].heading), 'default is meaning, including base');
}
const otherLesson = LESSONS.find(l => !l.professional);
assert.ok(!render(LessonView, { lesson: otherLesson, onBack() {} }).includes('Стиль объяснения'));
const missingHtml = render(TheoryRazbory, { ...theoryProps, initialQuestionId: 'review-dot1x-19' });
assert.ok(!missingHtml.includes('Стиль объяснения'));
for (const id of [...ids, ...tlsMeaningOnlyIds, 'review-dot1x-19', 'review-ospf-26', ...dnsMeaningOnlyIds, ...dhcpMeaningOnlyIds, ...tcpMeaningOnlyIds, ...arpMeaningOnlyIds, ...ipv6MeaningOnlyIds, ...qosMeaningOnlyIds, ...ethernetMeaningOnlyIds]) {
  const q = ALL_QUESTIONS.find(q => q.id === id);
  const session = { questions: [q], currentIndex: 0, userAnswers: { [id]: q.correct }, submittedQuestions: { [id]: true },
    startTime: Date.now(), isCompleted: true, mode: 'mixed', feedbackMode: 'exam', difficulty: 'beginner' };
  const html = render(ExamReview, { session, onExit() {} });
  assert.equal(html.includes('Стиль объяснения'), ids.includes(id));
  assert.ok(html.includes('Почему так') && html.includes('Ваш выбор'), 'review/scoring context retained');
}

// A shared tab-session preference survives component remounts and a reloaded module.
assert.equal(getStudyTextMode(), 'meaning', 'SSR/default is meaning');
const data = new Map();
const target = new EventTarget();
target.sessionStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
globalThis.window = target;
assert.equal(getStudyTextMode(), 'meaning');
let notified = 0;
target.addEventListener('osi-study-text-mode-change', () => notified++);
setStudyTextMode('professional');
assert.equal(data.get(STUDY_TEXT_MODE_KEY), 'professional');
assert.equal(getStudyTextMode(), 'professional');
assert.equal(notified, 1);
const reloaded = await import(pathToFileURL(outfile).href + '?reload=1');
assert.equal(reloaded.getStudyTextMode(), 'professional');
render(TheoryRazbory, { ...theoryProps, initialQuestionId: 'review-dot1x-19' });
assert.equal(getStudyTextMode(), 'professional', 'missing text does not reset the choice for the next pilot');
setStudyTextMode('meaning');
assert.equal(getStudyTextMode(), 'meaning');
target.sessionStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
setStudyTextMode('professional');
assert.equal(getStudyTextMode(), 'professional', 'storage-denied fallback still works in the tab');
delete globalThis.window;
console.log('PASS: study text lessons and dual deep dives, MISSING toggle hidden, default meaning, tab persistence, review UI preserved');
