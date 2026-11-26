// Regression: PoE standards cheat sheet is informational, not a selection UI.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../src/components/LessonView.tsx', import.meta.url), 'utf8');
const chart = view.split('const PoEStandardsChart: React.FC = () => {')[1]?.split('/** Shared photo markup')[0];
assert.ok(chart, 'PoE standards chart must be present');
assert.match(chart, /data-poe-standards-chart="responsive"/, 'responsive chart must be retained');
assert.match(chart, /data-poe-standard-card={row.type}/, 'each type should have a stable card marker');
assert.match(chart, /rounded-lg border border-slate-700 border-l-4 \$\{row\.accent\}/,
  'all cards share a neutral frame and a separate colored left marker');

const types = [
  ['Type 1', 'cyan'],
  ['Type 2', 'teal'],
  ['Type 3', 'amber'],
  ['Type 4', 'blue'],
];
for (const [type, color] of types) {
  assert.ok(chart.includes(`type: '${type}'`), type + ' card retained');
  assert.ok(chart.includes(`accent: 'border-l-${color}-400'`), type + ' uses left-border accent only');
  assert.ok(chart.includes(`tag: 'text-${color}-300'`), type + ' retains colored title');
  assert.ok(!chart.includes(`accent: 'border-${color}-400'`),
    type + ' must not color its full frame like an active selection');
}
assert.match(chart, /powerClass: '4'/, 'Type 2 class 4 unaffected');
assert.match(chart, /pse: '30 Вт', pd: '25,5 Вт'/, 'Type 2 power values unaffected');
console.log('PASS: PoE cheat-sheet borders neutral on all 4 cards; accents left-only');
