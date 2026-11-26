import type { Lesson } from './types';

export const LESSON_L2_PTP_TIME_SYNC: Lesson = {
  "id": "l2-ptp-time-sync",
  "title": "PTP (IEEE 1588): точная синхронизация времени в сетях",
  "category": "L2–L7 · Синхронизация времени",
  "osiLayers": [
    "L2",
    "L3",
    "L4",
    "L7"
  ],
  "difficulty": "applied",
  "summary": "Зачем нужен PTP там, где не хватает NTP: hardware и software timestamping, роли часов (GM, BC, TC, OC), выбор источника по BMCA, 1-step/2-step коррекция и оценка максимальной ошибки за смену.",
  "terms": [
    "PTP",
    "IEEE 1588",
    "NTP",
    "Grandmaster",
    "Boundary Clock",
    "Transparent Clock",
    "BMCA"
  ],
  "blocks": [
    {
      "heading": "Зачем нужен PTP, если уже есть NTP",
      "body": "Для обычных офисных серверов и журналов (Syslog) обычно достаточно протокола NTP с точностью до единиц миллисекунд (1–10 мс).\n\nНо в энергетике (IEC 61850), телекоме (5G), вещании (SMPTE ST 2110) и промышленной автоматизации часто требуется точность лучше 1 микросекунды. Для таких задач применяют PTP — Precision Time Protocol (IEEE 1588v2). Важно: PTP поддерживает **два режима снятия меток времени**:\n• **Hardware timestamping** (метки ставятся прямо в сетевом чипе PHY/MAC, минуя задержки стека ОС) — обычно необходим для субмикросекундных бюджетов;\n• **Software timestamping** (метки ставятся в сетевом стеке / системных часах ОС) — работает на обычных NIC без аппаратной поддержки, но сильнее подвержен джиттеру ОС и планировщика.\n\nСамо название «PTP» или наличие аппаратных меток ещё не гарантирует точность: достижимый результат всегда подтверждают измерениями максимального расхождения на реальной нагрузке.",
      "cheatsheet": {
        "file": "l3-ptp-ieee1588-sync.svg",
        "title": "PTP (IEEE 1588): иерархия часов и расчёт смещения по 4 меткам (t1–t4)",
        "alt": "Иерархия Grandmaster -> Boundary/Transparent Clock -> Ordinary Clock и четырёхшаговый обмен Sync, Follow_Up, Delay_Req, Delay_Resp с формулами задержки и смещения.",
        "note": "Для субмикросекундных профилей обычно применяют hardware timestamping и PTP-aware сеть (BC/TC); реальную точность оценивают по максимуму ошибки за весь рабочий интервал."
      },
      "cheatsheetInitiallyOpen": true
    },
    {
      "heading": "Роли часов: Grandmaster, Boundary, Transparent и Ordinary",
      "body": "В сети PTP все устройства выстраиваются в чёткую иерархию:\n• Grandmaster Clock (GM) — главный эталон времени (обычно получает сигнал от GPS/ГЛОНАСС).\n• Ordinary Clock (OC) — конечное устройство с одним PTP-портом (либо сам Grandmaster, либо ведомый Slave/Follower).\n• Boundary Clock (BC) — PTP-коммутатор, который сам синхронизируется от старшего источника на одном порту и раздаёт время дальше как Master на остальных портах.\n• Transparent Clock (TC) — PTP-коммутатор, который пропускает сообщения PTP насквозь, но измеряет точное время их прохождения внутри себя (residence time) и записывает эту поправку в поле Correction Field."
    },
    {
      "heading": "Как выбирается главный источник: алгоритм BMCA",
      "body": "Чтобы в сети не было споров, чьё время главнее, все часы рассылают сообщения Announce и запускают алгоритм BMCA (Best Master Clock Algorithm). По шагам сравниваются Priority1, класс и точность часов (clockClass, clockAccuracy), дисперсия, Priority2 и уникальный Clock Identity.\n\nЕсли основной Grandmaster пропадает, BMCA автоматически выбирает резервный источник без ручного переключения."
    },
    {
      "heading": "Как Slave вычисляет задержку и смещение часов",
      "body": "В классическом двухшаговом (2-step) обмене участвуют 4 метки времени:\n1. Master отправляет `Sync` в момент `t1`, Slave принимает его в `t2`.\n2. Master присылает `Follow_Up` с точным значением `t1`.\n3. Slave отправляет `Delay_Req` в момент `t3`, Master принимает его в `t4`.\n4. Master возвращает `Delay_Resp` с точным `t4`.\n\nПо этим 4 числам Slave вычисляет задержку пути и смещение своих часов (offset) относительно Master — при условии, что путь туда и обратно симметричен."
    },
    {
      "heading": "Как проверять бюджет точности за смену: единицы (мкс/мс), максимум и free-run",
      "body": "Допустим, к системе предъявлено требование: **расхождение не более 1 мкс на протяжении всей рабочей смены**. При приёмке нельзя смотреть только на название технологии или на красивую цифру в первые 5 минут — оценивают **наибольшее измеренное расхождение за всю смену**, включая переключения и потерю синхронизации:\n• Переводи единицы внимательно: **`0,3 мс = 300 мкс`** (в 300 раз хуже лимита 1 мкс!).\n• Начальные `0,2 мкс` не спасают, если при уходе часов в свободный ход (free-run / holdover) ошибка выросла до `15 мкс` — бюджет 1 мкс нарушен.\n• Сравнивай hardware и software timestamping именно по фактически измеренному максимуму за всю смену."
    },
    {
      "heading": "Пример 1-step E2E Transparent Clock: как складывается Correction Field",
      "body": "В одноступенчатом (**1-step**) режиме E2E Transparent Clock (TC) коммутатор не отправляет отдельное сообщение `Follow_Up` и не становится новым источником `Sync` (в отличие от Boundary Clock). Он пропускает исходный `Sync` дальше и прямо на лету **прибавляет** своё время пребывания (residence time) к уже существующему полю `correctionField`.\n\n**Конкретный пример:** пакет `Sync` пришёл на 1-step E2E TC со значением `correctionField = 1,2 мкс`, а время прохождения внутри коммутатора (`residence time`) составило `0,8 мкс`. На выходе коммутатор сохраняет исходного отправителя `Sync`, а в `correctionField` записывает сумму: **`1,2 + 0,8 = 2,0 мкс`** (не заменяет на 0,8 и не вычитает!)."
    }
  ],
  "professional": {
    "summary": "IEEE 1588-2008/2019 (PTPv2), профили (Default, Power C37.238, Telecom G.8275.1), 1-step vs 2-step, E2E vs P2P delay mechanism, асимметрия пути и диагностика ptp4l / промышленных коммутаторов.",
    "terms": [
      "PTP",
      "IEEE 1588",
      "Grandmaster",
      "Boundary Clock",
      "Transparent Clock",
      "BMCA",
      "PDV",
      "NTP"
    ],
    "blocks": [
      {
        "heading": "Транспорт, профили и механизмы задержки (E2E vs P2P)",
        "body": "PTP может работать поверх L2 Ethernet (EtherType 0x88F7, без IP-заголовка — популярно в энергопрофилях и G.8275.1) или поверх UDP/IPv4/IPv6 (порты UDP 319 для Event-сообщений `Sync`/`Delay_Req` и UDP 320 для General-сообщений `Announce`/`Follow_Up`/`Delay_Resp`).\n\nСуществует два механизма измерения задержки:\n• End-to-End (E2E): Slave измеряет полный путь до Master (`Delay_Req`/`Delay_Resp`).\n• Peer-to-Peer (P2P): каждый линк измеряет задержку до ближайшего соседа (`Pdelay_Req`/`Pdelay_Resp`), что ускоряет перестройку при переключении топологии (применяется в энергетике IEC 61850 / IEEE C37.238).\n\nВ одном домене PTP (`domainNumber`) и на одном участке все устройства обязаны использовать совместимый профиль, транспорт и механизм задержки.",
        "cheatsheet": {
          "file": "l3-ptp-ieee1588-sync.svg",
          "title": "Архитектура PTP (BC/TC) и формулы расчёта по t1–t4",
          "alt": "Иерархия часов PTP и диаграмма обмена Sync/Follow_Up/Delay_Req/Delay_Resp.",
          "note": "Ошибка асимметрии пути Δt напрямую даёт постоянную ошибку синхронизации Δt/2, которую формула t1–t4 сама не видит."
        },
        "cheatsheetInitiallyOpen": true
      },
      {
        "heading": "Почему обычный коммутатор и асимметрия ломают точность",
        "body": "Формула смещения `offset = ((t2 − t1) − (t4 − t3)) / 2` предполагает равенство задержек `Master → Slave` и `Slave → Master`. Переменная задержка в очередях обычного (PTP-unaware) коммутатора — Packet Delay Variation (PDV) — превращается в шум, а постоянная асимметрия (разные длины волокон Tx/Rx, BiDi-оптика без компенсации) создаёт сдвиг ровно на половину разницы задержек.\n\nДля жёстких бюджетов ошибки (например, ≤ 1 мкс) обычно требуются hardware timestamping, промежуточные Boundary Clock или Transparent Clock, приоритетный QoS и контроль асимметрии; однако окончательную пригодность любого решения (как hardware, так и software) оценивают по максимальной измеренной ошибке в заданных режимах."
      },
      {
        "heading": "Оценка пригодности по бюджету ошибки за смену (HW/SW, мс→мкс, holdover)",
        "body": "Разбор инженерной задачи (`review-ptp-16` — лимит ≤ 1 мкс за всю рабочую смену по наибольшему измеренному расхождению):\n1. **Hardware vs Software timestamping (`ptp4l -H` vs `-S`):** программные метки зависят от стека ОС и планировщика, но при выборе варианта смотрят не на ярлык «PTP», а на фактический максимум расхождения.\n2. **Контроль размерности:** `0,3 мс = 300 мкс >> 1 мкс` — частая ловушка путаницы миллисекунд и микросекунд.\n3. **Максимум за всю смену и free-run/holdover:** если в штатном режиме было `0,2 мкс`, но при переключении или свободном ходе расхождение дошло до `15 мкс`, требование «не более 1 мкс на протяжении смены» **не выполнено**.\n4. **Вывод:** проходит только схема, у которой подтверждённый максимум расхождения за всю смену (включая переходные режимы) не превышает 1 мкс."
      },
      {
        "heading": "1-step E2E Transparent Clock: суммирование correctionField и отличие от BC и 2-step",
        "body": "Разбор механики `review-ptp-18`: одноступенчатый (1-step) End-to-End Transparent Clock получает `Sync` с `correctionField = 1,2 мкс`, измеряет собственное время прохождения `residence time = 0,8 мкс` и обновляет поле прямо в выходящем `Sync`:\n• **Итоговое `correctionField`:** `1,2 + 0,8 = 2,0 мкс` (поправка кумулятивно суммируется по всем TC вдоль пути).\n• **Источник `Sync` не меняется:** в отличие от Boundary Clock (который завершает порт как Slave и генерирует собственные `Sync` как Master), TC остаётся прозрачным и не подменяет исходный Master.\n• **Отличие от 2-step:** в 1-step TC поправка вносится непосредственно в `Sync` на выходе; отдельный `Follow_Up` для передачи residence time не требуется."
      },
      {
        "heading": "Кейс 1. Ведомое устройство не синхронизируется с Grandmaster",
        "body": "Симптом: статус Slave остаётся `LISTENING` или `UNCALIBRATED`, либо `master offset` «прыгает» на сотни микросекунд.\n\nДиагностика (read-only): (1) сверь `domainNumber`, транспорт (L2 0x88F7 vs UDP 319/320) и механизм задержки (E2E vs P2P) на обоих концах; (2) проверь, приходят ли `Announce` и `Sync` (в Wireshark фильтр `ptp`); (3) проверь, не стоит ли на пути обычный коммутатор без BC/TC или не блокирует ли IGMP Snooping / ACL мультикаст `224.0.1.129`; (4) на Linux смотри `pmc -u -b 0 'GET CURRENT_DATA_SET'` и логи `ptp4l` (на Cisco IE/Catalyst — `show ptp clock`, `show ptp parent`).",
        "relatedLesson": {
          "id": "l7-udp-transactions-tftp-ntp-snmp",
          "label": "Сравнить с работой NTP (UDP/123) в уроке по UDP-сервисам"
        }
      },
      {
        "heading": "Кейс 2. Два Grandmaster в одной сети после сбоя",
        "body": "Если в сети появляются «два острова» со своими Grandmaster, проверь, не фильтруются ли `Announce`-сообщения на одном из транков/портов и одинаков ли `domainNumber`. Если `Priority1` на резервном источнике выставлен ниже (число меньше), чем на основном GNSS-эталоне, BMCA ошибочно выберет менее точные часы — всегда проверяй `Priority1` перед `clockClass`."
      }
    ],
    "commands": [
      {
        "title": "Статус часов и родителя PTP (Cisco IOS/IOS XE)",
        "cmd": "show ptp clock  |  show ptp parent",
        "note": "Команда применима к поддерживаемым моделям (например, Catalyst IE3x00/9300 с PTP)."
      },
      {
        "title": "Диагностика LinuxPTP (ptp4l / pmc)",
        "cmd": "pmc -u -b 0 'GET CURRENT_DATA_SET'",
        "note": "Показывает `offsetFromMaster` и `meanPathDelay` в наносекундах."
      },
      {
        "title": "Фильтр Wireshark для PTP",
        "cmd": "ptp || udp.port == 319 || udp.port == 320 || eth.type == 0x88f7",
        "note": "Позволяет проверить наличие Announce, Sync, Follow_Up, Delay_Req/Resp и Correction Field."
      }
    ],
    "sources": [
      "IEEE Std 1588-2008 / 1588-2019 — Precision Clock Synchronization Protocol (PTP)",
      "LinuxPTP (ptp4l / pmc) Documentation"
    ]
  },
  "relatedQuestionIds": [
    "review-ptp-16",
    "review-ptp-18"
  ],
  "plainKnowledgeCheck": {
    "title": "Проверь себя: PTP — простыми словами",
    "intro": "Три вопроса по основам IEEE 1588.",
    "questions": [
      {
        "id": "l3-ptp-plain-01",
        "prompt": "Зачем применяют PTP (IEEE 1588) вместо обычного NTP в энергетике, 5G и промышленной автоматизации?",
        "choices": [
          {
            "id": "A",
            "label": "NTP не работает в локальных сетях"
          },
          {
            "id": "B",
            "label": "PTP работает только без кабелей"
          },
          {
            "id": "C",
            "label": "PTP при использовании hardware timestamping и PTP-aware сети способен обеспечивать субмикросекундную точность (достижимый результат подтверждают измерениями)"
          },
          {
            "id": "D",
            "label": "PTP заменяет маршрутизацию OSPF"
          }
        ],
        "correctChoiceId": "C",
        "explanation": "PTP поддерживает как аппаратные (PHY/MAC), так и программные метки времени; для субмикросекундных бюджетов обычно применяют hardware timestamping и BC/TC-коммутаторы с проверкой максимальной ошибки за смену."
      },
      {
        "id": "l3-ptp-plain-02",
        "prompt": "Что делает Transparent Clock (TC) при прохождении пакета PTP через коммутатор?",
        "choices": [
          {
            "id": "A",
            "label": "Блокирует все пакеты PTP"
          },
          {
            "id": "B",
            "label": "Преобразует PTP в NTP"
          },
          {
            "id": "C",
            "label": "Меняет MAC-адрес Grandmaster"
          },
          {
            "id": "D",
            "label": "Измеряет время пребывания пакета внутри себя и добавляет поправку в Correction Field"
          }
        ],
        "correctChoiceId": "D",
        "explanation": "Transparent Clock компенсирует собственную задержку прохождения (residence time), чтобы очереди коммутатора не искажали расчёт смещения."
      },
      {
        "id": "l3-ptp-plain-03",
        "prompt": "Какой алгоритм автоматически выбирает главный источник времени (Grandmaster) в сети PTP?",
        "choices": [
          {
            "id": "A",
            "label": "BMCA (Best Master Clock Algorithm)"
          },
          {
            "id": "B",
            "label": "STP"
          },
          {
            "id": "C",
            "label": "LACP"
          },
          {
            "id": "D",
            "label": "DHCP"
          }
        ],
        "correctChoiceId": "A",
        "explanation": "BMCA сравнивает параметры из сообщений Announce (Priority1, clockClass, clockAccuracy, Priority2, Clock ID) и выбирает лучший источник."
      }
    ]
  },
  "knowledgeCheck": {
    "title": "Проверь себя: PTP (IEEE 1588) — по делу",
    "intro": "Четыре инженерных сценария по IEEE 1588 и диагностике.",
    "questions": [
      {
        "id": "l3-ptp-pro-01",
        "prompt": "В двухшаговом (2-step) PTP-обмене измерены t1, t2, t3, t4, но задержка в направлении Master→Slave на 20 мкс больше, чем Slave→Master (асимметрия оптики). Как это повлияет на синхронизацию без ручной коррекции?",
        "choices": [
          {
            "id": "A",
            "label": "Никак: формула t1–t4 автоматически устраняет любую асимметрию"
          },
          {
            "id": "B",
            "label": "BMCA переключится на NTP"
          },
          {
            "id": "C",
            "label": "Увеличатся только номера UDP-портов"
          },
          {
            "id": "D",
            "label": "Возникнет постоянная ошибка смещения (offset) около 10 мкс (половина асимметрии)"
          }
        ],
        "correctChoiceId": "D",
        "explanation": "Расчёт offset = ((t2 − t1) − (t4 − t3)) / 2 предполагает симметричность пути; постоянная асимметрия Δt вносит неустранимую ошибку Δt/2."
      },
      {
        "id": "l3-ptp-pro-02",
        "prompt": "Какие UDP-порты используются при работе PTP поверх IPv4/IPv6?",
        "choices": [
          {
            "id": "A",
            "label": "UDP 319 (Event: Sync/Delay_Req) и UDP 320 (General: Announce/Follow_Up/Delay_Resp)"
          },
          {
            "id": "B",
            "label": "UDP 123 (все сообщения)"
          },
          {
            "id": "C",
            "label": "UDP 161 и UDP 162"
          },
          {
            "id": "D",
            "label": "TCP 443 и TCP 80"
          }
        ],
        "correctChoiceId": "A",
        "explanation": "В PTP over UDP/IP порт 319 выделен под критичные ко времени Event-сообщения, а 320 — под General-сообщения."
      },
      {
        "id": "l3-ptp-pro-03",
        "prompt": "Между Grandmaster и реле РЗА поставили обычный неуправляемый офисный коммутатор без поддержки PTP. Почему точность резко ухудшается под нагрузкой?",
        "choices": [
          {
            "id": "A",
            "label": "Обычный коммутатор не поддерживает Ethernet"
          },
          {
            "id": "B",
            "label": "Обычный коммутатор переписывает domainNumber"
          },
          {
            "id": "C",
            "label": "Обычный коммутатор вносит переменную задержку очередей (PDV) и не обновляет Correction Field"
          },
          {
            "id": "D",
            "label": "Обычный коммутатор блокирует IPv4"
          }
        ],
        "correctChoiceId": "C",
        "explanation": "Без функций Boundary Clock или Transparent Clock переменная задержка буферизации (PDV) напрямую искажает метки t2 и t4."
      },
      {
        "id": "l3-ptp-pro-04",
        "prompt": "В BMCA у часов A задано Priority1=128 и clockClass=6 (GPS), а у часов B — Priority1=64 и clockClass=248 (внутренний кварц). Какие часы станут Grandmaster?",
        "choices": [
          {
            "id": "A",
            "label": "Часы A, потому что GPS всегда побеждает"
          },
          {
            "id": "B",
            "label": "Часы B, потому что Priority1 сравнивается ДО clockClass и меньшее значение выигрывает"
          },
          {
            "id": "C",
            "label": "Оба станут Grandmaster одновременно"
          },
          {
            "id": "D",
            "label": "Выбор определит только MAC-адрес"
          }
        ],
        "correctChoiceId": "B",
        "explanation": "В BMCA Priority1 имеет наивысший приоритет над clockClass (меньшее число лучше), поэтому ошибка в Priority1 способна увести всю сеть на неточный источник."
      }
    ]
  },
  "sources": [
    "IEEE Std 1588-2008 / 1588-2019 — PTP",
    "LinuxPTP Documentation"
  ]
};
