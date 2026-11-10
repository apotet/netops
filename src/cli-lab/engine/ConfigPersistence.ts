import { DeviceState, NetworkState, SavedDeviceConfig } from './types';

/** Lab-only startup snapshot; mode/privilege and physical links are not saved. */
export function snapshotConfig(device: DeviceState): SavedDeviceConfig {
  return structuredClone({
    hostname: device.hostname,
    interfaces: device.interfaces,
    vlans: device.vlans,
    routes: device.routes,
  });
}

export function initializeStartupConfigs(state: NetworkState): NetworkState {
  const next = structuredClone(state);
  for (const device of Object.values(next.devices)) {
    if (!device.startupConfig) device.startupConfig = snapshotConfig(device);
  }
  return next;
}

export function hasUnsavedChanges(device: DeviceState): boolean {
  return !device.startupConfig ||
    JSON.stringify(snapshotConfig(device)) !== JSON.stringify(device.startupConfig);
}

export function saveStartup(device: DeviceState): void {
  device.startupConfig = snapshotConfig(device);
}

export function reloadFromStartup(device: DeviceState): void {
  const saved = device.startupConfig;
  if (!saved) throw new Error('Startup configuration not initialized');
  device.hostname = saved.hostname;
  device.interfaces = structuredClone(saved.interfaces);
  device.vlans = structuredClone(saved.vlans);
  device.routes = structuredClone(saved.routes);
  device.modeCtx = { mode: 'exec' };
  device.privilege = 0;
}
