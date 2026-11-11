import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import { DetectiveTopology } from './DetectiveTopology';

type NodeId = 'pc' | 'switch' | 'router' | 'server';
type PacketKind = 'arp-req' | 'arp-reply' | 'icmp-req' | 'icmp-reply';
type Packet = {
  kind: PacketKind;
  srcMac: string;
  dstMac: string;
  srcIp?: string;
  dstIp?: string;
  ttl?: number;
  arpSenderIp?: string;
  arpTargetIp?: string;
};
type Challenge = { prompt: string; options: [string, string, string]; correct: number; why: string };
type Event = {
  title: string;
  from: NodeId;
  to: NodeId;
  summary: string;
  detail: string;
  packet?: Packet;
  note?: string;
  challenge?: Challenge;
};

const IPS = { pc: '192.168.1.10', routerLan1: '192.168.1.1', routerLan2: '192.168.2.1', server: '192.168.2.20' };
const MACS = {
  pc: '02:00:00:00:01:10', routerLan1: '02:00:00:00:01:01',
  routerLan2: '02:00:00:00:02:01', server: '02:00:00:00:02:20',
  all: 'ff:ff:ff:ff:ff:ff',
};
const NAMES: Record<NodeId, string> = { pc: 'ПК', switch: 'Коммутатор', router: 'Маршрутизатор', server: 'Сервер' };
const IP_SHORT: Record<NodeId, string> = { pc: IPS.pc, switch: 'L2 · VLAN 1', router: IPS.routerLan1 + ' / ' + IPS.routerLan2, server: IPS.server };

function arpRequest(sender: 'pc' | 'routerLan2', target: 'routerLan1' | 'server'): Packet {
  return {
    kind: 'arp-req', srcMac: MACS[sender], dstMac: MACS.all,
    arpSenderIp: IPS[sender], arpTargetIp: IPS[target],
  };
}
function arpReply(sender: 'routerLan1' | 'server', target: 'pc' | 'routerLan2'): Packet {
  return {
    kind: 'arp-reply', srcMac: MACS[sender], dstMac: MACS[target],
    arpSenderIp: IPS[sender], arpTargetIp: IPS[target],
  };
}
function icmp(srcMac: keyof typeof MACS, dstMac: keyof typeof MACS, reply: boolean, ttl: number): Packet {
  return {
    kind: reply ? 'icmp-reply' : 'icmp-req', srcMac: MACS[srcMac], dstMac: MACS[dstMac],
    srcIp: reply ? IPS.server : IPS.pc,
    dstIp: reply ? IPS.pc : IPS.server,
    ttl,
  };
}
const requestLan = icmp('pc', 'routerLan1', false, 64);
const requestLan2 = icmp('routerLan2', 'server', false, 63);
const replyLan2 = icmp('server', 'routerLan2', true, 64);
const replyLan = icmp('routerLan1', 'pc', true, 63);

