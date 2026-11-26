import type { NetworkState } from './engine/types';
import { interfaceStatus } from './engine/OperationalState';
import { deriveSpanningTree } from './engine/SpanningTree';

export interface PortDetails {
  deviceId: string;
  deviceName: string;
  interfaceName: string;
  admin: 'up' | 'down';
  physical: string;
  protocol: string;
  linkPresent: boolean;
  peer?: string;
  switchport?: { mode: 'access' | 'trunk' | 'unset'; accessVlan?: number; trunkAllowed?: number[] };
  ipv4?: { address: string; prefix: number; mask: string };
  stp?: {
    role: string;
    state: string;
    root: string;
    pathCost: number;
    portPriority: number;
  };
  stpError?: string;
}

/** Read-only projection. Does not assume physical connectivity implies STP forwarding. */
export function getPortDetails(state: NetworkState, deviceId: string, interfaceName: string): PortDetails | null {
  const device = state.devices[deviceId];
  const iface = device?.interfaces[interfaceName];
  if (!device || !iface) return null;
  const status = interfaceStatus(state, device, iface);
  const link = state.links.find(l =>
    (l.a === deviceId && l.aIf === interfaceName) || (l.b === deviceId && l.bIf === interfaceName));
  const peerId = link ? (link.a === deviceId ? link.b : link.a) : undefined;
  const peerInterface = link ? (link.a === deviceId ? link.bIf : link.aIf) : undefined;
  const details: PortDetails = {
    deviceId, deviceName: device.hostname, interfaceName,
    admin: iface.adminUp ? 'up' : 'down',
    physical: status.physical, protocol: status.protocol,
    linkPresent: !!link,
    peer: peerId && peerInterface ? `${state.devices[peerId]?.hostname ?? peerId} / ${peerInterface}` : undefined,
    switchport: iface.switchport ? { ...iface.switchport, trunkAllowed: iface.switchport.trunkAllowed?.slice() } : undefined,
    ipv4: iface.ipv4 ? { ...iface.ipv4 } : undefined,
  };
  if (iface.switchport) {
    try {
      const tree = deriveSpanningTree(state, { kind: 'cst' });
      const bridge = tree.bridges[deviceId];
      const port = bridge?.ports[interfaceName];
      if (port) details.stp = {
        role: port.portRole, state: port.portState, root: bridge.rootDevice,
        pathCost: port.pathCost, portPriority: port.portId.priority,
      };
    } catch (error) {
      details.stpError = error instanceof Error ? error.message : 'STP state unavailable';
    }
  }
  return details;
}
