import type { Lesson } from './types';

export const LESSON_CLI_TRUNK_VLAN_DIAGNOSTICS: Lesson = {
  "id": "cli-trunk-vlan-diagnostics",
  "title": "Почему один VLAN проходит по trunk, а другой нет",
  "category": "CLI · Диагностика",
  "osiLayers": [
    "CLI",
    "L2"
  ],
  "difficulty": "applied",
  "summary": "Читаем show interfaces trunk и show vlan: отличаем разрешённые VLAN от созданных и от участвующих в передаче, затем проверяем оба конца соединения.",
  "terms": [
    "allowed VLANs",
    "native VLAN",
    "show interfaces trunk",
    "VTP pruning"
  ],
  "blocks": [
    {
      "heading": "Сначала зафиксировать путь и состояние порта",
      "body": "Если VLAN 10 работает, а VLAN 20 нет, сначала запиши, по каким коммутаторам и портам идёт нужный обмен. Сравни оба конца каждого соединения: линия должна работать, порт должен фактически быть trunk, а VLAN 20 — существовать и быть активной на нужных коммутаторах.\n\nShow vlan brief помогает увидеть локальную базу VLAN и access-порты. Отсутствие trunk-порта в списке пользовательских портов VLAN само по себе не означает, что VLAN через него не проходит. Режим и перенос VLAN проверяют отдельно через show interfaces trunk и вывод switchport."
    },
    {
      "heading": "Прочитать все списки show interfaces trunk",
      "body": "В типичном выводе Cisco IOS есть несколько разных наборов. Allowed VLANs — настроенное разрешение на перенос. Следующий список уточняет, какие из разрешённых VLAN существуют и активны локально. Последний показывает VLAN в передающем состоянии STP и не исключённые pruning.\n\nЕсли VLAN 20 есть в первом списке, это ещё не доказывает её передачу. Найди, на каком этапе она исчезает, и сравни вывод соседнего коммутатора. Исправление allowed list делают с учётом уже рабочих VLAN: полная замена списка одним номером может отключить остальные."
    },
    {
      "heading": "Разделить разрешение и pruning",
      "body": "Allowed list задаёт административное разрешение VLAN на trunk. Pruning ограничивает ненужное распространение трафика. Это разные причины отсутствия VLAN в итоговом списке: возвращать её в allowed list бессмысленно, если она уже там есть.\n\nVTP pruning может сократить ненужный flooded-трафик в домене VTP, но работает только при соответствующих возможностях и настройках. Проверяют состояние STP и pruning отдельно. Один список не доказывает ни конкретную причину исключения, ни исправность всей цепочки."
    },
    {
      "heading": "Согласовать native VLAN и проверить результат",
      "body": "На концах trunk сравни native VLAN и правила тегирования. Обычно нетегированный входящий кадр относится к локальной native VLAN, поэтому разные значения могут отправить его не в ту сеть. Некоторые проверки STP обнаруживают такое несоответствие и блокируют затронутые VLAN.\n\nЕсли есть предупреждения о native VLAN или inconsistent-состояние, устраняют несогласованность, а не просто снимают защиту. После правки повторяют show interfaces trunk, проверяют VLAN и состояние дерева на обоих концах, затем проверяют нужный обмен. Не меняй одновременно allowed list, native VLAN и STP без проверки причины."
    }
  ],
  "commands": [
    {
      "title": "Локальные VLAN и access-порты",
      "cmd": "show vlan brief",
      "note": "Не использовать как единственную проверку VLAN membership на trunk."
    },
    {
      "title": "Trunk и списки VLAN",
      "cmd": "show interfaces trunk",
      "note": "Сравнить allowed, allowed-and-active и forwarding-and-not-pruned на обоих концах."
    },
    {
      "title": "Режим и native VLAN конкретного порта",
      "cmd": "show interfaces GigabitEthernet0/1 switchport",
      "note": "Имя интерфейса заменить фактическим; сверить administrative и operational поля."
    },
    {
      "title": "Состояние дерева нужной VLAN",
      "cmd": "show spanning-tree vlan 20",
      "note": "Различать роль порта, forwarding и защитные состояния."
    },
    {
      "title": "Защитные состояния дерева",
      "cmd": "show spanning-tree inconsistentports",
      "note": "Сопоставить с логами PVID/native mismatch."
    },
    {
      "title": "Настройки VTP и pruning",
      "cmd": "show vtp status",
      "note": "Доступность и поля зависят от платформы и версии."
    }
  ],
  "relatedQuestionIds": [],
  "sources": [
    "Cisco VLAN Trunking — Catalyst IOS VLAN and trunk configuration guides",
    "Cisco Catalyst IOS LAN Switching Command Reference — show interfaces trunk, VTP pruning and STP consistency"
  ],
  "professional": {
    "summary": "Cisco VLAN Trunking: административный allowed list, локальная VLAN database, STP forwarding, VTP pruning и native/PVID consistency как независимые проверки.",
    "terms": [
      "allowed VLANs",
      "native VLAN",
      "show interfaces trunk",
      "VTP pruning"
    ],
    "blocks": [
      {
        "heading": "Собрать данные на обоих концах",
        "body": "Проверяют PHY/admin state, operational switchport mode, инкапсуляцию при применимости, VLAN database и каждый транзитный линк. Show interfaces <IF> switchport отличает administrative от operational mode; show interfaces trunk перечисляет фактически работающие trunk-интерфейсы.\n\nShow vlan brief не является таблицей членства trunk по каждой VLAN: обычный список access-портов не заменяет trunk diagnostics. VLAN active локально не доказывает её admission или forwarding на соседнем устройстве. При односторонней или перемежающейся проблеме сопоставляют логи и счётчики, не ограничиваясь состоянием link up."
      },
      {
        "heading": "Allowed list против фактической передачи",
        "body": "В типичном IOS show interfaces trunk разделяет Vlans allowed on trunk, Vlans allowed and active in management domain и Vlans in spanning tree forwarding state and not pruned. Это последовательные сведения об административном допуске, локальном состоянии VLAN и STP/pruning, а не три синонима успешной передачи.\n\nДля отсутствующей VLAN устанавливают, какое условие не выполнено на каждом конце. Switchport trunk allowed vlan <list> заменяет набор, а add/remove изменяют его. Admission, VLAN existence и STP state проверяют независимо; даже наличие в последнем списке не доказывает исправность access-сегментов и остальной сети."
      },
      {
        "heading": "VTP pruning и STP нельзя смешивать",
        "body": "VTP pruning сокращает ненужный flooded-трафик для поддерживаемых VLAN и trunk в соответствии с VTP-состоянием и pruning eligibility. Оно не равно удалению VLAN из базы или статическому запрету allowed list, и не следует автоматически переносить его выводы на весь known-unicast трафик.\n\nПроверяют show vtp status и при поддержке show interfaces pruning, затем show spanning-tree vlan <VID>. Отсутствие VLAN в объединённом списке forwarding and not pruned не различает само по себе pruning и STP blocking. Проверка режима VTP, области действия и eligibility нужна до изменения глобальной политики pruning."
      },
      {
        "heading": "Native mismatch и inconsistent-порты",
        "body": "Сравнивают operational native VLAN и правила tagged/untagged admission на обоих концах. Native mismatch может нарушить классификацию нетегированных кадров; PVST/Rapid PVST consistency checks могут дополнительно обнаружить несовпадение PVID и заблокировать затронутую VLAN. Это не обязательно физический down всего trunk.\n\nПри соответствующих логах используют show spanning-tree inconsistentports и интерфейсный вывод STP, чтобы отделить PVID inconsistency от root/loop-inconsistent и обычного Alternate. Устраняют причину на концах линка, затем повторяют проверку списков и нужного трафика. Команды и точный формат вывода зависят от семейства Cisco и версии IOS."
      }
    ],
    "commands": [
      {
        "title": "Локальные VLAN и access-порты",
        "cmd": "show vlan brief",
        "note": "Не использовать как единственную проверку VLAN membership на trunk."
      },
      {
        "title": "Trunk и списки VLAN",
        "cmd": "show interfaces trunk",
        "note": "Сравнить allowed, allowed-and-active и forwarding-and-not-pruned на обоих концах."
      },
      {
        "title": "Режим и native VLAN конкретного порта",
        "cmd": "show interfaces GigabitEthernet0/1 switchport",
        "note": "Имя интерфейса заменить фактическим; сверить administrative и operational поля."
      },
      {
        "title": "Состояние дерева нужной VLAN",
        "cmd": "show spanning-tree vlan 20",
        "note": "Различать роль порта, forwarding и защитные состояния."
      },
      {
        "title": "Защитные состояния дерева",
        "cmd": "show spanning-tree inconsistentports",
        "note": "Сопоставить с логами PVID/native mismatch."
      },
      {
        "title": "Настройки VTP и pruning",
        "cmd": "show vtp status",
        "note": "Доступность и поля зависят от платформы и версии."
      }
    ],
    "sources": [
      "Cisco VLAN Trunking — Catalyst IOS VLAN and trunk configuration guides",
      "Cisco Catalyst IOS LAN Switching Command Reference — show interfaces trunk, VTP pruning and STP consistency"
    ],
    "sourceCommit": "new-cli-lessons-2026-11-13"
  }
};
