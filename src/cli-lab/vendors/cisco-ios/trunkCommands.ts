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

function parseVlanList(raw: string): number[] | null {
  const ids = new Set<number>();
  for (const part of raw.split(',')) {
    const p = part.trim();
    if (!p) continue;
    if (p.includes('-')) {
      const [a, b] = p.split('-').map((x) => Number(x.trim()));
      if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b > 4094 || a > b) return null;
      for (let i = a; i <= b; i++) ids.add(i);
    } else {
      const n = Number(p);
      if (!Number.isInteger(n) || n < 1 || n > 4094) return null;
      ids.add(n);
    }
  }
  return Array.from(ids).sort((a, b) => a - b);
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
  {
    id: 'cisco.switchport_trunk_allowed_vlan',
    match: ['switchport', 'trunk', 'allowed', 'vlan'],
    modes: ['config-if'],
    minPrivilege: 15,
    handler: (tokens, state, device) => {
      // switchport trunk allowed vlan 10,20
      if (tokens.length < 5) {
        return { output: ciscoIosProfile.messages.incomplete, error: true };
      }
      const listRaw = tokens.slice(4).join('');
      const vlans = parseVlanList(listRaw);
      if (!vlans || vlans.length === 0) {
        return { output: '% Invalid VLAN list', error: true };
      }
      const ifName = device.modeCtx.ifName;
      if (!ifName || !device.interfaces[ifName]) {
        return { output: ciscoIosProfile.messages.invalid, error: true };
      }
      const prev = device.interfaces[ifName];
      const iface = {
        ...prev,
        switchport: {
          mode: 'trunk' as const,
          trunkAllowed: vlans,
        },
      };
      device.interfaces = { ...device.interfaces, [ifName]: iface };
      return { output: '', state: commitDevice(state, device) };
    },
  },
  {
    id: 'cisco.show_interfaces_trunk',
    match: ['show', 'interfaces', 'trunk'],
    modes: ['exec', 'privileged'],
    handler: (_tokens, _state, device) => {
      const lines = [
        'Port        Mode             Encapsulation  Status        Native vlan',
      ];
      const trunks = Object.values(device.interfaces).filter((i) => i.switchport?.mode === 'trunk');
      if (trunks.length === 0) {
        return { output: lines.join('\n') + '\n' };
      }
      for (const iface of trunks) {
        const status = iface.adminUp ? 'trunking' : 'down';
        lines.push(
          `${iface.name.padEnd(12, ' ')}on               802.1q         ${status.padEnd(14, ' ')}1`
        );
      }
      lines.push('');
      lines.push('Port        Vlans allowed on trunk');
      for (const iface of trunks) {
        const allowed = iface.switchport?.trunkAllowed?.join(',') || '1-4094';
        lines.push(`${iface.name.padEnd(12, ' ')}${allowed}`);
      }
      return { output: lines.join('\n') };
    },
  },
];