/** Deliberately separate the switch ingress and switch egress events. */
const EVENTS: Event[] = [
  {
    title: 'ПК готовит ping', from: 'pc', to: 'pc',
    summary: 'Ты на ПК. Нужно проверить связь с сервером 192.168.2.20.',
    detail: 'ПК сравнивает сеть назначения со своей 192.168.1.0/24. Сервер находится в другой подсети. Передавать кадр нужно своему шлюзу 192.168.1.1, но его MAC пока неизвестен.',
    note: 'Пакет ещё никуда не отправлен. Начинаем именно с ПК.',
  },
  {
    title: 'ПК → коммутатор', from: 'pc', to: 'switch',
    summary: 'ПК отправляет ARP-запрос: «Кто имеет IP 192.168.1.1?»',
    detail: 'ARP — это отдельный Ethernet-кадр с широковещательным MAC назначения. Он не содержит IPv4-пакета с ICMP. ПК узнаёт MAC своего шлюза, а не сервера.',
    packet: arpRequest('pc', 'routerLan1'),
  },
  {
    title: 'Коммутатор принимает ARP', from: 'switch', to: 'switch',
    summary: 'Кадр дошёл до коммутатора. Он обрабатывает его, прежде чем пересылать дальше.',
    detail: 'Коммутатор изучает исходный MAC ПК и порт, с которого пришёл кадр. Поскольку MAC назначения широковещательный, кадр нужно передать через остальные порты той же VLAN.',
    packet: arpRequest('pc', 'routerLan1'),
    challenge: {
      prompt: 'Кадр пришёл на switch с MAC назначения FF:FF:FF:FF:FF:FF. Что делать?',
      options: ['Отправить только серверу', 'Разослать по остальным портам VLAN', 'Отбросить кадр'],
      correct: 1,
      why: 'Broadcast передаётся по VLAN, кроме входного порта. При этом коммутатор изучает исходный MAC ПК.',
    },
  },
  {
    title: 'Коммутатор → маршрутизатор', from: 'switch', to: 'router',
    summary: 'Коммутатор передаёт ARP-запрос на порт маршрутизатора.',
    detail: 'Коммутатор не меняет MAC-адреса в кадре и не уменьшает TTL. Маршрутизатор видит: запрашивают IP его интерфейса LAN 1 (192.168.1.1).',
    packet: arpRequest('pc', 'routerLan1'),
  },
  {
    title: 'Маршрутизатор → коммутатор', from: 'router', to: 'switch',
    summary: 'Шлюз отвечает: «192.168.1.1 — это я. Вот мой MAC».',
    detail: 'Ответ ARP — unicast на MAC ПК. Маршрутизатор также может запомнить IP и MAC ПК из ARP-запроса. ARP не пересылается в сеть сервера.',
    packet: arpReply('routerLan1', 'pc'),
  },
  {
    title: 'Коммутатор → ПК', from: 'switch', to: 'pc',
    summary: 'Ответ ARP возвращается на ПК тем же маршрутом.',
    detail: 'Коммутатор уже знает порт ПК из предыдущего запроса. ПК запоминает соответствие: 192.168.1.1 → MAC интерфейса LAN 1 маршрутизатора.',
    packet: arpReply('routerLan1', 'pc'),
    note: 'Теперь ПК может сформировать Ethernet-кадр для ICMP Echo Request.',
  },
  {
    title: 'ПК → коммутатор', from: 'pc', to: 'switch',
    summary: 'Вот теперь ПК отправляет ICMP Echo Request.',
    detail: 'Внутри Ethernet-кадра лежит IPv4-пакет, внутри него — ICMP Echo Request (type 8). MAC назначения — шлюз. IP назначения — сервер. TCP и UDP в обычном ping не участвуют.',
    packet: requestLan,
  },
  {
    title: 'Коммутатор принимает ICMP', from: 'switch', to: 'switch',
    summary: 'Коммутатор видит MAC шлюза, а не IP сервера.',
    detail: 'Коммутатор использует свою MAC-таблицу и пересылает кадр через нужный порт. Ethernet- и IP-заголовки остаются прежними, TTL всё ещё 64.',
    packet: requestLan,
  },
  {
    title: 'Коммутатор → маршрутизатор', from: 'switch', to: 'router',
    summary: 'ICMP-запрос приходит на интерфейс LAN 1 маршрутизатора.',
    detail: 'Путь ПК → коммутатор → маршрутизатор полностью виден. Следующая операция — обработка IP-пакета маршрутизатором, а не мгновенный перелёт на сервер.',
    packet: requestLan,
  },
  {
    title: 'Маршрутизатор обрабатывает пакет', from: 'router', to: 'router',
    summary: 'Маршрутизатор снимает входной Ethernet и ищет маршрут к 192.168.2.20.',
    detail: 'Маршрутизатор видит непосредственно подключённую сеть 192.168.2.0/24 через интерфейс LAN 2 (192.168.2.1). При пересылке TTL уменьшится с 64 до 63. Для нового Ethernet-кадра нужен MAC сервера, но ARP-кэш интерфейса LAN 2 пока пуст.',
    packet: requestLan,
    note: 'Исходный IP-пакет ожидает разрешения ARP. На линии в данный момент полетит именно ARP, а не ping.',
    challenge: {
      prompt: 'Перед пересылкой через маршрутизатор что произойдёт с TTL?',
      options: ['Останется 64', 'Увеличится до 65', 'Уменьшится до 63'],
      correct: 2,
      why: 'Каждый маршрутизатор уменьшает TTL IPv4-пакета на 1. Коммутатор этого не делает.',
    },
  },
  {
    title: 'Маршрутизатор → сервер', from: 'router', to: 'server',
    summary: 'Маршрутизатор рассылает ARP-запрос в сети 192.168.2.0/24.',
    detail: 'Это уже другая Ethernet-сеть. R1 спрашивает MAC для IP 192.168.2.20. ICMP-запрос пока ждёт на маршрутизаторе.',
    packet: arpRequest('routerLan2', 'server'),
  },
  {
    title: 'Сервер → маршрутизатор', from: 'server', to: 'router',
    summary: 'Сервер отвечает на ARP и сообщает свой MAC.',
    detail: 'R1 узнаёт MAC сервера из ответа и может отправить сохранённый ICMP-запрос в новом Ethernet-кадре.',
    packet: arpReply('server', 'routerLan2'),
  },
  {
    title: 'Маршрутизатор → сервер', from: 'router', to: 'server',
    summary: 'Echo Request доставлен серверу в НОВОМ Ethernet-кадре.',
    detail: 'На выходе R1 MAC отправителя стал MAC интерфейса LAN 2, MAC получателя — MAC сервера. IPv4-адреса ПК и сервера не изменились; TTL теперь 63.',
    packet: requestLan2,
    note: 'Сравни с шагом «ПК → коммутатор»: IP те же, а внешняя Ethernet-обёртка другая.',
  },
  {
    title: 'Сервер → маршрутизатор', from: 'server', to: 'router',
    summary: 'Сервер создаёт новый ICMP Echo Reply (type 0).',
    detail: 'Новый пакет: источник 192.168.2.20, назначение 192.168.1.10, начальный TTL 64. Обратный next-hop — R1 192.168.2.1. MAC шлюза сервер узнал ранее из ARP-запроса.',
    packet: replyLan2,
  },
  {
    title: 'Маршрутизатор обрабатывает ответ', from: 'router', to: 'router',
    summary: 'Маршрутизатор выбирает маршрут обратно к ПК.',
    detail: 'Connected-маршрут в 192.168.1.0/24. R1 уменьшает TTL ответа 64 → 63, использует известный MAC ПК и готовит новый Ethernet-кадр в LAN 1.',
    packet: replyLan2,
  },
  {
    title: 'Маршрутизатор → коммутатор', from: 'router', to: 'switch',
    summary: 'Echo Reply уходит через интерфейс LAN 1 к ПК.',
    detail: 'Новый Ethernet-кадр адресован MAC ПК. IPv4 source/destination остались адресами сервера и ПК. TTL 63.',
    packet: replyLan,
  },
  {
    title: 'Коммутатор → ПК', from: 'switch', to: 'pc',
    summary: 'Коммутатор доставляет Echo Reply на порт ПК.',
    detail: 'Коммутатор отправляет кадр по MAC-таблице, не меняя TTL. ПК принимает ICMP Echo Reply. Ping успешен.',
    packet: replyLan,
  },
  {
    title: 'Ping выполнен', from: 'pc', to: 'pc',
    summary: 'ПК получил ответ. Полный путь пройден — без прыжков через устройства.',
    detail: 'ARP нужен для узнавания MAC следующего узла. Повторный ping может обходиться без новых ARP-запросов, пока записи ARP-кэшей действительны.',
    note: 'Учебный сценарий без задержек и реальной отправки пакетов.',
  },
];



