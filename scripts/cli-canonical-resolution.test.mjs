#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({
  stdin: {
    contents: `export { LabEngine } from './src/cli-lab/engine/LabEngine.ts';
export { commandFor } from './src/cli-lab/engine/CommandResolution.ts';
export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands.ts';
export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile.ts';
export { ciscoTwoSwitchVlanScenario as twoSwitch } from './src/cli-lab/scenarios/cisco-two-switch-vlan.ts';
export { ciscoVlanAccessScenario as access } from './src/cli-lab/scenarios/cisco-vlan-access.ts';
export { ciscoTrunkScenario as trunk } from './src/cli-lab/scenarios/cisco-trunk.ts';
export { ciscoL3GatewayScenario as gateway } from './src/cli-lab/scenarios/cisco-l3-gateway.ts';`,
    resolveDir: process.cwd(), sourcefile: 'canonical-resolution-entry.ts', loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const lib = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const { LabEngine, commandFor, ciscoIosCommands, ciscoIosProfile } = lib;
const make = (scenario = lib.twoSwitch) => new LabEngine(ciscoIosProfile, ciscoIosCommands, scenario.initialState);
const run = (e, line) => {
  const result = e.execute(line);
  assert.equal(result.error, undefined, `${line}: ${result.output}`);
  return result.output;
};
const readOnly = (e, action) => {
  const before = structuredClone(e.getState());
  const result = action();
  assert.deepEqual(e.getState(), before, 'TAB/help must not execute commands or change goals');
  return result;
};
const help = (e, line) => readOnly(e, () => run(e, line));
const tab = (e, line) => readOnly(e, () => e.complete(line));
const bad = (e, line, pattern) => {
  const before = structuredClone(e.getState());
  const result = e.execute(line);
  assert.equal(result.error, true, `${line} must fail`);
  assert.match(result.output, pattern);
  assert.deepEqual(e.getState(), before);
};

// Equivalent spellings resolve to the same command ID, output and resulting state.
for (const [id, spellings, setup] of [
  ['cisco.configure_terminal', ['configure terminal', 'conf terminal', 'configure t', 'conf t', '  CoNf   TeRmInAl  '], ['enable']],
  ['cisco.show_running_config', ['show running-config', 'sh run', 'sh r', ' SH   R '], ['enable']],
  ['cisco.write_memory', ['write memory', 'write mem', 'wr mem', 'wr memory', ' WR   MEM '], ['enable', 'conf t', 'hostname CHANGED', 'end']],
  ['cisco.show_interfaces', ['show interfaces', 'show interface', 'sh int'], ['enable']],
]) {
  let expected;
  for (const line of spellings) {
    const e = make();
    setup.forEach(c => run(e, c));
    const resolved = commandFor(ciscoIosCommands, line.trim().split(/\s+/), 'privileged', 15);
    assert.equal(resolved.spec?.id, id, line);
    assert.equal(resolved.ambiguous, undefined, line);
    const output = run(e, line);
    const actual = { output, state: e.getState() };
    if (!expected) expected = actual;
    else assert.deepEqual(actual, expected, `${line} differs from canonical spelling`);
  }
}

const e = make();
run(e, 'enable');
assert.deepEqual(tab(e, 'conf'), { completed: 'configure ', candidates: ['configure'] });
assert.deepEqual(tab(e, 'sh r'), { completed: 'sh running-config ', candidates: ['running-config'] });
assert.equal(tab(e, 'show run').completed, 'show running-config ');
assert.equal(tab(e, 'sh int').completed, 'sh interfaces ');
assert.equal(tab(e, 'wr').completed, 'write ');
assert.equal(tab(e, 'wr mem').completed, 'wr memory ');
assert.equal(tab(e, '  SH   R').completed, 'SH running-config ');
assert.match(help(e, 'conf?'), /configure/);
assert.doesNotMatch(help(e, 'conf?'), /terminal/);
assert.match(help(e, 'conf ?'), /terminal/);
assert.match(help(e, 'sh r?'), /running-config/);
assert.doesNotMatch(help(e, 'sh r?'), /<cr>/);
assert.match(help(e, 'sh r ?'), /<cr>/);
assert.match(help(e, 'sh int ?'), /INTERFACE/);
assert.match(help(e, 'wr ?'), /memory/);
assert.equal(help(e, 'show ?   '), help(e, 'show ?'), 'whitespace after ? must not move the help context');
assert.equal(readOnly(e, () => e.help('conf ')), help(e, 'conf ?'));

// TAB completes exactly one typed keyword, never submits or builds a whole command.
for (const input of ['', ' ', 'conf ', 'sh r ', 'wr mem ']) assert.equal(tab(e, input).completed, undefined);
let line = tab(e, 'conf').completed;
for (let i = 0; i < 3; i++) line = tab(e, line).completed ?? line;
assert.equal(line, 'configure ');
assert.equal(e.getPrompt(), 'SW1#');
run(e, 'conf terminal');

// Abbreviated do uses the same EXEC context for TAB, both ? forms and Enter.
for (const mode of ['config', 'config-if', 'config-vlan']) {
  const scoped = make();
  run(scoped, 'enable');
  run(scoped, 'conf terminal');
  if (mode === 'config-if') run(scoped, 'int fa0/24');
  if (mode === 'config-vlan') run(scoped, 'vlan 20');
  for (const prefix of ['do', 'd', 'DO', 'D']) {
    assert.equal(tab(scoped, `${prefix} sh r`).completed, `${prefix} sh running-config `);
    assert.equal(tab(scoped, `${prefix} sh int`).completed, `${prefix} sh interfaces `);
    assert.match(help(scoped, `${prefix} sh ?`), /running-config/);
    assert.match(help(scoped, `${prefix} sh r?`), /running-config/);
    assert.match(help(scoped, `${prefix} sh r ?`), /<cr>/);
    assert.match(readOnly(scoped, () => run(scoped, `${prefix} sh r`)), /Current configuration:/);
    assert.equal(tab(scoped, `${prefix} sh `).completed, undefined);
    assert.equal(scoped.getState().devices.sw1.modeCtx.mode, mode);
  }
}

// Genuine ambiguity is preserved and never mutates state or chooses a branch.
run(e, 'int fa0/24');
for (const partial of ['sw tr al vl a', 'SW TR AL VL A']) {
  assert.deepEqual(tab(e, partial), { candidates: ['add', 'all'] });
  assert.match(help(e, partial + '?'), /add/);
  assert.match(help(e, partial + '?'), /all/);
  bad(e, partial + ' 20', /% Ambiguous command: add, all/);
}
assert.equal(tab(e, 'sw mo a').completed, 'sw mo access ');
run(e, 'sw mo a');
assert.equal(e.getState().devices.sw1.interfaces['FastEthernet0/24'].switchport.mode, 'access');

// Exact keyword takes precedence over longer keywords for Enter and TAB alike.
const exactSpecs = ['foo', 'foobar', 'foobaz'].map(keyword => ({
  id: keyword, match: [keyword], modes: ['privileged'], handler: () => ({ output: keyword }),
}));
const exactState = structuredClone(e.getState());
exactState.devices.sw1.modeCtx = { mode: 'privileged' };
const exact = new LabEngine(ciscoIosProfile, exactSpecs, exactState);
assert.deepEqual(tab(exact, 'foo'), { completed: 'foo ', candidates: ['foo'] });
assert.equal(run(exact, 'foo'), 'foo');
assert.deepEqual(tab(exact, 'foob'), { completed: 'fooba', candidates: ['foobar', 'foobaz'] });
bad(exact, 'foob', /Ambiguous/);

// Removing aliases must also remove their weaker mode/privilege gates.
for (const mode of ['exec', 'privileged', 'config', 'config-if', 'config-vlan']) {
  const state = structuredClone(e.getState());
  state.devices.sw1.modeCtx = { mode };
  state.devices.sw1.privilege = 1;
  const restricted = new LabEngine(ciscoIosProfile, ciscoIosCommands, state);
  for (const command of ['show running-config', 'sh run', 'sh r', 'conf terminal', 'conf t', 'wr mem', 'write memory', 'do sh r', ...(mode.startsWith('config') ? ['d sh r'] : [])]) {
    bad(restricted, command, /Invalid/);
  }
  assert.deepEqual(tab(restricted, 'sh r').candidates, []);
  assert.deepEqual(tab(restricted, 'd sh r').candidates, []);
  assert.doesNotMatch(help(restricted, 'sh ?'), /running-config/);
  assert.doesNotMatch(help(restricted, 'd sh ?'), /running-config/);
}
const user = make();
for (const cmd of ['show run', 'show running-config', 'conf t', 'do sh r']) bad(user, cmd, /Invalid/);
assert.deepEqual(tab(user, 'conf').candidates, []);

// The three original standalone scenario solutions must still work with abbreviations.
// Multi-switch scenarios, negative paths and saves are covered by the existing scripts.
for (const [name, solution] of [
  ['access', ['en', 'conf terminal', 'vlan 10', 'name Users', 'exit', 'int fa0/1', 'sw mo a', 'sw acc vl 10', 'no sh']],
  ['trunk', ['en', 'conf terminal', 'vlan 10', 'exit', 'vlan 20', 'exit', 'int fa0/1', 'sw mo tr', 'sw tr al vl 10,20', 'no sh']],
  ['gateway', ['en', 'conf terminal', 'hostname R1', 'int gi0/0', 'ip address 192.168.10.1 255.255.255.0', 'no sh', 'exit', 'ip route 0.0.0.0 0.0.0.0 192.168.10.254']],
]) {
  const scenario = lib[name];
  const lab = make(scenario);
  assert.equal(lab.checkGoals(scenario.goals).allPassed, false, name);
  solution.forEach(cmd => run(lab, cmd));
  assert.equal(lab.checkGoals(scenario.goals).allPassed, true, name);
  if (name === 'gateway') run(lab, 'int gi0/0');
  run(lab, 'shutdown');
  assert.equal(lab.checkGoals(scenario.goals).allPassed, false, name);
}
console.log('PASS: canonical command identity, TAB/?/Enter contracts, real ambiguity, modes/privilege, do and VLAN/Trunk/Gateway');
