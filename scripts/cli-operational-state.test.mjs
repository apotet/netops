#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({
  stdin: {
    contents: `export { LabEngine } from './src/cli-lab/engine/LabEngine.ts';
export { interfaceStatus } from './src/cli-lab/engine/OperationalState.ts';
export { snapshotConfig, hasUnsavedChanges, reloadFromStartup } from './src/cli-lab/engine/ConfigPersistence.ts';
export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands.ts';
export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile.ts';
export { ciscoVlanAccessScenario as access } from './src/cli-lab/scenarios/cisco-vlan-access.ts';
export { ciscoTrunkScenario as trunk } from './src/cli-lab/scenarios/cisco-trunk.ts';
export { ciscoL3GatewayScenario as gateway } from './src/cli-lab/scenarios/cisco-l3-gateway.ts';`,
    resolveDir: process.cwd(), sourcefile: 'operational-state-entry.ts', loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const lib = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const { LabEngine, interfaceStatus, snapshotConfig, hasUnsavedChanges, reloadFromStartup, ciscoIosCommands, ciscoIosProfile } = lib;
const port = 'FastEthernet0/24';
const make = state => new LabEngine(ciscoIosProfile, ciscoIosCommands, state);
const run = (e, cmd) => {
  const result = e.execute(cmd);
  assert.equal(result.error, undefined, `${cmd}: ${result.output}`);
  return result.output;
};
const fixture = (adminUp = true, peerUp = true, linkUp = true, mode = 'trunk', legacyUp = false, reverse = false) => {
  const device = (id, enabled) => ({ id, hostname: id.toUpperCase(), vendor: 'cisco-ios', privilege: 15,
    modeCtx: { mode: 'privileged' }, interfaces: { [port]: {
      name: port, adminUp: enabled, operUp: legacyUp,
      ipv4: { address: '192.0.2.1', prefix: 24, mask: '255.255.255.0' }, description: 'test uplink',
      ...(mode ? { switchport: { mode, accessVlan: 10, trunkAllowed: [10, 20] } } : {}),
    } }, vlans: { 10: { id: 10, name: 'Users', active: true } },
    routes: [{ prefix: '0.0.0.0', prefixLen: 0, nextHop: '192.0.2.254', metric: 1 }],
  });
  return { activeDeviceId: 'sw1', devices: { sw1: device('sw1', adminUp), sw2: device('sw2', peerUp) },
    links: [{ a: reverse ? 'sw2' : 'sw1', aIf: port, b: reverse ? 'sw1' : 'sw2', bIf: port, up: linkUp }] };
};
const row = (output, name) => output.split('\n').find(line => line.startsWith(name + ' '));
const checkShows = (e, adminUp, up, mode = 'trunk', name = port, short = 'fa0/24') => {
  const before = structuredClone(e.getState());
  const ctx = e.getState().devices[e.getState().activeDeviceId].modeCtx.mode;
  const show = cmd => run(e, (ctx.startsWith('config') ? 'do ' : '') + cmd);
  const physical = !adminUp ? 'administratively down' : up ? 'up' : 'down';
  const protocol = up ? 'up' : 'down';
  const detail = `${name} is ${physical}, line protocol is ${protocol}`;
  assert.ok(show('show interfaces').includes(detail));
  assert.ok(show(`show interfaces ${short}`).includes(detail));
  const statusRow = row(show('show interfaces status'), name);
  assert.match(statusRow, new RegExp(`\\s${!adminUp ? 'disabled' : up ? 'connected' : 'notconnect'}\\s`));
  const briefRow = row(show('show ip interface brief'), name);
  assert.match(briefRow, new RegExp(`YES unset\\s+${physical}\\s+${protocol}$`));
  const trunkRow = row(show('show interfaces trunk'), name);
  if (mode === 'trunk') assert.match(trunkRow, new RegExp(`on\\s+802\\.1q\\s+${up ? 'trunking' : 'down'}\\s+1$`));
  else assert.equal(trunkRow, undefined, 'configured access/routed ports are not operational trunks');
  assert.deepEqual(e.getState(), before, 'every show is read-only, including runtime and startup snapshot');
};

// 96 cases: access/trunk/routed, local+peer admin, link, stale cache and link direction.
let cases = 0;
for (const mode of ['access', 'trunk', undefined]) for (const admin of [false, true])
for (const peer of [false, true]) for (const link of [false, true])
for (const stale of [false, true]) for (const reverse of [false, true]) {
  const state = fixture(admin, peer, link, mode ?? null, stale, reverse);
  const expected = admin && peer && link;
  assert.equal(interfaceStatus(state, state.devices.sw1, state.devices.sw1.interfaces[port]).operUp, expected);
  const e = make(state);
  checkShows(e, admin, expected, mode ?? null);
  assert.equal(e.checkGoals([{ type: 'if.admin', device: 'sw1', ifName: port, up: admin }]).allPassed, true);
  assert.equal(hasUnsavedChanges(e.getState().devices.sw1), false);
  cases++;
}
assert.equal(cases, 96);

// Missing link, unrelated link, missing peer device/port are never implicit carrier.
for (const change of [
  s => { s.links = []; },
  s => { s.links[0].aIf = 'FastEthernet0/99'; },
  s => { delete s.devices.sw2; },
  s => { delete s.devices.sw2.interfaces[port]; },
]) {
  const state = fixture(true, true, true, 'trunk', true);
  change(state);
  checkShows(make(state), true, false);
}

// A cable may use different interface names on its two ends, in either direction.
for (const reverse of [false, true]) {
  const state = fixture();
  const remote = 'GigabitEthernet0/1';
  state.devices.sw2.interfaces[remote] = { ...state.devices.sw2.interfaces[port], name: remote };
  delete state.devices.sw2.interfaces[port];
  state.links = [reverse
    ? { a: 'sw2', aIf: remote, b: 'sw1', bIf: port, up: true }
    : { a: 'sw1', aIf: port, b: 'sw2', bIf: remote, up: true }];
  checkShows(make(state), true, true);
  state.devices.sw2.interfaces[remote].adminUp = false;
  checkShows(make(state), true, false);
}

// no shutdown/shutdown change only admin configuration; never create/enable a cable.
const e = make(fixture(false, false, false));
run(e, 'conf t'); run(e, 'int fa0/24');
const original = structuredClone(e.getState());
run(e, 'no shutdown');
const expected = structuredClone(original); expected.devices.sw1.interfaces[port].adminUp = true;
assert.deepEqual(e.getState(), expected);
checkShows(e, true, false);
const toggleLink = enabled => {
  const state = structuredClone(e.getState()); state.links[0].up = enabled; e.setState(state);
};
toggleLink(true); checkShows(e, true, false, 'trunk');
e.selectDevice('sw2'); run(e, 'conf t'); run(e, 'int fa0/24'); run(e, 'no shutdown');
e.selectDevice('sw1'); checkShows(e, true, true);
run(e, 'end'); run(e, 'write memory');
const saved = structuredClone(e.getState().devices.sw1.startupConfig);
assert.ok(!('operUp' in saved.interfaces[port]));
for (const enabled of [false, true, false]) {
  toggleLink(enabled); checkShows(e, true, enabled);
  assert.equal(e.checkGoals([{ type: 'config.saved', device: 'sw1' }]).allPassed, true, 'cable is not configuration');
}
const unsaved = structuredClone(e.getState());
unsaved.devices.sw1.interfaces[port].ipv4.address = '198.51.100.1';
unsaved.devices.sw1.interfaces[port].description = 'unsaved description';
unsaved.devices.sw1.interfaces[port].switchport.trunkAllowed = [30];
unsaved.devices.sw1.vlans = {};
unsaved.devices.sw1.routes = [];
e.setState(unsaved);
assert.equal(hasUnsavedChanges(e.getState().devices.sw1), true);
run(e, 'reload'); checkShows(e, true, false);
assert.deepEqual(snapshotConfig(e.getState().devices.sw1), saved, 'saved IP/VLAN/route/admin/description survive reload');
toggleLink(true); checkShows(e, true, true);
e.selectDevice('sw2'); run(e, 'shutdown'); e.selectDevice('sw1'); checkShows(e, true, false);
run(e, 'enable'); run(e, 'reload'); checkShows(e, true, false, 'trunk');
e.selectDevice('sw2'); run(e, 'no shutdown'); e.selectDevice('sw1'); checkShows(e, true, true);
run(e, 'enable'); run(e, 'conf t'); run(e, 'int fa0/24');
run(e, 'shutdown'); checkShows(e, false, false);
run(e, 'end'); run(e, 'copy run start'); run(e, 'conf t'); run(e, 'int fa0/24'); run(e, 'no shutdown');
run(e, 'end'); run(e, 'reload'); checkShows(e, false, false, 'trunk');

// Migrate legacy snapshots without accepting their cached operUp as runtime/config.
const legacy = fixture(true, true, false, 'trunk', true);
legacy.devices.sw1.startupConfig = structuredClone({ hostname: 'SAVED', interfaces: legacy.devices.sw1.interfaces,
  vlans: legacy.devices.sw1.vlans, routes: legacy.devices.sw1.routes });
legacy.devices.sw1.hostname = 'UNSAVED';
const originalLegacy = structuredClone(legacy);
const migrated = make(legacy);
assert.deepEqual(legacy, originalLegacy, 'initialization must not mutate caller-owned scenarios/snapshots');
assert.equal(hasUnsavedChanges(migrated.getState().devices.sw1), true, 'migration does not overwrite genuine startup differences');
run(migrated, 'reload');
assert.equal(migrated.getState().devices.sw1.hostname, 'SAVED');
checkShows(migrated, true, false);
assert.deepEqual(snapshotConfig(migrated.getState().devices.sw1).interfaces[port],
  snapshotConfig(originalLegacy.devices.sw1).interfaces[port]);
assert.equal(hasUnsavedChanges(migrated.getState().devices.sw1), false);
// Runtime-only differences do not create unsaved configuration changes.
const runtimeOnly = structuredClone(originalLegacy.devices.sw1);
runtimeOnly.hostname = runtimeOnly.startupConfig.hostname;
runtimeOnly.interfaces[port].operUp = false;
assert.equal(hasUnsavedChanges(runtimeOnly), false);
// Direct reload must sanitize snapshots too, not only constructor/setState.
const direct = structuredClone(originalLegacy.devices.sw1);
reloadFromStartup(direct);
assert.ok(!('operUp' in direct.interfaces[port]));
assert.ok(!('operUp' in direct.startupConfig.interfaces[port]));
assert.equal(hasUnsavedChanges(direct), false);
// setState and reset also normalize old snapshots without mutating the supplied object.
migrated.setState(originalLegacy);
assert.ok(!('operUp' in migrated.getState().devices.sw1.interfaces[port]));
migrated.reset(originalLegacy);
assert.ok(!('operUp' in migrated.getState().devices.sw1.startupConfig.interfaces[port]));
assert.deepEqual(legacy, originalLegacy);

// Standalone configuration goals remain solvable with no topology link and down/down.
for (const [name, solution, full, short] of [
  ['access', ['en', 'conf t', 'vlan 10', 'name Users', 'exit', 'int fa0/1', 'sw mo a', 'sw acc vl 10', 'no sh'], 'FastEthernet0/1', 'fa0/1'],
  ['trunk', ['en', 'conf t', 'vlan 10', 'exit', 'vlan 20', 'exit', 'int fa0/1', 'sw mo tr', 'sw tr al vl 10,20', 'no sh'], 'FastEthernet0/1', 'fa0/1'],
  ['gateway', ['en', 'conf t', 'hostname R1', 'int gi0/0', 'ip address 192.168.10.1 255.255.255.0', 'no sh', 'exit', 'ip route 0.0.0.0 0.0.0.0 192.168.10.254'], 'GigabitEthernet0/0', 'gi0/0'],
]) {
  const scenario = lib[name];
  const lab = make(scenario.initialState);
  const initial = structuredClone(scenario.initialState);
  assert.equal(lab.checkGoals(scenario.goals).allPassed, false);
  solution.forEach(cmd => run(lab, cmd));
  assert.equal(lab.checkGoals(scenario.goals).allPassed, true, name + ' config goals');
  checkShows(lab, true, false, name, full, short);
  assert.deepEqual(scenario.initialState, initial);
}
console.log('PASS: 96 operational cases × 5 show forms, topology/peer toggles, admin-only commands, runtime-free save/reload/migration, read-only shows and standalone config goals');
