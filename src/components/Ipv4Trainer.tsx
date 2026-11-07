import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Binary,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Hash,
  Activity,
  Layers,
} from 'lucide-react';
import { playSuccessSound, playErrorSound, playClickSound } from '../utils/sound';

// IPv4 helper math functions matching original site logic
function maskInt(prefix: number): number {
  return prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
}

function intToIp(n: number): string {
  n >>>= 0;
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

function ipToInt(ip: string): number {
  return ip
    .trim()
    .split('.')
    .reduce((n, o) => ((n << 8) | Number(o)) >>> 0, 0);
}

function maskText(prefix: number): string {
  return intToIp(maskInt(prefix));
}

function subnetCalc(ip: string, prefix: number) {
  const value = ipToInt(ip);
  const mask = maskInt(prefix);
  const network = (value & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = Math.pow(2, 32 - prefix);
  const usable = prefix >= 31 ? (prefix === 31 ? 2 : 1) : Math.max(0, total - 2);
  const first = prefix >= 31 ? network : (network + 1) >>> 0;
  const last = prefix >= 31 ? broadcast : (broadcast - 1) >>> 0;
  const wildcard = intToIp(~mask >>> 0);

  return {
    ip,
    prefix,
    mask: maskText(prefix),
    wildcard,
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    first: intToIp(first),
    last: intToIp(last),
    total,
    usable,
  };
}

function interestingOctet(prefix: number) {
  const octetIndex = Math.floor(prefix / 8) + 1;
  const bitsIn = prefix % 8;
  if (bitsIn === 0) {
    return { octet: Math.max(1, octetIndex - 1), mask: 255, step: 1 };
  }
  const value = 256 - Math.pow(2, 8 - bitsIn);
  return { octet: octetIndex, mask: value, step: 256 - value };
}

export type Ipv4SubTab = 'practice' | 'calculator' | 'bits' | 'cheatsheet';
type PracticeMode =
  | 'cidr-to-mask'
  | 'mask-to-cidr'
  | 'step'
  | 'network'
  | 'broadcast'
  | 'first-host'
  | 'last-host'
  | 'same-subnet'
  | 'gateway-or-direct';

interface QuestionTask {
  question: string;
  hint: string;
  correctAnswer: string;
  options: string[];
  explanation: string;
  stepFormula?: string;
}

interface Ipv4TrainerProps {
  soundEnabled: boolean;
  initialPrefix?: number;
  initialSubTab?: Ipv4SubTab;
}

export const Ipv4Trainer: React.FC<Ipv4TrainerProps> = ({
  soundEnabled,
  initialPrefix,
  initialSubTab,
}) => {
  const [subTab, setSubTab] = useState<Ipv4SubTab>(initialSubTab || 'practice');
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('network');

  // Octet Bits Explorer State
  const [bits, setBits] = useState<number[]>([1, 1, 1, 1, 0, 0, 0, 0]);
  const bitWeights = [128, 64, 32, 16, 8, 4, 2, 1];
  const decimalValue = bits.reduce((sum, b, i) => sum + b * bitWeights[i], 0);

  // Subnet Calculator State
  const [calcIp, setCalcIp] = useState<string>('192.168.10.45');
  const [calcPrefix, setCalcPrefix] = useState<number>(initialPrefix || 27);

  // Update when props change from external navigation
  useEffect(() => {
    if (initialPrefix) {
      setCalcPrefix(initialPrefix);
    }
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialPrefix, initialSubTab]);

  // Interactive Practice State
  const [currentTask, setCurrentTask] = useState<QuestionTask | null>(null);
  const [userSelection, setUserSelection] = useState<string>('');
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [scoreCorrect, setScoreCorrect] = useState<number>(0);

  // Generate random task based on mode
  const generateTask = (mode: PracticeMode): QuestionTask => {
    const prefixes = [24, 25, 26, 27, 28, 29, 30, 23, 22, 21, 20, 19, 18, 17, 16];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const octet1 = [10, 172, 192][Math.floor(Math.random() * 3)];
    const octet2 = octet1 === 10 ? Math.floor(Math.random() * 255) : octet1 === 172 ? 16 + Math.floor(Math.random() * 16) : 168;
    const octet3 = Math.floor(Math.random() * 254);
    const octet4 = 1 + Math.floor(Math.random() * 253);
    const ip = `${octet1}.${octet2}.${octet3}.${octet4}`;

    const info = subnetCalc(ip, prefix);
    const stepInfo = interestingOctet(prefix);

    switch (mode) {
      case 'cidr-to-mask': {
        const correct = maskText(prefix);
        const distractors = [
          maskText(Math.max(8, prefix - 1)),
          maskText(Math.min(30, prefix + 1)),
          maskText(Math.min(30, prefix + 2)),
        ].filter((x) => x !== correct);
        const options = Array.from(new Set([correct, ...distractors])).slice(0, 4);
        options.sort(() => Math.random() - 0.5);
        return {
          question: `Какая маска подсети соответствует префиксу /${prefix}?`,
          hint: `Количество единичных бит слева: ${prefix}`,
          correctAnswer: correct,
          options,
          explanation: `Префикс /${prefix} означает, что первые ${prefix} бит равны 1, а оставшиеся ${32 - prefix} бит равны 0. В десятичном виде это ${correct}.`,
          stepFormula: `Шаг в октете №${stepInfo.octet}: 256 − ${stepInfo.mask} = ${stepInfo.step}`,
        };
      }

      case 'mask-to-cidr': {
        const mask = maskText(prefix);
        const correct = `/${prefix}`;
        const options = [
          `/${prefix}`,
          `/${Math.max(8, prefix - 1)}`,
          `/${Math.min(30, prefix + 1)}`,
          `/${Math.min(30, prefix + 2)}`,
        ].sort(() => Math.random() - 0.5);
        return {
          question: `Какой префикс CIDR соответствует маске ${mask}?`,
          hint: `Подсчитайте число установленных бит в каждом октете`,
          correctAnswer: correct,
          options,
          explanation: `Маска ${mask} содержит ровно ${prefix} единичных бит, поэтому префикс равен /${prefix}.`,
        };
      }

      case 'step': {
        const correct = String(stepInfo.step);
        const distractors = [
          String(stepInfo.step * 2),
          String(Math.max(2, Math.floor(stepInfo.step / 2))),
          String(stepInfo.step + 4),
        ].filter((x) => x !== correct);
        const options = Array.from(new Set([correct, ...distractors])).slice(0, 4);
        options.sort(() => Math.random() - 0.5);
        return {
          question: `Чему равен «шаг сети» (магическое число) для префикса /${prefix}?`,
          hint: `Октет изменения №${stepInfo.octet}, значение маски в октете: ${stepInfo.mask}`,
          correctAnswer: correct,
          options,
          explanation: `Правило: Шаг = 256 − октет маски. В октете №${stepInfo.octet} значение ${stepInfo.mask}. Значит шаг = 256 − ${stepInfo.mask} = ${stepInfo.step}.`,
          stepFormula: `Шаг = 256 − ${stepInfo.mask} = ${stepInfo.step}`,
        };
      }

      case 'network': {
        const correct = info.network;
        const fake1 = intToIp((ipToInt(info.network) + (stepInfo.step > 1 ? stepInfo.step : 2)) >>> 0);
        const fake2 = intToIp(Math.max(0, ipToInt(info.network) - 8) >>> 0);
        const fake3 = info.broadcast;
        const options = Array.from(new Set([correct, fake1, fake2, fake3])).slice(0, 4);
        options.sort(() => Math.random() - 0.5);
        return {
          question: `Определите адрес сети для хоста ${ip}/${prefix}:`,
          hint: `Октет №${stepInfo.octet}, шаг сети = ${stepInfo.step}`,
          correctAnswer: correct,
          options,
          explanation: `В октете №${stepInfo.octet} шаг равен ${stepInfo.step}. Ближайшая снизу граница, кратная ${stepInfo.step}, дает адрес сети: ${info.network}.`,
          stepFormula: `Сеть: ${info.network}, Шаг: ${stepInfo.step}`,
        };
      }

      case 'broadcast': {
        const correct = info.broadcast;
        const fake1 = info.network;
        const fake2 = info.last;
        const fake3 = intToIp((ipToInt(info.broadcast) + stepInfo.step) >>> 0);
        const options = Array.from(new Set([correct, fake1, fake2, fake3])).slice(0, 4);
        options.sort(() => Math.random() - 0.5);
        return {
          question: `Какой широковещательный адрес (Broadcast) для подсети ${ip}/${prefix}?`,
          hint: `Broadcast = следующий адрес сети минус 1`,
          correctAnswer: correct,
          options,
          explanation: `Следующая подсеть начинается с ${intToIp((ipToInt(info.network) + (stepInfo.step << (8 * (4 - stepInfo.octet)))) >>> 0)}. Значит последний адрес (Broadcast) этой подсети равен ${info.broadcast}.`,
        };
      }

      case 'first-host': {
        const correct = info.first;
        const options = Array.from(new Set([correct, info.network, info.last, info.broadcast])).slice(0, 4);
        options.sort(() => Math.random() - 0.5);
        return {
          question: `Укажите первый пригодный IP-адрес для хоста в подсети ${ip}/${prefix}:`,
          hint: `Первый хост = адрес сети + 1`,
          correctAnswer: correct,
          options,
          explanation: `Адрес сети ${info.network} зарезервирован. Первый адрес для устройства (хоста или шлюза) — это ${info.first}.`,
        };
      }

      case 'last-host': {
        const correct = info.last;
        const options = Array.from(new Set([correct, info.broadcast, info.first, info.network])).slice(0, 4);
        options.sort(() => Math.random() - 0.5);
        return {
          question: `Укажите последний пригодный IP-адрес для хоста в подсети ${ip}/${prefix}:`,
          hint: `Последний хост = Broadcast − 1`,
          correctAnswer: correct,
          options,
          explanation: `Широковещательный адрес ${info.broadcast} занят под broadcast. Последний пригодный адрес для хоста — это ${info.last}.`,
        };
      }

      case 'same-subnet': {
        const isSame = Math.random() > 0.5;
        let secondIp = '';
        if (isSame) {
          secondIp = info.first;
        } else {
          secondIp = intToIp((ipToInt(info.broadcast) + 2) >>> 0);
        }
        const correct = isSame ? 'Да, в одной подсети' : 'Нет, в разных подсетях';
        return {
          question: `Находятся ли хосты ${ip} и ${secondIp} в одной подсети с маской /${prefix}?`,
          hint: `Сравните сетевую часть обоих адресов с шагом ${stepInfo.step}`,
          correctAnswer: correct,
          options: ['Да, в одной подсети', 'Нет, в разных подсетях'],
          explanation: isSame
            ? `Оба адреса попадают в диапазон сети ${info.network}/${prefix} (от ${info.first} до ${info.last}). Они могут общаться напрямую по L2 без маршрутизатора.`
            : `Адрес ${ip} принадлежит сети ${info.network}/${prefix}, а адрес ${secondIp} находится за пределами этой сети. Связь между ними возможна только через L3-маршрутизатор (шлюз).`,
        };
      }

      case 'gateway-or-direct': {
        const isDirect = Math.random() > 0.5;
        let targetIp = isDirect ? info.first : intToIp((ipToInt(info.broadcast) + 4) >>> 0);
        const correct = isDirect ? 'Напрямую по L2 (ARP)' : 'Через шлюз по умолчанию (L3)';
        return {
          question: `Хост ${ip}/${prefix} отправляет пакет на адрес ${targetIp}. Как пойдет доставка?`,
          hint: `Определите, локальный ли это узел или внешняя подсеть`,
          correctAnswer: correct,
          options: ['Напрямую по L2 (ARP)', 'Через шлюз по умолчанию (L3)'],
          explanation: isDirect
            ? `Узел ${targetIp} находится в той же подсети ${info.network}/${prefix}. Хост находит его MAC через ARP и отправляет кадр напрямую через коммутатор L2.`
            : `Узел ${targetIp} находится в чужой подсети. Хост отправляет пакет на MAC-адрес своего шлюза по умолчанию для дальнейшей L3-маршрутизации.`,
        };
      }

      default:
        return {
          question: `Какая маска для /${prefix}?`,
          hint: '',
          correctAnswer: maskText(prefix),
          options: [maskText(prefix)],
          explanation: '',
        };
    }
  };

  useEffect(() => {
    setCurrentTask(generateTask(practiceMode));
    setUserSelection('');
    setIsAnswered(false);
  }, [practiceMode]);

  const handleSelectOption = (option: string) => {
    if (isAnswered) return;
    if (soundEnabled) playClickSound();
    setUserSelection(option);
  };

  const handleCheckAnswer = () => {
    if (!currentTask || !userSelection || isAnswered) return;

    const correct = userSelection === currentTask.correctAnswer;
    setIsCorrect(correct);
    setIsAnswered(true);

    if (soundEnabled) {
      if (correct) playSuccessSound();
      else playErrorSound();
    }

    if (correct) {
      setScoreCorrect((prev) => prev + 1);
    }
  };

  const handleNextTask = () => {
    setRoundNumber((prev) => prev + 1);
    setCurrentTask(generateTask(practiceMode));
    setUserSelection('');
    setIsAnswered(false);
  };

  const handleSetPrefixBits = (count: number) => {
    const newBits = Array(8)
      .fill(0)
      .map((_, i) => (i < count ? 1 : 0));
    setBits(newBits);
    if (soundEnabled) playClickSound();
  };

  const toggleBit = (index: number) => {
    // IPv4 subnet mask rule: '0' cannot precede '1'.
    // Clicking bit at index sets all preceding bits (0..index) to 1.
    // If clicking the current rightmost active boundary bit, toggle it off.
    const currentActiveCount = bits.filter((b) => b === 1).length;
    const newCount = currentActiveCount === index + 1 ? index : index + 1;
    const newBits = Array.from({ length: 8 }, (_, i) => (i < newCount ? 1 : 0));
    setBits(newBits);
    if (soundEnabled) playClickSound();
  };

  const calcResult = subnetCalc(calcIp, calcPrefix);

  return (
    <div className="font-sans space-y-6">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-cyan-500/20 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-sans font-bold uppercase tracking-wider mb-2">
              <Calculator className="w-3.5 h-3.5" />
              IPv4 без магии · Считаем подсети в уме
            </div>
            <h1 className="text-2xl sm:text-3xl text-white tracking-tight font-sans font-bold">
              Интерактивный тренажёр IPv4 и CIDR
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Золотое правило быстрого расчёта в уме: <strong className="text-cyan-300">Шаг сети = 256 − октет маски</strong>.
              Например, /27 → 255.255.255.224 → 256 − 224 = 32. Подсети: 0, 32, 64, 96, 128...
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full sm:w-auto p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setSubTab('practice')}
              type="button"
              className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                subTab === 'practice'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="sm:hidden">Тренировка</span>
              <span className="hidden sm:inline">Тренировка навыков</span>
            </button>
            <button
              onClick={() => setSubTab('calculator')}
              type="button"
              className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                subTab === 'calculator'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Калькулятор
            </button>
            <button
              onClick={() => setSubTab('bits')}
              type="button"
              className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                subTab === 'bits'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              8 Бит октета
            </button>
            <button
              onClick={() => setSubTab('cheatsheet')}
              type="button"
              className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${
                subTab === 'cheatsheet'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Таблица CIDR
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-cyan-500/20 bg-white dark:bg-slate-900/40 p-5 sm:p-6">
        <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Смысл перед счётом</p>
        <h2 className="text-xl sm:text-2xl text-slate-900 dark:text-white mt-1 font-sans font-bold">IPv4 — это 32 бита, не четыре случайных числа</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Адрес <span className="font-mono">192.168.1.10</span> — четыре октета. Каждый октет — 8 бит, от 0 до 255. Маска говорит, какие биты относятся к сети, а какие к хосту.</p>
        <div className="mt-4 border-l-4 border-amber-400 bg-slate-50 dark:bg-slate-950/60 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
          <strong className="text-amber-500">Главная мысль:</strong> /24 и 255.255.255.0 — одна и та же граница. Единицы в маске всегда идут подряд слева. Поэтому 255.255.255.224 это /27, а не «случайный набор бит».
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/40 p-4 space-y-2">
          <h2 className="text-slate-900 dark:text-white font-sans font-bold">1. Где сеть, где хост</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">/24 значит: первые 24 бита сеть, последние 8 — хосты. В <span className="font-mono">10.1.1.0/24</span> меняется только последний октет: 10.1.1.0 — сеть, 10.1.1.255 — broadcast, хостам отдают 1–254.</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Адрес сети и broadcast не выдают устройствам. Поэтому usable = 2<sup>host bits</sup> − 2.</p>
        </section>
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/40 p-4 space-y-2">
          <h2 className="text-slate-900 dark:text-white font-sans font-bold">2. Шаг сети</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Шаг = 256 − последний ненулевой октет маски. /27 → 255.255.255.224 → 256 − 224 = 32. Сети: 0, 32, 64, 96…</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Адрес 10.0.0.50/27 лежит в сети 10.0.0.32. Следующая сеть начинается с 64. Broadcast этой сети — 63.</p>
        </section>
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/40 p-4 space-y-2">
          <h2 className="text-slate-900 dark:text-white font-sans font-bold">3. Зачем резать сеть</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Меньший префикс — больше хостов и больше broadcast-домен. /24 на 200 устройств нормально. /16 на офис — нет: лишний шум и сложнее локализовать проблему.</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Между VLAN нужен маршрутизатор. Коммутатор сам по себе пакет из одной подсети в другую не переведёт.</p>
        </section>
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/40 p-4 space-y-2">
          <h2 className="text-slate-900 dark:text-white font-sans font-bold">4. Что проверять руками</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Сначала: адрес сети, broadcast, шлюз в той же подсети. Потом: маска на обоих концах совпадает. Если хосты «в одной сети» по IP, но маски разные, они не увидят друг друга напрямую.</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Частные диапазоны: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16. В интернет их выпускают через NAT.</p>
        </section>
      </div>

      {/* Sub-tab 1: Interactive Practice Trainer */}
      {subTab === 'practice' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Practice Modes Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            <div className="p-4 rounded-2xl glass-panel border border-cyan-500/20 shadow-xl space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-slate-400 font-sans font-bold">
                1. Базовые навыки и границы
              </h3>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 'cidr-to-mask', label: 'CIDR → Маска' },
                  { id: 'mask-to-cidr', label: 'Маска → CIDR' },
                  { id: 'step', label: 'Шаг сети (магическое число)' },
                  { id: 'network', label: 'Адрес сети' },
                  { id: 'broadcast', label: 'Широковещательный адрес (Broadcast)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPracticeMode(item.id as PracticeMode)}
                    type="button"
                    className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
                      practiceMode === item.id
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <h3 className="text-xs uppercase tracking-wider text-slate-400 pt-2 border-t border-slate-800 font-sans font-bold">
                2. Практика хостов и доставка
              </h3>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 'first-host', label: 'Первый хост' },
                  { id: 'last-host', label: 'Последний хост' },
                  { id: 'same-subnet', label: 'В одной ли подсети?' },
                  { id: 'gateway-or-direct', label: 'Напрямую или через шлюз?' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPracticeMode(item.id as PracticeMode)}
                    type="button"
                    className={`w-full py-2.5 px-3 rounded-xl text-left text-xs font-bold transition-all cursor-pointer min-h-[42px] ${
                      practiceMode === item.id
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Score Tracker */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs font-sans font-bold">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Текущий раунд</span>
                <span className="text-white font-bold text-sm">Задание #{roundNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase">Правильных</span>
                <span className="text-emerald-400 font-bold text-sm">{scoreCorrect} верно</span>
              </div>
            </div>
          </div>

          {/* Interactive Question Card */}
          <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl glass-panel border border-cyan-500/20 shadow-2xl space-y-6">
            {currentTask ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-lg bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-xs font-sans font-bold">
                    Навык: {practiceMode}
                  </span>
                  <span className="text-xs text-slate-400 font-sans font-bold">
                    Задание {roundNumber}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl text-white leading-relaxed font-sans font-bold">
                  {currentTask.question}
                </h2>

                {currentTask.hint && (
                  <p className="text-xs text-amber-300 font-sans bg-amber-950/20 p-2.5 rounded-xl border border-amber-500/20">
                    💡 Подсказка: {currentTask.hint}
                  </p>
                )}

                {/* Option buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentTask.options.map((opt, idx) => {
                    const isSelected = userSelection === opt;
                    const isTargetCorrect = opt === currentTask.correctAnswer;

                    let btnClass = 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-200';
                    if (isAnswered) {
                      if (isTargetCorrect) {
                        btnClass = 'bg-emerald-950/70 border-emerald-500 text-emerald-200 font-bold shadow-lg shadow-emerald-500/20';
                      } else if (isSelected && !isTargetCorrect) {
                        btnClass = 'bg-rose-950/70 border-rose-500 text-rose-200';
                      }
                    } else if (isSelected) {
                      btnClass = 'bg-cyan-950/70 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400';
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectOption(opt)}
                        type="button"
                        className={`p-4 rounded-2xl text-left border transition-all cursor-pointer min-h-[58px] flex items-center justify-between ${btnClass}`}
                      >
                        <span className={`text-xs sm:text-sm ${practiceMode === 'same-subnet' || practiceMode === 'gateway-or-direct' || practiceMode === 'step' ? 'font-sans' : 'font-mono'}`}>{opt}</span>
                        {isAnswered && isTargetCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        )}
                        {isAnswered && isSelected && !isTargetCorrect && (
                          <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback & Step by step explanation */}
                {isAnswered && (
                  <div
                    className={`p-5 rounded-2xl border space-y-2 animate-fade-in ${
                      isCorrect
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span>Правильно! Отличный результат.</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-rose-400" />
                          <span>Неверно. Правильный ответ: {currentTask.correctAnswer}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {currentTask.explanation}
                    </p>
                    {currentTask.stepFormula && (
                      <div className="mt-2 p-2 rounded-lg bg-black/40 font-sans text-cyan-300 text-xs">
                        {currentTask.stepFormula}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom actions */}
                <div className="pt-2 flex justify-end gap-3">
                  {!isAnswered ? (
                    <button
                      onClick={handleCheckAnswer}
                      disabled={!userSelection}
                      type="button"
                      className="py-3 px-8 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs sm:text-sm hover:brightness-110 active:scale-[0.99] disabled:opacity-40 transition-all min-h-[48px] shadow-lg shadow-cyan-500/20 cursor-pointer"
                    >
                      Проверить ответ
                    </button>
                  ) : (
                    <button
                      onClick={handleNextTask}
                      type="button"
                      className="py-3 px-8 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs sm:text-sm hover:brightness-110 active:scale-[0.99] transition-all min-h-[48px] shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-2"
                    >
                      <span>Следующее задание</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Sub-tab 2: Live Subnet Calculator */}
      {subTab === 'calculator' && (
        <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-cyan-500/20 shadow-2xl space-y-6">
          <div>
            <h2 className="text-xl text-white flex items-center gap-2 font-sans font-bold">
              <Calculator className="w-5 h-5 text-cyan-400" />
              Интерактивный калькулятор подсетей IPv4
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Введите любой IPv4-адрес и выберите маску / CIDR для мгновенного математического разбора
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                IP-адрес хоста
              </label>
              <input
                type="text"
                value={calcIp}
                onChange={(e) => setCalcIp(e.target.value)}
                placeholder="192.168.1.10"
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Префикс маски: /{calcPrefix} ({maskText(calcPrefix)})
              </label>
              <input
                type="range"
                min="8"
                max="30"
                value={calcPrefix}
                onChange={(e) => setCalcPrefix(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 mt-3"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-sans font-bold mt-1">
                <span>/8 (Class A)</span>
                <span>/16 (Class B)</span>
                <span>/24 (Class C)</span>
                <span>/30 (P2P)</span>
              </div>
            </div>
          </div>

          {/* Detailed Subnet Breakdown Card */}
          <div className="p-5 rounded-2xl bg-[#060f1b] border border-cyan-500/30 space-y-4 font-sans text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase block font-bold">Адрес сети (Network)</span>
                <span className="text-cyan-300 font-bold text-sm font-mono">{calcResult.network}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase block font-bold">Broadcast адрес</span>
                <span className="text-rose-300 font-bold text-sm font-mono">{calcResult.broadcast}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase block font-bold">Маска подсети</span>
                <span className="text-white font-bold text-sm font-mono">{calcResult.mask}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase block font-bold">Диапазон хостов</span>
                <span className="text-emerald-300 font-bold text-xs font-mono">
                  {calcResult.first} — {calcResult.last}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase block font-bold">Всего адресов / Хостов</span>
                <span className="text-purple-300 font-bold text-sm">
                  {calcResult.total} ({calcResult.usable} для хостов)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase block font-bold">Инверсная маска (Wildcard)</span>
                <span className="text-amber-300 font-bold text-sm font-mono">{calcResult.wildcard}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 3: 8 Bits of an Octet Explorer */}
      {subTab === 'bits' && (
        <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-cyan-500/20 shadow-2xl space-y-6">
          <div>
            <span className="text-xs font-sans font-bold uppercase tracking-wider text-cyan-400">
              Пойми один октет маски
            </span>
            <h2 className="text-xl text-white mt-1 font-sans font-bold">
              8 Битов и веса позиций: 128, 64, 32, 16, 8, 4, 2, 1
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              В маске сети перед <code className="text-cyan-300 font-bold">1</code> не может стоять <code className="text-slate-300 font-bold">0</code>. При клике на любой бит (например, 2 или 1) все биты левее автоматически становятся единицами.
            </p>
          </div>

          {/* Interactive bits display */}
          <div className="p-6 rounded-2xl bg-[#060f1b] border border-cyan-500/30 space-y-6">
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-200 flex items-start gap-2 max-w-xl mx-auto">
              <span className="text-cyan-400 font-bold text-sm">💡</span>
              <p className="leading-relaxed">
                <strong>Правило непрерывности:</strong> маска подсети — это сплошной ряд единиц слева направо. Нажатие на бит <span className="font-mono text-cyan-300">2</span> заполнит 7 бит (254), а на <span className="font-mono text-cyan-300">1</span> — все 8 бит (255).
              </p>
            </div>

            <div className="grid grid-cols-8 gap-2 max-w-xl mx-auto">
              {bits.map((b, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-500">{bitWeights[idx]}</span>
                  <button
                    onClick={() => toggleBit(idx)}
                    type="button"
                    title={`Бит веса ${bitWeights[idx]}: кликните для установки маски до этой позиции`}
                    className={`w-full aspect-square rounded-xl flex items-center justify-center font-mono font-bold text-base sm:text-xl border transition-all cursor-pointer ${
                      b === 1
                        ? 'bg-cyan-500 border-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/30 scale-105'
                        : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
                    }`}
                  >
                    {b}
                  </button>
                  <span className="text-[9px] font-mono text-slate-400">2^{7 - idx}</span>
                </div>
              ))}
            </div>

            {/* Decimal sum & Network step */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-center pt-2">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Двоичный октет</span>
                <code className="text-cyan-400 font-mono font-bold text-sm tracking-widest">{bits.join('')}</code>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  {bits.filter((x) => x === 1).length} из 8 бит
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-cyan-500/30">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Десятичный октет</span>
                <div className="text-2xl font-bold text-white font-mono">{decimalValue}</div>
                <span className="text-[10px] text-cyan-300 block mt-0.5 font-bold">Значение маски</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Шаг подсети</span>
                <div className="text-xl font-bold text-amber-300 font-mono">
                  {decimalValue === 0 ? 256 : decimalValue === 255 ? 1 : 256 - decimalValue}
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">256 − {decimalValue}</span>
              </div>
            </div>

            {/* Preset chips */}
            <div className="flex flex-wrap justify-center gap-1.5 pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400 self-center mr-1 font-bold">Быстрые маски:</span>
              {[
                { count: 0, val: 0 },
                { count: 1, val: 128 },
                { count: 2, val: 192 },
                { count: 3, val: 224 },
                { count: 4, val: 240 },
                { count: 5, val: 248 },
                { count: 6, val: 252 },
                { count: 7, val: 254 },
                { count: 8, val: 255 },
              ].map((chip) => {
                const isActive = decimalValue === chip.val;
                return (
                  <button
                    key={chip.val}
                    onClick={() => handleSetPrefixBits(chip.count)}
                    type="button"
                    className={`px-2.5 py-1.5 rounded-lg border font-mono text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500 border-cyan-300 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900 border-slate-700 text-cyan-300 hover:border-cyan-400'
                    }`}
                  >
                    {chip.val} ({chip.count} б.)
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 4: CIDR Reference Table */}
      {subTab === 'cheatsheet' && (
        <div className="p-4 sm:p-8 rounded-3xl bg-white dark:bg-[#091524] border border-slate-200 dark:border-cyan-500/20 shadow-xl space-y-4">
          <h2 className="text-lg sm:text-xl text-slate-900 dark:text-white flex items-center gap-2 font-sans font-bold">
            <BookOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            Справочная таблица префиксов CIDR от /16 до /30
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900/80 text-cyan-700 dark:text-cyan-400 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5 sm:p-3 font-bold">CIDR</th>
                  <th className="p-2.5 sm:p-3 font-bold">Маска</th>
                  <th className="p-2.5 sm:p-3 font-bold">Октет & Шаг</th>
                  <th className="p-2.5 sm:p-3 font-bold">Всего IP</th>
                  <th className="p-2.5 sm:p-3 font-bold">Хостов</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {[16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].map((p) => {
                  const step = interestingOctet(p);
                  const total = Math.pow(2, 32 - p);
                  const usable = total - 2;
                  return (
                    <tr key={p} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-300">
                      <td className="p-2.5 sm:p-3 font-bold text-slate-900 dark:text-white font-mono">/{p}</td>
                      <td className="p-2.5 sm:p-3 text-cyan-700 dark:text-cyan-300 font-bold font-mono">{maskText(p)}</td>
                      <td className="p-2.5 sm:p-3 text-amber-700 dark:text-amber-300">
                        Шаг {step.step} в {step.octet}-м октете
                      </td>
                      <td className="p-2.5 sm:p-3">{total.toLocaleString()}</td>
                      <td className="p-2.5 sm:p-3 text-emerald-700 dark:text-emerald-300 font-bold">
                        {usable.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
