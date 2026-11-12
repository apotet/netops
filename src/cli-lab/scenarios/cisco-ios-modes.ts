import type { NetworkState, Scenario } from '../engine/types';

/** Introductory CLI navigation lab: mode transitions and saving a configuration. */
function initialState(): NetworkState {
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
            switchport: { mode: 'unset' },
          },
        },
        vlans: { 1: { id: 1, name: 'default', active: true } },
        routes: [],
      },
    },
  };
}

export const ciscoIosModesScenario: Scenario = {
  id: 'cisco-ios-modes-basic',
  title: 'Режимы Cisco IOS и сохранение',
  description: 'Пройдите путь от Switch> до конфигурации интерфейса, вернитесь назад, измените hostname и сохраните running-config. Не нужно поднимать порт или имитировать сеть.',
  vendor: 'cisco-ios',
  concepts: ['cisco-ios-modes', 'navigation', 'config-persistence'],
  difficulty: 1,
  modesAllowed: ['learn', 'drill', 'task'],
  initialState: initialState(),
  steps: [
    {
      id: 'modes-1',
      instruction: 'Перейдите из Switch> в привилегированный режим Switch#.',
      explanation: 'Символ # обозначает Privileged EXEC; ещё ничего не настроено.',
      hint: 'Нужна команда повышения уровня доступа.',
      accept: [{ type: 'mode', device: 'sw1', modes: ['privileged'] }],
    },
    {
      id: 'modes-2',
      instruction: 'Откройте глобальную конфигурацию (Switch(config)#).',
      explanation: 'В глобальном режиме меняются общие параметры устройства.',
      hint: 'В Privileged EXEC используйте команду перехода в конфигурацию.',
      accept: [{ type: 'mode', device: 'sw1', modes: ['config'] }],
    },
    {
      id: 'modes-3',
      instruction: 'Выберите интерфейс FastEthernet0/1. Приглашение должно стать (config-if)#.',
      explanation: 'Изменения в config-if относятся к выбранному интерфейсу.',
      hint: 'Используйте interface и имя существующего порта.',
      accept: [{ type: 'mode', device: 'sw1', modes: ['config-if'] }],
    },
    {
      id: 'modes-4',
      instruction: 'Вернитесь из настройки интерфейса ровно на один уровень, в (config)#.',
      explanation: 'exit возвращает в родительский режим. end вывел бы сразу в #.',
      hint: 'Команда выхода на один уровень.',
      accept: [{ type: 'mode', device: 'sw1', modes: ['config'] }],
    },
    {
      id: 'modes-5',
      instruction: 'Измените hostname коммутатора на NETOPS.',
      explanation: 'Имя в конфигурации влияет на приглашение командной строки.',
      hint: 'В глобальном режиме существует команда hostname.',
      accept: [{ type: 'hostname', device: 'sw1', hostname: 'NETOPS' }],
    },
    {
      id: 'modes-6',
      instruction: 'Вернитесь в Privileged EXEC, чтобы сохранить настройки.',
      explanation: 'Выход из конфигурации не сохраняет running-config в startup-config.',
      hint: 'Выйдите из режима конфигурации, не перезагружая устройство.',
      accept: [{ type: 'mode', device: 'sw1', modes: ['privileged'] }],
    },
    {
      id: 'modes-7',
      instruction: 'Сохраните running-config в startup-config.',
      explanation: 'Изменения hostname теперь переживут моделируемую перезагрузку.',
      hint: 'Используйте команду copy из running-config в startup-config.',
      accept: [{ type: 'config.saved', device: 'sw1' }],
    },
  ],
  goals: [
    { type: 'hostname', device: 'sw1', hostname: 'NETOPS' },
    { type: 'mode', device: 'sw1', modes: ['privileged'] },
    { type: 'config.saved', device: 'sw1' },
  ],
  successMessage: 'Готово: режимы пройдены, NETOPS задан и конфигурация сохранена. Изменение hostname — конфигурация, а не проверка физической связности.',
};
