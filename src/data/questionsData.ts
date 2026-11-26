import rawQuestions from './questions.json';
import { DIAGNOSTIC_QUESTIONS_177 } from './diagnosticCases177';
import { MONITORING_QUESTIONS } from './monitoringCases';
import { WIFI_QUESTIONS } from './wifiCases';
import { EXPERT_CASES_177 } from './expertCases177';
import { EXPERT_QUESTIONS_225 } from './expertCases225';
import { sharedAssetUrl } from '../config/sharedAssets';
import { EXTRA_QUESTIONS } from './questionsExtra';
import { EXTRA_DIFFICULTY_QUESTIONS } from './questionsExtraDifficulty';
import { Question, QuizMode, QuizModeId, ExamDifficulty } from '../types/quiz';
import { selectMixedQuestions } from './mixedExam';
import { selectBeginnerQuestions } from './beginnerExam';

/** Base bank + expansion packs. Existing questions.json is never trimmed. */
export const ALL_QUESTIONS: Question[] = [
  ...(rawQuestions as Question[]),
  ...EXTRA_QUESTIONS,
  ...EXTRA_DIFFICULTY_QUESTIONS,
  ...DIAGNOSTIC_QUESTIONS_177,
  ...MONITORING_QUESTIONS,
  ...WIFI_QUESTIONS,
  ...EXPERT_QUESTIONS_225,
  ...EXPERT_CASES_177.map(item => item.question),
];

/** Unique IDs only — source of truth for UI counters. */
function computeBankStats(questions: Question[]) {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const q of questions) {
    if (seen.has(q.id)) duplicates.push(q.id);
    else seen.add(q.id);
  }
  if (duplicates.length > 0 && typeof console !== 'undefined') {
    console.warn('[questionsData] Duplicate question ids:', [...new Set(duplicates)]);
  }
  return {
    total: seen.size,
    duplicates: [...new Set(duplicates)],
  };
}

const _bankStats = computeBankStats(ALL_QUESTIONS);

/** Actual unique question count across all connected packs. */
export const TOTAL_QUESTION_COUNT = _bankStats.total;

/** Duplicate ids if any (empty when bank is clean). */
export const DUPLICATE_QUESTION_IDS = _bankStats.duplicates;

export const QUIZ_MODES: QuizMode[] = [
  {
    id: 'mixed',
    title: 'Смешанное тестирование',
    subtitle: 'Все уровни OSI и стек TCP/IP',
    description: 'Комплексный срез знаний по всем темам: от оптики и витой пары до прикладных протоколов.',
    icon: 'Layers',
    count: ALL_QUESTIONS.filter((q) => q.group !== 'visual-l1').length,
  },
  {
    id: 'l1-l2',
    title: 'L1–L2: Физика и Ethernet',
    subtitle: 'Кабели, оптика, SFP, MAC, VLAN, STP',
    description: 'Сигналы, коллизионные домены, широковещание, коммутаторы, транки и агрегация каналов.',
    icon: 'Cpu',
    groupFilter: 'l1-l2',
    count: ALL_QUESTIONS.filter((q) => q.group === 'l1-l2').length,
  },
  {
    id: 'l3',
    title: 'L3: IPv4, IPv6 и маршрутизация',
    subtitle: 'Адресация, маски, CIDR, ARP, ICMP',
    description: 'Маршрутизация, таблицы пересылки, деление на подсети, TTL, MTU и фрагментация.',
    icon: 'Network',
    groupFilter: 'l3',
    count: ALL_QUESTIONS.filter((q) => q.group === 'l3').length,
  },
  {
    id: 'l4',
    title: 'L4: TCP и UDP',
    subtitle: 'Транспортный уровень, порты, сокеты',
    description: '3-way handshake, флаги SYN/ACK/FIN/RST, надежность, скользящее окно и тайм-ауты.',
    icon: 'Repeat',
    groupFilter: 'l4',
    count: ALL_QUESTIONS.filter((q) => q.group === 'l4').length,
  },
  {
    id: 'l5-l7',
    title: 'L5–L7: Приложения и безопасность',
    subtitle: 'DNS, HTTP/1-3, TLS, DHCP, SSH',
    description: 'Прикладные протоколы, сертификаты, сессии, REST API и шифрование данных.',
    icon: 'Globe',
    groupFilter: 'l5-l7',
    count: ALL_QUESTIONS.filter((q) => q.group === 'l5-l7').length,
  },
  {
    id: 'tcpip',
    title: 'Стек TCP/IP',
    subtitle: 'Модель и архитектура стека',
    description: 'Инкапсуляция, декапсуляция, заголовки и соответствие с 7-уровневой моделью OSI.',
    icon: 'FileCode',
    groupFilter: 'tcpip',
    count: ALL_QUESTIONS.filter((q) => q.group === 'tcpip').length,
  },
  {
    id: 'troubleshooting',
    title: 'Диагностика сети и CLI',
    subtitle: 'Практический траблшутинг и команды',
    description: 'Использование ping, traceroute, netstat, ip link/route, wireshark и разбор инцидентов.',
    icon: 'Terminal',
    groupFilter: 'troubleshooting',
    count: ALL_QUESTIONS.filter((q) => q.group === 'troubleshooting').length,
  },
  {
    id: 'visual-l1',
    title: 'L1 — по фото оборудования',
    subtitle: 'Патч-корды, разъемы, SFP, шасси',
    description: 'Реальные фотографии серверного и телеком-оборудования, портов и маркировок.',
    icon: 'Camera',
    groupFilter: 'visual-l1',
    count: ALL_QUESTIONS.filter((q) => q.group === 'visual-l1').length,
  },
];

