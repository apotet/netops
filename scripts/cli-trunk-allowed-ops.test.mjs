#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({
  stdin: {
    contents: `export { LabEngine } from './src/cli-lab/engine/LabEngine.ts';
export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands.ts';
export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile.ts';
export { ciscoTwoSwitchTrunkDiagnosticScenario } from './src/cli-lab/scenarios/cisco-two-switch-trunk-diagnostics.ts';`,
    resolveDir: process.cwd(), sourcefile: 'trunk-allowed-ops-entry.ts', loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const { LabEngine, ciscoIosCommands, ciscoIosProfile, ciscoTwoSwitchTrunkDiagnosticScenario: scenario } = mod;
const e = new LabEngine(ciscoIosProfile, ciscoIosCommands, structuredClone(scenario.initialState));
const iface = () => e.getState().devices.sw2.interfaces['FastEthernet0/24'];
const allowed = () => iface().switchport.trunkAllowed;
const goals = () => e.checkGoals(scenario.goals.slice(0,2)).results.map(x=>x.passed);
const run = cmd => { const result = e.execute(cmd); assert.equal(result.error, undefined, cmd+': '+result.output); return result.output; };
const bad = cmd => { const before = JSON.stringify(e.getState()); const result = e.execute(cmd); assert.equal(result.error, true, cmd+' should fail'); assert.equal(JSON.stringify(e.getState()),before,'failed command must not change state: '+cmd); };
const help = cmd => { const before = JSON.stringify(e.getState()); const out = run(cmd); assert.equal(JSON.stringify(e.getState()),before,cmd+' should be read-only'); return out; };

e.selectDevice('sw2');
run('enable'); run('conf t'); run('interface fa0/24');
assert.deepEqual(allowed(),[10]);
assert.deepEqual(goals(),[false,true]);
const options = help('switchport trunk allowed vlan ?');
for(const keyword of ['add','remove','all','none','<vlan-list>']) assert.ok(options.includes(keyword), keyword+' must be shown in help');
assert.match(help('switchport trunk allowed vlan add ?'), /<vlan-list>/);
assert.match(help('switchport trunk allowed vlan remove ?'), /<vlan-list>/);
assert.match(help('switchport trunk allowed vlan a?'), /add/);
assert.match(help('switchport trunk allowed vlan add 20 ?'), /<cr>/);
run('switchport trunk allowed vlan add 20');
assert.deepEqual(allowed(),[10,20], 'add retains VLAN10');
assert.deepEqual(goals(),[true,true], 'correct add repairs VLAN20 without disrupting VLAN10');
run('switchport trunk allowed vlan add 20,30-32');
assert.deepEqual(allowed(),[10,20,30,31,32], 'unique and sorted ranges');
run('switchport trunk allowed vlan remove 31,32');
assert.deepEqual(allowed(),[10,20,30]);
run('switchport trunk allowed vlan 20');
assert.deepEqual(allowed(),[20], 'plain command replaces list');
assert.deepEqual(goals(),[true,false], 'replace breaks VLAN10 as on real IOS');
run('switchport trunk allowed vlan 10,20');
assert.deepEqual(allowed(),[10,20]);
run('switchport trunk allowed vlan none');
assert.deepEqual(allowed(),[], 'none means no VLANs, not default all');
assert.deepEqual(goals(),[false,false]);
run('do show interfaces trunk');
assert.match(run('do show interfaces trunk'), /none/);
run('switchport trunk allowed vlan all');
assert.equal(allowed(),undefined,'all returns to default 1-4094');
assert.deepEqual(goals(),[true,true]);
run('switchport trunk allowed vlan remove 20');
assert.equal(allowed().includes(20),false);
assert.equal(allowed().includes(10),true);
assert.equal(allowed().length,4093);
run('switchport trunk allowed vlan add 20');
assert.equal(allowed(),undefined,'add last missing VLAN normalizes all to default');
for(const invalid of [
 'switchport trunk allowed vlan add', 'switchport trunk allowed vlan remove',
 'switchport trunk allowed vlan 10,', 'switchport trunk allowed vlan 10--20',
 'switchport trunk allowed vlan 0', 'switchport trunk allowed vlan 4095',
 'switchport trunk allowed vlan 20-10', 'switchport trunk allowed vlan none 20',
 'switchport trunk allowed vlan all 10', 'switchport trunk allowed vlan add 20 xx',
]) bad(invalid);
run('switchport trunk allowed vlan 10,20');
run('end');
assert.match(run('show running-config'),/switchport trunk allowed vlan 10,20/);
run('copy running-config startup-config');
assert.match(run('show startup-config'),/switchport trunk allowed vlan 10,20/);
run('reload');
assert.deepEqual(allowed(),[10,20]);
console.log('PASS: Cisco trunk allowed replace/add/remove/all/none, contextual help, failures, config persistence and VLAN path');
