import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';

type Lab = 'dhcp' | 'nat' | 'tcp';
type Mode = 'learn' | 'fix';
type NodeId = string;

type Step = {
  title: string;
  from: NodeId;
  to: NodeId;
  summary: string;
  detail: string;
  badge: string;
  pdu: { label: string; value: string; warn?: boolean }[];
  frame: string[];
  note?: string;
};

type Fault = {
  id: string;
  name: string;
  brief: string;
  options: [string, string, string];
  correct: number;
  why: string;
  fix: string;
};

const DHCP_NODES = [
  { id: 'pc', x: 90, y: 110, title: 'ПК', sub: 'нет IP', extra: '02:00:00:10:00:10' },
  { id: 'sw', x: 340, y: 110, title: 'SW', sub: 'L2', extra: 'VLAN 1' },
  { id: 'srv', x: 590, y: 110, title: 'DHCP', sub: '192.168.10.2', extra: 'UDP 67' },
];
const NAT_NODES = [
  { id: 'pc', x: 90, y: 110, title: 'ПК', sub: '192.168.1.50', extra: 'inside' },
  { id: 'r', x: 340, y: 110, title: 'NAT', sub: '203.0.113.5', extra: 'PAT' },
  { id: 'srv', x: 590, y: 110, title: 'Srv', sub: '198.51.100.10', extra: 'TEST-NET-2' },
];
const TCP_NODES = [
  { id: 'c', x: 120, y: 110, title: 'Клиент', sub: '192.0.2.10:54210', extra: '02:00:00:02:00:10' },
  { id: 's', x: 520, y: 110, title: 'Сервер', sub: '192.0.2.20:80', extra: '02:00:00:02:00:20' },
];

