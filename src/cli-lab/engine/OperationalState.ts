import { DeviceState, InterfaceState, NetworkState } from './types';
import { localSviPortUp } from './SviIpv4Reachability';

/**
 * Limited operational-state model. PHY requires an up link and enabled peer.
 * SVI autostate depends on local forwarding-eligible VLAN membership, not on
 * the peer's VLAN/allowed configuration. STP itself is not simulated.
 */
export function interfaceStatus(state: NetworkState, device: DeviceState, iface: InterfaceState) {
  const sviId = /^Vlan(\d+)$/i.exec(iface.name);
  if (sviId) {
    const vlanId = Number(sviId[1]);
    const operUp = iface.adminUp && !!device.vlans[vlanId]?.active &&
      localSviPortUp(state, device.id, vlanId);
    return {
      operUp,
      physical: !iface.adminUp ? 'administratively down' : operUp ? 'up' : 'down',
      protocol: operUp ? 'up' : 'down',
    };
  }
  const operUp = iface.adminUp && state.links.some(link => {
    if (!link.up) return false;
    const peer = link.a === device.id && link.aIf === iface.name
      ? { device: link.b, iface: link.bIf }
      : link.b === device.id && link.bIf === iface.name
        ? { device: link.a, iface: link.aIf } : null;
    return peer !== null && state.devices[peer.device]?.interfaces[peer.iface]?.adminUp === true;
  });
  return {
    operUp,
    physical: !iface.adminUp ? 'administratively down' : operUp ? 'up' : 'down',
    protocol: operUp ? 'up' : 'down',
  };
}
