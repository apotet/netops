import type { DeviceState, InterfaceState } from './types';

/** Local VLAN membership is independent of how the peer is configured. */
export function carriesLocalVlan(dev: DeviceState, iface: InterfaceState, vlanId: number): boolean {
  if (!iface.adminUp || !dev.vlans[vlanId]?.active) return false;
  if (iface.switchport?.mode === 'access') return iface.switchport.accessVlan === vlanId;
  if (iface.switchport?.mode === 'trunk') {
    return iface.switchport.trunkAllowed === undefined || iface.switchport.trunkAllowed.includes(vlanId);
  }
  return false;
}