const FAULTS = [
  { id: 'mask' as const, name: 'Дело №1', symptom: 'ПК 192.168.1.10/16 пытается ping 192.168.2.20. В ARP видно: «Who has 192.168.2.20?». Ответа нет.',
    options: ['Неисправен DNS', 'Неправильная маска ПК', 'Неверный TTL'] as const, correct: 1, fix: 'Поставить маску /24',
    why: 'С маской /16 ПК ошибочно считает сервер локальным и пытается узнать его MAC напрямую вместо отправки пакета шлюзу.' },
  { id: 'gateway' as const, name: 'Дело №2', symptom: 'ПК 192.168.1.10/24. Ping 192.168.2.20: «Network unreachable». В таблице маршрутов нет default route.',
    options: ['Отсутствует шлюз по умолчанию', 'Сервер не знает MAC ПК', 'Сломан коммутатор'] as const, correct: 0, fix: 'Указать шлюз 192.168.1.1',
    why: 'Назначение не входит в 192.168.1.0/24, поэтому ПК нужен маршрут через шлюз. Без него пакет не сможет уйти из ПК.' },
];

const POINTS: Record<NodeId, [number, number]> = { pc: [78, 118], switch: [250, 118], router: [470, 118], server: [670, 118] };
const ICONS = {
  pc: 'M-18-14h36v22h-36z M0 8v8 M-12 16h24',
  switch: 'M-26-12h52v24h-52z M-18 0h8 M-4 0h8 M10 0h8',
  router: 'M-24-14h48v28h-48z M-14-4h28 M-14 6h28',
  server: 'M-16-22h32v44h-32z M-10-12h20 M-10 0h20 M-10 12h20',
};

