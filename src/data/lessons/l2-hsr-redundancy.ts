import type { Lesson } from './types';

/** Final beginner foundation coverage, individually authored rather than generic fallback. */
export const LESSON_L2_HSR_REDUNDANCY: Lesson = {
  "id": "l2-hsr-redundancy",
  "title": "HSR: кольцо с безударным резервированием",
  "category": "L2 · Резервирование",
  "osiLayers": [
    "L2"
  ],
  "difficulty": "advanced",
  "summary": "Как узлы HSR дублируют кадры по обоим направлениям кольца, зачем удаляют дубликаты и почему это не STP и не PRP.",
  "terms": [
    "HSR",
    "PRP",
    "Ethernet",
    "кадр",
    "RSTP",
    "MAC"
  ],
  "blocks": [
    {
      "heading": "Зачем в технологическом кольце нужен второй путь",
      "body": "При обычной схеме с одним путём обрыв кабеля сразу прерывает связь. Резервирование предназначено для доставки даже после отказа одного участка сети.\n\nHSR организует кольцо специальных узлов, через которое данные могут прийти в двух направлениях. Важный принцип: резервный путь используют сразу, а не только после обнаружения неисправности.\n\nПоэтому HSR особенно полезен там, где даже короткий простой недопустим. Но оборудование и топология должны действительно поддерживать протокол."
    },
    {
      "heading": "Две копии одного кадра",
      "body": "Отправляющий HSR-узел делает две копии кадра и одновременно отправляет их в разные стороны кольца.\n\nПолучатель принимает первую подходящую копию и узнаёт вторую по служебной информации; дубликат удаляется, чтобы приложение не получило пакет дважды.\n\nПри обрыве одного направления в нормальных условиях остаётся копия, идущая другим путём. Правильный ответ: две стороны кольца, а не путь с наименьшей метрикой."
    },
    {
      "heading": "HSR не блокирует один путь, как STP",
      "body": "STP и RSTP обычно предотвращают Ethernet-петли: один из избыточных путей не пересылает пользовательские кадры в нормальном состоянии.\n\nHSR не строит такую схему ожидания. В его кольце в норме одновременно работают два противоположных направления, а дубли удаляются у получателей по правилам протокола.\n\nЕсли в задании встречается «ждём сбоя и только тогда отправляем вторую копию», это не стандартный принцип HSR."
    },
    {
      "heading": "Чем отличается PRP и как проверять",
      "body": "PRP также передаёт дубликаты, но использует две независимые локальные сети, а не одно HSR-кольцо.\n\nДля HSR проверяют поддерживаемость узлов, кольцевые порты, дубликаты и диагностические счётчики. Не стоит самовольно отключать одно направление только из-за видимого дублирования.\n\nТочный порядок диагностики и допустимую длину кольца берут из документации используемой аппаратуры."
    }
  ],
  "professional": {
    "summary": "IEC 62439-3 High-availability Seamless Redundancy, DANH, duplication, duplicate discard и отличие от STP/PRP.",
    "terms": [
      "HSR",
      "PRP",
      "Ethernet",
      "кадр",
      "RSTP",
      "MAC"
    ],
    "blocks": [
      {
        "heading": "Принцип 0-ms seamless switchover",
        "body": "High-availability Seamless Redundancy (IEC 62439-3) sends redundant copies of a frame around the ring in opposite directions via DANH nodes. Recipient recognizes duplicates and forwards only one to higher layers; the second path is in service before an interruption. При одиночном отказе участка на корректно построенном кольце альтернативная копия обеспечивает доставку без классического времени переключения резервного пути.\n\nSeamless operation assumes HSR-compatible forwarding, configured interconnections and appropriate node behavior. Это не абсолютная гарантия при множественных разрывах, перегрузке или неверной конфигурации."
      },
      {
        "heading": "Duplicate handling and supervision",
        "body": "HSR forwarding and duplicate discard rely on protocol-specific redundancy information including sequence identification and supervision mechanisms. Получатель должен отличать две копии одного сообщения от двух самостоятельных сообщений; иначе защита превратилась бы в дубли на уровне приложения.\n\nПри диагностике смотрят счётчики supervision/duplicates, состояния ring ports и фактическую связность обеих сторон. Проброс обычного Ethernet через RedBox или переходные устройства требует соответствующего проектирования."
      },
      {
        "heading": "Сравнение STP/RSTP и HSR",
        "body": "STP/RSTP защищает обычные Ethernet-топологии от петель выбором active/alternate forwarding tree, обычно временно блокируя избыточный путь. HSR специально допускает активное дублирование по кольцу с discard на конечных узлах. Нельзя объяснять HSR выбором root bridge или metric/Hash пути: это механизмы других задач.\n\nОбычный non-HSR switch, поставленный без учёта протокола в кольцо, может нарушить ожидаемое прохождение кадров и redundancy semantics."
      },
      {
        "heading": "HSR vs PRP",
        "body": "PRP (Parallel Redundancy Protocol, тот же IEC 62439-3) дублирует кадры на две логически независимые LAN A/B; HSR распределяет копии в противоположных направлениях одной HSR ring. Для interworking могут использоваться RedBoxes. Проверяйте требования совместимости конечных узлов, сетевых устройств, supervision и обеспечения отсутствия одиночной общей точки отказа.\n\nВ тестах корректный выбор HSR — две копии в противоположные направления кольца, независимо от первоначального состояния линков."
      }
    ],
    "sources": [
      "IEC 62439-3 — Industrial communication networks: PRP and HSR",
      "IEEE 802.1D / IEEE 802.1w — Spanning Tree and Rapid Spanning Tree"
    ]
  },
  "relatedQuestionIds": [
    "review-hsr-14"
  ],
  "sources": [
    "IEC 62439-3 — HSR / PRP"
  ]
};
