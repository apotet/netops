import type { NetworkState, DeviceState } from './types';
import { checkVlanPath } from './VlanPath';

/**
 * Deterministic, read-only host reachability via a switched VLAN.
 * This is a configuration/forwarding-state model, NOT generated ICMP packets,
 * ARP, FDB learning or inter-VLAN routing.
 */
export interface HostPathResult {
  reachable: boolean;
  vlanId?: number;
  detail: string;
}

function toInt(ip: string): number {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some(v => !Number.isInteger(v) || v < 0 || v > 255)) return NaN;
  return octets.reduce((a, v) => ((a << 8) | v) >>> 0, 0);
}
function sameSubnet(a: string, b: string, prefix: number): boolean {
  if (prefix < 0 || prefix > 32) return false;
  const m = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (toInt(a) & m) === (toInt(b) & m);
}
interface Attachment { host: DeviceState; switchId: string; switchPort: string; ip: { address: string; prefix: number } }
function attachment(state: NetworkState, id: string): Attachment | null {
  const host = state.devices[id];
  if (!host || host.vendor !== 'linux-host') return null;
  const interfaces = Object.values(host.interfaces).filter(i => i.adminUp && i.ipv4);
  if (interfaces.length !== 1) return null;
  const nic = interfaces[0];
  const links = state.links.filter(l =>
    (l.a === id && l.aIf === nic.name) || (l.b === id && l.bIf === nic.name));
  if (links.length !== 1 || !links[0].up) return null;
  const link = links[0];
  const switchId = link.a === id ? link.b : link.a;
  const switchPort = link.a === id ? link.bIf : link.aIf;
  if (state.devices[switchId]?.vendor !== 'cisco-ios') return null;
  return { host, switchId, switchPort, ip: nic.ipv4! };
}

export function checkHostIpv4Reachability(
  state: NetworkState, fromHost: string, toHost: string,
): HostPathResult {
  const a = attachment(state, fromHost), b = attachment(state, toHost);
  if (!a || !b) return { reachable: false, detail: 'ПК без IP или подключённого активного интерфейса' };
  const portA = state.devices[a.switchId].interfaces[a.switchPort];
  const portB = state.devices[b.switchId].interfaces[b.switchPort];
  const vlanA = portA?.switchport?.mode === 'access' ? portA.switchport.accessVlan : undefined;
  const vlanB = portB?.switchport?.mode === 'access' ? portB.switchport.accessVlan : undefined;
  if (!vlanA || vlanA !== vlanB) return { reachable: false, detail: 'ПК подключены к разным или ненастроенным access VLAN; L3-маршрутизация не реализована' };
  if (a.ip.address === b.ip.address) return { reachable: false, vlanId: vlanA, detail: 'Конфликт IP-адресов ПК' };
  if (!sameSubnet(a.ip.address,b.ip.address,a.ip.prefix) ||
      !sameSubnet(a.ip.address,b.ip.address,b.ip.prefix)) {
    return { reachable: false, vlanId: vlanA, detail: 'IP и маски ПК не согласованы для прямой связи' };
  }
  const result = checkVlanPath(state, vlanA, a.switchId, a.switchPort, b.switchId, b.switchPort);
  return { reachable: result.reachable, vlanId: vlanA,
    detail: result.reachable
      ? `ПК ${a.host.hostname} ↔ ${b.host.hostname}: VLAN ${vlanA}, IP и сквозная L2-проходимость подтверждены моделью (без ICMP/ARP)`
      : result.detail };
}
