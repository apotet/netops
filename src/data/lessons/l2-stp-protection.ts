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
      "heading": "Не путать с BPDU Guard и состоянием err-disabled",
      "body": "BPDU Guard защищает ожидаемый edge/access-порт от неожиданного BPDU и переводит интерфейс в защитное состояние err-disabled (error-disabled), полностью отключая передачу кадров на порту. В err-disabled порт также переходит при срабатывании UDLD aggressive или Port Security violation. Root Guard блокирует superior BPDU в состояние root-inconsistent, а Loop Guard переводит порт в loop-inconsistent при исчезновении ожидаемых BPDU без полного выключения физического линка."
    },
    {
      "heading": "Действия инженера и выход из err-disabled",
      "body": "Начни с show spanning-tree inconsistentports, show interfaces status err-disabled, логов и признаков физического повреждения. Состояния root-inconsistent и loop-inconsistent снимаются автоматически после устранения причины на линии. Порт в состоянии err-disabled остаётся программно выключенным: сначала устраняют первопричину (петлю, чужой коммутатор, обрыв одной жилы оптики), а затем восстанавливают интерфейс вручную (shutdown / no shutdown) либо через настроенный таймер errdisable recovery."
    }
  ],
  "commands": [
    {
      "title": "Проверка защит STP",
      "cmd": "show spanning-tree inconsistentports",
      "note": "Ищите root-inconsistent и loop-inconsistent."
    },
    {
      "title": "Проверка портов в err-disabled",
      "cmd": "show interfaces status err-disabled",
      "note": "Показывает порт и точную причину защитного отключения (bpduguard, udld, psecure-violation)."
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
    "summary": "Три разных риска: чужой корень, исчезновение BPDU и однонаправленная оптика, а также отличие inconsistent-состояний от err-disabled.",
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
        "body": "Root Guard применяют на сегментах, где порт должен оставаться Designated. Superior BPDU переводит затронутый spanning-tree instance в root-inconsistent; это блокировка продвижения трафика на уровне STP-инстанции, а не административный down физического интерфейса."
      },
      {
        "heading": "Loop-inconsistent",
        "body": "Loop Guard имеет смысл для non-designated Root/Alternate, ожидающих BPDU. Потеря BPDU при сохранённом линке не должна автоматически превращать сегмент в активный Designated путь. Состояние loop-inconsistent устраняется автоматически после восстановления приёма корректных BPDU."
      },
      {
        "heading": "UDLD modes и err-disabled",
        "body": "UDLD normal обнаруживает подозрительные однонаправленные состояния; aggressive активно перепроверяет соседство по эхо-кадрам и при подтверждённом одностороннем обрыве переводит порт в err-disabled. В отличие от root-inconsistent и loop-inconsistent, err-disabled программно гасит интерфейс (line protocol down (err-disabled)) так же, как BPDU Guard на edge-порту."
      },
      {
        "heading": "Сопоставление и восстановление",
        "body": "Root Guard: superior BPDU → root-inconsistent; Loop Guard: потеря ожидаемых BPDU → loop-inconsistent; BPDU Guard: любой BPDU на защищённом edge → err-disabled; UDLD aggressive: потеря двустороннего L1/L2 эха → err-disabled. Выход из err-disabled выполняется только после устранения причины: вручную через shutdown / no shutdown или автоматически по таймеру errdisable recovery cause <reason>."
      },
      {
        "heading": "Команды",
        "body": "show spanning-tree inconsistentports показывает protocol-inconsistent состояния; show interfaces status err-disabled и show errdisable recovery показывают причины защитного отключения и таймеры автоподъёма; show udld interface <IF> помогает верифицировать двустороннее соседство."
      }
    ],
    "sources": [
      "IEEE 802.1Q — Multiple Spanning Trees (MSTP/RSTP)",
      "Cisco Catalyst — Spanning Tree Protocol configuration guides"
    ],
    "sourceCommit": "new-2026-11-12"
  }
};
