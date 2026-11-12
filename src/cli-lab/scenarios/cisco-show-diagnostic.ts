import type { DeviceState, NetworkState, Scenario } from '../engine/types';

const CLIENT = 'FastEthernet0/1';
const WORKING = 'FastEthernet0/2';
const UPLINK = 'FastEthernet0/24';
const vlanIds = [10, 30];

function makeSwitch(id: 'sw1' | 'sw2'): DeviceState {
  const brokenClient = id === 'sw2';
  return {
    id, hostname: id.toUpperCase(), vendor: 'cisco-ios',
    privilege: 0, modeCtx: { mode: 'exec' },
    interfaces: {
      [CLIENT]: {
        name: CLIENT, adminUp: !brokenClient,
        switchport: { mode: 'access', accessVlan: 30 },
      },
      [WORKING]: {
        name: WORKING, adminUp: true,
        switchport: { mode: 'access', accessVlan: 10 },
      },
      [UPLINK]: {
        name: UPLINK, adminUp: true,
        switchport: { mode: 'trunk', trunkAllowed: [...vlanIds] },
      },
    },
    vlans: {
      1: { id: 1, name: 'default', active: true },
      10: { id: 10, name: 'OFFICE', active: true },
      30: { id: 30, name: 'CAMERAS', active: true },
    },
    routes: [],
  };
}

const initialState: NetworkState = {
  activeDeviceId: 'sw1',
  devices: { sw1: makeSwitch('sw1'), sw2: makeSwitch('sw2') },
  links: [
    { a: 'sw1', aIf: UPLINK, b: 'sw2', bIf: UPLINK, up: true },
  ],
};

const cameraPath: Scenario['goals'][number] = {
  type: 'l2.vlanReachable', vlanId: 30,
  fromDevice: 'sw1', fromIf: CLIENT, toDevice: 'sw2', toIf: CLIENT,
};
const officePath: Scenario['goals'][number] = {
  type: 'l2.vlanReachable', vlanId: 10,
  fromDevice: 'sw1', fromIf: WORKING, toDevice: 'sw2', toIf: WORKING,
};

/** Learn teaches the investigative process, not the failed port or repair command. */
export const ciscoShowDiagnosticScenario: Scenario = {
  id: 'cisco-show-diagnostic-basic',
  title: 'Диагностика CLI: найди причину',
  description: 'Заявка: между SW1 и SW2 недоступен сервис камер (VLAN 30), а офисная сеть (VLAN 10) работает. Выясните причину через CLI и восстановите путь, сохранив работающий сервис. Физические соединения модели исправны. Проверяется L2-модель, не реальный ping.',
  diagnostic: true,
  publicGoalLabels: [
    'Восстановить модельный L2-путь VLAN 30 между клиентскими портами',
    'Не нарушить работающий L2-путь VLAN 10',
    'Сохранить исправленную конфигурацию',
  ],
  vendor: 'cisco-ios',
  concepts: ['cisco-ios-show', 'context-help', 'tab', 'diagnostics', 'l2-path'],
  difficulty: 2,
  modesAllowed: ['learn', 'drill', 'task'],
  initialState,
  steps: [
    {
      id: 'diagnose',
      instruction: 'Соберите факты: сравните состояние интерфейсов, наличие VLAN и trunk на обоих устройствах. Используйте ? и TAB, если забыли синтаксис. Устраняйте только подтверждённую неисправность.',
      hint: 'Алгоритм: 1) Сравните show interfaces status. 2) Уточните show interfaces <порт> для подозрительных интерфейсов. 3) Сверьте show vlan brief и show interfaces trunk на обоих узлах. 4) Исправьте расхождение, проверьте оба сервиса. Команды для ремонта и неисправный узел намеренно не названы.',
      explanation: 'Неисправность находят сопоставлением административного состояния, VLAN и trunk на обоих концах. Наличие VLAN на trunk не доказывает состояние клиентского порта.',
      accept: [cameraPath, officePath],
    },
    {
      id: 'save',
      instruction: 'Путь восстановлен и существующий сервис работает. Сохраните исправление.',
      hint: 'Вернитесь в привилегированный режим и сохраните running-config; затем проверьте startup-config.',
      explanation: 'Настройка уже действует, но без сохранения может потеряться при reload.',
      accept: [{ type: 'config.saved', device: 'sw2' }],
    },
  ],
  goals: [cameraPath, officePath, { type: 'config.saved', device: 'sw2' }],
  successMessage: 'Диагностика завершена: VLAN 30 восстановлен по модели L2, VLAN 10 не пострадал, конфигурация сохранена. ICMP-трафик не эмулируется.',
};
