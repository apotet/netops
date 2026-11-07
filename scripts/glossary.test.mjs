import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = join(root, 'scripts/.cache/glossary-tests.mjs');
mkdirSync(dirname(outfile), { recursive: true });
await build({
  stdin: {
    contents: "export { LESSONS } from './src/data/lessons'; export { GLOSSARY } from './src/data/glossary';",
    resolveDir: root,
  },
  bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent',
});
const { LESSONS, GLOSSARY } = await import(pathToFileURL(outfile).href);
const ids = new Set(LESSONS.map(lesson => lesson.id));
const terms = new Set(LESSONS.flatMap(lesson => [...lesson.terms, ...(lesson.professional?.terms ?? [])]));
for (const term of terms) {
  assert.ok(Object.hasOwn(GLOSSARY, term), 'missing definition: ' + term);
  const entry = GLOSSARY[term];
  assert.ok(entry.description.trim().length > 20, 'empty description: ' + term);
  assert.ok(entry.relatesTo.trim().length > 10, 'empty relation: ' + term);
}
for (const [term, entry] of Object.entries(GLOSSARY)) {
  if (entry.lessonId) assert.ok(ids.has(entry.lessonId), 'missing linked lesson: ' + term);
}
for (const [alias, target] of [['Server Name Indication', 'SNI'], ['SNAT', 'Source NAT'], ['NAPT', 'PAT'], ['NAT overload', 'PAT']]) {
  assert.equal(GLOSSARY[alias], GLOSSARY[target], 'reuse alias definition: ' + alias);
}
console.log(`PASS: ${terms.size} lesson terms covered in both styles; links and aliases valid`);
