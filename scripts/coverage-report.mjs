#!/usr/bin/env node
import { loadBankWithExplanations, writeJson, writeText } from './load-bank.mjs';

let rows;
try {
  const mod = await loadBankWithExplanations();
  rows = mod.buildCoverageRows();
} catch (e) {
  console.error('Coverage load failed:', e);
  process.exit(1);
}

const byDiff = {};
const missingApplied = [];
const missingAdvanced = [];
const weakEngineering = [];

for (const r of rows) {
  byDiff[r.difficulty] = byDiff[r.difficulty] || { total: 0, individual: 0 };
  byDiff[r.difficulty].total++;
  if (r.hasIndividualDeep) byDiff[r.difficulty].individual++;

  if (r.difficulty === 'applied' && !r.hasIndividualDeep) missingApplied.push(r.id);
  if (r.difficulty === 'advanced' && !r.hasIndividualDeep) missingAdvanced.push(r.id);
  if ((r.difficulty === 'applied' || r.difficulty === 'advanced') && r.hasIndividualDeep && r.engLen < 80)
    weakEngineering.push(r.id);
}

const summary = {
  total: rows.length,
  uniqueIds: new Set(rows.map((r) => r.id)).size,
  byDifficulty: byDiff,
  missingAppliedCount: missingApplied.length,
  missingAdvancedCount: missingAdvanced.length,
  missingApplied,
  missingAdvanced,
  weakEngineering,
};

const lines = [
  '=== Explanation coverage ===',
  `Total: ${summary.total} (unique ${summary.uniqueIds})`,
  ...Object.entries(byDiff).map(
    ([d, v]) =>
      `  ${d}: ${v.individual}/${v.total} individual (${v.total ? Math.round((100 * v.individual) / v.total) : 0}%)`
  ),
  `Applied missing individual: ${missingApplied.length}`,
  missingApplied.length ? '  ' + missingApplied.slice(0, 60).join(', ') : '',
  `Advanced missing individual: ${missingAdvanced.length}`,
  missingAdvanced.length ? '  ' + missingAdvanced.slice(0, 60).join(', ') : '',
  `Weak engineering (<80 chars) among individual: ${weakEngineering.length}`,
];

const text = lines.filter(Boolean).join('\n');
console.log(text);
writeText('scripts/.cache/coverage-summary.txt', text);
writeJson('scripts/.cache/coverage-report.json', { summary, rows });
process.exit(0);