type LegacyExamDifficulty = Exclude<ExamDifficulty, 'in-depth'>;

// These pairs ask for the same fact. Other families can group distinct skills
// under a broad topic, which the legacy topic shuffle may sample together.
const equivalentQuestionFamilies = new Set(['tcp-rst-meaning', 'tcpip-application-mapping']);

const examQuestionDifficulty = {
  beginner: 'beginner',
  applied: 'applied',
} as const;
export function filterExamDifficulty(questions: readonly Question[], difficulty: LegacyExamDifficulty): Question[] {
  return questions.filter(q => difficulty === 'mixed' || q.difficulty === examQuestionDifficulty[difficulty]);
}

export function getExamPool(modeId: QuizModeId, difficulty: LegacyExamDifficulty): Question[] {
  return filterExamDifficulty(ALL_QUESTIONS, difficulty).filter(q =>
    modeId === 'mixed' ? difficulty !== 'mixed' || q.group !== 'visual-l1' : q.group === modeId);
}

export function getRandomQuestions(
  modeId: QuizModeId,
  count: number = 10,
  random: () => number = Math.random,
  difficulty: LegacyExamDifficulty = 'mixed'
): Question[] {
  // Preserve the existing all-level mixed quotas. Beginner pools have their own
  // strict sample: photo/group quotas must never pull in a different difficulty.
  if (difficulty === 'mixed' && modeId === 'mixed' && count === 10) return selectMixedQuestions(ALL_QUESTIONS, random);
  const pool = getExamPool(modeId, difficulty);
  if (difficulty === 'beginner') return selectBeginnerQuestions(pool, count, random);

  const shuffled = [...new Map(pool.map(q => [q.id, q])).values()];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  if (count >= shuffled.length) return shuffled;
  // Prefer a different skill before drawing a second variant from the same family.
  const families = new Set<string>();
  const alternatives: Question[] = [];
  const distinct = shuffled.filter(question => {
    const family = question.family;
    if (!family || !equivalentQuestionFamilies.has(family)) return true;
    if (families.has(family)) {
      alternatives.push(question);
      return false;
    }
    families.add(family);
    return true;
  });
  return distinct.concat(alternatives).slice(0, count);
}

/** New attempts only; custom pools (including mistakes) must never be expanded. */
export function getNewAttemptQuestions(
  modeId: QuizModeId,
  count: number,
  random: () => number,
  difficulty: LegacyExamDifficulty,
  customQuestions?: readonly Question[],
): Question[] {
  if (!customQuestions) return getRandomQuestions(modeId, count, random, difficulty);
  const pool = filterExamDifficulty(customQuestions, difficulty);
  return difficulty === 'beginner' ? selectBeginnerQuestions(pool, count, random) : pool.slice(0, count);
}

export function resolveImageUrl(imgPath?: string): string {
  if (!imgPath) return '';
  if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
    return imgPath;
  }
  return sharedAssetUrl(imgPath);
}