const DHCP_STEPS: Step[] = [
  {
    title: 'Discover',
    from: 'pc', to: 'sw',
    summary: 'Клиент ещё без IP. Шлёт broadcast: «есть ли DHCP-сервер?»',
    detail: 'Источник 0.0.0.0:68, назначение 255.255.255.255:67. В кадре MAC клиента. Это запрос, а не назначенный адрес.',
    badge: 'broadcast',
    pdu: [
      { label: 'UDP', value: '68 → 67' },
      { label: 'IP', value: '0.0.0.0 → 255.255.255.255' },
      { label: 'тип', value: 'Discover' },
      { label: 'yiaddr', value: 'ещё нет' },
    ],
    frame: ['chaddr 02:00:00:10:00:10', 'flags: broadcast', 'Message Type: Discover (1)'],
  },
  {
    title: 'Коммутатор раздаёт broadcast',
    from: 'sw', to: 'srv',
    summary: 'SW передаёт Discover на остальные порты VLAN, не меняя кадр.',
    detail: 'Коммутатор не назначает IP и не выбирает сервер. Он только доставляет broadcast.',
    badge: 'flood',
    pdu: [
      { label: 'UDP', value: '68 → 67' },
      { label: 'dst', value: 'broadcast' },
      { label: 'тип', value: 'Discover' },
      { label: 'TTL', value: 'не DHCP-поле' },
    ],
    frame: ['L2 flood в VLAN', 'IP и DHCP без изменений'],
  },
  {
    title: 'Offer → SW',
    from: 'srv', to: 'sw',
    summary: 'Сервер предлагает 192.168.10.100. Это ещё не аренда.',
    detail: 'В этом стенде Offer идёт broadcast: у клиента нет IP, флаг broadcast взведён. Unicast Offer тоже допустим, если сервер может доставить кадр по MAC. Предложенный адрес ≠ назначенный.',
    badge: 'offer',
    pdu: [
      { label: 'UDP', value: '67 → 68' },
      { label: 'yiaddr', value: '192.168.10.100', warn: true },
      { label: 'тип', value: 'Offer' },
      { label: 'server', value: '192.168.10.2' },
    ],
    frame: ['yiaddr 192.168.10.100', 'маска /24, шлюз .1, DNS 192.0.2.53', 'lease 8 часов — предложение'],
    note: 'Клиент пока остаётся 0.0.0.',
  },
  {
    title: 'SW → клиент: Offer',
    from: 'sw', to: 'pc',
    summary: 'Коммутатор доставляет DHCP Offer клиенту в пределах VLAN.',
    detail: 'На участке SW → ПК кадр остаётся broadcast. L2-коммутатор не назначает адрес и не меняет DHCP-поля. Предложенный IP ещё не применяется.',
    badge: 'Offer',
    pdu: [
      { label: 'UDP', value: '67 → 68' },
      { label: 'тип', value: 'Offer' },
      { label: 'yiaddr', value: '192.168.10.100' },
      { label: 'статус', value: 'предложен' },
    ],
    frame: ['L2 broadcast flood', 'Offer доставлен клиенту', 'IP пока 0.0.0.0'],
  },
  {
    title: 'Request → SW',
    from: 'pc', to: 'sw',
    summary: 'Клиент выбирает это предложение и просит именно его.',
    detail: 'Request тоже broadcast: другие серверы должны увидеть отказ. Requested IP 192.168.10.100, Server Identifier 192.168.10.2. Адрес всё ещё не применён.',
    badge: 'request',
    pdu: [
      { label: 'UDP', value: '68 → 67' },
      { label: 'IP', value: '0.0.0.0 → broadcast' },
      { label: 'тип', value: 'Request' },
      { label: 'просит', value: '192.168.10.100' },
    ],
    frame: ['Requested IP Address 192.168.10.100', 'Server Identifier 192.168.10.2'],
  },
  {
    title: 'SW → DHCP: Request',
    from: 'sw', to: 'srv',
    summary: 'Коммутатор распространяет DHCP Request в пределах VLAN.',
    detail: 'Request остаётся broadcast, другие DHCP-серверы в этом сегменте тоже могут узнать о выборе клиента. SW не изменяет UDP и DHCP.',
    badge: 'Request',
    pdu: [
      { label: 'UDP', value: '68 → 67' },
      { label: 'dst', value: '255.255.255.255' },
      { label: 'тип', value: 'Request' },
      { label: 'просит', value: '192.168.10.100' },
    ],
    frame: ['L2 broadcast flood', 'Server Identifier 192.168.10.2'],
  },
  {
    title: 'ACK → SW',
    from: 'srv', to: 'sw',
    summary: 'Сервер отправляет подтверждение аренды в сторону клиента.',
    detail: 'Сервер формирует ACK: IP 192.168.10.100/24, шлюз 192.168.10.1, DNS 192.0.2.53, аренда 8 часов. До получения ACK клиент адрес не применяет.',
    badge: 'ack',
    pdu: [
      { label: 'UDP', value: '67 → 68' },
      { label: 'тип', value: 'ACK' },
      { label: 'назначен', value: '192.168.10.100', warn: true },
      { label: 'lease', value: '8 ч' },
    ],
    frame: ['Message Type: ACK (5)', 'Subnet Mask 255.255.255.0', 'Router 192.168.10.1'],
  },
  {
    title: 'SW → ПК: ACK и применение',
    from: 'sw', to: 'pc',
    summary: 'Клиент получает ACK и применяет IP, маску, шлюз и DNS.',
    detail: 'Коммутатор пересылает ACK в VLAN. Только после приёма корректного ACK клиент применяет 192.168.10.100/24, шлюз 192.168.10.1 и аренду 8 часов.',
    badge: 'ACK',
    pdu: [
      { label: 'UDP', value: '67 → 68' },
      { label: 'тип', value: 'ACK' },
      { label: 'IP клиента', value: '192.168.10.100', warn: true },
      { label: 'lease', value: '8 ч' },
    ],
    frame: ['L2 broadcast delivery', 'DHCP ACK received', 'IP 192.168.10.100/24 применён'],
  },
];

