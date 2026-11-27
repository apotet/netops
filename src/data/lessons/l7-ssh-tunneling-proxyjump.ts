import type { Lesson } from './types';

export const LESSON_L7_SSH_TUNNELING_PROXYJUMP: Lesson = {
  "id": "l7-ssh-tunneling-proxyjump",
  "title": "SSH-туннелирование: ProxyJump (-J) и локальный проброс портов (-L)",
  "category": "L7 · Защищённый удалённый доступ",
  "osiLayers": [
    "L7"
  ],
  "difficulty": "applied",
  "summary": "Как безопасно подключаться к внутреннему серверу B через jump с помощью ProxyJump (-J) без копирования ключа и без Agent Forwarding (-A), а также где реально открывается TCP-соединение при локальном пробросе -L.",
  "terms": [
    "SSH",
    "ProxyJump",
    "Agent Forwarding",
    "Local Port Forwarding",
    "TCP"
  ],
  "blocks": [
    {
      "heading": "Почему ProxyJump (-J) безопаснее копирования ключа и Agent Forwarding (-A)",
      "body": "Задача (`gap-pack3-19`): ПК `A` должен открыть SSH-сеанс на внутреннем сервере `B`, доступном только через бастион `jump`. При этом приватный ключ пользователя должен остаться строго на `A`, а узлу `jump` нельзя предоставлять доступ к агенту аутентификации `A`.\n\n• **Копировать приватный ключ на `jump`** (даже с парольной фразой) нельзя — ключ оказывается на промежуточном узле.\n• **Включать Agent Forwarding (`-A`)**, даже «только на время ввода команды», нельзя — на `jump` открывается сокет `SSH_AUTH_SOCK`, которым при доступном агенте и разрешающей политике может воспользоваться root (или процесс под вашим UID) на `jump` для подписи входа на другие серверы.\n• **Правильное решение — `ProxyJump` (`ssh -J user@jump user@B`)**: `jump` лишь пробрасывает зашифрованный SSH-обмен `A ↔ B`, а аутентификация на `B` выполняется локальным ключом на `A`.",
      "cheatsheet": {
        "file": "l3-ssh-forwarding-proxyjump.svg",
        "title": "SSH Local Port Forwarding (-L) и ProxyJump (-J) без Agent Forwarding",
        "alt": "Схема локального проброса -L (TCP-соединение jump -> db.internal:5432) и ProxyJump (сквозной SSH A <-> B без ключа и агента на jump).",
        "note": "При -L исходящий TCP к цели создаётся с jump (с эфемерного source port на целевой порт); при -J ключ и агент остаются на ПК A."
      },
      "cheatsheetInitiallyOpen": true
    },
    {
      "heading": "Кратко про Local Port Forwarding (-L): откуда создаётся TCP к цели",
      "body": "При локальном пробросе `ssh -L 127.0.0.1:15432:db.internal:5432 user@jump` локальное приложение подключается к `127.0.0.1:15432` на ПК, а SSH-клиент передаёт запрос по каналу на `jump`. Имя `db.internal` разрешается на `jump`, и именно **`jump` открывает новое TCP-соединение к `db.internal:5432`** (со своего эфемерного порта на порт 5432 базы). Подробный базовый разбор локального проброса также есть в уроке `l7-services`.",
      "relatedLesson": {
        "id": "l7-services",
        "label": "Посмотреть разбор локального SSH-проброса в уроке l7-services"
      }
    }
  ],
  "professional": {
    "summary": "RFC 4254 (канал direct-tcpip), механика ProxyJump (-J / ProxyCommand -W), риски Agent Forwarding (-A) с учётом политики агента и границы базовых ограничений sshd_config на бастионе.",
    "terms": [
      "SSH",
      "ProxyJump",
      "Agent Forwarding",
      "Local Port Forwarding",
      "TCP"
    ],
    "blocks": [
      {
        "heading": "Механика ProxyJump (-J) и канала direct-tcpip (RFC 4254 §7.2)",
        "body": "В OpenSSH `ProxyJump` (`-J user@jump`, эквивалент `ProxyCommand ssh -W %h:%p jump`) открывает на бастионе канал `direct-tcpip` до `B:22` (stdio forwarding без запуска оболочки на `jump`), а второй локальный процесс `ssh` на ПК `A` выполняет **сквозное рукопожатие и аутентификацию напрямую с `B`** локальным ключом `A`.\n\nВ отличие от `-A` (`ForwardAgent yes`), на `jump` не создаётся сокет `SSH_AUTH_SOCK`. При `-A` злоумышленник с правами root (или процессом под вашим UID) на `jump` может использовать активный сокет для подписи challenge-запросов (при загруженных ключах и разрешающей политике агента — даже без кражи самого файла приватного ключа). Подтверждение (`ssh-add -c`) и destination constraints смягчают риск, но не делают `-A` предпочтительнее `ProxyJump`.",
        "cheatsheet": {
          "file": "l3-ssh-forwarding-proxyjump.svg",
          "title": "Канал direct-tcpip в -L (jump → db:5432) и сквозной ProxyJump (-J)",
          "alt": "Диаграмма создания TCP-соединения jump -> db.internal:5432 в -L и сквозного SSH-канала A <-> B в ProxyJump.",
          "note": "ProxyJump оставляет приватный ключ и ssh-agent строго на ПК A; jump видит только шифротекст второго SSH-соединения."
        },
        "cheatsheetInitiallyOpen": true
      },
      {
        "heading": "Базовые ограничения forwarding в sshd_config и их границы на бастионе",
        "body": "На бастионе обычно применяют базовые ограничения forwarding в `/etc/ssh/sshd_config`:\n• `AllowTcpForwarding local` (или `yes`) — разрешает `direct-tcpip` для `-L` и `ProxyJump` (при `no` клиент получает `administratively prohibited`).\n• `PermitOpen` — ограничивает разрешённые целевые `host:port`.\n• `GatewayPorts no` — не даёт `-R` слушать внешние интерфейсы.\n• `AllowAgentForwarding no` — отключает пересылку агента на стороне `sshd`.\n\n**Важная оговорка (OpenBSD `sshd_config(5)`):** само по себе отключение `AllowAgentForwarding no` (и перечисленные опции) **не является полной защитой бастиона** и не принуждает всех пользователей к `ProxyJump`, если у них сохраняется интерактивный shell и возможность запускать собственные forwarders. Для полноценного hardening бастиона эти опции комбинируют с ограничением shell/command, разделением учётных записей и контролем сети.",
        "relatedLesson": {
          "id": "cli-console-ssh-telnet",
          "label": "Повторить основы защищённого SSH-доступа к сетевым устройствам"
        }
      }
    ],
    "commands": [
      {
        "title": "Подключение через ProxyJump (OpenSSH 7.3+)",
        "cmd": "ssh -J ops@jump ops@server-b.internal",
        "note": "Сквозной SSH A↔B через бастион с аутентификацией локальным ключом на ПК A."
      },
      {
        "title": "Безопасный профиль в ~/.ssh/config (OpenSSH)",
        "cmd": "Host server-b\n  HostName server-b.internal\n  User ops\n  ProxyJump ops@jump\n  ForwardAgent no",
        "note": "Явно закрепляет ProxyJump и отключает ForwardAgent."
      },
      {
        "title": "Локальный проброс порта на loopback (OpenSSH)",
        "cmd": "ssh -N -L 127.0.0.1:15432:db.internal:5432 ops@jump",
        "note": "Привязка к 127.0.0.1 ограничивает доступ локальным ПК; исходящий TCP к db.internal:5432 открывает jump."
      }
    ],
    "sources": [
      "RFC 4254 — The Secure Shell (SSH) Connection Protocol (Section 7.2 TCP/IP Forwarding)",
      "OpenBSD ssh_config(5) — ProxyJump, LocalForward, ForwardAgent",
      "OpenBSD sshd_config(5) — AllowTcpForwarding, AllowAgentForwarding, PermitOpen"
    ]
  },
  "relatedQuestionIds": [
    "gap-pack3-19"
  ],
  "plainKnowledgeCheck": {
    "title": "Проверь себя: SSH ProxyJump и -L — простыми словами",
    "intro": "Три вопроса по безопасному входу через бастион и локальному пробросу.",
    "questions": [
      {
        "id": "l3-ssh-plain-01",
        "prompt": "Почему для входа на сервер B через jump рекомендуется ProxyJump (-J) вместо Agent Forwarding (-A)?",
        "choices": [
          {
            "id": "A",
            "label": "ProxyJump не требует аутентификации вообще"
          },
          {
            "id": "B",
            "label": "ProxyJump оставляет ключ и агент на ПК A и шифрует сеанс A↔B сквозным образом, не открывая сокет агента на jump"
          },
          {
            "id": "C",
            "label": "Agent Forwarding работает только по протоколу Telnet"
          },
          {
            "id": "D",
            "label": "ProxyJump отключает firewall на сервере B"
          }
        ],
        "correctChoiceId": "B",
        "explanation": "При -A на jump появляется сокет SSH_AUTH_SOCK; при ProxyJump обмен A↔B шифруется сквозным образом, а ключ и агент остаются на ПК A."
      },
      {
        "id": "l3-ssh-plain-02",
        "prompt": "При команде `ssh -L 127.0.0.1:15432:db.internal:5432 user@jump` какой узел разрешает имя `db.internal` и открывает новое TCP-соединение к порту 5432?",
        "choices": [
          {
            "id": "A",
            "label": "Рабочий ПК напрямую, минуя jump"
          },
          {
            "id": "B",
            "label": "Сама база db.internal подключается к 127.0.0.1:15432"
          },
          {
            "id": "C",
            "label": "Внешний DNS-сервер"
          },
          {
            "id": "D",
            "label": "Узел jump после получения запроса по SSH-каналу от ПК (с эфемерного source port на db.internal:5432)"
          }
        ],
        "correctChoiceId": "D",
        "explanation": "При локальном пробросе -L ПК передаёт трафик в SSH-канал, а DNS-разрешение и исходящее TCP-соединение к db.internal:5432 выполняет сервер jump."
      },
      {
        "id": "l3-ssh-plain-03",
        "prompt": "Зачем в локальном пробросе явно указывать `127.0.0.1:15432` вместо `0.0.0.0:15432`?",
        "choices": [
          {
            "id": "A",
            "label": "Чтобы локальный порт был доступен только приложениям на вашем ПК, а не всей локальной сети"
          },
          {
            "id": "B",
            "label": "Чтобы удвоить пропускную способность SSH"
          },
          {
            "id": "C",
            "label": "Потому что OpenSSH не поддерживает 0.0.0.0"
          },
          {
            "id": "D",
            "label": "Чтобы база данных увидела адрес 127.0.0.1 вместо IP узла jump"
          }
        ],
        "correctChoiceId": "A",
        "explanation": "Привязка к loopback (127.0.0.1) ограничивает подключение к проброшенному порту только локальным хостом."
      }
    ]
  },
  "knowledgeCheck": {
    "title": "Проверь себя: SSH ProxyJump и туннели — по делу",
    "intro": "Четыре инженерных сценария по RFC 4254 и OpenSSH.",
    "questions": [
      {
        "id": "l3-ssh-pro-01",
        "prompt": "ПК A должен открыть SSH-сеанс на B, доступный только через jump. Закрытый ключ должен оставаться на A, а jump нельзя давать доступ к агенту аутентификации A. Как организовать подключение?",
        "choices": [
          {
            "id": "A",
            "label": "Войти на jump с agent forwarding (-A) и оттуда запустить SSH к B"
          },
          {
            "id": "B",
            "label": "Скопировать защищённый парольной фразой ключ на jump и подключиться к B"
          },
          {
            "id": "C",
            "label": "Использовать ProxyJump: передать SSH-обмен A↔B через jump и выполнить вход на B локальным ключом A"
          },
          {
            "id": "D",
            "label": "Включить agent forwarding (-A) только на время ввода команды"
          }
        ],
        "correctChoiceId": "C",
        "explanation": "Только ProxyJump (-J) пропускает сквозной шифрованный SSH-обмен A↔B через jump без копирования ключа и без экспонирования ssh-agent."
      },
      {
        "id": "l3-ssh-pro-02",
        "prompt": "При подключении к локальному пробросу -L в `ssh -v` появляется `channel 2: open failed: administratively prohibited`. Где наиболее вероятная причина?",
        "choices": [
          {
            "id": "A",
            "label": "На рабочем ПК занят локальный порт 15432"
          },
          {
            "id": "B",
            "label": "На jump в sshd_config запрещён TCP forwarding (`AllowTcpForwarding no`) или цель не разрешена в `PermitOpen`"
          },
          {
            "id": "C",
            "label": "Неверный пароль пользователя в базе данных"
          },
          {
            "id": "D",
            "label": "На jump отключён протокол HTTP/2"
          }
        ],
        "correctChoiceId": "B",
        "explanation": "Статус `administratively prohibited` возвращает демон sshd на jump, когда политика запрещает открытие канала direct-tcpip."
      },
      {
        "id": "l3-ssh-pro-03",
        "prompt": "Достаточно ли прописать на бастионе `AllowAgentForwarding no`, чтобы гарантированно исключить любые обходные forwarders при наличии у пользователей интерактивного shell?",
        "choices": [
          {
            "id": "A",
            "label": "Да: одна эта опция полностью защищает бастион от любых угроз"
          },
          {
            "id": "B",
            "label": "Да, если дополнительно указать порт 22"
          },
          {
            "id": "C",
            "label": "Нет: AllowAgentForwarding no блокирует работу ProxyJump"
          },
          {
            "id": "D",
            "label": "Нет: согласно OpenBSD sshd_config(5), при наличии shell пользователи могут установить собственные forwarders — нужен комплексный hardening бастиона"
          }
        ],
        "correctChoiceId": "D",
        "explanation": "Опции forwarding — лишь базовые ограничения; при наличии интерактивного shell на бастионе требуется ограничение shell/command и комплексная модель безопасности."
      },
      {
        "id": "l3-ssh-pro-04",
        "prompt": "В чём заключается риск `ssh -A` (Agent Forwarding) на промежуточном jump-хосте?",
        "choices": [
          {
            "id": "A",
            "label": "Root или процесс под вашим UID на jump может использовать активный сокет SSH_AUTH_SOCK для подписи входа на другие серверы (при доступном агенте и разрешающей политике), даже не получая файл приватного ключа"
          },
          {
            "id": "B",
            "label": "Команда -A автоматически копирует файл id_ed25519 в /tmp на jump"
          },
          {
            "id": "C",
            "label": "Команда -A отключает шифрование канала до jump"
          },
          {
            "id": "D",
            "label": "Команда -A открывает порт 15432 на 0.0.0.0"
          }
        ],
        "correctChoiceId": "A",
        "explanation": "Атакующему на jump не нужен сам файл приватного ключа: пока активен сокет агента и политика не блокирует запрос, он может подписывать challenge через SSH_AUTH_SOCK."
      }
    ]
  },
  "sources": [
    "RFC 4254 — SSH Connection Protocol",
    "OpenBSD ssh_config(5)",
    "OpenBSD sshd_config(5)"
  ]
};
