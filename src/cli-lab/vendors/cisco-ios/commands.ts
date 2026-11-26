import { formatRunningConfig } from './configFormatter';
import { normalizeIfaceName, wordArgument, vlanArgument, vlanNameArgument, interfaceArgument, interfaceTypeArgument, interfaceNumberArgument, isLayer2Interface } from './arguments';
import { interfaceStatus } from '../../engine/OperationalState';
import { formatAllowedVlans } from './trunkCommands';
import { commandFor } from '../../engine/CommandResolution';
import { CommandResult, CommandSpec, DeviceState, NetworkState } from '../../engine/types';
import { ciscoIosProfile } from './profile';
import { ciscoL3Commands } from './l3Commands';
import { ciscoTrunkCommands } from './trunkCommands';
import { ciscoInterfaceShowCommands } from './showInterfaceCommands';
import { ciscoPersistenceCommands } from './persistenceCommands';
import { ciscoSpanningTreeCommands } from './spanningTreeCommands';
import { ciscoSpanningTreeConfigCommands } from './spanningTreeConfigCommands';

function commitDevice(state: NetworkState, device: DeviceState): NetworkState {
  return {
    ...state,
    devices: {
      ...state.devices,
      [device.id]: { ...device },
    },
  };
}

function ensureVlan(device: DeviceState, id: number): void {
  if (!device.vlans[id]) {
    device.vlans[id] = { id, active: true, name: undefined };
  }
}

