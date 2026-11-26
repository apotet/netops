import type { InDepthExplanationPatch, InDepthBatch, InDepthTermPatch } from './types';
import type { SectionLink } from '../lessons/lessonSectionLinks';

// The 75 Gemini candidates overlap 74 Codex reviews. Only the unique PoE ID
// is transplanted here; overlapping texts remain preserved in source PR #253.
export const GROUP5_PATCHES: Record<string, InDepthExplanationPatch> = {
  'review-poe-30': {
    brief: 'Перед подключением энергоёмкой PTZ-камеры или точки доступа проверяют поддерживаемый стандарт/класс PoE на порту и остаток общего бюджета мощности коммутатора.',
    plain: [
      'Устройство с подогревом, поворотным механизмом или несколькими радиомодулями может требовать больше мощности, чем выдаёт базовый порт PoE. Если порт поддерживает только младший стандарт или общий блок питания коммутатора уже загружен другими портами, новое устройство не включится или будет перезагружаться под нагрузкой.',
      'В стандартах IEEE 802.3af (PoE, Type 1, до 15,4 Вт на порту PSE), 802.3at (PoE+, Type 2, до 30 Вт) и 802.3bt (PoE++, Type 3/4, до 60/90 Вт) питание выделяется с учётом класса устройства PD и суммарного бюджета PSE.',
      'Скорость передачи данных 100 Мбит/с или 1 Гбит/с не заменяет проверку класса питания: PoE работает на разных скоростях Ethernet. Наличие IP-адреса или записи в MAC-таблице появляется только после того, как камера успешно получит питание и загрузит сетевой стек.',
    ].join('\n\n'),
    pro: [
      'При отказе или циклических перезагрузках PD (IP-камеры, точки доступа Wi-Fi 6E/7) проверяют согласование типа/класса питания (IEEE 802.3af Class 0–3, 802.3at Class 4, 802.3bt Class 5–8, а при поддержке обеими сторонами — обмен параметрами питания через IEEE 802.3 LLDP Power-via-MDI; на некоторых платформах дополнительно применяют LLDP-MED или CDP) и остаток мощности блока питания PSE.',
      'Даже если отдельный порт поддерживает PoE+ (30 Вт), коммутатор откажет в подаче питания (`Power Denied` / `ILPOWER-5-ILPOWER_POWER_DENY`), когда сумма уже выделенной мощности превышает общий PoE budget шасси.',
      'Диагностика на поддерживаемых Cisco IOS/IOS XE: выполни read-only `show power inline` и, если команда доступна на данной модели, `show power inline <interface> detail`; сверь `Available / Used / Remaining` в ваттах, `IEEE Class`, `Admin / Oper` и паспортный пик камеры. На Eltex, Moxa, Siemens и других платформах используй документированные команды или интерфейс мониторинга PoE конкретной модели, не копируй синтаксис Cisco вслепую.',
    ].join('\n\n'),
    trap: 'Считать, что надпись PoE на коммутаторе автоматически гарантирует питание любой камеры без проверки стандарта (af/at/bt) и остатка бюджета мощности.',
    practicalTip: 'Проверь класс PD, стандарт порта (802.3af/at/bt) и общий бюджет: на совместимых Cisco IOS/IOS XE — read-only `show power inline`, на других платформах — штатный статус PoE. Если камера перезагружается под нагрузкой, измерь напряжение на стороне PD подходящим PoE-тестером.',
  },
  "l3-d05": {
    "pro": "PAT/NAT overload хранит соответствие между внутренним и внешним endpoint для TCP/UDP. Обмен идентифицируют протоколом и парой адрес:порт каждой стороны (5-tuple); фактические правила endpoint-independent/dependent mapping зависят от реализации NAT. При ответном пакете шлюз ищет действующее соответствие и возвращает исходные внутренние IP/порт, не ориентируясь на MAC удалённого сервера или DSCP.\n\nНа Cisco IOS/IOS-XE сверяй show ip nat translations и show ip nat statistics; на Linux — conntrack -L -p tcp и правила nftables/iptables с нужными правами. Сравни внутренний source IP:port до NAT, public IP:port снаружи и обратный поток. Учитывай таймауты трансляций, расход доступных портов, маршрутизацию обратного трафика и возможную фильтрацию.\n\nNAT44 с трансляцией портов не равен простому L3 forwarding, а термины «5-tuple соединения» и «ключ таблицы конкретного NAT» нельзя безоговорочно отождествлять: варианты реализации отличаются."
  },
  "l4-d03": {
    "trap": "Считать TIME-WAIT ошибкой или защитой от SYN flood: при корректном активном закрытии это ожидание для запоздавших сегментов и повторного ACK на повторный FIN. CLOSE-WAIT означает другую ситуацию — локальное приложение ещё не завершило закрытие.",
    "pro": "TCP TIME-WAIT обычно возникает у стороны, выполняющей active close после обмена FIN/ACK. Классический срок 2×MSL нужен для корректной обработки повторно пришедшего FIN (повторного ACK при необходимости) и для того, чтобы старые сегменты того же набора endpoint не смешались с новой инкарнацией соединения. RFC 9293 определяет состояния TCP; конкретная длительность таймера зависит от стека ОС.\n\nВ диагностике сопоставь FIN, ACK и RST в захвате с адресами/портами (4-tuple), отметками времени и выводом ss -tan state time-wait или netstat. Массовый TIME-WAIT может быть обычным следствием множества коротких соединений, а CLOSE-WAIT говорит о другом — удалённый FIN уже получен, но локальное приложение ещё не завершило закрытие.\n\nНе отключай TIME-WAIT как «универсальное лечение»: сначала проверь частоту открытий, reuse/keep-alive приложений, диапазон ephemeral-портов и фактические симптомы исчерпания ресурсов. TIME-WAIT не является защитой от SYN flood и не заменяет TCP keepalive."
  },
  "l4-d05": {
    "pro": "TCP SACK расширяет обычный cumulative ACK. При потере середины потока ACK остаётся на первом отсутствующем байте, а SACK option перечисляет уже принятые несмежные интервалы байтов за этим пробелом (левый край включён, правый исключён). Отправитель ведёт scoreboard и по подтверждённым диапазонам решает, какие сегменты повторять, снижая лишние ретрансляции.\n\nSACK Permitted согласуется опцией в SYN-пакетах при установлении TCP; затем SACK-блоки появляются в ACK в условиях перестановки/потерь. В Wireshark сопоставляй TCP Seq/Ack, число SACK-блоков (tcp.options.sack.count), их границы (tcp.options.sack_le и tcp.options.sack_re) и tcp.analysis.retransmission на одном потоке, учитывая относительную нумерацию и направление ACK. RFC 2018 задаёт формат опции, RFC 6675 — один из алгоритмов восстановления.\n\nНе считай SACK-блок продвижением накопительного ACK через отсутствующий сегмент и не обещай одинаковую эффективность для любой реализации или типа перегрузки."
  },
  "tcpip-d05": {
    "pro": "Explicit Congestion Notification использует двухбитовое поле ECN в IP: отправитель маркирует пригодный пакет ECT(0)/ECT(1), маршрутизатор с настроенным AQM при перегрузке может выставить CE вместо немедленного отбрасывания, а транспортный протокол должен вернуть сигнал отправителю. В классическом TCP ECN согласуется при установлении соединения; ECE сообщает о полученной CE-метке, CWR сигнализирует о реакции отправителя. Различай ECN и DSCP — оба находятся в DS field IP, но имеют разную семантику.\n\nДля диагностики сравни маркировки IP в обоих направлениях (в Wireshark ip.dsfield.ecn или ipv6.tclass.ecn), TCP ECE/CWR, счётчики AQM/очереди и фактическую реакцию cwnd/throughput. Требуются поддержка отправителя и получателя, политика очередей и отсутствие сброса ECN-битов промежуточными устройствами.\n\nECN не гарантирует отсутствия потерь: при сильной перегрузке, не-ECT трафике или другой политике пакеты по-прежнему могут отбрасываться. CE не заменяет NAT, TCP или конфигурацию native VLAN."
  }
};

