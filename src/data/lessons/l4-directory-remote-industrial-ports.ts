import type { Lesson } from './types';

/** Final beginner foundation coverage, individually authored rather than generic fallback. */
export const LESSON_L4_DIRECTORY_REMOTE_INDUSTRIAL_PORTS: Lesson = {
  "id": "l4-directory-remote-industrial-ports",
  "title": "Порты служб: LDAP, RDP и Modbus TCP",
  "category": "L4 · Порты сервисов",
  "osiLayers": [
    "L4",
    "L7"
  ],
  "difficulty": "applied",
  "summary": "Зачем LDAP, RDP и промышленный Modbus TCP используют разные номера TCP-портов, как не перепутать TLS, UDP и реальный сервис.",
  "terms": [
    "TCP",
    "порт",
    "LDAP",
    "RDP",
    "Modbus TCP",
    "TLS"
  ],
  "blocks": [
    {
      "heading": "IP ведёт к узлу, TCP-порт — к программе",
      "body": "На одном адресе сервера одновременно могут слушать каталог пользователей, удалённый рабочий стол и промышленное приложение. TCP-порт нужен, чтобы направить новое соединение нужному процессу.\n\nНомер порта не равен адресу IP, VLAN или номеру физического гнезда. Порты бывают стандартными, но администратор может изменить их для конкретного сервера.\n\nПри диагностике проверь назначение службы и её настроенный порт, а затем права доступа и состояние процесса. Простая открытость порта не доказывает, что программа исправна и соединение защищено."
    },
    {
      "heading": "LDAP: 389/TCP без начального TLS",
      "body": "Каталог LDAP хранит и предоставляет структурированную информацию, например пользователей и группы. Клиенты могут обращаться к нему по стандартному порту 389/TCP.\n\nФраза «без TLS» в билете означает исходное незашифрованное LDAP-соединение. На том же 389/TCP может быть согласован StartTLS, если обе стороны его поддерживают; отдельный вариант LDAPS часто используют на 636/TCP.\n\nПо одному номеру 389 нельзя гарантировать защиту пароля. Для реальной системы выясняют обязательность TLS и настройки аутентификации."
    },
    {
      "heading": "RDP: 3389/TCP, но бывает и UDP",
      "body": "RDP предоставляет удалённый графический рабочий стол. Для основного TCP-соединения стандартный порт — 3389.\n\nВ реальном подключении может дополнительно использоваться UDP для оптимизации, но в задании спросили именно основной TCP. RD Gateway часто переносит внешний доступ на защищённый HTTPS-шлюз.\n\nНельзя считать доступным RDP только потому, что найден 3389: для входа могут действовать NLA, ACL, шлюз и иные требования безопасности."
    },
    {
      "heading": "Modbus TCP: 502/TCP и промышленная зона",
      "body": "В промышленной сети HMI или SCADA обращается к контроллеру по Modbus TCP, например чтобы прочитать регистр или записать команду.\n\nСтандартный сервис слушает 502/TCP. Несмотря на использование TCP, это не HTTP/HTTPS: структура сообщения и назначение отличаются.\n\nКлассический Modbus TCP не имеет встроенной универсальной защиты от неавторизованной записи. Доступ к 502 ограничивают сегментацией сети и правилами промышленной безопасности."
    }
  ],
  "professional": {
    "summary": "Сервисная идентификация 389/3389/502 TCP: StartTLS и LDAPS, RDP/UDP/RD Gateway, Modbus/TCP MBAP и безопасная промышленная сегментация.",
    "terms": [
      "TCP",
      "порт",
      "LDAP",
      "RDP",
      "Modbus TCP",
      "TLS"
    ],
    "blocks": [
      {
        "heading": "TCP listener и функциональная проверка",
        "body": "Destination port identifies the listening service endpoint on an IP host; a source ephemeral port completes the transport tuple. Проверка TCP SYN/SYN-ACK показывает достижимость listener, но не корректность прикладного протокола. Сверяйте bind address, ACL, NAT, TLS policy, authentication, application logs и фактический advertised service.\n\nПри изменении портов не переносите memorized well-known mappings на нестандартный listener без фактической проверки. Source port в исходящих соединениях не равен серверному destination port."
      },
      {
        "heading": "LDAP bind, StartTLS, LDAPS",
        "body": "389/TCP — стандартный LDAP endpoint. StartTLS может переводить LDAP session на TLS после extended request, а LDAPS (implicit TLS) часто использует 636/TCP. Для надёжной защиты важно не только наличие TLS, но и валидность сертификата, требование шифрования до simple bind, политика LDAP signing/channel binding там, где применимо.\n\nСравнивайте фактический wire protocol, не делайте вывод о защищённости только по номеру 389 или 636; LDAP может быть фронтирован proxy."
      },
      {
        "heading": "RDP и удалённый доступ",
        "body": "3389/TCP — исходный стандартный listener Remote Desktop Protocol для основного потока. UDP/3389 может ускорять передачу, а RD Gateway обычно опирается на HTTPS 443 между клиентом и шлюзом. Для troubleshooting проверяйте NLA, security negotiation, сертификаты, политики доступа, брандмауэр и user rights.\n\nПубликация RDP непосредственно в интернет нежелательна без соответствующих защит: MFA, gateway, VPN, deny-by-default и журналирование подключений."
      },
      {
        "heading": "Modbus/TCP и защита оборудования",
        "body": "Modbus/TCP обычно использует TCP/502, MBAP header с Transaction ID, Protocol ID, Length, Unit Identifier и Modbus PDU функции. Application layer не становится HTTP даже при одинаковом TCP-транспорте. Unit ID особенно важен при обращении через gateway к другим промышленным сетям.\n\nКлассический Modbus/TCP не обеспечивает встроенного шифрования и аутентификации, поэтому применяют ACL, сегментацию OT, industrial firewalls и режимы только необходимого доступа; отдельно проверяют разрешённые function codes."
      }
    ],
    "sources": [
      "IANA Service Name and Transport Protocol Port Number Registry",
      "RFC 4511 — LDAP",
      "Microsoft Remote Desktop Protocol documentation",
      "Modbus Organization — Modbus Messaging on TCP/IP Implementation Guide"
    ]
  },
  "relatedQuestionIds": [
    "gen-port-15",
    "gen-port-16",
    "gen-port-17"
  ],
  "sources": [
    "IANA Service Name and Transport Protocol Port Number Registry",
    "RFC 4511 — LDAP",
    "Modbus Organization — Modbus Messaging on TCP/IP Implementation Guide"
  ]
};
