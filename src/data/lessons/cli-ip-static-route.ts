import type { Lesson } from './types';

export const LESSON_CLI_IP_STATIC_ROUTE: Lesson = {
  id: 'cli-ip-static-route',
  title: 'Cisco CLI: IP, маска, SVI и маршрут по умолчанию',
  category: 'CLI · IPv4 и маршрутизация', osiLayers: ['CLI', 'L3'], difficulty: 'applied',
  summary: 'Где вводить ip address, как проверить маску, чем физический L3-интерфейс отличается от SVI и как задать default route.',
  terms: ['IPv4', 'subnet mask', 'SVI', 'default route', 'gateway', 'running-config'],
  blocks: [
    { heading: 'Адрес назначается интерфейсу, а не вводится сам по себе', body: '192.168.10.2/24 — удобная запись адреса с длиной префикса, но в поддерживаемом профиле Cisco CLI для настройки используется ip address 192.168.10.2 255.255.255.0. Простая строка 192.168.10.2/24 не является командой.\n\nСначала войди в configure terminal, затем в нужный interface Vlan10 (логический SVI) либо маршрутизируемый GigabitEthernet0/0. После ip address выполни no shutdown. На обычном L2 access-порту IP в этой модели не назначается.' },
    { heading: 'Маска и сетевой префикс', body: 'Маска 255.255.255.0 означает /24: первые 24 бита принадлежат сети, оставшиеся 8 — адресам внутри неё. Например, 192.168.10.2/24 относится к сети 192.168.10.0/24.\n\nДля проверки введённой маски используй show running-config и найди нужный interface. show ip interface brief показывает адрес и состояние, но не маску. В обновлённом CLI запланированы точечные команды show running-config interface Vlan10 и show ip interface Vlan10; проверяй доступность по версии тренажёра.' },
    { heading: 'SVI — это не создание VLAN', body: 'vlan 10 создаёт L2-сегмент, а interface vlan 10 выбирает логический IP-интерфейс для управления. Команды vlan 10 и interface vlan 10 относятся к разным режимам. Состояние SVI зависит от admin state и локальных активных портов соответствующей VLAN, в модели с CST — также от STP forwarding. Наличие адреса не гарантирует доступность удалённого устройства.' },
    { heading: 'Маршрут по умолчанию и сохранение', body: 'На маршрутизирующем устройстве ip route 0.0.0.0 0.0.0.0 192.168.10.254 указывает next hop для направлений без более конкретного маршрута. Это глобальная команда в config, а не настройка VLAN 10 или физического интерфейса.\n\nПроверь show ip route и show running-config. Для исправления основного адреса обычно достаточно повторить ip address с верными параметрами; no ip address удаляет его. Перед сменой management SVI на реальном устройстве учитывай риск потери удалённой сессии. Для сохранения используй copy running-config startup-config.' },
  ],
  commands: [
    { title: 'Выбрать SVI', cmd: 'interface vlan 10' },
    { title: 'Назначить IP/маску', cmd: 'ip address 192.168.10.2 255.255.255.0' },
    { title: 'Удалить IP', cmd: 'no ip address' },
    { title: 'Проверка', cmd: 'show running-config', note: 'Ищи interface Vlan10 и строку ip address с маской.' },
    { title: 'Сводка', cmd: 'show ip interface brief', note: 'Маску не выводит.' },
    { title: 'Маршрут по умолчанию', cmd: 'ip route 0.0.0.0 0.0.0.0 192.168.10.254' },
  ],
  relatedQuestionIds: ['l3-04'],
  sources: ['Cisco IOS IP Addressing Configuration Guide', 'Cisco IOS IP Routing command reference', 'NetOps Cisco IOS CLI Lab supported subset'],
  professional: {
    summary: 'Interface addressing, SVI operational readiness, valid unicast host address, default route and running/startup verification.',
    terms: ['IPv4', 'subnet mask', 'SVI', 'FIB', 'default route', 'L2 forwarding'],
    blocks: [
      { heading: 'IPv4 assignment and context', body: 'Команда ip address A.B.C.D M.M.M.M относится к маршрутизируемому interface context. Проверка маски требует непрерывных единичных бит; длина /24 соответствует 255.255.255.0. Простого adminUp недостаточно для подтверждения операционной доступности SVI и сквозного IPv4 пути.' },
      { heading: 'SVI local autostate и end-to-end reachability', body: 'SVI — L3 termination локальной VLAN, но существование VLAN, состояние интерфейса, STP forwarding и достижимость удалённого SVI — разные факты. Диагностику начинайте с running-config и status, затем проверяйте L2 и маски на обоих концах. Модель NetOps не эмулирует настоящие ARP/ICMP пакеты.' },
      { heading: 'Route defaults и сохранение', body: 'Статический маршрут 0.0.0.0/0 выбирается, когда не найден более специфичный префикс. Next hop должен быть валидным адресом соответствующей схемы. running-config работает сразу; startup-config сохраняется отдельно. Изменение адреса SVI по SSH потенциально прерывает сеанс.' },
    ],
    commands: [{ title: 'Адрес и маска', cmd: 'ip address 192.168.10.2 255.255.255.0' }, { title: 'Просмотр текущего конфига', cmd: 'show running-config' }, { title: 'Маршруты', cmd: 'show ip route' }],
    sources: ['Cisco IOS IP Addressing Command Reference', 'Cisco IOS IP Routing Configuration Guide', 'NetOps CLI Lab supported subset'],
    sourceCommit: 'new-cli-theory-issue-127',
  },
};
