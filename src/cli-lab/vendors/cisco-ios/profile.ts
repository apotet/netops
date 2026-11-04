import { DeviceState, VendorProfile } from '../../engine/types';

export const ciscoIosProfile: VendorProfile = {
  id: 'cisco-ios',
  displayName: 'Cisco IOS',
  capabilities: ['hostname', 'vlan', 'switchport-access', 'interface-admin', 'show-basic'],
  initialMode: { mode: 'exec' },
  prompt: (device: DeviceState) => {
    const host = device.hostname || 'Switch';
    const { mode, ifName, vlanId } = device.modeCtx;
    switch (mode) {
      case 'exec':
        return `${host}>`;
      case 'privileged':
        return `${host}#`;
      case 'config':
        return `${host}(config)#`;
      case 'config-if':
        return `${host}(config-if)#`;
      case 'config-vlan':
        return `${host}(config-vlan)#`;
      default:
        return `${host}>`;
    }
  },
  messages: {
    invalid: "% Invalid input detected at '^' marker.",
    incomplete: '% Incomplete command.',
    needEnable: '% Privilege level insufficient. Use "enable".',
  },
};
