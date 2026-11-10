#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({
  stdin: {
    contents: `export { LabEngine } from './src/cli-lab/engine/LabEngine.ts';
export { ciscoThreeSwitchMissingVlanScenario } from './src/cli-lab/scenarios/cisco-three-switch-missing-vlan.ts';
export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands.ts';
export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile.ts';`,
    resolveDir: process.cwd(), sourcefile: 'three-switch-entry.ts', loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const { LabEngine, ciscoThreeSwitchMissingVlanScenario: scenario, ciscoIosCommands, ciscoIosProfile } = mod;
const engine = new LabEngine(ciscoIosProfile, ciscoIosCommands, structuredClone(scenario.initialState));
const ok = () => engine.checkGoals([scenario.goals[0]]).allPassed;
const run = (commands) => {
  for (const cmd of commands) {
    const result = engine.execute(cmd);
    assert.equal(result.error, undefined, cmd + ': ' + result.output);
  }
};
assert.equal(ok(), false, 'missing transit VLAN must break L2 path');
assert.equal(engine.getState().links.length, 2, 'two topology links');
assert.equal(Object.keys(engine.getState().devices).length, 3, 'three devices');
assert.equal(engine.selectDevice('sw3'), true);
assert.match(engine.execute('show vlan brief').output, /10\s+USERS/, 'edge SW3 already has VLAN10');
assert.equal(engine.selectDevice('sw2'), true);
const missing = engine.execute('show vlan brief').output;
assert.doesNotMatch(missing, /^10\s/m, 'transit SW2 missing VLAN10');
assert.match(engine.execute('show interfaces trunk').output, /10/, 'trunks allowed VLAN10 before fix');
assert.equal(engine.selectDevice('sw1'), true);
run(['enable', 'configure terminal', 'vlan 10', 'exit']);
assert.equal(ok(), false, 'editing wrong switch cannot fix path');
assert.equal(engine.selectDevice('sw2'), true);
run(['enable', 'configure terminal', 'vlan 10', 'exit']);
assert.equal(ok(), true, 'creating transit VLAN restores path');
run(['interface fa0/23', 'shutdown']);
assert.equal(ok(), false, 'first transit trunk down breaks path');
run(['no shutdown', 'exit', 'interface fa0/24', 'shutdown']);
assert.equal(ok(), false, 'second transit trunk down breaks path');
run(['no shutdown']);
assert.equal(ok(), true);
const broken = structuredClone(engine.getState());
broken.links[1].up = false;
assert.equal(new LabEngine(ciscoIosProfile, ciscoIosCommands, broken).checkGoals(scenario.goals).allPassed, false, 'broken physical link');
const disallowed = structuredClone(engine.getState());
disallowed.devices.sw2.interfaces['FastEthernet0/23'].switchport.trunkAllowed = [20];
assert.equal(new LabEngine(ciscoIosProfile, ciscoIosCommands, disallowed).checkGoals(scenario.goals).allPassed, false, 'wrong allowed VLAN on transit');
const remotePortDown = structuredClone(engine.getState());
remotePortDown.devices.sw3.interfaces['FastEthernet0/1'].adminUp = false;
assert.equal(new LabEngine(ciscoIosProfile, ciscoIosCommands, remotePortDown).checkGoals(scenario.goals).allPassed, false, 'remote access port disabled');
assert.equal(engine.selectDevice('sw1'), true);
assert.equal(engine.getState().devices.sw2.vlans[10].active, true, 'SW2 config persists on console switch');
assert.equal(engine.checkGoals(scenario.goals).allPassed, false, 'unsaved repair must not complete scenario');
engine.selectDevice('sw2');
run(['end', 'copy running-config startup-config']);
assert.equal(engine.checkGoals(scenario.goals).allPassed, true, 'saved SW2 repair completes scenario');
console.log('PASS: Cisco 3-switch missing VLAN, repair and negative topology cases');
