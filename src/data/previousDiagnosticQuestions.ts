import type { Question } from '../types/quiz';

// Bank wording before the four diagnostic rewrites. Resuming an attempt must keep its original text and key.
export const PREVIOUS_DIAGNOSTIC_QUESTIONS: Readonly<Partial<Record<string, Pick<Question, 'text' | 'explanation' | 'answers' | 'correct'>>>> = {
  "l4-d02": {
    "text": "Retransmissions растут, RTT большой. Window scaling согласован. Что ещё смотреть?",
    "explanation": "TCP ретрансмиты — сигнал потерь/задержек/ограничений пути.",
    "answers": [
      "Потери на пути, bufferbloat, policing, MTU/PMTUD",
      "Только native VLAN",
      "Только цвет индикатора SFP",
      "Только PTR DNS"
    ],
    "correct": [
      0
    ]
  },
  "ts-d04": {
    "text": "Один поток TCP медленный, iperf UDP примерно ок. Куда копать?",
    "explanation": "TCP чувствителен к loss/RTT; UDP iperf не равен поведению TCP.",
    "answers": [
      "Потери/reordering для TCP, policing, bufferbloat, window, middlebox",
      "Только RX optical dBm на всех порах core",
      "Только DHCP pool",
      "Только цвет патч-корда"
    ],
    "correct": [
      0
    ]
  },
  "ts-d06": {
    "text": "Какой порядок разумнее при «интернет есть / телефония SIP нет»?",
    "explanation": "Сервис-специфичные порты и NAT/ALG для VoIP.",
    "answers": [
      "Проверить DNS, ALG/NAT, ACL по SIP/RTP портам, ALG, одностороннее аудио (NAT)",
      "Сразу перепрошить все коммутаторы",
      "Отключить все VLAN",
      "Удалить default route"
    ],
    "correct": [
      0
    ]
  },
  "ts-d08": {
    "text": "Симптом: «отваливается через ~5 минут». Какие гипотезы рациональны? Выберите все подходящие.",
    "explanation": "Тайм-ауты state/ARP/DHCP — частые «через N минут».",
    "answers": [
      "ARP/MAC aging и silent hosts",
      "DHCP lease/renewal сбой",
      "Firewall session timeout",
      "Обязательно только температура SFP как единственная причина"
    ],
    "correct": [
      0,
      1,
      2
    ]
  }
};
