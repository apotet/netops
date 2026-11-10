#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const compiled = await build({
  stdin: { contents: `export { LabEngine } from './src/cli-lab/engine/LabEngine.ts';
export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands.ts';
export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile.ts';
export { ciscoTwoSwitchVlanScenario } from './src/cli-lab/scenarios/cisco-two-switch-vlan.ts';`,
    resolveDir: process.cwd(), sourcefile:'context-help-entry.ts',loader:'ts' },
  bundle:true, platform:'node', format:'esm', write:false,logLevel:'silent',
});
const lib=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const e=new lib.LabEngine(lib.ciscoIosProfile,lib.ciscoIosCommands,structuredClone(lib.ciscoTwoSwitchVlanScenario.initialState));
const run=(cmd)=>{const r=e.execute(cmd);assert.equal(r.error,undefined,`${cmd}: ${r.output}`);return r.output;};
const help=(cmd)=>{const before=JSON.stringify(e.getState());const output=run(cmd);assert.equal(JSON.stringify(e.getState()),before,`${cmd} mutated state`);return output;};
assert.match(help('?'),/enable/);
assert.match(help('show ?'),/interfaces/);
assert.doesNotMatch(help('show ?'),/running-config/, 'user EXEC must not show privileged-only commands');
assert.doesNotMatch(help('?'),/configure/, 'user EXEC must not show config commands');
run('enable');
assert.match(help('?'),/configure/);
assert.match(help('show ?'),/running-config/);
run('conf t');
assert.match(help('?'),/interface/);
assert.match(help('do show ?'),/interfaces/);
assert.doesNotMatch(help('?'),/copy/, 'copy not available in config');
run('interface fa0/24');
const first=help('switchport ?');
assert.match(first,/mode/);
assert.match(first,/access/);
assert.match(first,/trunk/);
assert.doesNotMatch(first,/dynamic/, 'unsupported DTP modes must be absent');
assert.match(help('switchport mode ?'),/access/);
assert.match(help('switchport mode ?'),/trunk/);
assert.match(help('switchport mode a?'),/access/);
assert.doesNotMatch(help('switchport mode a?'),/trunk/);
assert.match(help('switchport mode access ?'),/<cr>/);
assert.match(help('switchport access vlan ?'),/<1-4094>/);
assert.match(help('switchport trunk allowed vlan ?'),/<vlan-list>/);
assert.match(help('do show interfaces ?'),/status/);
assert.match(help('do show interfaces ?'),/trunk/);
assert.match(help('do show interfaces ?'),/INTERFACE/);
assert.match(help('do show interfaces fa0\/24 ?'),/switchport/);
assert.match(help('do show interfaces fa0\/24 ?'),/<cr>/);
assert.match(help('shutdown ?'),/<cr>/);
assert.doesNotMatch(help('show ?'),/interface/, 'show directly not available from interface config without do');
assert.match(help('sw?'),/switchport/);
assert.doesNotMatch(help('sw?'),/shutdown/);
assert.match(help('interface-not-real ?'),/Unrecognized/);
const before=e.getState().devices.sw1.interfaces['FastEthernet0/24'].switchport?.mode;
help('switchport mode trunk ?');
assert.equal(e.getState().devices.sw1.interfaces['FastEthernet0/24'].switchport?.mode,before);
run('switchport mode trunk');
assert.equal(e.getState().devices.sw1.interfaces['FastEthernet0/24'].switchport.mode,'trunk');
console.log('PASS: context-sensitive ? inline help is accurate, privilege-aware, read-only, and never invents unsupported keywords');
