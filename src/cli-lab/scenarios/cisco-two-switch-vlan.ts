import { DeviceState, NetworkState, Scenario } from '../engine/types';

function makeSwitch(id: string): DeviceState {
  return {
    id, hostname: id.toUpperCase(), vendor: 'cisco-ios', privilege: 0, modeCtx: { mode: 'exec' },
    interfaces: Object.fromEntries(['FastEthernet0/1', 'FastEthernet0/24'].map((name) => [
      name, { name, adminUp: false, operUp: false, switchport: { mode: 'unset' as const } },
    ])),
    vlans: { 1: { id: 1, name: 'default', active: true } }, routes: [],
  };
}

const initialState: NetworkState = {
  activeDeviceId: 'sw1',
  devices: { sw1: makeSwitch('sw1'), sw2: makeSwitch('sw2') },
  links: [{ a: 'sw1', aIf: 'FastEthernet0/24', b: 'sw2', bIf: 'FastEthernet0/24', up: true }],
};

const goal: Scenario['goals'][number] = {
  type: 'l2.vlanReachable', vlanId: 10, fromDevice: 'sw1', fromIf: 'FastEthernet0/1',
  toDevice: 'sw2', toIf: 'FastEthernet0/1',
};

export const ciscoTwoSwitchVlanScenario: Scenario = {
  id: 'cisco-two-switch-vlan10',
  title: 'Два коммутатора · VLAN 10',
  description: 'SW1 Fa0/24 ↔ SW2 Fa0/24. На обоих коммутаторах создайте VLAN 10, настройте Fa0/1 как access VLAN 10, Fa0/24 как trunk с VLAN 10 и включите оба порта. Переключайте консоль через SW1 / SW2.',
  vendor: 'cisco-ios',
  concepts: ['vlan', 'trunk', 'access-port', 'multi-device', 'l2-path'],
  difficulty: 1,
  modesAllowed: ['learn', 'drill', 'task'],
  initialState,
  steps: [
    {
      id: 'sw1-access', instruction: 'На SW1 создайте VLAN 10, настройте Fa0/1 как access VLAN 10 и выполните no shutdown.',
      hint: 'enable → conf t → vlan 10 → exit → interface fa0/1 → switchport mode access → switchport access vlan 10 → no shutdown',
      explanation: 'SW1 подготовил порт конечного устройства.',
      accept: [
        { type: 'vlan.exists', device: 'sw1', vlanId: 10 },
        { type: 'if.accessVlan', device: 'sw1', ifName: 'FastEthernet0/1', vlanId: 10 },
        { type: 'if.admin', device: 'sw1', ifName: 'FastEthernet0/1', up: true },
      ],
    },
    {
      id: 'sw1-trunk', instruction: 'На SW1 переведите Fa0/24 в trunk, разрешите VLAN 10 и включите порт.',
      hint: 'exit → interface fa0/24 → switchport mode trunk → switchport trunk allowed vlan 10 → no shutdown',
      explanation: 'На SW1 готова локальная сторона межкоммутаторного trunk.',
      accept: [
        { type: 'if.trunkAllowed', device: 'sw1', ifName: 'FastEthernet0/24', vlans: [10] },
        { type: 'if.admin', device: 'sw1', ifName: 'FastEthernet0/24', up: true },
      ],
    },
    {
      id: 'sw2-access', instruction: 'Переключите консоль на SW2. Создайте VLAN 10, настройте Fa0/1 как access VLAN 10 и включите порт.',
      hint: 'Кнопка SW2 над терминалом → enable → conf t → vlan 10 → exit → interface fa0/1 → switchport access vlan 10 → no shutdown',
      explanation: 'У второго коммутатора VLAN и access-порт настроены независимо от SW1.',
      accept: [
        { type: 'vlan.exists', device: 'sw2', vlanId: 10 },
        { type: 'if.accessVlan', device: 'sw2', ifName: 'FastEthernet0/1', vlanId: 10 },
        { type: 'if.admin', device: 'sw2', ifName: 'FastEthernet0/1', up: true },
      ],
    },
    {
      id: 'sw2-trunk', instruction: 'На SW2 настройте Fa0/24 как trunk VLAN 10 и включите его. После этого проверьте сквозной путь.',
      hint: 'interface fa0/24 → switchport mode trunk → switchport trunk allowed vlan 10 → no shutdown',
      explanation: 'Оба конца trunk готовы, VLAN 10 проходит между access-портами по конфигурационной модели.',
      accept: [goal],
    },
    {
      id: 'save-sw1',
      instruction: 'L2-путь работает. Теперь сохраните конфигурацию SW1 в startup-config.',
      hint: 'Выберите SW1 → end (если в config) → copy running-config startup-config',
      explanation: 'Без сохранения изменения running-config могут быть потеряны после перезагрузки.',
      accept: [{ type: 'config.saved', device: 'sw1' }],
    },
    {
      id: 'save-sw2',
      instruction: 'Сохраните конфигурацию SW2. Можно использовать write memory.',
      hint: 'Выберите SW2 → end (если в config) → write memory',
      explanation: 'Сохранение выполняется отдельно на каждом коммутаторе.',
      accept: [{ type: 'config.saved', device: 'sw2' }],
    },
  ],
  goals: [goal, { type: 'config.saved', device: 'sw1' }, { type: 'config.saved', device: 'sw2' }],
  successMessage: 'Путь VLAN 10 подтверждён по конфигурации и настройки обоих коммутаторов сохранены в startup-config. Ping не эмулируется.',
};
