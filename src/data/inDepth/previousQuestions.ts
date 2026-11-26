import type { Question } from '../../types/quiz';

/** Exact pre-L2 option snapshots. Correct indices are unchanged; the Wi-Fi answer wording is technically corrected. */
export const PREVIOUS_IN_DEPTH_QUESTIONS: Readonly<Record<string, Question>> = {
  "l4-x03": {
    "id": "l4-x03",
    "group": "l4",
    "topic": "L4 · UDP",
    "text": "UDP предпочитают, когда…",
    "answers": [
      "Важны низкая задержка и простота (DNS, RTP, игры)",
      "Нужна строгая доставка каждого байта как в файле",
      "Нужен обязательный 3-way handshake",
      "Нужен только RST"
    ],
    "correct": [
      0
    ],
    "explanation": "UDP — минимальный транспорт без соединения.",
    "difficulty": "applied"
  },
  "l4-x04": {
    "id": "l4-x04",
    "group": "l4",
    "topic": "L4 · TCP",
    "text": "TCP window size влияет на…",
    "answers": [
      "Сколько данных можно отправить без ACK (throughput на длинных RTT)",
      "Только VLAN ID",
      "Только ARP timeout",
      "Только цвет индикатора линка"
    ],
    "correct": [
      0
    ],
    "explanation": "Окно и bandwidth-delay product ограничивают скорость.",
    "difficulty": "applied"
  },
  "wifi-std-04": {
    "id": "wifi-std-04",
    "group": "l1-l2",
    "topic": "L1–L2 · Wi-Fi 6 / 6E / 7",
    "text": "В переговорной десятки ноутбуков и смартфонов непрерывно обмениваются короткими кадрами мессенджеров и голоса. Какая технология стандарта 802.11ax (Wi-Fi 6) позволяет точке доступа делить один радиоканал на небольшие частотные блоки RU и передавать данные сразу группе клиентов в одном кадре, и что к этому добавляет Wi-Fi 6E / 802.11be?",
    "answers": [
      "Технология SAE делит канал на временные слоты, а Wi-Fi 6E расширяет полосу 2,4 ГГц до 160 МГц",
      "Технология PMF объединяет кадры клиентов, а 802.11be переводит Wi-Fi на проводной Full-Duplex",
      "Технология DFS выделяет каждому клиенту отдельный радарный канал на 5 ГГц",
      "Технология OFDMA делит канал на частотные блоки Resource Units (RU), а Wi-Fi 6E и 802.11be открывают чистый диапазон 6 ГГц"
    ],
    "correct": [
      3
    ],
    "explanation": "OFDMA в 802.11ax делит канал на частотные RU для параллельного обслуживания клиентов, а Wi-Fi 6E и 802.11be добавляют спектр 6 ГГц.",
    "remember": "OFDMA (Wi-Fi 6 / 802.11ax) = деление канала на RU для коротких пакетов множества клиентов; Wi-Fi 6E / 7 (802.11be) = чистый диапазон 6 ГГц.",
    "difficulty": "beginner"
  }
,
  "tr-03": {
    "id": "tr-03",
    "group": "troubleshooting",
    "topic": "Диагностика · Практика",
    "text": "http://10.1.1.5 открывается, http://site.example нет, ping 10.1.1.5 проходит. Что проверить первым?",
    "answers": [
      "Ответ DNS-сервера для этого имени",
      "ARP-запись шлюза для удалённой сети",
      "Маршрут по умолчанию на клиенте",
      "Таблицу MAC на промежуточном коммутаторе"
    ],
    "correct": [
      0
    ],
    "explanation": "Сначала проверяют DNS-ответ и адрес, в который разрешается имя. Если он корректен, проверяют настройки виртуального хоста: доступ по IP и по имени может давать разные HTTP-ответы.",
    "template": false,
    "difficulty": "applied"
  },
  "tr-10": {
    "id": "tr-10",
    "group": "troubleshooting",
    "topic": "Диагностика · Маршрут",
    "text": "Локальные узлы доступны, а удалённые сети — нет. Что проверить в первую очередь?",
    "answers": [
      "Шлюз и маршруты",
      "ARP и aging MAC",
      "VLAN и PVID порта",
      "Speed и duplex линка"
    ],
    "correct": [
      0
    ],
    "explanation": "Связь внутри подсети подтверждает проверенный локальный путь, а не исправность всего L1/L2-сегмента. Для удалённых сетей отдельно проверяют шлюз, маршруты туда и обратно и фильтрацию.",
    "template": false,
    "difficulty": "applied"
  }
};

/** Recognize only the reviewed historical option sets, never arbitrary bank drift. */
export function previousInDepthSnapshot(current: Question, saved: {text?: unknown;answers?: unknown;correct?: unknown}, order?: unknown): Question | undefined {
  const previous = PREVIOUS_IN_DEPTH_QUESTIONS[current.id];
  if (!previous || saved.text !== previous.text || !Array.isArray(saved.answers) || !Array.isArray(saved.correct)) return undefined;
  const indices = order === undefined ? previous.answers.map((_,index)=>index) : order;
  if (!Array.isArray(indices) || indices.length !== previous.answers.length || new Set(indices).size !== indices.length || indices.some(i=>!Number.isInteger(i)||i<0||i>=previous.answers.length)) return undefined;
  const answers=indices.map(i=>previous.answers[i]);
  const correct=indices.flatMap((i,displayed)=>previous.correct.includes(i)?[displayed]:[]);
  return JSON.stringify(saved.answers)===JSON.stringify(answers) && JSON.stringify(saved.correct)===JSON.stringify(correct) ? {...current,...previous} : undefined;
}
