import type { NetworkState } from './types';
import { deriveSpanningTree, isStpForwarding, isStpLinkForwarding } from './SpanningTree';
import { carriesLocalVlan } from './VlanMembership';

/**
 * One synchronous, read-only forwarding projection per reachability query.
 * No cache: callers must derive again after any config/topology edit. Never persist it.
 * CST is common to all VLANs; VLAN filters cannot elect a second tree around blocking.
 */
export function deriveVlanForwarding(state: NetworkState) {
  const tree = deriveSpanningTree(state);
  return {
    /** Local SVI autostate deliberately does not require the peer to carry this VLAN. */
    localSviPortUp(id: string, vlanId: number): boolean {
      const device = state.devices[id];
      return !!device && Object.keys(device.interfaces).some(port =>
        isStpForwarding(state, tree, id, port, vlanId));
    },
    /** Traversal requires physical and CST/VLAN readiness at both ends. */
    neighbors(id: string, vlanId: number): string[] {
      const peers = new Set<string>();
      for (const link of state.links) {
        const peer = link.a === id ? link.b : link.b === id ? link.a : null;
        if (peer !== null && isStpLinkForwarding(state, tree, link, vlanId)) peers.add(peer);
      }
      return [...peers].sort();
    },
    /**
     * Legacy L2 goals use uncabled access ports as logical client attachment points
     * (there are no PC nodes). Preserve that config check. Any explicitly cabled
     * attachment must actually forward: a blocked ingress is not a working client.
     */
    accessEndpointReady(id: string, port: string, vlanId: number): boolean {
      const device = state.devices[id], iface = device?.interfaces[port];
      if (!device || !iface || iface.switchport?.mode !== 'access' || !carriesLocalVlan(device, iface, vlanId)) return false;
      const cabled = state.links.some(link => link.a === id && link.aIf === port || link.b === id && link.bIf === port);
      return !cabled || isStpForwarding(state, tree, id, port, vlanId);
    },
  };
}

/** Compatibility API; derive afresh for each standalone query. */
export function localSviPortUp(state: NetworkState, id: string, vlanId: number): boolean {
  return deriveVlanForwarding(state).localSviPortUp(id, vlanId);
}

/** Historical name: includes compatible access-access links as well as trunks. */
export function trunkNeighbors(state: NetworkState, id: string, vlanId: number): string[] {
  return deriveVlanForwarding(state).neighbors(id, vlanId);
}
