import { NetworkState } from './types';

/** Configuration-level VLAN path check. Does not simulate frames, MAC learning, or ICMP. */
export function checkVlanPath(
  state: NetworkState,
  vlanId: number,
  fromDevice: string,
  fromIf: string,
  toDevice: string,
  toIf: string,
): { reachable: boolean; detail: string } {
  const start = state.devices[fromDevice];
  const end = state.devices[toDevice];
  if (!start || !end) return { reachable: false, detail: 'Устройство не найдено' };
  for (const [device, port] of [[start, fromIf], [end, toIf]] as const) {
    const iface = device.interfaces[port];
    if (!iface || !iface.adminUp || iface.switchport?.mode !== 'access' ||
        iface.switchport.accessVlan !== vlanId || !device.vlans[vlanId]?.active) {
      return { reachable: false, detail: `${device.hostname} ${port}: access VLAN ${vlanId} не готов` };
    }
  }

  const eligible = (deviceId: string, portName: string): boolean => {
    const device = state.devices[deviceId];
    const port = device?.interfaces[portName];
    return !!device?.vlans[vlanId]?.active && !!port?.adminUp &&
      port.switchport?.mode === 'trunk' &&
      (port.switchport.trunkAllowed === undefined || port.switchport.trunkAllowed.includes(vlanId));
  };

  const visited = new Set<string>([fromDevice]);
  const queue = [fromDevice];
  while (queue.length) {
    const current = queue.shift()!;
    if (current === toDevice) return { reachable: true, detail: `VLAN ${vlanId} проходит между ${fromDevice} и ${toDevice} (проверка конфигурации)` };
    for (const link of state.links) {
      if (!link.up) continue;
      const peer = link.a === current ? { localIf: link.aIf, id: link.b, remoteIf: link.bIf }
        : link.b === current ? { localIf: link.bIf, id: link.a, remoteIf: link.aIf } : null;
      if (!peer || visited.has(peer.id)) continue;
      if (!eligible(current, peer.localIf) || !eligible(peer.id, peer.remoteIf)) continue;
      visited.add(peer.id);
      queue.push(peer.id);
    }
  }
  return { reachable: false, detail: `VLAN ${vlanId}: сквозной L2-путь не подтверждён. Проверьте trunk, allowed VLAN и оба конца линка` };
}
