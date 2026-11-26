import { normalizeIfaceName, interfaceArgument, interfaceTypeArgument, interfaceNumberArgument } from './arguments';
import { interfaceStatus } from '../../engine/OperationalState';
import { CommandSpec, DeviceState, InterfaceState, NetworkState } from '../../engine/types';

function describe(state: NetworkState, device: DeviceState, iface: InterfaceState): string {
  const { physical, protocol } = interfaceStatus(state, device, iface);
  const sw = iface.switchport;
  const lines = [
    `${iface.name} is ${physical}, line protocol is ${protocol}`,
    '  Hardware is simulated Ethernet (CLI Lab; no packet/counter/PHY emulation)',
    `  Description: ${iface.description ?? '(not set)'}`,
    `  Internet address: ${iface.ipv4 ? iface.ipv4.address + '/' + iface.ipv4.prefix : 'unassigned'}`,
    `  Switchport: ${sw?.mode ?? 'not modeled'}`,
  ];
  if (sw?.mode === 'access') lines.push(`  Access VLAN: ${sw.accessVlan ?? 1}`);
  if (sw?.mode === 'trunk') lines.push(`  Trunk allowed VLANs: ${sw.trunkAllowed?.join(',') ?? '1-4094 (default)'}`);
  return lines.join('\n');
}

function showInterfaces(tokens: string[], state: NetworkState, device: DeviceState) {
  if (tokens.length === 2) {
    return { output: Object.values(device.interfaces).map(i => describe(state, device, i)).join('\n\n') };
  }
  const wantsSwitchport = tokens[tokens.length - 1]?.toLowerCase() === 'switchport';
  const parts = tokens.slice(2, wantsSwitchport ? -1 : undefined);
  if (parts.length < 1 || parts.length > 2) {
    return { output: '% Invalid input detected. Use show interfaces [interface-name]', error: true };
  }
  const ifaceName = normalizeIfaceName(parts.join(' '));
  const iface = device.interfaces[ifaceName];
  if (!iface) return { output: `% Invalid interface ${parts.join(' ')}`, error: true };
  if (wantsSwitchport) {
    if (!iface.switchport) return { output: '% Switchport not available on this Layer 3 interface', error: true };
    return showSwitchport(iface);
  }
  return { output: describe(state, device, iface) };
}

function showStatus(tokens: string[], state: NetworkState, device: DeviceState) {
  if (tokens.length !== 3) return { output: '% Invalid input detected', error: true };
  const lines = ['Port                 Status                Vlan       Duplex  Speed  Type'];
  for (const iface of Object.values(device.interfaces)) {
    const { physical } = interfaceStatus(state, device, iface);
    const st = physical === 'up' ? 'connected' : physical === 'administratively down' ? 'disabled' : 'notconnect';
    const vlan = iface.switchport?.mode === 'trunk' ? 'trunk' :
      iface.switchport?.mode === 'access' ? String(iface.switchport.accessVlan ?? 1) : '--';
    lines.push(`${iface.name.padEnd(21)}${st.padEnd(22)}${vlan.padEnd(11)}auto    auto   simulated`);
  }
  return { output: lines.join('\n') + '\n\nCLI Lab: speed/duplex and link negotiation are not emulated.' };
}

function showSwitchport(iface: InterfaceState) {
  const sw = iface.switchport!;
  return { output: [
    `Name: ${iface.name}`,
    `Administrative Mode: ${sw.mode}`,
    `Access Mode VLAN: ${sw.accessVlan ?? 1}`,
    `Trunking VLANs Enabled: ${sw.trunkAllowed?.join(',') ?? '1-4094'}`,
    'CLI Lab: operational switching/negotiation not emulated.',
  ].join('\n') };
}

function showIpInterface(tokens: string[], state: NetworkState, device: DeviceState) {
  const name = normalizeIfaceName(tokens.slice(3).join(' '));
  const iface = device.interfaces[name];
  if (!iface) return { output: `% Invalid interface ${name}`, error: true };
  const status = interfaceStatus(state, device, iface);
  const lines = [
    `${name} is ${status.physical}, line protocol is ${status.protocol}`,
    `  Internet address is ${iface.ipv4 ? `${iface.ipv4.address}/${iface.ipv4.prefix}` : 'unassigned'}`,
    `  Subnet mask is ${iface.ipv4?.mask ?? 'unassigned'}`,
    '  CLI Lab: IP interface state is simulated; ARP and packets are not emulated.',
  ];
  return { output: lines.join('\\n') };
}

export const ciscoInterfaceShowCommands: CommandSpec[] = [
  {
    id: 'cisco.show_ip_interface',
    match: ['show', 'ip', 'interface'],
    arguments: [[interfaceArgument], [interfaceTypeArgument, interfaceNumberArgument]],
    modes: ['exec', 'privileged'],
    handler: showIpInterface,
  },
  {
    id: 'cisco.show_interfaces_status', match: ['show', 'interfaces', 'status'],
    modes: ['exec', 'privileged'], handler: showStatus,
  },
  {
    id: 'cisco.show_interfaces', match: ['show', 'interfaces'],
    arguments: [[], [interfaceArgument], [interfaceTypeArgument, interfaceNumberArgument],
      [interfaceArgument, { keyword: 'switchport', description: 'Display interface switching configuration' }],
      [interfaceTypeArgument, interfaceNumberArgument, { keyword: 'switchport', description: 'Display interface switching configuration' }]],
    modes: ['exec', 'privileged'], handler: showInterfaces,
  },
];
