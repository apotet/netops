import type { Lesson } from './types';

export const LESSON_L2_STP_PROTECTION: Lesson = {
  "id": "l2-stp-protection",
  "title": "STP Advanced: Root Guard, Loop Guard и UDLD",
  "category": "L2 · Коммутация",
  "osiLayers": [
    "L2"
  ],
  "difficulty": "advanced",
  "summary": "Три разных риска: чужой корень, исчезновение BPDU и однонаправленная оптика.",
  "terms": [
    "Root Guard",
    "Loop Guard",
    "UDLD",
    "BPDU",
    "root-inconsistent",
    "loop-inconsistent",
    "err-disabled"
  ],
  "blocks": [
    {
      "heading": "Root Guard: не пускать чужой корень",
      "body": "Когда вниз по сети подключён коммутатор, ему не должны позволять перехватить роль корня. Root Guard на ожидаемом Designated-порту реагирует на superior BPDU, блокируя передачу для затронутой инстанции в root-inconsistent. При прекращении superior BPDU возможно автоматическое восстановление без ручного shutdown/no shutdown."
    },
    {
      "heading": "Loop Guard: не открыть петлю",
      "body": "На резервном non-designated порту отсутствие BPDU ещё не доказывает, что сосед отключён. Если порт внезапно перестанет получать BPDU, обычный STP может пересчитать его роль опасным образом. Loop Guard удерживает такой порт в loop-inconsistent, не давая стать Designated из-за потери служебной информации."
    },
    {
      "heading": "UDLD: что, если оптика только в одну сторону",
      "body": "Один оптический канал может частично перестать передавать сигнал, при этом локальная индикация линка не всегда укажет на проблему односторонней связи. UDLD проверяет двунаправленное обнаружение соседей на уровне линии. В aggressive mode при подтверждённой недоступности соседа способен перевести порт в err-disabled; конкретная реакция зависит от режима и платформы."
    },
    {
      "heading": "Не путать с BPDU Guard",
      "body": "BPDU Guard защищает ожидаемый edge/access-порт от неожиданного BPDU и обычно отправляет интерфейс в err-disabled. Root Guard блокирует superior BPDU, Loop Guard — исчезновение ожидаемых BPDU, UDLD — проблемы однонаправленности. Эти механизмы нельзя заменять друг другом."
    },
    {
      "heading": "Действия инженера",
      "body": "Начни с show spanning-tree inconsistentports, состояния интерфейса, логов и признаков физического повреждения. Перед восстановлением выясни, почему исчезли BPDU или появилась superior-информация. Нельзя массово отключать защиты ради зелёного индикатора."
    }
  ],
  "commands": [
    {
      "title": "Проверка защит STP",
      "cmd": "show spanning-tree inconsistentports",
      "note": "Ищите root-inconsistent и loop-inconsistent."
    }
  ],
  "relatedQuestionIds": [
    "stp-new-08",
    "stp-new-09",
    "stp-new-14",
    "stp-new-15"
  ],
  "sources": [
    "IEEE 802.1Q — Multiple Spanning Trees (MSTP/RSTP)",
    "Cisco Catalyst — Spanning Tree Protocol configuration guides"
  ],
  "professional": {
    "summary": "Три разных риска: чужой корень, исчезновение BPDU и однонаправленная оптика.",
    "terms": [
      "Root Guard",
      "Loop Guard",
      "UDLD",
      "BPDU",
      "root-inconsistent",
      "loop-inconsistent",
      "err-disabled"
    ],
    "blocks": [
      {
        "heading": "Root-inconsistent",
        "body": "Root Guard применяют на сегментах, где порт должен оставаться Designated. Superior BPDU переводит затронутый spanning-tree instance в root-inconsistent; это не обязательно административный down физического интерфейса."
      },
      {
        "heading": "Loop-inconsistent",
        "body": "Loop Guard имеет смысл для non-designated Root/Alternate, ожидающих BPDU. Потеря BPDU при сохранённом линке не должна автоматически превращать сегмент в активный Designated путь. Состояние loop-inconsistent устраняется после восстановления корректных BPDU."
      },
      {
        "heading": "UDLD modes",
        "body": "UDLD normal обнаруживает подозрительные однонаправленные состояния; aggressive добавляет механизм повторных попыток и может err-disable порт при подтверждённой проблеме. Детали различаются между платформами; UDLD не заменяет STP и не гарантирует диагностику каждой оптической неисправности."
      },
      {
        "heading": "Сопоставление",
        "body": "Root Guard: superior BPDU; Loop Guard: потеря ожидаемых BPDU; BPDU Guard: любой BPDU на защищённом edge; UDLD: нарушение двусторонней связи соседей. Нельзя выбирать защиту только по факту состояния link up."
      },
      {
        "heading": "Команды",
        "body": "show spanning-tree inconsistentports показывает protcol-inconsistent состояния; show udld interface <IF> и show interfaces <IF> помогают разобраться с соседством и ошибками. Синтаксис и доступность зависят от платформы."
      }
    ],
    "sources": [
      "IEEE 802.1Q — Multiple Spanning Trees (MSTP/RSTP)",
      "Cisco Catalyst — Spanning Tree Protocol configuration guides"
    ],
    "sourceCommit": "new-2026-11-12"
  }
};
