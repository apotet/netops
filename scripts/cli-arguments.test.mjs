#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({
  stdin: { contents: `export { LabEngine } from './src/cli-lab/engine/LabEngine';
export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands';
export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile';
export { ciscoTwoSwitchVlanScenario as scenario } from './src/cli-lab/scenarios/cisco-two-switch-vlan';
export { ciscoIosModesScenario as modesScenario } from './src/cli-lab/scenarios/cisco-ios-modes';`,
    resolveDir: process.cwd(), sourcefile: 'arguments-entry.ts', loader: 'ts' },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const lib = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const make = (mode = 'config-if', privilege = 15, routed = false) => {
  const state = structuredClone(lib.scenario.initialState);
  const d = state.devices.sw1;
  // IPv4 grammar tests run on a routed interface; access/trunk ports must
  // reject interface addresses under the F5 role policy.
  if (routed) d.interfaces['GigabitEthernet0/0'] = { name: 'GigabitEthernet0/0', adminUp: true };
  d.modeCtx = { mode, ifName: routed ? 'GigabitEthernet0/0' : 'FastEthernet0/1', vlanId: 20 }; d.privilege = privilege;
  d.vlans[20] = { id: 20, name: 'Users', active: true };
  d.interfaces['FastEthernet0/1'].switchport = { mode: 'trunk', trunkAllowed: [10] };
  return new lib.LabEngine(lib.ciscoIosProfile, lib.ciscoIosCommands, state);
};
const run = (e, cmd) => {
  const r = e.execute(cmd); assert.equal(r.error, undefined, `${cmd}: ${r.output}`); return r.output;
};
const matrix = [];
// Every row exercises Enter, syntax ?, TAB, and the before/after state contract.
const check = (mode, line, outcome, cr = outcome === 'complete') => {
  const e = make(mode, 15, /^\s*ip\s+address\b/i.test(line));
  const before = structuredClone(e.getState());
  const help = e.execute(line + ' ?').output;
  const tab = e.complete(line);
  assert.deepEqual(e.getState(), before, line + ': help/TAB mutated state');
  assert.equal(help.includes('<cr>'), cr, line + ': incorrect <cr>: ' + help);
  const r = e.execute(line);
  if (outcome === 'complete') assert.equal(r.error, undefined, line + ': ' + r.output);
  else {
    assert.equal(r.error, true, line + ': should reject');
    assert.match(r.output, new RegExp(outcome, 'i'), line);
    assert.deepEqual(e.getState(), before, line + ': rejected command mutated state');
  }
  matrix.push({ mode, line, enter: r.error ? r.output : 'accepted', help, tab, helpTabReadOnly: true,
    stateChanged: JSON.stringify(e.getState()) !== JSON.stringify(before) });
  return e;
};

// IPv4 lexical acceptance and interface-assignment policy are separate.
for (const ip of ['192.0.2.1', '0.0.0.0', '255.255.255.255']) {
  check('config-if', `ip address ${ip} 255.255.255.0`, ip === '192.0.2.1' ? 'complete' : 'invalid', true);
  // IPv4 grammar accepts these literals; route semantics must reject invalid
  // destinations or next-hops without changing the running state.
  check('config', `ip route ${ip} 0.0.0.0 ${ip}`, 'invalid', true);
}
for (let prefix = 0; prefix <= 32; prefix++) {
  const mask = Array.from({ length: 4 }, (_, i) => {
    const bits = Math.max(0, Math.min(8, prefix - i * 8)); return 256 - 2 ** (8 - bits);
  }).join('.');
  check('config-if', `ip address 192.0.2.1 ${mask}`, prefix === 0 ? 'invalid' : 'complete', true);
  check('config', `ip route 0.0.0.0 ${mask} 192.0.2.254`, 'complete');
}

// Interface role restrictions must not affect generic IPv4 parsing or the route grammar.
const layer2Ip = make('config-if');
assert.equal(layer2Ip.execute('ip address 192.0.2.1 255.255.255.0').error, true);
const routedIp = make('config-if', 15, true);
assert.equal(routedIp.execute('ip address 192.0.2.1 255.255.255.0').error, undefined);
for (const addr of ['192.0.2.0', '192.0.2.255']) {
  const routed = make('config-if', 15, true);
  const before = structuredClone(routed.getState());
  assert.equal(routed.execute(`ip address ${addr} 255.255.255.0`).error, true);
  assert.deepEqual(routed.getState(), before);
}


// Strict route semantics must reject host bits and unsafe next hops.
for (const cmd of [
  'ip route 10.0.0.5 255.255.255.0 192.0.2.254',
  'ip route 0.0.0.0 0.0.0.0 0.0.0.0',
  'ip route 0.0.0.0 0.0.0.0 255.255.255.255',
]) check('config', cmd, 'invalid', true);

