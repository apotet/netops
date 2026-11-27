import type { Lesson } from './types';

const sources = [
  'Wireshark User’s Guide §7.5 — TCP Analysis: https://www.wireshark.org/docs/wsug_html_chunked/ChAdvTCPAnalysis.html',
  'Wireshark filter syntax reference: https://www.wireshark.org/docs/man-pages/wireshark-filter.html',
  'Cisco Catalyst — Troubleshoot Switch Port and Interface Problems: https://www.cisco.com/c/en/us/support/docs/switches/catalyst-6500-series-switches/12027-53.html',
  'RFC 2863 §3.1.6 — разрыв последовательности счётчиков: https://www.rfc-editor.org/rfc/rfc2863.html',
];
const sheet = {
  file: 'l3-wireshark-crc-delta.svg',
  title: 'Метки в Wireshark и два снимка CRC',
  alt: 'Фильтр tcp.analysis.retransmission, двусторонний фильтр ip.addr и сравнение двух показаний одного входного счётчика CRC за минуту.',
  note: 'Фильтры применяются к имеющемуся разрешённому захвату, счётчики читаются без изменений на интерфейсе.',
};

export const LESSON_TS_WIRESHARK_CRC_DIAGNOSTICS: Lesson = {
  id: 'ts-wireshark-crc-diagnostics',
  title: 'Диагностика в Wireshark и проверка CRC двумя снимками',
  category: 'Диагностика · Wireshark и Ethernet',
  osiLayers: ['L1', 'L2', 'L3', 'L4'],
  difficulty: 'applied',
  summary: 'Как увидеть отмеченные повторы TCP и обе стороны IPv4-разговора в готовом захвате, а свежие ошибки Ethernet отличить от накопившихся.',
  terms: ['Wireshark', 'Display Filter', 'CRC', 'FCS', 'TCP', 'IPv4'],
  blocks: [
    {
      heading: 'Найти отмеченные повторные передачи TCP',
      body: 'В уже открытом разрешённом захвате фильтр отображения tcp.analysis.retransmission показывает сегменты, которые Wireshark пометил как повторные передачи. Это повод посмотреть поток целиком, не доказательство потерь на конкретном кабеле. На метки влияет полнота и порядок записей захвата. Поля SYN, RST и нулевое окно обозначают другие наблюдения.',
      cheatsheet: sheet,
      cheatsheetInitiallyOpen: true,
    },
    {
      heading: 'Показать обе стороны IPv4-обмена',
      body: 'Фильтр ip.addr == 10.1.1.10 показывает IPv4-пакеты, где адрес присутствует как источник или назначение. ip.src проверяет только источник; ip.dst только назначение. Это не фильтр ARP или IPv6: у них другие поля. Фильтр отображения меняет список на экране, но не удаляет записи из файла.',
      relatedLesson: { id: 'ts-method', label: 'Повторить общую методику сетевой диагностики' },
    },
    {
      heading: 'Понять, растёт ли входной CRC сейчас',
      body: 'Прочитай один и тот же входной счётчик порта дважды через известный интервал обычной нагрузки. Если он был 14 820, а через минуту стал 14 824, за минуту прибавилось четыре ошибки. Недельный итог сам по себе не показывает, когда они появились. Если между снимками счётчик обнулился, числам нельзя доверять как паре: начни новое наблюдение, не сбрасывая статистику и не меняя линк.',
    },
  ],
  professional: {
    summary: 'Эвристики счётчиков и TCP-анализатора, семантика IPv4 display-фильтра и корректная дельта CRC/FCS.',
    terms: ['Wireshark', 'Display Filter', 'CRC', 'FCS', 'TCP', 'IPv4'],
    blocks: [
      {
        heading: 'Wireshark: Retransmission, последовательность и ограничения захвата',
        body: 'В разрешённом офлайн-захвате tcp.analysis.retransmission отбирает конкретную эвристическую метку Wireshark, возникающую, когда номер последовательности отстаёт от ожидаемого и выполнены другие условия анализа. Отдельные метки Fast Retransmission и Spurious Retransmission могут иметь приоритет; отсутствие общей метки не означает, что повторов не было. Сопоставь Sequence/ACK в одном TCP-потоке, положение точки наблюдения и пропуски захвата; не локализуй неисправность по одной метке.',
        cheatsheet: sheet,
        cheatsheetInitiallyOpen: true,
      },
      {
        heading: 'Wireshark: поля источника и назначения в IPv4',
        body: 'Для двусторонней выборки в готовом IPv4-захвате используй ip.addr == 10.1.1.10: это совпадение хотя бы одного значения адресного поля. Однонаправленные условия ip.src и ip.dst не эквивалентны. При необходимости отобрать эту метку и этот адрес одновременно, в том же разрешённом захвате, соедини условия через &&. В туннелированном трафике проверяй, какому IPv4-заголовку принадлежит совпадение. Display Filter применяется после поступления пакетов в анализатор, а не задаёт сбор трафика.',
        relatedLesson: { id: 'ts-method', label: 'Повторить общую методику сетевой диагностики' },
      },
      {
        heading: 'Входной FCS, дельта и разрыв серии счётчика',
        body: 'На конкретной платформе найди входной CRC/FCS-счётчик. Например, на некоторых Cisco Catalyst он доступен в выводе show interfaces или show interfaces counters errors; точное имя поля проверь для модели. Сравни один и тот же порт, направление и источник метрики: ΔCRC = CRC(t2) − CRC(t1). Частота ошибок вычисляется отдельно: ΔCRC / Δt. При сбросе, перезапуске, смене порта или неясном переполнении интервал исключают; для интерфейсных MIB-серий учитывай sysUpTime и ifCounterDiscontinuityTime. Рост ΔCRC локализует наблюдение на приёме, но не указывает однозначно на компонент. Пустой захват обычного сетевого адаптера не исключает плохих FCS: они могут отбрасываться до захвата, а поле FCS может не передаваться в файл. Нулевая дельта при заметном трафике говорит только об этом интервале.',
      },
    ],
    sources,
  },
  relatedQuestionIds: ['tr-06', 'tr-07', 'ts-pack1-07'],
  sources,
  plainKnowledgeCheck: {
    title: 'Проверка понимания',
    questions: [
      { id: 'b3-crc-plain-mark', prompt: 'Какую строку ввести, чтобы увидеть пакеты с меткой TCP Retransmission?',
        choices: [{ id: 'a', label: 'tcp.flags.syn == 1' }, { id: 'b', label: 'tcp.analysis.retransmission' }, { id: 'c', label: 'tcp.flags.reset == 1' }, { id: 'd', label: 'tcp.window_size == 0' }],
        correctChoiceId: 'b', explanation: 'Искомая метка создаётся анализатором TCP; флаги и окно показывают другие свойства сегмента.' },
      { id: 'b3-crc-plain-ip', prompt: 'Как оставить в списке пакеты и от 10.1.1.10, и к нему?',
        choices: [{ id: 'a', label: 'ip.src == 10.1.1.10' }, { id: 'b', label: 'ip.dst == 10.1.1.10' }, { id: 'c', label: 'ip.addr == 10.1.1.10' }, { id: 'd', label: 'tcp.analysis.retransmission' }],
        correctChoiceId: 'c', explanation: 'Общее поле ip.addr учитывает как источник, так и назначение IPv4.' },
      { id: 'b3-crc-plain-delta', prompt: 'Счётчик вырос с 14 820 до 14 824 за минуту без сброса. Сколько ошибок добавилось?',
        choices: [{ id: 'a', label: '14 824' }, { id: 'b', label: '14 820' }, { id: 'c', label: 'Ни одной' }, { id: 'd', label: 'Четыре' }],
        correctChoiceId: 'd', explanation: 'Свежие ошибки показывает разница между двумя наблюдениями одного счётчика.' },
    ],
  },
  knowledgeCheck: {
    title: 'Инженерная самопроверка',
    questions: [
      { id: 'b3-crc-pro-reset', prompt: 'Между двумя снимками устройство перезапустилось. Как трактовать дельту CRC?',
        choices: [{ id: 'a', label: 'Исключить этот интервал и взять новую пару снимков' }, { id: 'b', label: 'Считать любой результат нулём' }, { id: 'c', label: 'Взять модуль разности' }, { id: 'd', label: 'Усреднить счётчик по uptime' }],
        correctChoiceId: 'a', explanation: 'Перезапуск нарушает непрерывность счётчика, простая разность не относится к одному интервалу.' },
      { id: 'b3-crc-pro-capture', prompt: 'Растёт входной FCS-счётчик, но Wireshark не показывает плохих FCS. Какой вывод обоснован?',
        choices: [{ id: 'a', label: 'Ошибок не было' }, { id: 'b', label: 'Счётчик измеряет только RST' }, { id: 'c', label: 'Захват может не содержать отброшенных кадров или FCS' }, { id: 'd', label: 'Однозначно сломан передатчик' }],
        correctChoiceId: 'c', explanation: 'Счётчик интерфейса и файл захвата измеряют разные наблюдения. Плохие кадры могут отбрасываться до записи.' },
      { id: 'b3-crc-pro-mark', prompt: 'Одна метка TCP Retransmission в дампе доказала отказ конкретного кабеля?',
        choices: [{ id: 'a', label: 'Да, если метка появилась при full-duplex' }, { id: 'b', label: 'Нет, нужны контекст TCP-потока и независимые наблюдения' }, { id: 'c', label: 'Да, если адрес назначения IPv4' }, { id: 'd', label: 'Да, если нет RST' }],
        correctChoiceId: 'b', explanation: 'Метка эвристическая и не определяет причину или участок сама по себе.' },
    ],
  },
};
