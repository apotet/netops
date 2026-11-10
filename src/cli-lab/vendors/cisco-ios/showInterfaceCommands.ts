import { CommandSpec, DeviceState, InterfaceState, NetworkState } from '../../engine/types';

function normalizeName(raw: string): string {
  const compact = raw.replace(/\s+/g, '');
  const m = /^(fa|fastethernet|gi|gigabitethernet|eth|ethernet)(\d+(?:\/\d+)*)$/i.exec(compact);
  if (!m) return compact;
  const names: Record<string, string> = { fa: 'FastEthernet', fastethernet: 'FastEthernet', gi: 'GigabitEthernet', gigabitethernet: 'GigabitEthernet', eth: 'Ethernet', ethernet: 'Ethernet' };
  return names[m[1].toLowerCase()] + m[2];
}

function operationalUp(state: NetworkState, device: DeviceState, iface: InterfaceState): boolean {
  if (!iface.adminUp) return false;
  const links = state.links.filter(l =>
    (l.a === device.id && l.aIf === iface.name) ||
    (l.b === device.id && l.bIf === iface.name));
  if (links.length === 0) return iface.operUp;
  return links.some(l => {
    if (!l.up) return false;
    const peerId = l.a === device.id ? l.b : l.a;
    const peerIf = l.a === device.id ? l.bIf : l.aIf;
    return !!state.devices[peerId]?.interfaces[peerIf]?.adminUp;
  });
}

function status(state: NetworkState, device: DeviceState, iface: InterfaceState): { physical: string; protocol: string } {
  const up = operationalUp(state, device, iface);
  return {
    physical: !iface.adminUp ? 'administratively down' : up ? 'up' : 'down',
    protocol: up ? 'up' : 'down',
  };
}

function describe(state: NetworkState, device: DeviceState, iface: InterfaceState): string {
  const { physical, protocol } = status(state, device, iface);
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
  if (tokens.length === 4 && tokens[3].toLowerCase() === 'switchport') return showSwitchport(tokens, state, device);
  if (tokens.length !== 3) return { output: '% Invalid input detected. Use show interfaces [interface-name]', error: true };
  const name = normalizeName(tokens[2]);
  const iface = device.interfaces[name];
  if (!iface) return { output: `% Invalid interface ${tokens[2]}`, error: true };
  return { output: describe(state, device, iface) };
}

function showStatus(tokens: string[], state: NetworkState, device: DeviceState) {
  if (tokens.length !== 3) return { output: '% Invalid input detected', error: true };
  const lines = ['Port                 Status                Vlan       Duplex  Speed  Type'];
  for (const iface of Object.values(device.interfaces)) {
    const { physical } = status(state, device, iface);
    const st = physical === 'up' ? 'connected' : physical === 'administratively down' ? 'disabled' : 'notconnect';
    const vlan = iface.switchport?.mode === 'trunk' ? 'trunk' :
      iface.switchport?.mode === 'access' ? String(iface.switchport.accessVlan ?? 1) : '1';
    lines.push(`${iface.name.padEnd(21)}${st.padEnd(22)}${vlan.padEnd(11)}auto    auto   simulated`);
  }
  return { output: lines.join('\n') + '\n\nCLI Lab: speed/duplex and link negotiation are not emulated.' };
}

function showSwitchport(tokens: string[], _state: NetworkState, device: DeviceState) {
  if (tokens.length !== 4) return { output: '% Incomplete command.', error: true };
  const iface = device.interfaces[normalizeName(tokens[2])];
  if (!iface) return { output: `% Invalid interface ${tokens[2]}`, error: true };
  const sw = iface.switchport;
  return { output: [
    `Name: ${iface.name}`,
    `Administrative Mode: ${sw?.mode ?? 'unset'}`,
    `Access Mode VLAN: ${sw?.accessVlan ?? 1}`,
    `Trunking VLANs Enabled: ${sw?.trunkAllowed?.join(',') ?? '1-4094'}`,
    'CLI Lab: operational switching/negotiation not emulated.',
  ].join('\n') };
}

export const ciscoInterfaceShowCommands: CommandSpec[] = [
  {
    id: 'cisco.show_incomplete', match: ['show'],
    modes: ['exec', 'privileged'],
    handler: (tokens) => {
      if (tokens.length === 1) return { output: '% Incomplete command. Type show ? to list supported commands.', error: true };
      return { output: '% Invalid input detected. Type show ? for CLI Lab commands.', error: true };
    },
  },
  {
    id: 'cisco.show_help', match: ['show', '?'],
    modes: ['exec', 'privileged'],
    handler: (tokens) => tokens.length === 2
      ? { output: ['CLI Lab: supported show subcommands (Cisco IOS subset):',
        '  interfaces                 Interface state and switchport configuration',
        '  interfaces <interface>     One interface, e.g. Fa0/24',
        '  interfaces status          Port status table',
        '  interfaces trunk           Trunk summary',
        '  interfaces <interface> switchport  Port switchport configuration',
        '  ip interface brief         Interface IP and state',
        '  vlan brief                 Local VLAN database',
        '  running-config             Active configuration (privileged EXEC)',
        '  startup-config             Saved configuration (privileged EXEC)',
        '  ip route                   Routes where supported',
        'Type ? for general mode help. No real counters, traffic, or PHY simulation.',
      ].join('\n') }
      : { output: '% Invalid input detected', error: true },
  },
  {
    id: 'cisco.show_interfaces_status', match: ['show', 'interfaces', 'status'],
    modes: ['exec', 'privileged'], handler: showStatus,
  },
  {
    id: 'cisco.show_interfaces', match: ['show', 'interfaces'],
    modes: ['exec', 'privileged'], handler: showInterfaces,
  },
  {
    id: 'cisco.show_interface', match: ['show', 'interface'],
    modes: ['exec', 'privileged'], handler: showInterfaces,
  },
];
