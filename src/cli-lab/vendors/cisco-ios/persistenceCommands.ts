import { formatStartupConfig } from './configFormatter';
import { CommandSpec, DeviceState, NetworkState } from '../../engine/types';
import { reloadFromStartup, saveStartup } from '../../engine/ConfigPersistence';

function changed(state: NetworkState, device: DeviceState): NetworkState {
  return { ...state, devices: { ...state.devices, [device.id]: { ...device } } };
}

function save(tokens: string[], state: NetworkState, device: DeviceState) {
  if (tokens.length !== 1 && tokens.join(' ').toLowerCase() !== 'copy running-config startup-config' && tokens.join(' ').toLowerCase() !== 'write memory') {
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
    id: 'cisco.show_startup_config', match: ['show', 'startup-config'],
    modes: ['privileged'], minPrivilege: 15,
    handler: (tokens, _state, device) => tokens.length === 2 && device.startupConfig
      ? { output: formatStartupConfig(device.startupConfig) }
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
