import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Network, ShieldCheck } from 'lucide-react';

/**
 * A single event = one cable traversal OR one device-local processing action.
 * Never combine PC→switch→router into a single animation step.
 * IP addresses survive forwarding (there is no NAT here); Ethernet headers
 * are rebuilt by the router, not by the L2 switch.
 */
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

function useMobile(): boolean {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 680);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 680);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
}

const ICONS: Record<NodeId, string> = {
  pc: 'M-21-16h42v26h-42z M-26 16h52 M-7 10v6 M7 10v6',
  switch: 'M-24-13h48v28h-48z M-17-3h11 M0-3h11 M-17 7h11 M0 7h11',
  router: 'M-23-16h46v32h-46z M-12-7h24 M-12 7h24 M-7-12l-5 5 5 5 M7 2l5 5-5 5',
  server: 'M-19-27h38v54h-38z M-13-13h26 M-13 0h26 M-13 13h26',
};
const desktopPoints: Record<NodeId, [number, number]> = { pc: [90, 90], switch: [345, 90], router: [650, 90], server: [910, 90] };
const mobilePoints: Record<NodeId, [number, number]> = { pc: [48, 63], switch: [48, 182], router: [48, 310], server: [48, 443] };

function displayMac(address: string): string {
  if (address === MACS.pc) return 'MAC ПК';
  if (address === MACS.routerLan1) return 'MAC R1 LAN 1';
  if (address === MACS.routerLan2) return 'MAC R1 LAN 2';
  if (address === MACS.server) return 'MAC сервера';
  return 'Broadcast (всем)';
}
function packetKind(p: Packet): string {
  if (p.kind === 'arp-req') return 'ARP Request';
  if (p.kind === 'arp-reply') return 'ARP Reply';
  if (p.kind === 'icmp-req') return 'ICMP Echo Request';
  return 'ICMP Echo Reply';
}

const FAULTS = [
  { id: 'mask', name: 'Случай 1', symptom: 'ПК 192.168.1.10/16 пытается ping 192.168.2.20. В ARP видно: «Who has 192.168.2.20?». Ответа нет.',
    options: ['Неисправен DNS', 'Неправильная маска ПК', 'Неверный TTL'], correct: 1, fix: 'Поставить маску /24',
    why: 'С маской /16 ПК ошибочно считает сервер локальным и пытается узнать его MAC напрямую вместо отправки пакета шлюзу.' },
  { id: 'gateway', name: 'Случай 2', symptom: 'ПК 192.168.1.10/24. Ping 192.168.2.20: «Network unreachable». В таблице маршрутов нет default route.',
    options: ['Отсутствует шлюз по умолчанию', 'Сервер не знает MAC ПК', 'Сломан коммутатор'], correct: 0, fix: 'Указать шлюз 192.168.1.1',
    why: 'Назначение не входит в 192.168.1.0/24, поэтому ПК нужен маршрут через шлюз. Без него пакет не сможет уйти из ПК.' },
] as const;

