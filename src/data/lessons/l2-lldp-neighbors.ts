import type { Lesson } from './types';

export const LESSON_L2_LLDP_NEIGHBORS: Lesson = {
  "id": "l2-lldp-neighbors",
  "title": "LLDP и LLDP-MED: обнаружение соседей и диагностика L2",
  "category": "L2 · Обнаружение соседей",
  "osiLayers": [
    "L2"
  ],
  "difficulty": "applied",
  "summary": "Как коммутаторы, точки доступа и IP-телефоны обмениваются объявлениями о порте, адресе управления, Voice VLAN и PoE по IEEE 802.1AB в стандартном режиме Nearest Bridge, и как корректно интерпретировать TLV.",
  "terms": [
    "LLDP",
    "LLDP-MED",
    "CDP",
    "TLV",
    "Voice VLAN",
    "PoE",
    "VLAN"
  ],
  "blocks": [
    {
      "heading": "Зачем нужен LLDP и как работает зона Nearest Bridge",
      "body": "Когда перед вами стойка с десятками патч-кордов, нужно быстро понять, какое устройство объявляет себя на другом конце кабеля, какой у него идентификатор порта и какой адрес управления оно сообщает.\n\nЭту задачу решает открытый стандарт LLDP (Link Layer Discovery Protocol, IEEE 802.1AB). В стандартном режиме Nearest Bridge устройства отправляют служебные L2-кадры на групповой MAC-адрес 01:80:C2:00:00:0E: стандартный мост (коммутатор) обязан принять такой кадр и не пересылать его дальше в другие порты, поэтому запись обычно описывает соседа на локальном звене (1 хоп). Однако это не безусловная гарантия: при использовании других scope-адресов, L2-туннелей/relay или нестандартных промежуточных устройств границы видимости нужно проверять отдельно. Кроме того, запись LLDP — это полученное объявление, а не доказательство физической топологии или подлинности соседа.",
      "cheatsheet": {
        "file": "l3-lldp-neighbors-flow.svg",
        "title": "LLDP и LLDP-MED: обмен TLV в режиме Nearest Bridge (1 хоп)",
        "alt": "Схема обмена LLDPDU между коммутатором и IP-телефоном (Voice VLAN, PoE, Chassis ID, Port ID, TTL) с указанием, что кадры не пересылаются за телефон на ПК.",
        "note": "LLDP работает на L2 без настроенного IP-адреса — это делает его незаменимым при первичной диагностике «глухого» линка."
      },
      "cheatsheetInitiallyOpen": true
    },
    {
      "heading": "LLDP против CDP: стандарт против проприетарного протокола",
      "body": "У Cisco исторически используется собственный протокол CDP (Cisco Discovery Protocol). Он решает ту же задачу, но по умолчанию работает только между устройствами Cisco (и частью совместимых устройств).\n\nВ реальных мультивендорных сетях (например, коммутатор Cisco + точка доступа Aruba/Ubiquiti + IP-телефон Yealink + сервер Linux) используют открытый стандарт LLDP. На многих коммутаторах LLDP по умолчанию выключен — его нужно включать явно."
    },
    {
      "heading": "Как читать запись LLDP: Port ID, Port Description и Management Address",
      "body": "В выводе LLDP часто путают два похожих поля: **Port ID** и **Port Description**. Разберём конкретный пример объявления соседа:\n• `Port ID (subtype: locally assigned) = uplink-17` — это официальный идентификатор порта в LLDP, назначенный локально администратором или ОС;\n• `Port Description = Gi1/0/8` — это свободное текстовое описание (комментарий), а не главный идентификатор порта;\n• `Management Address = 192.0.2.17` — это IP-адрес, который сосед сам объявил для управления.\n\nВажная граница доверия: факт получения `Management Address = 192.0.2.17` по LLDP НЕ доказывает, что этот IP действительно доступен по сети (его нужно отдельно проверить ping/SNMP/SSH по политике), и LLDP сам по себе не аутентифицирует устройство — поля объявления можно подделать."
    },
    {
      "heading": "LLDP-MED: автоматическая настройка IP-телефонов и PoE",
      "body": "Расширение LLDP-MED (Media Endpoint Discovery) создано специально для конечных устройств вроде IP-телефонов и видеокамер. Через LLDP-MED коммутатор автоматически сообщает телефону:\n• какой Voice VLAN использовать для голосового трафика;\n• какие метки приоритета QoS (DSCP / CoS) ставить на голос;\n• какую мощность PoE готов выделить порт (совместно с IEEE 802.3 Power-via-MDI).\n\nЕсли на порту доступа выключен LLDP, IP-телефон может загрузиться в обычном Data VLAN вместо Voice VLAN, не получить нужный DHCP-сервер телефонии и не зарегистрироваться на АТС.",
      "relatedLesson": {
        "id": "l1-poe-budget",
        "label": "Посмотреть роль LLDP Power-via-MDI в согласовании PoE"
      }
    },
    {
      "heading": "Безопасность: где LLDP стоит выключать",
      "body": "Объявления LLDP раскрывают модель оборудования, версию прошивки, имя коммутатора, номер порта и адрес управления. Внутри инфраструктуры (между коммутаторами, к точкам доступа и телефонам) это полезно для диагностики, но на внешних или недоверенных пользовательских портах передачу (TX) часто отключают, чтобы не отдавать лишнюю информацию о сети."
    }
  ],
  "professional": {
    "summary": "IEEE 802.1AB (EtherType 0x88CC, 01:80:C2:00:00:0E), обязательные и организационные TLV, LLDP-MED (Network Policy, Extended Power-via-MDI), диагностика несовпадения TX/RX и асимметрии.",
    "terms": [
      "LLDP",
      "LLDP-MED",
      "CDP",
      "TLV",
      "Voice VLAN",
      "PoE",
      "DSCP",
      "MTU"
    ],
    "blocks": [
      {
        "heading": "Формат LLDPDU: обязательные TLV и таймеры",
        "body": "Кадр LLDP передаётся на L2 с EtherType 0x88CC на Nearest Bridge MAC 01:80:C2:00:00:0E. Каждый LLDPDU обязан начинаться с трёх TLV (Type-Length-Value) в строгом порядке: Chassis ID TLV, Port ID TLV и Time To Live (TTL) TLV, и завершаться End of LLDPDU TLV.\n\nТиповой интервал отправки — 30 секунд, TTL (holdtime) — 120 секунд. Если сосед перестал слать кадры, запись держится до истечения TTL (если линк не упал физически); при корректном отключении LLDP устройство отправляет кадр с TTL=0 для немедленного удаления записи.",
        "cheatsheet": {
          "file": "l3-lldp-neighbors-flow.svg",
          "title": "Структура LLDPDU и границы распространения на 1 хоп",
          "alt": "Схема обязательных TLV (Chassis ID, Port ID, TTL), опциональных/MED TLV и блокировки транзита LLDP-кадров дальше одного соседа.",
          "note": "Отделяй IEEE 802.3 Organizationally Specific TLV (Power-via-MDI) от расширений TIA-1057 LLDP-MED."
        },
        "cheatsheetInitiallyOpen": true
      },
      {
        "heading": "Разбор TLV на примере Port ID (locally assigned), Port Description и Management Address",
        "body": "В практической диагностике (`review-lldp-7`) критично точно различать семантику обязательных и опциональных TLV. Рассмотрим полученный LLDPDU: `Port ID, subtype locally assigned = uplink-17`; `Port Description = Gi1/0/8`; `Management Address = 192.0.2.17`:\n1. **Port ID TLV** (обязательный, Type 2) несёт именно `uplink-17` с подтипом `locally assigned` (subtype 7 — произвольная локальная строка, не обязательно совпадающая с именем физического интерфейса).\n2. **Port Description TLV** (опциональный, Type 4) содержит `Gi1/0/8` — это человекочитаемое описание, которое нельзя подменять вместо Port ID при сопоставлении портов.\n3. **Management Address TLV** (опциональный, Type 8) лишь декларирует адрес `192.0.2.17`: он НЕ подтверждает L3-достижимость (reachability), наличие маршрута или открытых сервисов управления — доступность проверяется отдельно (ping/SNMP/SSH в рамках политики).\n4. **Отсутствие аутентификации:** IEEE 802.1AB не содержит криптографической подписи; LLDP-запись — это самозаявленные данные соседа, которые нельзя считать доказательством подлинности устройства."
      },
      {
        "heading": "LLDP-MED (ANSI/TIA-1057): Network Policy и Power Management",
        "body": "LLDP-MED добавляет специализированные TLV для VoIP и медиа-устройств: Capabilities, Network Policy (Voice VLAN ID, tagged/untagged, L2 Priority/CoS, DSCP), Extended Power-via-MDI (запрос мощности с шагом 0,1 Вт, приоритет, источник питания) и Inventory.\n\nВажно отличать два механизма: для IP-телефонов часто используется LLDP-MED Network Policy (выдача Voice VLAN), тогда как для согласования мощности IEEE 802.3at/bt Type 2–4 базовым стандартом является IEEE 802.3 LLDP Power-via-MDI TLV."
      },
      {
        "heading": "Кейс 1. IP-телефон получил адрес из Data VLAN вместо Voice VLAN",
        "body": "Симптом: к порту коммутатора подключён IP-телефон (не Cisco), линк 1G есть, PoE подано, но телефон получает IP из офисной подсети ПК и не видит SIP-сервер.\n\nДиагностика (read-only): на совместимых Cisco IOS/IOS XE проверь `show lldp`, `show lldp interface <port>` (активны ли оба направления Tx и Rx) и `show lldp neighbors <port> detail` (приходят ли MED-TLV от телефона и отправляется ли Network Policy с нужным Voice VLAN). На других платформах используй штатные команды просмотра LLDP (`show lldp neighbors detail`, `display lldp neighbor-information`).\n\nТиповая причина: на порту настроен `switchport voice vlan`, но глобально `lldp run` выключен (а телефон не понимает CDP).",
        "relatedLesson": {
          "id": "cli-poe-diagnostics",
          "label": "Открыть CLI-диагностику PoE и LLDP на коммутаторе"
        }
      },
      {
        "heading": "Кейс 2. Асимметричная видимость: Switch A видит Switch B, а Switch B — нет",
        "body": "Симптом: на Switch A сосед виден в `show lldp neighbors`, а на Switch B таблица на этом порту пуста.\n\nРазбор направлений (чтобы не перепутать TX и RX):\n• Подтверждено: `Switch B TX → Switch A RX` работает исправно (иначе A не видел бы B).\n• Не работает обратное направление: проверь **`Switch A TX`** (не отключена ли передача на A) и **`Switch B RX`** (не отключён ли приём на B).\n\nДополнительно проверь, нет ли между ними промежуточного устройства/медиаконвертера, перехватывающего кадры `01:80:C2:00:00:0E` в одном из направлений."
      }
    ],
    "commands": [
      {
        "title": "Краткая таблица соседей LLDP (Cisco IOS/IOS XE)",
        "cmd": "show lldp neighbors",
        "note": "Показывает Device ID, Local Intf, Hold-time, Capability и Port ID."
      },
      {
        "title": "Детальные TLV, Voice VLAN и PoE (Cisco IOS/IOS XE)",
        "cmd": "show lldp neighbors <interface> detail",
        "note": "Проверяй Management Address, MED Capabilities, Network Policy и Power-via-MDI."
      },
      {
        "title": "Проверка TX/RX на порту (Cisco IOS/IOS XE)",
        "cmd": "show lldp interface <interface>",
        "note": "На Linux-хостах с lldpd используется `lldpcli show neighbors`."
      }
    ],
    "sources": [
      "IEEE Std 802.1AB — Station and Media Access Control Connectivity Discovery (LLDP)",
      "ANSI/TIA-1057 — Link Layer Discovery Protocol for Media Endpoint Devices (LLDP-MED)"
    ]
  },
  "relatedQuestionIds": [
    "review-lldp-7"
  ],
  "plainKnowledgeCheck": {
    "title": "Проверь себя: LLDP — простыми словами",
    "intro": "Три вопроса по основам LLDP и LLDP-MED.",
    "questions": [
      {
        "id": "l3-lldp-plain-01",
        "prompt": "Какие устройства обычно отображаются в таблице соседей LLDP на стандартном коммутаторе в режиме Nearest Bridge (01:80:C2:00:00:0E)?",
        "choices": [
          {
            "id": "A",
            "label": "Все маршрутизаторы во всей корпоративной сети"
          },
          {
            "id": "B",
            "label": "Только устройства одного производителя"
          },
          {
            "id": "C",
            "label": "Только устройства с настроенным DNS-именем"
          },
          {
            "id": "D",
            "label": "Соседи на локальном звене (1 хоп), так как стандартный мост в режиме Nearest Bridge не пересылает этот кадр дальше"
          }
        ],
        "correctChoiceId": "D",
        "explanation": "В стандартном режиме Nearest Bridge адрес 01:80:C2:00:00:0E не пересылается соответствующим мостом дальше одного звена; при иных scope, relay/tunnel или нестандартных устройствах границы видимости проверяются отдельно."
      },
      {
        "id": "l3-lldp-plain-02",
        "prompt": "Зачем на порту доступа с IP-телефоном другого производителя (не Cisco) включают LLDP / LLDP-MED?",
        "choices": [
          {
            "id": "A",
            "label": "Чтобы заменить протокол DHCP и выдать телефону IP-адрес"
          },
          {
            "id": "B",
            "label": "Чтобы объединить два кабеля в LACP"
          },
          {
            "id": "C",
            "label": "Чтобы телефон автоматически получил Voice VLAN, параметры QoS и согласовал питание PoE"
          },
          {
            "id": "D",
            "label": "Чтобы зашифровать голосовой трафик"
          }
        ],
        "correctChoiceId": "C",
        "explanation": "LLDP-MED передаёт телефону Voice VLAN, приоритет QoS и параметры PoE в открытом мультивендорном формате; IP-адрес телефон всё равно получает по DHCP (или статически)."
      },
      {
        "id": "l3-lldp-plain-03",
        "prompt": "Почему на недоверенных внешних портах передачу (TX) LLDP часто отключают?",
        "choices": [
          {
            "id": "A",
            "label": "LLDP раскрывает имя устройства, модель, версию прошивки, номер порта и адрес управления"
          },
          {
            "id": "B",
            "label": "LLDP снижает скорость порта до 10 Мбит/с"
          },
          {
            "id": "C",
            "label": "LLDP вызывает петли L2"
          },
          {
            "id": "D",
            "label": "LLDP блокирует прохождение HTTPS"
          }
        ],
        "correctChoiceId": "A",
        "explanation": "Служебные объявления LLDP полезны внутри сети, но на недоверенных портах передают злоумышленнику подробную инвентарную информацию."
      }
    ]
  },
  "knowledgeCheck": {
    "title": "Проверь себя: LLDP и LLDP-MED — по делу",
    "intro": "Четыре инженерных сценария по IEEE 802.1AB и диагностике.",
    "questions": [
      {
        "id": "l3-lldp-pro-01",
        "prompt": "Какие три TLV обязаны присутствовать в начале каждого корректного кадра LLDPDU по IEEE 802.1AB?",
        "choices": [
          {
            "id": "A",
            "label": "System Name, Management Address, Voice VLAN"
          },
          {
            "id": "B",
            "label": "Chassis ID, Port ID, Time To Live (TTL)"
          },
          {
            "id": "C",
            "label": "IP Address, Subnet Mask, Default Gateway"
          },
          {
            "id": "D",
            "label": "Power-via-MDI, DSCP, MAC-таблица"
          }
        ],
        "correctChoiceId": "B",
        "explanation": "По IEEE 802.1AB обязательны Chassis ID TLV, Port ID TLV, TTL TLV и завершающий End of LLDPDU TLV; остальные TLV опциональны."
      },
      {
        "id": "l3-lldp-pro-02",
        "prompt": "IP-телефон Yealink подключён к порту Cisco со строкой `switchport voice vlan 20`, но получает IP из Data VLAN 10. CDP работает, а `show lldp` показывает, что LLDP не запущен. Что является наиболее вероятной причиной?",
        "choices": [
          {
            "id": "A",
            "label": "Телефон не поддерживает проприетарный CDP и не получает Network Policy (Voice VLAN 20) без включённого LLDP / LLDP-MED"
          },
          {
            "id": "B",
            "label": "На порту нужно поменять обжим с T568B на T568A"
          },
          {
            "id": "C",
            "label": "Voice VLAN 20 нельзя использовать на скорости 1 Гбит/с"
          },
          {
            "id": "D",
            "label": "LLDP работает только поверх TCP"
          }
        ],
        "correctChoiceId": "A",
        "explanation": "Устройства других производителей опираются на открытый LLDP-MED Network Policy; без включённого LLDP на коммутаторе телефон остаётся в untagged Data VLAN."
      },
      {
        "id": "l3-lldp-pro-03",
        "prompt": "Switch A видит Switch B в `show lldp neighbors`, но на Switch B запись о Switch A отсутствует. Какая конфигурационная причина наиболее вероятна?",
        "choices": [
          {
            "id": "A",
            "label": "У коммутаторов разные IP-адреса управления"
          },
          {
            "id": "B",
            "label": "Между коммутаторами настроен OSPF"
          },
          {
            "id": "C",
            "label": "TTL равен 120 секундам"
          },
          {
            "id": "D",
            "label": "На порту Switch A отключена передача LLDP (TX) либо на порту Switch B отключён приём LLDP (RX)"
          }
        ],
        "correctChoiceId": "D",
        "explanation": "Раз A видит B, направление B TX → A RX уже подтверждено. Односторонняя видимость означает проблему на обратном пути: нужно проверить A TX и B RX."
      },
      {
        "id": "l3-lldp-pro-04",
        "prompt": "Почему кадр LLDP от IP-телефона не доходит до ПК, подключённого ко второму (PC) порту этого же телефона, как транзитный кадр коммутатора?",
        "choices": [
          {
            "id": "A",
            "label": "ПК не умеют принимать кадры Ethernet"
          },
          {
            "id": "B",
            "label": "LLDP шифруется ключом коммутатора"
          },
          {
            "id": "C",
            "label": "Адрес назначения 01:80:C2:00:00:0E зарезервирован для ближайшего моста (Nearest Bridge) и не подлежит пересылке дальше одного хопа"
          },
          {
            "id": "D",
            "label": "Кадр LLDP превышает MTU 1500 байт"
          }
        ],
        "correctChoiceId": "C",
        "explanation": "Стандарт IEEE 802.1D / 802.1AB запрещает мостам пересылать кадры с адресом 01:80:C2:00:00:0E, ограничивая зону действия одним физическим звеном."
      }
    ]
  },
  "sources": [
    "IEEE Std 802.1AB — LLDP",
    "ANSI/TIA-1057 — LLDP-MED"
  ]
};
