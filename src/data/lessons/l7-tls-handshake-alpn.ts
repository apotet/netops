import type { Lesson } from './types';

export const LESSON_L7_TLS_HANDSHAKE_ALPN: Lesson = {
  "id": "l7-tls-handshake-alpn",
  "title": "TLS 1.3 Handshake и согласование ALPN",
  "category": "L7 · Безопасность и веб-протоколы",
  "osiLayers": [
    "L7"
  ],
  "difficulty": "applied",
  "summary": "Пошаговый цикл полного TLS 1.3 1-RTT handshake (без PSK и 0-RTT): проверка Certificate, CertificateVerify и Finished до отправки HTTP, переход к HTTP/2 после ALPN 'h2' и краткая роль SNI.",
  "terms": [
    "TLS 1.3",
    "TLS",
    "ALPN",
    "CertificateVerify",
    "SNI",
    "SAN",
    "HTTPS"
  ],
  "blocks": [
    {
      "heading": "Почему нельзя отправлять HTTP-данные сразу после ServerHello",
      "body": "После TCP 3-way handshake начинается TLS 1.3 handshake. В полном рукопожатии (без PSK и 0-RTT early data) получение `ServerHello` с выбранным шифром ещё НЕ подтверждает личность сервера.\n\nКлиент штатно отправляет обычные HTTP-данные только после того, как проверит цепочку сертификатов (`Certificate`), цифровую подпись транскрипта (`CertificateVerify`) и контрольный тег сервера (`Finished`), а затем отправит собственный `Finished`.",
      "cheatsheet": {
        "file": "l3-tls13-handshake-alpn.svg",
        "title": "TLS 1.3 Handshake (1-RTT), выбор сертификата по SNI и переход к HTTP/2 через ALPN",
        "alt": "Диаграмма обмена ClientHello (SNI, ALPN), ServerHello, зашифрованного блока сервера (EncryptedExtensions, Certificate, CertificateVerify, Finished), клиентского Finished и старта HTTP/2.",
        "note": "HTTP-заголовок Host передаётся только после установления TLS; для выбора сертификата на общем IP нужен SNI в ClientHello."
      },
      "cheatsheetInitiallyOpen": true
    },
    {
      "heading": "Кратко про SNI: как сервер выбирает сертификат на одном IP",
      "body": "Если на одном IP-адресе размещены `a.example.test` и `b.example.test` со своими сертификатами, сервер должен выбрать нужный сертификат ещё до того, как клиент отправит HTTP-запрос с заголовком `Host`. Для этого клиент передаёт `b.example.test` в расширении **SNI** сообщения `ClientHello` → сервер выбирает сертификат `b` → завершается TLS-рукопожатие → и только затем передаётся защищённый запрос страницы.",
      "relatedLesson": {
        "id": "tls-sni",
        "label": "Открыть подробный урок по SNI, Host и правилам проверки SAN"
      }
    },
    {
      "heading": "Согласование ALPN «h2»: как сразу начать HTTP/2 без Upgrade: h2c",
      "body": "Чтобы не тратить лишние обмены на выбор версии HTTP, клиент в `ClientHello` прикладывает список протоколов в расширении **ALPN** (например, `h2`, `http/1.1`), а сервер сообщает выбор в `EncryptedExtensions`.\n\nЕсли TLS-рукопожатие завершилось и сервер выбрал ALPN `\"h2\"`, клиент НЕ отправляет текстовый `GET / HTTP/1.1` и НЕ отправляет `Upgrade: h2c` (заголовок `h2c` относится только к незашифрованному HTTP). Клиент сразу передаёт 24-байтный **HTTP/2 connection preface** и бинарные кадры HTTP/2 (`SETTINGS`, `HEADERS`).",
      "relatedLesson": {
        "id": "l7-http-status-basics",
        "label": "Повторить основы HTTP и коды ответов"
      }
    }
  ],
  "professional": {
    "summary": "Стейт-машина TLS 1.3 1-RTT (RFC 8446), роль CertificateVerify и Finished, выбор сертификата по SNI, старт HTTP/2 после ALPN 'h2' (RFC 7301 / 9113) и диагностика с учётом шифрования EncryptedExtensions.",
    "terms": [
      "TLS 1.3",
      "TLS",
      "ALPN",
      "CertificateVerify",
      "SNI",
      "SAN",
      "HTTPS"
    ],
    "blocks": [
      {
        "heading": "Стейт-машина TLS 1.3 (RFC 8446): момент перехода к Application Data",
        "body": "В полном TLS 1.3 1-RTT handshake без PSK и `early_data`:\n1. Клиент шлёт `ClientHello` (`supported_versions`, `cipher_suites`, `key_share`, `SNI`, `ALPN`).\n2. Сервер отвечает `ServerHello` (`cipher_suite`, `key_share`), после чего обе стороны выводят Handshake Traffic Keys, и сервер отправляет зашифрованный блок: `{EncryptedExtensions}` (включая выбранный ALPN), `{Certificate}`, `{CertificateVerify}` (подпись транскрипта приватным ключом сертификата) и `{Finished}` (MAC всего транскрипта).\n3. Клиент обязан провалидировать **все три** элемента (`Certificate` + `CertificateVerify` + серверный `Finished`), отправить собственный `{Finished}` и только после этого передавать обычные HTTP Application Data.\n\nПолные `(EC)DHE`-рукопожатия TLS 1.3 обеспечивают прямую секретность (PFS); режимы `PSK-only` и `0-RTT` имеют отдельные свойства безопасности.",
        "cheatsheet": {
          "file": "l3-tls13-handshake-alpn.svg",
          "title": "TLS 1.3 1-RTT Handshake и ALPN (RFC 8446 / 7301 / 9113)",
          "alt": "Последовательность сообщений TLS 1.3 handshake, выбор сертификата по SNI и старт HTTP/2 после ALPN h2.",
          "note": "Без CertificateVerify чужой публичный сертификат не доказывает владение ключом; без Finished не защищена целостность транскрипта."
        },
        "cheatsheetInitiallyOpen": true
      },
      {
        "heading": "Выбор сертификата на общем IP через SNI до передачи HTTP-запроса",
        "body": "В сценарии `l57-x18` на одном IP размещены `a.example.test` и `b.example.test` с отдельными сертификатами. HTTP-запрос (и заголовок `Host`) ещё не передан до окончания TLS-рукопожатия, а подменять сертификат после завершения handshake нельзя. Поэтому последовательность однозначна: клиент указывает `b.example.test` в расширении **SNI** сообщения `ClientHello` → сервер выбирает сертификат `b` → завершается TLS-рукопожатие → передаётся защищённый HTTP-запрос. Подробные правила сопоставления SAN и wildcard (включая кейс `l57-d01`) разобраны в профильном уроке `tls-sni`.",
        "relatedLesson": {
          "id": "tls-sni",
          "label": "Перейти к полному разбору SNI и SAN в уроке tls-sni"
        }
      },
      {
        "heading": "ALPN 'h2' → HTTP/2 (RFC 7301, RFC 9113 §3.3) и ограничения захвата трафика",
        "body": "Согласование ALPN `\"h2\"` в `EncryptedExtensions` напрямую задаёт протокол прикладного уровня поверх данного TLS-соединения (`gap-pack3-20`). Клиент начинает обмен с 24-октетного HTTP/2 connection preface (`PRI * HTTP/2.0\\r\\n\\r\\nSM\\r\\n\\r\\n`) и бинарных кадров HTTP/2 (`SETTINGS`, `HEADERS` с псевдозаголовками `:method`, `:scheme`, `:authority`, `:path`). Отправка `GET / HTTP/1.1` или `Upgrade: h2c` нарушает согласованный протокол.\n\n**Важный нюанс диагностики в Wireshark:** расширение `SNI` в `ClientHello` обычно видно в открытом виде, но выбранный сервером `ALPN` передаётся внутри зашифрованного `EncryptedExtensions`. В обычном зашифрованном дампе без ключей сессии (например, `SSLKEYLOGFILE`, подключённого в настройках TLS Wireshark) вы увидите зашифрованные handshake-записи, а не открытое значение выбранного ALPN."
      }
    ],
    "commands": [
      {
        "title": "Проверка TLS 1.3, SNI и ALPN (OpenSSL — пример на учебном домене)",
        "cmd": "openssl s_client -connect <IP>:443 -servername b.example.test -alpn h2,http/1.1 -tls1_3",
        "note": "Формат вывода и верификация цепочки зависят от версии OpenSSL и локального CA store; проверяй поля Protocol, ALPN protocol и Verify return code."
      },
      {
        "title": "Проверка перехода в HTTP/2 (curl — пример)",
        "cmd": "curl -v --http2 --tlsv1.3 https://b.example.test/",
        "note": "Вывод зависит от сборки curl с поддержкой HTTP/2 (nghttp2) и доступности целевого узла/CA."
      },
      {
        "title": "Фильтр Wireshark для SNI и (при расшифровке) ALPN",
        "cmd": "tls.handshake.extensions_server_name || tls.handshake.extensions_alpn_str",
        "note": "Для чтения выбранного сервером ALPN в EncryptedExtensions требуются session secrets (например, SSLKEYLOGFILE); имена display fields сверь на целевой версии Wireshark."
      }
    ],
    "sources": [
      "RFC 8446 — The Transport Layer Security (TLS) Protocol Version 1.3",
      "RFC 7301 — TLS Application-Layer Protocol Negotiation (ALPN)",
      "RFC 9113 — HTTP/2 (Section 3.3 Starting HTTP/2 for 'https' URIs)",
      "RFC 9525 — Service Identity in TLS"
    ]
  },
  "relatedQuestionIds": [
    "l7-new-06",
    "gap-pack3-20",
    "l57-x18"
  ],
  "plainKnowledgeCheck": {
    "title": "Проверь себя: TLS 1.3 и ALPN — простыми словами",
    "intro": "Три вопроса по рукопожатию TLS 1.3, SNI и ALPN.",
    "questions": [
      {
        "id": "l3-tls-plain-01",
        "prompt": "Почему сервер не может выбрать нужный TLS-сертификат на общем IP по HTTP-заголовку Host?",
        "choices": [
          {
            "id": "A",
            "label": "Браузеры больше не отправляют заголовок Host в HTTPS"
          },
          {
            "id": "B",
            "label": "Заголовок Host используется только в протоколе FTP"
          },
          {
            "id": "C",
            "label": "TLS всегда требует отдельный IP-адрес для каждого домена"
          },
          {
            "id": "D",
            "label": "HTTP-запрос с заголовком Host передаётся только после установления TLS, поэтому имя сайта заранее передаётся в SNI сообщения ClientHello"
          }
        ],
        "correctChoiceId": "D",
        "explanation": "До завершения TLS-рукопожатия HTTP-запрос ещё не отправлен. Расширение SNI в ClientHello позволяет серверу выбрать нужный сертификат в начале рукопожатия."
      },
      {
        "id": "l3-tls-plain-02",
        "prompt": "Можно ли в полном TLS 1.3 handshake (без PSK и 0-RTT) отправлять обычный HTTP-запрос сразу после получения ServerHello?",
        "choices": [
          {
            "id": "A",
            "label": "Да, ведь сервер уже выбрал шифр"
          },
          {
            "id": "B",
            "label": "Нет: клиент должен сначала проверить Certificate, CertificateVerify и Finished сервера и отправить свой Finished"
          },
          {
            "id": "C",
            "label": "Да, если согласован HTTP/2"
          },
          {
            "id": "D",
            "label": "Да, если клиент указал SNI"
          }
        ],
        "correctChoiceId": "B",
        "explanation": "ServerHello не доказывает подлинность сервера. Обычные прикладные данные отправляются только после проверки Certificate, CertificateVerify и Finished сервера и отправки собственного Finished."
      },
      {
        "id": "l3-tls-plain-03",
        "prompt": "Если в TLS-рукопожатии сервер выбрал ALPN «h2», как клиент должен начать GET-запрос?",
        "choices": [
          {
            "id": "A",
            "label": "Передать HTTP/2 connection preface и бинарные кадры HTTP/2"
          },
          {
            "id": "B",
            "label": "Отправить текстовый GET / HTTP/1.1 с заголовком Upgrade: h2c"
          },
          {
            "id": "C",
            "label": "Переоткрыть новое TCP-соединение на порт 80"
          },
          {
            "id": "D",
            "label": "Передать строку GET / HTTP/2 с текстовыми заголовками HTTP/1.1"
          }
        ],
        "correctChoiceId": "A",
        "explanation": "ALPN 'h2' сразу фиксирует бинарный HTTP/2 поверх TLS (connection preface + кадры). Заголовок Upgrade: h2c относится только к незашифрованному HTTP."
      }
    ]
  },
  "knowledgeCheck": {
    "title": "Проверь себя: TLS 1.3, SNI и ALPN — по делу",
    "intro": "Четыре инженерных сценария по RFC 8446, 7301 и 9113.",
    "questions": [
      {
        "id": "l3-tls-pro-01",
        "prompt": "В полном TLS 1.3 handshake без PSK и early data TCP установлен и получен ServerHello. Когда клиент штатно отправляет обычные HTTP-данные?",
        "choices": [
          {
            "id": "A",
            "label": "Сразу после ServerHello, не дожидаясь сертификата"
          },
          {
            "id": "B",
            "label": "После проверки цепочки сертификатов без проверки CertificateVerify и Finished"
          },
          {
            "id": "C",
            "label": "После проверки сертификата, CertificateVerify и Finished сервера и отправки собственного Finished"
          },
          {
            "id": "D",
            "label": "Сразу после CertificateVerify: Finished относится только к возобновлению сессии"
          }
        ],
        "correctChoiceId": "C",
        "explanation": "По RFC 8446 клиент валидирует Certificate, CertificateVerify и Finished сервера, отправляет собственный Finished и лишь затем передаёт Application Data."
      },
      {
        "id": "l3-tls-pro-02",
        "prompt": "TLS-рукопожатие завершилось, сервер выбрал ALPN 'h2'. Как начать прикладной GET-обмен в этом же соединении?",
        "choices": [
          {
            "id": "A",
            "label": "Передать GET / HTTP/1.1, считая ALPN необязательной рекомендацией"
          },
          {
            "id": "B",
            "label": "Передать GET / HTTP/2 и обычные текстовые заголовки HTTP/1.1"
          },
          {
            "id": "C",
            "label": "Передать HTTP/1.1-запрос с Upgrade: h2c"
          },
          {
            "id": "D",
            "label": "Передать HTTP/2 connection preface и кадры HTTP/2 с представлением запроса"
          }
        ],
        "correctChoiceId": "D",
        "explanation": "Выбор ALPN 'h2' обязывает клиента начать с 24-байтного HTTP/2 connection preface и бинарных кадров HTTP/2 (RFC 9113 §3.3)."
      },
      {
        "id": "l3-tls-pro-03",
        "prompt": "На одном IP размещены a.example.test и b.example.test со своими сертификатами. Какая последовательность позволяет серверу выбрать сертификат b до передачи HTTP-запроса?",
        "choices": [
          {
            "id": "A",
            "label": "Клиент передаёт b.example.test в SNI сообщения ClientHello → сервер выбирает сертификат b → завершается TLS-рукопожатие → передаётся защищённый запрос"
          },
          {
            "id": "B",
            "label": "Сервер выдаёт сертификат a → клиент шлёт Host: b.example.test → сервер меняет сертификат"
          },
          {
            "id": "C",
            "label": "Сервер шлёт оба сертификата одной цепочкой → клиент выбирает нужный"
          },
          {
            "id": "D",
            "label": "Клиент шлёт открытый HTTP-запрос с Host: b.example.test → затем начинается TLS"
          }
        ],
        "correctChoiceId": "A",
        "explanation": "SNI передаётся в ClientHello до завершения TLS и до отправки HTTP Host, позволяя выбрать правильный сертификат."
      },
      {
        "id": "l3-tls-pro-04",
        "prompt": "Почему в обычном зашифрованном дампе Wireshark (без SSLKEYLOGFILE) видно расширение SNI из ClientHello, но не видно выбранное сервером значение ALPN в TLS 1.3?",
        "choices": [
          {
            "id": "A",
            "label": "Потому что в TLS 1.3 расширение ALPN вообще не используется"
          },
          {
            "id": "B",
            "label": "Потому что выбранный сервером ALPN передаётся в зашифрованном сообщении EncryptedExtensions; для его расшифровки нужны session secrets"
          },
          {
            "id": "C",
            "label": "Потому что Wireshark не поддерживает протокол TCP/443"
          },
          {
            "id": "D",
            "label": "Потому что сервер отправляет выбранный ALPN только в отдельном UDP-пакете"
          }
        ],
        "correctChoiceId": "B",
        "explanation": "В TLS 1.3 сообщения сервера после ServerHello (включая EncryptedExtensions с выбранным ALPN) шифруются ключами рукопожатия; без key log Wireshark не может их декодировать."
      }
    ]
  },
  "sources": [
    "RFC 8446 — TLS 1.3",
    "RFC 7301 — ALPN",
    "RFC 9113 — HTTP/2",
    "RFC 9525 — Service Identity in TLS"
  ]
};
