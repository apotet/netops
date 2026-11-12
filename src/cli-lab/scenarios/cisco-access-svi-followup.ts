import type { NetworkState, Scenario } from '../engine/types';

/**
 * Guided follow-up to cisco-vlan-access-basic.
 * Initial configuration represents the successful Access VLAN exercise.
 * No physical endpoint is modeled: SVI admin up does not imply line protocol up.
 */
const initialState: NetworkState = {
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
          adminUp: true,
          switchport: { mode: 'access', accessVlan: 10 },
        },
        'FastEthernet0/2': {
          name: 'FastEthernet0/2',
          adminUp: false,
          switchport: { mode: 'unset' },
        },
        Vlan10: { name: 'Vlan10', adminUp: false },
      },
      vlans: {
        1: { id: 1, name: 'default', active: true },
        10: { id: 10, name: 'Users', active: true },
      },
      routes: [],
    },
  },
};
const sviIp: Scenario['goals'][number] = {
  type: 'if.ipv4', device: 'sw1', ifName: 'Vlan10',
  address: '192.168.10.2', prefix: 24,
};
const sviAdmin: Scenario['goals'][number] = {
  type: 'if.admin', device: 'sw1', ifName: 'Vlan10', up: true,
};

export const ciscoAccessSviFollowupScenario: Scenario = {
  id: 'cisco-access-vlan-svi-followup',
  title: 'Продолжение Access VLAN: IP управления на SVI',
  description:
    'VLAN 10 (Users) и Fa0/1 access VLAN 10 уже настроены, как после предыдущего задания. Не меняя access-порт, добавьте логический interface Vlan10, назначьте коммутатору 192.168.10.2/24 и сохраните конфигурацию. Физическое подключение конечного устройства не моделируется, поэтому SVI может показывать down/down при admin up. Это не проверка ping.',
  vendor: 'cisco-ios',
  concepts: ['vlan', 'access-port', 'svi', 'ipv4', 'cisco-ios-modes', 'config-persistence'],
  difficulty: 1,
  modesAllowed: ['learn', 'drill', 'task'],
  initialState,
  steps: [
    {
      id: 'select-svi-and-set-ip',
      instruction: 'VLAN 10 уже существует. Выберите её логический IP-интерфейс SVI и задайте 192.168.10.2 с маской 255.255.255.0, затем выполните no shutdown.',
      hint: 'Отличай vlan 10 (config-vlan) от interface vlan 10 (config-if). Начни с enable → configure terminal. В режиме config-if введи ip address ... и no shutdown.',
      explanation: 'VLAN — L2-сегмент; interface Vlan10 — собственный L3-адрес коммутатора. no shutdown снимает административную блокировку, но не создаёт физический линк.',
      accept: [sviIp, sviAdmin],
    },
    {
      id: 'save-svi',
      instruction: 'Проверьте IP через show ip interface brief и конфигурацию через show running-config. Сохраните running-config в startup-config.',
      hint: 'end → show ip interface brief → show running-config → copy running-config startup-config. Статус line protocol down допустим: в этом стенде нет кабеля и подключённого соседа.',
      explanation: 'Сохранённая конфигурация переживёт reload. Наличие IP на SVI не означает межвлановую маршрутизацию или достижимость соседей.',
      accept: [{ type: 'config.saved', device: 'sw1' }],
    },
  ],
  goals: [
    { type: 'vlan.exists', device: 'sw1', vlanId: 10, name: 'Users' },
    { type: 'if.accessVlan', device: 'sw1', ifName: 'FastEthernet0/1', vlanId: 10 },
    { type: 'if.admin', device: 'sw1', ifName: 'FastEthernet0/1', up: true },
    sviIp, sviAdmin,
    { type: 'config.saved', device: 'sw1' },
  ],
  successMessage:
    'Готово: access VLAN 10 сохранена, Vlan10 получил 192.168.10.2/24 (admin up), running-config сохранена. Настоящая сетевая связность и ICMP здесь не проверяются.',
  nextScenarioId: 'cisco-two-switch-management-svi',
};
