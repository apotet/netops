import type { Lesson } from './types';

export const LESSON_L2_STP_ELECTION: Lesson = {
  "id": "l2-stp-election",
  "title": "STP Advanced: Bridge ID, стоимость пути и роли портов",
  "category": "L2 · Коммутация",
  "osiLayers": [
    "L2"
  ],
  "difficulty": "advanced",
  "summary": "Разбираем BPDU и вычисляем Root Bridge, Root Port и Designated Port даже при равных стоимостях.",
  "terms": [
    "Bridge ID",
    "BPDU",
    "Root Port",
    "Designated",
    "Alternate",
    "path cost",
    "RSTP"
  ],
  "blocks": [
    {
      "heading": "Сначала выбирают корень",
      "body": "Все коммутаторы в одном дереве выбирают корневой мост по наименьшему Bridge ID (BID). Сначала сравнивается приоритет, затем MAC при равенстве. В PVST+/Rapid PVST+ расширение System ID включает VLAN ID: сравнивать нужно итоговые BID именно одного VLAN, а не только MAC или записанные числа приоритета."
    },
    {
      "heading": "Как считать стоимость пути",
      "body": "Каждый мост выбирает путь к корню. Когда от соседа приходит BPDU с объявленной стоимостью 10, а входящий локальный порт имеет стоимость 20, кандидатный путь через этот порт равен 30. Сравнение путей относится к одной STP-инстанции; разные VLAN или MSTI могут иметь разные результаты."
    },
    {
      "heading": "Если стоимости равны",
      "body": "Сначала сравнивают Root ID, затем общую root path cost, далее Bridge ID передающего соседа, Port ID соседа и, если нужно, локальный Port ID. Поэтому победителя не всегда определяет MAC локального коммутатора или номер его порта. В задачах с равными cost нужно пройти всю последовательность сравнений."
    },
    {
      "heading": "Роли по сегментам",
      "body": "У некорневого моста лучший порт к корню — Root Port. На каждом сегменте Designated Port выбирается по лучшему объявляемому вектору; не каждый физический порт корневого моста автоматически указывает путь для другого моста. Исправный резервный порт RSTP может стать Alternate/Discarding — это не физическая неисправность."
    },
    {
      "heading": "Пример проверки",
      "body": "В треугольнике A—B—S с одинаковой стоимостью 10 и корнем A у S прямой путь к A стоит 10, обход S—B—A стоит 20. Root Port S направлен к A. Изменение стоимости может перевести Root Port на другой линк; проверяют как root path cost, так и роли на каждом сегменте."
    }
  ],
  "commands": [
    {
      "title": "Проверить дерево VLAN 100",
      "cmd": "show spanning-tree vlan 100",
      "note": "Сравните Root ID, Root Path Cost и роли портов."
    }
  ],
  "relatedQuestionIds": [
    "stp-new-01",
    "stp-new-02",
    "stp-new-03",
    "stp-new-05"
  ],
  "sources": [
    "IEEE 802.1Q — Multiple Spanning Trees (MSTP/RSTP)",
    "Cisco Catalyst — Spanning Tree Protocol configuration guides"
  ],
  "professional": {
    "summary": "Разбираем BPDU и вычисляем Root Bridge, Root Port и Designated Port даже при равных стоимостях.",
    "terms": [
      "Bridge ID",
      "BPDU",
      "Root Port",
      "Designated",
      "Alternate",
      "path cost",
      "RSTP"
    ],
    "blocks": [
      {
        "heading": "Структура priority vector",
        "body": "Port Priority Vector сравнивается лексикографически по Root ID → Root Path Cost → Designated Bridge ID → Designated Port ID → локальный Receiving Port ID. Последний критерий применяется для сравнения полученной информации при полном равенстве предшествующих полей; его не следует путать с первичным выбором root."
      },
      {
        "heading": "BID и Extended System ID",
        "body": "Для PVST+ BID включает Bridge Priority с Extended System ID, содержащим VLAN ID, плюс MAC. Сравнение проводится для конкретного VLAN. Значения конфигурационного bridge priority обычно задают кратно 4096, а отображаемое значение BID для VLAN может включать номер VLAN."
      },
      {
        "heading": "Накопление cost",
        "body": "У некорневого коммутатора вычисляемая стоимость кандидата к Root = advertised Root Path Cost из BPDU + local port path cost на входящем порту. Не следует суммировать стоимость исходящего порта соседа дважды."
      },
      {
        "heading": "Designated и Alternate",
        "body": "Root Port выбран для моста, Designated Port выбран для сегмента. Alternate получает альтернативную информацию о пути к Root и в RSTP остаётся в Discarding, пока условия не изменятся. Протокольное блокирование отличается от shutdown, err-disabled и физического down."
      },
      {
        "heading": "Проверка Cisco",
        "body": "Используют show spanning-tree vlan <VLAN>, show spanning-tree interface <IF> detail; сверяют Root ID, Bridge ID, Root Path Cost, Port ID/Cost, роли и состояния. Вывод зависит от IOS/IOS XE и используемого STP mode."
      }
    ],
    "sources": [
      "IEEE 802.1Q — Multiple Spanning Trees (MSTP/RSTP)",
      "Cisco Catalyst — Spanning Tree Protocol configuration guides"
    ],
    "sourceCommit": "new-2026-11-12"
  }
};
