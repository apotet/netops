import { DeviceState, NetworkState, Scenario } from '../engine/types';

const A = 'FastEthernet0/1';
const LEFT = 'FastEthernet0/23';
const RIGHT = 'FastEthernet0/24';

function makeSwitch(id: string, hasAccess: boolean): DeviceState {
  const ports = hasAccess ? [A] : [];
  if (id !== 'sw1') ports.push(LEFT);
  if (id !== 'sw3') ports.push(RIGHT);
  const interfaces: DeviceState['interfaces'] = {};
  for (const name of ports) {
    const access = name === A;
    interfaces[name] = {
      name, adminUp: true, operUp: true,
      switchport: access
        ? { mode: 'access', accessVlan: 10 }
        : { mode: 'trunk', trunkAllowed: [10] },
    };
  }
  const vlans: DeviceState['vlans'] = { 1: { id: 1, name: 'default', active: true } };
  if (id !== 'sw2') vlans[10] = { id: 10, name: 'USERS', active: true };
  return {
    id, hostname: id.toUpperCase(), vendor: 'cisco-ios', privilege: 0,
    modeCtx: { mode: 'exec' }, interfaces,
    vlans, routes: [],
  };
}

const initialState: NetworkState = {
  activeDeviceId: 'sw1',
  devices: {
    sw1: makeSwitch('sw1', true),
    sw2: makeSwitch('sw2', false),
    sw3: makeSwitch('sw3', true),
  },
  links: [
    { a: 'sw1', aIf: RIGHT, b: 'sw2', bIf: LEFT, up: true },
    { a: 'sw2', aIf: RIGHT, b: 'sw3', bIf: LEFT, up: true },
  ],
};

const pathGoal: Scenario['goals'][number] = {
  type: 'l2.vlanReachable', vlanId: 10,
  fromDevice: 'sw1', fromIf: A, toDevice: 'sw3', toIf: A,
};

export const ciscoThreeSwitchMissingVlanScenario: Scenario = {
  id: 'cisco-three-switch-l2-diagnostics',
  title: 'Три коммутатора · нет связи',
  description: 'SW1 Fa0/24 ↔ SW2 Fa0/23, SW2 Fa0/24 ↔ SW3 Fa0/23. Устройства в VLAN 10 на краях сети потеряли L2-связность. Проверьте конфигурацию и состояние всех трёх коммутаторов, определите причину и восстановите путь. Проверяется модель L2-конфигурации, не ICMP.',
  diagnostic: true,
  publicGoalLabels: ['Восстановить L2-путь VLAN 10 между крайними устройствами', 'Сохранить исправленную конфигурацию'],
  vendor: 'cisco-ios',
  concepts: ['vlan', 'trunk', 'diagnostics', 'multi-device', 'l2-path'],
  difficulty: 2,
  modesAllowed: ['learn', 'drill', 'task'],
  initialState,
  steps: [
    {
      id: 'investigate-and-fix',
      instruction: 'Определите, на каком участке нарушена связность VLAN 10. Сравните состояние интерфейсов, VLAN и trunk на SW1, SW2 и SW3; затем устраните найденную причину.',
      explanation: 'Allowed VLAN на trunk ещё не означает, что VLAN существует и активен на промежуточном коммутаторе.',
      hint: 'Алгоритм: 1) Проверьте show interfaces status на каждом узле. 2) Сравните show vlan brief и show interfaces trunk. 3) Найдите расхождение на пути SW1 → SW3. 4) Исправьте только то, что подтверждено диагностикой.',
      accept: [pathGoal],
    },
    {
      id: 'save-repair',
      instruction: 'Путь восстановлен. Сохраните конфигурацию на устройстве, где выполняли исправление.',
      hint: 'На устройстве с изменениями: end → copy running-config startup-config (или write memory). Проверить можно через show startup-config.',
      explanation: 'Оперативная конфигурация работает сразу, но сохранение — отдельное действие.',
      accept: [{ type: 'config.saved', device: 'sw2' }],
    },
  ],
  goals: [pathGoal, { type: 'config.saved', device: 'sw2' }],
  successMessage: 'VLAN 10 проходит через SW1 → SW2 → SW3 по модели L2-конфигурации; исправление SW2 сохранено в startup-config. Ping не эмулируется.',
};
