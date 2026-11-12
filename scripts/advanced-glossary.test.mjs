import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Use the actual app data and token matcher, not a parallel test-only dictionary.
mkdirSync(resolve('scripts/.cache'), { recursive: true });
const outfile=resolve('scripts/.cache/advanced-glossary.mjs');
await build({stdin:{contents:`
export { LESSONS } from './src/data/lessons/index';
export { GLOSSARY, GLOSSARY_TOOLTIPS } from './src/data/glossary';
export { splitGlossaryText } from './src/utils/glossaryText';
`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile,logLevel:'silent'});
const { LESSONS, GLOSSARY, GLOSSARY_TOOLTIPS, splitGlossaryText } = await import(pathToFileURL(outfile).href);
const advanced=LESSONS.filter(l=>l.difficulty==='advanced');
assert.ok(advanced.length>=6,'expected advanced lessons');
for(const lesson of advanced){
  for(const mode of [lesson,lesson.professional]){
    assert.ok(mode,lesson.id+': requires professional mode');
    for(const term of mode.terms){
      assert.ok(GLOSSARY[term]?.description?.trim(),lesson.id+': missing tag description: '+term);
      const tooltip=GLOSSARY_TOOLTIPS[term];
      assert.ok(tooltip?.english&&tooltip?.russian&&tooltip?.summary,lesson.id+': missing tooltip: '+term);
      assert.ok(splitGlossaryText('Проверка: '+term+'.').some(part=>part.term===term),lesson.id+': unmatched token: '+term);
    }
  }
}
for(const term of ['Proposal','Agreement','MSTP','MSTI','CIST','UDLD','Root Guard','Loop Guard','root-inconsistent','loop-inconsistent','path cost','ASN','AS']){
  assert.ok(GLOSSARY_TOOLTIPS[term],term+': missing inline definition');
  assert.ok(splitGlossaryText('Здесь '+term+' работает.').some(p=>p.term===term),term+': not recognized');
}
console.log('PASS: '+advanced.length+' advanced lessons; tags and inline terms in both modes');