const NAT_STEPS: Step[] = [
  {
    title: 'ПК отправляет запрос',
    from: 'pc', to: 'r',
    summary: 'Inside local: 192.168.1.50:54210 → 198.51.100.10:80.',
    detail: 'Учебные адреса RFC 5737, не реальный интернет. Пакета ещё нет в таблице PAT.',
    badge: 'inside',
    pdu: [
      { label: 'src', value: '192.168.1.50:54210' },
      { label: 'dst', value: '198.51.100.10:80' },
      { label: 'proto', value: 'TCP' },
      { label: 'PAT', value: 'ещё нет' },
    ],
    frame: ['Inside Local', 'порт выбран клиентом'],
  },
  {
    title: 'PAT на маршрутизаторе',
    from: 'r', to: 'r',
    summary: 'Маршрутизатор создаёт запись и меняет источник.',
    detail: '192.168.1.50:54210 → 203.0.113.5:40001. Назначение пока то же. Это и есть трансляция.',
    badge: 'PAT',
    pdu: [
      { label: 'было', value: '192.168.1.50:54210' },
      { label: 'стало', value: '203.0.113.5:40001', warn: true },
      { label: 'dst', value: '198.51.100.10:80' },
      { label: 'запись', value: 'создана' },
    ],
    frame: ['inside local 192.168.1.50:54210', 'inside global 203.0.113.5:40001', 'outside 198.51.100.10:80'],
  },
  {
    title: 'К учебному серверу',
    from: 'r', to: 'srv',
    summary: 'Сервер видит только глобальный адрес.',
    detail: 'Источник 203.0.113.5:40001. Приватный адрес в этот пакет уже не входит.',
    badge: 'out',
    pdu: [
      { label: 'src', value: '203.0.113.5:40001' },
      { label: 'dst', value: '198.51.100.10:80' },
      { label: 'видно серверу', value: 'global' },
      { label: 'local', value: 'скрыт' },
    ],
    frame: ['сервер не знает 192.168.1.50'],
  },
  {
    title: 'Ответ сервера',
    from: 'srv', to: 'r',
    summary: 'Ответ адресован глобальному сокету PAT.',
    detail: '198.51.100.10:80 → 203.0.113.5:40001. Без записи PAT маршрутизатор не узнает клиента.',
    badge: 'back',
    pdu: [
      { label: 'src', value: '198.51.100.10:80' },
      { label: 'dst', value: '203.0.113.5:40001' },
      { label: 'поиск', value: 'PAT' },
      { label: 'клиент', value: 'ещё не указан' },
    ],
    frame: ['ищем запись по global:port'],
  },
  {
    title: 'Обратная трансляция',
    from: 'r', to: 'pc',
    summary: 'Запись найдена. Назначение возвращается клиенту.',
    detail: '203.0.113.5:40001 → 192.168.1.50:54210. Источник сервера не меняется.',
    badge: 'in',
    pdu: [
      { label: 'было dst', value: '203.0.113.5:40001' },
      { label: 'стало dst', value: '192.168.1.50:54210', warn: true },
      { label: 'src', value: '198.51.100.10:80' },
      { label: 'итог', value: 'доставлен' },
    ],
    frame: ['PAT hit', 'клиент получает ответ своего соединения'],
  },
];