const baseCommands: CommandSpec[] = [
  {
    id: 'cisco.enable',
    match: ['enable'],
    modes: ['exec'],
    handler: (_tokens, state, device) => {
      device.privilege = 15;
      device.modeCtx = { mode: 'privileged' };
      return { output: '', state: commitDevice(state, device) };
    },
  },
  {
    id: 'cisco.disable',
    match: ['disable'],
    modes: ['privileged'],
    minPrivilege: 1,
    handler: (_tokens, state, device) => {
      device.privilege = 0;
      device.modeCtx = { mode: 'exec' };
      return { output: '', state: commitDevice(state, device) };
    },
  },
  {
    id: 'cisco.exit',
    match: ['exit'],
    modes: ['exec', 'privileged', 'config', 'config-if', 'config-vlan'],
    handler: (_tokens, state, device) => {
      const m = device.modeCtx.mode;
      if (m === 'config-if' || m === 'config-vlan') {
        device.modeCtx = { mode: 'config' };
      } else if (m === 'config') {
        device.modeCtx = { mode: 'privileged' };
      } else if (m === 'privileged') {
        device.modeCtx = { mode: 'exec' };
        device.privilege = 0;
      }
      return { output: '', state: commitDevice(state, device) };
    },
  },
  {
    id: 'cisco.end',
    match: ['end'],
    modes: ['config', 'config-if', 'config-vlan'],
    minPrivilege: 15,
    handler: (_tokens, state, device) => {
      device.modeCtx = { mode: 'privileged' };
      return { output: '', state: commitDevice(state, device) };
    },
  },
  {
    id: 'cisco.configure_terminal',
    match: ['configure', 'terminal'],
    modes: ['privileged'],
    minPrivilege: 15,
    handler: (_tokens, state, device) => {
      device.modeCtx = { mode: 'config' };
      return {
        output: 'Enter configuration commands, one per line. End with CNTL/Z.',
        state: commitDevice(state, device),
      };
    },
  },
  {
    id: 'cisco.hostname',
    match: ['hostname'],
    arguments: [[wordArgument]],
    modes: ['config'],
    minPrivilege: 15,
    handler: (tokens, state, device) => {
      if (tokens.length < 2) {
        return { output: ciscoIosProfile.messages.incomplete, error: true };
      }
      device.hostname = tokens[1];
      return { output: '', state: commitDevice(state, device) };
    },
  },
  {
    id: 'cisco.vlan',
    match: ['vlan'],
    arguments: [[vlanArgument]],
    modes: ['config'],
    minPrivilege: 15,
    handler: (tokens, state, device) => {
      if (tokens.length < 2) {
        return { output: ciscoIosProfile.messages.incomplete, error: true };
      }
      const id = Number(tokens[1]);
      if (!Number.isInteger(id) || id < 1 || id > 4094) {
        return { output: '% Invalid VLAN id', error: true };
      }
      ensureVlan(device, id);
      device.modeCtx = { mode: 'config-vlan', vlanId: id };
      return { output: '', state: commitDevice(state, device) };
    },
  },
  {
    id: 'cisco.vlan_name',
    match: ['name'],
    arguments: [[vlanNameArgument]],
    modes: ['config-vlan'],
    minPrivilege: 15,
    handler: (tokens, state, device) => {
      if (tokens.length < 2) {
        return { output: ciscoIosProfile.messages.incomplete, error: true };
      }
      const id = device.modeCtx.vlanId;
      if (id == null || !device.vlans[id]) {
        return { output: ciscoIosProfile.messages.invalid, error: true };
      }
      device.vlans[id] = { ...device.vlans[id], name: tokens.slice(1).join(' ') };
      return { output: '', state: commitDevice(state, device) };
    },
  },
  {
    id: 'cisco.interface',
    match: ['interface'],
    arguments: [[interfaceArgument], [interfaceTypeArgument, interfaceNumberArgument]],
    modes: ['config'],
    minPrivilege: 15,
    handler: (tokens, state, device) => {
      if (tokens.length < 2) {
        return { output: ciscoIosProfile.messages.incomplete, error: true };
      }
      const name = normalizeIfaceName(tokens.slice(1).join(' '));
      if (!device.interfaces[name]) {
        return {
          output: `% Invalid interface type and number\n${ciscoIosProfile.messages.invalid}`,
          error: true,
        };
      }
      device.modeCtx = { mode: 'config-if', ifName: name };
      return { output: '', state: commitDevice(state, device) };
    },
  },
  {
    id: 'cisco.no_shutdown',
    match: ['no', 'shutdown'],
    modes: ['config-if'],
    minPrivilege: 15,
    handler: (_tokens, state, device) => {
      const ifName = device.modeCtx.ifName;
      if (!ifName || !device.interfaces[ifName]) {
        return { output: ciscoIosProfile.messages.invalid, error: true };
      }
      const iface = { ...device.interfaces[ifName], adminUp: true };
      device.interfaces = { ...device.interfaces, [ifName]: iface };
      return { output: '', state: commitDevice(state, device) };
    },
  },
  {
    id: 'cisco.shutdown',
    match: ['shutdown'],
    modes: ['config-if'],
    minPrivilege: 15,
    handler: (_tokens, state, device) => {
      const ifName = device.modeCtx.ifName;
      if (!ifName || !device.interfaces[ifName]) {
        return { output: ciscoIosProfile.messages.invalid, error: true };
      }
      const iface = { ...device.interfaces[ifName], adminUp: false };
      device.interfaces = { ...device.interfaces, [ifName]: iface };
      return { output: '', state: commitDevice(state, device) };
    },
  },
  {
    id: 'cisco.switchport_mode_access',
    match: ['switchport', 'mode', 'access'],
    modes: ['config-if'],
    minPrivilege: 15,
    handler: (_tokens, state, device) => {
      const ifName = device.modeCtx.ifName;
      if (!ifName || !device.interfaces[ifName]) {
        return { output: ciscoIosProfile.messages.invalid, error: true };
      }
      if (!isLayer2Interface(device, ifName)) {
        return { output: '% Switchport configuration is not available on this interface', error: true };
      }
      const prev = device.interfaces[ifName];
      const iface = {
        ...prev,
        switchport: {
          mode: 'access' as const,
          accessVlan: prev.switchport?.accessVlan ?? 1,
        },
      };
      device.interfaces = { ...device.interfaces, [ifName]: iface };
      return { output: '', state: commitDevice(state, device) };
    },
  },
  {
    id: 'cisco.switchport_access_vlan',
    match: ['switchport', 'access', 'vlan'],
    arguments: [[vlanArgument]],
    modes: ['config-if'],
    minPrivilege: 15,
    handler: (tokens, state, device) => {
      if (tokens.length < 4) {
        return { output: ciscoIosProfile.messages.incomplete, error: true };
      }
      const vlanId = Number(tokens[3]);
      if (!Number.isInteger(vlanId) || vlanId < 1 || vlanId > 4094) {
        return { output: '% Invalid VLAN id', error: true };
      }
      const ifName = device.modeCtx.ifName;
      if (!ifName || !device.interfaces[ifName]) {
        return { output: ciscoIosProfile.messages.invalid, error: true };
      }
      if (!isLayer2Interface(device, ifName)) {
        return { output: '% Switchport configuration is not available on this interface', error: true };
      }
      ensureVlan(device, vlanId);
      const prev = device.interfaces[ifName];
      const iface = {
        ...prev,
        switchport: {
          mode: 'access' as const,
          accessVlan: vlanId,
        },
      };
      device.interfaces = { ...device.interfaces, [ifName]: iface };
      return { output: '', state: commitDevice(state, device) };
    },
  },
  {
    id: 'cisco.show_vlan_brief',
    match: ['show', 'vlan', 'brief'],
    modes: ['exec', 'privileged'],
    handler: (_tokens, state, device) => {
      const lines = [
        'VLAN Name                             Status    Ports',
        '---- -------------------------------- --------- -------------------------------',
      ];
      const ids = Object.keys(device.vlans)
        .map(Number)
        .sort((a, b) => a - b);
      for (const id of ids) {
        const v = device.vlans[id];
        const name = (v.name || (id === 1 ? 'default' : `VLAN${id}`)).padEnd(32, ' ');
        const ports = Object.values(device.interfaces)
          .filter((i) => i.switchport?.mode === 'access' && i.switchport.accessVlan === id)
          .map((i) => i.name)
          .join(', ');
        lines.push(`${String(id).padEnd(4, ' ')} ${name} active    ${ports}`);
      }
      return { output: lines.join('\n') };
    },
  },
  {
    id: 'cisco.show_vlan',
    match: ['show', 'vlan'],
    modes: ['exec', 'privileged'],
    handler: (tokens, state, device, profile) => {
      if (tokens.length > 2) {
        return { output: profile.messages.invalid, error: true };
      }
      const brief = ciscoIosCommands.find((c) => c.id === 'cisco.show_vlan_brief');
      return brief ? brief.handler(tokens, state, device, profile) : { output: '' };
    },
  },
  {
    id: 'cisco.show_ip_interface_brief',
    match: ['show', 'ip', 'interface', 'brief'],
    modes: ['exec', 'privileged'],
    handler: (_tokens, state, device) => {
      const lines = [
        'Interface                  IP-Address      OK? Method Status                Protocol',
      ];
      for (const iface of Object.values(device.interfaces)) {
        const ip = iface.ipv4?.address ?? 'unassigned';
        const { physical: status, protocol: proto } = interfaceStatus(state, device, iface);
        lines.push(
          `${iface.name.padEnd(26, ' ')} ${ip.padEnd(15, ' ')} YES unset  ${status.padEnd(22, ' ')} ${proto}`
        );
      }
      return { output: lines.join('\n') };
    },
  },
  {
    id: 'cisco.show_running_config',
    match: ['show', 'running-config'],
    arguments: [[],
      [{ keyword: 'interface', description: 'Display configuration of a specific interface' }, interfaceArgument],
      [{ keyword: 'interface', description: 'Display configuration of a specific interface' }, interfaceTypeArgument, interfaceNumberArgument]],
    modes: ['privileged'],
    minPrivilege: 15,
    handler: (tokens, _state, device) => {
      if (tokens.length === 2) return { output: formatRunningConfig(device) };
      if (tokens[2] !== 'interface' || tokens.length < 4) {
        return { output: ciscoIosProfile.messages.invalid, error: true };
      }
      const name = normalizeIfaceName(tokens.slice(3).join(' '));
      if (!device.interfaces[name]) return { output: `% Invalid interface ${name}`, error: true };
      // Reuse the same formatter as the full running-config, so the selected
      // block cannot silently disagree about the IP address or subnet mask.
      const config = formatRunningConfig(device);
      const header = `interface ${name}`;
      const lines = config.split('\n');
      const start = lines.indexOf(header);
      if (start === -1) return { output: `% Interface ${name} not found in running-config`, error: true };
      const end = lines.indexOf('!', start + 1);
      return { output: lines.slice(start, end === -1 ? undefined : end).join('\n') };
    },
  },
  {
    id: 'cisco.do',
    match: ['do'],
    modes: ['config', 'config-if', 'config-vlan'],
    minPrivilege: 15,
    handler: (tokens, state, device, profile) => {
      if (tokens.length < 2) {
        return { output: profile.messages.incomplete, error: true };
      }
      const rest = tokens.slice(1);
      const savedMode = device.modeCtx;
      const savedPriv = device.privilege;
      device.modeCtx = { mode: 'privileged' };
      device.privilege = 15;
      const resolved = commandFor(ciscoIosCommands.filter(s => s.id !== 'cisco.do'), rest, 'privileged', 15, device);
      if (resolved.ambiguous) {
        device.modeCtx = savedMode;
        device.privilege = savedPriv;
        return { output: '% Ambiguous command: ' + resolved.ambiguous.join(', '), error: true };
      }
      const best = resolved.spec;
      if (!best) {
        device.modeCtx = savedMode;
        device.privilege = savedPriv;
        return { output: resolved.status === 'incomplete' ? profile.messages.incomplete : profile.messages.invalid, error: true };
      }
      // IOS "do" is for EXEC commands that can return to the current config
      // context. A reload/disable/exit must not restore a stale privileged
      // context after changing or resetting the session.
      if (new Set(['cisco.reload_simulated', 'cisco.disable', 'cisco.exit', 'cisco.end', 'cisco.configure_terminal']).has(best.id)) {
        device.modeCtx = savedMode;
        device.privilege = savedPriv;
        return { output: '% Command not available through do in configuration mode', error: true };
      }
      const result = best.handler(resolved.tokens, state, device, profile);
      if (result.state) {
        const d = result.state.devices[result.state.activeDeviceId];
        if (d) {
          d.modeCtx = savedMode;
          d.privilege = savedPriv;
        }
        return result;
      }
      device.modeCtx = savedMode;
      device.privilege = savedPriv;
      return result;
    },
  },
];

export const ciscoIosCommands: CommandSpec[] = [
  ...baseCommands,
  ...ciscoL3Commands,
  ...ciscoTrunkCommands,
  ...ciscoPersistenceCommands,
  ...ciscoInterfaceShowCommands,
  ...ciscoSpanningTreeCommands,
  ...ciscoSpanningTreeConfigCommands,
];

export { normalizeIfaceName };
