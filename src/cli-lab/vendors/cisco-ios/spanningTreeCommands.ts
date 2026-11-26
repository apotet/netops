import { deriveSpanningTree } from '../../engine/SpanningTree';
import type { BridgeId, PortId, StpBridgeResult, StpPortResult } from '../../engine/SpanningTree';
import type { CommandSpec, DeviceState, NetworkState } from '../../engine/types';
import { vlanArgument } from './arguments';

const roleNames: Record<StpPortResult['portRole'], string> = {
  root: 'Root', designated: 'Designated', nondesignated: 'Nondesignated', disabled: 'Disabled',
};
const stateNames: Record<StpPortResult['portState'], string> = {
  forwarding: 'Forwarding', blocking: 'Blocking',
};
const portId = (id: PortId | null) => id ? `${id.priority}.${id.number}` : 'none';
const bridgeId = (id: BridgeId | null) => id ? `${id.priority} / ${id.mac}` : 'none';
const scope = 'CLI Lab: one converged CST shared by all VLANs; no BPDU packets, counters or transition timers are simulated.';

function formatTree(device: DeviceState, bridge: StpBridgeResult, isRoot: boolean, detail: boolean): string {
  const lines = [
    'CST - IEEE 802.1D (converged model)',
    `Root ID    Priority ${bridge.rootBridge.priority}`,
    `           Address  ${bridge.rootBridge.mac}`,
    `Bridge ID  Priority ${bridge.bridgeId.priority}`,
    `           Address  ${bridge.bridgeId.mac}`,
    `Root Path Cost: ${bridge.rootPathCost}`,
    `Root Port: ${bridge.rootPort === null ? 'none' : `${bridge.rootPort} (${portId(bridge.ports[bridge.rootPort].portId)})`}`,
  ];
  if (isRoot) lines.push('This bridge is the root');
  lines.push('', 'Interface                 Role           State       Cost   Port ID');
  for (const [name, port] of Object.entries(bridge.ports)) {
    lines.push(`${name.padEnd(26)}${roleNames[port.portRole].padEnd(15)}${stateNames[port.portState].padEnd(12)}${String(port.pathCost).padEnd(7)}${portId(port.portId)}`);
  }
  if (Object.keys(bridge.ports).length === 0) lines.push('(no modeled Layer 2 ports)');
  if (detail) {
    lines.push('', `Root device (component): ${bridge.rootDevice}`);
    for (const [name, port] of Object.entries(bridge.ports)) {
      lines.push('', `Interface: ${name}`,
        `  Administrative: ${device.interfaces[name].adminUp ? 'up' : 'down'}`,
        `  Physical link: ${port.physicalUp ? 'up' : 'down'}`,
        `  Role: ${roleNames[port.portRole]}`,
        `  State: ${stateNames[port.portState]}`,
        `  Path Cost: ${port.pathCost}`,
        `  Port ID: ${portId(port.portId)}`,
        `  Designated Bridge: ${bridgeId(port.designatedBridge)}`,
        `  Designated Port: ${portId(port.designatedPort)}`,
        `  PortFast configured: ${device.interfaces[name].stp?.portfast ? 'yes' : 'no'} (no transition timing modeled)`);
    }
  }
  lines.push('', scope);
  return lines.join('\n');
}

function showSpanningTree(tokens: string[], state: NetworkState, device: DeviceState) {
  // These syntactically recognized paths give an explicit capability error,
  // never a fabricated PVST instance or IOS summary.
  if (tokens[2] === 'summary' || tokens[2] === 'vlan') {
    return { output: `% CLI Lab: show spanning-tree ${tokens[2]} is not supported. Only one CST is modeled; PVST+ and per-VLAN STP instances are not implemented. Use show spanning-tree or show spanning-tree detail.`, error: true };
  }
  let tree: ReturnType<typeof deriveSpanningTree>;
  try {
    tree = deriveSpanningTree(state);
  } catch (error) {
    return { output: `% Cannot derive CST: ${error instanceof Error ? error.message : String(error)}`, error: true };
  }
  const bridge = tree.bridges[state.activeDeviceId];
  if (!bridge) return { output: 'No spanning-tree instance on this device: no modeled Layer 2 bridge.\n' + scope };
  return { output: formatTree(device, bridge, bridge.rootDevice === state.activeDeviceId, tokens[2] === 'detail') };
}

/** One canonical grammar for Enter, TAB, ?, abbreviations and config-mode do show. */
export const ciscoSpanningTreeCommands: CommandSpec[] = [{
  id: 'cisco.show_spanning_tree', match: ['show', 'spanning-tree'],
  modes: ['exec', 'privileged'],
  arguments: [
    [],
    [{ keyword: 'detail', description: 'CST details from the model; no BPDU statistics or timers' }],
    [{ keyword: 'summary', description: 'Unsupported summary: display the CST-only limitation' }],
    [{ keyword: 'vlan', description: 'Unsupported per-VLAN STP: display the CST-only limitation' }, vlanArgument],
  ],
  handler: showSpanningTree,
}];
