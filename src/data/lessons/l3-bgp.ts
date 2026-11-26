import type { Lesson } from './types';

export const LESSON_L3_BGP: Lesson = {
  "id": "l3-bgp",
  "title": "BGP: соседство, распространение и выбор выхода",
  "category": "L3 · Маршрутизация",
  "osiLayers": [
    "L3"
  ],
  "difficulty": "applied",
  "summary": "Как отличить работающий сеанс от пригодного маршрута, передать путь внутри автономной системы и понять, почему выбран именно этот выход.",
  "terms": [
    "BGP",
    "iBGP",
    "eBGP",
    "OpenSent",
    "OpenConfirm",
    "Established",
    "Route Reflector",
    "AS_PATH",
    "NEXT_HOP",
    "Weight",
    "Local Preference"
  ],
  "blocks": [
    {
      "heading": "Сеанс и маршрут — разные проверки",
      "body": "Сначала BGP устанавливает транспортное соединение, затем стороны обмениваются параметрами и подтверждениями. После отправки OPEN ожидается ответ в OpenSent; после принятия допустимого OPEN — подтверждение в OpenConfirm. Established означает, что сеанс установлен, но не обещает ни одного принятого маршрута.\n\nТип сеанса определяется номерами AS: одинаковые — iBGP, разные — eBGP. Loopback не превращает внешний сеанс во внутренний. У обычного Cisco IOS eBGP использует TTL 1, поэтому для пути через транзит одного IP-маршрута недостаточно: нужны подходящие настройки транспорта и обратная связность."
    },
    {
      "heading": "Почему цепочки iBGP недостаточно",
      "body": "Если R1 передал маршрут R2 по обычному iBGP, R2 не раздаёт его следующему iBGP-соседу только потому, что соединение с ним работает. Так ограничивается распространение маршрутов внутри системы.\n\nРешение — полная логическая связность сеансов или Route Reflector. Отражатель может передать выбранный путь от клиента другим клиентам и обычным соседям. Это меняет правила рекламы, а не физическую топологию: отдельный кабель между каждой парой участников не требуется."
    },
    {
      "heading": "Достигнуть следующего узла и не принять петлю",
      "body": "Полученный префикс может оказаться непригодным, если адрес NEXT_HOP неизвестен внутренней маршрутизации. В обычном случае путь от внешнего соседа передаётся внутрь без замены этого адреса. На границе next-hop-self к внутреннему соседу может подставить достижимый адрес самого пограничного маршрутизатора.\n\nОтдельно проверяется история AS_PATH. Если внешний путь уже содержит собственный AS, он по обычным правилам отклоняется как потенциальная петля. Рабочий сеанс и доступный следующий узел не отменяют эту проверку."
    },
    {
      "heading": "Локальный выбор и политика для всей системы",
      "body": "На Cisco IOS больший Weight сравнивается раньше большего Local Preference. Поэтому при путях Weight 200 / Local Preference 100 и Weight 0 / Local Preference 300 первый выиграет на этом маршрутизаторе.\n\nWeight не передаётся соседям: его действие локально. Local Preference помогает согласовать предпочтительный выход внутри AS. Алгоритм не складывает атрибуты и не считает два пути равными лишь потому, что каждый выигрывает по одному полю."
    }
  ],
  "relatedQuestionIds": [
    "l3-bgp-01",
    "l3-bgp-02",
    "l3-bgp-03",
    "l3-bgp-04",
    "l3-bgp-05",
    "l3-bgp-06",
    "l3-bgp-07"
  ],
  "sources": [
    "RFC 4271 — A Border Gateway Protocol 4 (BGP-4): https://www.rfc-editor.org/rfc/rfc4271",
    "RFC 4456 — BGP Route Reflection: https://www.rfc-editor.org/rfc/rfc4456",
    "Cisco — BGP Best Path Selection Algorithm: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/13753-25.html"
  ],
  "professional": {
    "summary": "BGP FSM, стандартные Cisco iBGP/eBGP параметры, правила Route Reflection, рекурсивный NEXT_HOP, AS_PATH loop detection и область действия Weight/Local Preference.",
    "terms": [
      "BGP",
      "iBGP",
      "eBGP",
      "OpenSent",
      "OpenConfirm",
      "Established",
      "Route Reflector",
      "AS_PATH",
      "NEXT_HOP",
      "Weight",
      "Local Preference"
    ],
    "blocks": [
      {
        "heading": "FSM и стандартные параметры Cisco",
        "body": "Успешный проход FSM может идти Idle → Connect → OpenSent → OpenConfirm → Established. Active также существует, но не является обязательной ступенью этого прохода. Корректный OPEN в OpenSent вызывает отправку KEEPALIVE и переход в OpenConfirm; полученный KEEPALIVE завершает установление. UPDATE не требуется для достижения Established.\n\nПри обычных настройках Cisco IOS external BGP AD=20, TTL=1; internal BGP AD=200, TTL=255. Это стандартные значения без изменённых distance, eBGP multihop и TTL security. Loopback-соседство требует подходящего update-source и обратной маршрутизации; AD влияет на RIB, а не исправляет транспорт TCP-сеанса."
      },
      {
        "heading": "iBGP advertisement и Route Reflection",
        "body": "Без RR или иной предусмотренной архитектуры iBGP-learned path не рекламируется другому iBGP peer даже при best-path статусе и достижимом NEXT_HOP. Full mesh — логические сеансы между каждой парой участников.\n\nПо RFC 4456 RR отражает выбранный путь от client другим clients и non-clients; путь от non-client — clients. ORIGINATOR_ID и CLUSTER_LIST защищают от петель отражения. next-hop-self и send-community не снимают обычный запрет повторной iBGP-рекламы. Отражение одного best path также может скрывать альтернативные пути."
      },
      {
        "heading": "NEXT_HOP и AS_PATH: разные условия пригодности",
        "body": "В обычной рекламе внешнего пути по iBGP NEXT_HOP сохраняется. Требуется его рекурсивная достижимость, а не только Established к отправителю UPDATE. next-hop-self на границе к нужному внутреннему peer должен объявить адрес, который получатель действительно достигает. Обычный eBGP часто переписывает следующий узел, но third-party next hop на общей сети и явные политики являются исключениями.\n\nAS_PATH проверяют независимо: собственный AS в полученном AS_SEQUENCE по умолчанию исключает путь. eBGP добавляет собственный AS при внешней рекламе, а iBGP не дополняет путь каждым внутренним переходом. allowas-in и AS override — явные специальные сценарии, не стандартное разрешение петель. Длина AS_PATH не равна IP TTL пакета UPDATE."
      },
      {
        "heading": "Weight перед Local Preference",
        "body": "В обычном Cisco IOS best-path higher Weight предшествует higher Local Preference. Поэтому путь A с Weight 200 / LP 100 локально выигрывает у B с Weight 0 / LP 300 без сравнения последующих критериев, включая AS_PATH.\n\nWeight — локальная Cisco-настройка, а не атрибут UPDATE. Local Preference передаётся по iBGP для согласования исходящего выбора внутри AS и обычно не передаётся обычным eBGP-соседям. Различающиеся значения Weight не создают равноправные multipath-пути; локальную политику выхода нельзя приписывать всем маршрутизаторам AS или считать прямым управлением входящим трафиком извне."
      }
    ],
    "sources": [
      "RFC 4271 — A Border Gateway Protocol 4 (BGP-4): https://www.rfc-editor.org/rfc/rfc4271",
      "RFC 4456 — BGP Route Reflection: https://www.rfc-editor.org/rfc/rfc4456",
      "Cisco — BGP Best Path Selection Algorithm: https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/13753-25.html"
    ],
    "sourceCommit": "new-2026-11-13"
  }
};
