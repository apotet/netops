import { Lesson } from './types';

export const LESSON_L2_ACCESS_GUARD: Lesson = {
  "id": "l2-access-guard",
  "title": "Port Security и DHCP Snooping: защита access-портов",
  "category": "L2 · Коммутация",
  "osiLayers": [
    "L2"
  ],
  "difficulty": "applied",
  "summary": "Зачем порту помнить разрешённые устройства, когда отбрасываются только чужие кадры, а когда закрывается весь порт; как дополнительно защищают выдачу сетевых настроек.",
  "terms": [
    "Port Security",
    "err-disabled",
    "sticky",
    "DHCP Snooping",
    "trusted",
    "binding",
    "rogue DHCP",
    "DAI"
  ],
  "blocks": [
    {
      "heading": "Зачем порту помнить разрешённые устройства",
      "body": "К розетке рабочего места могут подключить не тот компьютер или маленький коммутатор с несколькими устройствами. Если порт принимает любой источник, чужой ноутбук получает возможность отправлять трафик там, где ожидалось одно разрешённое устройство. Порту можно задать список и число допустимых адресов.\n\nЭто Port Security: коммутатор проверяет MAC-адрес источника кадра и ограничение на порту. Такая проверка не доказывает личность человека и не защищает сама по себе от подмены разрешённого MAC. Она помогает обнаруживать и ограничивать неожиданные источники, но не заменяет полноценную аутентификацию."
    },
    {
      "heading": "Выкинуть нарушителя или закрыть весь порт",
      "body": "Можно отбрасывать только кадры чужого устройства, сохраняя обмен разрешённого компьютера. Другой вариант — остановить весь порт, чтобы нарушение потребовало восстановления. Отдельный вопрос — будет ли коммутатор считать нарушения и сообщать о них.\n\nНа Cisco protect отбрасывает нарушающий трафик без роста счётчика нарушений; restrict также считает нарушения и может отправлять уведомления. Shutdown переводит порт в err-disabled, прекращая передачу и разрешённого источника; это режим по умолчанию для Port Security. Число уведомлений может быть ограничено и не обязано совпадать с числом нарушений.\n\nПроверяй состояние порта, режим и прирост счётчика за один интервал. Перед восстановлением устрани причину нарушения; затем используй принятый на устройстве способ восстановления. Одна потеря кадров ещё не отличает эти режимы."
    },
    {
      "heading": "Как запомнить адрес и сохранить его после перезапуска",
      "body": "Если адрес нужного компьютера известен, его можно ввести вручную. Если неизвестен, порт может изучить его после подключения. Чтобы результат пережил перезапуск, важно различать сведения, существующие только сейчас, и настройки, записанные на следующую загрузку.\n\nStatic secure MAC задают вручную. Dynamic secure MAC обучаются автоматически, но одно сохранение конфигурации не превращает их в постоянные записи. Sticky MAC добавляет изученный допустимый адрес в running-config: дождись обучения нужного устройства, проверь запись и только затем сохрани её в startup-config.\n\nСохранение до обучения не содержит ещё не появившегося адреса. Подготовь обучение так, чтобы первым не стало чужое устройство, и проверь лимит порта. После плановой замены компьютера обновляют разрешение по принятой процедуре, а не отключают защиту вслепую."
    },
    {
      "heading": "Зачем DHCP Snooping",
      "body": "Чужой DHCP-сервер в пользовательском VLAN может выдать клиенту свой шлюз или DNS. Трафик уйдёт не туда.\n\nDHCP Snooping делит порты на trusted и untrusted. Ответы сервера (Offer, Ack) разрешены только с trusted. На untrusted они отбрасываются."
    },
    {
      "heading": "Почему после включения пропадает DHCP",
      "body": "После включения snooping порты по умолчанию untrusted. Если uplink к серверу или relay не помечен trusted, клиенты перестают получать адреса, хотя сервер жив.\n\nПроверяйте: snooping включён на нужном VLAN, uplink trusted, не зарезан rate limit, Option 82 не ломает relay."
    },
    {
      "heading": "Binding и что дальше",
      "body": "Коммутатор пишет таблицу: MAC, выданный IP, VLAN, порт. Её используют Dynamic ARP Inspection и IP Source Guard — чтобы пускать только трафик, совпадающий с арендой.\n\nСлишком низкий limit rate на клиентском порту режет и обычные Discover. Симптом тот же: «DHCP не работает»."
    }
  ],
  "commands": [
    {
      "title": "Port Security",
      "cmd": "show port-security\nshow port-security interface Gi0/1",
      "note": "Лимит, режим, sticky и счётчик нарушений"
    },
    {
      "title": "err-disabled",
      "cmd": "show interfaces status err-disabled",
      "note": "Порты, которые выключил shutdown"
    },
    {
      "title": "DHCP Snooping",
      "cmd": "show ip dhcp snooping\nshow ip dhcp snooping binding",
      "note": "Trusted-порты и таблица аренд"
    }
  ],
  "relatedQuestionIds": [
    "l12-ps01",
    "l12-ps02",
    "l12-ps03",
    "l12-ds01",
    "l12-ds02",
    "l12-ds03",
    "l12-ds04"
  ],
  "sources": [
    "Cisco IOS Security Configuration Guide: Port Security",
    "Cisco IOS IP Addressing Services: DHCP Snooping",
    "RFC 2131"
  ],
  "professional": {
    "summary": "Как ограничить MAC на порту, чем отличаются protect, restrict и shutdown, и как DHCP Snooping не даёт чужому серверу раздать клиентам шлюз и DNS.",
    "terms": [
      "Port Security",
      "err-disabled",
      "sticky",
      "DHCP Snooping",
      "trusted",
      "binding",
      "rogue DHCP",
      "DAI"
    ],
    "blocks": [
      {
        "heading": "Зачем Port Security",
        "body": "Port Security ограничивает, какие MAC-адреса допустимы на access-порту и сколько их может быть.\n\nТипичная задача: на рабочем месте должен быть один ПК. Если воткнули чужое устройство, порт не должен молча его принять."
      },
      {
        "heading": "Режимы нарушения",
        "body": "Protect — неизвестные MAC блокируются, порт остаётся up, счётчик обычно не растёт.\n\nRestrict — тоже блокирует, но считает нарушения и может слать syslog или SNMP.\n\nShutdown — порт уходит в err-disabled. Это режим по умолчанию на Cisco. Восстановление: убрать причину и сделать shutdown / no shutdown."
      },
      {
        "heading": "Static, dynamic и sticky",
        "body": "Static MAC задают вручную. Dynamic коммутатор учит сам, но обычно не сохраняет в конфигурации.\n\nSticky учит MAC и пишет его в running-config. После сохранения конфигурации адрес останется и после перезагрузки."
      },
      {
        "heading": "Зачем DHCP Snooping",
        "body": "Чужой DHCP-сервер в пользовательском VLAN может выдать клиенту свой шлюз или DNS. Трафик уйдёт не туда.\n\nDHCP Snooping делит порты на trusted и untrusted. Ответы сервера (Offer, Ack) разрешены только с trusted. На untrusted они отбрасываются."
      },
      {
        "heading": "Почему после включения пропадает DHCP",
        "body": "После включения snooping порты по умолчанию untrusted. Если uplink к серверу или relay не помечен trusted, клиенты перестают получать адреса, хотя сервер жив.\n\nПроверяйте: snooping включён на нужном VLAN, uplink trusted, не зарезан rate limit, Option 82 не ломает relay."
      },
      {
        "heading": "Binding и что дальше",
        "body": "Коммутатор пишет таблицу: MAC, выданный IP, VLAN, порт. Её используют Dynamic ARP Inspection и IP Source Guard — чтобы пускать только трафик, совпадающий с арендой.\n\nСлишком низкий limit rate на клиентском порту режет и обычные Discover. Симптом тот же: «DHCP не работает»."
      }
    ],
    "commands": [
      {
        "title": "Port Security",
        "cmd": "show port-security\nshow port-security interface Gi0/1",
        "note": "Лимит, режим, sticky и счётчик нарушений"
      },
      {
        "title": "err-disabled",
        "cmd": "show interfaces status err-disabled",
        "note": "Порты, которые выключил shutdown"
      },
      {
        "title": "DHCP Snooping",
        "cmd": "show ip dhcp snooping\nshow ip dhcp snooping binding",
        "note": "Trusted-порты и таблица аренд"
      }
    ],
    "sources": [
      "Cisco IOS Security Configuration Guide: Port Security",
      "Cisco IOS IP Addressing Services: DHCP Snooping",
      "RFC 2131"
    ],
    "sourceCommit": "40ad670e5c87e779d3d9b63e7e2934e2b11f0c9d"
  }
};
