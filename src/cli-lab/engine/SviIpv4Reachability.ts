import type { NetworkState, DeviceState, InterfaceState } from './types';

/**
 * Configuration-only reachability model. It distinguishes an owned address,
 * an unambiguous remote SVI path and duplicate ownership. No ICMP/ARP packets.
 */
function toInt(address: string): number {
  return address.split('.').reduce((n, octet) => ((n << 8) | Number(octet)) >>> 0, 0);
}
function sameSubnet(a: string, b: string, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (toInt(a) & mask) === (toInt(b) & mask);
}
function svi(dev: DeviceState, vlanId: number) {
  const iface = dev.interfaces[`Vlan${vlanId}`];
  return iface && iface.adminUp && dev.vlans[vlanId]?.active ? iface : undefined;
}

/** Local VLAN membership is independent of how the peer is configured. */
export function carriesLocalVlan(dev: DeviceState, iface: InterfaceState, vlanId: number): boolean {
  if (!iface.adminUp || !dev.vlans[vlanId]?.active) return false;
  if (iface.switchport?.mode === 'access') return iface.switchport.accessVlan === vlanId;
  if (iface.switchport?.mode === 'trunk') {
    return iface.switchport.trunkAllowed === undefined || iface.switchport.trunkAllowed.includes(vlanId);
  }
  return false;
}

function physicalLinkUp(state: NetworkState, id: string, port: string): boolean {
  return state.links.some(link => {
    if (!link.up) return false;
    const remote = link.a === id && link.aIf === port ? [link.b, link.bIf] :
      link.b === id && link.bIf === port ? [link.a, link.aIf] : null;
    return !!remote && !!state.devices[id]?.interfaces[port]?.adminUp &&
      !!state.devices[remote[0]]?.interfaces[remote[1]]?.adminUp;
  });
}

/** Approximate local SVI autostate using a link-up local VLAN port only. */
export function localSviPortUp(state: NetworkState, id: string, vlanId: number): boolean {
  const dev = state.devices[id];
  return !!dev && Object.values(dev.interfaces).some(port =>
    carriesLocalVlan(dev, port, vlanId) && physicalLinkUp(state, id, port.name)
  );
}

/** L2 traversal requires VLAN compatibility on both ends of a link. */
export function trunkNeighbors(state: NetworkState, id: string, vlanId: number): string[] {
  const peers: string[] = [];
  for (const link of state.links) {
    if (!link.up) continue;
    const local = link.a === id ? [link.aIf, link.b, link.bIf] :
      link.b === id ? [link.bIf, link.a, link.aIf] : null;
    if (!local) continue;
    const [port, peerId, peerPort] = local;
    const me = state.devices[id], peer = state.devices[peerId];
    if (!me || !peer) continue;
    const from = me.interfaces[port], to = peer.interfaces[peerPort];
    if (!from || !to || !carriesLocalVlan(me, from, vlanId) || !carriesLocalVlan(peer, to, vlanId)) continue;
    // A tagged trunk-to-access mismatch is not a valid modeled path for VLAN > 1.
    if (from.switchport?.mode !== to.switchport?.mode) continue;
    peers.push(peerId);
  }
  return peers;
}

export type SviReachabilityKind = 'remote' | 'local' | 'conflict' | 'unreachable';
export interface SviReachability {
  reachable: boolean;
  kind: SviReachabilityKind;
  detail: string;
}

export function checkSviIpv4Reachability(
  state: NetworkState, sourceId: string, destinationAddress: string,
): SviReachability {
  const source = state.devices[sourceId];
  if (!source) return { reachable: false, kind: 'unreachable', detail: 'Исходный коммутатор не найден' };
  const origins = Object.values(source.interfaces).filter(iface =>
    /^Vlan\d+$/i.test(iface.name) && iface.adminUp && iface.ipv4 &&
    !!source.vlans[Number(iface.name.slice(4))]?.active &&
    localSviPortUp(state, sourceId, Number(iface.name.slice(4))) &&
    sameSubnet(iface.ipv4.address, destinationAddress, iface.ipv4.prefix)
  );
  if (!origins.length) return {
    reachable: false, kind: 'unreachable',
    detail: `Нет активного локального SVI в подсети назначения ${destinationAddress}`,
  };

  const localMatches = origins.filter(iface => iface.ipv4!.address === destinationAddress);
  // Inspect connected components per VLAN, not isolated devices or other VLANs.
  const remoteMatches: { device: string; vlan: number }[] = [];
  for (const origin of origins) {
    const vlanId = Number(origin.name.slice(4));
    const visited = new Set([sourceId]);
    const queue = [sourceId];
    while (queue.length) {
      const id = queue.shift()!;
      if (id !== sourceId) {
        const dev = state.devices[id];
        const target = dev && svi(dev, vlanId);
        if (target?.ipv4?.address === destinationAddress && localSviPortUp(state, id, vlanId)) {
          // Count owners before validating the reverse subnet. A conflicting
          // /32 owner still makes the destination ambiguous on the same VLAN.
          remoteMatches.push({ device: id, vlan: vlanId });
        }
      }
      for (const next of trunkNeighbors(state, id, vlanId)) {
        if (!visited.has(next)) { visited.add(next); queue.push(next); }
      }
    }
  }

  if (localMatches.length && remoteMatches.length || remoteMatches.length > 1 || localMatches.length > 1) {
    return { reachable: false, kind: 'conflict',
      detail: `CONFLICT: адрес ${destinationAddress} принадлежит нескольким SVI в одной достижимой VLAN; нормальная IP-связность не подтверждена` };
  }
  if (localMatches.length) {
    return { reachable: true, kind: 'local',
      detail: `LOCAL: ${destinationAddress} — собственный адрес активного SVI; это не доказательство связи с другим коммутатором` };
  }
  if (remoteMatches.length === 1) {
    const owner = remoteMatches[0];
    const target = svi(state.devices[owner.device], owner.vlan);
    const origin = origins.find(iface => Number(iface.name.slice(4)) === owner.vlan &&
      sameSubnet(destinationAddress, iface.ipv4!.address, target!.ipv4!.prefix));
    if (!origin) return { reachable: false, kind: 'unreachable',
      detail: `Адрес ${destinationAddress} найден на ${owner.device.toUpperCase()}, но обратная on-link подсеть не совпадает` };
    return { reachable: true, kind: 'remote',
      detail: `REMOTE: ${destinationAddress} найден на ${remoteMatches[0].device.toUpperCase()} через VLAN ${remoteMatches[0].vlan}; L2-путь и обе подсети согласованы` };
  }
  return { reachable: false, kind: 'unreachable',
    detail: `Нет подтверждённого SVI IPv4-пути к ${destinationAddress}. Проверьте IP/маску, VLAN, L2-путь и линк (маршрутизация/ARP/ICMP не моделируются)` };
}
