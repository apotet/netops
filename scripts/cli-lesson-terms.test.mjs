#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const output = await build({
  stdin: {
    contents: `export { GLOSSARY } from './src/data/glossary.ts';
export { LESSONS, getLesson } from './src/data/lessons/index.ts';`,
    resolveDir: process.cwd(), sourcefile: 'cli-tags-entry.ts', loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const { GLOSSARY, getLesson } = await import('data:text/javascript;base64,' +
  Buffer.from(output.outputFiles[0].contents).toString('base64'));
const lessons = ['cli-ios-modes', 'cli-console-ssh-telnet', 'cli-show-help-tab'];
let count = 0;
for (const lessonId of lessons) {
  const lesson = getLesson(lessonId);
  assert.ok(lesson, 'missing ' + lessonId);
  for (const [mode, content] of [['meaning', lesson], ['professional', lesson.professional]]) {
    assert.ok(content, 'missing ' + mode + ' in ' + lessonId);
    for (const term of content.terms) {
      const entry = GLOSSARY[term];
      assert.ok(entry, 'dead clickable tag: ' + lessonId + '/' + mode + '/' + term);
      assert.ok(entry.description.trim().length > 24, 'empty definition: ' + term);
      assert.ok(entry.relatesTo.trim().length > 8, 'missing context: ' + term);
      if (entry.lessonId) {
        assert.ok(getLesson(entry.lessonId), 'broken lesson link: ' + term + ' => ' + entry.lessonId);
      }
      count++;
    }
  }
}
console.log('PASS: ' + count + ' CLI lesson term tags resolve to glossary definitions and valid lesson targets.');