const TCP_STEPS: Step[] = [
  {
    title: 'SYN',
    from: 'c', to: 's',
    summary: 'Клиент начинает handshake. Данных ещё нет.',
    detail: 'SYN, seq=1000. Состояние клиента: SYN-SENT. Сервер был LISTEN.',
    badge: 'SYN',
    pdu: [
      { label: 'флаги', value: 'SYN' },
      { label: 'seq', value: '1000' },
      { label: 'ack', value: '—' },
      { label: 'клиент', value: 'SYN-SENT' },
    ],
    frame: ['порт 54210 → 80', 'данные: нет', 'это не HTTP'],
  },
  {
    title: 'SYN/ACK',
    from: 's', to: 'c',
    summary: 'Сервер принимает SYN и отвечает своим SYN.',
    detail: 'SYN+ACK, seq=5000, ack=1001. Сервер: SYN-RECEIVED.',
    badge: 'SYN/ACK',
    pdu: [
      { label: 'флаги', value: 'SYN ACK' },
      { label: 'seq', value: '5000' },
      { label: 'ack', value: '1001' },
      { label: 'сервер', value: 'SYN-RECEIVED' },
    ],
    frame: ['ack = seq клиента + 1'],
  },
  {
    title: 'ACK',
    from: 'c', to: 's',
    summary: 'Третье рукопожатие. Соединение установлено.',
    detail: 'ACK, seq=1001, ack=5001. Оба в ESTABLISHED. Только теперь можно передавать данные.',
    badge: 'ACK',
    pdu: [
      { label: 'флаги', value: 'ACK' },
      { label: 'seq', value: '1001' },
      { label: 'ack', value: '5001' },
      { label: 'оба', value: 'ESTABLISHED', warn: true },
    ],
    frame: ['handshake завершён', 'HTTP ещё не отправляли'],
  },
  {
    title: 'Данные',
    from: 'c', to: 's',
    summary: 'Теперь клиент шлёт 20 байт полезной нагрузки.',
    detail: 'PSH+ACK, seq=1001. Это уже данные, не установка соединения.',
    badge: 'DATA',
    pdu: [
      { label: 'флаги', value: 'PSH ACK' },
      { label: 'seq', value: '1001' },
      { label: 'len', value: '20' },
      { label: 'состояние', value: 'ESTABLISHED' },
    ],
    frame: ['payload 20 байт', 'следующий seq будет 1021'],
  },
  {
    title: 'Подтверждение данных',
    from: 's', to: 'c',
    summary: 'Сервер подтверждает полученные байты.',
    detail: 'ACK, ack=1021. Управляющий сегмент, без новой нагрузки.',
    badge: 'ACK',
    pdu: [
      { label: 'флаги', value: 'ACK' },
      { label: 'ack', value: '1021' },
      { label: 'данные', value: 'нет' },
      { label: 'состояние', value: 'ESTABLISHED' },
    ],
    frame: ['подтверждены байты 1001–1020'],
  },
  {
    title: 'FIN клиента',
    from: 'c', to: 's',
    summary: 'Клиент закрывает свою сторону.',
    detail: 'FIN+ACK, seq=1021. Клиент: FIN-WAIT-1. Сервер ещё ESTABLISHED.',
    badge: 'FIN',
    pdu: [
      { label: 'флаги', value: 'FIN ACK' },
      { label: 'seq', value: '1021' },
      { label: 'клиент', value: 'FIN-WAIT-1' },
      { label: 'сервер', value: 'ESTABLISHED' },
    ],
    frame: ['закрытие, не обрыв'],
  },
  {
    title: 'FIN сервера',
    from: 's', to: 'c',
    summary: 'Сервер подтверждает FIN и закрывает свою сторону.',
    detail: 'Сервер: CLOSE-WAIT, затем LAST-ACK. Шлёт FIN+ACK, ack=1022.',
    badge: 'FIN',
    pdu: [
      { label: 'флаги', value: 'FIN ACK' },
      { label: 'ack', value: '1022' },
      { label: 'сервер', value: 'LAST-ACK' },
      { label: 'клиент', value: 'FIN-WAIT-2' },
    ],
    frame: ['обе стороны начали закрытие'],
  },
  {
    title: 'Последний ACK',
    from: 'c', to: 's',
    summary: 'Клиент подтверждает FIN сервера.',
    detail: 'Клиент переходит в TIME-WAIT, затем CLOSED. Сервер — CLOSED. Соединение завершено.',
    badge: 'ACK',
    pdu: [
      { label: 'флаги', value: 'ACK' },
      { label: 'ack', value: '5002' },
      { label: 'клиент', value: 'TIME-WAIT' },
      { label: 'сервер', value: 'CLOSED', warn: true },
    ],
    frame: ['корректное завершение', 'не RST'],
  },
];

const FAULTS: Record<Lab, Fault> = {
  dhcp: {
    id: 'no-offer',
    name: 'Нет Offer',
    brief: 'ПК шлёт Discover, ответа нет. IP не появляется.',
    options: ['Сервер не отвечает или недостижим', 'Клиент уже получил ACK', 'Неверный TTL ICMP'],
    correct: 0,
    why: 'Discover ушёл, Offer не пришёл. Проверь сервер, пул, порт 67/68 и путь broadcast до него.',
    fix: 'Восстановить ответ сервера',
  },
  nat: {
    id: 'no-pat',
    name: 'Нет записи PAT',
    brief: 'Ответ пришёл на 203.0.113.5:40001, но записи трансляции нет.',
    options: ['Нет подходящей NAT-записи', 'Клиент не знает DNS', 'Сломан коммутатор L2'],
    correct: 0,
    why: 'Без сопоставления порта и inside local обратный пакет нельзя доставить. Проверь NAT-правило и тайм-аут записи; она создаётся при разрешённом исходящем трафике, а не произвольным нажатием.',
    fix: 'Восстановить PAT и повторить исходящий обмен',
  },
  tcp: {
    id: 'syn-timeout',
    name: 'SYN без ответа',
    brief: 'Клиент послал SYN, SYN/ACK нет. Повтор и тайм-аут.',
    options: ['Сервер не отвечает на SYN', 'Handshake уже завершён', 'Неверная маска DHCP'],
    correct: 0,
    why: 'Клиент остаётся в SYN-SENT. Данных нет: соединение не установлено. Проверь доступность порта и фильтр.',
    fix: 'Получить SYN/ACK',
  },
};

