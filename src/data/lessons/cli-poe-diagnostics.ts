import type { Lesson } from './types';

/** Platform-scoped Cisco PoE reference; not simulated by CLI Lab. */
export const LESSON_CLI_POE_DIAGNOSTICS: Lesson = {
  "id": "cli-poe-diagnostics",
  "title": "PoE на коммутаторе: команды и диагностика",
  "category": "CLI · Управление оборудованием",
  "osiLayers": [
    "CLI",
    "L1"
  ],
  "difficulty": "applied",
  "summary": "Команды Cisco IOS/IOS XE для проверки PoE: общий бюджет, Class, мощность порта, события, LLDP и переход к тестеру.",
  "terms": [
    "PoE",
    "PSE",
    "PD",
    "Class",
    "LLDP",
    "Available",
    "Used",
    "Remaining"
  ],
  "blocks": [
    {
      "heading": "Первым делом посмотри PoE на коммутаторе",
      "body": "Когда камера не включается, сначала проверь, видит ли PoE-коммутатор устройство (PD) и пытается ли подать питание. На поддерживаемых Cisco IOS/IOS XE используй `show power inline` — это команда просмотра, а не изменения настроек.\n\nНе копируй Cisco-команды в Eltex, Moxa или Siemens: названия и возможности PoE у каждого производителя и модели различаются."
    },
    {
      "heading": "Сколько мощности осталось",
      "body": "В типичной сводке Cisco Available — доступная мощность PoE, Used — уже выделенная мощность, Remaining — незарезервированный остаток. Это не обязательно фактическое потребление камер.\n\nПример: Available 120 Вт, Used 90 Вт, Remaining 30 Вт. Камеру, которой нужно выделить 40 Вт, коммутатор может не запитать даже на порту с максимумом 60 Вт. Проверяй оба лимита."
    },
    {
      "heading": "Проверь порт и сообщения об ошибках",
      "body": "На совместимой Cisco смотри `show power inline GigabitEthernet1/0/7`, где номер порта — пример. Если поддерживается, добавь `detail`. Обрати внимание на состояние питания, обнаружение PD, Class/Type и выделенную мощность.\n\nДалее прочитай `show logging`: ищи отказы питания, перегрузки и ошибки обнаружения. Link up не означает, что PoE-питание включено: устройство могло запитаться от отдельного блока."
    },
    {
      "heading": "Когда нужен тестер",
      "body": "CLI не измеряет потери напряжения на дальнем конце кабеля. Если питание не подаётся или камера перезапускается, сравни работу на коротком исправном восьмижильном патч-корде и проверь линию подходящими PoE- и кабельным тестерами.\n\nОсобенно важно проверить пары, если в кроссе подключены только контакты 1, 2, 3 и 6: путь Alternative B на такой линии отсутствует.",
      "relatedLesson": {
        "id": "l1-poe-screen-reading",
        "label": "Открыть урок «PoE на приборе»"
      }
    }
  ],
  "commands": [
    {
      "title": "Общий PoE-бюджет и состояние портов",
      "cmd": "show power inline",
      "note": "Cisco IOS/IOS XE, поддерживаемые модели; Available, Used, Remaining."
    },
    {
      "title": "Выбранный порт",
      "cmd": "show power inline GigabitEthernet1/0/7",
      "note": "Имя порта — пример. Синтаксис зависит от платформы."
    },
    {
      "title": "Детальный вывод по порту",
      "cmd": "show power inline GigabitEthernet1/0/7 detail",
      "note": "Только если такой синтаксис поддерживается моделью и прошивкой."
    },
    {
      "title": "Системный журнал",
      "cmd": "show logging",
      "note": "Отказы PoE, защита порта, ошибки обнаружения PD."
    },
    {
      "title": "LLDP-соседи",
      "cmd": "show lldp neighbors detail",
      "note": "При наличии LLDP и поддерживаемых TLV питания."
    }
  ],
  "relatedQuestionIds": [],
  "sources": [
    "Cisco Catalyst 9200 IOS XE — show power inline Command Reference",
    "Cisco Catalyst 9400 IOS XE — Configuring Power over Ethernet",
    "Cisco Catalyst 9400 IOS XE — Troubleshooting PoE"
  ],
  "professional": {
    "summary": "Read-only диагностика PSE: show power inline, Class, allocated/remaining, LLDP и журнал отказов; управление приоритетами с учётом платформы.",
    "terms": [
      "PoE",
      "PSE",
      "PD",
      "Class",
      "LLDP",
      "Type",
      "Available",
      "Used",
      "Remaining",
      "Allocated",
      "Utilized",
      "Measured",
      "LLDP Power-via-MDI",
      "power-deny"
    ],
    "blocks": [
      {
        "heading": "Сбор read-only данных с PSE",
        "body": "На поддерживаемых Cisco Catalyst IOS/IOS XE основная команда — `show power inline`: состояния PoE-портов и сводка распределения мощности. Для конкретного интерфейса используют `show power inline GigabitEthernet1/0/7`; форма `detail` зависит от платформы и версии. Проверяй синтаксис через `show power inline ?` и руководство своей модели.\n\nНе считай эти команды универсальными для Eltex, Siemens или Moxa. CLI Lab NetOps пока не симулирует аппаратный PoE и их реальный вывод."
      },
      {
        "heading": "Available / Used / Remaining и резервирование",
        "body": "Available — доступная мощность для PoE в соответствующей области питания; Used или Allocated — выделенная мощность; Remaining — свободный резерв. В отдельных моделях есть Utilized/Measured, позволяющие отдельно оценить фактическую нагрузку. Не путай выделенные ватты по Class с физическим потреблением PD.\n\nСопоставь лимит порта, Type, Class, allocated и общий Remaining. При нехватке оставшегося бюджета устройство может получить power-deny, даже если конкретный порт допускает требуемую мощность."
      },
      {
        "heading": "Состояние порта, LLDP, журналы",
        "body": "Сравни административное и операционное состояние PoE, факт обнаружения PD, Class/Type, allocated и доступные записи о парных наборах Alt A/B у поддерживаемых устройств 802.3bt. При наличии LLDP Power-via-MDI сведения о согласовании могут дополнять аппаратную классификацию, но `show lldp neighbors detail` не гарантирует показ всех PoE-полей.\n\nВ `show logging` ищи события отказа питания, overload, защиту порта и ошибки обнаружения. Ethernet link up не доказывает, что питание выдаётся именно PSE."
      },
      {
        "heading": "Приоритеты и границы безопасного управления",
        "body": "На некоторых Cisco IOS XE приоритет можно задать в конфигурации интерфейса командой `power inline port priority high` или `low`. Это не диагностическая команда, а изменение конфигурации; доступность и эффект зависят от модели. Приоритет не повышает мощность порта и не создаёт новые ватты.\n\nНа работающем объекте сначала собирай `show` и журнал, не выполняй `power inline never`, не перезапускай питание PD и не меняй приоритеты без подтверждённой причины и согласованного плана."
      },
      {
        "heading": "Когда переходить к измерениям на линии",
        "body": "Успешное выделение PoE на PSE не гарантирует требуемого напряжения на стороне PD под нагрузкой. Если камера нестабильна, проверяй кабель, оконцевание, наличие пар, падение напряжения и работу на коротком исправном кабеле. Кабельный и PoE-тестер дополняют CLI, а не заменяются им.",
        "relatedLesson": {
          "id": "l1-poe-screen-reading",
          "label": "Открыть диагностику PoE-тестером"
        }
      }
    ],
    "commands": [
      {
        "title": "Общий PoE-бюджет и состояние портов",
        "cmd": "show power inline",
        "note": "Cisco IOS/IOS XE, поддерживаемые модели; Available, Used, Remaining."
      },
      {
        "title": "Выбранный порт",
        "cmd": "show power inline GigabitEthernet1/0/7",
        "note": "Имя порта — пример. Синтаксис зависит от платформы."
      },
      {
        "title": "Детальный вывод по порту",
        "cmd": "show power inline GigabitEthernet1/0/7 detail",
        "note": "Только если такой синтаксис поддерживается моделью и прошивкой."
      },
      {
        "title": "Системный журнал",
        "cmd": "show logging",
        "note": "Отказы PoE, защита порта, ошибки обнаружения PD."
      },
      {
        "title": "LLDP-соседи",
        "cmd": "show lldp neighbors detail",
        "note": "При наличии LLDP и поддерживаемых TLV питания."
      }
    ],
    "sources": [
      "Cisco Catalyst 9200 IOS XE 26.x — Interface and Hardware Commands",
      "Cisco Catalyst 9400 IOS XE — Configuring Power over Ethernet",
      "Cisco Catalyst 9400 IOS XE — Troubleshooting the Software Configuration"
    ]
  },
  "knowledgeCheck": {
    "title": "Проверь себя: PoE на коммутаторе",
    "intro": "Три ситуации для закрепления, без записи в статистику тестирования.",
    "questions": [
      {
        "id": "cli-poe-q1",
        "prompt": "PoE-порт рассчитан на 60 Вт, но общий Remaining — 30 Вт. Камера запрашивает резерв 40 Вт. Какую причину отказа проверить?",
        "choices": [
          {
            "id": "A",
            "label": "Проблему с размером MTU"
          },
          {
            "id": "B",
            "label": "Недостаток общего PoE-бюджета"
          },
          {
            "id": "C",
            "label": "Несовпадение native VLAN"
          },
          {
            "id": "D",
            "label": "Отсутствие таблицы MAC"
          }
        ],
        "correctChoiceId": "B",
        "explanation": "Максимум порта и общий бюджет — разные ограничения. Оставшихся 30 Вт может не хватить для запроса 40 Вт."
      },
      {
        "id": "cli-poe-q2",
        "prompt": "Ethernet-порт показывает link up, а камера питается от отдельного блока. Что это доказывает?",
        "choices": [
          {
            "id": "A",
            "label": "PoE-питание PSE включено"
          },
          {
            "id": "B",
            "label": "Все 8 жил исправны"
          },
          {
            "id": "C",
            "label": "Только наличие Ethernet-линка, а не PoE"
          },
          {
            "id": "D",
            "label": "Класс PD определён верно"
          }
        ],
        "correctChoiceId": "C",
        "explanation": "Link up может существовать при внешнем питании и на 100BASE-TX даже при четырёх жилах. PoE нужно проверять отдельно."
      },
      {
        "id": "cli-poe-q3",
        "prompt": "После замены PoE-коммутатора камера перестала включаться. Что разумнее сделать первым?",
        "choices": [
          {
            "id": "A",
            "label": "Отключить PoE на порту и снова включить"
          },
          {
            "id": "B",
            "label": "Повысить приоритет сразу всем портам"
          },
          {
            "id": "C",
            "label": "Увеличить скорость порта до 1000 Мбит/с"
          },
          {
            "id": "D",
            "label": "Проверить show power inline, журнал и пары кабеля"
          }
        ],
        "correctChoiceId": "D",
        "explanation": "Сначала зафиксируй состояние PSE, выделение мощности и события отказов, затем проверь распиновку и питание. Не изменяй конфигурацию наугад."
      }
    ]
  }
};
