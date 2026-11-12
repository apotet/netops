import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Narrow coverage gate for the new STP question batch. Other bank IDs are not yet gated.
const slugs = ['l2-stp-election', 'l2-rstp-convergence', 'l2-stp-protection', 'l2-mstp-advanced'];
const registry = readFileSync('src/data/lessons/index.ts', 'utf8');
const questions = JSON.parse(readFileSync('src/data/questions.json', 'utf8'));
const ids = questions.filter(q => /^stp-new-\d{2}$/.test(q.id)).map(q => q.id);
const coverage = new Map();
assert.equal(ids.length, 15, 'expected the reviewed STP 15-question batch');

for (const slug of slugs) {
  const symbol = 'LESSON_' + slug.toUpperCase().replaceAll('-', '_');
  assert.ok(registry.includes("from './" + slug + "'"), slug + ': imported');
  assert.ok(registry.includes(symbol), slug + ': registered');
  const raw = readFileSync('src/data/lessons/' + slug + '.ts', 'utf8');
  const start = raw.indexOf('= {'), end = raw.lastIndexOf('};');
  assert.ok(start > 0 && end > start, slug + ': lesson shape');
  const lesson = JSON.parse(raw.slice(start + 2, end + 1));
  assert.equal(lesson.id, slug);
  assert.equal(lesson.difficulty, 'advanced');
  assert.ok(lesson.blocks.length >= 4, slug + ': meaningful plain lesson');
  assert.ok(lesson.professional?.blocks.length >= 4, slug + ': meaningful pro lesson');
  assert.ok(lesson.professional?.summary, slug + ': professional summary');
  for (const id of lesson.relatedQuestionIds) {
    assert.ok(ids.includes(id), slug + ': unknown linked question ' + id);
    coverage.set(id, (coverage.get(id) || 0) + 1);
  }
}
for (const id of ids) assert.equal(coverage.get(id), 1, id + ': exactly one advanced lesson link');
console.log('PASS: four advanced STP lessons cover all 15 questions exactly once');
