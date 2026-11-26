import type { DeviceState, NetworkLink, NetworkState, Scenario } from '../engine/types';

const A = 'FastEthernet0/1';
const B = 'FastEthernet0/2';
const LEFT = 'FastEthernet0/23';
const RIGHT = 'FastEthernet0/24';
const mask = '255.255.255.0';

function makeSwitch(index: number): DeviceState {
  const n = index + 1;
  return {
    id: `sw${n}`, hostname: `Switch${n}`, vendor: 'cisco-ios',
    privilege: 0, modeCtx: { mode: 'exec' },
    stp: { priority: 32768 },
    interfaces: {
      [A]: { name: A, adminUp: true, switchport: { mode: 'access', accessVlan: 10 } },
      [B]: { name: B, adminUp: true, switchport: { mode: 'access', accessVlan: 20 } },
      [LEFT]: { name: LEFT, adminUp: true, switchport: { mode: 'trunk', trunkAllowed: [10,20] } },
      [RIGHT]: { name: RIGHT, adminUp: true, switchport: { mode: 'trunk', trunkAllowed: [10,20] } },
      Vlan10: { name: 'Vlan10', adminUp: true,
        ipv4: { address: `192.168.10.${n}`, prefix: 24, mask } },
      Vlan20: { name: 'Vlan20', adminUp: true,
        ipv4: { address: `192.168.20.${n}`, prefix: 24, mask } },
    },
    vlans: {
      1: { id: 1, name: 'default', active: true },
      10: { id: 10, name: 'USERS10', active: true },
      20: { id: 20, name: 'USERS20', active: true },
    },
    routes: [],
  };
}

function makePc(sw: number, vlan: 10 | 20): DeviceState {
  const n = sw + 10;
  const name = `PC${sw}-V${vlan}`;
  return {
    id: `pc${sw}v${vlan}`, hostname: name, vendor: 'linux-host',
    privilege: 0, modeCtx: { mode: 'exec' },
    interfaces: {
      Ethernet0: { name: 'Ethernet0', adminUp: true,
        ipv4: { address: `192.168.${vlan}.${n}`, prefix: 24, mask } },
    },
    vlans: {}, routes: [],
  };
}

const devices: Record<string, DeviceState> = {};
for (let n = 1; n <= 4; n++) {
  devices[`sw${n}`] = makeSwitch(n-1);
  devices[`pc${n}v10`] = makePc(n,10);
  devices[`pc${n}v20`] = makePc(n,20);
}

const links: NetworkLink[] = [
  { a: 'sw1', aIf: RIGHT, b: 'sw2', bIf: LEFT, up: true },
  { a: 'sw2', aIf: RIGHT, b: 'sw3', bIf: LEFT, up: true },
  { a: 'sw3', aIf: RIGHT, b: 'sw4', bIf: LEFT, up: true },
  { a: 'sw4', aIf: RIGHT, b: 'sw1', bIf: LEFT, up: true },
];
for(let n=1;n<=4;n++) for(const [vlan,port] of [[10,A],[20,B]] as const){
  links.push({ a: `sw${n}`, aIf: port, b: `pc${n}v${vlan}`, bIf: 'Ethernet0', up: true });
}

const initialState: NetworkState = { activeDeviceId: 'sw1', devices, links };
const hostGoals: Scenario['goals'] = [
  { type: 'ipv4.hostReachable', fromHost: 'pc1v10', toHost: 'pc3v10' },
  { type: 'ipv4.hostReachable', fromHost: 'pc2v10', toHost: 'pc4v10' },
  { type: 'ipv4.hostReachable', fromHost: 'pc1v20', toHost: 'pc3v20' },
  { type: 'ipv4.hostReachable', fromHost: 'pc2v20', toHost: 'pc4v20' },
];

export const ciscoFourSwitchHostRingScenario: Scenario = {
  id: 'cisco-four-switch-host-ring',
  title: 'Кольцо: 4 Cisco, 8 ПК, VLAN 10/20 и STP',
  description: 'Четыре коммутатора образуют физическое кольцо, к каждому подключены два ПК (VLAN 10 и 20). IP, VLAN, trunk и SVI уже настроены. В CLI выберите Root Bridge, проверьте CST и сетевую доступность ПК. Можно отключить один межкоммутаторный кабель на схеме и проверить перестроение дерева. ПК — фиксированные хосты с IP, не CLI Cisco. IPv4 и L2 проверяются моделью конфигурации/forwarding, без ARP, FDB и настоящих ICMP.',
  vendor: 'cisco-ios', concepts: ['stp','vlan','trunk','svi','ipv4','l2-path','multi-device'],
  difficulty: 3, modesAllowed: ['learn','drill','task'],
  allowLinkToggle: true, initialState,
  steps: [
    { id: 'root', instruction: 'Сделайте Switch1 корнем единого CST, установив spanning-tree vlan 1 priority 4096. Убедитесь в результате через show spanning-tree.',
      hint: 'Выбери Switch1 → enable → configure terminal → spanning-tree vlan 1 priority 4096 → end → show spanning-tree',
      explanation: 'Устойчивое дерево CST рассчитало роли портов при новом приоритете Bridge ID.',
      accept: [{ type: 'stp.bridgePriority', device: 'sw1', priority: 4096 }] },
    { id: 'hosts', instruction: 'По данным схемы и CLI убедитесь, что ПК в каждой VLAN связаны через кольцо; VLAN 10 и VLAN 20 друг с другом напрямую не маршрутизируются.',
      hint: 'Сравни show spanning-tree, show interfaces trunk, show vlan brief и подсветку линий. Для теста обрыва используйте кнопки линии на схеме.',
      explanation: 'В обеих VLAN есть сквозные пути по интерфейсам Forwarding; Blocking предотвращает петлю.',
      accept: hostGoals },
    { id: 'save', instruction: 'Сохраните изменённую конфигурацию Switch1, чтобы назначение корня сохранилось после reload.',
      hint: 'На Switch1: copy running-config startup-config или write memory.',
      explanation: 'Приоритет CST зафиксирован в startup-config, L2-путь остаётся работоспособным.',
      accept: [{ type: 'config.saved', device: 'sw1' }] },
  ],
  goals: [
    { type: 'stp.bridgePriority', device: 'sw1', priority: 4096 },
    ...hostGoals,
    { type: 'config.saved', device: 'sw1' },
  ],
  successMessage: 'Switch1 стал корнем CST, обе VLAN связны по модели IP/L2/STP, конфигурация сохранена. Это модель без настоящих ICMP/ARP.',
};
