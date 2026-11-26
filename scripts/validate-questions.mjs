#!/usr/bin/env node
import { loadBank, writeText } from './load-bank.mjs';

const ALLOWED_DIFF = new Set(['basic', 'beginner', 'intermediate', 'applied', 'advanced']);
const ALLOWED_GROUPS = new Set([
  'l1-l2',
  'l3',
  'l4',
  'l5-l7',
  'tcpip',
  'troubleshooting',
  'visual-l1',
]);

const errors = [];
const warnings = [];

let ALL_QUESTIONS;
try {
  const mod = await loadBank();
  ALL_QUESTIONS = mod.ALL_QUESTIONS;
} catch (e) {
  console.error('Failed to load bank via esbuild:', e);
  process.exit(1);
}

if (!Array.isArray(ALL_QUESTIONS) || ALL_QUESTIONS.length === 0) {
  console.error('CRITICAL: ALL_QUESTIONS empty');
  process.exit(1);
}

const seen = new Map();
const byDiff = { beginner: 0, basic: 0, intermediate: 0, applied: 0, advanced: 0, unset: 0, other: 0 };

for (const q of ALL_QUESTIONS) {
  if (!q?.id) {
    errors.push('question without id');
    continue;
  }
  if (seen.has(q.id)) errors.push(`Duplicate id: ${q.id}`);
  else seen.set(q.id, true);

  if (!q.text?.trim()) errors.push(`${q.id}: empty text`);
  if (!Array.isArray(q.answers) || q.answers.length < 2)
    errors.push(`${q.id}: answers < 2`);
  if (!Array.isArray(q.correct) || q.correct.length === 0)
    errors.push(`${q.id}: correct[] empty`);
  for (const c of q.correct || []) {
    if (!Number.isInteger(c) || c < 0 || c >= (q.answers?.length || 0))
      errors.push(`${q.id}: correct index ${c} OOB`);
  }
  if (Array.isArray(q.correct) && new Set(q.correct).size !== q.correct.length)
    errors.push(`${q.id}: duplicate correct indices`);
  if (Array.isArray(q.answers)) {
    const n = q.answers.map((a) => String(a).trim().toLowerCase());
    if (new Set(n).size !== n.length) warnings.push(`${q.id}: duplicate answer texts`);
  }
  if (!q.explanation?.trim()) warnings.push(`${q.id}: empty explanation`);
  if (q.explanation && /\uFFFD/.test(q.explanation))
    errors.push(`${q.id}: corrupted explanation encoding (U+FFFD)`);
  if (q.difficulty && !ALLOWED_DIFF.has(q.difficulty))
    errors.push(`${q.id}: bad difficulty ${q.difficulty}`);
  if (q.group && !ALLOWED_GROUPS.has(q.group))
    warnings.push(`${q.id}: unexpected group ${q.group}`);

  const d = q.difficulty || 'unset';
  if (byDiff[d] !== undefined) byDiff[d]++;
  else byDiff.other++;
}

const byText = new Map();
for (const q of ALL_QUESTIONS) {
  const key = String(q.text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (!key) continue;
  if (!byText.has(key)) byText.set(key, []);
  byText.get(key).push(q.id);
}
const textDups = [...byText.entries()].filter(([, ids]) => ids.length > 1);
if (textDups.length)
  warnings.push(`${textDups.length} exact-text duplicate groups (expert review)`);

const lines = [];
lines.push('=== Question bank validation (esbuild real modules) ===');
lines.push(`Unique IDs: ${seen.size}`);
lines.push(`Total objects: ${ALL_QUESTIONS.length}`);
lines.push(
  `Difficulty: beginner=${byDiff.beginner} basic=${byDiff.basic} intermediate=${byDiff.intermediate} applied=${byDiff.applied} advanced=${byDiff.advanced} unset=${byDiff.unset} other=${byDiff.other}`
);
if (textDups.length) {
  lines.push('Exact-text dups (sample):');
  for (const [, ids] of textDups.slice(0, 10)) lines.push('  ' + ids.join(', '));
}
if (warnings.length) {
  lines.push(`Warnings: ${warnings.length}`);
  for (const w of warnings.slice(0, 40)) lines.push(' - ' + w);
}
if (errors.length) {
  lines.push(`ERRORS: ${errors.length}`);
  for (const e of errors) lines.push(' ! ' + e);
}
const out = lines.join('\n');
console.log(out);
writeText('scripts/.cache/validate-summary.txt', out);

if (errors.length) process.exit(1);
console.log('\nOK: no critical structural errors.');
process.exit(0);
