import type { Lesson } from './types';

export const LESSON_L2_SVI: Lesson = {
  "id": "l2-svi",
  "title": "SVI: где VLAN, а где IP-адрес коммутатора",
  "category": "CLI · Коммутация и управление",
  "osiLayers": [
    "CLI",
    "L2",
    "L3"
  ],
  "difficulty": "applied",
  "summary": "Запомни главное: VLAN 10 создаёт канальную сеть, а interface Vlan10 — логический интерфейс коммутатора, которому назначают IP. Два разных режима Cisco IOS, две разные задачи.",
  "terms": [
    "SVI",
    "VLAN",
    "access",
    "trunk",
    "running-config",
    "inter-VLAN routing"
  ],
  "blocks": [
    {
      "heading": "Две разные вещи с одним номером 10",
      "body": "Представь этаж с рабочими местами. VLAN 10 — отдельный коридор, по которому устройства обмениваются кадрами. Но у самого коммутатора нет адреса в этом коридоре, пока ты не создашь ему логический IP-интерфейс.\n\nКоманда vlan 10 создаёт VLAN на канальном уровне и переводит тебя в SW1(config-vlan)#. Здесь настраивают, например, имя VLAN. Команда interface vlan 10 выбирает SVI и переводит тебя в SW1(config-if)#. Здесь уже вводится ip address.\n\nКороткая памятка: vlan 10 — создаю сеть; interface vlan 10 — даю коммутатору IP в этой сети."
    },
    {
      "heading": "Тот самый случай из CLI: как выйти из config-vlan",
      "body": "Если видишь SW1(config-vlan)#, не вводи просто 192.168.10.2/24 и не пытайся сделать это через do configure. Сначала выйди на один уровень: exit. Затем введи interface vlan 10. В режиме config-if назначь IP вместе с маской.\n\nSW1(config-vlan)# exit\nSW1(config)# interface vlan 10\nSW1(config-if)# ip address 192.168.10.2 255.255.255.0\nSW1(config-if)# no shutdown\nSW1(config-if)# end\nSW1# show ip interface brief\n\nНа SW2 те же действия, но адрес 192.168.10.3. Здесь не нужно писать /24 после IP: наш Cisco CLI принимает отдельный параметр маски 255.255.255.0."
    },
    {
      "heading": "Зачем SVI нужен обычному L2-коммутатору",
      "body": "На типичном управляемом L2-коммутаторе SVI нужен, чтобы обращаться к самому устройству по IP: для SSH, мониторинга и управления. Например, SW1 получает 192.168.10.2/24, а SW2 — 192.168.10.3/24.\n\nЭто не означает, что коммутатор автоматически маршрутизирует трафик между VLAN 10 и VLAN 20. Для inter-VLAN routing нужен маршрутизатор либо L3-коммутатор с соответствующими функциями и настройками. IP управления и шлюз между VLAN — разные роли."
    },
    {
      "heading": "Почему IP есть, а связи нет",
      "body": "Сама команда no shutdown лишь снимает административное отключение SVI. Чтобы SVI работал, нужная VLAN должна существовать и быть активной; для обычного Cisco также важна пригодность хотя бы одного L2-порта этой VLAN в соответствующем состоянии пересылки. На trunk нужная VLAN должна быть разрешена.\n\nВ текущем NetOps состояние SVI упрощённо определяется по активному разрешённому trunk между двумя коммутаторами — полноценные STP, autostate, ARP и ICMP здесь не моделируются. Команда ping в этом стенде показывает рассчитанную достижимость по конфигурации, а не реальные echo-пакеты.\n\nЕсли не отвечает: проверь VLAN, IP и маску, trunk на обоих концах, no shutdown и состояние линка. Не делай вывод «IP неправильный» только из одного неудачного ping."
    },
    {
      "heading": "Не заучивай вслепую — спроси Cisco",
      "body": "В командном режиме запроси interface ?, чтобы посмотреть допустимые типы интерфейсов; в режиме config-if — ip ? и ip address ?. Подсказка ? зависит от того, в каком режиме ты находишься. Режим видно в приглашении — config, config-vlan или config-if.\n\nДля проверки используй show vlan brief, show interfaces trunk, show ip interface brief и show running-config. Закончив, сохрани конфигурацию: copy running-config startup-config. Иначе изменения могут пропасть после перезагрузки.",
      "practiceLink": "cli-svi-followup"
    }
  ],
  "commands": [
    {
      "title": "Создать VLAN (L2)",
      "cmd": "enable\nconfigure terminal\nvlan 10\nexit",
      "note": "После exit ты снова в глобальном режиме config."
    },
    {
      "title": "Назначить IP управления SW1 (SVI)",
      "cmd": "interface vlan 10\nip address 192.168.10.2 255.255.255.0\nno shutdown\nend",
      "note": "На SW2 назначь 192.168.10.3/24 через маску 255.255.255.0."
    },
    {
      "title": "Проверить интерфейс и VLAN",
      "cmd": "show ip interface brief\nshow vlan brief\nshow interfaces trunk",
      "note": "Наличие IP в конфигурации не гарантирует работоспособность VLAN."
    },
    {
      "title": "Сохранить настройки",
      "cmd": "copy running-config startup-config",
      "note": "Сохраняй отдельно на каждом устройстве."
    }
  ],
  "relatedQuestionIds": [],
  "sources": [
    "Cisco IOS Configuration Fundamentals — interface vlan и режимы конфигурации",
    "Cisco Catalyst — Configuring Layer 3 Interfaces / Switch Virtual Interfaces",
    "NetOps CLI Lab — cisco-two-switch-management-svi (учебная модель)"
  ],
  "professional": {
    "summary": "SVI (Switch Virtual Interface) — логический L3-интерфейс, связанный с VLAN. VLAN database/configuration, SVI configuration и IP routing — самостоятельные механизмы.",
    "terms": [
      "SVI",
      "VLAN",
      "trunk",
      "inter-VLAN routing",
      "running-config"
    ],
    "blocks": [
      {
        "heading": "VLAN ID и Interface Vlan ID — не одно и то же",
        "body": "`vlan 10` в IOS входит в VLAN configuration mode и управляет L2 VLAN object. `interface Vlan10` выбирает routed logical interface этой VLAN. `ip address A.B.C.D M.M.M.M` назначается в interface configuration mode, не в config-vlan. Наличие Vlan10 не создаёт VLAN 10 автоматически на каждой платформе; конфигурацию и VLAN database следует проверять отдельно."
      },
      {
        "heading": "Management-plane SVI против inter-VLAN routing",
        "body": "На L2 Catalyst с единственным management SVI адрес предоставляет IP endpoint для управления устройством, но не маршрутизирует пользовательские пакеты между VLAN. На multilayer switch SVI могут выступать gateway при наличии лицензии, feature set и включённого `ip routing`. Конфигурация SVI сама по себе не доказывает, что L3 forwarding включён."
      },
      {
        "heading": "SVI autostate, administrative и line protocol",
        "body": "Административное no shutdown снимает shutdown с логического интерфейса. Line protocol на реальном Catalyst обычно зависит от статуса VLAN и подходящего активного L2-порта в forwarding для данной VLAN; учитываются platform-specific autostate и STP. В NetOps autostate пока приближённо вычисляется через доступный trunk с активной VLAN — это ограничение симуляции, а не универсальное правило IOS."
      },
      {
        "heading": "Оперативная проверка",
        "body": "`show ip interface brief` покажет адрес, Status и Protocol; `show vlan brief` — существование VLAN; `show interfaces trunk` — допустимые VLAN на транке. На обоих концах отдельно сверяй native/allowed, состояние портов и маску. `ping` в NetOps проверяет модель SVI IPv4 reachability, не выполняя ARP, маршрутизацию и ICMP-транзакции."
      },
      {
        "heading": "Привилегии, синтаксис и сохранение",
        "body": "`SW1(config-vlan)# exit` возвращает в global configuration mode; `interface vlan 10` вводит interface configuration mode. `do` предназначен для запуска EXEC-команд из config modes, а не для перехода в config-if. После `end` — `copy running-config startup-config`; running и startup могут расходиться без сохранения.",
        "practiceLink": "cli-svi-followup"
      }
    ],
    "commands": [
      {
        "title": "SVI конфигурация и проверка",
        "cmd": "configure terminal\ninterface vlan 10\nip address 192.168.10.2 255.255.255.0\nno shutdown\nend\nshow ip interface brief\ncopy running-config startup-config"
      }
    ],
    "sources": [
      "Cisco IOS XE Configuration Guide — Configuring VLAN Interfaces",
      "Cisco Catalyst Switch Configuration Guide — SVI autostate and management interfaces",
      "NetOps CLI Lab — modeled SVI IPv4 reachability"
    ],
    "sourceCommit": "2026-11-12"
  }
};
