import { IN_DEPTH_SECTIONS } from '../inDepth';
import { EXISTING_HEADING_LINKS } from './existingUnderstandingHeadings';
import type { Lesson, LessonBlock } from './types';

/** Explicit links from a reviewed question to the relevant paragraph inside an existing lesson.
 * A missing mapping deliberately keeps the ordinary lesson-at-top behavior: no guessed anchors.
 */
export interface SectionLink {
  lessonId: string;
  questionIds: string[];
  anchorId: string;
  afterHeading: { plain: string; professional: string };
  plain: LessonBlock;
  professional: LessonBlock;
}
const SECTION_LINKS: readonly SectionLink[] = [
  {
    "lessonId": "l7-dns",
    "questionIds": [
      "l4-d04"
    ],
    "anchorId": "in-depth-dns-tc-tcp-axfr-transport",
    "afterHeading": {
      "plain": "Усечение ответа и передача зоны",
      "professional": "Усечение ответа и передача зоны"
    },
    "plain": {
      "heading": "DNS: когда ответ приходится получать через TCP",
      "body": "DNS использует и UDP, и TCP. Если в UDP-ответе сервер поставил флаг TC=1, получатель не получил полный ответ и повторяет запрос по TCP. Полная передача зоны AXFR тоже идёт по TCP.\n\nПри этом обычный A-запрос не обязан использовать TCP. EDNS позволяет согласовать более крупный размер UDP-ответа; размер свыше старых 512 байт сам по себе не доказывает, что клиент перейдёт на TCP."
    },
    "professional": {
      "heading": "DNS TCP/53: TC=1, EDNS OPT, AXFR и границы применимости",
      "body": "По RFC 7766 DNS штатно поддерживает соединения TCP/53, не только UDP/53. При получении усечённого ответа по UDP с TC=1 клиенту нужен повтор запроса по TCP для полного содержимого. EDNS(0) объявляет допустимый UDP payload size, поэтому сравнение ответа с историческими 512 байтами без анализа EDNS не доказывает усечение.\n\nПолная AXFR-передача зоны использует TCP (RFC 5936); IXFR может передаваться по UDP, если весь ответ помещается в одно сообщение. В Wireshark проверяй QNAME/QTYPE, бит TC и EDNS OPT, затем наличие TCP-сессии к 53. HTTP/3 и тип обычной A-записи сами по себе не определяют выбор TCP."
    }
  },
  {
    "lessonId": "l1-otdr-trace-interpretation",
    "questionIds": [
      "photo-otdr-end"
    ],
    "anchorId": "otdr-end-of-fiber",
    "afterHeading": {
      "plain": "Импульс и форма события",
      "professional": "Интерпретация рефлектограммы"
    },
    "plain": {
      "heading": "Конец волокна: почему трасса проваливается в шум",
      "body": "OTDR измеряет свет, возвращающийся из волокна. Пока волокно продолжается, прибор видит обратнорассеянный сигнал. После физического конца волокна или полного обрыва обратное рассеяние за событием практически исчезает: трасса резко падает и переходит к шумовому полу прибора.\n\nПеред спадом иногда виден пик отражения, но его отсутствие не исключает обрыв. Сильное затухание тоже может опустить сигнал ниже чувствительности OTDR, поэтому один график без шкалы и таблицы событий не всегда доказывает точную причину."
    },
    "professional": {
      "heading": "Конец трассы, noise floor и подтверждение события",
      "body": "На рефлектограмме конец волокна или полный обрыв часто проявляется резким прекращением измеримого Rayleigh backscatter с дальнейшим участком noise floor; при отражающем торце перед падением возможен Fresnel peak. Отсутствие пика не исключает физический конец: форма зависит от отражательной способности торца, длительности импульса и динамического диапазона.\n\nНе путай конец волокна с началом измерения у прибора, локальным изгибом или соединением, после которого уровень продолжается. В спорной ситуации сопоставь Event Table, дистанцию, launch fibre, pulse width и измерения на другой длине волны; сильная потеря способна скрыть последующую трассу под шумом."
    }
  },
  {
    "lessonId": "l7-dns",
    "questionIds": [
      "gen-osi-a-19"
    ],
    "anchorId": "dns-nxdomain-application",
    "afterHeading": {
      "plain": "Как разбирать ошибку поиска",
      "professional": "Если имя не резолвится"
    },
    "plain": {
      "heading": "Запрос A и NXDOMAIN — работа прикладного DNS",
      "body": "Программа хочет подключиться к files.example.test, поэтому её служба разрешения имён ищет DNS-запись типа A — IPv4-адрес этого имени. Если приходит NXDOMAIN, значит DNS ответил, что запрошенного доменного имени не существует. Полученного адреса нет, и подключение по нему начать невозможно.\n\nЗапрос DNS и понимание ответа — функция прикладного уровня (L7 в модели OSI). Транспорт доставляет данные сокету, но не решает, означает ли NXDOMAIN отсутствие имени. NXDOMAIN также отличается от ситуации, когда имя существует, но записи A у него нет."
    },
    "professional": {
      "heading": "DNS RCODE=3: интерпретация NXDOMAIN на уровне приложения",
      "body": "Клиентский resolver формирует запрос QNAME=files.example.test, QTYPE=A. DNS-ответ с RCODE=3 (NXDOMAIN) означает отрицательный результат для имени в контексте ответа, а не timeout и не успешный ответ NOERROR/NODATA без A-записи. Системный resolver/приложение интерпретирует результат на прикладном уровне и не может использовать этот поиск для получения IPv4-адреса назначения.\n\nСравни dig files.example.test A и dig files.example.test AAAA, статус, авторитетную зону и negative cache. Доставка DNS-датаграммы до UDP-сокета относится к транспортному уровню; понимание QTYPE и RCODE — к прикладной логике. Если адрес получен и соединение не стартует, расследование уже другое."
    }
  },
  {
    "lessonId": "tcpip-model",
    "questionIds": [
      "tcp-06"
    ],
    "anchorId": "tcpip-end-to-end-fields",
    "afterHeading": {
      "plain": "Кому доставлять на каждом шаге",
      "professional": "Четыре уровня DoD"
    },
    "plain": {
      "heading": "Что сохраняется от клиента до сервера без NAT и прокси",
      "body": "Когда пакет проходит обычные маршрутизаторы, IP-адрес отправителя, IP-адрес получателя и номер порта нужной службы остаются сквозными. Они нужны, чтобы в итоге доставить данные правильному серверу и приложению.\n\nНа каждом канальном участке Ethernet-кадр собирается заново, поэтому Source/Destination MAC меняются. IPv4 TTL уменьшается при маршрутизации. Значит, в вопросе выбираем Source IP, Destination IP и Destination TCP/UDP port — не Destination MAC и не TTL."
    },
    "professional": {
      "heading": "Сквозные L3/L4 поля и hop-by-hop L2/TTL",
      "body": "При обычной IPv4-пересылке без NAT и прикладных прокси маршрутизатор сохраняет конечные src/dst IP и TCP/UDP destination port, но уменьшает IPv4 TTL (и обновляет контрольную сумму IPv4-заголовка). Исходный Ethernet-кадр при маршрутизации снимается, на исходящий интерфейс формируется новый L2-заголовок с MAC следующего перехода.\n\nОтдельно учитывай границы условия: NAT/PAT способен менять адреса или порты, прокси создаёт новый сеанс, а туннель добавляет внешний пакет. Даже без NAT TCP/UDP checksum может перепроверяться на концах; не смешивай сквозную идентичность полей с гарантией доставки."
    }
  },
  {
    "lessonId": "l7-monitoring-snmp-syslog",
    "questionIds": [
      "mon-syslog-05"
    ],
    "anchorId": "in-depth-syslog-monitor-vty",
    "afterHeading": {
      "plain": "Куда пишутся логи на устройстве и как защититься от шторма",
      "professional": "Архитектура Syslog: PRI, пороги и выбор транспорта"
    },
    "plain": {
      "heading": "Буфер show logging и живые события в SSH — разные каналы",
      "body": "Команда show logging читает сохранённые записи из локального буфера. Это не доказывает, что события автоматически выводятся в открытую SSH-сессию. Для живого потока нужны разрешённый уровень logging monitor и команда terminal monitor именно в этой терминальной сессии.\n\nlogging console отвечает за физический консольный порт, а logging buffered — за хранение в памяти. Не включай debugging на консоли без нужды: интенсивный вывод может ухудшить работу устройства."
    },
    "professional": {
      "heading": "Cisco IOS: logging buffered, logging monitor, terminal monitor и console",
      "body": "В Cisco IOS направления журналирования разделены: buffered (циклический RAM-буфер, доступный через show logging), console (физическая консоль), monitor (удалённая VTY-сессия) и host (внешний syslog). Новые записи в show logging подтверждают локальное сохранение, но не включение live-вывода в текущем SSH terminal.\n\nДля VTY нужен соответствующий severity threshold logging monitor и команда terminal monitor в самой сессии. Команда terminal no monitor отключает такой вывод. logging console debugging не направляет сообщения во все SSH-окна и при большом потоке способен нагружать устройство. Сопоставь show logging, running-config logging monitor и состояние своей VTY-сессии, затем проверь на безопасном тестовом событии."
    }
  },
  ...IN_DEPTH_SECTIONS,
];

