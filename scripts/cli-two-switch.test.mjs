#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: `export { checkVlanPath } from './src/cli-lab/engine/VlanPath.ts';
export { evaluateGoals } from './src/cli-lab/engine/GoalEvaluator.ts';
export { LabEngine } from './src/cli-lab/engine/LabEngine.ts';
export { ciscoTwoSwitchVlanScenario } from './src/cli-lab/scenarios/cisco-two-switch-vlan.ts';
export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands.ts';
export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile.ts';`,
    resolveDir: process.cwd(),
    sourcefile: 'cli-vlan-test-entry.ts',
    loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const uri = 'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64');
const { checkVlanPath, evaluateGoals, LabEngine, ciscoTwoSwitchVlanScenario: scenario, ciscoIosCommands, ciscoIosProfile } = await import(uri);
const fresh = () => structuredClone(scenario.initialState);
const port = (state, id, name) => state.devices[id].interfaces[name];
const trunk = (state, id) => {
  const d = state.devices[id];
  d.vlans[10] = { id: 10, name: 'USERS', active: true };
  const access = port(state, id, 'FastEthernet0/1');
  access.adminUp = true; access.switchport = { mode: 'access', accessVlan: 10 };
  const uplink = port(state, id, 'FastEthernet0/24');
  uplink.adminUp = true; uplink.switchport = { mode: 'trunk', trunkAllowed: [10] };
};
const path = s => checkVlanPath(s, 10, 'sw1', 'FastEthernet0/1', 'sw2', 'FastEthernet0/1').reachable;
let s = fresh();
assert.equal(path(s), false, 'initial state cannot pass');
trunk(s, 'sw1');
assert.equal(path(s), false, 'only SW1 cannot pass');
trunk(s, 'sw2');
assert.equal(path(s), true, 'both ends configured pass');
assert.equal(evaluateGoals(s, [scenario.goals[0]]).allPassed, true);
for (const [name, breakIt] of [
  ['physical link down', s => { s.links[0].up = false; }],
  ['SW1 uplink disabled', s => { port(s, 'sw1', 'FastEthernet0/24').adminUp = false; }],
  ['SW2 uplink disabled', s => { port(s, 'sw2', 'FastEthernet0/24').adminUp = false; }],
  ['SW1 missing VLAN', s => { delete s.devices.sw1.vlans[10]; }],
  ['SW2 missing VLAN', s => { delete s.devices.sw2.vlans[10]; }],
  ['SW1 missing allowed', s => { port(s, 'sw1', 'FastEthernet0/24').switchport.trunkAllowed = [20]; }],
  ['SW2 missing allowed', s => { port(s, 'sw2', 'FastEthernet0/24').switchport.trunkAllowed = [20]; }],
  ['SW2 wrong port mode', s => { port(s, 'sw2', 'FastEthernet0/24').switchport.mode = 'access'; }],
  ['SW2 wrong access VLAN', s => { port(s, 'sw2', 'FastEthernet0/1').switchport.accessVlan = 20; }],
  ['SW1 access disabled', s => { port(s, 'sw1', 'FastEthernet0/1').adminUp = false; }],
  ['SW2 access disabled', s => { port(s, 'sw2', 'FastEthernet0/1').adminUp = false; }],
]) {
  const broken = structuredClone(s);
  breakIt(broken);
  assert.equal(path(broken), false, name);
}
const engine = new LabEngine(ciscoIosProfile, ciscoIosCommands, fresh());
assert.equal(engine.selectDevice('missing'), false);
assert.equal(engine.selectDevice('sw2'), true);
assert.equal(engine.getPrompt(), 'SW2>');
engine.execute('enable');
engine.execute('configure terminal');
engine.execute('vlan 10');
assert.equal(engine.getState().devices.sw2.vlans[10]?.active, true);
assert.equal(engine.getState().devices.sw1.vlans[10], undefined);
engine.selectDevice('sw1');
assert.equal(engine.getPrompt(), 'SW1>');
engine.execute('enable');
engine.selectDevice('sw2');
assert.equal(engine.getState().devices.sw2.modeCtx.mode, 'config-vlan', 'device mode preserved');
engine.selectDevice('sw1');
assert.equal(engine.getState().devices.sw1.modeCtx.mode, 'privileged', 'independent CLI mode preserved');
// Real CLI commands must produce the same topology result.
const live = new LabEngine(ciscoIosProfile, ciscoIosCommands, fresh());
const configure = (id) => {
  assert.equal(live.selectDevice(id), true);
  for (const command of [
    'enable', 'configure terminal', 'vlan 10', 'exit',
    'interface fa0/1', 'switchport mode access', 'switchport access vlan 10',
    'no shutdown', 'exit', 'interface fa0/24', 'switchport mode trunk',
    'switchport trunk allowed vlan 10', 'no shutdown', 'end',
  ]) {
    const out = live.execute(command);
    assert.equal(out.error, undefined, id + ': ' + command + ': ' + out.output);
  }
};
configure('sw1');
assert.equal(live.checkGoals([scenario.goals[0]]).allPassed, false);
configure('sw2');
assert.equal(live.checkGoals([scenario.goals[0]]).allPassed, true);
live.execute('configure terminal');
live.execute('interface fa0/24');
live.execute('shutdown');
assert.equal(live.checkGoals([scenario.goals[0]]).allPassed, false, 'shutdown after completion invalidates path');
live.execute('no shutdown');
assert.equal(live.checkGoals([scenario.goals[0]]).allPassed, true, 'repair restores path');
// Saving is a per-device operation and required for full scenario completion.
assert.equal(live.checkGoals(scenario.goals).allPassed, false, 'configured but unsaved is not complete');
live.execute('end');
assert.equal(live.execute('copy running-config startup-config').error, undefined);
assert.equal(live.checkGoals(scenario.goals).allPassed, false, 'SW1 also requires save');
live.selectDevice('sw1');
assert.equal(live.execute('write memory').error, undefined);
assert.equal(live.checkGoals(scenario.goals).allPassed, true, 'both saved');
console.log('PASS: CLI commands configure both switches and confirm/revoke VLAN path');
console.log('PASS: multi-switch console isolation and 12 positive/negative VLAN reachability cases');
