import type { CommandArgument, CommandSpec, DeviceState, InterfaceState, NetworkState } from '../../engine/types';

export const cstPriorityNotice = 'CLI Lab: CST-only: VLAN 1 priority sets the common tree priority for ALL VLANs, not PVST.';
const l2Port = (iface: InterfaceState) => !!iface.switchport && !/^Vlan\d+$/i.test(iface.name);
const bridgeAvailable = (device: DeviceState) => Object.values(device.interfaces).some(l2Port);
const portAvailable = (device: DeviceState) => {
  const iface = device.interfaces[device.modeCtx.ifName ?? ''];
  return !!iface && l2Port(iface);
};
function numeric(name: string, description: string, min: number, max: number, step: number): CommandArgument {
  return { name, description, validate: value => /^(?:0|[1-9]\d*)$/.test(value) &&
    Number(value) >= min && Number(value) <= max && Number(value) % step === 0 };
}
const cost = numeric('<1-65535>', 'CST path cost (lab limit; default 19)', 1, 65535, 1);
const portPriority = numeric('<0-240>', 'Port priority in steps of 16 (default 128)', 0, 240, 16);
const bridgePriority = numeric('<0-61440>', 'Common tree priority in steps of 4096 (default 32768)', 0, 61440, 4096);
const vlan: CommandArgument = {
  name: '1', description: 'VLAN 1 maps to the common CST for ALL VLANs, not PVST',
  validate: value => value === '1',
  invalidMessage: '% CLI Lab: only VLAN 1 is accepted as a CST compatibility mapping. Other VLANs cannot configure STP; PVST+ is not implemented.',
};
const priorityKeyword = { keyword: 'priority', description: 'CST-only compatibility mapping, NOT per-VLAN STP' };
const changed = (state: NetworkState) => ({ output: '', state });

function setBridge(tokens: string[], state: NetworkState, device: DeviceState, reset: boolean) {
  const config = { ...device.stp };
  if (reset) delete config.priority;
  else config.priority = Number(tokens[4]);
  if (Object.keys(config).length) device.stp = config;
  else delete device.stp;
  return { output: cstPriorityNotice, state };
}
function setPort(tokens: string[], state: NetworkState, device: DeviceState, field: 'pathCost' | 'priority', reset: boolean) {
  const iface = device.interfaces[device.modeCtx.ifName!];
  const config = { ...iface.stp };
  if (reset) delete config[field];
  else config[field] = Number(tokens[2]);
  if (Object.keys(config).length) iface.stp = config;
  else delete iface.stp;
  return changed(state);
}

export const ciscoSpanningTreeConfigCommands: CommandSpec[] = [
  { id: 'cisco.stp_bridge_priority', match: ['spanning-tree', 'vlan'], modes: ['config'], minPrivilege: 15,
    available: bridgeAvailable, arguments: [[vlan, priorityKeyword, bridgePriority]],
    handler: (tokens, state, device) => setBridge(tokens, state, device, false) },
  { id: 'cisco.no_stp_bridge_priority', match: ['no', 'spanning-tree', 'vlan'], modes: ['config'], minPrivilege: 15,
    available: bridgeAvailable, arguments: [[vlan, priorityKeyword]],
    handler: (tokens, state, device) => setBridge(tokens, state, device, true) },
  ...(['cost', 'port-priority'] as const).flatMap(keyword => {
    const field = keyword === 'cost' ? 'pathCost' : 'priority';
    const id = keyword.replaceAll('-', '_');
    return [
      { id: `cisco.stp_${id}`, match: ['spanning-tree', keyword], modes: ['config-if'], minPrivilege: 15,
        available: portAvailable, arguments: [[keyword === 'cost' ? cost : portPriority]],
        handler: (tokens, state, device) => setPort(tokens, state, device, field, false) },
      { id: `cisco.no_stp_${id}`, match: ['no', 'spanning-tree', keyword], modes: ['config-if'], minPrivilege: 15,
        available: portAvailable, handler: (tokens, state, device) => setPort(tokens, state, device, field, true) },
    ] satisfies CommandSpec[];
  }),
];
