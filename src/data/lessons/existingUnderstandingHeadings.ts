// Independently mapped question-to-existing-paragraph routes for Understanding.
// Only exact authored headings are accepted; no auto-generated lesson explanations.
export interface ExistingHeadingLink {
  lessonId: string;
  questionIds: string[];
  anchorId: string;
  afterHeading: {plain: string; professional: string};
}
export const EXISTING_HEADING_LINKS: ExistingHeadingLink[] = [
  { lessonId: 'l7-http-status-basics', questionIds: ['l57-x03'], anchorId: 'http-301-permanent',
    afterHeading: { plain: '301 Moved Permanently', professional: '301 и Location' } },
  {
    "lessonId": "l2-ethernet",
    "questionIds": [
      "l2-04"
    ],
    "anchorId": "in-depth-existing-l2-04",
    "afterHeading": {
      "plain": "Если получатель неизвестен или адресованы все",
      "professional": "Unknown unicast"
    }
  },
  {
    "lessonId": "l3-route-selection",
    "questionIds": [],
    "anchorId": "in-depth-existing-l3-16",
    "afterHeading": {
      "plain": "Сначала совпадение, затем самая длинная маска",
      "professional": "RIB/FIB, route selection и разрешение next hop"
    }
  },
  {
    "lessonId": "l7-http-status-basics",
    "questionIds": [
      "l7-05",
      "l57-x17"
    ],
    "anchorId": "in-depth-existing-l7-05",
    "afterHeading": {
      "plain": "404 Not Found",
      "professional": "404 vs 410"
    }
  },
  {
    "lessonId": "tcpip-encapsulation",
    "questionIds": [
      "new-tcpip-router"
    ],
    "anchorId": "in-depth-existing-new-tcpip-router",
    "afterHeading": {
      "plain": "Порты и адреса на разных участках пути",
      "professional": "Иерархия полей: от Ethernet до приложения"
    }
  },
  {
    "lessonId": "l2-vlan",
    "questionIds": [
      "new-ts-vlan"
    ],
    "anchorId": "in-depth-existing-new-ts-vlan",
    "afterHeading": {
      "plain": "Куда дойдёт сообщение для всех и кто ответит за шлюз",
      "professional": "Access и trunk"
    }
  },
  {
    "lessonId": "l7-dns",
    "questionIds": [
      "new-ts-dns"
    ],
    "anchorId": "in-depth-existing-new-ts-dns",
    "afterHeading": {
      "plain": "Как разбирать ошибку поиска",
      "professional": "Если имя не резолвится"
    }
  },
  {
    "lessonId": "l2-access-auth",
    "questionIds": [
      "review-dot1x-20"
    ],
    "anchorId": "in-depth-existing-review-dot1x-20",
    "afterHeading": {
      "plain": "Разговор по кабелю до открытия доступа",
      "professional": "EAPOL до авторизации"
    }
  },
  {
    "lessonId": "l3-ospf",
    "questionIds": [
      "review-ospf-27"
    ],
    "anchorId": "in-depth-existing-review-ospf-27",
    "afterHeading": {
      "plain": "Как выбирается более короткий путь",
      "professional": "Cost: выбирается сумма"
    }
  },
  {
    "lessonId": "l1-fiber-splicing",
    "questionIds": [
      "l1v2-b-transfer"
    ],
    "anchorId": "in-depth-existing-l1v2-b-transfer",
    "afterHeading": {
      "plain": "КДЗС и нагреватель защищают стык, но не лечат его",
      "professional": "Защита КДЗС, нагрев и кассетирование"
    }
  },
  {
    "lessonId": "l1-fiber-identification",
    "questionIds": [
      "l1v2-c-bidi-wrong-pair"
    ],
    "anchorId": "in-depth-existing-l1v2-c-bidi-wrong-pair",
    "afterHeading": {
      "plain": "Подбирать пару надо по параметрам",
      "professional": "Оптическая совместимость"
    }
  },
  {
    "lessonId": "l2-stp-guard-design",
    "questionIds": [
      "l2-sec-05"
    ],
    "anchorId": "in-depth-existing-l2-sec-05",
    "afterHeading": {
      "plain": "STP · EtherChannel",
      "professional": "STP · EtherChannel"
    }
  },
  {
    "lessonId": "l2-stp-guard-design",
    "questionIds": [
      "l2-sec-08"
    ],
    "anchorId": "in-depth-existing-l2-sec-08",
    "afterHeading": {
      "plain": "MSTP · Граница региона",
      "professional": "MSTP · Граница региона"
    }
  },
  {
    "lessonId": "l2-vlan-security",
    "questionIds": [
      "l2-sec-13"
    ],
    "anchorId": "in-depth-existing-l2-sec-13",
    "afterHeading": {
      "plain": "VLAN · Несовпадение native",
      "professional": "VLAN · Несовпадение native"
    }
  },
  {
    "lessonId": "l2-vlan-security",
    "questionIds": [
      "l2-sec-18"
    ],
    "anchorId": "in-depth-existing-l2-sec-18",
    "afterHeading": {
      "plain": "Port Security · Подмена",
      "professional": "Port Security · Подмена"
    }
  },
  {
    "lessonId": "l3-bgp",
    "questionIds": [
      "l3-bgp-06"
    ],
    "anchorId": "in-depth-existing-l3-bgp-06",
    "afterHeading": {
      "plain": "Достигнуть следующего узла и не принять петлю",
      "professional": "NEXT_HOP и AS_PATH: разные условия пригодности"
    }
  },
  {
    "lessonId": "l4-lb",
    "questionIds": [
      "l4-lb-01"
    ],
    "anchorId": "in-depth-existing-l4-lb-01",
    "afterHeading": {
      "plain": "Проверка сервера и новые подключения",
      "professional": "Health state, eligibility и текущие соединения"
    }
  },
  {
    "lessonId": "l2-stp",
    "questionIds": [
      "l12-x02"
    ],
    "anchorId": "in-depth-existing-l12-x02",
    "afterHeading": {
      "plain": "Порт в резерве, порт выключен и кабель повреждён",
      "professional": "Blocking и Discarding"
    }
  },
  {
    "lessonId": "l2-stp",
    "questionIds": [
      "l12-d05"
    ],
    "anchorId": "in-depth-existing-l12-d05",
    "afterHeading": {
      "plain": "Почему кадр возвращается",
      "professional": "Петля без STP"
    }
  },
  {
    "lessonId": "tls-sni",
    "questionIds": [
      "l57-d02"
    ],
    "anchorId": "in-depth-existing-l57-d02",
    "afterHeading": {
      "plain": "Чем имя сертификата отличается от адреса",
      "professional": "Почему сертификат по умолчанию иногда подходит"
    }
  },
  {
    "lessonId": "l3-vrrp",
    "questionIds": [
      "l3-vrrp02"
    ],
    "anchorId": "in-depth-existing-l3-vrrp02",
    "afterHeading": {
      "plain": "Как выбирают активного участника",
      "professional": "Роли"
    }
  },
  {
    "lessonId": "l3-vrrp",
    "questionIds": [
      "l3-vrrp04"
    ],
    "anchorId": "in-depth-existing-l3-vrrp04",
    "afterHeading": {
      "plain": "Вернуть роль основному или оставить работающий резерв",
      "professional": "Preemption"
    }
  },
  {
    "lessonId": "ts-copp-storm",
    "questionIds": [
      "l12-copp01"
    ],
    "anchorId": "in-depth-existing-l12-copp01",
    "afterHeading": {
      "plain": "Обращение к устройству и передача через него",
      "professional": "Потери до ≠ через"
    }
  },
  {
    "lessonId": "ts-copp-storm",
    "questionIds": [
      "l12-storm01"
    ],
    "anchorId": "in-depth-existing-l12-storm01",
    "afterHeading": {
      "plain": "Почему кадры пропадают без ошибок на порту",
      "professional": "Что такое Storm Control"
    }
  },
  {
    "lessonId": "l7-monitoring-snmp-syslog",
    "questionIds": [
      "mon-snmp-01"
    ],
    "anchorId": "in-depth-existing-mon-snmp-01",
    "afterHeading": {
      "plain": "SNMPv2c против SNMPv3 и ловушка EngineID",
      "professional": "SNMPv3 USM: уровни защиты и конфликт snmpEngineID"
    }
  },
  {
    "lessonId": "l7-monitoring-snmp-syslog",
    "questionIds": [
      "mon-syslog-01"
    ],
    "anchorId": "in-depth-existing-mon-syslog-01",
    "afterHeading": {
      "plain": "Syslog: PRI, Facility и фильтрация по Severity",
      "professional": "Архитектура Syslog: PRI, пороги и выбор транспорта"
    }
  },
  {
    "lessonId": "ts-zabbix-monitoring",
    "questionIds": [
      "mon-zabbix-01"
    ],
    "anchorId": "in-depth-existing-mon-zabbix-01",
    "afterHeading": {
      "plain": "Типы элементов данных Zabbix: пассивный и активный агент, SNMP и Trapper",
      "professional": "Сетевая топология сбора в Zabbix"
    }
  },
  {
    "lessonId": "l1-copper-fault-poe",
    "questionIds": [
      "l1v2-a-pass-view"
    ],
    "anchorId": "copper-pass-through",
    "afterHeading": {
      "plain": "Обычный 8P8C и pass-through: что меняется",
      "professional": "Обычный 8P8C и pass-through: что меняется"
    }
  },
  {
    "lessonId": "l1-copper-fault-poe",
    "questionIds": [
      "l1v2-a-t568b"
    ],
    "anchorId": "copper-t568-pinout",
    "afterHeading": {
      "plain": "Раскладка жил перед обжимом",
      "professional": "Раскладка жил перед обжимом"
    }
  },
  {
    "lessonId": "l1-copper-fault-poe",
    "questionIds": [
      "l1-06"
    ],
    "anchorId": "copper-four-wires",
    "afterHeading": {
      "plain": "Для чего нужны A и B и когда можно обжать четыре жилы",
      "professional": "Для чего нужны A и B и когда можно обжать четыре жилы"
    }
  },
  {
    "lessonId": "l1-copper-fault-poe",
    "questionIds": [
      "l1v2-a-pass-finish",
      "l1v2-a-pass-offcut",
      "l1v2-a-pass-crimper-view",
      "l1v2-a-pass-crimper-blade",
      "l1v2-a-precrimp"
    ],
    "anchorId": "copper-pass-crimper",
    "afterHeading": {
      "plain": "Обычный обжим 8P8C и отличие pass-through",
      "professional": "Обычный обжим 8P8C и отличие pass-through"
    }
  },
  {
    "lessonId": "l1-copper-fault-poe",
    "questionIds": [
      "l1v2-a-nick-view",
      "l1v2-a-nick-fix",
      "l1v2-a-stripper-depth"
    ],
    "anchorId": "copper-nick-stripping",
    "afterHeading": {
      "plain": "Надрезанная или оборванная медь — дефект",
      "professional": "Надрезанная или оборванная медь — дефект"
    }
  },
  {
    "lessonId": "l1-copper-fault-poe",
    "questionIds": [
      "l1v2-a-corrosion-view",
      "l1v2-a-corrosion-action"
    ],
    "anchorId": "copper-corrosion",
    "afterHeading": {
      "plain": "Потемнение контактов: что можно понять по виду",
      "professional": "Потемнение контактов: что можно понять по виду"
    }
  },
  {
    "lessonId": "l1-copper-fault-poe",
    "questionIds": [
      "l1v2-a-mark-cat6a"
    ],
    "anchorId": "copper-cat-label",
    "afterHeading": {
      "plain": "Надпись Cat6 или Cat6A не проверяет всю линию",
      "professional": "Надпись Cat6 или Cat6A не проверяет всю линию"
    }
  },
  {
    "lessonId": "l1-copper-fault-poe",
    "questionIds": [
      "l1v2-a-tester",
      "l1v2-a-tester-safe"
    ],
    "anchorId": "copper-tester-wiremap",
    "afterHeading": {
      "plain": "Проверка после обжима: не ограничивайся Link Up",
      "professional": "Проверка после обжима: не ограничивайся Link Up"
    }
  },


  { lessonId: 'l2-lacp-etherchannel', questionIds: ['eth-lacp'], anchorId: 'lacp-modes-actor-key',
    afterHeading: { plain: 'Режимы LACP: Active, Passive и опасность статического On', professional: 'Механика LACP (IEEE 802.1AX): System ID, Key и LACPDU' } },
  { lessonId: 'l2-lldp-neighbors', questionIds: ['review-lldp-7'], anchorId: 'lldp-port-id-mgmt-address',
    afterHeading: { plain: 'Как читать запись LLDP: Port ID, Port Description и Management Address', professional: 'Разбор TLV на примере Port ID (locally assigned), Port Description и Management Address' } },
  { lessonId: 'l3-mtu-mss-fragmentation', questionIds: ['l4-new-03'], anchorId: 'mtu-tcp-options-1448',
    afterHeading: { plain: 'Фактические опции TCP и IPv4: почему данных бывает меньше объявленного MSS', professional: 'Точный расчёт полезной нагрузки с фактическими IPv4/TCP options (RFC 6691)' } },
  { lessonId: 'l3-mtu-mss-fragmentation', questionIds: ['gap-pack2-02'], anchorId: 'mtu-ipv4-tcp-options-1444',
    afterHeading: { plain: 'Пример: IPv4 24 байта и TCP 32 байта — 1444 байта данных', professional: 'Расчёт gap-pack2-02: IPv4 options и TCP options — 1444 байта' } },
  { lessonId: 'l3-mtu-mss-fragmentation', questionIds: ['ts-pack1-15'], anchorId: 'mtu-local-pmtu-cache',
    afterHeading: { plain: 'Локальный кэш PMTU: какое ограничение срабатывает ещё до выхода кадра', professional: 'Локальный route/PMTU cache стека и порядок срабатывания ограничений' } },
  { lessonId: 'l3-mtu-mss-fragmentation', questionIds: ['gap-pack2-04'], anchorId: 'mtu-ipv6-ptb-transit',
    afterHeading: { plain: 'Транзитный IPv6 и ICMPv6 Packet Too Big (PTB)', professional: 'PMTUD (RFC 1191 / 8201), транзитный IPv6 Packet Too Big и почему нельзя резать весь ICMP' } },
  { lessonId: 'l2-ptp-time-sync', questionIds: ['review-ptp-16'], anchorId: 'ptp-accuracy-shift-budget',
    afterHeading: { plain: 'Как проверять бюджет точности за смену: единицы (мкс/мс), максимум и free-run', professional: 'Оценка пригодности по бюджету ошибки за смену (HW/SW, мс→мкс, holdover)' } },
  { lessonId: 'l2-ptp-time-sync', questionIds: ['review-ptp-18'], anchorId: 'ptp-1step-e2e-tc',
    afterHeading: { plain: 'Пример 1-step E2E Transparent Clock: как складывается Correction Field', professional: '1-step E2E Transparent Clock: суммирование correctionField и отличие от BC и 2-step' } },
  { lessonId: 'l3-acl-filtering', questionIds: ['gap-pack1-03'], anchorId: 'acl-first-match-xy-implicit-deny',
    afterHeading: { plain: 'Пример: пакет X разрешён первым правилом, Y попадает под implicit deny', professional: 'Точный разбор first-match и implicit deny на примере source-only ACL (пакеты X и Y)' } },
];