function Stand({ lab, nodes, steps }: { lab: Lab; nodes: { id: string; x: number; y: number; title: string; sub: string; extra: string }[]; steps: Step[] }) {
  const [mode, setMode] = useState<Mode>('learn');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<number | null>(null);
  const [fixed, setFixed] = useState(false);
  const current = steps[step];
  const fault = FAULTS[lab];
  const travel = current.from !== current.to;
  const from = nodes.find((n) => n.id === current.from) || nodes[0];
  const to = nodes.find((n) => n.id === current.to) || nodes[0];

  useEffect(() => {
    if (!playing || mode !== 'learn') return;
    if (step >= steps.length - 1) { setPlaying(false); return; }
    const t = window.setTimeout(() => setStep((s) => Math.min(steps.length - 1, s + 1)), 1600);
    return () => window.clearTimeout(t);
  }, [playing, step, mode, steps.length]);

  const restart = () => { setStep(0); setPlaying(false); setOpen(false); };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 p-0.5">
          {([['learn', 'Разобраться'], ['fix', 'Исправить']] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setMode(id)} className={'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ' + (mode === id ? 'bg-cyan-500 text-slate-950' : 'text-slate-600 dark:text-slate-300')}>{label}</button>
          ))}
        </div>
      </div>
      {mode === 'fix' && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          {fault.brief}
          {fixed && <span className="ml-2 font-bold text-emerald-700 dark:text-emerald-300">Стенд исправлен.</span>}
        </div>
      )}
      {mode === 'learn' ? (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2">
            <svg viewBox="0 0 700 210" className="w-full h-auto" role="img" aria-label={lab}>
              <rect x="8" y="12" width="684" height="186" rx="14" className="fill-cyan-50 dark:fill-cyan-950/20 stroke-cyan-300 dark:stroke-cyan-800" strokeDasharray="5 4" />
              {nodes.slice(0, -1).map((n, i) => (
                <path key={n.id} d={'M' + n.x + ' 110 L' + nodes[i + 1].x + ' 110'} className="stroke-slate-300 dark:stroke-slate-600" fill="none" strokeWidth="2.5" />
              ))}
              {nodes.map((n) => (
                <g key={n.id} transform={'translate(' + n.x + ' 110)'}>
                  <rect x="-28" y="-16" width="56" height="32" rx="6" className={current.from === n.id || current.to === n.id ? 'fill-cyan-100 dark:fill-cyan-900 stroke-cyan-500' : 'fill-white dark:fill-slate-900 stroke-slate-400 dark:stroke-slate-600'} />
                  <text y="38" textAnchor="middle" className="fill-slate-900 dark:fill-slate-100" fontSize="12" fontWeight="700">{n.title}</text>
                  <text y="51" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400" fontSize="9">{lab === 'dhcp' && n.id === 'pc' && step === steps.length - 1 ? '192.168.10.100/24' : n.sub}</text>
                  <text y="63" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400" fontSize="9">{n.extra}</text>
                </g>
              ))}
              {travel && (
                <motion.g key={lab + step} initial={{ x: from.x, y: 110 }} animate={{ x: to.x, y: 110 }} transition={{ duration: 0.7 }}>
                  <rect x="-24" y="-10" width="48" height="20" rx="8" className="fill-cyan-400" />
                  <text y="4" textAnchor="middle" className="fill-slate-950" fontSize="9" fontWeight="800">{current.badge}</text>
                </motion.g>
              )}
            </svg>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-2">
            <div className="text-xs text-slate-500">Шаг {step + 1} / {steps.length}</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{current.title}</div>
            <p className="text-xs text-slate-600 dark:text-slate-300">{current.summary}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{current.detail}</p>
            {current.note && <p className="text-xs border-l-2 border-cyan-400 pl-2">{current.note}</p>}
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
              {current.pdu.map((row) => (
                <div key={row.label} className={'rounded-lg p-2 ' + (row.warn ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200' : 'bg-slate-50 dark:bg-slate-900')}>
                  {row.label}: {row.value}
                </div>
              ))}
            </div>
            <details onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
              <summary className="cursor-pointer text-xs text-cyan-700 dark:text-cyan-300">{open ? 'Скрыть разбор' : 'Показать разбор'}</summary>
              <div className="mt-2 space-y-1 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                {current.frame.map((line) => <div key={line}>{line}</div>)}
              </div>
            </details>
            <input type="range" min={0} max={steps.length - 1} value={step} onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)); }} className="w-full accent-cyan-600" aria-label="Этап" />
            <div className="flex gap-1.5">
              {!playing ? (
                <button type="button" onClick={() => setPlaying(true)} disabled={step === steps.length - 1} className="flex-1 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold py-2 cursor-pointer disabled:opacity-40"><Play className="w-4 h-4 inline" /> Запустить</button>
              ) : (
                <button type="button" onClick={() => setPlaying(false)} className="flex-1 rounded-xl bg-amber-400 text-slate-950 text-sm font-semibold py-2 cursor-pointer"><Pause className="w-4 h-4 inline" /> Пауза</button>
              )}
              <button type="button" onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }} className="px-3 rounded-xl bg-slate-100 dark:bg-slate-800 cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
              <button type="button" onClick={() => { setPlaying(false); setStep((s) => Math.min(steps.length - 1, s + 1)); }} className="px-3 rounded-xl bg-slate-100 dark:bg-slate-800 cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
              <button type="button" onClick={restart} className="px-3 rounded-xl bg-slate-100 dark:bg-slate-800 cursor-pointer"><RotateCcw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-2">
          <p className="text-sm text-slate-700 dark:text-slate-200">{fault.brief}</p>
          <div className="grid sm:grid-cols-3 gap-1.5">
            {fault.options.map((option, i) => (
              <button key={option} type="button" onClick={() => { setChoice(i); setFixed(false); }} className={'rounded-lg border px-2 py-2 text-left text-xs cursor-pointer ' + (choice === i ? 'border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30' : 'border-slate-200 dark:border-slate-700')}>{option}</button>
            ))}
          </div>
          {choice === fault.correct && (
            <div className="space-y-2">
              <p className="text-xs text-emerald-700 dark:text-emerald-300">{fault.why}</p>
              <button type="button" onClick={() => setFixed(true)} className="rounded-lg bg-emerald-500 text-slate-950 px-3 py-1.5 text-xs font-semibold cursor-pointer">{fault.fix}</button>
              {fixed && <button type="button" onClick={() => { setMode('learn'); restart(); }} className="block text-xs text-cyan-700 dark:text-cyan-300 underline cursor-pointer">Посмотреть исправный обмен</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ProtocolSimulators: React.FC<{ initialLab?: Lab }> = ({ initialLab }) => {
  const [lab, setLab] = useState<Lab>(initialLab ?? 'dhcp');
  return (
    <section className="mx-auto max-w-6xl space-y-3" aria-label="DHCP NAT TCP">
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Практика · протоколы</div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">DHCP · NAT · TCP</h2>
      </div>
      <div className="flex flex-wrap gap-1">
        {([['dhcp', 'DHCP'], ['nat', 'NAT/PAT'], ['tcp', 'TCP']] as const).map(([id, label]) => (
          <button key={id} type="button" aria-pressed={lab === id} onClick={() => setLab(id)} className={'px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ' + (lab === id ? 'bg-cyan-500 border-cyan-500 text-slate-950' : 'border-slate-200 dark:border-slate-700')}>{label}</button>
        ))}
      </div>
      {lab === 'dhcp' && <Stand lab="dhcp" nodes={DHCP_NODES} steps={DHCP_STEPS} />}
      {lab === 'nat' && <Stand lab="nat" nodes={NAT_NODES} steps={NAT_STEPS} />}
      {lab === 'tcp' && <Stand lab="tcp" nodes={TCP_NODES} steps={TCP_STEPS} />}
    </section>
  );
};
