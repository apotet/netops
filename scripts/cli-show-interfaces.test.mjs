#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({
 stdin: {contents: `export { LabEngine } from './src/cli-lab/engine/LabEngine.ts';
export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands.ts';
export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile.ts';
export { ciscoTwoSwitchVlanScenario } from './src/cli-lab/scenarios/cisco-two-switch-vlan.ts';`,
 resolveDir: process.cwd(), sourcefile:'show-interface-entry.ts', loader:'ts'},
 bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'
});
const lib=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const {LabEngine,ciscoIosCommands,ciscoIosProfile,ciscoTwoSwitchVlanScenario}=lib;
const engine=new LabEngine(ciscoIosProfile,ciscoIosCommands,structuredClone(ciscoTwoSwitchVlanScenario.initialState));
const run=line=>engine.execute(line);
assert.equal(run('show').error,true,'show alone is incomplete');
assert.match(run('show ?').output,/interfaces/);
assert.match(run('show interfaces ?').output,/status/);
assert.match(run('show interfaces').output,/FastEthernet0\/24 is administratively down/);
assert.match(run('show interfaces Fa0\/1').output,/FastEthernet0\/1 is administratively down/);
assert.match(run('show interface Fa0\/24').output,/FastEthernet0\/24 is administratively down/);
assert.match(run('show interfaces status').output,/FastEthernet0\/24\s+disabled/);
assert.match(run('show interfaces Fa0\/24 switchport').output,/Administrative Mode: unset/);
assert.equal(run('show interfaces Fa0\/999').error,true);
assert.equal(run('show interfaces something invalid').error,true);
assert.match(run('show interfaces trunk').output,/Port\s+Mode/,'existing trunk handler remains');
assert.match(run('show ip interface brief').output,/IP-Address/,'existing IP handler remains');
assert.match(run('show vlan brief').output,/VLAN Name/,'existing VLAN handler remains');
assert.equal(engine.selectDevice('sw2'),true);
assert.match(run('show interfaces Fa0\/24').output,/FastEthernet0\/24 is administratively down/);
assert.equal(engine.selectDevice('sw1'),true);
for(const line of ['enable','configure terminal','interface fa0/24','switchport mode trunk','switchport trunk allowed vlan 10','no shutdown','end']) {
 const out=run(line);assert.equal(out.error,undefined,line+': '+out.output);
}
assert.match(run('show interfaces Fa0\/24').output,/FastEthernet0\/24 is down, line protocol is down/,'remote port still down');
engine.selectDevice('sw2');
for(const line of ['enable','configure terminal','interface fa0/24','no shutdown','end']){
 const out=run(line);assert.equal(out.error,undefined,line+': '+out.output);
}
engine.selectDevice('sw1');
assert.match(run('show interfaces Fa0\/24').output,/FastEthernet0\/24 is up, line protocol is up/,'both ends admin up');
assert.match(run('show interfaces Fa0\/24 switchport').output,/Trunking VLANs Enabled: 10/);
assert.match(run('show interfaces status').output,/FastEthernet0\/24\s+connected/);
assert.match(run('show ?').output,/startup-config/);
console.log('PASS: Cisco show help, interfaces, status, port detail, switchport, multi-switch status, existing show commands');
