import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

mkdirSync(resolve('scripts/.cache'), { recursive: true });
const outfile = resolve('scripts/.cache/cli-two-switch-svi.mjs');
await build({
  stdin: { contents: `
    export { LabEngine } from './src/cli-lab/engine/LabEngine';
    export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile';
    export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands';
    export { ciscoTwoSwitchSviScenario } from './src/cli-lab/scenarios/cisco-two-switch-svi';
  `, resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent',
});
const { LabEngine, ciscoIosProfile, ciscoIosCommands, ciscoTwoSwitchSviScenario } =
  await import(pathToFileURL(outfile).href);
const scenario = ciscoTwoSwitchSviScenario;
const lab = new LabEngine(ciscoIosProfile, ciscoIosCommands, structuredClone(scenario.initialState));
function cmd(line) {
  const result = lab.execute(line);
  assert.equal(result.error, undefined, line + ': ' + result.output);
  return result;
}
assert.equal(scenario.goals.length, 19);
assert.equal(lab.checkGoals(scenario.goals).allPassed, false);
for (const [device, ip] of [['sw1','192.168.10.2'], ['sw2','192.168.10.3']]) {
  lab.selectDevice(device);
  for (const line of [
    'enable', 'configure terminal', 'vlan 10', 'exit',
    'interface fa0/1', 'switchport mode access', 'switchport access vlan 10', 'no shutdown', 'exit',
    'interface fa0/24', 'switchport mode trunk', 'switchport trunk allowed vlan 10', 'no shutdown', 'exit',
    'interface vlan 10', 'ip address ' + ip + ' 255.255.255.0', 'no shutdown', 'end',
  ]) cmd(line);
  const state = lab.getState().devices[device];
  assert.equal(state.interfaces.Vlan10.ipv4.address, ip);
  assert.equal(state.interfaces.Vlan10.ipv4.prefix, 24);
  assert.ok(cmd('show ip interface brief').output.includes(ip));
}
// Connectivity is available only after both SVI IPv4 endpoints and VLAN trunk are ready.
lab.selectDevice('sw1');
assert.match(cmd('ping 192.168.10.3').output, /: REACHABLE/);
assert.ok(!cmd('ping 192.168.10.3').output.includes('UNREACHABLE'));
assert.match(cmd('show ip interface brief').output, /Vlan10.*up\s+up/);
lab.selectDevice('sw2');
assert.match(cmd('ping 192.168.10.2').output, /: REACHABLE/);
assert.match(cmd('ping 192.168.20.1').output, /: UNREACHABLE/);

// Wrong mask: a configured IP without a common IPv4 subnet cannot pass.
cmd('configure terminal');
cmd('interface vlan 10');
cmd('ip address 192.168.10.3 255.255.255.255');
cmd('end');
assert.match(cmd('ping 192.168.10.2').output, /: UNREACHABLE/);
assert.equal(lab.checkGoals(scenario.goals).results.find(r => r.predicate.type === 'ipv4.sviReachable' && r.predicate.device === 'sw1')?.passed, false);
cmd('configure terminal');
cmd('interface vlan 10');
cmd('ip address 192.168.10.3 255.255.255.0');
cmd('end');
assert.match(cmd('ping 192.168.10.2').output, /: REACHABLE/);

// A locally excluded VLAN makes SW2's own SVI down; SW1's SVI remains up (checked below).
cmd('configure terminal');
cmd('interface fa0/24');
cmd('switchport trunk allowed vlan none');
cmd('end');
assert.match(cmd('ping 192.168.10.2').output, /: UNREACHABLE/);
assert.equal(lab.checkGoals(scenario.goals).results.find(r => r.predicate.type === 'ipv4.sviReachable')?.passed, false);
assert.match(cmd('show ip interface brief').output, /Vlan10.*down\s+down/);
cmd('configure terminal');
cmd('interface fa0/24');
cmd('switchport trunk allowed vlan 10');
cmd('end');
assert.match(cmd('ping 192.168.10.2').output, /: REACHABLE/);

// Link-down should invalidate both the test command and state-based goal.
const prior = structuredClone(lab.getState());
const cut = structuredClone(prior);
cut.links[0].up = false;
lab.setState(cut);
assert.match(cmd('ping 192.168.10.2').output, /: UNREACHABLE/);
assert.equal(lab.checkGoals(scenario.goals).results.find(r => r.predicate.type === 'ipv4.sviReachable')?.passed, false);
lab.setState(prior);
assert.match(cmd('ping 192.168.10.2').output, /: REACHABLE/);

assert.equal(lab.checkGoals(scenario.goals).allPassed, false, 'not saved yet');
lab.selectDevice('sw1');
cmd('copy running-config startup-config');
assert.equal(lab.checkGoals(scenario.goals).allPassed, false, 'SW2 not yet saved');
lab.selectDevice('sw2');
cmd('write memory');
assert.equal(lab.checkGoals(scenario.goals).allPassed, true, 'all config and L2 path checks passed');
cmd('configure terminal');
cmd('interface vlan 10');
cmd('shutdown');
assert.equal(lab.checkGoals(scenario.goals).allPassed, false, 'admin down invalidates completion');
cmd('no shutdown');
assert.equal(lab.checkGoals(scenario.goals).allPassed, true, 'restoring identical running config matches saved startup config');
cmd('end');
cmd('write memory');
assert.equal(lab.checkGoals(scenario.goals).allPassed, true, 'restored and saved');

 
// F2: local address cannot satisfy a remote-reachability goal; duplicates are conflicts.
lab.selectDevice('sw1');
assert.match(cmd('ping 192.168.10.2').output, /: LOCAL/);
assert.equal(lab.checkGoals([{ type:'ipv4.sviReachable',device:'sw1',destination:'192.168.10.2' }]).allPassed,false);
lab.selectDevice('sw2');
cmd('configure terminal');
cmd('interface vlan 10');
cmd('ip address 192.168.10.2 255.255.255.0');
cmd('end');
lab.selectDevice('sw1');
assert.match(cmd('ping 192.168.10.2').output, /: CONFLICT/);
lab.selectDevice('sw2');
cmd('configure terminal');
cmd('interface vlan 10');
cmd('ip address 192.168.10.3 255.255.255.0');
cmd('end');

// F2 regression: reverse /32 does not hide duplicate ownership.
const duplicated = structuredClone(lab.getState());
duplicated.devices.sw3 = structuredClone(duplicated.devices.sw2);
duplicated.devices.sw3.id = 'sw3';
duplicated.devices.sw3.hostname = 'SW3';
duplicated.devices.sw3.interfaces.Vlan10.ipv4 = {
  address: '192.168.10.3', prefix: 32, mask: '255.255.255.255',
};
duplicated.links.push({
  a: 'sw1', aIf: 'FastEthernet0/23', b: 'sw3', bIf: 'FastEthernet0/24', up: true,
});
duplicated.devices.sw1.interfaces['FastEthernet0/23'] = {
  name: 'FastEthernet0/23', adminUp: true,
  switchport: { mode: 'trunk', trunkAllowed: [10] },
};
const savedBeforeConflict = structuredClone(lab.getState());
lab.setState(duplicated);
lab.selectDevice('sw1');
assert.match(cmd('ping 192.168.10.3').output, /: CONFLICT/);
assert.equal(lab.checkGoals([{ type: 'ipv4.sviReachable', device: 'sw1', destination: '192.168.10.3' }]).allPassed, false);
lab.setState(savedBeforeConflict);

// F3: local SVI autostate stays up if peer removes VLAN from its trunk.
cmd('configure terminal');
cmd('interface fa0/24');
cmd('switchport trunk allowed vlan none');
cmd('end');
lab.selectDevice('sw1');
assert.match(cmd('show ip interface brief').output, /Vlan10.*up\s+up/);
assert.match(cmd('ping 192.168.10.3').output, /: UNREACHABLE/);
lab.selectDevice('sw2');
cmd('configure terminal');
cmd('interface fa0/24');
cmd('switchport trunk allowed vlan 10');
cmd('end');
for (const id of ['sw1','sw2']) {
  lab.selectDevice(id);
  cmd('configure terminal');
  cmd('interface fa0/24');
  cmd('switchport mode access');
  cmd('switchport access vlan 10');
  cmd('end');
  assert.match(cmd('show ip interface brief').output, /Vlan10.*up\s+up/);
}
lab.selectDevice('sw1');
assert.match(cmd('ping 192.168.10.3').output, /: REACHABLE/);
assert.equal(lab.checkGoals([{
  type: 'l2.vlanReachable', vlanId: 10, fromDevice: 'sw1', fromIf: 'FastEthernet0/1',
  toDevice: 'sw2', toIf: 'FastEthernet0/1',
}]).allPassed, true, 'access-access must match ping L2 model');
assert.equal(lab.checkGoals([{
  type: 'if.trunkAllowed', device: 'sw1', ifName: 'FastEthernet0/24', vlans: [10],
}]).allPassed, false, 'explicit trunk scenario goal must remain unmet');

// F4: invalid subnet network/broadcast addresses are not interface hosts.
lab.selectDevice('sw2');
cmd('configure terminal');
cmd('interface vlan 10');
for (const address of ['192.168.10.0','192.168.10.255']) {
  assert.equal(lab.execute('ip address '+address+' 255.255.255.0').error,true,address);
}
cmd('ip address 192.168.10.0 255.255.255.254'); // /31 permits both addresses
cmd('ip address 192.168.10.2 255.255.255.255'); // /32 permits host
cmd('ip address 192.168.10.3 255.255.255.0');

// F5: reject L3 commands on L2 switchports and switchport commands on SVIs.
cmd('exit');
cmd('interface fa0/1');
assert.equal(lab.execute('ip address 192.168.10.3 255.255.255.0').error,true);
cmd('exit');
cmd('interface vlan 10');
for(const line of ['switchport mode trunk','switchport mode access',
  'switchport trunk allowed vlan 10','switchport access vlan 10']) {
  assert.equal(lab.execute(line).error,true,line);
}
cmd('end');
assert.doesNotMatch(cmd('show interfaces trunk').output,/Vlan10\s+/);

// F6: bad arguments in a valid mode are not incorrect-mode errors.
const invalidPing=lab.execute('ping 1.2.3.999');
assert.equal(invalidPing.error,true);
assert.doesNotMatch(invalidPing.output,/недоступна в этом режиме/);
cmd('configure terminal');
cmd('interface vlan 10');
const invalidMask=lab.execute('ip address 192.168.10.3 255.0.255.0');
assert.equal(invalidMask.error,true);
assert.doesNotMatch(invalidMask.output,/недоступна в этом режиме/);
cmd('end');

// The existing router scenario still accepts a routed interface and /0 default route.
const router = new LabEngine(ciscoIosProfile,ciscoIosCommands,{
  activeDeviceId:'r1',links:[],devices:{r1:{
    id:'r1',hostname:'R1',vendor:'cisco-ios',privilege:0,modeCtx:{mode:'exec'},
    interfaces:{'GigabitEthernet0/0':{name:'GigabitEthernet0/0',adminUp:false}},
    vlans:{},routes:[]
  }}
});
for(const line of ['enable','configure terminal','interface gi0/0',
  'ip address 192.168.10.1 255.255.255.0','exit',
  'ip route 0.0.0.0 0.0.0.0 192.168.10.254']) {
  const result=router.execute(line);
  assert.equal(result.error,undefined,line+': '+result.output);
}

console.log('PASS Cisco two-switch SVI IPv4 modeled ping, autostate, mask/trunk/link-negative tests and persistence');