export const GROUP5_LINKS: Record<string,string> = {
  "l3-d05": "l3-nat",
  "l4-d03": "l4-tcp-connection-closing",
  "l4-d05": "l4-tcp-sack",
  "tcpip-d05": "qos-basics"
};

export const GROUP5_BATCHES: InDepthBatch[] = [
  {
    "id": "in-depth-transfer-from-fundamentals",
    "title": "PAT, TCP TIME-WAIT, SACK и ECN — перенесено из Основ",
    "questionIds": [
      "l3-d05",
      "l4-d03",
      "l4-d05",
      "tcpip-d05"
    ]
  }
];

export const GROUP5_SECTIONS: SectionLink[] = [
  {
    "lessonId": "l3-nat",
    "questionIds": [
      "l3-d05"
    ],
    "anchorId": "in-depth-pat-session-key",
    "afterHeading": {
      "plain": "Когда нужно различать ещё и порты",
      "professional": "Source NAT и PAT"
    },
    "plain": {
      "heading": "PAT: почему одного внешнего IP мало",
      "body": "Несколько компьютеров делят один внешний IPv4-адрес. Шлюзу нужно знать, кому доставить ответ: в таблице трансляций участвуют адреса, порты и протокол. MAC и VLAN не заменяют эту связь. Проверяй, как выбран внешний порт и какой внутренней сессии соответствует пришедший ответ."
    },
    "professional": {
      "heading": "PAT 5-tuple, translation table и обратная доставка",
      "body": "Для TCP/UDP сопоставляй source IP:port, destination IP:port и протокол с записью NAT. На Cisco show ip nat translations, на Linux conntrack -L; дополнительно исследуй timeouts и исчерпание портов. Ключ сопоставления зависит от endpoint-mapping/фильтрации конкретного шлюза, поэтому не обобщай 5-tuple на все реализации без проверки."
    }
  },
  {
    "lessonId": "l4-tcp-connection-closing",
    "questionIds": [
      "l4-d03"
    ],
    "anchorId": "in-depth-tcp-time-wait",
    "afterHeading": {
      "plain": "Почему нельзя сразу забыть старое соединение",
      "professional": "Нормативная роль TIME-WAIT"
    },
    "plain": {
      "heading": "TIME-WAIT: дать старым пакетам исчезнуть",
      "body": "После активного закрытия TCP нужно время, чтобы задержавшиеся пакеты прежнего соединения не воспринимались как новые и чтобы можно было повторить последнее подтверждение при необходимости. Это не ошибка связи и не механизм ускорения SYN-flood. Проверяй состояние по обеим сторонам и последовательность FIN/ACK."
    },
    "professional": {
      "heading": "TIME-WAIT, 2MSL и диагностика состояний TCP",
      "body": "В классической модели TCP период TIME-WAIT составляет 2×MSL, но фактический таймаут зависит от ОС. Сверяй ss -tan state time-wait, FIN/ACK в pcap и 4-tuple. Отличай TIME-WAIT от CLOSE-WAIT; массовые короткие подключения сами по себе не доказывают утечку сокетов."
    }
  },
  {
    "lessonId": "l4-tcp-sack",
    "questionIds": [
      "l4-d05"
    ],
    "anchorId": "in-depth-tcp-sack-blocks",
    "afterHeading": {
      "plain": "SACK описывает принятые участки за пробелом",
      "professional": "Согласование и формат TCP-опции"
    },
    "plain": {
      "heading": "SACK: получены куски за пропуском",
      "body": "Обычный ACK сообщает, где находится первый пропуск. SACK дополнительно называет диапазоны байтов, пришедших после него, чтобы отправитель не пересылал уже полученное. Это не шифрование и не команда выбора VLAN; SACK помогает именно восстановлению потерь в TCP."
    },
    "professional": {
      "heading": "SACK Permitted, blocks и cumulative ACK",
      "body": "SACK Permitted согласуется в SYN; последующие SACK TCP options передают принятые блоки [Left Edge, Right Edge), не сдвигая cumulative ACK через разрыв. Исследуй Seq/Ack, число SACK-блоков (tcp.options.sack.count), их границы (tcp.options.sack_le и tcp.options.sack_re) и ретрансляции одного потока в Wireshark; учитывай переупорядочивание и алгоритм scoreboard (RFC 2018/6675)."
    }
  },
  {
    "lessonId": "qos-basics",
    "questionIds": [
      "tcpip-d05"
    ],
    "anchorId": "in-depth-ecn-congestion",
    "afterHeading": {
      "plain": "Сообщить о перегрузке и поставить передачу на паузу",
      "professional": "Как CE превращается в реакцию конечного узла"
    },
    "plain": {
      "heading": "ECN: сообщить о пробке без обязательной потери",
      "body": "При переполнении очереди сеть может отметить подходящий пакет вместо немедленного удаления. Получатель передаёт сигнал отправителю, чтобы тот сбавил скорость. Так работает ECN, если все нужные участники поддерживают этот механизм; при сильной перегрузке потери всё равно возможны."
    },
    "professional": {
      "heading": "ECT, CE, ECE/CWR и согласование ECN",
      "body": "ECN-биты в IP различают ECT(0), ECT(1), CE. При согласованном TCP ECN, AQM и поддержке промежуточных устройств CE попадает получателю, ECE/CWR отражают обратную связь и реакцию. Сверяй ip.dsfield.ecn, TCP ECE/CWR и счётчики очередей; ECN не равен DSCP и не гарантирует zero-loss."
    }
  }
];

