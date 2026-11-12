#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const output = await build({
  stdin: {
    contents: `export { GLOSSARY } from './src/data/glossary.ts';
export { LESSONS, getLesson } from './src/data/lessons/index.ts';`,
    resolveDir: process.cwd(), sourcefile: 'cli-reference-entry.ts', loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const { GLOSSARY, LESSONS, getLesson } = await import('data:text/javascript;base64,' +
  Buffer.from(output.outputFiles[0].contents).toString('base64'));
const cli = LESSONS.filter(l => l.osiLayers.includes('CLI'));
assert.equal(cli.length, 4, 'CLI reference includes the published SVI lesson alongside three existing CLI lessons');
assert.ok(cli.some(l => l.id === 'l2-svi'), 'SVI reference lesson present');
const terms = [...new Set(cli.flatMap(l => [...l.terms, ...(l.professional?.terms ?? [])]))];
assert.ok(terms.length >= 25, 'expected substantive CLI vocabulary');
for (const term of terms) {
  const entry = GLOSSARY[term];
  assert.ok(entry, 'missing reference entry: ' + term);
  assert.ok(entry.description?.trim(), 'empty description: ' + term);
  assert.ok(entry.relatesTo?.trim(), 'missing context: ' + term);
  assert.ok(!entry.lessonId || getLesson(entry.lessonId), 'bad lesson target: ' + term);
}
console.log('PASS: CLI reference scope and shared glossary links (' + terms.length + ' unique terms).');
