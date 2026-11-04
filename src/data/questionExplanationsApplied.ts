/** Individual deep dives for applied-level items in EXTRA packs + critical base overrides. */
export const APPLIED_INDIVIDUAL_DEEP: Record<
  string,
  { brief: string; deep: string; trap?: string; next?: string }
> = {
  // Override corrupted / weak base explanations
  'review-osi-34': {
    brief:
      'В TCP/IP нет отдельного сеансового (L5) модуля: его функции выполняет само приложение и прикладные протоколы.',
    deep: `Суть. Модель OSI для учёбы выделяет L5 (сеанс), L6 (представление), L7 (прикладной). Стек TCP/IP pragmatic: поверх Transport сразу Application.

Как это работает. Диалог, «сессия», кодировки, прикладная логика живут в коде приложения (или в HTTP/SSH/SMTP и т.п.), а не в отдельном системном L5-слое.

Пример. Браузер и веб-сервер ведут HTTPS-сессию средствами TLS+HTTP, без отдельного «Session Layer daemon».

Типичная ошибка. Считать, что в TCP/IP L5 «совпадает с транспортом» или что маршрутизаторы делают сеансы на каждом hop.

Проверка. В дампе видны TCP/UDP и сразу прикладной протокол — промежуточного «L5 header» нет.`,
    trap: 'Путать учебное деление OSI с реальным TCP/IP stack.',
    next: 'Теория: OSI & TCP/IP',
  },
  'tcpip-x18': {
    brief:
      'End-to-end principle: сложную надёжность и смысл данных обеспечивают конечные узлы; сеть в основном доставляет пакеты.',
    deep: `Суть. Интернет спроектирован так, что ядро сети остаётся относительно простым (forwarding), а интеллект — на концах (хостах и приложениях).

Как это работает. IP не гарантирует доставку и порядок. Если нужна надёжность — её даёт TCP (или приложение поверх UDP): повторы, порядок, контроль потока. Маршрутизаторы по пути обычно не восстанавливают ваш byte-stream.

Практический пример. Файл по TCP: потеря пакета на магистрали → ретрансмит делают конечные стеки TCP, а не «каждый роутер заново собирает файл».

Что это НЕ значит. Не запрет middlebox (NAT, firewall) — но базовая модель именно end-to-end.

Типичная ошибка. Путать с Ethernet cut-through/store-and-forward (это про коммутацию кадра на L2) или со split horizon (маршрутизация).

Запомнить. Сеть двигает пакеты; смысл и надёжность сессии — на концах.`,
    trap: 'Сводить ответ к cut-through или store-and-forward — это не end-to-end principle.',
    next: 'Теория: TCP reliability; troubleshooting retransmits',
  },

  'tcpip-x06': {
    brief: 'Приём: сначала L2 (Ethernet), затем IP, затем TCP/UDP, потом приложение.',
    deep: `Механизм. Декапсуляция снизу вверх: FCS/MAC → ethertype → IP → protocol → ports.
Пример. Кадр на NIC → драйвер/L2 → IP stack → сокет.
Диагностика. tcpdump -e -n; слои в Wireshark.
Ошибка. Думать, что HTTP «сразу» виден без L2/L3.`,
    next: 'Теория: инкапсуляция TCP/IP',
  },
  'tcpip-x09': {
    brief: 'ICMP — Internet Layer рядом с IP (не Transport).',
    deep: `Механизм. ICMP в IP (proto 1): unreachable, echo, time exceeded.
Диагностика. ping/traceroute; фильтр icmp.
Ошибка. Относить ICMP к TCP/UDP.`,
  },
  'tcpip-x14': {
    brief: 'DF=1 и размер > MTU → drop, часто ICMP Fragmentation Needed/PTB.',
    deep: `Пример. VPN снижает MTU; PMTUD ломается при filter ICMP.
Диагностика. ping с DF; проверка ICMP type 3 code 4.
Ошибка. «Всегда фрагментируется» при DF=1.`,
    next: 'troubleshooting PMTUD',
  },
  'tcpip-x20': {
    brief: 'Минимальный IPv4 header без опций — 20 байт.',
    deep: `IHL≥5 → 20 bytes. TCP min 20; UDP 8; Ethernet 14 (+FCS).
Ошибка. Путать с IPv6 fixed 40.`,
  },
  'tcpip-x23': {
    brief: 'IP — best-effort: без гарантий доставки, порядка и уникальности.',
    deep: `Потери компенсирует TCP/app, не сам IP.
Ошибка. Приписывать IP семантику TCP.`,
  },
  'tcpip-x24': {
    brief: 'DHCP — Application поверх UDP 67/68, не замена IP.',
    deep: `Клиент/сервер UDP; опции конфигурации.
Ошибка. Считать DHCP «сетевым уровнем вместо IP».`,
  },
  'tcpip-x26': {
    brief: 'На hop: TTL−1 и новая L2-инкапсуляция; IP src/dst обычно те же (без NAT).',
    deep: `Router rewrite MAC to next-hop.
Ошибка. Думать, что TCP ports меняет каждый роутер.`,
  },
  'tcpip-x27': {
    brief: 'NAT — стык private/public (часто L3+L4 ports).',
    deep: `Перепись адресов/портов, state table. PAT overload на edge.
Ошибка. Сводить NAT только к VLAN tagging.`,
  },
  'tcpip-x28': {
    brief: 'TCP/IP — pragmatic стек интернета; OSI — эталонная модель ролей.',
    deep: `Инженер диагностирует «по OSI», пакеты живут в TCP/IP.
Ошибка. Требовать «строго 7 уровней» у TCP/IP.`,
  },
  'l57-x02': {
    brief: 'Рекурсивный резолвер сам обходит цепочку NS от имени клиента.',
    deep: `Root → TLD → authoritative; кэш. Не путать с authoritative-only.`,
  },
  'l57-x04': {
    brief: 'GET безопасный; не должен менять состояние при повторе (в идеале).',
    deep: `Safe methods RFC; idempotent PUT/DELETE отдельно.
Ошибка. Считать POST «всегда безопасным».`,
  },
  'l57-x07': {
    brief: 'DHCP client UDP/68, server UDP/67.',
    deep: `DORA на L2 broadcast domain (или relay). Не путать с DNS/53.`,
  },
  'l57-x08': {
    brief: 'Клиент подтверждает offer через DHCPREQUEST.',
    deep: `DORA: Discover→Offer→Request→Ack.`,
  },
  'l57-x12': {
    brief: 'Host header выбирает vhost на одном IP (HTTP/1.1).',
    deep: `Связка с SNI в TLS для HTTPS.`,
  },
  'l57-x14': {
    brief: 'HSTS заставляет браузер использовать только HTTPS заданный срок.',
    deep: `Не «чинит» неверный сертификат.`,
  },
  'l57-x18': {
    brief: 'SNI в ClientHello выбирает сертификат/сайт на shared IP.',
    deep: `Без SNI — default vhost cert. openssl s_client -servername …`,
  },
  'l57-x19': {
    brief: 'IMAP — работа с ящиком на сервере; POP чаще забирает локально.',
    deep: `Не путать с SMTP (отправка).`,
  },
  'ts-x01': {
    brief: 'Нет link → кабель/SFP/admin-oper status, не traceroute.',
    deep: `Bottom-up: L1/L2 до L3. show interface; ethtool; DOM.`,
  },
  'ts-x02': {
    brief: 'Ping gateway OK, internet fail → default route / NAT / edge FW.',
    deep: `ip route; NAT translations; policy.`,
  },
  'ts-x03': {
    brief: 'IP ping OK, имя нет → DNS.',
    deep: `dig/nslookup; resolvers; split DNS.`,
  },
  'ts-x06': {
    brief: 'Duplex mismatch → errors/collisions/деградация.',
    deep: `Hardcode vs autoneg; CRC errors.`,
  },
  'ts-x07': {
    brief: 'Одинаковая IP-подсеть не значит один L2: проверьте VLAN.',
    deep: `Access VLAN, trunk allowed, SVI.`,
  },
  'ts-x08': {
    brief: 'Traceroute * * * ≠ обязательно обрыв: ICMP/UDP могут фильтроваться.',
    deep: `Проверяйте application path (TCP/443).`,
  },
  'ts-x09': {
    brief: 'Incomplete ARP → нет L2-ответа шлюза (VLAN/кабель/IP).',
    deep: `ARP who-has в дампе; VLAN; correct GW IP.`,
  },
  'ts-x10': {
    brief: 'Ping OK, сервис нет после ACL → порты/протокол сервиса в ACL.',
    deep: `Implicit deny; order of entries.`,
  },
  'ts-x11': {
    brief: 'Мелкий ping OK, крупный нет → MTU/PMTUD (ICMP PTB filtered).',
    deep: `DF tests; path MTU; MSS clamp.`,
  },
  'ts-x13': {
    brief: 'Сначала зафиксировать симптомы и baseline, потом менять конфиг.',
    deep: `Иначе нет отката и доказательства улучшения.`,
  },
  'l12-x02': {
    brief: 'Blocking/Discarding не форвардит data plane, но участвует в STP (BPDU).',
    deep: `Не путать с administratively down.`,
  },
  'l12-x05': {
    brief: 'MAC aging удаляет устаревшие MAC→port привязки.',
    deep: `Не путать с DHCP lease.`,
  },
  'l12-x08': {
    brief: 'VLAN (и L3 между ними) дробит broadcast domain.',
    deep: `Router/SVI для inter-VLAN.`,
  },
  'l4-x03': {
    brief: 'UDP — когда важны задержка и простота (DNS/RTP/games).',
    deep: `Нет handshake/retransmit в транспорте.`,
  },
  'l3-d01': {
    brief: '/30 → 4 адреса, 2 usable host.',
    deep: `Point-to-point: network + broadcast + 2 hosts.`,
    next: 'IPv4-тренажёр /30',
  },
  'l3-d04': {
    brief: 'TTL=1 на вход форварда → не форвардить; часто ICMP Time Exceeded.',
    deep: `L2-коммутатор TTL не уменьшает.`,
  },
  'l3-d06': {
    brief: 'fe80::/10 — link-local, не маршрутизируется между линками.',
    deep: `Не глобальный unicast.`,
  },
  'l4-d04': {
    brief: 'DNS→TCP при TC/truncated или zone transfer.',
    deep: `UDP first; TCP 53 for large/AXFR.`,
  },
  'tcpip-d03': {
    brief: 'OSI — роли/диагностика; TCP/IP — реальные протоколы стека.',
    deep: `Не запрет OSI и не «7 уровней у TCP/IP».`,
  },
};
