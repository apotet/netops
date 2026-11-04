/** Well-known / common ports for network engineering exams */

export type PortProto = 'TCP' | 'UDP' | 'TCP/UDP';

export interface PortEntry {
  port: string;
  proto: PortProto;
  service: string;
  note?: string;
}

export const WELL_KNOWN_PORTS: PortEntry[] = [
  { port: '20', proto: 'TCP', service: 'FTP Data', note: 'Передача данных FTP' },
  { port: '21', proto: 'TCP', service: 'FTP Control', note: 'Управляющий канал FTP' },
  { port: '22', proto: 'TCP', service: 'SSH / SFTP', note: 'Удалённый shell, безопасный FTP' },
  { port: '23', proto: 'TCP', service: 'Telnet', note: 'Устаревший незашифрованный удалённый доступ' },
  { port: '25', proto: 'TCP', service: 'SMTP', note: 'Отправка почты между серверами' },
  { port: '53', proto: 'TCP/UDP', service: 'DNS', note: 'UDP — запросы; TCP — зоны / большие ответы' },
  { port: '67', proto: 'UDP', service: 'DHCPv4 Server', note: 'Ответы сервера (и broadcast от сервера)' },
  { port: '68', proto: 'UDP', service: 'DHCPv4 Client', note: 'Клиент слушает на 68' },
  { port: '69', proto: 'UDP', service: 'TFTP', note: 'Простой обмен файлами (образы IOS и т.п.)' },
  { port: '80', proto: 'TCP', service: 'HTTP', note: 'Веб без шифрования' },
  { port: '110', proto: 'TCP', service: 'POP3', note: 'Загрузка почты клиентом' },
  { port: '123', proto: 'UDP', service: 'NTP', note: 'Синхронизация времени' },
  { port: '143', proto: 'TCP', service: 'IMAP', note: 'Почта с синхронизацией папок' },
  { port: '161', proto: 'UDP', service: 'SNMP', note: 'Опрос устройств (get/walk)' },
  { port: '162', proto: 'UDP', service: 'SNMP Trap', note: 'Асинхронные уведомления от агентов' },
  { port: '179', proto: 'TCP', service: 'BGP', note: 'Маршрутизация между AS' },
  { port: '389', proto: 'TCP/UDP', service: 'LDAP', note: 'Каталоги / аутентификация' },
  { port: '443', proto: 'TCP', service: 'HTTPS', note: 'HTTP поверх TLS' },
  { port: '445', proto: 'TCP', service: 'SMB', note: 'Файловые шары Windows / Samba' },
  { port: '465', proto: 'TCP', service: 'SMTPS', note: 'SMTP с implicit TLS' },
  { port: '514', proto: 'UDP', service: 'Syslog', note: 'Классический syslog (часто UDP)' },
  { port: '520', proto: 'UDP', service: 'RIP', note: 'Routing Information Protocol' },
  { port: '587', proto: 'TCP', service: 'SMTP Submission', note: 'Клиент → сервер с STARTTLS' },
  { port: '636', proto: 'TCP', service: 'LDAPS', note: 'LDAP поверх TLS' },
  { port: '853', proto: 'TCP', service: 'DNS over TLS', note: 'DoT' },
  { port: '989–990', proto: 'TCP', service: 'FTPS', note: 'FTP over TLS (data/control)' },
  { port: '993', proto: 'TCP', service: 'IMAPS', note: 'IMAP + TLS' },
  { port: '995', proto: 'TCP', service: 'POP3S', note: 'POP3 + TLS' },
  { port: '1433', proto: 'TCP', service: 'MS SQL', note: 'Microsoft SQL Server' },
  { port: '1521', proto: 'TCP', service: 'Oracle DB', note: 'Listener по умолчанию' },
  { port: '3306', proto: 'TCP', service: 'MySQL / MariaDB' },
  { port: '3389', proto: 'TCP', service: 'RDP', note: 'Remote Desktop Protocol' },
  { port: '5060', proto: 'TCP/UDP', service: 'SIP', note: 'Сигнализация VoIP' },
  { port: '5061', proto: 'TCP', service: 'SIP-TLS', note: 'SIP поверх TLS' },
  { port: '5432', proto: 'TCP', service: 'PostgreSQL' },
  { port: '5900', proto: 'TCP', service: 'VNC', note: 'Удалённый рабочий стол' },
  { port: '6379', proto: 'TCP', service: 'Redis' },
  { port: '8080', proto: 'TCP', service: 'HTTP-alt', note: 'Часто прокси / альтернативный веб' },
  { port: '8443', proto: 'TCP', service: 'HTTPS-alt', note: 'Альтернативный HTTPS (панели, API)' },
];

export const PORT_RANGES = [
  {
    title: 'Well-known (0–1023)',
    text: 'Системные / привилегированные порты. На Unix слушать их обычно может только root (или процесс с CAP_NET_BIND_SERVICE).',
  },
  {
    title: 'Registered (1024–49151)',
    text: 'Зарегистрированные IANA порты приложений (БД, RDP, альтернативный HTTP и т.д.).',
  },
  {
    title: 'Dynamic / ephemeral (49152–65535)',
    text: 'Временные порты клиента при исходящих соединениях. Диапазон ОС может настраиваться (sysctl / реестр).',
  },
];
