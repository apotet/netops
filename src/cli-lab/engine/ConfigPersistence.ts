import { DeviceState, InterfaceConfig, InterfaceState, NetworkState, SavedDeviceConfig } from './types';

function configInterfaces(interfaces: Record<string, InterfaceState>): Record<string, InterfaceConfig> {
  return Object.fromEntries(Object.entries(interfaces).map(([name, { operUp: _legacy, ...config }]) => [name, config]));
}

/** Lab-only configuration snapshot; runtime, mode/privilege and links are not saved. */
export function snapshotConfig(device: Pick<DeviceState, 'hostname' | 'interfaces' | 'vlans' | 'routes'>): SavedDeviceConfig {
  return structuredClone({
    hostname: device.hostname,
    interfaces: configInterfaces(device.interfaces),
    vlans: device.vlans,
    routes: device.routes,
  });
}

export function initializeStartupConfigs(state: NetworkState): NetworkState {
  const next = structuredClone(state);
  for (const device of Object.values(next.devices)) {
    // Accept old scenarios and startup snapshots, but discard their cached runtime.
    device.interfaces = configInterfaces(device.interfaces);
    device.startupConfig = snapshotConfig(device.startupConfig ?? device);
  }
  return next;
}

export function hasUnsavedChanges(device: DeviceState): boolean {
  return !device.startupConfig ||
    JSON.stringify(snapshotConfig(device)) !== JSON.stringify(snapshotConfig(device.startupConfig));
}

export function saveStartup(device: DeviceState): void {
  device.startupConfig = snapshotConfig(device);
}

export function reloadFromStartup(device: DeviceState): void {
  if (!device.startupConfig) throw new Error('Startup configuration not initialized');
  const saved = snapshotConfig(device.startupConfig);
  device.startupConfig = saved;
  device.hostname = saved.hostname;
  device.interfaces = structuredClone(saved.interfaces);
  device.vlans = structuredClone(saved.vlans);
  device.routes = structuredClone(saved.routes);
  device.modeCtx = { mode: 'exec' };
  device.privilege = 0;
}
