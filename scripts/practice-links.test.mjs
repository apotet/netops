import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const outfile = resolve('scripts/.cache/practice-links.mjs');
mkdirSync(resolve('scripts/.cache'), { recursive: true });
await build({ stdin: { contents: `
  export { ALL_QUESTIONS } from './src/data/questionsData';
  export { getQuestionDeepDive } from './src/data/questionExplanations';
  export { PRACTICE_DESTINATIONS } from './src/data/practiceLinks';
  export { PracticeHub } from './src/components/PracticeHub';
  export { PracticeLinkButton } from './src/components/PracticeLinkButton';
  export { ExamReview } from './src/components/ExamReview';
`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile,
  external: ['react', 'react-dom', 'react-dom/server', 'lucide-react', 'motion/react'], logLevel: 'silent' });
const { ALL_QUESTIONS, getQuestionDeepDive, PRACTICE_DESTINATIONS, PracticeHub, PracticeLinkButton, ExamReview } = await import(pathToFileURL(outfile).href);
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const expected = {
  vlan: ['l2-06', 'l2-08', 'gen-osi-a-6', 'review-lldp-8', 'l12-d02'],
  'cli-vlan': ['new-ts-vlan', 'ts-x07'],
  'cli-trunk': ['gen-diag-10', 'l2-07'],
  'cli-gateway': ['tr-10', 'l3-16'],
  packet: ['l3-03', 'tcp-05', 'tcpip-d01', 'tcpip-x26', 'new-tcpip-router', 'new-l3-arp-scope', 'new-l3-next-hop', 'tcpip-x10'],
  dhcp: ['gen-transport-7', 'l7-03'],
  nat: ['l3-15', 'l3-d05', 'tcpip-x27'],
  tcp: ['l4-02', 'l4-x06'],
};
const wanted = new Map(Object.entries(expected).flatMap(([link, ids]) => ids.map(id => [id, link])));
for (const q of ALL_QUESTIONS) {
  const deep = getQuestionDeepDive(q);
  assert.equal(deep.practiceLink, wanted.get(q.id), q.id + ': deliberate coverage only');
  if (deep.practiceLink) {
    assert.ok(deep.hasIndividualDeep, q.id);
    assert.ok(PRACTICE_DESTINATIONS[deep.practiceLink], q.id);
  }
}
// These adjacent topics require behaviour the current stands do not model.
for (const id of ['l7-02', 'new-l7-dhcp', 'gen-transport-8', 'gen-port-7', 'l57-x07', 'l57-x08', 'l12-d03', 'l12-x06', 'l4-fr01', 'l4-09']) {
  assert.equal(getQuestionDeepDive(ALL_QUESTIONS.find(q => q.id === id)).practiceLink, undefined, id);
}
assert.equal(render(PracticeLinkButton, { onOpenPractice() {} }), '');
assert.equal(render(PracticeLinkButton, { link: 'tcp' }), '', 'no inert button without a navigation callback');
const selected = [];
for (const link of Object.keys(PRACTICE_DESTINATIONS)) {
  PracticeLinkButton({ link, onOpenPractice: value => selected.push(value) }).props.onClick();
}
assert.deepEqual(selected, Object.keys(PRACTICE_DESTINATIONS));

const activeButtons = html => [...html.matchAll(/<button\b[^>]*aria-pressed="true"[^>]*>([\s\S]*?)<\/button>/g)].map(m => m[1].replace(/<[^>]*>/g, ''));
const selectedLabels = {
  vlan: 'VLAN &amp; Trunk', packet: 'Путь пакета', dhcp: 'DHCP', nat: 'NAT/PAT', tcp: 'TCP',
  'cli-vlan': 'Access VLAN на порту', 'cli-trunk': 'Trunk 802.1Q', 'cli-gateway': 'IP-адрес и маршрут по умолчанию',
};
for (const [link, title] of Object.entries(selectedLabels)) {
  const active = activeButtons(render(PracticeHub, { initialPracticeLink: link }));
  assert.ok(active.some(text => text.includes(title)), link + ': selected stand/subtab/scenario');
}
assert.ok(activeButtons(render(PracticeHub, { initialSimulator: 'journey' })).some(text => text.includes('Путь пакета')), 'existing initialSimulator API retained');

for (const id of [...wanted.keys(), 'l4-fr01']) {
  const question = ALL_QUESTIONS.find(q => q.id === id);
  const session = { questions: [question], userAnswers: { [id]: question.correct }, submittedQuestions: { [id]: true },
    isCompleted: true, currentIndex: 0, feedbackMode: 'exam', mode: 'mixed', startTime: 1, attemptId: id };
  const html = render(ExamReview, { session, onExit() {}, onOpenPractice() {} });
  assert.equal(html.includes('Открыть стенд'), wanted.has(id), id + ': review button visibility');
}
console.log(`PASS: ${wanted.size} deliberate practice links, all 8 destinations, callback values and review button visibility`);
