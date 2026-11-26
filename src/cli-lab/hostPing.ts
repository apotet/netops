import type { DeviceState, NetworkState } from './engine/types';
import { checkHostIpv4Reachability } from './engine/HostIpv4Reachability';
import { isAssignableIpv4, isIpv4, maskToPrefix } from './vendors/cisco-ios/arguments';

export interface HostPingResult {
  status: 'reply' | 'timeout' | 'syntax';
  output: string;
}
const scope = 'Учебная модель ПК → ПК. Настоящие ICMP-пакеты не отправляются.';
const usage = 'Доступна только команда ping <IPv4> для другого ПК модели.';
function validHostIp(host: DeviceState): boolean {
  const nics = Object.values(host.interfaces).filter(nic => nic.adminUp && nic.ipv4);
  if (nics.length !== 1) return false;
  const ip = nics[0].ipv4!;
  return Number.isInteger(ip.prefix) && isAssignableIpv4(ip.address, ip.prefix) && maskToPrefix(ip.mask) === ip.prefix;
}

/** Read-only UI adapter, NOT a Linux shell or a Cisco command/goal evaluator. */
export function runHostPing(state: NetworkState, sourceId: string, command: string): HostPingResult {
  const source = state.devices[sourceId];
  if (!source || source.vendor !== 'linux-host') return { status: 'syntax', output: scope + '\nВыберите ПК модели.' };
  const tokens = command.trim().split(/\s+/);
  if (tokens.length !== 2 || tokens[0].toLowerCase() !== 'ping' || !isIpv4(tokens[1])) {
    return { status: 'syntax', output: scope + '\n' + usage };
  }
  const address = tokens[1];
  const owners = Object.values(state.devices).filter(dev => dev.vendor === 'linux-host' &&
    Object.values(dev.interfaces).some(nic => nic.ipv4?.address === address));
  if (owners.length === 1 && owners[0].id === sourceId) return { status: 'syntax', output: scope + '\n' + usage };
  let reachable = false;
  try {
    // Resolve only an unambiguous modeled PC. No invented host, ARP lookup, SVI
    // destination, gateway or routing. Duplicate-address probes fail closed.
    reachable = owners.length === 1 && validHostIp(source) && validHostIp(owners[0]) &&
      checkHostIpv4Reachability(state, sourceId, owners[0].id).reachable;
  } catch {
    // A malformed model cannot become a fabricated reply or leak its diagnostic
    // exception into a fault-finding exercise.
  }
  const probes = Array.from({ length: 4 }, (_, i) => reachable
    ? `Ответ от ${address}: учебный ответ ${i + 1}/4.` : 'Request timed out.');
  return {
    status: reachable ? 'reply' : 'timeout',
    output: [scope, `PING ${address} · 4 учебные пробы`, ...probes,
      `Проб: 4; ответов: ${reachable ? 4 : 0}; timeout: ${reachable ? 0 : 4}.`].join('\n'),
  };
}