export interface AnchoredLessonBlock extends LessonBlock {
  anchorId?: string;
}

export function getLessonSectionForQuestion(lessonId: string, questionId: string | null | undefined): string | undefined {
  if (!questionId) return undefined;
  return SECTION_LINKS.find(item => item.lessonId === lessonId && item.questionIds.includes(questionId))?.anchorId
    ?? EXISTING_HEADING_LINKS.find(item => item.lessonId === lessonId && item.questionIds.includes(questionId))?.anchorId;
}

/** Add concise sections to already-authored lessons without cloning entire protected lesson files.
 * Both reading modes receive an identically anchored section.
 */
export function getLessonBlocksWithSections(lesson: Lesson, mode: 'plain' | 'professional'): AnchoredLessonBlock[] {
  const base = mode === 'professional' && lesson.professional ? lesson.professional.blocks : lesson.blocks;
  // Stable target on an existing authored paragraph, without duplicating the lesson.
  const result: AnchoredLessonBlock[] = base.map(block => {
    const targets = EXISTING_HEADING_LINKS.filter(item =>
      item.lessonId === lesson.id && item.afterHeading[mode] === block.heading);
    if (targets.length > 1) throw new Error('Conflicting direct anchors: '+lesson.id+'/'+block.heading);
    return targets.length === 1 ? {...block,anchorId:targets[0].anchorId} : {...block};
  });
  for (const section of SECTION_LINKS.filter(item => item.lessonId === lesson.id)) {
    const heading = mode === 'professional' ? section.afterHeading.professional : section.afterHeading.plain;
    let index = result.findIndex(block => block.heading === heading);
    // Fail closed: never place an unrelated-looking paragraph at the end of a changed lesson.
    // The strict contract test catches missing headings before publishing.
    if (index < 0) continue;
    // Several reviewed topics may follow one original block; preserve authored order.
    while (result[index + 1]?.anchorId && SECTION_LINKS.some(item => item.anchorId === result[index + 1].anchorId && item.lessonId === lesson.id && (mode === 'professional' ? item.afterHeading.professional : item.afterHeading.plain) === heading)) index++;
    result.splice(index + 1, 0, {
      ...(mode === 'professional' ? section.professional : section.plain),
      anchorId: section.anchorId,
    });
  }
  return result;
}

export const QUESTION_SECTION_LINKS = [
  ...SECTION_LINKS.map(({lessonId,questionIds,anchorId,afterHeading}) => ({lessonId,questionIds,anchorId,afterHeading})),
  ...EXISTING_HEADING_LINKS,
];
