import type { Lesson } from './types';

export const LESSON_CLI_VLAN_TRUNK: Lesson = {
  id: 'cli-vlan-trunk',
  title: 'Cisco CLI: access, trunk и allowed VLAN — от настройки к диагностике',
  category: 'CLI · Коммутация', osiLayers: ['CLI', 'L2'], difficulty: 'applied',
  summary: 'Пошагово отличаем access от trunk, создаём VLAN, включаем её на обоих концах соединения и проверяем, почему VLAN может не проходить.',
  terms: ['VLAN', '802.1Q', 'access', 'trunk', 'allowed VLAN', 'running-config', 'STP'],
  blocks: [
    { heading: 'Access и trunk делают разную работу', body: 'Access-порт подключает конечное устройство к одной VLAN. Trunk соединяет коммутаторы и может переносить несколько VLAN по одному кабелю. Создать VLAN на коммутаторе недостаточно: на обоих концах trunk она должна существовать, быть активной и быть разрешена.\n\nLink Up показывает физическое соединение, а не прохождение нужной VLAN. STP также может заблокировать передачу через физически поднятый порт.' },
    { heading: 'Пример: VLAN 10 на access-порту', body: 'В привилегированном EXEC войди в configure terminal. Введи vlan 10, затем exit. Выбери interface FastEthernet0/1, выполни switchport mode access, switchport access vlan 10 и no shutdown.\n\nПомни: vlan 10 — это режим создания VLAN, interface FastEthernet0/1 — настройка конкретного физического порта. Проверять их лучше отдельно.' },
    { heading: 'Пример: trunk между SW1 и SW2', body: 'На каждом конце соединения выбери соответствующий физический интерфейс, выполни switchport mode trunk, switchport trunk allowed vlan 10,20 и no shutdown. Если 10 разрешена только с одной стороны, сквозной путь для VLAN 10 не гарантирован.\n\nЕсли требуется добавить VLAN, не затирая существующий список, используй switchport trunk allowed vlan add 10. Чтобы удалить одну — remove 10. Запись switchport trunk allowed vlan 10,20 заменяет список, а не дополняет его.' },
    { heading: 'Диагностика без угадывания причины', body: 'Проверяй в порядке: show interfaces status (физическое состояние), show vlan (наличие и access-порты), show interfaces trunk (разрешённые VLAN), show running-config (настройки обоих концов). На каждом коммутаторе проверяй оба участника нужного соединения.\n\nДля режима задачи-диагностики не меняй сразу несколько параметров: зафиксируй наблюдения, выдвини одну гипотезу и проверь результат. После настройки сохрани конфигурацию: copy running-config startup-config.' },
  ],
  commands: [
    { title: 'Создать VLAN', cmd: 'vlan 10', note: 'Из Switch(config)#; имя задаётся отдельной командой name.' },
    { title: 'Access', cmd: 'switchport mode access', note: 'В config-if физического switchport.' },
    { title: 'Назначить VLAN', cmd: 'switchport access vlan 10' },
    { title: 'Trunk', cmd: 'switchport mode trunk' },
    { title: 'Разрешить VLAN', cmd: 'switchport trunk allowed vlan 10,20', note: 'Заменяет текущий allowed list.' },
    { title: 'Проверить', cmd: 'show interfaces trunk', note: 'Вывод не равен гарантированному прохождению VLAN через всю сеть.' },
  ],
  relatedQuestionIds: [],
  sources: ['IEEE 802.1Q — Bridges and Bridged Networks', 'Cisco Catalyst IOS VLAN and trunk configuration guides', 'NetOps Cisco IOS supported command subset'],
  professional: {
    summary: 'Проверка конфигурации access/trunk/allowed VLAN и ограничений модели L2-проходимости в Cisco IOS CLI.',
    terms: ['access', 'trunk', '802.1Q', 'allowed VLAN', 'STP', 'SVI'],
    blocks: [
      { heading: 'Контроль плоскости VLAN и трафика', body: 'VLAN database, per-port membership, 802.1Q tagging, административное состояние интерфейса и STP forwarding — независимые проверки. VLAN может быть active локально, но не проходить через транзитный trunk вследствие allowed-list mismatch или STP blocking.\n\nТранзитная связность проверяется последовательно на каждом конце каждого линка; наличие SVI не заменяет L2-проходимости между узлами.' },
      { heading: 'Грамматика конфигурации и изменение allowed list', body: 'switchport mode access выбирает не тегированный клиентский режим в модели; switchport mode trunk — транзитный. switchport trunk allowed vlan 10,20 задаёт новый допустимый набор. add/remove — модификация набора без полной замены.\n\nРабота выполняется в config-if, диагностические show вызываются из EXEC либо через do show из режима настройки. Сохранение running-config отдельно.' },
      { heading: 'Troubleshooting без спойлеров', body: 'Снимите статус интерфейсов, состояние VLAN, таблицу trunk и running-config на всех узлах. Сравните интерфейсы попарно по физической и VLAN-совместимости. Устойчивый CST может блокировать сегмент при PHY Up. Не подменяйте сетевой вывод предположением по одному зелёному индикатору.' },
    ],
    commands: [{ title: 'Транк и фильтрация', cmd: 'show interfaces trunk' }, { title: 'Фактический режим интерфейса', cmd: 'show interfaces FastEthernet0/24 switchport' }],
    sources: ['Cisco Catalyst IOS LAN Switching command reference', 'IEEE 802.1Q', 'NetOps CLI Lab documented subset'],
    sourceCommit: 'new-cli-theory-issue-127',
  },
};
