import type { Lesson } from './types';

export const LESSON_L3_EIGRP: Lesson = {
  "id": "l3-eigrp",
  "title": "EIGRP: резервные пути, метрики и соседство",
  "category": "L3 · Маршрутизация",
  "osiLayers": [
    "L3"
  ],
  "difficulty": "applied",
  "summary": "Как разрешить несколько путей к одной сети, изменить предпочтение выбранных маршрутов и найти причину отказа соседства после настройки ключей.",
  "terms": [
    "EIGRP",
    "Variance",
    "Feasible Successor",
    "FD",
    "RD",
    "Offset-list",
    "Administrative Distance",
    "Null0",
    "MD5",
    "key-chain"
  ],
  "blocks": [
    {
      "heading": "Сначала безопасный резерв, затем несколько путей",
      "body": "Более дорогой путь не обязательно нужно оставлять без работы. EIGRP может использовать несколько путей разной стоимости, но сначала проверяет, что дополнительный путь безопасен по информации соседа.\n\nДля этого объявленная соседом стоимость RD должна быть меньше локальной FD. Только затем Variance допускает подходящие по полной стоимости пути. Например, при FD и стоимости основного пути 100000 резерв с RD 60000 и полной стоимостью 180000 подходит при variance 2; путь с RD 110000 не подходит, даже если его полная стоимость меньше 200000. Лимит maximum-paths также должен разрешать нужное число путей."
    },
    {
      "heading": "Добавить стоимость выбранному маршруту",
      "body": "Иногда нужно сделать путь менее привлекательным, не запрещая его полностью. Offset-list добавляет стоимость выбранным маршрутам: in — на приёме, out — при отправке через указанный интерфейс.\n\nСписок ACL здесь выбирает, какие маршруты изменить. Если маршрут не совпал с разрешением списка, он не получает добавку, а не удаляется из протокола. Поэтому после правки сравнивают метрики и выбранный путь; Administrative Distance этой настройкой не меняется."
    },
    {
      "heading": "Не смешивать метрику и доверие источнику",
      "body": "Если один и тот же префикс предлагают разные источники, сначала важно понять, чья запись попадёт в таблицу. На Cisco IOS стандартное административное расстояние внутреннего EIGRP — 90, внешнего — 170, а локально созданной сводки в Null0 — 5. У OSPF оно обычно 110.\n\nЭти числа не являются стоимостью пути и не сравнивают длину совпадения для пакета. Более конкретный установленный маршрут всё равно предпочтительнее сводки при пересылке. Значение 5 относится к локальной summary-записи, а не к любой сводке, полученной от соседа."
    },
    {
      "heading": "После включения проверки ключом пропало соседство",
      "body": "Если раньше соседи работали, а после включения MD5 только на одном конце перестали, сначала сверяют настройки проверки сообщений. В classic EIGRP на Cisco IOS обе стороны должны использовать совместимые MD5-параметры и действующие ключи.\n\nПроверяют номер ключа, секрет и сроки действия, а не только имя key-chain: имена локальны и могут различаться. Отключение проверки не сохраняет требование безопасности, а открытый пароль из примеров OSPF не является альтернативным режимом classic EIGRP. Если ключи согласованы, продолжают проверку AS, K-values и связности."
    }
  ],
  "relatedQuestionIds": [
    "l3-eigrp-01",
    "l3-eigrp-02",
    "l3-eigrp-03",
    "l3-eigrp-04",
    "l3-eigrp-05"
  ],
  "sources": [
    "RFC 7868 — Cisco's Enhanced Interior Gateway Routing Protocol (EIGRP): https://www.rfc-editor.org/rfc/rfc7868",
    "Cisco Catalyst 9400 — Configuring EIGRP: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/16-10/configuration_guide/rtng/b_1610_rtng_9400_cg/configuring_eigrp.pdf"
  ],
  "professional": {
    "summary": "Практика EIGRP: feasibility condition, unequal-cost forwarding, направленное изменение метрики, стандартные AD Cisco и диагностика classic MD5 authentication.",
    "terms": [
      "EIGRP",
      "Variance",
      "Feasible Successor",
      "FD",
      "RD",
      "Offset-list",
      "Administrative Distance",
      "Null0",
      "MD5",
      "key-chain"
    ],
    "blocks": [
      {
        "heading": "DUAL, FD/RD и Variance",
        "body": "Feasibility Condition: RD кандидата строго меньше локальной FD. FD — наименьшая полная стоимость с последнего перехода маршрута в Passive и не обязана всегда совпадать с текущей метрикой successor. В стабильном примере, где обе равны 100000, кандидат RD=60000/metric=180000 допустим при variance 2, а RD=110000/metric=190000 не проходит feasibility.\n\nVariance не превращает любой близкий по стоимости путь в Feasible Successor. Для RD=60000 и metric=240000 при основном 100000 минимальный целый множитель — 3. Дополнительно учитываются maximum-paths и пригодность кандидатов; unequal-cost forwarding не означает равное количество пакетов на каждом пути."
      },
      {
        "heading": "Offset-list и область её действия",
        "body": "В Cisco IOS offset-list <ACL> in|out <offset> [interface] увеличивает метрику совпавших маршрутов в выбранном направлении. ACL в этом контексте — селектор, а не distribute-list: deny или implicit deny означает не применять offset к маршруту.\n\nВходная политика может изменить локальный выбор successor; выходная — сведения, отправляемые соседям. Проверяют конкретный интерфейс, префикс и topology table до/после. Единицы классической и wide-метрики не следует смешивать. Offset не меняет AD и не снимает требования DUAL к допустимости путей."
      },
      {
        "heading": "RIB: internal, external и local summary",
        "body": "При стандартных настройках Cisco IOS AD local EIGRP summary=5, internal EIGRP=90, OSPF=110, external EIGRP=170. Для одного префикса одинаковой длины меньшая AD предпочтительнее; непосредственно сравнивать метрики разных протоколов нельзя.\n\nЛокальная summary discard-запись в Null0 и выученный у соседа summary — разные случаи: удалённая сводка не наследует AD 5. При пересылке применяется longest-prefix match среди установленных записей, поэтому более конкретный маршрут выигрывает независимо от меньшей AD сводки."
      },
      {
        "heading": "Classic EIGRP MD5: совместимость проверки",
        "body": "Для classic IPv4 EIGRP на IOS согласуют ip authentication mode eigrp <AS> md5 и ip authentication key-chain eigrp <AS> <name>. Проверяют key ID, key-string, send/accept lifetime и часы. Название key-chain не передаётся как общий пароль и не обязано совпадать на узлах.\n\nОтсутствие authentication на одном конце не эквивалентно совместимому MD5. Simple/plain authentication OSPF нельзя переносить на classic EIGRP. На поддерживаемых платформах named EIGRP может использовать HMAC-SHA-256, но его настройки не подменяют classic MD5-сценарий. Согласованность AS, K-values и transport reachability проверяется отдельно."
      }
    ],
    "sources": [
      "RFC 7868 — Cisco's Enhanced Interior Gateway Routing Protocol (EIGRP): https://www.rfc-editor.org/rfc/rfc7868",
      "Cisco Catalyst 9400 — Configuring EIGRP: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/16-10/configuration_guide/rtng/b_1610_rtng_9400_cg/configuring_eigrp.pdf"
    ],
    "sourceCommit": "new-2026-11-13"
  }
};
