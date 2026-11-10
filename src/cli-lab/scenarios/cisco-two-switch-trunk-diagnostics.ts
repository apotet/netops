import { DeviceState, NetworkState, Scenario } from '../engine/types';

const VLAN10 = 'FastEthernet0/1';
const VLAN20 = 'FastEthernet0/2';
const UPLINK = 'FastEthernet0/24';

function makeSwitch(id: 'sw1' | 'sw2'): DeviceState {
  const permitted = id === 'sw1' ? [10, 20] : [10];
  return {
    id,
    hostname: id.toUpperCase(),
    vendor: 'cisco-ios',
    privilege: 0,
    modeCtx: { mode: 'exec' },
    interfaces: {
      [VLAN10]: {
        name: VLAN10, adminUp: true, operUp: true,
        switchport: { mode: 'access', accessVlan: 10 },
      },
      [VLAN20]: {
        name: VLAN20, adminUp: true, operUp: true,
        switchport: { mode: 'access', accessVlan: 20 },
      },
      [UPLINK]: {
        name: UPLINK, adminUp: true, operUp: true,
        switchport: { mode: 'trunk', trunkAllowed: permitted },
      },
    },
    vlans: {
      1: { id: 1, name: 'default', active: true },
      10: { id: 10, name: 'STAFF', active: true },
      20: { id: 20, name: 'CAMERAS', active: true },
    },
    routes: [],
  };
}

const initialState: NetworkState = {
  activeDeviceId: 'sw1',
  devices: { sw1: makeSwitch('sw1'), sw2: makeSwitch('sw2') },
  links: [{ a: 'sw1', aIf: UPLINK, b: 'sw2', bIf: UPLINK, up: true }],
};

const vlan10Path: Scenario['goals'][number] = {
  type: 'l2.vlanReachable', vlanId: 10,
  fromDevice: 'sw1', fromIf: VLAN10, toDevice: 'sw2', toIf: VLAN10,
};
const vlan20Path: Scenario['goals'][number] = {
  type: 'l2.vlanReachable', vlanId: 20,
  fromDevice: 'sw1', fromIf: VLAN20, toDevice: 'sw2', toIf: VLAN20,
};

/** Deliberately do not name the faulty device or interface in learner-facing text. */
export const ciscoTwoSwitchTrunkDiagnosticScenario: Scenario = {
  id: 'cisco-two-switch-vlan-selective-diagnostics',
  title: 'Два коммутатора · частичная потеря связи',
  description: 'SW1 Fa0/24 ↔ SW2 Fa0/24. На обоих коммутаторах Fa0/1 — клиенты VLAN 10, Fa0/2 — клиенты VLAN 20. После изменений VLAN 10 работает, VLAN 20 потеряла сквозную L2-связность. Линки физически подняты. Определите причину, исправьте её, не нарушив VLAN 10, и сохраните результат. Проверяется модель L2-конфигурации, а не ICMP.',
  diagnostic: true,
  publicGoalLabels: [
    'Восстановить сквозной L2-путь VLAN 20',
    'Сохранить рабочий L2-путь VLAN 10',
    'Сохранить конфигурацию на устройстве с изменениями',
  ],
  vendor: 'cisco-ios',
  concepts: ['vlan', 'trunk', 'diagnostics', 'multi-device', 'l2-path'],
  difficulty: 2,
  modesAllowed: ['learn', 'drill', 'task'],
  initialState,
  steps: [
    {
      id: 'investigate',
      instruction: 'На обоих коммутаторах выясните, почему одна VLAN проходит, а другая — нет. Исправьте подтверждённую настройку, сохранив связь в обеих VLAN.',
      hint: 'Алгоритм: 1) Сравните show interfaces status. 2) Проверьте show vlan brief на каждом узле. 3) Сопоставьте show interfaces trunk на обоих концах. 4) Исправьте только подтверждённое расхождение и проверьте обе VLAN.',
      explanation: 'На исправном trunk проверяются не только состояние порта и наличие VLAN, но и разрешённые VLAN на обоих концах.',
      accept: [vlan20Path, vlan10Path],
    },
    {
      id: 'save',
      instruction: 'Сквозные пути обеих VLAN восстановлены. Сохраните running-config на устройстве, где меняли конфигурацию.',
      hint: 'Выполните на устройстве с изменениями: end → copy running-config startup-config или write memory. Проверить сохранение можно show startup-config.',
      explanation: 'Running-config действует сразу, но может потеряться при перезагрузке без сохранения.',
      accept: [{ type: 'config.saved', device: 'sw2' }],
    },
  ],
  goals: [vlan20Path, vlan10Path, { type: 'config.saved', device: 'sw2' }],
  successMessage: 'По модели L2-конфигурации обе VLAN проходят между SW1 и SW2, другие VLAN не потеряны, изменения сохранены. ICMP и реальный трафик не эмулируются.',
};
