import type { InterfaceState, NetworkLink, NetworkState } from './types';
import { carriesLocalVlan } from './VlanMembership';

/** One common spanning tree. No VLAN-specific elections or simulated convergence time. */
export type StpInstance = { kind: 'cst' };
export interface BridgeId { priority: number; mac: string }
export interface PortId { priority: number; number: number }
export interface StpPortResult {
  portId: PortId;
  pathCost: number;
  physicalUp: boolean;
  portRole: 'root' | 'designated' | 'nondesignated' | 'disabled';
  portState: 'forwarding' | 'blocking';
  designatedBridge: BridgeId | null;
  designatedPort: PortId | null;
}
export interface StpBridgeResult {
  bridgeId: BridgeId;
  rootBridge: BridgeId;
  rootDevice: string;
  rootPathCost: number;
  rootPort: string | null;
  ports: Record<string, StpPortResult>;
}
export interface SpanningTreeResult {
  instance: StpInstance;
  bridges: Record<string, StpBridgeResult>;
}

const cmp = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
export function compareBridgeIds(a: BridgeId, b: BridgeId): number {
  return a.priority - b.priority || cmp(a.mac, b.mac);
}
export function comparePortIds(a: PortId, b: PortId): number {
  return a.priority - b.priority || a.number - b.number;
}
function integer(value: number, min: number, max: number, step: number, label: string): number {
  if (!Number.isInteger(value) || value < min || value > max || value % step !== 0) {
    throw new Error(`Invalid STP ${label}: ${value}`);
  }
  return value;
}

/** Stable FNV-1a over UTF-8 device key; 40 hash bits plus local/unicast octet 02. */
function syntheticMac(id: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(id)) {
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  }
  return '02:' + (hash & 0xffffffffffn).toString(16).padStart(10, '0').match(/../g)!.join(':');
}
function bridgeId(state: NetworkState, id: string): BridgeId {
  const config = state.devices[id].stp;
  const mac = (config?.mac ?? syntheticMac(id)).toLowerCase();
  if (!/^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(mac) ||
      (parseInt(mac.slice(0, 2), 16) & 1) || mac === '00:00:00:00:00:00') {
    throw new Error(`Invalid STP bridge MAC: ${mac}`);
  }
  return { priority: integer(config?.priority ?? 32768, 0, 61440, 4096, 'bridge priority'), mac };
}
const isL2 = (port: InterfaceState) => !!port.switchport && !/^Vlan\d+$/i.test(port.name);
// Natural numeric order without locale-dependent collation (Fa0/2 before Fa0/10).
function portOrder(a: string, b: string): number {
  const aa = a.match(/\d+|\D+/g)!, bb = b.match(/\d+|\D+/g)!;
  for (let i = 0; i < Math.min(aa.length, bb.length); i++) {
    const d = /^\d+$/.test(aa[i]) && /^\d+$/.test(bb[i])
      ? Number(aa[i]) - Number(bb[i]) : cmp(aa[i], bb[i]);
    if (d) return d;
  }
  return aa.length - bb.length || cmp(a, b);
}
interface Endpoint { device: string; port: string }
interface Segment { a: Endpoint; b: Endpoint }
interface Candidate {
  root: BridgeId; rootDevice: string; cost: number;
  sender: BridgeId; senderPort: PortId; localPort: PortId; port: string | null;
}
function compareCandidates(a: Candidate, b: Candidate): number {
  return compareBridgeIds(a.root, b.root) || a.cost - b.cost ||
    compareBridgeIds(a.sender, b.sender) || comparePortIds(a.senderPort, b.senderPort) ||
    comparePortIds(a.localPort, b.localPort);
}

/**
 * Pure stable-state IEEE 802.1D priority-vector calculation on point-to-point links.
 * Invalid/ambiguous topology or STP configuration throws rather than inventing a tree.
 * No derived output is written to NetworkState or startup-config.
 */
