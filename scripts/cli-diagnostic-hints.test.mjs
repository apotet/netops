#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `export { ciscoThreeSwitchMissingVlanScenario as scenario } from './src/cli-lab/scenarios/cisco-three-switch-missing-vlan.ts';
export { LabEngine } from './src/cli-lab/engine/LabEngine.ts';
export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile.ts';
export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands.ts';`,
    resolveDir: process.cwd(), sourcefile: 'diagnostic-no-spoilers-entry.ts', loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const lib = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const { scenario } = lib;
assert.equal(scenario.diagnostic, true);
assert.equal(scenario.publicGoalLabels.length, scenario.goals.length);
const preSolveText = [
  scenario.id, scenario.title, scenario.description,
  ...scenario.publicGoalLabels,
  ...scenario.steps.flatMap(step => [step.instruction, step.hint ?? '']),
].join(' ').toLowerCase();
// Problem statements may specify the end-to-end VLAN and topology; not the internal repair target.
for (const spoiler of [
  'missing-vlan', 'потерянный vlan', 'исправьте транзитный sw2',
  'на sw2 проверьте', 'на sw2 создайте', 'создайте недостающий vlan',
  'сохраните исправление на sw2', 'разрешает vlan 10',
]) {
  assert.equal(preSolveText.includes(spoiler), false, 'Pre-solve spoiler: ' + spoiler);
}
assert.match(scenario.steps[0].hint, /show interfaces status/);
assert.match(scenario.steps[0].hint, /show vlan brief/);
assert.match(scenario.steps[0].hint, /show interfaces trunk/);
assert.equal(scenario.initialState.devices.sw2.vlans[10], undefined, 'real fault still present');
assert.equal(scenario.initialState.devices.sw1.vlans[10].active, true);
assert.equal(scenario.initialState.devices.sw3.vlans[10].active, true);
const source = readFileSync('src/cli-lab/CliLabShell.tsx', 'utf8');
assert.match(source, /scenario\.diagnostic\s*\?/);
assert.match(source, /scenario\.publicGoalLabels\?\.\[i\]/);
const engine = new lib.LabEngine(lib.ciscoIosProfile, lib.ciscoIosCommands, structuredClone(scenario.initialState));
assert.equal(engine.checkGoals([scenario.goals[0]]).allPassed, false);
console.log('PASS: diagnostic prompt/hints/visible labels are fault-neutral while real misconfiguration remains');
