#!/usr/bin/env node
// Regression: Tab completes only user-typed CLI keywords, never invents commands.
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({
  entryPoints: ['src/cli-lab/engine/LabEngine.ts'],
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const url = 'data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].contents).toString('base64');
const { LabEngine } = await import(url);
const commands = [
  ['switchport', 'mode', 'access'],
  ['switchport', 'mode', 'trunk'],
  ['switchport', 'access', 'vlan'],
  ['shutdown'],
  ['vlan'],
].map((match, i) => ({
  id: 'case-' + i,
  match,
  modes: ['config-if'],
  handler: () => ({ output: '' }),
}));
const engine = new LabEngine(
  { id: 'cisco-ios', displayName: 'Cisco IOS', capabilities: [], initialMode: { mode: 'config-if' },
    prompt: () => 'Switch(config-if)#', messages: { invalid: '% Invalid', incomplete: '% Incomplete', needEnable: '% Enable' } },
  commands,
  { activeDeviceId: 'sw1', links: [], devices: { sw1: { id: 'sw1', hostname: 'Switch', vendor: 'cisco-ios',
    privilege: 15, modeCtx: { mode: 'config-if' }, interfaces: {}, vlans: {}, routes: [] } } },
);

function expected(input, output) {
  const actual = engine.complete(input).completed;
  assert.equal(actual, output, JSON.stringify(input) + ' Tab');
}
expected('', undefined);
expected(' ', undefined);
expected('switchport ', undefined);
expected('switchport mode ', undefined);
expected('switchport access vlan ', undefined);
expected('vlan ', undefined);
expected('sw', 'switchport ');
expected('switchport mo', 'switchport mode ');
expected('switchport mode a', 'switchport mode access ');
expected('switchport mode tr', 'switchport mode trunk ');
expected('switchport acc', 'switchport access ');

// Repeated Tab does not progress beyond the user's typed partial keyword.
let line = engine.complete('sw').completed;
for (let i = 0; i < 3; i++) line = engine.complete(line).completed ?? line;
assert.equal(line, 'switchport ');
console.log('PASS: CLI Tab completion regression');
