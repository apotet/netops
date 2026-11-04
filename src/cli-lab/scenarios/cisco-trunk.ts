import { NetworkState, Scenario } from '../engine/types';

function buildInitialState(): NetworkState {
  return {
    activeDeviceId: 'sw1',
    links: [],
    devices: {
      sw1: {
        id: 'sw1',
        hostname: 'Switch',
        vendor: 'cisco-ios',
        privilege: 0,
        modeCtx: { mode: 'exec' },
        interfaces: {
          'FastEthernet0/1': {
            name: 'FastEthernet0/1',
            adminUp: false,
            operUp: false,
            switchport: { mode: 'unset' },
          },
          'FastEthernet0/2': {
            name: 'FastEthernet0/2',
            adminUp: false,
            operUp: false,
            switchport: { mode: 'unset' },
          },
        },
        vlans: {
          1: { id: 1, name: 'default', active: true },
        },
        routes: [],
      },
    },
  };
}

export const ciscoTrunkScenario: Scenario = {
  id: 'cisco-trunk-basic',
  title: 'Trunk 802.1Q',
  description:
    'Создайте VLAN 10 и 20. Переведите FastEthernet0/1 в trunk, разрешите VLAN 10,20 и поднимите порт (no shutdown).',
  vendor: 'cisco-ios',
  concepts: ['vlan', 'trunk', '802.1q', 'cisco-ios-modes'],
  difficulty: 2,
  modesAllowed: ['learn', 'drill', 'task', 'exam'],
  initialState: buildInitialState(),
  steps: [
    {
      id: 's1',
      instruction: 'enable → configure terminal',
      explanation: 'Конфигурация VLAN и портов — из global config.',
      hint: 'enable → conf t',
      accept: [{ type: 'mode', device: 'sw1', modes: ['config', 'config-if', 'config-vlan'] }],
    },
    {
      id: 's2',
      instruction: 'Создайте VLAN 10 и VLAN 20',
      explanation: 'Trunk несёт несколько VLAN; они должны существовать на коммутаторе.',
      hint: 'vlan 10 → exit → vlan 20 → exit',
      accept: [
        { type: 'vlan.exists', device: 'sw1', vlanId: 10 },
        { type: 'vlan.exists', device: 'sw1', vlanId: 20 },
      ],
    },
    {
      id: 's3',
      instruction: 'Fa0/1: switchport mode trunk',
      explanation: 'Trunk-порт тегирует кадры 802.1Q (кроме native VLAN).',
      hint: 'interface FastEthernet0/1 → switchport mode trunk',
      accept: [
        { type: 'if.switchportMode', device: 'sw1', ifName: 'FastEthernet0/1', mode: 'trunk' },
      ],
    },
    {
      id: 's4',
      instruction: 'Разрешите VLAN 10 и 20 на trunk и no shutdown',
      explanation: 'switchport trunk allowed vlan 10,20 ограничивает список VLAN на линке.',
      hint: 'switchport trunk allowed vlan 10,20 → no shutdown',
      accept: [
        { type: 'if.trunkAllowed', device: 'sw1', ifName: 'FastEthernet0/1', vlans: [10, 20] },
        { type: 'if.admin', device: 'sw1', ifName: 'FastEthernet0/1', up: true },
      ],
    },
  ],
  goals: [
    { type: 'vlan.exists', device: 'sw1', vlanId: 10 },
    { type: 'vlan.exists', device: 'sw1', vlanId: 20 },
    { type: 'if.switchportMode', device: 'sw1', ifName: 'FastEthernet0/1', mode: 'trunk' },
    { type: 'if.trunkAllowed', device: 'sw1', ifName: 'FastEthernet0/1', vlans: [10, 20] },
    { type: 'if.admin', device: 'sw1', ifName: 'FastEthernet0/1', up: true },
  ],
  successMessage:
    'Готово: VLAN 10/20, Fa0/1 trunk, allowed 10,20, порт up. Проверьте: show interfaces trunk',
};
