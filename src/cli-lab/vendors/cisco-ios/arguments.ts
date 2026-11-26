import { CommandArgument } from '../../engine/types';

/** Canonical decimal-only policy: no signs, blanks, hex, exponent or leading-zero octets. */
export function isIpv4(value: string): boolean {
  return /^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value) &&
    value.split('.').every(octet => Number(octet) <= 255);
}

export function maskToPrefix(mask: string): number | null {
  if (!isIpv4(mask)) return null;
  let bits = 0, seenZero = false;
  for (const octet of mask.split('.').map(Number)) {
    for (let i = 7; i >= 0; i--) {
      if ((octet >> i) & 1) {
        if (seenZero) return null;
        bits++;
      } else seenZero = true;
    }
  }
  return bits;
}

/** Validate an interface host address, not an IPv4 route prefix. */
export function isAssignableIpv4(address: string, prefix: number): boolean {
  if (!isIpv4(address) || prefix < 1 || prefix > 32) return false;
  const n = address.split('.').reduce((value, octet) => ((value << 8) | Number(octet)) >>> 0, 0);
  // Unspecified, loopback, multicast and limited broadcast are not normal interface unicast.
  const first = n >>> 24;
  if (first === 0 || first === 127 || first >= 224) return false;
  if (prefix >= 31) return true; // /31 point-to-point and /32 loopback-style unicast
  const hostBits = 32 - prefix;
  const hostMask = (2 ** hostBits - 1) >>> 0;
  const host = n & hostMask;
  return host !== 0 && host !== hostMask;
}

export function isSviInterface(name: string): boolean {
  return /^Vlan\d+$/i.test(name);
}
export function isLayer2Interface(device: import('../../engine/types').DeviceState, name: string): boolean {
  return !!device.interfaces[name]?.switchport;
}

export function normalizeIfaceName(raw: string): string {
  const compact = raw.replace(/\s+/g, '');
  const m = /^(fa|fastethernet|gi|gigabitethernet|eth|ethernet|vlan)(\d+(?:\/\d+)*)$/i.exec(compact);
  if (!m) return compact;
  const names: Record<string, string> = { fa: 'FastEthernet', fastethernet: 'FastEthernet', gi: 'GigabitEthernet', gigabitethernet: 'GigabitEthernet', eth: 'Ethernet', ethernet: 'Ethernet', vlan: 'Vlan' };
  return names[m[1].toLowerCase()] + m[2];
}

/** Same VLAN-list parser for the grammar and trunk operations; [] is not default all. */
export function parseVlanList(raw: string): number[] | null {
  if (!/^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.test(raw)) return null;
  const result = new Set<number>();
  for (const part of raw.split(',')) {
    const [left, right = left] = part.split('-');
    const lo = Number(left), hi = Number(right);
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 1 || hi > 4094 || lo > hi) return null;
    for (let v = lo; v <= hi; v++) result.add(v);
  }
  return [...result].sort((a, b) => a - b);
}

export const ipv4Argument: CommandArgument = { name: 'A.B.C.D', description: 'IPv4 address', validate: isIpv4 };
export const maskArgument: CommandArgument = { name: 'A.B.C.D', description: 'Contiguous subnet mask (/0 through /32)', validate: value => maskToPrefix(value) !== null };
// Contextual help distinguishes interface assignment from a route prefix;
// the final policy rejection is handled by the interface command.
export const interfaceMaskArgument: CommandArgument = { name: 'A.B.C.D', description: 'Interface subnet mask (/1 through /32)', validate: value => maskToPrefix(value) !== null };
export const wordArgument: CommandArgument = { name: 'WORD', description: 'Device hostname', validate: value => value.length > 0 };
export const vlanArgument: CommandArgument = { name: '<1-4094>', description: 'VLAN identifier', validate: value => /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 4094 };
export const vlanListArgument: CommandArgument = { name: '<vlan-list>', description: 'VLAN IDs/ranges, e.g. 10,20-30', validate: value => parseVlanList(value) !== null };
export const interfaceArgument: CommandArgument = { name: 'INTERFACE', description: 'Existing interface, e.g. Fa0/24', validate: (value, device) => !!device?.interfaces[normalizeIfaceName(value)] };
// Preserve the existing IOS spelling "interface Fa 0/1" without accepting arbitrary trailing tokens.
export const interfaceTypeArgument: CommandArgument = { name: 'INTERFACE-TYPE', description: 'Interface type followed by number', validate: (value, device) =>
  /^(fa|fastethernet|gi|gigabitethernet|eth|ethernet|vlan)$/i.test(value) &&
  Object.keys(device?.interfaces ?? {}).some(name => name.startsWith(normalizeIfaceName(value + '0').slice(0, -1))) };
export const interfaceNumberArgument: CommandArgument = { name: 'INTERFACE-NUMBER', description: 'Existing port number', validate: (value, device, preceding) =>
  /^\d+(?:\/\d+)*$/.test(value) && !!device?.interfaces[normalizeIfaceName(preceding[preceding.length - 1] + value)] };
// VLAN names are ASCII strings (1–32 chars); retain all words instead of silently truncating.
export const vlanNameArgument: CommandArgument = { name: 'WORD', description: 'VLAN name (1–32 ASCII characters, words allowed)', rest: true,
  validate: (value, _device, preceding) => {
    const name = [...preceding.slice(1), value].join(' ');
    return /^[\x20-\x7e]{1,32}$/.test(name);
  } };
