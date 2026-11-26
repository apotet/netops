import type { Lesson } from './types';

export const LESSON_L2_DAI: Lesson = {
  "id": "l2-dai",
  "title": "Dynamic ARP Inspection: защита от поддельных ARP",
  "category": "L2 · Безопасность",
  "osiLayers": [
    "L2"
  ],
  "difficulty": "applied",
  "summary": "Почему чужой компьютер может выдать свой MAC за адрес шлюза, как коммутатор проверяет ARP и почему для этой защиты нужен достоверный список привязок.",
  "terms": [
    "DAI",
    "ARP spoofing",
    "DHCP snooping binding",
    "ARP ACL",
    "trusted",
    "untrusted"
  ],
  "blocks": [
    {
      "heading": "Чужой MAC под видом шлюза",
      "body": "Узел узнаёт MAC соседнего IPv4-адреса через ARP. Злоумышленник может отправить ложное объявление: «адрес шлюза находится на моём MAC». Если другие устройства примут его, их трафик может уйти к чужому компьютеру или перестать доходить до шлюза.\n\nЭто ARP spoofing. Сам факт получения ARP не доказывает право отправителя объявлять указанную пару IP и MAC."
    },
    {
      "heading": "С чем сравнить объявление",
      "body": "DHCP Snooping может изучить выданный клиенту адрес и связать IP, MAC, VLAN и порт с действующей арендой. Такая DHCP snooping binding даёт коммутатору ожидаемое соответствие, а не только сведения из самого проверяемого ARP.\n\nЕсли у устройства статический IP, нужной динамической записи может не быть. До включения защиты для него подготавливают разрешённую статическую политику, например ARP ACL на поддерживаемом оборудовании."
    },
    {
      "heading": "Что проверяет DAI",
      "body": "Dynamic ARP Inspection проверяет ARP на недоверенных входных портах защищённой VLAN. Когда заявленная пара не проходит проверку по разрешённым данным, сообщение отбрасывается вместо дальнейшего распространения.\n\nTrusted-порт исключает эту проверку в указанном направлении. Его выбирают по реальной границе доверия, а не просто потому, что кабель называется uplink. Доверие DHCP Snooping и доверие DAI настраиваются отдельно."
    },
    {
      "heading": "Не путать потерю ARP с выключенным портом",
      "body": "Если перестал работать доступ к шлюзу, сначала сверяют запись binding, VLAN, IP и MAC устройства, а также счётчики отбрасывания. Отсутствующая запись у законного статического узла тоже может привести к блокировке ARP.\n\nОбычный результат неверного ARP — drop сообщения. Защитное отключение всего порта может быть связано, например, с превышением отдельного ограничения скорости ARP. Восстановление порта без выяснения причины лишь повторит событие."
    }
  ],
  "commands": [
    {
      "title": "Состояние DAI и VLAN",
      "cmd": "show ip arp inspection"
    },
    {
      "title": "Причины отбрасывания ARP",
      "cmd": "show ip arp inspection statistics"
    },
    {
      "title": "Динамические привязки клиентов",
      "cmd": "show ip dhcp snooping binding"
    },
    {
      "title": "Защитно отключённые интерфейсы",
      "cmd": "show interfaces status err-disabled"
    }
  ],
  "relatedQuestionIds": [],
  "sources": [
    "Network_history_NFA — переработка материала DAI: https://t.me/Network_history_NFA/352",
    "Cisco Catalyst IOS — Dynamic ARP Inspection configuration guide; DHCP Snooping and ARP ACL"
  ],
  "professional": {
    "summary": "DAI на Cisco Catalyst: сопоставление ARP с доверенными данными DHCP Snooping/ARP ACL, независимые trust-политики и различие validation drops и rate-limit err-disable.",
    "terms": [
      "DAI",
      "ARP spoofing",
      "DHCP snooping binding",
      "ARP ACL",
      "trusted",
      "untrusted"
    ],
    "blocks": [
      {
        "heading": "ARP validation и границы защиты",
        "body": "DAI проверяет входящие ARP requests/replies в включённых VLAN на untrusted-интерфейсах. Основа — разрешённое соответствие IP/MAC в контексте VLAN, обычно из DHCP Snooping binding database. Дополнительные проверки полей Ethernet/ARP и допустимости IP зависят от настроенных validation options.\n\nDAI не является проверкой источника каждого IPv4-пакета, шифрованием или полноценной аутентификацией устройства. Для источника IP-трафика применяется отдельный IP Source Guard."
      },
      {
        "heading": "Binding database и статические устройства",
        "body": "DHCP Snooping изучает динамические привязки с IP, MAC, VLAN, интерфейсом и сроком аренды. Проверяют актуальность базы, нужную VLAN и сохранность данных при перезапуске согласно возможностям платформы: действующая аренда клиента не гарантирует наличие записи после потери базы коммутатором.\n\nДля статических узлов могут применяться ARP ACL. В IOS применение ARP inspection filter со static и без него имеет разную семантику fallback к DHCP Snooping; отсутствие совпадения нельзя безусловно считать одинаковым результатом во всех режимах. Static IP source binding для IPSG также не следует автоматически приравнивать к ARP ACL DAI."
      },
      {
        "heading": "Trusted и untrusted — отдельная модель DAI",
        "body": "DAI trusted ingress обходит обычную инспекцию ARP на данном порту; untrusted ingress проверяется. Назначение trusted расширяет область, откуда непроверенный ARP может попасть в сеть, поэтому требуется контролируемый источник или upstream enforcement.\n\nDHCP Snooping trust разрешает серверные DHCP-сообщения и сам по себе не включает ip arp inspection trust. Роли двух функций, направление ingress и перенос защищённых VLAN проверяют раздельно."
      },
      {
        "heading": "Validation drop, rate limit и recovery",
        "body": "Неверное соответствие обычно приводит к отбрасыванию ARP и учёту причины; оно не означает обязательный err-disable интерфейса. Превышение настроенного ARP rate limit на поддерживаемом Catalyst может вызвать err-disable по причине arp-inspection. Порог и реакция зависят от платформы и политики.\n\nСопоставляют show ip arp inspection statistics, binding database и сообщения о причине отключения. Errdisable recovery для соответствующей причины или ручное восстановление применяют после исправления источника нарушения. Отключение DAI на всех клиентских портах не является диагностикой binding mismatch."
      }
    ],
    "commands": [
      {
        "title": "Состояние DAI и VLAN",
        "cmd": "show ip arp inspection"
      },
      {
        "title": "Причины отбрасывания ARP",
        "cmd": "show ip arp inspection statistics"
      },
      {
        "title": "Динамические привязки клиентов",
        "cmd": "show ip dhcp snooping binding"
      },
      {
        "title": "Защитно отключённые интерфейсы",
        "cmd": "show interfaces status err-disabled"
      }
    ],
    "sources": [
      "Network_history_NFA — переработка материала DAI: https://t.me/Network_history_NFA/352",
      "Cisco Catalyst IOS — Dynamic ARP Inspection configuration guide; DHCP Snooping and ARP ACL"
    ],
    "sourceCommit": "adapted-network-history-2026-11-13"
  }
};
