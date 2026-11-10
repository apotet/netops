#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({
  stdin: {
    contents: `export { LabEngine } from './src/cli-lab/engine/LabEngine.ts';
export { ciscoTwoSwitchTrunkDiagnosticScenario } from './src/cli-lab/scenarios/cisco-two-switch-trunk-diagnostics.ts';
export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands.ts';
export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile.ts';`,
    resolveDir: process.cwd(), sourcefile: 'trunk-diagnostic-test-entry.ts', loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const lib = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const { LabEngine, ciscoTwoSwitchTrunkDiagnosticScenario: scenario, ciscoIosCommands, ciscoIosProfile } = lib;
const engine = new LabEngine(ciscoIosProfile, ciscoIosCommands, structuredClone(scenario.initialState));
const paths = () => engine.checkGoals(scenario.goals.slice(0, 2)).results.map(r => r.passed);
const run = (cmds) => {
  for (const cmd of cmds) {
    const result = engine.execute(cmd);
    assert.equal(result.error, undefined, cmd + ': ' + result.output);
  }
};

assert.equal(scenario.diagnostic, true);
assert.equal(scenario.publicGoalLabels.length, scenario.goals.length);
assert.deepEqual(paths(), [false, true], 'VLAN20 failed while VLAN10 remains working');
assert.equal(engine.getState().devices.sw1.interfaces['FastEthernet0/24'].adminUp, true);
assert.equal(engine.getState().devices.sw2.interfaces['FastEthernet0/24'].adminUp, true);
assert.match(engine.execute('show vlan brief').output, /20\s+CAMERAS/, 'both local VLANs created on SW1');
assert.match(engine.execute('show interfaces trunk').output, /10,20/, 'SW1 trunk permits both VLANs');

engine.selectDevice('sw2');
assert.match(engine.execute('show vlan brief').output, /20\s+CAMERAS/, 'SW2 has both VLANs');
assert.match(engine.execute('show interfaces status').output, /FastEthernet0\/24\s+connected/, 'SW2 trunk physically up');
assert.match(engine.execute('show interfaces trunk').output, /Vlans allowed on trunk[\s\S]*FastEthernet0\/24\s+10(?:\n|$)/,
  'SW2 trunk only permits VLAN10; cause discoverable via show');
const visible = [
  scenario.title, scenario.description, scenario.id, ...scenario.publicGoalLabels,
  ...scenario.steps.flatMap(s => [s.instruction, s.hint ?? '']),
].join(' ').toLowerCase();
for (const spoiler of ['на sw2 fa0/24 разрешена только vlan 10', 'sw2 не пропускает', 'добавьте vlan 20', 'разрешите vlan 20 на sw2', 'исправьте trunk sw2']) {
  assert.equal(visible.includes(spoiler), false, 'diagnosis leaked through instructions: ' + spoiler);
}

run(['enable', 'configure terminal', 'interface fa0/24', 'switchport trunk allowed vlan 20']);
assert.deepEqual(paths(), [true, false], 'fixing broken VLAN alone is insufficient when working VLAN10 is damaged');
assert.equal(engine.checkGoals(scenario.goals).allPassed, false, 'must preserve VLAN10');
run(['switchport trunk allowed vlan 10,20']);
assert.deepEqual(paths(), [true, true], 'both VLANs reach end-to-end after correct fix');
assert.equal(engine.checkGoals(scenario.goals).allPassed, false, 'repair must be saved');
run(['end', 'copy running-config startup-config']);
assert.equal(engine.checkGoals(scenario.goals).allPassed, true, 'saved correct repair completes all goals');

const stillBroken = structuredClone(scenario.initialState);
stillBroken.devices.sw1.interfaces['FastEthernet0/24'].adminUp = false;
const other = new LabEngine(ciscoIosProfile, ciscoIosCommands, stillBroken);
assert.deepEqual(other.checkGoals(scenario.goals.slice(0, 2)).results.map(r => r.passed), [false, false],
  'down trunk interrupts both VLANs');
console.log('PASS: selective trunk diagnosis, no spoilers, intact VLAN10, repair and save');
