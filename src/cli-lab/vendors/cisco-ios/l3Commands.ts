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

function maskToPrefix(mask: string): number | null {
  const parts = mask.split('.').map((x) => Number(x));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  let bits = 0;
  let seenZero = false;
  for (const o of parts) {
    for (let i = 7; i >= 0; i--) {
      const bit = (o >> i) & 1;
      if (bit === 1) {
        if (seenZero) return null;
        bits++;
      } else {
        seenZero = true;
      }
    }
  }
  return bits;
}

function isIpv4(s: string): boolean {
  const p = s.split('.').map((x) => Number(x));
  return p.length === 4 && p.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
}

export const ciscoL3Commands: CommandSpec[] = [
  {
    id: 'cisco.ip_address',
    match: ['ip', 'address'],
    modes: ['config-if'],
    minPrivilege: 15,
    handler: (tokens, state, device) => {
      if (tokens.length < 4) {
        return { output: ciscoIosProfile.messages.incomplete, error: true };
      }
      const addr = tokens[2];
      const mask = tokens[3];
      if (!isIpv4(addr) || !isIpv4(mask)) {
        return { output: '% Invalid IP address or mask', error: true };
      }
      const prefix = maskToPrefix(mask);
      if (prefix == null) {
        return { output: '% Incomplete or invalid netmask', error: true };
      }
      const ifName = device.modeCtx.ifName;
      if (!ifName || !device.interfaces[ifName]) {
        return { output: ciscoIosProfile.messages.invalid, error: true };
      }
      const iface = {
        ...device.interfaces[ifName],
        ipv4: { address: addr, prefix, mask },
      };
      device.interfaces = { ...device.interfaces, [ifName]: iface };
      return { output: '', state: commitDevice(state, device) };
    },
  },
  {
    id: 'cisco.no_ip_address',
    match: ['no', 'ip', 'address'],
    modes: ['config-if'],
    minPrivilege: 15,
    handler: (_tokens, state, device) => {
      const ifName = device.modeCtx.ifName;
      if (!ifName || !device.interfaces[ifName]) {
        return { output: ciscoIosProfile.messages.invalid, error: true };
      }
      const cleared = { ...device.interfaces[ifName] };
      delete cleared.ipv4;
      device.interfaces = { ...device.interfaces, [ifName]: cleared };
      return { output: '', state: commitDevice(state, device) };
    },
  },
  {
    id: 'cisco.ip_route',
    match: ['ip', 'route'],
    modes: ['config'],
    minPrivilege: 15,
    handler: (tokens, state, device) => {
      if (tokens.length < 5) {
        return { output: ciscoIosProfile.messages.incomplete, error: true };
      }
      const dest = tokens[2];
      const mask = tokens[3];
      const nh = tokens[4];
      if (!isIpv4(dest) || !isIpv4(mask) || !isIpv4(nh)) {
        return { output: '% Invalid route prefix, mask or next-hop', error: true };
      }
      const prefixLen = maskToPrefix(mask);
      if (prefixLen == null) {
        return { output: '% Incomplete or invalid netmask', error: true };
      }
      const entry = { prefix: dest, prefixLen, nextHop: nh, metric: 1 };
      const routes = device.routes.filter((r) => !(r.prefix === dest && r.prefixLen === prefixLen));
      routes.push(entry);
      device.routes = routes;
      return { output: '', state: commitDevice(state, device) };
    },
  },
  {
    id: 'cisco.show_ip_route',
    match: ['show', 'ip', 'route'],
    modes: ['exec', 'privileged'],
    handler: (_tokens, _state, device) => {
      const lines = ['Codes: C - connected, S - static', ''];
      for (const iface of Object.values(device.interfaces)) {
        if (iface.ipv4 && iface.adminUp) {
          lines.push(`C  ${iface.ipv4.address}/${iface.ipv4.prefix} is directly connected, ${iface.name}`);
        }
      }
      for (const r of device.routes) {
        lines.push(`S  ${r.prefix}/${r.prefixLen} [1/${r.metric ?? 0}] via ${r.nextHop ?? '?'}`);
      }
      if (lines.length === 2) {
        lines.push('% Network not in table');
      }
      return { output: lines.join('\n') };
    },
  },
];
