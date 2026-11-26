import type { DeviceState, NetworkState, Scenario } from '../engine/types';

const ACCESS = 'FastEthernet0/1';
const UPLINK = 'FastEthernet0/24';
const SVI = 'Vlan10';
const VLAN = 10;

function makeSwitch(id: 'sw1' | 'sw2'): DeviceState {
  return {
    id,
    hostname: id.toUpperCase(),
    vendor: 'cisco-ios',
    privilege: 0,
    modeCtx: { mode: 'exec' },
    interfaces: {
      [ACCESS]: { name: ACCESS, adminUp: false, switchport: { mode: 'unset' } },
      [UPLINK]: { name: UPLINK, adminUp: false, switchport: { mode: 'unset' } },
      [SVI]: { name: SVI, adminUp: false },
    },
    vlans: { 1: { id: 1, name: 'default', active: true } },
    routes: [],
  };
}

const initialState: NetworkState = {
  activeDeviceId: 'sw1',
  devices: { sw1: makeSwitch('sw1'), sw2: makeSwitch('sw2') },
  links: [{ a: 'sw1', aIf: UPLINK, b: 'sw2', bIf: UPLINK, up: true }],
};

const l2Path: Scenario['goals'][number] = {
  type: 'l2.vlanReachable',
  vlanId: VLAN,
  fromDevice: 'sw1',
  fromIf: ACCESS,
  toDevice: 'sw2',
  toIf: ACCESS,
};

function switchGoals(id: 'sw1' | 'sw2', address: string): Scenario['goals'] {
  return [
    { type: 'vlan.exists', device: id, vlanId: VLAN },
    { type: 'if.accessVlan', device: id, ifName: ACCESS, vlanId: VLAN },
    { type: 'if.admin', device: id, ifName: ACCESS, up: true },
    { type: 'if.trunkAllowed', device: id, ifName: UPLINK, vlans: [VLAN] },
    { type: 'if.admin', device: id, ifName: UPLINK, up: true },
    { type: 'if.ipv4', device: id, ifName: SVI, address, prefix: 24 },
    { type: 'if.admin', device: id, ifName: SVI, up: true },
  ];
}

const sw1Goals = switchGoals('sw1', '192.168.10.2');
const sw2Goals = switchGoals('sw2', '192.168.10.3');

export const ciscoTwoSwitchSviScenario: Scenario = {
  id: 'cisco-two-switch-management-svi',
  title: 'С нуля: два Cisco, VLAN и IP управления',
  description: 'Два L2-коммутатора SW1 и SW2 соединены через Fa0/24. Настройте VLAN 10, клиентские Fa0/1, trunk и IP управления на interface Vlan10: SW1 — 192.168.10.2/24, SW2 — 192.168.10.3/24. Проверьте конфигурационный L2-путь и сохраните настройки на обоих устройствах. Команда ping проверяет ограниченную модель IP-связности SVI; ARP и настоящие ICMP-пакеты не эмулируются, локальный autostate SVI оценивается по поднятому порту его VLAN; сквозной путь проверяется отдельно (учитывается устойчивое состояние CST).',
  vendor: 'cisco-ios',
  concepts: ['cisco-ios-modes', 'vlan', 'trunk', 'access-port', 'svi', 'ipv4', 'multi-device', 'l2-path', 'config-persistence'],
  difficulty: 2,
  modesAllowed: ['learn', 'drill', 'task'],
  initialState,
  steps: [
    {
      id: 'sw1-layer2',
      instruction: 'На SW1 создайте VLAN 10. Настройте Fa0/1 как access VLAN 10, Fa0/24 как trunk только с VLAN 10; включите оба порта.',
      hint: 'Порядок: privileged → global config → vlan → interface access → interface trunk. Проверяйте show vlan brief и show interfaces trunk.',
      explanation: 'Созданы VLAN и оба типа портов. Линия станет операционно up только когда настроен и включён её второй конец.',
      accept: sw1Goals.slice(0, 5),
    },
    {
      id: 'sw1-svi',
      instruction: 'На SW1 создайте IP-интерфейс управления Vlan10 с адресом 192.168.10.2/24 и административно включите его.',
      hint: 'В global config выберите interface vlan 10. Затем задайте адрес с маской 255.255.255.0; снимите shutdown. Посмотрите show ip interface brief.',
      explanation: 'SVI — виртуальный интерфейс VLAN. На L2-коммутаторе IP SVI нужен для управления и не включает межвлановую маршрутизацию.',
      accept: sw1Goals.slice(5),
    },
    {
      id: 'sw2-layer2',
      instruction: 'Перейдите в консоль SW2, создайте VLAN 10 и настройте access Fa0/1, trunk Fa0/24 и no shutdown для обоих портов.',
      hint: 'Поменяйте выбранную консоль, получите privileged-доступ; повторите настройку двух типов портов, затем проверьте show interfaces trunk.',
      explanation: 'Два конца trunk настроены независимо; совпадение VLAN и allowed list позволяет проверить сквозной L2-путь.',
      accept: sw2Goals.slice(0, 5),
    },
    {
      id: 'sw2-svi',
      instruction: 'На SW2 назначьте Vlan10 адрес 192.168.10.3/24 и выполните no shutdown.',
      hint: 'Используйте interface vlan 10, затем ip address и no shutdown. IP должен отличаться от адреса SW1.',
      explanation: 'У каждого коммутатора свой IP управления в одной подсети; это ещё не подтверждает связность без работающего trunk.',
      accept: sw2Goals.slice(5),
    },
    {
      id: 'l2-verify',
      instruction: 'Проверьте VLAN, trunk, IP и выполните ping 192.168.10.3 с SW1 (и ping 192.168.10.2 с SW2). Подтвердите IP-связность SVI через проверку целей стенда.',
      hint: 'Используйте show vlan brief, show interfaces trunk, show ip interface brief и ping <IP соседа>. Результат ping — модель конфигурации SVI/IPv4, не настоящие ICMP-пакеты.',
      explanation: 'Критерий — сквозной L2-путь и двусторонняя IPv4-связность SVI по реальным настройкам VLAN, trunk, масок и линков в модели.',
      accept: [l2Path, { type: 'ipv4.sviReachable', device: 'sw1', destination: '192.168.10.3' }, { type: 'ipv4.sviReachable', device: 'sw2', destination: '192.168.10.2' }],
    },
    {
      id: 'save-both',
      instruction: 'Сохраните running-config на SW1 и SW2 в startup-config.',
      hint: 'В privileged-режиме каждого коммутатора выполните copy running-config startup-config или write memory; проверьте show startup-config.',
      explanation: 'После изменения конфигурации её нужно сохранять отдельно на каждом устройстве.',
      accept: [
        { type: 'config.saved', device: 'sw1' },
        { type: 'config.saved', device: 'sw2' },
      ],
    },
  ],
  goals: [
    ...sw1Goals,
    ...sw2Goals,
    l2Path,
    { type: 'ipv4.sviReachable', device: 'sw1', destination: '192.168.10.3' },
    { type: 'ipv4.sviReachable', device: 'sw2', destination: '192.168.10.2' },
    { type: 'config.saved', device: 'sw1' },
    { type: 'config.saved', device: 'sw2' },
  ],
  successMessage: 'SW1 и SW2 настроены: VLAN 10, trunk и оба SVI IP записаны; конфигурационный L2-путь проверен, startup-config обоих сохранены. Ping подтверждён моделью конфигурации SVI/IPv4; реальный ICMP не эмулируется, а локальный SVI autostate учитывает CST forwarding.',
};
