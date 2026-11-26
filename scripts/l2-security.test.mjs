import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

mkdirSync('scripts/.cache', { recursive: true });
const outfile = resolve('scripts/.cache/l2-security.mjs');
await build({ stdin: { contents: `
export { ALL_QUESTIONS } from './src/data/questionsData';
export { getQuestionDeepDive } from './src/data/questionExplanations';
export { APPLIED_INDIVIDUAL_DEEP } from './src/data/questionExplanationsApplied';
export { LESSONS, getLessonForQuestion } from './src/data/lessons';
export { ciscoVlanAccessScenario } from './src/cli-lab/scenarios/cisco-vlan-access';
export { ciscoTrunkScenario } from './src/cli-lab/scenarios/cisco-trunk';
export { PRACTICE_DESTINATIONS } from './src/data/practiceLinks';
export { GLOSSARY, GLOSSARY_TOOLTIPS } from './src/data/glossary';
export { splitGlossaryText } from './src/utils/glossaryText';
`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent' });
const data = await import(pathToFileURL(outfile).href);
assert.equal(data.PRACTICE_DESTINATIONS['cli-vlan'].scenarioId, data.ciscoVlanAccessScenario.id);
assert.equal(data.PRACTICE_DESTINATIONS['cli-trunk'].scenarioId, data.ciscoTrunkScenario.id);
const raw = JSON.parse(readFileSync('src/data/questions.json', 'utf8'));
const ids = Array.from({ length: 20 }, (_, i) => `l2-sec-${String(i + 1).padStart(2, '0')}`);
assert.equal(raw.filter(q => q.id.startsWith('l2-sec-')).length, 20);
for (const id of ids) {
  const q = raw.find(q => q.id === id);
  assert.equal(data.ALL_QUESTIONS.filter(q => q.id === id).length, 1);
  assert.equal(q.group, 'l1-l2');
  assert.ok(['applied', 'advanced'].includes(q.difficulty));
  assert.equal(q.correct.length, 1);
  assert.ok(q.answers[q.correct[0]]);
  assert.ok(q.text && q.explanation && q.topic && q.hashtags.length >= 2);
  const entry = data.APPLIED_INDIVIDUAL_DEEP[id];
  assert.ok(entry.brief?.trim() && entry.trap?.trim() && entry.pro?.trim());
  assert.ok(entry.plain !== entry.pro, id + ': distinct plain/pro text');
  assert.equal(entry.plain.split(/\n\s*\n/).length, 3);
  assert.equal(entry.deep, entry.plain);
  const view = data.getQuestionDeepDive(q);
  assert.ok(view.hasIndividualDeep && view.professional?.deep);
  if (entry.practiceLink) {
    assert.ok(data.PRACTICE_DESTINATIONS[entry.practiceLink]);
    assert.equal(view.practiceLink, entry.practiceLink);
  }
  const lesson = data.getLessonForQuestion(id);
  assert.ok(lesson?.professional?.blocks.length);
  assert.equal(data.LESSONS.filter(l => l.relatedQuestionIds.includes(id)).length, 1);
}
for (const term of ['DTP', 'double tagging', 'VLAN hopping', 'BPDU Guard', 'Root Guard', 'Loop Guard', 'MSTP', 'MSTI', 'CIST', 'secure MAC', 'restrict', 'protect', 'sticky', '802.1X', 'EAP', 'PVID', 'ASIC', 'Option 82', 'topology change', 'Listening', 'protocol migration', 'PVID_Inc', 'RECV_PVID_ERR', 'Max Hops', 'remaining hops', 'EtherChannel', 'Port-channel', 'bundled', 'EAP-TLS', 'MAB', 'access VLAN', 'allowed list', 'native tagging', 'pruning', 'ingress', 'egress', 'inbound', 'outbound', 'implicit deny', 'permit', 'deny', 'Extended ACL', 'secure binding', 'dynamic secure MAC', 'sticky learning', 'maximum', 'Voice VLAN', 'errdisable recovery', 'rate limit', 'DHCP Snooping trust', 'administrative mode', 'operational mode', 'static trunk', 'rapid handshake', 'non-designated', 'standalone', 'suspended', 'VLAN-to-MSTI', 'MST Configuration Identifier', 'revision', 'message age', 'boundary port', 'Port ID', 'Root ID', 'untrusted', 'shutdown', 'stateless']) {
  assert.ok(data.GLOSSARY[term]?.description?.trim(), term + ': description');
  assert.ok(data.GLOSSARY[term]?.relatesTo?.trim(), term + ': relatesTo');
  assert.ok(data.GLOSSARY_TOOLTIPS[term], term);
  assert.ok(data.splitGlossaryText(`Проверка: ${term}.`).some(p => p.term === term), term);
}
// Verify live registration, both lesson modes, and exactly the same question coverage.
for (const slug of ['l2-stp-guard-design', 'l2-vlan-security']) {
  const lesson = data.LESSONS.find(l => l.id === slug);
  assert.ok(lesson, slug + ': registered');
  assert.ok(lesson.professional?.summary?.trim());
  assert.equal(lesson.blocks.length, lesson.relatedQuestionIds.length);
  assert.equal(lesson.professional.blocks.length, lesson.blocks.length);
  for (const mode of [lesson, lesson.professional]) {
    assert.ok(mode.summary.trim() && mode.terms.length);
    for (const term of mode.terms) {
      assert.ok(data.GLOSSARY[term]?.description && data.GLOSSARY[term]?.relatesTo, slug + ': ' + term);
      assert.ok(data.GLOSSARY_TOOLTIPS[term], slug + ': tooltip ' + term);
    }
    for (const [i, block] of mode.blocks.entries()) {
      const entry = data.APPLIED_INDIVIDUAL_DEEP[lesson.relatedQuestionIds[i]];
      assert.equal(block.body, mode === lesson ? entry.plain : entry.pro, slug + ': aligned block');
      if (block.practiceLink) assert.ok(data.PRACTICE_DESTINATIONS[block.practiceLink], slug);
    }
  }
}
console.log('PASS: 20 L2 security questions, three-paragraph dual explanations, lesson links, live practice destinations and tooltip matching');
