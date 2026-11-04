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

export const ciscoVlanAccessScenario: Scenario = {
  id: 'cisco-vlan-access-basic',
  title: 'Access VLAN на порту',
  description:
    'Создайте VLAN 10 (имя Users), переведите FastEthernet0/1 в access VLAN 10 и поднимите порт (no shutdown).',
  vendor: 'cisco-ios',
  concepts: ['vlan', 'access-port', 'cisco-ios-modes'],
  difficulty: 1,
  modesAllowed: ['learn', 'drill', 'task', 'exam'],
  initialState: buildInitialState(),
  steps: [
    {
      id: 's1',
      instruction: 'Войдите в privileged EXEC: enable',
      explanation: 'Без enable недоступны configure terminal и show running-config.',
      hint: 'enable',
      accept: [{ type: 'privilege', device: 'sw1', min: 15 }],
    },
    {
      id: 's2',
      instruction: 'Откройте конфигурацию: configure terminal (или conf t)',
      explanation: 'Глобальный config-режим — точка входа для VLAN и интерфейсов.',
      hint: 'configure terminal',
      accept: [{ type: 'mode', device: 'sw1', modes: ['config', 'config-if', 'config-vlan'] }],
    },
    {
      id: 's3',
      instruction: 'Создайте VLAN 10 и задайте имя Users',
      explanation: 'vlan 10 → name Users. VLAN появляется в таблице коммутатора.',
      hint: 'vlan 10 → name Users → exit',
      accept: [{ type: 'vlan.exists', device: 'sw1', vlanId: 10, name: 'Users' }],
    },
    {
      id: 's4',
      instruction: 'На FastEthernet0/1: access mode, access vlan 10, no shutdown',
      explanation: 'Access-порт несёт один VLAN без тега 802.1Q для оконечного устройства.',
      hint: 'interface FastEthernet0/1 → switchport mode access → switchport access vlan 10 → no shutdown',
      accept: [
        { type: 'if.switchportMode', device: 'sw1', ifName: 'FastEthernet0/1', mode: 'access' },
        { type: 'if.accessVlan', device: 'sw1', ifName: 'FastEthernet0/1', vlanId: 10 },
        { type: 'if.admin', device: 'sw1', ifName: 'FastEthernet0/1', up: true },
      ],
    },
  ],
  goals: [
    { type: 'vlan.exists', device: 'sw1', vlanId: 10, name: 'Users' },
    { type: 'if.switchportMode', device: 'sw1', ifName: 'FastEthernet0/1', mode: 'access' },
    { type: 'if.accessVlan', device: 'sw1', ifName: 'FastEthernet0/1', vlanId: 10 },
    { type: 'if.admin', device: 'sw1', ifName: 'FastEthernet0/1', up: true },
  ],
  successMessage: 'Готово: VLAN 10 (Users), Fa0/1 access VLAN 10, порт up. Проверьте: show vlan brief',
};

export const ciscoScenarios = [ciscoVlanAccessScenario];
