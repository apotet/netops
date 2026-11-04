import { NetworkState, Scenario } from '../engine/types';

function buildInitialState(): NetworkState {
  return {
    activeDeviceId: 'r1',
    links: [],
    devices: {
      r1: {
        id: 'r1',
        hostname: 'Router',
        vendor: 'cisco-ios',
        privilege: 0,
        modeCtx: { mode: 'exec' },
        interfaces: {
          'GigabitEthernet0/0': {
            name: 'GigabitEthernet0/0',
            adminUp: false,
            operUp: false,
          },
          'GigabitEthernet0/1': {
            name: 'GigabitEthernet0/1',
            adminUp: false,
            operUp: false,
          },
        },
        vlans: {},
        routes: [],
      },
    },
  };
}

export const ciscoL3GatewayScenario: Scenario = {
  id: 'cisco-l3-gateway-basic',
  title: 'IP-адрес и маршрут по умолчанию',
  description:
    'На Router: hostname R1, на GigabitEthernet0/0 адрес 192.168.10.1/24, no shutdown, default route via 192.168.10.254.',
  vendor: 'cisco-ios',
  concepts: ['ipv4', 'static-route', 'interface-admin', 'cisco-ios-modes'],
  difficulty: 1,
  modesAllowed: ['learn', 'drill', 'task', 'exam'],
  initialState: buildInitialState(),
  steps: [
    {
      id: 's1',
      instruction: 'enable → configure terminal',
      explanation: 'Конфигурация интерфейсов и маршрутов выполняется из privileged → config.',
      hint: 'enable → conf t',
      accept: [{ type: 'mode', device: 'r1', modes: ['config', 'config-if'] }],
    },
    {
      id: 's2',
      instruction: 'Задайте hostname R1',
      explanation: 'hostname виден в prompt и в running-config.',
      hint: 'hostname R1',
      accept: [{ type: 'hostname', device: 'r1', hostname: 'R1' }],
    },
    {
      id: 's3',
      instruction: 'Gi0/0: ip address 192.168.10.1 255.255.255.0 и no shutdown',
      explanation: 'Маска 255.255.255.0 = /24. no shutdown поднимает admin/oper в этой lab-модели.',
      hint: 'interface GigabitEthernet0/0 → ip address 192.168.10.1 255.255.255.0 → no shutdown',
      accept: [
        { type: 'if.ipv4', device: 'r1', ifName: 'GigabitEthernet0/0', address: '192.168.10.1', prefix: 24 },
        { type: 'if.admin', device: 'r1', ifName: 'GigabitEthernet0/0', up: true },
      ],
    },
    {
      id: 's4',
      instruction: 'Маршрут по умолчанию: ip route 0.0.0.0 0.0.0.0 192.168.10.254',
      explanation: 'Default route (0.0.0.0/0) указывает next-hop для сетей, которых нет в таблице.',
      hint: 'exit (из if) → ip route 0.0.0.0 0.0.0.0 192.168.10.254',
      accept: [
        {
          type: 'route.exists',
          device: 'r1',
          prefix: '0.0.0.0',
          prefixLen: 0,
          nextHop: '192.168.10.254',
        },
      ],
    },
  ],
  goals: [
    { type: 'hostname', device: 'r1', hostname: 'R1' },
    { type: 'if.ipv4', device: 'r1', ifName: 'GigabitEthernet0/0', address: '192.168.10.1', prefix: 24 },
    { type: 'if.admin', device: 'r1', ifName: 'GigabitEthernet0/0', up: true },
    {
      type: 'route.exists',
      device: 'r1',
      prefix: '0.0.0.0',
      prefixLen: 0,
      nextHop: '192.168.10.254',
    },
  ],
  successMessage:
    'Готово: R1, Gi0/0 = 192.168.10.1/24 up, default via 192.168.10.254. Проверьте: show ip route',
};
