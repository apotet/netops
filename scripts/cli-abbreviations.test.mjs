#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({
  stdin: {
    contents: `export { LabEngine } from './src/cli-lab/engine/LabEngine.ts';
export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands.ts';
export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile.ts';
export { ciscoTwoSwitchVlanScenario } from './src/cli-lab/scenarios/cisco-two-switch-vlan.ts';`,
    resolveDir: process.cwd(), sourcefile: 'abbreviations-entry.ts', loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const e = new mod.LabEngine(mod.ciscoIosProfile, mod.ciscoIosCommands, structuredClone(mod.ciscoTwoSwitchVlanScenario.initialState));
const run = cmd => {
  const r = e.execute(cmd);
  assert.equal(r.error, undefined, cmd + ': ' + r.output);
  return r.output;
};
const invalid = (cmd, match) => {
  const before = JSON.stringify(e.getState());
  const r = e.execute(cmd);
  assert.equal(r.error, true, cmd + ' should be rejected');
  if (match) assert.match(r.output, match);
  assert.equal(JSON.stringify(e.getState()), before, 'bad command mutated network: ' + cmd);
};
const help = cmd => {
  const before = JSON.stringify(e.getState());
  const output = run(cmd);
  assert.equal(JSON.stringify(e.getState()), before, cmd + ' help changed state');
  return output;
};

run('en');
run('conf t');
assert.match(help('int ?'), /INTERFACE/);
assert.equal(e.complete('int').completed, 'interface ');
run('int fa0/24');
assert.match(help('sw mo ?'), /access/);
assert.match(help('sw tr al vl ?'), /add/);
assert.match(help('sw tr al vl add ?'), /vlan-list/);
assert.match(help('do sh ?'), /interfaces/);
assert.match(help('do sh interfaces ?'), /trunk/);
assert.match(help('do sh int ?'), /interface/);
assert.equal(e.complete('sw mo a').completed, 'sw mo access ');
assert.equal(e.complete('sw tr al vl a').completed, undefined, 'add vs all must remain ambiguous');
assert.deepEqual(e.complete('sw tr al vl a').candidates, ['add', 'all']);
run('ex');
run('vlan 10');
run('ex');
run('int fa0/1');
run('sw mo acc');
run('sw acc vl 10');
run('no sh');
assert.equal(e.getState().devices.sw1.interfaces['FastEthernet0/1'].switchport.accessVlan, 10);
assert.equal(e.getState().devices.sw1.interfaces['FastEthernet0/1'].adminUp, true);
invalid('sw tr al vl a 20', /Ambiguous/i);
invalid('sw mo', /Incomplete|Invalid/i);
run('ex');
run('int fa0/24');
run('sw mo tr');
run('sw tr al vl 10');
run('sw tr al vl add 20');
assert.deepEqual(e.getState().devices.sw1.interfaces['FastEthernet0/24'].switchport.trunkAllowed, [10,20]);
run('sw tr al vl rem 20');
assert.deepEqual(e.getState().devices.sw1.interfaces['FastEthernet0/24'].switchport.trunkAllowed, [10]);
invalid('sw tr al vl a', /Ambiguous/i);
run('end');
assert.match(run('sh run'), /Current configuration:/);
assert.match(run('sh interfaces trunk'), /Vlans allowed on trunk/);
run('copy run start');
assert.match(run('sh start'), /Using saved startup configuration/);
run('conf t');
assert.match(run('do sh run'), /Current configuration:/);
invalid('do sh r', /Ambiguous/i);
assert.match(help('int ?'), /INTERFACE/);
run('int fa0/24');
assert.match(help('sw?'), /switchport/);
console.log('PASS: IOS keyword abbreviations, ambiguity, ? help, Tab and config state');