const invalidIps = ['192..1.1', '1.2.3.', '.1.2.3', '1.2.3.256', '1.2.x.4', '-1.2.3.4', '1.2.3.4.5',
  '01.2.3.4', '+1.2.3.4', '1e1.2.3.4', '0x1.2.3.4', '1.2.3', '1.2.3.-1', '1.2.3.+4', '000.0.0.0'];
for (const ip of invalidIps) {
  check('config-if', `ip address ${ip} 255.255.255.0`, 'invalid');
  check('config', `ip route ${ip} 255.255.255.0 192.0.2.254`, 'invalid');
  check('config', `ip route 192.0.2.0 255.255.255.0 ${ip}`, 'invalid');
}
for (const mask of ['255.0.255.0', '255..255.0', '255.255.255.256', '255.255.255.-1', '255.255.255.01']) {
  check('config-if', `ip address 192.0.2.1 ${mask}`, 'invalid');
  check('config', `ip route 192.0.2.0 ${mask} 192.0.2.254`, 'invalid');
}
for (const line of ['ip', 'ip address', 'ip address 192.0.2.1']) check('config-if', line, 'incomplete');
for (const line of ['ip route', 'ip route 192.0.2.0', 'ip route 192.0.2.0 255.255.255.0']) check('config', line, 'incomplete');

// Every registered command gets an explicit valid witness and a tail-rejection test.
const samples = {
  'cisco.stp_bridge_priority': 'spanning-tree vlan 1 priority 4096',
  'cisco.no_stp_bridge_priority': 'no spanning-tree vlan 1 priority',
  'cisco.stp_cost': 'spanning-tree cost 10',
  'cisco.stp_port_priority': 'spanning-tree port-priority 16',
  'cisco.hostname': 'hostname NETOPS', 'cisco.vlan': 'vlan 20', 'cisco.vlan_name': 'name Users',
  'cisco.interface': 'interface Fa0/1', 'cisco.switchport_access_vlan': 'switchport access vlan 20',
  'cisco.ip_address': 'ip address 192.0.2.1 255.255.255.0', 'cisco.ip_route': 'ip route 0.0.0.0 0.0.0.0 192.0.2.254',
  'cisco.show_ip_interface': 'show ip interface FastEthernet0/1',
  'cisco.ping': 'ping 192.0.2.1',
  'cisco.do': 'do show ip interface brief',
  'cisco.switchport_trunk_allowed_vlan': 'switchport trunk allowed vlan 10,20',
  'cisco.switchport_trunk_allowed_vlan_add': 'switchport trunk allowed vlan add 20',
  'cisco.switchport_trunk_allowed_vlan_remove': 'switchport trunk allowed vlan remove 20',
};
for (const spec of lib.ciscoIosCommands) {
  const sample = samples[spec.id] ?? spec.match.join(' ');
  check(spec.modes[0], sample, 'complete');
  if (spec.id === 'cisco.vlan_name') check('config-vlan', 'name ' + 'X'.repeat(33), 'invalid');
  else check(spec.modes[0], sample + ' junk', 'invalid');
}

for (const line of ['configure', 'copy run', 'show', 'show ip']) check('privileged', line, 'incomplete');
for (const line of ['show frog', 'show ip frog', 'configure moon', 'show run | include hostname', 'show interfaces fa0/999',
  'show interfaces fa0/1 speed', 'show interfaces fa0/1 switchport junk']) check('privileged', line, 'invalid');
for (const line of ['interface Fa0/999', 'interface Fa0/1 extra', 'interface Fa 0/1 extra']) check('config', line, 'invalid');
for (const id of [0, 4095, -1, '1e1', '+10', '1.0']) {
  check('config', `vlan ${id}`, 'invalid'); check('config-if', `switchport access vlan ${id}`, 'invalid');
}
for (const id of [1, 4094]) check('config', `vlan ${id}`, 'complete');
for (const list of ['5000', '0', '20-10', '1,4095', '10,', '1e1', '-1']) {
  check('config-if', `sw tr al vl ${list}`, 'invalid');
  check('config-if', `sw tr al vl add ${list}`, 'invalid');
}
for (const line of ['sw tr al vl', 'sw tr al vl add']) check('config-if', line, 'incomplete');
for (const line of ['sw tr al vl a', 'sw tr al vl a 20']) check('config-if', line, 'ambiguous');

