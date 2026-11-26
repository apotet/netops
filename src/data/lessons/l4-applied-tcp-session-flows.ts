import type { Lesson } from './types';

/** Level 3 («Прикладной») — TCP service flows. */
export const LESSON_L4_APPLIED_TCP_SESSION_FLOWS: Lesson = {
  "id": "l4-applied-tcp-session-flows",
  "title": "Прикладные TCP-сеансы: порты, FTP, SSH и доступ к сервисам",
  "category": "L4–L7 · Применение знаний",
  "osiLayers": [
    "L4",
    "L7"
  ],
  "difficulty": "applied",
  "summary": "Как находить клиентский и серверный порт в обе стороны, различать один TCP-сеанс и несколько каналов, читать FTP PASV, POP3, IMAP STARTTLS и LDAP.",
  "terms": [
    "TCP",
    "порт",
    "HTTP",
    "SSH",
    "Telnet",
    "FTP",
    "POP3",
    "IMAP",
    "LDAP",
    "TLS",
    "SFTP",
    "PASV",
    "STARTTLS",
    "LDAP Bind",
    "LDAP Search"
  ],
  "blocks": [
    {
      "heading": "Кто начинает соединение и кто получает ответ",
      "body": "Обычно клиент первым подключается к известному порту службы сервера: HTTP без TLS использует серверный TCP 80. Клиент выбирает собственный свободный локальный порт, например 51000. На обратном пути сервер отвечает с 80 на 51000. Это не новое соединение и не перемена ролей сервера и клиента.\n\nУвидеть направление помогает простая пара: IP и порт каждой стороны. В Wireshark сначала найди SYN клиента, затем SYN/ACK сервера и убедись, что у ответа поменялись местами источники и назначения."
    },
    {
      "heading": "Номер службы можно перенастроить",
      "body": "Если Telnet слушает TCP 2323 вместо обычного 23, клиент подключится именно к 2323. Стандартный порт — удобная договорённость, а не запрет использовать другой номер. Замена порта не превращает TCP в UDP и не добавляет шифрование.\n\nПри проверке сначала выясни, на каком порту служба действительно слушает подключения, затем посмотри, разрешает ли доступ межсетевой экран. Для безопасного удалённого администрирования предпочтителен SSH."
    },
    {
      "heading": "FTP и SSH разделяют операции по-разному",
      "body": "У пассивного FTP есть управляющее TCP-соединение к серверу 21. После PASV сервер сообщает отдельный порт для данных: например, 50010. Клиент открывает второе TCP-соединение, отправляет RETR по управляющему и получает файл по соединению данных. Не путай управляющее соединение с файлом.\n\nSSH устроен иначе: поверх одного защищённого TCP-соединения после аутентификации можно открыть несколько независимых логических каналов. Оболочка и SFTP работают в разных каналах; завершение оболочки не обязано закрывать передачу файла."
    },
    {
      "heading": "Почта: обычное подключение и включение TLS",
      "body": "POP3 без TLS обычно ждёт подключения на TCP 110, а IMAP с последующим STARTTLS начинает работу на TCP 143. В обоих случаях клиент подключается со своего временного порта к порту сервера, а не наоборот.\n\nВ IMAP команда STARTTLS включает шифрование внутри уже открытого соединения. Подключение сразу к 993 означает другой вариант, когда TLS начинается с самого начала. Аналогично POP3 через 995 обычно использует TLS сразу, поэтому для обычного POP3 без TLS ответ 995 не подходит."
    },
    {
      "heading": "Каталог LDAP: сначала LDAP Bind, потом LDAP Search",
      "body": "LDAP-сервер обычно принимает обычные TCP-подключения на 389. Программа в одном соединении выполняет LDAP Bind — сообщает, как будет обращаться к каталогу, затем LDAP Search — ищет нужные записи. Это две операции протокола, а не две разные службы с разными TCP-портами.\n\nПодключение к 636 обычно предполагает TLS с самого начала, что не совпадает с заданным обычным сеансом. В рабочей сети Bind с паролем без шифрования использовать нельзя; применяют TLS и проверяют сертификат сервера."
    }
  ],
  "professional": {
    "summary": "TCP 4-tuple и реверс потока; SSH connection channels; FTP passive control/data; Telnet non-standard port; POP3/IMAP STARTTLS и LDAP Bind/Search.",
    "terms": [
      "TCP",
      "HTTP",
      "SSH",
      "FTP",
      "POP3",
      "IMAP",
      "LDAP",
      "TLS",
      "SFTP",
      "PASV",
      "STARTTLS",
      "LDAP Bind",
      "LDAP Search"
    ],
    "blocks": [
      {
        "heading": "TCP 4-tuple: SYN и ответ",
        "body": "Для TCP-сессии идентификатор складывается из source IP, source port, destination IP, destination port и транспорта TCP. При HTTP/1.1 (без TLS) соединение client:51000→server:80 начинается с SYN на 80. Ответный SYN/ACK и последующий HTTP response идут server:80→client:51000; остаются частью того же двунаправленного TCP flow.\n\nПроверяй TCP stream, Seq/ACK, SYN/SYN-ACK/ACK и реальное состояние listening socket. Не делай вывод о транспорте по одному числу порта: HTTP/3 обычно использует QUIC/UDP, а HTTP/1.1 и HTTP/2 — TCP."
      },
      {
        "heading": "Настроенный Telnet и несколько логических каналов SSH",
        "body": "Telnet по RFC 854 работает через TCP, но сервер может слушать на 2323: при заданном клиентском 52000 первая пара портов будет 52000→2323, ответная — 2323→52000. Это не шифрование и не повод использовать UDP.\n\nSSH Connection Protocol (RFC 4254) мультиплексирует каналы типа session внутри одного transport. Для оболочки отправляется channel request shell, для SFTP — отдельный session channel с subsystem request sftp. SSH_MSG_CHANNEL_CLOSE закрывает только указанный channel; разрыв общего TCP-сеанса прекращает все каналы. Второй канал не требует нового SSH userauth на каждом открытии."
      },
      {
        "heading": "FTP PASV: управляющий поток не становится data stream",
        "body": "У пассивного FTP (RFC 959) управляющее соединение client→server:21 остаётся открытым. PASV даёт endpoint data connection; если сервер объявил TCP 50010, клиент устанавливает к нему ещё один TCP-сеанс, отправляет RETR по control и принимает file payload по data. Два потока имеют разные пары портов и независимые Seq/ACK.\n\nActive FTP предполагает обратное направление установления data connection; механическое требование server source 20 в PASV ошибочно. Проверяй пассивный диапазон в firewall/NAT, а не только наличие TCP/21."
      },
      {
        "heading": "POP3/IMAP и TLS-режимы",
        "body": "POP3 (RFC 1939) стандартно использует server TCP/110 для обычной сессии; TLS implicit обычно TCP/995. IMAP использует TCP/143 для обычной сессии и STARTTLS, TCP/993 — для implicit TLS. При STARTTLS сначала виден протокольный диалог, после явного перехода выполняется TLS handshake внутри прежнего TCP stream; при implicit TLS handshake начинается сразу после TCP.\n\nПри диагностике сопоставь configured service, client ephemeral port и ожидаемый режим TLS. Не разрешай открытый логин с паролем только потому, что клиент установил TCP: TLS и доверие сертификату проверяются отдельно."
      },
      {
        "heading": "LDAP Bind и LDAP Search в одном TCP-соединении",
        "body": "LDAPv3 (RFC 4511) обычно использует TCP/389. Операция LDAP Bind (BindRequest/BindResponse) и последующий LDAP Search (SearchRequest/SearchResult) проходят по одному установленному соединению и коррелируют по messageID; TCP/636 часто означает implicit TLS, а расширенная операция StartTLS отдельно согласует TLS на 389.\n\nБезопасность протокола нельзя выводить из факта Bind: простой bind с паролем требует защиты транспорта. Для анализа проверь endpoint TCP, LDAP messageID, resultCode BindResponse и настройки проверки сертификата до отправки секретов."
      }
    ],
    "sources": [
      "RFC 793 / RFC 9293 — Transmission Control Protocol",
      "RFC 854 — Telnet Protocol Specification",
      "RFC 959 — File Transfer Protocol",
      "RFC 4254 — SSH Connection Protocol",
      "RFC 1939 — Post Office Protocol Version 3",
      "RFC 3501 / RFC 9051 — IMAP",
      "RFC 4511 — Lightweight Directory Access Protocol (LDAP)"
    ]
  },
  "relatedQuestionIds": [
    "gen-transport-0",
    "gen-transport-2",
    "gen-transport-3",
    "gen-transport-4",
    "gen-transport-10",
    "gen-transport-12",
    "gen-transport-15"
  ],
  "sources": [
    "RFC 9293 — TCP",
    "RFC 959 — FTP control and data",
    "RFC 4254 — SSH channels",
    "RFC 1939 — POP3",
    "RFC 4511 — LDAP"
  ]
};
