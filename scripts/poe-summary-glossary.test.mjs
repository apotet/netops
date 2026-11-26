// Regression: PoE lesson hashtags resolve to glossary cards in both reading modes.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

mkdirSync(resolve('scripts/.cache'), { recursive: true });
const outfile = resolve('scripts/.cache/poe-summary-glossary.mjs');
await build({
  stdin: {
    contents: `
      import React from 'react';
      import { renderToStaticMarkup } from 'react-dom/server';
      import { FormattedExplanation } from './src/components/FormattedExplanation';
      import { getLesson } from './src/data/lessons';
      import { GLOSSARY, GLOSSARY_TOOLTIPS } from './src/data/glossary';
      import { LessonKnowledgeCheckExplanation } from './src/components/LessonKnowledgeCheck';
      import { LessonReviewBadge } from './src/components/LessonReviewBadge';
      import { getLessonReviewStatus } from './src/data/lessons/reviewStatus';
      import { splitGlossaryText } from './src/utils/glossaryText';
      export { getLesson, GLOSSARY, GLOSSARY_TOOLTIPS, splitGlossaryText, getLessonReviewStatus };
      export const render = (text, options = {}) => renderToStaticMarkup(React.createElement(FormattedExplanation, { text, ...options }));
      export const renderLessonBadge = (lessonId) => renderToStaticMarkup(React.createElement(LessonReviewBadge, { lessonId }));
      export const renderCheckExplanation = (explanation, glossaryScope) =>
        renderToStaticMarkup(React.createElement(LessonKnowledgeCheckExplanation, { explanation, glossaryScope }));
    `,
    resolveDir: process.cwd(),
    sourcefile: 'poe-summary-glossary-entry.tsx',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  external: ['react', 'react-dom', 'react-dom/server', 'lucide-react'],
  logLevel: 'silent',
});
const { getLesson, GLOSSARY, GLOSSARY_TOOLTIPS, splitGlossaryText, getLessonReviewStatus, render, renderCheckExplanation, renderLessonBadge } = await import(pathToFileURL(outfile).href);
const budget = getLesson('l1-poe-budget');
assert.ok(budget && budget.professional);
assert.ok(budget.professional.summary.includes('PSE') && budget.professional.summary.includes('PD'));
const professionalSummary = render(budget.professional.summary);
assert.ok(!professionalSummary.includes('data-glossary-term="802.3af"'), 'summary must not show isolated standard tooltip');
assert.ok(professionalSummary.includes('data-glossary-term="PSE"'), 'PSE hint retained in summary');
for (const term of ['802.3af', '802.3at', '802.3bt']) {
  assert.ok(render(budget.blocks[0].body).includes('data-glossary-term="' + term + '"'), term + ' hint in plain explanation');
  assert.ok(budget.professional.blocks[0].cheatsheet?.alt.includes(term), term + ' in professional cheat sheet');
}
assert.ok(render(budget.professional.blocks[0].body).includes('data-glossary-term="802.3af"'), '802.3af hint in professional explanation');

assert.ok(GLOSSARY.LLDP?.description.includes('Link Layer Discovery Protocol'), 'LLDP hashtag must resolve to an explicit protocol definition');
assert.ok(GLOSSARY.LLDP?.relatesTo.includes('питания'), 'LLDP glossary must have useful PoE context');

const requiredTags = {
  'l1-poe-budget': {
    plain: ['802.3af', '802.3at', '802.3bt'],
    professional: ['802.3af', '802.3at', '802.3bt', 'PoE-тестер', 'Allocated', 'Remaining'],
  },
  'l1-poe-injectors-splitters': {
    plain: ['DC-выход', 'полярность'],
    professional: ['DC-выход', 'Class', 'Type', 'полярность'],
  },
  'cli-poe-diagnostics': {
    plain: ['Available', 'Used', 'Remaining'],
    professional: ['Available', 'Used', 'Remaining', 'Allocated', 'Utilized', 'Measured', 'LLDP Power-via-MDI', 'power-deny'],
  },
  'l1-poe-screen-reading': {
    plain: ['802.3af', '802.3at', '802.3bt', 'PoE-тестер'],
    professional: ['802.3af', '802.3at', '802.3bt', 'PoE-тестер'],
  },
};

for (const [id, modes] of Object.entries(requiredTags)) {
  const lesson = getLesson(id);
  assert.ok(lesson, 'missing PoE lesson: ' + id);
  for (const [mode, required] of Object.entries(modes)) {
    const terms = mode === 'plain' ? lesson.terms : lesson.professional?.terms;
    assert.ok(terms, id + ' lacks ' + mode + ' terms');
    assert.equal(new Set(terms).size, terms.length, id + ' duplicate hashtag in ' + mode);
    for (const term of required) assert.ok(terms.includes(term), id + ' missing hashtag: ' + term + ' (' + mode + ')');
    for (const term of terms) {
      const entry = GLOSSARY[term];
      assert.ok(entry, id + ' has non-clickable hashtag: ' + term + ' (' + mode + ')');
      assert.ok(entry.description?.trim().length > 20, id + ' empty hashtag description: ' + term);
      assert.ok(entry.relatesTo?.trim().length > 10, id + ' empty hashtag relation: ' + term);
    }
  }
}
const injectors = getLesson('l1-poe-injectors-splitters');
const passiveChecklist = injectors.blocks.find(block => block.heading.includes('Проверка перед подключением'));
assert.ok(passiveChecklist?.body.includes('passive PoE'), 'passive PoE should occur in the injector checklist');
assert.ok(render(passiveChecklist.body, { glossaryScope: 'poe' }).includes('data-glossary-term="passive PoE"'),
  'passive PoE must open a glossary tooltip in the checklist');
assert.ok(render(budget.professional.blocks.find(b => b.heading.includes('Когда в цепи есть инжектор')).body, { glossaryScope: 'poe' })
  .includes('data-glossary-term="passive PoE"'), 'passive PoE must also be clickable in the budget lesson');

const reboot = budget.professional.blocks.find(block => block.heading.includes('Кейс: камера перезагружается'));
assert.ok(reboot?.body.includes('ΔU = I × R'), 'voltage drop formula must be present');
assert.ok(reboot?.body.includes('Pпотерь = I² × R'), 'power loss formula must name its result');
const formula = render(reboot.body, { glossaryScope: 'poe' });
for (const symbol of ['ΔU', 'I', 'R', 'I²', 'Pпотерь']) {
  assert.ok(formula.includes('data-glossary-term="' + symbol + '"'), symbol + ' should have inline hover/tap tooltip');
  assert.ok(GLOSSARY_TOOLTIPS[symbol]?.summary.length > 35, symbol + ' needs an explanation');
}
assert.ok(GLOSSARY_TOOLTIPS.R.summary.includes('обратный проводники'), 'R must represent the full current loop');
assert.ok(!render('I × R', { glossaryScope: 'poe' }).includes('data-glossary-term="I"'),
  'bare I and R outside exact formula should never be hotlinked');
assert.ok(!splitGlossaryText('I × R').some(part => part.term === 'I' || part.term === 'R'),
  'single-letter symbols should never be activated in general text');
assert.ok(!render('ΔU = I × R').includes('data-glossary-term="I"'),
  'formula hints must not leak into unrelated lessons');
// The knowledge-check feedback appears only after choosing an answer. Both professional
// explanations (questions 2 and 3) use lowercase allocated/remaining; their tooltips
// must resolve to canonical PoE glossary terms without changing the answer logic.
const feedbacks = budget.knowledgeCheck?.questions
  .filter(question => question.explanation.includes('allocated/remaining'));
assert.equal(feedbacks?.length, 2, 'PoE budget professional check has two allocated/remaining explanations');
for (const question of feedbacks) {
  const withPoEScope = renderCheckExplanation(question.explanation, 'poe');
  assert.ok(withPoEScope.includes('data-glossary-term="Allocated"'), 'allocated should be clickable in correct-answer feedback');
  assert.ok(withPoEScope.includes('data-glossary-term="Remaining"'), 'remaining should be clickable in correct-answer feedback');
  assert.equal((withPoEScope.match(/data-glossary-term=/g) || []).filter(Boolean).length >= 2, true,
    'both glossary triggers render in the checked answer');
  const withoutScope = renderCheckExplanation(question.explanation);
  assert.ok(!withoutScope.includes('data-glossary-term="Allocated"'), 'ordinary lessons must not get PoE-only allocated hint');
  assert.ok(!withoutScope.includes('data-glossary-term="Remaining"'), 'ordinary lessons must not get PoE-only remaining hint');
}
assert.ok(GLOSSARY_TOOLTIPS.Allocated?.summary.length > 25 && GLOSSARY_TOOLTIPS.Remaining?.summary.length > 25,
  'allocated and remaining popovers explain reserved versus available power');

// Regression: a PoE Alternative A/B expression must NEVER be explained as a DNS A record.
const pairsQuestion = budget.knowledgeCheck.questions.find(question =>
  question.explanation.includes('Переключение A/B'));
assert.ok(pairsQuestion, 'the PoE four-wire diagnostic question is present');
const pairsFeedback = renderCheckExplanation(pairsQuestion.explanation, 'poe');
assert.ok(pairsFeedback.includes('data-glossary-term="Переключение A/B"'),
  'the entire PoE switching phrase should show a contextual tooltip');
assert.ok(!pairsFeedback.includes('data-glossary-term="A"'),
  'the DNS A-record tooltip must never appear in the PoE A/B explanation');
assert.ok(GLOSSARY_TOOLTIPS['Переключение A/B']?.summary.includes('Alternative A'),
  'the tooltip must identify the PoE pairset, not DNS');
assert.ok(GLOSSARY['Переключение A/B'].description.includes('не каждый коммутатор'),
  'the reference must explain that changing power pairset is not universally available');
assert.ok(GLOSSARY['Переключение A/B'].description.includes('T568A/T568B'),
  'the reference must distinguish PoE alternatives from pinout standards');
const barePoEAB = renderCheckExplanation('Проверь A/B.', 'poe');
assert.ok(barePoEAB.includes('data-glossary-term="A/B"'),
  'standalone A/B in a PoE self-check must be treated as a single PoE term');
const bareNoScope = renderCheckExplanation('Проверь A/B.');
assert.ok(!bareNoScope.includes('data-glossary-term="A"') &&
  !bareNoScope.includes('data-glossary-term="A/B"'),
  'non-PoE A/B must not trigger PoE tooltip nor a DNS A-record tooltip');
assert.ok(render('DNS A и AAAA записи.').includes('data-glossary-term="A"'),
  'genuine DNS A records must still retain their existing glossary hint');

// User's explicit acceptance must update the actual visible badge, not just ROADMAP.
assert.equal(getLessonReviewStatus('l1-poe-budget'), 'approved', 'owner-approved PoE budget must be recorded');
assert.ok(renderLessonBadge('l1-poe-budget').includes('data-lesson-review-status="approved"'),
  'PoE budget lesson badge must display approved state');
assert.ok(renderLessonBadge('l1-poe-budget').includes('Проверен и утверждён'),
  'PoE budget lesson must show approved wording');
assert.equal(getLessonReviewStatus('l1-copper-fault-poe'), 'approved',
  'previously accepted copper troubleshooting lesson stays approved');
assert.equal(getLessonReviewStatus('l1-poe-injectors-splitters'), 'approved',
  'production badge matches the mirror owner approval for PoE injectors and splitters');
assert.ok(renderLessonBadge('l1-poe-injectors-splitters').includes('data-lesson-review-status="approved"'),
  'PoE injectors and splitters badge must display approved state');
assert.ok(renderLessonBadge('l1-poe-injectors-splitters').includes('Проверен и утверждён'),
  'PoE injectors and splitters badge must show approved wording');
for (const id of ['cli-poe-diagnostics', 'l1-poe-screen-reading']) {
  assert.equal(getLessonReviewStatus(id), 'needs-review', id + ' has no owner acceptance');
  assert.ok(renderLessonBadge(id).includes('data-lesson-review-status="needs-review"'),
    id + ' visible badge must remain pending');
}
console.log('PASS: PoE glossary, self-check and A/B versus DNS A scope regression');
