#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const output = await build({
  stdin: {
    contents: `export { LabEngine } from './src/cli-lab/engine/LabEngine.ts';
export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands.ts';
export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile.ts';
export { ciscoShowDiagnosticScenario } from './src/cli-lab/scenarios/cisco-show-diagnostic.ts';
export { PRACTICE_DESTINATIONS } from './src/data/practiceLinks.ts';
export { LESSON_CLI_SHOW_HELP_TAB } from './src/data/lessons/cli-show-help-tab.ts';`,
    resolveDir: process.cwd(), sourcefile: 'cli-diagnostic-entry.ts', loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const lib = await import('data:text/javascript;base64,' + Buffer.from(output.outputFiles[0].contents).toString('base64'));
const { ciscoShowDiagnosticScenario: scenario } = lib;
const engine = new lib.LabEngine(lib.ciscoIosProfile, lib.ciscoIosCommands, structuredClone(scenario.initialState));
const check = () => engine.checkGoals(scenario.goals);
const exec = cmd => {
  const res = engine.execute(cmd);
  assert.equal(res.error, undefined, cmd + ': ' + res.output);
  return res.output;
};
assert.equal(lib.PRACTICE_DESTINATIONS['cli-diagnostic'].scenarioId, scenario.id);
assert.equal(lib.LESSON_CLI_SHOW_HELP_TAB.blocks.at(-1).practiceLink, 'cli-diagnostic');
assert.equal(lib.LESSON_CLI_SHOW_HELP_TAB.professional.blocks.at(-1).practiceLink, 'cli-diagnostic');
assert.deepEqual(scenario.modesAllowed, ['learn', 'drill', 'task']);
assert.equal(scenario.diagnostic, true);
assert.ok(scenario.publicGoalLabels.every(label => !/sw2.*fa0\/1|shutdown|no shutdown/i.test(label)));
assert.equal(check().allPassed, false, 'initial camera service must be broken');
assert.equal(check().results[0].passed, false);
assert.equal(check().results[1].passed, true, 'initial office service must be operational');
const initialState = structuredClone(engine.getState());
assert.match(engine.help('show ?'), /interfaces/i);
assert.equal(engine.complete('sh').completed, 'show ');
assert.deepEqual(engine.getState(), initialState, 'help and TAB should be read-only');
exec('enable');
assert.match(exec('show interfaces status'), /FastEthernet0\/1/);
assert.match(exec('show vlan brief'), /30/);
assert.match(exec('show interfaces trunk'), /FastEthernet0\/24/);
assert.equal(check().allPassed, false, 'read-only diagnostics must not repair the incident');
assert.equal(engine.selectDevice('sw2'), true);
exec('enable');
assert.match(exec('show interfaces status'), /FastEthernet0\/1/);
exec('configure terminal');
exec('interface FastEthernet0/1');
exec('no shutdown');
assert.equal(check().results[0].passed, true, 'camera path restored');
assert.equal(check().results[1].passed, true, 'office path preserved');
assert.equal(check().allPassed, false, 'unsaved fix must not count as completed');
exec('end');
exec('copy running-config startup-config');
assert.equal(check().allPassed, true, 'final saved repair');
exec('reload');
assert.equal(check().allPassed, true, 'repair survives simulated reload');
console.log('PASS: CLI diagnostics, readonly help/TAB/show, root repair, preserved VLAN, save/reload, lesson links');
