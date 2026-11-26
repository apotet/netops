import type { Lesson } from './types';

export const LESSON_L2_IGMP_SNOOPING: Lesson = {
  "id": "l2-igmp-snooping",
  "title": "IGMP Snooping: почему multicast заливает весь VLAN",
  "category": "L2 · Multicast",
  "osiLayers": [
    "L2"
  ],
  "difficulty": "applied",
  "summary": "Почему поток приходит на порты без зрителей, как коммутатор узнаёт подписчиков multicast-группы и зачем для сохранения подписок нужны регулярные запросы querier.",
  "terms": [
    "IGMP Snooping",
    "querier",
    "multicast group"
  ],
  "blocks": [
    {
      "heading": "Поток есть, а список получателей неизвестен",
      "body": "Multicast-источник отправляет поток на адрес группы, например 239.1.1.1. Но обычное обучение MAC-адресам не сообщает коммутатору, за какими портами находятся подписчики именно этой группы.\n\nЕсли нужной информации нет, многие коммутаторы рассылают такой трафик по разрешённым передающим портам VLAN. Получается flooding, хотя multicast не становится broadcast. Конкретная обработка неизвестных групп зависит от настроек и оборудования."
    },
    {
      "heading": "Подсмотреть отчёты и сузить передачу",
      "body": "Устройства сообщают о своём интересе к группе через IGMP. IGMP Snooping наблюдает этот служебный обмен и связывает группу с портами получателей.\n\nЗная подписки, коммутатор может отправлять обычный групповой поток на нужные порты вместо рассылки всему VLAN. Также учитываются порты к multicast-маршрутизаторам и специальные служебные группы. Snooping ограничивает распространение внутри VLAN, а не сам по себе маршрутизирует поток между сетями."
    },
    {
      "heading": "Почему нужен querier",
      "body": "Подписка не должна храниться вечно: зритель мог выключить приложение или отключиться без уведомления. Querier регулярно спрашивает, какие группы ещё нужны, а ответы помогают поддерживать актуальное состояние.\n\nЕсли запросы перестали приходить, динамические записи могут устареть. После их исчезновения одни реализации начнут flooding неизвестного multicast, другие могут ограничить или потерять поток. Проверяют наличие querier в нужной VLAN, а не только включённую галочку snooping."
    },
    {
      "heading": "Уход зрителя и порядок проверки",
      "body": "Сообщение Leave помогает быстрее убрать ненужную подписку, но за одним портом может находиться несколько получателей. Нельзя отключать весь порт от группы после ухода одного из них, не проверив, остались ли другие.\n\nПри проблеме фиксируют VLAN и группу, смотрят таблицу получателей, порты к маршрутизаторам и сообщения querier. Затем проверяют отчёты, таймеры и поведение неизвестных групп. Оптимизация fast leave подходит лишь для подключения с гарантированно одним получателем, а не для произвольного uplink."
    }
  ],
  "commands": [
    {
      "title": "Получатели групп на Cisco при поддержке",
      "cmd": "show ip igmp snooping groups",
      "note": "Сверить VLAN, группу и порты получателей."
    },
    {
      "title": "Состояние querier",
      "cmd": "show ip igmp snooping querier",
      "note": "Поддержка и формат зависят от модели и версии."
    },
    {
      "title": "Порты multicast-маршрутизаторов",
      "cmd": "show ip igmp snooping mrouter",
      "note": "Сопоставить с физической топологией и служебным обменом."
    }
  ],
  "relatedQuestionIds": [],
  "sources": [
    "Network_history_NFA — переработка IGMP Snooping: https://t.me/Network_history_NFA/357",
    "RFC 4541 — Considerations for IGMP and MLD Snooping Switches: https://www.rfc-editor.org/rfc/rfc4541",
    "RFC 2236 — IGMP Version 2: https://www.rfc-editor.org/rfc/rfc2236",
    "RFC 3376 — IGMP Version 3: https://www.rfc-editor.org/rfc/rfc3376"
  ],
  "professional": {
    "summary": "IPv4 IGMP Snooping: learned group/port state, querier и aging, report suppression, Leave/last-member queries и зависимость unknown multicast forwarding от реализации.",
    "terms": [
      "IGMP Snooping",
      "querier",
      "multicast group"
    ],
    "blocks": [
      {
        "heading": "Snooping state и область forwarding",
        "body": "Обычная L2 source-MAC learning не заменяет membership state. IGMP Snooping анализирует IPv4 IGMP control traffic и строит соответствия multicast group/VLAN/receiver port; при IGMPv3 возможен учёт source-specific состояния согласно возможностям реализации.\n\nОбычные data frames известной группы ограничиваются receiver ports и нужными multicast-router ports с учётом STP, admission и политики. Служебные группы и control traffic требуют специальных правил RFC 4541. Для unknown multicast типичен flooding, но configurable drop и другие режимы не позволяют обещать одинаковое поведение всех платформ."
      },
      {
        "heading": "Querier, queries и aging",
        "body": "В VLAN должен существовать подходящий IGMP querier: обычно multicast-router или поддерживаемый switch snooping querier. Его роль — отправка queries и поддержание membership state; наличие L2 querier не означает, что на коммутаторе включена multicast routing.\n\nReports подтверждают интерес получателей; отсутствие обновлений приводит к aging по применимым таймерам. Без querier разовые unsolicited reports не гарантируют бессрочное сохранение подписок. После expiry дальнейшая передача зависит от unknown-group policy и особенностей таблицы; проверяют configured/operational querier и реальный приход queries."
      },
      {
        "heading": "Report suppression и видимость подписчиков",
        "body": "В IGMPv1/v2 хост может подавить свой report, услышав отчёт другого участника той же группы. Snooping-реализация должна корректно учитывать такую семантику, чтобы не потерять информацию о портах. Некоторые коммутаторы также подавляют или агрегируют reports к маршрутизатору, сохраняя собственное локальное membership state.\n\nОдин report на uplink не доказывает одного локального получателя. Сравнивают snooping table и захват на клиентских портах, учитывая версию IGMP. Правила report suppression IGMPv1/v2 нельзя безусловно переносить на IGMPv3 и его membership records."
      },
      {
        "heading": "Leave, last-member checking и диагностика",
        "body": "В IGMPv2 Leave инициирует проверку наличия оставшихся членов группы через last-member queries и соответствующие таймеры. Для shared-порта за коммутатором, точкой доступа или несколькими хостами немедленное удаление порта может оборвать поток оставшимся участникам. IGMPv3 выражает изменение членства иначе, через state-change records.\n\nFast/immediate leave применяют только при подтверждённой топологии одного получателя либо поддерживаемом механизме per-host tracking. Проверяют группы, router ports, querier, версии и report/query/leave counters. Синтаксис show и доступность snooping querier зависят от платформы."
      }
    ],
    "commands": [
      {
        "title": "Получатели групп на Cisco при поддержке",
        "cmd": "show ip igmp snooping groups",
        "note": "Сверить VLAN, группу и порты получателей."
      },
      {
        "title": "Состояние querier",
        "cmd": "show ip igmp snooping querier",
        "note": "Поддержка и формат зависят от модели и версии."
      },
      {
        "title": "Порты multicast-маршрутизаторов",
        "cmd": "show ip igmp snooping mrouter",
        "note": "Сопоставить с физической топологией и служебным обменом."
      }
    ],
    "sources": [
      "Network_history_NFA — переработка IGMP Snooping: https://t.me/Network_history_NFA/357",
      "RFC 4541 — Considerations for IGMP and MLD Snooping Switches: https://www.rfc-editor.org/rfc/rfc4541",
      "RFC 2236 — IGMP Version 2: https://www.rfc-editor.org/rfc/rfc2236",
      "RFC 3376 — IGMP Version 3: https://www.rfc-editor.org/rfc/rfc3376"
    ],
    "sourceCommit": "adapted-network-history-2026-11-13"
  }
};