export function deriveSpanningTree(state: NetworkState, instance: StpInstance = { kind: 'cst' }): SpanningTreeResult {
  if (instance.kind !== 'cst') throw new Error('Only CST is implemented');
  const bridges: Record<string, StpBridgeResult> = {};
  const ids = Object.keys(state.devices).filter(id => state.devices[id].stp !== undefined ||
    Object.values(state.devices[id].interfaces).some(isL2)).sort(cmp);
  const seenMacs = new Set<string>();
  for (const id of ids) {
    const bid = bridgeId(state, id);
    if (seenMacs.has(bid.mac)) throw new Error(`Duplicate STP bridge MAC: ${bid.mac}; configure unique MACs`);
    seenMacs.add(bid.mac);
    const ports: Record<string, StpPortResult> = {};
    const names = Object.keys(state.devices[id].interfaces).filter(p => isL2(state.devices[id].interfaces[p])).sort(portOrder);
    // Reserve explicit numbers first, so automatic defaults cannot collide with overrides.
    const numbers = new Set<number>();
    for (const name of names) {
      const n = state.devices[id].interfaces[name].stp?.number;
      if (n !== undefined) {
        integer(n, 1, 4095, 1, 'port number');
        if (numbers.has(n)) throw new Error(`Duplicate STP port number on ${id}: ${n}`);
        numbers.add(n);
      }
    }
    let nextNumber = 1;
    for (const name of names) {
      const config = state.devices[id].interfaces[name].stp;
      while (numbers.has(nextNumber)) nextNumber++;
      const number = config?.number ?? integer(nextNumber, 1, 4095, 1, 'port number');
      numbers.add(number);
      ports[name] = {
        portId: { priority: integer(config?.priority ?? 128, 0, 240, 16, 'port priority'), number },
        pathCost: integer(config?.pathCost ?? 19, 1, 65535, 1, 'path cost'),
        physicalUp: false, portRole: 'disabled', portState: 'blocking',
        designatedBridge: null, designatedPort: null,
      };
    }
    bridges[id] = { bridgeId: bid, rootBridge: bid, rootDevice: id, rootPathCost: 0, rootPort: null, ports };
  }
  const segments: Segment[] = [];
  const occupied = new Set<string>();
  for (const link of state.links) {
    const a = { device: link.a, port: link.aIf }, b = { device: link.b, port: link.bIf };
    for (const ep of [a, b]) {
      if (!state.devices[ep.device]?.interfaces[ep.port]) throw new Error(`Missing link endpoint ${ep.device}/${ep.port}`);
      const key = JSON.stringify([ep.device, ep.port]);
      if (occupied.has(key)) throw new Error(`Multiple links on port ${ep.device}/${ep.port}`);
      occupied.add(key);
    }
    if (!link.up || !state.devices[a.device].interfaces[a.port].adminUp || !state.devices[b.device].interfaces[b.port].adminUp) continue;
    for (const ep of [a, b]) {
      const port = bridges[ep.device]?.ports[ep.port];
      if (port) {
        port.physicalUp = true;
        port.portRole = 'designated';
        port.portState = 'forwarding';
        port.designatedBridge = bridges[ep.device].bridgeId;
        port.designatedPort = port.portId;
      }
    }
    if (bridges[a.device]?.ports[a.port] && bridges[b.device]?.ports[b.port]) segments.push({ a, b });
  }
  // Synchronous relaxation of priority vectors. With positive receive-port costs,
  // every winning root path is simple and uses at most bridges.length - 1 links.
  let paths: Record<string, Candidate> = Object.fromEntries(ids.map(id => [id, {
    root: bridges[id].bridgeId, rootDevice: id, cost: 0, sender: bridges[id].bridgeId,
    senderPort: { priority: 0, number: 0 }, localPort: { priority: 0, number: 0 }, port: null,
  }]));
  for (let round = 0; round < ids.length - 1; round++) {
    const next = { ...paths };
    for (const { a, b } of segments) for (const [local, peer] of [[a, b], [b, a]]) {
      const port = bridges[local.device].ports[local.port];
      const candidate: Candidate = {
        root: paths[peer.device].root, rootDevice: paths[peer.device].rootDevice,
        cost: paths[peer.device].cost + port.pathCost,
        sender: bridges[peer.device].bridgeId, senderPort: bridges[peer.device].ports[peer.port].portId,
        localPort: port.portId, port: local.port,
      };
      if (compareCandidates(candidate, next[local.device]) < 0) next[local.device] = candidate;
    }
    paths = next;
  }
  for (const id of ids) {
    bridges[id].rootBridge = paths[id].root;
    bridges[id].rootDevice = paths[id].rootDevice;
    bridges[id].rootPathCost = paths[id].cost;
    bridges[id].rootPort = paths[id].port;
  }
  for (const { a, b } of segments) {
    const ba = bridges[a.device], bb = bridges[b.device];
    const pa = ba.ports[a.port], pb = bb.ports[b.port];
    const order = compareBridgeIds(ba.rootBridge, bb.rootBridge) || ba.rootPathCost - bb.rootPathCost ||
      compareBridgeIds(ba.bridgeId, bb.bridgeId) || comparePortIds(pa.portId, pb.portId);
    const designated = order < 0 ? a : b;
    for (const ep of [a, b]) {
      const bridge = bridges[ep.device], port = bridge.ports[ep.port];
      port.designatedBridge = bridges[designated.device].bridgeId;
      port.designatedPort = bridges[designated.device].ports[designated.port].portId;
      port.portRole = ep === designated ? 'designated' : bridge.rootPort === ep.port ? 'root' : 'nondesignated';
      port.portState = port.portRole === 'nondesignated' ? 'blocking' : 'forwarding';
    }
  }
  return { instance: { kind: 'cst' }, bridges };
}

/** Local VLAN readiness, not end-to-end connectivity. tree must derive from this snapshot. */
export function isStpForwarding(state: NetworkState, tree: SpanningTreeResult, device: string, port: string, vlan: number): boolean {
  const dev = state.devices[device], iface = dev?.interfaces[port];
  const stp = tree.bridges[device]?.ports[port];
  return !!dev && !!iface && !!stp?.physicalUp && stp.portState === 'forwarding' && carriesLocalVlan(dev, iface, vlan);
}

/** Both ends must forward the same VLAN in addition to their physical link being up. */
export function isStpLinkForwarding(state: NetworkState, tree: SpanningTreeResult, link: NetworkLink, vlan: number): boolean {
  const a = state.devices[link.a]?.interfaces[link.aIf], b = state.devices[link.b]?.interfaces[link.bIf];
  return link.up && !!a && !!b && a.switchport?.mode === b.switchport?.mode &&
    isStpForwarding(state, tree, link.a, link.aIf, vlan) && isStpForwarding(state, tree, link.b, link.bIf, vlan);
}