export const PacketJourney: React.FC = () => {
  const mobile = useMobile();
  const points = mobile ? mobilePoints : desktopPoints;
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<'learn' | 'fix'>('learn');
  const [detective, setDetective] = useState(false);
  const [answer, setAnswer] = useState<Record<number, number>>({});
  const [faultIndex, setFaultIndex] = useState(0);
  const [faultAnswer, setFaultAnswer] = useState<number | null>(null);
  const [faultFixed, setFaultFixed] = useState(false);
  const current = EVENTS[step];
  const challenge = detective ? current.challenge : undefined;
  const choice = answer[step];
  const solved = !challenge || choice === challenge.correct;
  const from = points[current.from];
  const to = points[current.to];
  const travel = current.from !== current.to;
  const track = 'M' + from[0] + ' ' + from[1] + ' L' + to[0] + ' ' + to[1];
  const fault = FAULTS[faultIndex];

  const go = (n: number) => {
    setStep(Math.max(0, Math.min(EVENTS.length - 1, n)));
  };
  const restart = () => {
    setStep(0);
    setAnswer({});
  };

  return (
    <section className="mx-auto max-w-5xl space-y-4 lg:space-y-[clamp(6px,1dvh,14px)]" aria-label="Путь пакета через сеть">
      <div className="flex flex-wrap items-center justify-between gap-3 lg:gap-2">
        <div>
          <div className="text-[11px] text-cyan-700 dark:text-cyan-400 font-mono font-bold uppercase tracking-wider">Сетевая практика · ICMP</div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Отправь ping на сервер</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Один шаг — одно действие или один участок кабеля. Никакой телепортации.</p>
        </div>
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1">
          <button type="button" aria-pressed={mode === 'learn'} onClick={() => setMode('learn')}
            className={'px-3 py-2 rounded-lg text-sm font-semibold ' + (mode === 'learn' ? 'bg-cyan-500 text-slate-950' : 'text-slate-700 dark:text-slate-300')}>
            Разобраться
          </button>
          <button type="button" aria-pressed={mode === 'fix'} onClick={() => setMode('fix')}
            className={'px-3 py-2 rounded-lg text-sm font-semibold ' + (mode === 'fix' ? 'bg-cyan-500 text-slate-950' : 'text-slate-700 dark:text-slate-300')}>
            Исправить
          </button>
        </div>
      </div>

      {mode === 'learn' ? (
        <>
          <div className="rounded-2xl border border-cyan-400/45 dark:border-cyan-500/25 bg-white dark:bg-[#0b1929] p-3 sm:p-5 lg:px-3 lg:py-[clamp(6px,0.9dvh,14px)] lg:space-y-[clamp(4px,0.65dvh,10px)] space-y-3 overflow-hidden">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                <Network className="w-4 h-4" aria-hidden="true" /> Карта сети
              </div>
              <button type="button" onClick={() => { setDetective((d) => !d); setAnswer({}); }}
                aria-pressed={detective}
                className={'px-3 py-2 rounded-lg text-xs border font-semibold ' + (detective
                  ? 'border-amber-400 text-amber-800 dark:text-amber-200 bg-amber-400/10' : 'border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300')}>
                {detective ? 'Режим: проверяю себя' : 'Режим: изучаю'}
              </button>
            </div>
            <svg className="w-full h-auto lg:h-[clamp(120px,19dvh,205px)]" viewBox={mobile ? '0 0 340 505' : '0 0 1000 190'}
              role="img" aria-label={'ПК, коммутатор, маршрутизатор и сервер. Текущий этап: ' + current.title}>
              <rect x={mobile ? 8 : 15} y={mobile ? 8 : 20} width={mobile ? 322 : 635} height={mobile ? 302 : 145}
                rx="15" fill="#164e6314" stroke="#22d3ee55" strokeDasharray="5 5" />
              <rect x={mobile ? 8 : 650} y={mobile ? 310 : 20} width={mobile ? 322 : 335} height={mobile ? 181 : 145}
                rx="15" fill="#1d4ed814" stroke="#60a5fa55" strokeDasharray="5 5" />
              <text x={mobile ? 145 : 30} y={mobile ? 26 : 37} fontSize="12" className="fill-cyan-700 dark:fill-[#67e8f9]">LAN 1 · 192.168.1.0/24</text>
              <text x={mobile ? 145 : 755} y={mobile ? 354 : 37} fontSize="12" className="fill-blue-700 dark:fill-[#93c5fd]">LAN 2 · 192.168.2.0/24</text>
              {(['pc', 'switch', 'router'] as const).map((id, i) => {
                const dest = (['switch', 'router', 'server'] as const)[i];
                const a = points[id]; const b = points[dest];
                const active = (current.from === id && current.to === dest) || (current.from === dest && current.to === id);
                return <line key={id} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                  stroke={active ? '#22d3ee' : '#49657d'} strokeWidth={active ? 5 : 3}
                  strokeLinecap="round" opacity={active ? 1 : 0.75} />;
              })}
              {(['pc', 'switch', 'router', 'server'] as const).map(id => {
                const [x, y] = points[id];
                const selected = current.from === id || current.to === id;
                return (
                  <g key={id} transform={'translate(' + x + ' ' + y + ')'}>
                    <circle r="31" fill={selected ? '#0e7490' : '#172f45'} stroke={selected ? '#67e8f9' : '#64748b'} strokeWidth="2.5" />
                    <path d={ICONS[id]} stroke="#dbeafe" strokeWidth="2.4" strokeLinejoin="round" fill="none" />
                    <text x={mobile ? 46 : 0} y={mobile ? -2 : 51} className="fill-slate-800 dark:fill-[#f8fafc]" fontSize={mobile ? 13 : 15}
                      fontWeight="700" textAnchor={mobile ? 'start' : 'middle'}>{NAMES[id]}</text>
                    <text x={mobile ? 46 : 0} y={mobile ? 15 : 68} className="fill-slate-600 dark:fill-[#a3b4c8]" fontSize={mobile ? 10 : 12}
                      textAnchor={mobile ? 'start' : 'middle'}>{IP_SHORT[id]}</text>
                  </g>
                );
              })}
              {travel ? (
                <g key={'travel-' + step}>
                  <path id="packet-hop-path" d={track} fill="none" stroke="none"/>
                  <g>
                    <rect x="-34" y="-14" width="68" height="28" rx="12" fill={current.packet?.kind.startsWith('arp') ? '#fbbf24' : '#34d399'} stroke="#051220" strokeWidth="2" />
                    <text x="0" y="4" textAnchor="middle" fontSize="10" fontWeight="800" fill="#081525">
                      {current.packet?.kind.startsWith('arp') ? 'ARP' : 'ICMP'}
                    </text>
                    <animateMotion key={'move-' + step + (mobile ? '-m' : '-d')} dur="1.7s" path={track} fill="freeze" />
                  </g>
                </g>
              ) : (
                <g transform={'translate(' + (to[0] + (mobile ? 0 : 0)) + ' ' + (to[1] - 38) + ')'}>
                  <rect x="-35" y="-13" width="70" height="26" rx="11" fill="#fbbf24" />
                  <text x="0" y="4" fontSize="10" fontWeight="800" fill="#0f172a" textAnchor="middle">
                    {current.packet ? 'Обработка' : 'Старт'}
                  </text>
                </g>
              )}
            </svg>
            <div className="flex justify-between items-center gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 flex-wrap">
              <span className="font-semibold"><span className="text-amber-700 dark:text-amber-300">{NAMES[current.from]}</span>
                <span className="px-2 text-cyan-700 dark:text-cyan-400">{travel ? '→' : '·'}</span>
                <span className="text-cyan-800 dark:text-cyan-200">{travel ? NAMES[current.to] : 'обработка на месте'}</span>
              </span>
              <span className="font-mono text-slate-600 dark:text-slate-400">{step + 1} / {EVENTS.length}</span>
            </div>
          </div>

          <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-4 z-30 rounded-xl border border-cyan-500/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.45)] p-3 lg:px-3 lg:py-[clamp(6px,0.8dvh,12px)] space-y-3 lg:space-y-[clamp(4px,0.55dvh,9px)]" aria-label="Управление путём пакета">
            <label htmlFor="ping-journey-scrub" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Прогресс — двигай бегунок, чтобы вернуться к любому моменту
            </label>
            <input id="ping-journey-scrub" type="range" min="0" max={EVENTS.length - 1} step="1" value={step}
              onChange={e => go(Number(e.target.value))} disabled={detective}
              className="w-full accent-cyan-400 disabled:opacity-40 lg:h-2" />
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <button type="button" onClick={() => go(step - 1)} disabled={step === 0}
                className="min-h-11 lg:min-h-[clamp(36px,4.5dvh,44px)] px-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 font-semibold disabled:opacity-30">
                <ChevronLeft className="w-4 h-4 inline" /> Назад
              </button>
              <button type="button" onClick={restart}
                className="min-h-11 lg:min-h-[clamp(36px,4.5dvh,44px)] px-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300" aria-label="Начать ping заново">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => go(step + 1)} disabled={step === EVENTS.length - 1 || !solved}
                className="min-h-11 lg:min-h-[clamp(36px,4.5dvh,44px)] px-4 rounded-xl bg-cyan-500 text-slate-950 font-bold disabled:opacity-40">
                Следующий шаг <ChevronRight className="w-4 h-4 inline" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 lg:text-[11px]">{detective ? 'В режиме проверки надо ответить на вопрос, прежде чем двигаться дальше.' : 'Автопереходов нет: ты сам задаёшь скорость движения пакета.'}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 p-4 sm:p-5 lg:px-3 lg:py-[clamp(8px,1dvh,16px)] lg:space-y-[clamp(5px,0.7dvh,10px)] space-y-3">
            <h3 className="text-lg lg:text-base font-black text-slate-900 dark:text-white">{current.title}</h3>
            <p className="text-base lg:text-sm text-slate-800 dark:text-slate-100 leading-relaxed">
              {challenge && !solved ? 'Устройство получило данные. Прими решение и посмотри, что произойдёт.' : current.summary}
            </p>
            {challenge && !solved ? (
              <div className="space-y-3 rounded-xl border border-amber-500/50 bg-amber-400/5 p-3">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{challenge.prompt}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {challenge.options.map((option, i) => (
                    <button type="button" key={option} onClick={() => setAnswer(prev => ({ ...prev, [step]: i }))}
                      className={'min-h-12 rounded-xl px-3 py-2 text-sm text-left font-semibold border ' +
                        (choice === i ? 'border-rose-400 bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-100' : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-cyan-500 dark:hover:border-cyan-400')}>
                      {option}
                    </button>
                  ))}
                </div>
                {choice !== undefined && choice !== challenge.correct && <p role="status" className="text-sm text-rose-700 dark:text-rose-300">Не совсем. Проверь, какую роль играет это устройство, и попробуй ещё раз.</p>}
              </div>
            ) : (
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{current.detail}</p>
            )}
            {challenge && solved && <p className="text-sm text-emerald-700 dark:text-emerald-300 flex gap-2"><ShieldCheck className="h-4 w-4 flex-none mt-0.5" /> {challenge.why}</p>}
            {current.note && (!challenge || solved) && <p className="rounded-lg border-l-4 border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 px-3 py-2 text-sm text-cyan-800 dark:text-cyan-100">{current.note}</p>}

            {current.packet && (!challenge || solved) && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Что несёт кадр</div>
                <div className="rounded-2xl border-2 border-amber-400/70 bg-amber-400/10 p-3 space-y-2">
                  <div className="font-bold text-amber-800 dark:text-amber-200 text-sm">Ethernet · внешняя упаковка</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <div className="min-w-0 space-y-1">
                      <span className="block text-[11px] text-slate-700 dark:text-slate-300">Source MAC · откуда</span>
                      <span className="block font-semibold text-slate-900 dark:text-white">{displayMac(current.packet.srcMac)}</span>
                      <span className="block font-mono text-[11px] sm:text-xs tabular-nums text-amber-900/80 dark:text-amber-100/80 break-all">{current.packet.srcMac}</span>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <span className="block text-[11px] text-slate-700 dark:text-slate-300">Destination MAC · куда</span>
                      <span className="block font-semibold text-slate-900 dark:text-white">{displayMac(current.packet.dstMac)}</span>
                      <span className="block font-mono text-[11px] sm:text-xs tabular-nums text-amber-900/80 dark:text-amber-100/80 break-all">{current.packet.dstMac}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-amber-400/30 pt-2">
                    <span className="text-[11px] text-slate-700 dark:text-slate-300">EtherType · тип содержимого</span>
                    <span className="font-mono text-xs font-semibold text-amber-900 dark:text-amber-100">{current.packet.kind.startsWith('arp') ? '0x0806 · ARP' : '0x0800 · IPv4'}</span>
                  </div>
                  {current.packet.kind.startsWith('arp') ? (
                    <div className="rounded-xl border-2 border-violet-400/60 bg-violet-500/10 p-3 text-sm">
                      <div className="font-bold text-violet-800 dark:text-violet-200">{packetKind(current.packet)} · внутри Ethernet, без IPv4</div>
                      <p className="mt-1 text-slate-700 dark:text-slate-200">Sender IP: {current.packet.arpSenderIp}</p>
                      <p className="text-slate-700 dark:text-slate-200">Target IP: {current.packet.arpTargetIp}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Это поля ARP, а не IP-заголовок.</p>
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-emerald-400/70 bg-emerald-500/10 p-3 space-y-2">
                      <div className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">IPv4 · внутренняя упаковка</div>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200">{current.packet.srcIp} → {current.packet.dstIp}</p>
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">TTL: {current.packet.ttl}</p>
                      <div className="rounded-lg border-2 border-cyan-400/70 bg-cyan-500/15 px-3 py-2 text-sm font-bold text-cyan-800 dark:text-cyan-100">
                        {packetKind(current.packet)} · полезная нагрузка
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0b1929] p-4 sm:p-6 space-y-4">
          <h3 className="text-lg font-black text-slate-900 dark:text-white">Сетевой детектив</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">Сначала симптомы, потом диагноз. Готового решения на кнопке больше нет.</p>
          <div className="flex flex-wrap gap-2">
            {FAULTS.map((item, i) => (
              <button key={item.id} type="button" onClick={() => { setFaultIndex(i); setFaultAnswer(null); setFaultFixed(false); }}
                className={'rounded-lg px-3 py-2 text-sm font-semibold border ' + (faultIndex === i
                  ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200')}>
                {item.name}
              </button>
            ))}
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-4 text-sm text-slate-700 dark:text-slate-200 space-y-2">
            <strong className="text-slate-900 dark:text-white">Наблюдение</strong>
            <p>{fault.symptom}</p>
          </div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">Что нужно проверить и исправить?</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {fault.options.map((option, i) => (
              <button key={option} type="button" onClick={() => { setFaultAnswer(i); setFaultFixed(false); }}
                className={'min-h-12 rounded-xl p-3 border text-left text-sm font-semibold ' + (faultAnswer === i
                  ? 'border-cyan-400 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-100' : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200')}>
                {option}
              </button>
            ))}
          </div>
          {faultAnswer !== null && faultAnswer !== fault.correct && <p className="text-sm text-rose-700 dark:text-rose-300" role="status">Пока не то. Сверь симптомы с настройками маршрутизации ПК.</p>}
          {faultAnswer === fault.correct && (
            <div className="space-y-3 rounded-xl border border-emerald-600/50 bg-emerald-50 dark:bg-emerald-950/20 p-4">
              <p className="text-sm text-emerald-800 dark:text-emerald-200">{fault.why}</p>
              <button type="button" onClick={() => setFaultFixed(true)}
                className="min-h-11 rounded-lg bg-emerald-500 text-slate-950 px-4 font-bold">
                {fault.fix}
              </button>
              {faultFixed && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">Настройка исправлена в учебном сценарии. Теперь повторный ping пойдёт через шлюз. <button type="button" className="underline font-bold" onClick={() => { setMode('learn'); restart(); }}>Посмотреть путь</button></p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
