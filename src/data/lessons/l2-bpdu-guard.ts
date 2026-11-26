import type { Lesson } from './types';

export const LESSON_L2_BPDU_GUARD: Lesson = {
  "id": "l2-bpdu-guard",
  "title": "BPDU Guard и Root Guard: защита топологии STP",
  "category": "L2 · STP",
  "osiLayers": [
    "L2"
  ],
  "difficulty": "applied",
  "summary": "Как защитить пользовательскую розетку от неожиданного коммутатора и сохранить запланированное положение корня STP, не путая эти задачи с потерей BPDU.",
  "terms": [
    "BPDU Guard",
    "Root Guard",
    "err-disable",
    "Loop Guard",
    "PortFast"
  ],
  "blocks": [
    {
      "heading": "За розеткой ожидали компьютер, а появился мост",
      "body": "BPDU — служебное сообщение коммутатора о дереве STP. Если на порту для конечного устройства неожиданно появляется такой обмен, подключение уже не соответствует исходному проекту.\n\nBPDU Guard на защищённом порту реагирует на получение BPDU и обычно переводит интерфейс в err-disabled. Неважно, лучше или хуже объявленный путь: задача — обнаружить само неожиданное участие моста."
    },
    {
      "heading": "Не дать корню прийти с неверной стороны",
      "body": "На подключении к нижестоящему или чужому коммутатору BPDU могут быть штатными. Здесь полное отключение при первом сообщении не подходит: нужно лишь не допустить более предпочтительный корень через эту границу.\n\nRoot Guard реагирует на superior BPDU и блокирует затронутое дерево в root-inconsistent. Он защищает конкретное направление, а не запрещает все возможные смены корня в сети. Его не ставят на ожидаемый рабочий путь к корню."
    },
    {
      "heading": "Не смешивать с Loop Guard",
      "body": "Loop Guard нужен там, где сообщения от соседнего моста ожидаются, но внезапно перестали приходить при поднятом линке. Такая потеря не должна открыть лишний путь из-за старения информации STP.\n\nBPDU Guard реагирует на появление BPDU, Root Guard — на превосходящую информацию, Loop Guard — на исчезновение ожидаемой. Выбор защиты зависит от роли подключения, а не только от того, что порт физически поднят."
    },
    {
      "heading": "Восстанавливать после поиска причины",
      "body": "При err-disabled сначала проверяют, кто подключён и почему появился BPDU. Затем устраняют причину и используют предусмотренное восстановление. Повторное включение без изменений может сразу отключить порт снова.\n\nRoot-inconsistent — другое состояние: после прекращения превосходящих сообщений и старения информации возможен автоматический возврат к обычному STP. Это не обещание обязательной пересылки: конечная роль определяется деревом."
    }
  ],
  "commands": [
    {
      "title": "Защитно отключённые интерфейсы",
      "cmd": "show interfaces status err-disabled"
    },
    {
      "title": "Состояния inconsistent",
      "cmd": "show spanning-tree inconsistentports"
    },
    {
      "title": "Детали STP на подключении",
      "cmd": "show spanning-tree interface GigabitEthernet0/1 detail",
      "note": "Имя интерфейса заменить фактическим."
    }
  ],
  "relatedQuestionIds": [],
  "sources": [
    "Network_history_NFA — переработка материала BPDU Guard и Root Guard: https://t.me/Network_history_NFA/370",
    "Cisco Catalyst IOS — Optional Spanning-Tree Features; BPDU Guard, Root Guard, Loop Guard and errdisable recovery"
  ],
  "professional": {
    "summary": "Cisco STP guards: область интерфейсного и глобального BPDU Guard, Root Guard на Designated-границе, Loop Guard на ожидающих BPDU портах и cause-specific errdisable recovery.",
    "terms": [
      "BPDU Guard",
      "Root Guard",
      "err-disable",
      "Loop Guard",
      "PortFast"
    ],
    "blocks": [
      {
        "heading": "BPDU Guard на edge-подключении",
        "body": "Для Catalyst BPDU Guard обычно применяют вместе с PortFast на подключениях конечных устройств. Интерфейсное bpduguard enable реагирует на BPDU независимо от superior/inferior информации. Глобальная PortFast BPDU Guard policy ограничена соответствующей областью PortFast и не должна смешиваться с интерфейсной настройкой.\n\nPortFast сам по себе не означает подавление BPDU или аутентификацию устройства. BPDU Filter также не эквивалентен Guard: подавление служебного обмена может скрыть петлю вместо защитного отключения."
      },
      {
        "heading": "Root Guard и область root-inconsistent",
        "body": "Root Guard используют на ожидаемом Designated-подключении, через которое не должен выбираться путь к корню. Superior BPDU приводит к root-inconsistent для затронутой инстанции; это не обязательно физический down всего интерфейса.\n\nПосле прекращения superior information и её старения защита может автоматически снять inconsistent. Размещение на штатном Root-порту противоречит проекту: нормальная лучшая информация будет заблокирована. Принадлежность VLAN дереву и режим STP учитываются отдельно."
      },
      {
        "heading": "Loop Guard не заменяет Root Guard или UDLD",
        "body": "Loop Guard защищает ожидающие BPDU non-designated Root/Alternate-порты от опасного перехода в Designated при потере received information. Соответствующая инстанция удерживается в loop-inconsistent и может восстановиться после возобновления допустимых BPDU.\n\nЭто не обнаружение всех физических односторонних неисправностей и не запрет superior BPDU. UDLD проверяет свой двунаправленный обмен и не заменяет контроль селективной потери именно BPDU. На Catalyst Root Guard и Loop Guard на одном интерфейсе не совмещают."
      },
      {
        "heading": "Err-disable, recovery и диагностика",
        "body": "Различают err-disabled интерфейса, root-inconsistent и loop-inconsistent инстанции. Проверяют логи причины, show interfaces status err-disabled, show spanning-tree inconsistentports и детальный вывод интерфейса.\n\nПосле устранения источника BPDU нарушение BPDU Guard восстанавливают вручную или через настроенное errdisable recovery cause bpduguard с принятым интервалом. Auto-recovery не исправляет топологию и может повторять отключения. Механизмы inconsistent обычно восстанавливаются своей логикой STP, поэтому процедуру err-disable нельзя автоматически переносить на них."
      }
    ],
    "commands": [
      {
        "title": "Защитно отключённые интерфейсы",
        "cmd": "show interfaces status err-disabled"
      },
      {
        "title": "Состояния inconsistent",
        "cmd": "show spanning-tree inconsistentports"
      },
      {
        "title": "Детали STP на подключении",
        "cmd": "show spanning-tree interface GigabitEthernet0/1 detail",
        "note": "Имя интерфейса заменить фактическим."
      }
    ],
    "sources": [
      "Network_history_NFA — переработка материала BPDU Guard и Root Guard: https://t.me/Network_history_NFA/370",
      "Cisco Catalyst IOS — Optional Spanning-Tree Features; BPDU Guard, Root Guard, Loop Guard and errdisable recovery"
    ],
    "sourceCommit": "adapted-network-history-2026-11-13"
  }
};
