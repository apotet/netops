import { formatAllowedVlans } from './trunkCommands';
import { CommandSpec, DeviceState, NetworkState, SavedDeviceConfig } from '../../engine/types';
import { reloadFromStartup, saveStartup } from '../../engine/ConfigPersistence';

function changed(state: NetworkState, device: DeviceState): NetworkState {
  return { ...state, devices: { ...state.devices, [device.id]: { ...device } } };
}

function displayStartup(config: SavedDeviceConfig): string {
  const lines = ['Using saved startup configuration:', '!', `hostname ${config.hostname}`, '!'];
  for (const vlan of Object.values(config.vlans).sort((a, b) => a.id - b.id)) {
    if (vlan.id === 1) continue;
    lines.push(`vlan ${vlan.id}`);
    if (vlan.name) lines.push(` name ${vlan.name}`);
    lines.push('!');
  }
  for (const iface of Object.values(config.interfaces)) {
    lines.push(`interface ${iface.name}`);
    if (iface.switchport?.mode === 'access') {
      lines.push(' switchport mode access');
      if (iface.switchport.accessVlan != null) lines.push(` switchport access vlan ${iface.switchport.accessVlan}`);
    } else if (iface.switchport?.mode === 'trunk') {
      lines.push(' switchport mode trunk');
      if (iface.switchport.trunkAllowed !== undefined) lines.push(` switchport trunk allowed vlan ${formatAllowedVlans(iface.switchport.trunkAllowed)}`);
    }
    if (iface.ipv4) lines.push(` ip address ${iface.ipv4.address} ${iface.ipv4.mask}`);
    lines.push(iface.adminUp ? ' no shutdown' : ' shutdown');
    lines.push('!');
  }
  for (const route of config.routes) {
    if (route.nextHop) lines.push(`ip route ${route.prefix} ${route.prefixLen === 0 ? '0.0.0.0' : '/' + route.prefixLen} ${route.nextHop}`);
  }
  lines.push('end');
  return lines.join('\n');
}

function save(tokens: string[], state: NetworkState, device: DeviceState) {
  if (tokens.length !== 1 && tokens.join(' ').toLowerCase() !== 'copy running-config startup-config' && tokens.join(' ').toLowerCase() !== 'write memory' && tokens.join(' ').toLowerCase() !== 'wr mem') {
    return { output: '% Invalid input detected', error: true };
  }
  saveStartup(device);
  return {
    output: 'Building configuration...\n[OK]\nКонфигурация сохранена в startup-config (модель CLI Lab).',
    state: changed(state, device),
  };
}

export const ciscoPersistenceCommands: CommandSpec[] = [
  {
    id: 'cisco.copy_running_startup', match: ['copy', 'running-config', 'startup-config'],
    modes: ['privileged'], minPrivilege: 15,
    handler: (tokens, state, device) => save(tokens, state, device),
  },
  {
    id: 'cisco.write_memory', match: ['write', 'memory'],
    modes: ['privileged'], minPrivilege: 15,
    handler: (tokens, state, device) => save(tokens, state, device),
  },
  {
    id: 'cisco.wr_mem', match: ['wr', 'mem'],
    modes: ['privileged'], minPrivilege: 15,
    handler: (tokens, state, device) => save(tokens, state, device),
  },
  {
    id: 'cisco.show_startup_config', match: ['show', 'startup-config'],
    modes: ['privileged'], minPrivilege: 15,
    handler: (tokens, _state, device) => tokens.length === 2 && device.startupConfig
      ? { output: displayStartup(device.startupConfig) }
      : { output: '% Invalid command', error: true },
  },
  {
    id: 'cisco.reload_simulated', match: ['reload'],
    modes: ['privileged'], minPrivilege: 15,
    handler: (tokens, state, device) => {
      if (tokens.length !== 1) return { output: '% Invalid command', error: true };
      reloadFromStartup(device);
      return {
        output: 'Simulated reload completed. Running-config restored from startup-config.\nUnsaved changes were discarded. Physical boot and hardware behavior are not simulated.',
        state: changed(state, device),
      };
    },
  },
];
