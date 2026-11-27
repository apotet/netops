import type { Lesson } from './types';

export const LESSON_L3_TUNNELS_GRE_VXLAN: Lesson = {
  "id": "l3-tunnels-gre-vxlan",
  "title": "Сетевые туннели и оверлеи: GRE и VXLAN",
  "category": "L3 · Туннели и оверлеи",
  "osiLayers": [
    "L2",
    "L3"
  ],
  "difficulty": "applied",
  "summary": "Расчёт внутреннего MTU в GRE over IPv4 без опций (1476 байт при path MTU 1500) и изоляция арендаторов с перекрывающимися MAC и IP в VXLAN по 24-битному VNI.",
  "terms": [
    "GRE",
    "VXLAN",
    "VTEP",
    "VNI",
    "MTU",
    "UDP",
    "VLAN"
  ],
  "blocks": [
    {
      "heading": "Зачем нужны GRE и VXLAN: L3-over-L3 против L2-over-L3",
      "body": "Туннелирование упаковывает исходный пакет или кадр во внешние заголовки, чтобы провести его через транзитную IP-сеть (underlay).\n• **GRE (RFC 2784)** переносит L3-пакеты (например, внутренний IPv4) поверх внешнего IP (Protocol 47).\n• **VXLAN (RFC 7348)** переносит целый **L2 Ethernet-кадр** поверх UDP/IP (Dst Port 4789), позволяя строить до 16,7 млн виртуальных L2-сегментов поверх L3-фабрики.",
      "cheatsheet": {
        "file": "l3-tunnels-gre-vxlan-headers.svg",
        "title": "Инкапсуляция GRE (1476 байт) и VXLAN (VTEP, UDP/4789, 24-битный VNI)",
        "alt": "Сравнение стеков заголовков GRE (Outer IPv4 20B + GRE 4B + Inner IP 1476B = 1500B) и VXLAN (Outer IP + UDP 4789 + VXLAN 8B с VNI для изоляции двух арендаторов).",
        "note": "Ни GRE, ни VXLAN не шифруют трафик по умолчанию — для конфиденциальности их комбинируют с IPsec или MACsec."
      },
      "cheatsheetInitiallyOpen": true
    },
    {
      "heading": "Точный расчёт GRE: почему максимум 1476 байт при MTU 1500",
      "body": "Если базовый GRE (без опциональных полей checksum/key/sequence) переносит целый внутренний IPv4-пакет через путь с MTU **1500 байт**, считаем overhead:\n• внешний заголовок IPv4 = **20 байт**;\n• базовый заголовок GRE = **4 байта**;\n• итого внешние заголовки = **24 байта**.\n\nМаксимальная длина внутреннего IPv4-пакета без фрагментации внешнего пакета: **`1500 − 20 − 4 = 1476 байт`**.",
      "relatedLesson": {
        "id": "tcpip-encapsulation",
        "label": "Повторить основы инкапсуляции и заголовков TCP/IP"
      }
    },
    {
      "heading": "Как VXLAN разделяет арендаторов с одинаковыми MAC и IP на одном VTEP",
      "body": "Один принимающий **VTEP** (VXLAN Tunnel Endpoint) может обслуживать двух арендаторов, которым разрешены одинаковые внутренние IP-подсети и даже повторяющиеся MAC-адреса. При этом внешний IP-адрес VTEP и внешний порт назначения **UDP/4789** у них тоже общие.\n\nПоэтому после декапсуляции единственным ключом для выбора изолированного виртуального L2-сегмента является **24-битный VNI (VXLAN Network Identifier)** в заголовке VXLAN.",
      "relatedLesson": {
        "id": "l2-vlan",
        "label": "Сравнить 24-битный VNI с классическим 12-битным VLAN ID"
      }
    }
  ],
  "professional": {
    "summary": "GRE (RFC 2784, overhead 24 B, Tunnel MTU 1476, recursive routing) и VXLAN (RFC 7348, MAC-in-UDP/4789, 24-bit VNI, ECMP entropy и проектирование underlay MTU без фрагментации).",
    "terms": [
      "GRE",
      "VXLAN",
      "VTEP",
      "VNI",
      "MTU",
      "UDP",
      "VLAN"
    ],
    "blocks": [
      {
        "heading": "GRE (RFC 2784): overhead 24 байта, расчёт 1476 байт и контроль рекурсии",
        "body": "В базовом GRE over IPv4 (`gap-pack3-04`, IP Protocol 47, без дополнительных полей и упаковок) внешний IPv4 занимает 20 байт, а заголовок GRE — 4 байта. Чтобы внешний пакет уложился в path MTU 1500 без фрагментации, максимальная длина внутреннего IP-пакета на туннеле равна **`1476 байт`** (при этом базовый TCP MSS без опций составит 1436 байт).\n\nПри запуске динамической маршрутизации поверх GRE обязательно следи, чтобы маршрут к внешнему `tunnel destination` не стал изучаться через сам туннель (рекурсивная маршрутизация, ведущая к падению интерфейса — решается отдельным underlay-маршрутом или Front-Door VRF).",
        "cheatsheet": {
          "file": "l3-tunnels-gre-vxlan-headers.svg",
          "title": "Заголовки GRE (24 B overhead) и VXLAN (50 B overhead + VNI)",
          "alt": "Структура пакетов GRE и VXLAN и демультиплексирование арендаторов по VNI на VTEP.",
          "note": "Подбирай underlay MTU по фактическому overhead либо уменьшай tenant MTU — проверяй path MTU на всём пути."
        },
        "cheatsheetInitiallyOpen": true
      },
      {
        "heading": "VXLAN (RFC 7348): изоляция по VNI, ECMP-энтропия и проектирование MTU",
        "body": "VXLAN упаковывает внутренний Ethernet-кадр в UDP/IP (`Outer IPv4 20 B + UDP 8 B + VXLAN 8 B + Inner Eth 14 B = 50 B` overhead относительно внутреннего IP при IPv4-underlay без внутреннего 802.1Q).\n\n**Выбор сегмента (`gap-pack3-05`):** внешний IP VTEP и порт назначения `UDP/4789` общие, а внутренние MAC и IP разных арендаторов могут перекрываться. Изолированный виртуальный L2-сегмент после декапсуляции определяется исключительно по **24-битному `VNI`** из заголовка VXLAN.\n\n**ECMP и MTU:**\n• **Outer UDP Source Port** вычисляется как хеш доступных полей внутреннего кадра/пакета (например, inner Ethernet/IP/transport заголовков при их наличии) исключительно для балансировки по ECMP в L3-фабрике, а не для идентификации арендатора.\n• **Проектирование MTU:** underlay должен обеспечивать требуемый path MTU с учётом фактического overhead, либо tenant MTU должен быть уменьшен. Включение Jumbo Frames в underlay — распространённый способ сохранить tenant MTU 1500, но не универсальная обязанность (и не обязательно 9000). Сеть следует проектировать так, чтобы избежать фрагментации: VTEP её не выполняет, а транзитная фрагментация внешнего IPv4-пакета может привести к отбрасыванию на принимающем VTEP."
      }
    ],
    "commands": [
      {
        "title": "Настройка и проверка GRE Tunnel MTU (Cisco IOS / IOS-XE — пример)",
        "cmd": "interface Tunnel0\n ip mtu 1476\n ip tcp adjust-mss 1436\nshow interface Tunnel0",
        "note": "Проверь фактический синтаксис и path MTU на целевой версии IOS/IOS-XE."
      },
      {
        "title": "Просмотр GRE и VXLAN (Linux iproute2)",
        "cmd": "ip -d link show type gre\nip -d link show type vxlan",
        "note": "Показывает локальный/удалённый IP, MTU, VNI (`id`) и `dstport 4789`."
      },
      {
        "title": "Проверка VXLAN на Arista EOS (отдельная платформа)",
        "cmd": "show interface Vxlan1",
        "note": "Показывает привязку VLAN ↔ VNI и источник VTEP; синтаксис сверяй с целевой версией EOS."
      },
      {
        "title": "Проверка VXLAN на Cisco NX-OS (отдельная платформа)",
        "cmd": "show nve vni",
        "note": "Показывает таблицу VNI и состояние NVE-интерфейса; синтаксис сверяй с целевой версией NX-OS."
      }
    ],
    "sources": [
      "RFC 2784 — Generic Routing Encapsulation (GRE)",
      "RFC 7348 — Virtual eXtensible Local Area Network (VXLAN)"
    ]
  },
  "relatedQuestionIds": [
    "gap-pack3-04",
    "gap-pack3-05"
  ],
  "plainKnowledgeCheck": {
    "title": "Проверь себя: GRE и VXLAN — простыми словами",
    "intro": "Три вопроса по overhead GRE и изоляции по VNI в VXLAN.",
    "questions": [
      {
        "id": "l3-tun-plain-01",
        "prompt": "Какую максимальную длину внутреннего IPv4-пакета можно пустить в базовый GRE (20 Б внешний IPv4 + 4 Б GRE, без опций) при path MTU 1500 байт без фрагментации?",
        "choices": [
          {
            "id": "A",
            "label": "1476 байт"
          },
          {
            "id": "B",
            "label": "1500 байт"
          },
          {
            "id": "C",
            "label": "1480 байт"
          },
          {
            "id": "D",
            "label": "1456 байт"
          }
        ],
        "correctChoiceId": "A",
        "explanation": "1500 − 20 (внешний IPv4) − 4 (базовый GRE) = 1476 байт."
      },
      {
        "id": "l3-tun-plain-02",
        "prompt": "Почему VTEP не может разделять двух арендаторов VXLAN с одинаковыми внутренними MAC/IP по внешнему порту назначения UDP?",
        "choices": [
          {
            "id": "A",
            "label": "Потому что VXLAN работает поверх TCP"
          },
          {
            "id": "B",
            "label": "Потому что VXLAN не использует внешние заголовки IP/UDP"
          },
          {
            "id": "C",
            "label": "Потому что UDP-порт шифруется внутри VXLAN"
          },
          {
            "id": "D",
            "label": "Потому что внешний порт назначения UDP/4789 общий для всех VXLAN-сегментов на VTEP; сегмент определяет VNI"
          }
        ],
        "correctChoiceId": "D",
        "explanation": "Все VXLAN-пакеты приходят на общий порт назначения UDP/4789, а виртуальный L2-сегмент задаётся 24-битным VNI."
      },
      {
        "id": "l3-tun-plain-03",
        "prompt": "Обеспечивают ли базовые GRE и VXLAN шифрование передаваемого трафика по умолчанию?",
        "choices": [
          {
            "id": "A",
            "label": "Да: VXLAN всегда шифрует трафик по AES-256"
          },
          {
            "id": "B",
            "label": "Нет: оба протокола выполняют инкапсуляцию без шифрования; для защиты данных нужен IPsec или MACsec"
          },
          {
            "id": "C",
            "label": "Да: GRE шифрует трафик автоматически при MTU 1476"
          },
          {
            "id": "D",
            "label": "Только если включены Jumbo Frames"
          }
        ],
        "correctChoiceId": "B",
        "explanation": "GRE и VXLAN отвечают за инкапсуляцию и транспорт/изоляцию, но не обеспечивают конфиденциальность без дополнительных механизмов защиты."
      }
    ]
  },
  "knowledgeCheck": {
    "title": "Проверь себя: GRE и VXLAN — по делу",
    "intro": "Четыре инженерных сценария по RFC 2784 и RFC 7348.",
    "questions": [
      {
        "id": "l3-tun-pro-01",
        "prompt": "GRE переносит целый внутренний IPv4-пакет через путь с MTU 1500 байт (внешний IPv4 = 20 Б, GRE = 4 Б, без опций). Какую максимальную длину внутреннего IP-пакета разрешить на туннеле?",
        "choices": [
          {
            "id": "A",
            "label": "1500 байт"
          },
          {
            "id": "B",
            "label": "1480 байт"
          },
          {
            "id": "C",
            "label": "1476 байт"
          },
          {
            "id": "D",
            "label": "1456 байт"
          }
        ],
        "correctChoiceId": "C",
        "explanation": "При базовом overhead 24 байта максимальный внутренний IP-пакет без фрагментации внешнего равен 1500 − 24 = 1476 байт."
      },
      {
        "id": "l3-tun-pro-02",
        "prompt": "Один VTEP принимает VXLAN-трафик двух арендаторов с перекрывающимися внутренними IP и повторяющимися MAC-адресами. Какой ключ использовать после декапсуляции для выбора изолированного L2-сегмента?",
        "choices": [
          {
            "id": "A",
            "label": "MAC назначения из внутреннего Ethernet-кадра"
          },
          {
            "id": "B",
            "label": "VNI из заголовка VXLAN"
          },
          {
            "id": "C",
            "label": "UDP-порт назначения из внешнего UDP-заголовка"
          },
          {
            "id": "D",
            "label": "IP назначения из внешнего IP-заголовка"
          }
        ],
        "correctChoiceId": "B",
        "explanation": "Внешние IP и UDP/4789 общие, а внутренние MAC/IP перекрываются; изолированный L2-сегмент однозначно определяется по 24-битному VNI."
      },
      {
        "id": "l3-tun-pro-03",
        "prompt": "Зачем VTEP вычисляет Outer UDP Source Port как хеш доступных полей внутреннего кадра/пакета?",
        "choices": [
          {
            "id": "A",
            "label": "Чтобы дать L3-фабрике энтропию для балансировки потоков по ECMP (а не для идентификации арендатора)"
          },
          {
            "id": "B",
            "label": "Чтобы заменить 24-битный VNI"
          },
          {
            "id": "C",
            "label": "Чтобы включить шифрование VXLAN"
          },
          {
            "id": "D",
            "label": "Чтобы разрешить фрагментацию внутри VTEP"
          }
        ],
        "correctChoiceId": "A",
        "explanation": "RFC 7348 рекомендует формировать Outer UDP Source Port на основе хеша доступных полей внутреннего кадра/пакета для равномерного распределения по ECMP."
      },
      {
        "id": "l3-tun-pro-04",
        "prompt": "Какое утверждение о MTU в VXLAN-фабрике наиболее точно соответствует RFC 7348?",
        "choices": [
          {
            "id": "A",
            "label": "На всех линках ЦОД строго обязателен MTU 9216, иначе VXLAN не запустится"
          },
          {
            "id": "B",
            "label": "VTEP всегда фрагментирует VXLAN-пакеты сам при любом MTU"
          },
          {
            "id": "C",
            "label": "VXLAN не добавляет накладных расходов к размеру пакета"
          },
          {
            "id": "D",
            "label": "Underlay должен обеспечивать достаточный path MTU с учётом overhead либо tenant MTU должен быть уменьшен; сеть проектируют так, чтобы избежать фрагментации"
          }
        ],
        "correctChoiceId": "D",
        "explanation": "Jumbo Frames — распространённый способ сохранить tenant MTU 1500, но не универсальная обязанность; главное — согласовать underlay/tenant MTU и избегать фрагментации."
      }
    ]
  },
  "sources": [
    "RFC 2784 — GRE",
    "RFC 7348 — VXLAN"
  ]
};
