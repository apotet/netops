import { parseVlanList, vlanListArgument, isLayer2Interface } from './arguments';
import { interfaceStatus } from '../../engine/OperationalState';
import { CommandSpec, DeviceState, NetworkState } from '../../engine/types';
import { ciscoIosProfile } from './profile';

function commitDevice(state: NetworkState, device: DeviceState): NetworkState {
  return {
    ...state,
    devices: {
      ...state.devices,
      [device.id]: { ...device },
    },
  };
}

/** A trunk without an explicit allowed list permits VLAN IDs 1–4094. [] means none. */
const ALL_VLANS = Array.from({ length: 4094 }, (_, i) => i + 1);

export function formatAllowedVlans(allowed?: number[]): string {
  if (allowed === undefined) return '1-4094';
  if (allowed.length === 0) return 'none';
  const sorted = [...new Set(allowed)].sort((a, b) => a - b);
  const chunks: string[] = [];
  for (let i = 0; i < sorted.length;) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    chunks.push(j === i ? String(sorted[i]) : sorted[i] + '-' + sorted[j]);
    i = j + 1;
  }
  return chunks.join(',');
}

function updateAllowed(tokens: string[], state: NetworkState, device: DeviceState) {
  const ifName = device.modeCtx.ifName;
  const iface = ifName ? device.interfaces[ifName] : undefined;
  if (!iface) return { output: ciscoIosProfile.messages.invalid, error: true };
  if (!isLayer2Interface(device, ifName!)) return { output: '% Switchport configuration is not available on this interface', error: true };
  if (iface.switchport?.mode !== 'trunk') {
    return { output: '% Configure switchport mode trunk first', error: true };
  }

  const operation = tokens[4]?.toLowerCase();
  let allowed: number[] | undefined;
  if (operation === 'all' || operation === 'none') {
    if (tokens.length !== 5) return { output: '% Invalid input detected', error: true };
    allowed = operation === 'all' ? undefined : [];
  } else {
    const modifier = operation === 'add' || operation === 'remove' ? operation : 'replace';
    const offset = modifier === 'replace' ? 4 : 5;
    if (tokens.length !== offset + 1) {
      return { output: tokens.length <= offset ? ciscoIosProfile.messages.incomplete : '% Invalid VLAN list', error: true };
    }
    const vlanList = parseVlanList(tokens[offset]);
    if (!vlanList) return { output: '% Invalid VLAN list', error: true };
    if (modifier === 'replace') allowed = vlanList;
    else {
      const prior = iface.switchport.trunkAllowed ?? ALL_VLANS;
      const choice = new Set(vlanList);
      allowed = modifier === 'add'
        ? [...new Set([...prior, ...vlanList])].sort((a, b) => a - b)
        : prior.filter(v => !choice.has(v));
      if (allowed.length === 4094) allowed = undefined;
    }
  }
  device.interfaces = {
    ...device.interfaces,
    [ifName!]: { ...iface, switchport: { ...iface.switchport, mode: 'trunk', trunkAllowed: allowed } },
  };
  return { output: '', state: commitDevice(state, device) };
}

export const ciscoTrunkCommands: CommandSpec[] = [
  {
    id: 'cisco.switchport_mode_trunk',
    match: ['switchport', 'mode', 'trunk'],
    modes: ['config-if'],
    minPrivilege: 15,
    handler: (_tokens, state, device) => {
      const ifName = device.modeCtx.ifName;
      if (!ifName || !device.interfaces[ifName]) {
        return { output: ciscoIosProfile.messages.invalid, error: true };
      }
      if (!isLayer2Interface(device, ifName)) {
        return { output: '% Switchport configuration is not available on this interface', error: true };
      }
      const prev = device.interfaces[ifName];
      const iface = {
        ...prev,
        switchport: {
          mode: 'trunk' as const,
          trunkAllowed: prev.switchport?.trunkAllowed,
          accessVlan: undefined,
        },
      };
      device.interfaces = { ...device.interfaces, [ifName]: iface };
      return { output: '', state: commitDevice(state, device) };
    },
  },
  ...(['add', 'remove', 'all', 'none'] as const).map(operation => ({
    id: 'cisco.switchport_trunk_allowed_vlan_' + operation,
    match: ['switchport', 'trunk', 'allowed', 'vlan', operation],
    arguments: operation === 'add' || operation === 'remove' ? [[vlanListArgument]] : [[]],
    modes: ['config-if'] as const as ('config-if')[],
    minPrivilege: 15,
    handler: (tokens: string[], state: NetworkState, device: DeviceState) => updateAllowed(tokens, state, device),
  })),
  {
    id: 'cisco.switchport_trunk_allowed_vlan',
    match: ['switchport', 'trunk', 'allowed', 'vlan'],
    arguments: [[vlanListArgument]],
    modes: ['config-if'],
    minPrivilege: 15,
    handler: updateAllowed,
  },
  {
    id: 'cisco.show_interfaces_trunk',
    match: ['show', 'interfaces', 'trunk'],
    modes: ['exec', 'privileged'],
    handler: (_tokens, state, device) => {
      const lines = [
        `${'Port'.padEnd(21)}${'Mode'.padEnd(17)}${'Encapsulation'.padEnd(15)}${'Status'.padEnd(14)}Native vlan`,
      ];
      const trunks = Object.values(device.interfaces).filter((i) => i.switchport?.mode === 'trunk');
      if (trunks.length === 0) {
        return { output: lines.join('\n') + '\n' };
      }
      for (const iface of trunks) {
        const status = interfaceStatus(state, device, iface).operUp ? 'trunking' : 'down';
        lines.push(
          `${iface.name.padEnd(21, ' ')}${'on'.padEnd(17)}${'802.1q'.padEnd(15)}${status.padEnd(14, ' ')}1`
        );
      }
      lines.push('');
      lines.push(`${'Port'.padEnd(21)}Vlans allowed on trunk`);
      for (const iface of trunks) {
        const allowed = formatAllowedVlans(iface.switchport?.trunkAllowed);
        lines.push(`${iface.name.padEnd(21, ' ')}${allowed}`);
      }
      return { output: lines.join('\n') + '\n\nCLI Lab: configured trunks are listed even when down; negotiation and STP forwarding are not emulated.' };
    },
  },
];
