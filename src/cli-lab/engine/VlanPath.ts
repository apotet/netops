import { NetworkState } from './types';
import { deriveVlanForwarding } from './VlanForwarding';

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
  const forwarding = deriveVlanForwarding(state);
  for (const [device, port] of [[start, fromIf], [end, toIf]] as const) {
    if (!forwarding.accessEndpointReady(device.id, port, vlanId)) {
      return { reachable: false, detail: `${device.hostname} ${port}: access VLAN ${vlanId} не готов (VLAN/admin/link/STP forwarding)` };
    }
  }

  const visited = new Set<string>([fromDevice]);
  const queue = [fromDevice];
  while (queue.length) {
    const current = queue.shift()!;
    if (current === toDevice) return { reachable: true, detail: `VLAN ${vlanId} проходит между ${fromDevice} и ${toDevice} (проверка конфигурации)` };
    for (const peerId of forwarding.neighbors(current, vlanId)) {
      if (!visited.has(peerId)) {
        visited.add(peerId);
        queue.push(peerId);
      }
    }
  }
  return { reachable: false, detail: `VLAN ${vlanId}: сквозной L2-путь не подтверждён. Проверьте VLAN на портах, allowed list, STP forwarding и оба конца линка` };
}