// Positive abbreviation, word/syntax help, and keyword-after-argument contracts.
const e = make();
const before = structuredClone(e.getState());
assert.match(e.help('switchport trunk allowed vlan a?'), /add/);
assert.match(e.help('switchport trunk allowed vlan a?'), /all/);
assert.match(e.help('switchport trunk allowed vlan add ?'), /vlan-list/);
assert.match(e.help('ip address ?'), /A.B.C.D/);
assert.match(e.help('ip address 192.0.2.1 ?'), /mask/);
assert.doesNotMatch(e.help('ip address 192.0.2.1?'), /<cr>/);
assert.match(e.help('do show interfaces Fa0/1 ?'), /switchport/);
assert.match(e.help('do show interfaces Fa0/1 ?'), /<cr>/);
assert.equal(e.complete('do sh int Fa0/1 sw').completed, 'do sh int Fa0/1 switchport ');
assert.match(e.help('do sh int Fa0/1 sw?'), /switchport/);
assert.match(run(e, 'do sh int Fa0/1 sw'), /Administrative Mode:/);
assert.deepEqual(e.getState(), before);
for (const line of ['ip address 192..1.1 255.255.255.0', 'do sh int Fa0/999 sw', 'sw tr al vl 20-10', 'shutdown junk']) {
  assert.deepEqual(e.complete(line), { candidates: [] });
}
for (const [line, completed] of [['sw mo a', 'sw mo access '], ['d sh r', 'd sh running-config '], ['sw tr al vl rem', 'sw tr al vl remove ']]) {
  assert.equal(e.complete(line).completed, completed);
}
let tabLine = e.complete('sw').completed;
for (let i = 0; i < 3; i++) tabLine = e.complete(tabLine).completed ?? tabLine;
assert.equal(tabLine, 'switchport ');
assert.deepEqual(e.getState(), before);

// Explicit do and unique d delegation use identical EXEC syntax in every config mode.
for (const mode of ['config', 'config-if', 'config-vlan']) for (const prefix of ['do', 'd', 'DO']) {
  check(mode, `${prefix} sh ip int br`, 'complete');
  check(mode, `${prefix} sh ip int br junk`, 'invalid');
  check(mode, `${prefix} sh ip`, 'incomplete');
  const scoped = make(mode); const originalMode = structuredClone(scoped.getState().devices.sw1.modeCtx);
  run(scoped, `${prefix} sh r`);
  assert.deepEqual(scoped.getState().devices.sw1.modeCtx, originalMode);
}
for (const mode of ['exec', 'privileged']) check(mode, 'do show ip interface brief', 'invalid');
check('config', 'show ip interface brief', 'invalid');
const low = make('config', 1); const lowBefore = structuredClone(low.getState());
assert.equal(low.execute('do sh r').error, true); assert.doesNotMatch(low.help('do sh r ?'), /<cr>/);
assert.deepEqual(low.complete('do sh r'), { candidates: [] }); assert.deepEqual(low.getState(), lowBefore);

// Preserve separated interface type+number and free-text VLAN names without truncation.
check('config', 'interface Fa 0/1', 'complete');
const named = check('config-vlan', 'name Users West', 'complete');
assert.equal(named.getState().devices.sw1.vlans[20].name, 'Users West');
check('config-vlan', 'name ' + 'A'.repeat(32), 'complete');
for (const line of ['  IP   ADDRESS  192.0.2.1  255.255.255.0  ', 'no sh', 'sw mo acc']) check('config-if', line, 'complete');
for (const line of ['conf terminal', 'configure t', 'conf t']) check('privileged', line, 'complete');
for (const line of ['sh run', 'sh r', 'wr mem']) check('privileged', line, 'complete');

// Handler-level errors are transactional too, even if a handler returns a changed state.
const transactional = new lib.LabEngine(lib.ciscoIosProfile, [{ id: 'reject', match: ['reject'], modes: ['privileged'],
  handler: (_tokens, state, device) => { device.hostname = 'BAD'; return { output: '% rejected', error: true, state }; } }], make('privileged').getState());
const transactionBefore = structuredClone(transactional.getState());
assert.equal(transactional.execute('reject').error, true); assert.deepEqual(transactional.getState(), transactionBefore);

// Exercise all seven IOS modes steps independently of the baseline lesson-link assertion.
const modes = new lib.LabEngine(lib.ciscoIosProfile, lib.ciscoIosCommands, lib.modesScenario.initialState);
for (const [i, cmd] of ['en', 'conf terminal', 'int Fa 0/1', 'ex', 'hostname NETOPS', 'end', 'copy run start'].entries()) {
  run(modes, cmd); assert.equal(modes.checkGoals(lib.modesScenario.steps[i].accept).allPassed, true, cmd);
}
assert.equal(modes.checkGoals(lib.modesScenario.goals).allPassed, true);
run(modes, 'reload'); assert.equal(modes.getPrompt(), 'NETOPS>');

if (process.argv.includes('--matrix')) console.log(JSON.stringify(matrix, null, 2));
else console.log(`PASS: ${matrix.length} Enter/?/TAB/state rows, all ${lib.ciscoIosCommands.length} registered commands, IPv4/masks, typed arguments, ambiguity/do, free-text names, atomic errors and IOS modes 7 steps`);
