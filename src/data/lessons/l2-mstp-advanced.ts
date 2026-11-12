import type { Lesson } from './types';

export const LESSON_L2_MSTP_ADVANCED: Lesson = {
  "id": "l2-mstp-advanced",
  "title": "MSTP Advanced: CIST, MSTI, регионы и VLAN mapping",
  "category": "L2 · Коммутация",
  "osiLayers": [
    "L2"
  ],
  "difficulty": "advanced",
  "summary": "Как несколько VLAN используют общие деревья, почему появляются boundary и чем CIST отличается от MSTI.",
  "terms": [
    "MSTP",
    "MSTI",
    "CIST",
    "MST region",
    "revision",
    "configuration digest",
    "boundary"
  ],
  "blocks": [
    {
      "heading": "Зачем MSTP группирует VLAN",
      "body": "В PVST+ отдельная STP-инстанция существует для каждого VLAN; MSTP объединяет многие VLAN в одну инстанцию MSTI. Все VLAN одного MSTI используют общие роли портов и дерево, а значит не могут независимо выбирать разные исходящие пути внутри региона."
    },
    {
      "heading": "Три части идентичности региона",
      "body": "Чтобы соседи считали друг друга частью одного MST-региона, должны совпадать configuration name, revision и digest таблицы соответствия VLAN-to-MSTI. Записать 10-19 одной строкой или как 10-14 плюс 15-19 — одно и то же распределение. Но revision 12 и 21 уже различаются, даже если VLAN назначены одинаково."
    },
    {
      "heading": "CIST и внутренние деревья",
      "body": "CIST обеспечивает связь общей топологии, включая внешние устройства и границы регионов. Внутри одного MST-региона MSTI могут иметь собственные Regional Root и port roles. Корень внешней общей топологии не обязан совпадать с корнем каждого MSTI."
    },
    {
      "heading": "Планируем разные пути VLAN",
      "body": "Пусть корень MSTI 1 — коммутатор A, а MSTI 2 — B. Если VLAN 10 и 20 назначены MSTI 1, оба используют дерево A. Чтобы VLAN 20 шла деревом B, нужно назначить её MSTI 2 на всех мостах региона; правка root или cost для MSTI 1 одновременно затронет VLAN 10."
    },
    {
      "heading": "Граница с внешней RSTP-сетью",
      "body": "Сосед за пределами MST-региона видит регион как единый виртуальный мост в общей топологии; внутренние MSTI не распространяются снаружи как отдельные деревья. На boundary отдельные CIST роли (в том числе Master для MSTI на региональных границах) нельзя вычислять как независимый выбор Root Port каждой VLAN по внешним BPDU."
    },
    {
      "heading": "Как менять без аварии",
      "body": "Таблицы VLAN-to-instance необходимо согласовывать по всем мостам региона. Во время частичного применения возможны временные границы region mismatch, поэтому сначала планируют последовательность и окно работ, потом проверяют конфигурационные идентификаторы, корни, boundary и роли."
    }
  ],
  "commands": [
    {
      "title": "Конфигурация MST региона",
      "cmd": "show spanning-tree mst configuration",
      "note": "Сверяйте name, revision и VLAN-to-MSTI mapping на всех мостах."
    }
  ],
  "relatedQuestionIds": [
    "stp-new-10",
    "stp-new-11",
    "stp-new-12",
    "stp-new-13"
  ],
  "sources": [
    "IEEE 802.1Q — Multiple Spanning Trees (MSTP/RSTP)",
    "Cisco Catalyst — Spanning Tree Protocol configuration guides"
  ],
  "professional": {
    "summary": "Как несколько VLAN используют общие деревья, почему появляются boundary и чем CIST отличается от MSTI.",
    "terms": [
      "MSTP",
      "MSTI",
      "CIST",
      "MST region",
      "revision",
      "configuration digest",
      "boundary"
    ],
    "blocks": [
      {
        "heading": "Region identity",
        "body": "MST Configuration Identifier включает configuration name, revision level и configuration digest VLAN-to-MSTI allocation table. Digest относится к семантической таблице отображения VLAN, а не текстовому написанию отдельных диапазонов. Изменение одного из параметров создаёт границу между регионами."
      },
      {
        "heading": "CIST vs MSTI",
        "body": "CIST (Common and Internal Spanning Tree) объединяет межрегиональный CST и внутренний IST; MSTI действуют в рамках своего региона. CIST Root может быть внешним, а Regional Root каждого MSTI может выбираться независимо от остальных деревьев."
      },
      {
        "heading": "Mapping и корни",
        "body": "Если MSTI 1 имеет Regional Root A, а MSTI 2 — B, выбор VLAN-to-instance определяет, чьи per-instance роли портов будут обслуживать трафик. При равных линковых cost прямой путь 10 побеждает маршрут через промежуточный мост с суммой 20. Смена cost в одном MSTI меняет пути всех VLAN, привязанных к нему."
      },
      {
        "heading": "Master/Boundary",
        "body": "Master port используется внутри региона для достижения CIST Root вне региона и имеет специальную роль относительно MSTI. На границе MSTP/RSTP нужно различать CIST информацию снаружи и внутренние MSTI роли; внешний BPDU сам по себе не выбирает независимый Root Port каждого MSTI."
      },
      {
        "heading": "Cisco диагностика",
        "body": "show spanning-tree mst configuration — name/revision/mapping; show spanning-tree mst — regional roots и роли; show spanning-tree mst interface <IF> detail — port roles и boundary с учётом поддержки IOS/IOS XE. Изменения региона производят согласованно."
      }
    ],
    "sources": [
      "IEEE 802.1Q — Multiple Spanning Trees (MSTP/RSTP)",
      "Cisco Catalyst — Spanning Tree Protocol configuration guides"
    ],
    "sourceCommit": "new-2026-11-12"
  }
};