function kindLabel(p: Packet): string {
  if (p.kind === 'arp-req') return 'ARP Request';
  if (p.kind === 'arp-reply') return 'ARP Reply';
  if (p.kind === 'icmp-req') return 'ICMP Echo Request';
  return 'ICMP Echo Reply';
}
function macLabel(address: string): string {
  if (address === MACS.pc) return 'ПК';
  if (address === MACS.routerLan1) return 'R1 LAN1';
  if (address === MACS.routerLan2) return 'R1 LAN2';
  if (address === MACS.server) return 'сервер';
  if (address === MACS.all) return 'broadcast';
  return address;
}

export const PacketJourney: React.FC = () => {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'learn' | 'fix'>('learn');
  const [detective, setDetective] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [answer, setAnswer] = useState<Record<number, number>>({});
  const [showFrame, setShowFrame] = useState(false);
  const [faultIndex, setFaultIndex] = useState(0);
  const [faultAnswer, setFaultAnswer] = useState<number | null>(null);
  const [faultFixed, setFaultFixed] = useState(false);

  const current = EVENTS[step];
  const challenge = detective ? current.challenge : undefined;
  const choice = answer[step];
  const solved = !challenge || choice === challenge.correct;
  const travel = current.from !== current.to;
  const fault = FAULTS[faultIndex];

  const go = (n: number) => {
    const target = Math.max(0, Math.min(EVENTS.length - 1, n));
    if (detective && target > step) {
      for (let i = step; i < target; i += 1) {
        const quiz = EVENTS[i].challenge;
        if (quiz && answer[i] !== quiz.correct) {
          setStep(i);
          return;
        }
      }
    }
    setStep(target);
  };
  const restart = () => { setStep(0); setAnswer({}); setPlaying(false); setShowFrame(false); };

  useEffect(() => {
    if (!playing || mode !== 'learn' || !solved) return;
    if (step >= EVENTS.length - 1) { setPlaying(false); return; }
    const t = window.setTimeout(() => setStep((s) => Math.min(EVENTS.length - 1, s + 1)), 1800);
    return () => window.clearTimeout(t);
  }, [playing, step, solved, mode]);

  return (
    <section className="mx-auto max-w-6xl space-y-3" aria-label="Путь пакета">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Практика · Путь пакета</div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Ping на сервер</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">192.168.1.10 → шлюз → 192.168.2.20. Один шаг — один участок или одно действие.</p>
        </div>
        <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5 self-start">
          {([['learn', 'Разобраться'], ['fix', 'Исправить']] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => { setMode(id); setPlaying(false); }} className={'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ' + (mode === id ? 'bg-cyan-500 text-slate-950' : 'text-slate-600 dark:text-slate-300')}>{label}</button>
          ))}
        </div>
      </div>

      {mode === 'learn' ? (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2">
            <svg viewBox="0 0 760 230" className="w-full h-auto" role="img" aria-label="ПК, коммутатор, маршрутизатор, сервер">
              <rect x="8" y="10" width="390" height="210" rx="14" className="fill-cyan-50 dark:fill-cyan-950/20 stroke-cyan-300 dark:stroke-cyan-800" strokeDasharray="5 4" />
              <rect x="408" y="10" width="344" height="210" rx="14" className="fill-indigo-50 dark:fill-indigo-950/20 stroke-indigo-300 dark:stroke-indigo-800" strokeDasharray="5 4" />
              <text x="18" y="28" className="fill-cyan-800 dark:fill-cyan-300" fontSize="11">LAN · 192.168.1.0/24</text>
              <text x="418" y="28" className="fill-indigo-800 dark:fill-indigo-300" fontSize="11">LAN · 192.168.2.0/24</text>
              <path d="M78 118 L250 118" className="stroke-slate-300 dark:stroke-slate-600" fill="none" strokeWidth="2.5" />
              <path d="M250 118 L470 118" className="stroke-slate-300 dark:stroke-slate-600" fill="none" strokeWidth="2.5" />
              <path d="M470 118 L670 118" className="stroke-slate-300 dark:stroke-slate-600" fill="none" strokeWidth="2.5" />
              {([['pc','ПК','Eth0',IPS.pc],['switch','SW','Fa0/1 · Gi0/1','L2'],['router','R1','LAN1 .1 · LAN2 .1',IPS.routerLan1],['server','Srv','Eth0',IPS.server]] as const).map(([id, title, iface, ip]) => {
                const [x, y] = POINTS[id as NodeId];
                const active = current.from === id || current.to === id;
                return (
                  <g key={id} transform={'translate(' + x + ' ' + y + ')'}>
                    <path d={ICONS[id as NodeId]} className={active ? 'fill-cyan-100 dark:fill-cyan-900 stroke-cyan-500' : 'fill-white dark:fill-slate-900 stroke-slate-400 dark:stroke-slate-600'} strokeWidth="1.6" />
                    <text y="42" textAnchor="middle" className="fill-slate-900 dark:fill-slate-100" fontSize="12" fontWeight="700">{title}</text>
                    <text y="55" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400" fontSize="9">{iface}</text>
                    <text y="67" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400" fontSize="9">{ip}</text>
                  </g>
                );
              })}
              {travel && (
                <motion.g key={step} initial={{ x: POINTS[current.from][0], y: POINTS[current.from][1] }} animate={{ x: POINTS[current.to][0], y: POINTS[current.to][1] }} transition={{ duration: 0.8, ease: 'easeInOut' }}>
                  <rect x="-26" y="-10" width="52" height="20" rx={current.packet?.kind.startsWith('arp') ? 4 : 10} className={current.packet?.kind.startsWith('arp') ? 'fill-amber-400' : 'fill-cyan-400'} />
                  <text y="4" textAnchor="middle" className="fill-slate-950" fontSize="9" fontWeight="800">{current.packet?.kind.startsWith('arp') ? 'ARP' : current.packet?.kind === 'icmp-reply' ? 'reply' : 'ping'}</text>
                </motion.g>
              )}
              {!travel && (
                <g transform={'translate(' + POINTS[current.from][0] + ' ' + (POINTS[current.from][1] - 28) + ')'}>
                  <rect x="-34" y="-10" width="68" height="18" rx="6" className="fill-slate-800 dark:fill-slate-200" />
                  <text y="3" textAnchor="middle" className="fill-white dark:fill-slate-900" fontSize="9" fontWeight="700">здесь</text>
                </g>
              )}
            </svg>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Шаг {step + 1} / {EVENTS.length}</span>
              <button type="button" onClick={() => { setDetective((d) => !d); setStep(0); setAnswer({}); setPlaying(false); setShowFrame(false); }} className={'px-2 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ' + (detective ? 'border-amber-400 text-amber-700 dark:text-amber-200' : 'border-slate-200 dark:border-slate-700')}>
                {detective ? 'Проверяю себя' : 'Изучаю'}
              </button>
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{current.title}</div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{solved ? current.summary : 'Ответь, чтобы увидеть, что произойдёт.'}</p>
            {challenge && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-100">{challenge.prompt}</p>
                {challenge.options.map((option, i) => (
                  <button key={option} type="button" onClick={() => setAnswer((prev) => ({ ...prev, [step]: i }))} className={'w-full text-left text-xs rounded-lg border px-2 py-1.5 cursor-pointer ' + (choice === i && i === challenge.correct ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' : choice === i ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40' : 'border-slate-200 dark:border-slate-700')}>{option}</button>
                ))}
                {choice === challenge.correct && <p className="text-xs text-emerald-700 dark:text-emerald-300">{challenge.why}</p>}
              </div>
            )}
            {solved && current.note && <p className="text-xs border-l-2 border-cyan-400 pl-2 text-cyan-800 dark:text-cyan-100">{current.note}</p>}
            {solved && current.detail && <p className="text-xs text-slate-500 dark:text-slate-400">{current.detail}</p>}
            {solved && current.packet && (
              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-2">{kindLabel(current.packet)}</div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-2">MAC {macLabel(current.packet.srcMac)} → {macLabel(current.packet.dstMac)}</div>
                {current.packet.kind.startsWith('arp') ? (
                  <>
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2">ARP {current.packet.arpSenderIp} → {current.packet.arpTargetIp}</div>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-2 text-slate-500">нет IPv4 TTL</div>
                  </>
                ) : (
                  <>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-2">IP {current.packet.srcIp} → {current.packet.dstIp}</div>
                    <div className={'rounded-lg p-2 ' + (current.packet.ttl === 63 ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200' : 'bg-slate-50 dark:bg-slate-900')}>TTL {current.packet.ttl}</div>
                  </>
                )}
              </div>
            )}
            {solved && current.packet && (
              <details className="text-xs" onToggle={(e) => setShowFrame((e.target as HTMLDetailsElement).open)}>
                <summary className="cursor-pointer text-cyan-700 dark:text-cyan-300">{showFrame ? 'Скрыть кадр' : 'Показать кадр'}</summary>
                <div className="mt-2 space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                  <div>Ethernet src {current.packet.srcMac}</div>
                  <div>Ethernet dst {current.packet.dstMac}</div>
                  <div>EtherType {current.packet.kind.startsWith('arp') ? '0x0806 ARP' : '0x0800 IPv4'}</div>
                  {current.packet.kind.startsWith('arp') ? (
                    <div>ARP {current.packet.kind === 'arp-req' ? 'Request' : 'Reply'} · {current.packet.arpSenderIp} / {current.packet.arpTargetIp}</div>
                  ) : (
                    <>
                      <div>IPv4 {current.packet.srcIp} → {current.packet.dstIp}</div>
                      <div>TTL {current.packet.ttl} · ICMP {current.packet.kind === 'icmp-req' ? 'type 8' : 'type 0'}</div>
                    </>
                  )}
                </div>
              </details>
            )}
            <input type="range" min={0} max={EVENTS.length - 1} value={step} onChange={(e) => { setPlaying(false); go(Number(e.target.value)); }} className="w-full accent-cyan-600" aria-label="Выбор шага" disabled={false} />
            <div className="flex gap-1.5">
              {!playing ? (
                <button type="button" onClick={() => setPlaying(true)} disabled={!solved || step === EVENTS.length - 1} className="flex-1 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold py-2 cursor-pointer disabled:opacity-40"><Play className="w-4 h-4 inline" /> {step === 0 ? 'Запустить' : 'Дальше авто'}</button>
              ) : (
                <button type="button" onClick={() => setPlaying(false)} className="flex-1 rounded-xl bg-amber-400 text-slate-950 text-sm font-semibold py-2 cursor-pointer"><Pause className="w-4 h-4 inline" /> Пауза</button>
              )}
              <button type="button" onClick={() => { setPlaying(false); go(step - 1); }} className="px-3 rounded-xl bg-slate-100 dark:bg-slate-800 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
              <button type="button" onClick={() => { setPlaying(false); if (solved) go(step + 1); }} disabled={!solved} className="px-3 rounded-xl bg-slate-100 dark:bg-slate-800 cursor-pointer disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
              <button type="button" onClick={restart} className="px-3 rounded-xl bg-slate-100 dark:bg-slate-800 cursor-pointer" title="Заново"><RotateCcw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {FAULTS.map((item, i) => (
              <button key={item.id} type="button" onClick={() => { setFaultIndex(i); setFaultAnswer(null); setFaultFixed(false); }} className={'px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ' + (faultIndex === i ? 'bg-cyan-500 border-cyan-500 text-slate-950' : 'border-slate-200 dark:border-slate-700')}>{item.name}</button>
            ))}
          </div>
          <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
            <span className="font-bold">{fault.name} · Задание</span>
            <p className="mt-1 leading-relaxed">{fault.symptom}</p>
          </div>
          <DetectiveTopology key={fault.id} faultId={fault.id} fixed={faultFixed} />
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-sm space-y-2">
            <p className="font-semibold text-slate-800 dark:text-slate-200">Выбери причину неисправности</p>
            <div className="grid sm:grid-cols-3 gap-1.5">
              {fault.options.map((option, i) => (
                <button key={option} type="button" onClick={() => { setFaultAnswer(i); setFaultFixed(false); }} className={'rounded-lg border px-2 py-2 text-left text-xs cursor-pointer ' + (faultAnswer === i ? 'border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30' : 'border-slate-200 dark:border-slate-700')}>{option}</button>
              ))}
            </div>
            {faultAnswer === fault.correct && (
              <div className="space-y-2">
                <p className="text-xs text-emerald-700 dark:text-emerald-300">{fault.why}</p>
                <button type="button" onClick={() => setFaultFixed(true)} className="rounded-lg bg-emerald-500 text-slate-950 px-3 py-1.5 text-xs font-semibold cursor-pointer">{fault.fix}</button>
                {faultFixed && <button type="button" onClick={() => { setMode('learn'); restart(); }} className="block text-xs text-cyan-700 dark:text-cyan-300 underline cursor-pointer">Посмотреть исправный путь</button>}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
