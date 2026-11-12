import type { Lesson } from './types';

export const LESSON_L2_RSTP_CONVERGENCE: Lesson = {
  "id": "l2-rstp-convergence",
  "title": "RSTP Advanced: переключение путей и Proposal/Agreement",
  "category": "L2 · Коммутация",
  "osiLayers": [
    "L2"
  ],
  "difficulty": "advanced",
  "summary": "Что реально происходит при отказе Root Port и согласовании нового пути в RSTP.",
  "terms": [
    "RSTP",
    "Alternate",
    "Proposal",
    "Agreement",
    "edge",
    "PortFast",
    "BPDU Guard"
  ],
  "blocks": [
    {
      "heading": "Резервный путь уже известен",
      "body": "RSTP хранит информацию о запасном пути к корню через Alternate. Если работающий Root Port теряет связь, пригодный Alternate может получить роль Root и перейти к передаче быстрее, чем старый STP. Но скорость зависит от актуальности информации, топологии и условий согласования."
    },
    {
      "heading": "Proposal и Agreement",
      "body": "На point-to-point соединении новый Designated может предложить быстрое включение. Сосед сначала должен убедиться, что его другие не-edge Designated-порты не создадут петлю, и только затем подтверждает безопасный переход. Нельзя понимать Agreement как универсальный приказ немедленно открыть все порты."
    },
    {
      "heading": "Зачем нужна синхронизация",
      "body": "Представь коммутатор S с портом к новому корню, портом к ПК и ещё одним исходящим линком к другому коммутатору. Edge-порт к ПК обычно не нужно блокировать ради согласования. А старый non-edge Designated/Forwarding может потребовать синхронизации, чтобы временно исключить петлю."
    },
    {
      "heading": "Edge и защита",
      "body": "PortFast применяется к заведомо конечным устройствам. Такой порт быстро начинает передавать данные, но при получении BPDU может потерять operational edge. BPDU Guard — отдельная функция: на защищённом порту получение BPDU обычно приводит к err-disabled. Guard не является ускорителем RSTP."
    },
    {
      "heading": "Диагностика после отказа",
      "body": "Отделяй физический отказ (link down) от резервного Discarding. Смотри Root Port до и после отказа, роли Alternate, наличие BPDU и журнал защит. Не обещай фиксированное время сходимости RSTP на любой конфигурации."
    }
  ],
  "commands": [
    {
      "title": "Роли и состояния",
      "cmd": "show spanning-tree detail",
      "note": "Проверьте роли и переходы после изменения топологии."
    }
  ],
  "relatedQuestionIds": [
    "stp-new-04",
    "stp-new-06",
    "stp-new-07"
  ],
  "sources": [
    "IEEE 802.1Q — Multiple Spanning Trees (MSTP/RSTP)",
    "Cisco Catalyst — Spanning Tree Protocol configuration guides"
  ],
  "professional": {
    "summary": "Что реально происходит при отказе Root Port и согласовании нового пути в RSTP.",
    "terms": [
      "RSTP",
      "Alternate",
      "Proposal",
      "Agreement",
      "edge",
      "PortFast",
      "BPDU Guard"
    ],
    "blocks": [
      {
        "heading": "Role transition",
        "body": "В RSTP используются роли Root, Designated, Alternate, Backup и состояния Discarding, Learning, Forwarding. При утрате актуального Root Port Alternate с подходящей информацией может стать новым Root Port, но переход зависит от протокольного состояния."
      },
      {
        "heading": "Rapid transition handshake",
        "body": "Proposal/Agreement применяется на подходящих full-duplex point-to-point сегментах между RSTP-совместимыми мостами. Перед Agreement мост выполняет sync своих остальных non-edge Designated-портов (их перевод в безопасное состояние, если требуется), чтобы избежать transient loop."
      },
      {
        "heading": "Operational edge",
        "body": "Administrative edge не означает бессрочную защиту от BPDU. Operational edge меняется при получении BPDU; PortFast и BPDU Guard решают разные задачи. На линках между коммутаторами нельзя бездумно форсировать edge."
      },
      {
        "heading": "Отказ и сходимость",
        "body": "При событии link down исчезает физическое соединение, при потере только BPDU линк может остаться up. Поведение RSTP отличается и зависит от aged information, роли порта, соседнего протокола и состояния синхронизации. Не приравнивать к классическим таймерам Listening/Learning."
      },
      {
        "heading": "Проверка",
        "body": "На Cisco полезны show spanning-tree detail, show spanning-tree interface <IF> detail, show interfaces status и системные сообщения. В выводе сравнивают actual role/state и operational edge, а не только running-config."
      }
    ],
    "sources": [
      "IEEE 802.1Q — Multiple Spanning Trees (MSTP/RSTP)",
      "Cisco Catalyst — Spanning Tree Protocol configuration guides"
    ],
    "sourceCommit": "new-2026-11-12"
  }
};
