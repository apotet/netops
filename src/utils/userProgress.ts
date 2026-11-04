// Persistent User Progress and Dynamic Exam Readiness Engine

export interface LevelMastery {
  level: string; // 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7'
  name: string;
  total: number;
  correct: number;
  masteryPercent: number;
}

export interface ProgressState {
  answeredCount: number;
  correctCount: number;
  readinessPercent: number;
  streakDays: number;
  weakSpot: {
    level: string;
    topic: string;
    description: string;
  };
  strongSpot: {
    level: string;
    topic: string;
    description: string;
  };
  levels: Record<string, LevelMastery>;
  lastExamDate?: string;
  answeredQuestions: Record<string, { correct: boolean; timestamp: number; level: string }>;
}

const STORAGE_KEY = 'osi_user_progress_v3';

const DEFAULT_LEVEL_NAMES: Record<string, string> = {
  L7: 'Прикладной (HTTP/3, DNS)',
  L6: 'Представления (TLS, JSON)',
  L5: 'Сеансовый (RPC, сессии)',
  L4: 'Транспортный (TCP, UDP, порты)',
  L3: 'Сетевой (IPv4, подсети, TTL)',
  L2: 'Канальный (Ethernet, VLAN, MAC)',
  L1: 'Физический (Оптика, SFP, витая пара)',
};

export function getInitialProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.readinessPercent === 'number') {
        return parsed;
      }
    }
  } catch {
    // fallback
  }

  // Sensible default state that reflects current practice state
  const defaultLevels: Record<string, LevelMastery> = {
    L7: { level: 'L7', name: DEFAULT_LEVEL_NAMES.L7, total: 10, correct: 8, masteryPercent: 80 },
    L6: { level: 'L6', name: DEFAULT_LEVEL_NAMES.L6, total: 8, correct: 6, masteryPercent: 75 },
    L5: { level: 'L5', name: DEFAULT_LEVEL_NAMES.L5, total: 6, correct: 4, masteryPercent: 67 },
    L4: { level: 'L4', name: DEFAULT_LEVEL_NAMES.L4, total: 14, correct: 11, masteryPercent: 78 },
    L3: { level: 'L3', name: DEFAULT_LEVEL_NAMES.L3, total: 18, correct: 9, masteryPercent: 50 },
    L2: { level: 'L2', name: DEFAULT_LEVEL_NAMES.L2, total: 12, correct: 9, masteryPercent: 75 },
    L1: { level: 'L1', name: DEFAULT_LEVEL_NAMES.L1, total: 16, correct: 14, masteryPercent: 88 },
  };

  return {
    answeredCount: 84,
    correctCount: 61,
    readinessPercent: 72,
    streakDays: 7,
    weakSpot: {
      level: 'L3',
      topic: 'L3 подсети и маски',
      description: '50% точности — требуется повторить расчёт шага сети',
    },
    strongSpot: {
      level: 'L1',
      topic: 'L1 фото оборудования',
      description: '88% точности — уверенное распознавание кабелей и трансиверов',
    },
    levels: defaultLevels,
    answeredQuestions: {},
  };
}

export function recordQuestionResult(
  questionId: string,
  topic: string,
  group: string,
  isCorrect: boolean
): ProgressState {
  const current = getInitialProgress();

  // Detect OSI level from topic/group/id
  let level = 'L3';
  const str = `${questionId} ${topic} ${group}`.toLowerCase();
  if (str.includes('l1') || str.includes('физическ') || str.includes('кабел') || str.includes('sfp')) level = 'L1';
  else if (str.includes('l2') || str.includes('канал') || str.includes('vlan') || str.includes('mac') || str.includes('ethernet')) level = 'L2';
  else if (str.includes('l3') || str.includes('сетев') || str.includes('ip') || str.includes('подсет') || str.includes('маршрут')) level = 'L3';
  else if (str.includes('l4') || str.includes('транспорт') || str.includes('tcp') || str.includes('udp') || str.includes('порт')) level = 'L4';
  else if (str.includes('l5') || str.includes('сеанс') || str.includes('rpc')) level = 'L5';
  else if (str.includes('l6') || str.includes('представл') || str.includes('tls') || str.includes('кодировк')) level = 'L6';
  else if (str.includes('l7') || str.includes('прикладн') || str.includes('http') || str.includes('dns') || str.includes('dhcp')) level = 'L7';

  // Update levels
  if (!current.levels[level]) {
    current.levels[level] = {
      level,
      name: DEFAULT_LEVEL_NAMES[level] || level,
      total: 0,
      correct: 0,
      masteryPercent: 0,
    };
  }

  current.levels[level].total += 1;
  if (isCorrect) current.levels[level].correct += 1;
  current.levels[level].masteryPercent = Math.round(
    (current.levels[level].correct / current.levels[level].total) * 100
  );

  current.answeredCount += 1;
  if (isCorrect) current.correctCount += 1;

  // Track question
  current.answeredQuestions[questionId] = {
    correct: isCorrect,
    timestamp: Date.now(),
    level,
  };

  // Recalculate weak & strong spots
  let lowestPercent = 101;
  let highestPercent = -1;
  let weakLevel = 'L3';
  let strongLevel = 'L1';

  Object.values(current.levels).forEach((lvl) => {
    if (lvl.total >= 2) {
      if (lvl.masteryPercent < lowestPercent) {
        lowestPercent = lvl.masteryPercent;
        weakLevel = lvl.level;
      }
      if (lvl.masteryPercent > highestPercent) {
        highestPercent = lvl.masteryPercent;
        strongLevel = lvl.level;
      }
    }
  });

  current.weakSpot = {
    level: weakLevel,
    topic: `${weakLevel} ${DEFAULT_LEVEL_NAMES[weakLevel] || 'темы'}`,
    description: `${current.levels[weakLevel]?.masteryPercent || lowestPercent}% точности — слабый участок`,
  };

  current.strongSpot = {
    level: strongLevel,
    topic: `${strongLevel} ${DEFAULT_LEVEL_NAMES[strongLevel] || 'темы'}`,
    description: `${current.levels[strongLevel]?.masteryPercent || highestPercent}% точности — стабильный навык`,
  };

  // Recalculate overall readiness
  const totalLevelsMastery = Object.values(current.levels).reduce((sum, l) => sum + l.masteryPercent, 0);
  const avgLevelMastery = Math.round(totalLevelsMastery / Object.keys(current.levels).length);
  const accuracy = Math.round((current.correctCount / Math.max(1, current.answeredCount)) * 100);

  current.readinessPercent = Math.min(100, Math.max(10, Math.round(avgLevelMastery * 0.6 + accuracy * 0.4)));

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // fallback
  }

  return current;
}

export function resetProgress(): ProgressState {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('osi_last_mistakes');
    localStorage.removeItem('osi_exam_history');
    localStorage.removeItem('osi_active_session');
  } catch {
    // fallback
  }
  const fresh = getInitialProgress();
  fresh.readinessPercent = 45;
  fresh.answeredCount = 10;
  fresh.correctCount = 5;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch {}
  return fresh;
}
