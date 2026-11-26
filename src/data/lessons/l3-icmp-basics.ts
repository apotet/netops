import type { Lesson } from './types';

/** ICMPv4 is directly carried in IPv4; this lesson is reusable across OSI and TCP/IP questions. */
export const LESSON_L3_ICMP_BASICS: Lesson = {
  id: 'l3-icmp-basics',
  title: 'ICMP и ping: где живёт служебное сообщение',
  category: 'L3 · ICMP',
  osiLayers: ['L3'],
  difficulty: 'beginner',
  summary: 'Почему ping не использует TCP или UDP, что означает ICMP Type и как сообщение вложено в Ethernet и IP.',
  terms: ['ICMP', 'IPv4', 'ping', 'Echo Request', 'Echo Reply', 'TTL', 'TCP', 'UDP', 'Wireshark'],
  blocks: [
    { heading: 'Зачем IP нужны служебные сообщения',
      body: 'Компьютеру нужно не только отправлять данные, но и понимать, отвечают ли соседние и удалённые узлы и почему некоторые пакеты не дошли. Для этого используются специальные сообщения.\n\nВ IPv4 эту задачу выполняет ICMP. Команда ping обычно отправляет ICMP Echo Request, а доступная отвечающая сторона может вернуть Echo Reply. Отсутствие ответа ещё не доказывает, что сервер выключен: ICMP могут фильтровать.\n\nICMP — не замена TCP или UDP для передачи веб-страниц. Он связан с обработкой и диагностикой IP, а не с транспортными портами приложений.' },
    { heading: 'Три оболочки в одном захвате',
      body: 'В Wireshark можно увидеть один и тот же ping как Ethernet-кадр, внутри которого лежит IP-пакет, а внутри IP — ICMP-сообщение. Это вложенные объекты разных уровней.\n\nДля обычного ping по IPv4 цепочка такая: Ethernet → IPv4 → ICMP Echo Request. ICMP здесь вложен непосредственно в IPv4, без заголовков TCP и UDP.\n\nНа другом канальном участке внешняя оболочка может измениться, но принцип останется прежним: сообщение ICMP переносится IP-пакетом. Поэтому вопрос «куда непосредственно вложен ICMP» требует ответа «IP», а не «Ethernet».' },
    { heading: 'ICMP в OSI и TCP/IP',
      practiceLink: 'packet',
      body: 'Модель OSI подробно разделяет сетевые функции. Управление и диагностика IP обычно относятся к L3, поэтому ICMP в учебном соответствии ставят на сетевой уровень.\n\nВ модели TCP/IP ICMP связывают с Internet layer. IP-заголовок указывает тип вложенного протокола. У ICMP есть собственные типы сообщений, но нет обычных портов TCP/UDP.\n\nНапример, RST — флаг TCP, а Echo Request — сообщение ICMP: оба могут быть видны в одном анализаторе, но относятся к разным механизмам.' },
  ],
  professional: {
    summary: 'ICMPv4 Protocol=1, Type/Code и анализ вложения IPv4 и диагностики ping.',
    terms: ['ICMPv4', 'Protocol', 'Echo Request', 'Echo Reply', 'Time Exceeded', 'IPv4', 'Wireshark'],
    blocks: [
      { heading: 'Вложение и поля',
        practiceLink: 'packet',
        body: 'RFC 792 определяет ICMPv4, инкапсулируемый непосредственно в IPv4: значение поля IPv4 Protocol равно 1. ICMP Echo Request — Type 8/Code 0; Echo Reply — Type 0/Code 0. TCP и UDP между IPv4 и ICMP не присутствуют.\n\nICMP header содержит Type, Code, Checksum и поля, зависящие от типа. Identifier и Sequence Echo не являются TCP или UDP портами; фильтры по tcp.port не показывают такие сообщения.' },
      { heading: 'Как проверить захват',
        body: 'В Wireshark отфильтруй icmp и посмотри отдельно Ethernet II, Internet Protocol Version 4 и Internet Control Message Protocol. У IP проверь Protocol=1, у ICMP — Type/Code и Identifier/Sequence для сопоставления Echo Request/Reply.\n\nЕсли ответ не приходит, проверь направление и пакетные захваты на промежуточных точках, политику ACL/firewall, TTL и ICMP-ответы об ошибках. Сам таймаут ping не указывает однозначно на отказ физического канала.' },
    ],
    sources: ['RFC 792 — Internet Control Message Protocol', 'RFC 791 — Internet Protocol'],
  },
  relatedQuestionIds: ['gen-osi-a-9', 'tcp-07'],
  sources: ['RFC 792 — Internet Control Message Protocol', 'RFC 791 — Internet Protocol'],
};