/** Exact active terminology for the four newly transferred Understanding IDs. */
export const GROUP5_TERMS: Record<string, InDepthTermPatch> = {
  "Selective Acknowledgment": {
    english: "Selective Acknowledgment (TCP SACK)",
    russian: "Выборочное подтверждение принятых диапазонов байтов TCP",
    description: "Механизм TCP SACK: опция сообщает отправителю о несмежных принятых диапазонах байтов при наличии пробелов. Накопительный ACK при этом остаётся на первом отсутствующем байте; RFC 2018 описывает формат.",
    relatesTo: "TCP, SACK Permitted, cumulative ACK и восстановление потерь; RFC 2018 / RFC 6675.",
    abbreviation: false,
    lessonId: "l4-tcp-sack"
  },
  "SACK-permitted": {
    english: "SACK-Permitted",
    russian: "Согласие использовать выборочные подтверждения TCP",
    description: "Опция TCP SACK-Permitted в SYN объявляет готовность получать SACK-блоки в дальнейших сегментах; наличие опции не подтверждает доставку данных.",
    relatesTo: "TCP SACK, восстановление потерь, RFC 2018 / RFC 6675.",
    abbreviation: false,
    lessonId: "l4-tcp-sack"
  },
  "SACK-Permitted": {
    english: "SACK-Permitted TCP option",
    russian: "Опция согласования выборочного подтверждения TCP",
    description: "Во время TCP handshake опция SACK-Permitted сообщает поддерживаемую возможность SACK; далее при потерях получатель может передавать SACK blocks.",
    relatesTo: "TCP SACK, восстановление потерь, RFC 2018 / RFC 6675.",
    abbreviation: false,
    lessonId: "l4-tcp-sack"
  },
  "sequence number": {
    english: "TCP sequence number",
    russian: "Номер байта в потоке TCP",
    description: "Поле TCP Sequence Number задаёт номер первого байта данных в сегменте; SYN и FIN расходуют одну позицию в пространстве последовательности.",
    relatesTo: "TCP SACK, восстановление потерь, RFC 2018 / RFC 6675.",
    abbreviation: false,
    lessonId: "l4-tcp-sack"
  },
  "ретрансляция": {
    english: "TCP retransmission",
    russian: "Повторная передача данных TCP",
    description: "Отправитель повторно посылает байтовый диапазон, если по подтверждениям или таймеру считает его потерянным. Повтор не означает новое приложение или новую сессию.",
    relatesTo: "TCP SACK, восстановление потерь, RFC 2018 / RFC 6675.",
    abbreviation: false,
    lessonId: "l4-tcp-sack"
  },
  "Left Edge": {
    english: "SACK Left Edge",
    russian: "Левая граница принятого SACK-блока",
    description: "В TCP SACK block это включённая начальная граница полученного интервала Sequence Number, находящегося за пробелом cumulative ACK.",
    relatesTo: "TCP SACK, восстановление потерь, RFC 2018 / RFC 6675.",
    abbreviation: false,
    lessonId: "l4-tcp-sack"
  },
  "Right Edge": {
    english: "SACK Right Edge",
    russian: "Правая граница принятого SACK-блока",
    description: "Правая граница интервала SACK исключается из диапазона; разность Right Edge и Left Edge определяет количество подтверждённых байтов блока.",
    relatesTo: "TCP SACK, восстановление потерь, RFC 2018 / RFC 6675.",
    abbreviation: false,
    lessonId: "l4-tcp-sack"
  },
  "RFC 2018": {
    english: "RFC 2018: TCP Selective Acknowledgment Options",
    russian: "Документ, определяющий опции TCP SACK",
    description: "RFC 2018 описывает согласование SACK-Permitted и представление полученных интервалов SACK blocks в TCP ACK.",
    relatesTo: "TCP SACK, восстановление потерь, RFC 2018 / RFC 6675.",
    abbreviation: false,
    lessonId: "l4-tcp-sack"
  },
  "SACK blocks": {
    english: "TCP SACK blocks",
    russian: "Блоки выборочного подтверждения TCP",
    description: "Диапазоны байтов TCP, уже принятых вне непрерывной последовательности, передаются в TCP SACK option, помогая отправителю не повторять доставленное.",
    relatesTo: "TCP SACK, восстановление потерь, RFC 2018 / RFC 6675.",
    abbreviation: false,
    lessonId: "l4-tcp-sack"
  },
  "cumulative ACK": {
    english: "TCP cumulative acknowledgement",
    russian: "Накопительное подтверждение TCP",
    description: "Номер ACK означает следующий ожидаемый байт непрерывно полученного потока; принятые интервалы за пробелом могут быть отмечены SACK, не продвигая cumulative ACK.",
    relatesTo: "TCP SACK, восстановление потерь, RFC 2018 / RFC 6675.",
    abbreviation: false,
    lessonId: "l4-tcp-sack"
  },
  "retransmission": {
    english: "TCP retransmission",
    russian: "Ретрансляция TCP",
    description: "Повторная отправка прежних байтов TCP после оценки потери по RTO, duplicate ACK/SACK или другому алгоритму восстановления.",
    relatesTo: "TCP SACK, восстановление потерь, RFC 2018 / RFC 6675.",
    abbreviation: false,
    lessonId: "l4-tcp-sack"
  }
};
