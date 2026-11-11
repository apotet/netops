import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Settings2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { playClickSound, playErrorSound, playSuccessSound } from '../utils/sound';

export type Vlan = 10 | 20;
export type HostId = 'pc1' | 'pc2' | 'pc3' | 'pc4';
export type TrunkConfig = { left: Vlan[]; right: Vlan[] };
export type L3Role = 'none' | 'SW1' | 'SW2';
export type CaseId = 'explore' | 'access' | 'trunk';

export interface HostInfo {
  id: HostId;
  name: string;
  label: string;
  switchId: 'SW1' | 'SW2';
  port: string;
  ip: string;
  mac: string;
  x: number;
  y: number;
}

export interface Result {
  delivered: boolean;
  message: string;
  explanation: string;
  tagged: boolean;
  crossed: boolean;
  ruleCitation?: string;
}

export interface TracePdu {
  isTagged: boolean;
  vlanId: Vlan;
  ethType: string;
  srcMac: string;
  dstMac: string;
  srcIp: string;
  dstIp: string;
  ttl: number;
  status: 'moving' | 'routing' | 'dropped' | 'delivered';
}

export interface TraceStep {
  title: string;
  detail: string;
  rule: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  activeDeviceId?: HostId | 'SW1' | 'SW2';
  activeLinkId?: 'pc1-sw1' | 'pc2-sw1' | 'sw1-sw2-trunk' | 'sw2-pc3' | 'sw2-pc4';
  pdu: TracePdu;
  actionType: 'tx' | 'access_ingress' | 'l3_svi_route' | 'trunk_tag' | 'trunk_transit' | 'trunk_egress' | 'access_egress' | 'rx_delivery' | 'drop';
  dropped?: boolean;
}

export interface Trace {
  steps: TraceStep[];
  outcome: Result;
  initialVlan: Vlan;
  finalVlan: Vlan;
}

export const HOSTS: HostInfo[] = [
  { id: 'pc1', name: 'PC-01', label: 'Бухгалтерия', switchId: 'SW1', port: 'Fa0/1', ip: '192.168.10.11', mac: '00:50:79:66:68:01', x: 78, y: 92 },
  { id: 'pc2', name: 'PC-02', label: 'Финансы', switchId: 'SW1', port: 'Fa0/2', ip: '192.168.20.12', mac: '00:50:79:66:68:02', x: 78, y: 208 },
  { id: 'pc3', name: 'PC-03', label: 'Склад', switchId: 'SW2', port: 'Fa0/1', ip: '192.168.10.13', mac: '00:50:79:66:68:03', x: 682, y: 92 },
  { id: 'pc4', name: 'PC-04', label: 'Отдел кадров', switchId: 'SW2', port: 'Fa0/2', ip: '192.168.20.14', mac: '00:50:79:66:68:04', x: 682, y: 208 },
];

export const INITIAL_VLANS: Record<HostId, Vlan> = { pc1: 10, pc2: 20, pc3: 10, pc4: 20 };
export const INITIAL_TRUNKS: TrunkConfig = { left: [10, 20], right: [10, 20] };

const SW1 = { x: 250, y: 150 };
const SW2 = { x: 510, y: 150 };


/** Explicit educational model: hosts use DHCP-like renewed addresses whenever an access VLAN is changed.
 * MAC/ARP resolution and MAC address learning are assumed complete, rather than silently invented.
 * VLAN 10/20 are tagged on trunk (native VLAN is outside this simplified exercise).
 */
function ipForHost(host: HostInfo, vlan: Vlan): string {
  return `192.168.${vlan}.${host.ip.split('.').at(-1)}`;
}

const SVI_MAC: Record<Vlan, string> = {
  10: '02:00:00:00:10:01',
  20: '02:00:00:00:20:01',
};

function evaluateNetwork(source: HostId, target: HostId, vlans: Record<HostId, Vlan>, trunks: TrunkConfig, l3: L3Role): Result {
  const a = HOSTS.find((h) => h.id === source)!;
  const b = HOSTS.find((h) => h.id === target)!;
  const srcVlan = vlans[source];
  const dstVlan = vlans[target];
  const crossed = a.switchId !== b.switchId;
  if (source === target) {
    return { delivered: false, crossed: false, tagged: false, message: 'Выбран один ПК',
      explanation: 'Для проверки связи выбери два разных узла. Ping на собственный адрес обрабатывается локальным стеком, без Ethernet-кадра в коммутатор.',
      ruleCitation: 'Local host stack' };
  }
  if (srcVlan !== dstVlan && l3 === 'none') {
    return { delivered: false, crossed, tagged: false, message: 'Нет доступного шлюза для другой подсети',
      explanation: `Для пакета ${ipForHost(a, srcVlan)} → ${ipForHost(b, dstVlan)} нужен L3-шлюз. PC отправляет ARP Broadcast в VLAN ${srcVlan}; коммутатор распространяет его только в этой VLAN (а не в VLAN ${dstVlan}). Шлюз не настроен, ARP Reply не приходит — IPv4-пакет не отправляется.`,
      ruleCitation: 'ARP / default gateway before inter-subnet forwarding' };
  }
  const needL3 = srcVlan !== dstVlan;
  const originSwitch = a.switchId;
  const routeToGateway = needL3 && originSwitch !== l3;
  const routeToDest = needL3 ? b.switchId !== l3 : crossed;
  const crossing = routeToGateway || routeToDest;
  const requiredVlans: Vlan[] = [];
  if (routeToGateway) requiredVlans.push(srcVlan);
  if (routeToDest) requiredVlans.push(dstVlan);
  const filtered = requiredVlans.filter((v) => !trunks.left.includes(v) || !trunks.right.includes(v));
  if (filtered.length) {
    return { delivered: false, crossed: crossing, tagged: true,
      message: `На trunk заблокирован VLAN ${[...new Set(filtered)].join(', ')}`,
      explanation: `Для выбранного пути нужен VLAN ${[...new Set(requiredVlans)].join(' и ')} на обоих концах Gi0/1. На одном из портов он отсутствует в allowed vlan.`,
      ruleCitation: '802.1Q trunk allowed VLAN filtering (outbound / inbound)' };
  }
  return needL3
    ? { delivered: true, crossed: crossing, tagged: crossing,
        message: `Пакет маршрутизирован через SVI ${srcVlan} → ${dstVlan} на ${l3}`,
        explanation: 'Отправитель адресует кадр MAC своего шлюза, L3-коммутатор уменьшает TTL, выбирает выходной VLAN и формирует новый Ethernet-кадр с MAC SVI и MAC получателя. IP источника и назначения сохраняются.',
        ruleCitation: 'IPv4 routing: TTL decrement and L2 rewrite' }
    : { delivered: true, crossed, tagged: crossed,
        message: crossed ? `Доставка по trunk, VLAN ${srcVlan}` : `Локальная коммутация, VLAN ${srcVlan}`,
        explanation: crossed ? 'Тег VID добавлен на исходящем trunk, перенесён между коммутаторами и отсутствует на выходном access-порту.' : 'Один VLAN на одном коммутаторе: кадр пересылается с access на access без тега.',
        ruleCitation: crossed ? 'IEEE 802.1Q frame tagging on trunk' : 'IEEE 802.1D MAC learning / forwarding' };
}

function generateDetailedTrace(source: HostId, target: HostId, vlans: Record<HostId, Vlan>, trunks: TrunkConfig, l3: L3Role): Trace {
  const outcome = evaluateNetwork(source, target, vlans, trunks, l3);
  const a = HOSTS.find((h) => h.id === source)!;
  const b = HOSTS.find((h) => h.id === target)!;
  const srcVlan = vlans[source];
  const dstVlan = vlans[target];
  const steps: TraceStep[] = [];
  const swPos = (id: 'SW1' | 'SW2') => id === 'SW1' ? SW1 : SW2;
  const accessLink = (h: HostInfo): NonNullable<TraceStep['activeLinkId']> =>
    h.id === 'pc1' ? 'pc1-sw1' : h.id === 'pc2' ? 'pc2-sw1' : h.id === 'pc3' ? 'sw2-pc3' : 'sw2-pc4';
  const sourceIp = ipForHost(a, srcVlan);
  const targetIp = ipForHost(b, dstVlan);
  const needsRouting = srcVlan !== dstVlan;
  const gatewayMac = SVI_MAC[srcVlan];
  const finalSrcMac = needsRouting ? SVI_MAC[dstVlan] : a.mac;
  const initialDstMac = needsRouting ? gatewayMac : b.mac;
  const pdu = (over: Partial<TracePdu> = {}): TracePdu => ({
    isTagged: false, vlanId: srcVlan, ethType: '0x0800',
    srcMac: a.mac, dstMac: initialDstMac, srcIp: sourceIp, dstIp: targetIp,
    ttl: 64, status: 'moving', ...over,
  });
  const add = (
    title: string, detail: string, rule: string, from: {x:number;y:number}, to: {x:number;y:number},
    actionType: TraceStep['actionType'], fields: Partial<TraceStep> = {}, payload: Partial<TracePdu> = {},
  ) => {
    steps.push({ title, detail, rule, from, to, actionType, ...fields, pdu: pdu(payload) });
  };
  if (source === target) {
    add('Проверка локального адреса', outcome.explanation, outcome.ruleCitation || '', {x:a.x,y:a.y}, {x:a.x,y:a.y},
      'drop', {activeDeviceId:a.id,dropped:true}, {status:'dropped'});
    return {steps,outcome,initialVlan:srcVlan,finalVlan:dstVlan};
  }
  if (needsRouting && l3 === 'none') {
    const arpRequest: Partial<TracePdu> = {
      ethType: '0x0806', srcMac: a.mac, dstMac: 'ff:ff:ff:ff:ff:ff',
      vlanId: srcVlan, isTagged: false,
    };
    add(`${a.name}: ARP-запрос шлюза`,
      `Адрес ${targetIp} находится вне подсети ${sourceIp}/24. PC пытается узнать MAC своего шлюза 192.168.${srcVlan}.1: ARP Request, destination ff:ff:ff:ff:ff:ff.`,
      'ARP broadcast перед отправкой IPv4 в другую подсеть',
      {x:a.x,y:a.y},swPos(a.switchId),'tx',
      {activeDeviceId:a.id,activeLinkId:accessLink(a)},arpRequest);
    add(`${a.switchId}: ARP принят в VLAN ${srcVlan}`,
      `Access ${a.port} принимает ARP Broadcast в VLAN ${srcVlan}. Это не DROP: коммутатор пересылает широковещательный кадр по другим портам VLAN ${srcVlan}, но не в VLAN ${dstVlan}. Возможное дальнейшее распространение через разрешённый trunk в схеме опущено.`,
      'L2 broadcast flooding в пределах VLAN',
      swPos(a.switchId),swPos(a.switchId),'access_ingress',
      {activeDeviceId:a.switchId},arpRequest);
    add(`Нет ARP Reply для 192.168.${srcVlan}.1`,
      'В учебной конфигурации SVI/шлюза нет. Никто не отвечает на ARP-запрос, PC не узнаёт MAC next-hop. IPv4-пакет не отправлен; на PC наступает тайм-аут ARP. Коммутатор не отбрасывал запрос.',
      'ARP unresolved → IP traffic cannot leave the host',
      {x:a.x,y:a.y},{x:a.x,y:a.y},'drop',
      {activeDeviceId:a.id,dropped:true},{...arpRequest,status:'dropped'});
    return {steps,outcome,initialVlan:srcVlan,finalVlan:dstVlan};
  }
  add(`${a.name}: отправка кадра`,
    `Источник ${sourceIp}, назначение ${targetIp}. MAC назначения — ${needsRouting ? 'шлюз VLAN '+srcVlan : 'MAC ПК-получателя'}. ARP и обучение MAC уже выполнены в этой модели.`,
    'ПК посылает нетегированный Ethernet на access-порт.',{x:a.x,y:a.y},swPos(a.switchId),'tx',
    {activeDeviceId:a.id,activeLinkId:accessLink(a)});
  add(`${a.switchId}: приём в VLAN ${srcVlan}`,
    `Access ${a.port} назначает входящему untagged кадру VLAN ${srcVlan}. Коммутатор ищет MAC в таблице внутри этого VLAN.`,
    'PVID/access VLAN; MAC address table',{...swPos(a.switchId)},swPos(a.switchId),'access_ingress',{activeDeviceId:a.switchId});

  let currentSwitch: 'SW1' | 'SW2' = a.switchId;
  let currentVlan = srcVlan;
  let currentPdu: Partial<TracePdu> = {};
  const crossTrunk = (destination: 'SW1' | 'SW2', vlan: Vlan): boolean => {
    if (destination === currentSwitch) return true;
    const sender: 'SW1' | 'SW2' = currentSwitch;
    const from = swPos(sender);
    const to = swPos(destination);
    const senderSide = sender === 'SW1' ? 'left' : 'right';
    const receiverSide = destination === 'SW1' ? 'left' : 'right';
    const mid = {x:(SW1.x + SW2.x)/2,y:150};
    if (!trunks[senderSide].includes(vlan)) {
      add(`${sender}: trunk не выпускает VLAN ${vlan}`, 'VLAN отсутствует в allowed на исходящем Gi0/1.',
        'Фильтр на выходе',from,from,'drop',{activeDeviceId:sender,activeLinkId:'sw1-sw2-trunk',dropped:true},
        {...currentPdu,vlanId:vlan,status:'dropped'});
      return false;
    }
    add(`${sender}: тег 802.1Q VID ${vlan}`, 'Тег TPID 0x8100, PCP 0, DEI 0, VID '+vlan+' добавляется перед EtherType.',
      '802.1Q на trunk (оба учебных VLAN не native)',from,mid,'trunk_tag',
      {activeDeviceId:sender,activeLinkId:'sw1-sw2-trunk'},
      {...currentPdu,isTagged:true,vlanId:vlan});
    if (!trunks[receiverSide].includes(vlan)) {
      add(`${destination}: VLAN ${vlan} не принят`, 'Входящий Gi0/1 не разрешает VLAN '+vlan+'. Кадр отброшен.',
        'Фильтр на входе',mid,to,'drop',{activeDeviceId:destination,activeLinkId:'sw1-sw2-trunk',dropped:true},
        {...currentPdu,isTagged:true,vlanId:vlan,status:'dropped'});
      return false;
    }
    add(`Trunk → ${destination}: VID ${vlan}`,
      'Тегированный кадр доставлен до второго коммутатора. IP-поля не меняются.',
      '802.1Q transit',mid,to,'trunk_transit',{activeLinkId:'sw1-sw2-trunk'},
      {...currentPdu,isTagged:true,vlanId:vlan});
    currentSwitch = destination;
    currentVlan = vlan;
    return true;
  };

  if (needsRouting) {
    const l3Switch: 'SW1' | 'SW2' = l3 === 'SW1' ? 'SW1' : 'SW2';
    if (!crossTrunk(l3Switch,srcVlan)) return {steps,outcome,initialVlan:srcVlan,finalVlan:dstVlan};
    const pos = swPos(l3Switch);
    currentPdu = {isTagged:false,srcMac:SVI_MAC[dstVlan],dstMac:b.mac,vlanId:dstVlan,ttl:63};
    add(`${l3Switch}: SVI ${srcVlan} → SVI ${dstVlan}`,
      'L3 снимает старый Ethernet-заголовок, уменьшает TTL 64 → 63, маршрутизирует IP-пакет и создаёт новый кадр: MAC SVI целевого VLAN → MAC получателя.',
      'L3 IPv4 FIB lookup; L2 header rewrite',pos,pos,'l3_svi_route',{activeDeviceId:l3Switch},
      {...currentPdu,status:'routing'});
    currentVlan = dstVlan;
  }

  if (!crossTrunk(b.switchId,currentVlan)) return {steps,outcome,initialVlan:srcVlan,finalVlan:dstVlan};
  const destPos = swPos(b.switchId);
  const endPdu: Partial<TracePdu> = {
    isTagged:false,srcMac:finalSrcMac,dstMac:b.mac,vlanId:dstVlan,ttl:needsRouting?63:64,
  };
  add(`${b.switchId}: выход через ${b.port}`,
    'Перед access-портом кадр выходит без тега 802.1Q (или остаётся нетегированным при локальной коммутации).',
    'Access egress: untagged',destPos,{x:b.x,y:b.y},'access_egress',
    {activeDeviceId:b.switchId,activeLinkId:accessLink(b)},endPdu);
  add(`${b.name}: кадр принят`,outcome.explanation,outcome.ruleCitation || '',
    {x:b.x,y:b.y},{x:b.x,y:b.y},'rx_delivery',{activeDeviceId:b.id},
    {...endPdu,status:'delivered'});
  return {steps,outcome,initialVlan:srcVlan,finalVlan:dstVlan};
}

const MODES: { id: CaseId; label: string }[] = [
  { id: 'explore', label: 'Свободная' },
  { id: 'access', label: 'Дело 3 · Нет связи' },
  { id: 'trunk', label: 'Дело 4 · Нет связи' },
];

export const VlanSimulator: React.FC = () => {
  const [mode, setMode] = useState<CaseId>('explore');
  const [vlans, setVlans] = useState<Record<HostId, Vlan>>(INITIAL_VLANS);
  const [trunks, setTrunks] = useState<TrunkConfig>(INITIAL_TRUNKS);
  const [l3Role, setL3Role] = useState<L3Role>('none');
  const [source, setSource] = useState<HostId>('pc1');
  const [target, setTarget] = useState<HostId>('pc3');
  const [showSettings, setShowSettings] = useState(false);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);

  const active = trace?.steps[stepIndex];
  const caseSolved = (id: CaseId, configVlans: Record<HostId,Vlan>, configTrunks: TrunkConfig, role: L3Role): boolean => {
    if (id === 'access') return evaluateNetwork('pc1','pc2',configVlans,configTrunks,role).delivered;
    if (id === 'trunk') return configVlans.pc2 === 20 && configVlans.pc4 === 20 &&
      role === 'none' && configTrunks.left.includes(20) && configTrunks.right.includes(20);
    return false;
  };

  const reset = (next: CaseId = mode) => {
    setMode(next);
    setL3Role('none');
    setTrace(null);
    setStepIndex(0);
    setPlaying(false);
    setCompleted(false);
    if (next === 'access') {
      setVlans({ pc1: 10, pc2: 20, pc3: 10, pc4: 20 });
      setTrunks({ left: [10, 20], right: [10, 20] });
      setSource('pc1');
      setTarget('pc2');
    } else if (next === 'trunk') {
      setVlans({ pc1: 10, pc2: 20, pc3: 10, pc4: 20 });
      setTrunks({ left: [10, 20], right: [10] });
      setSource('pc2');
      setTarget('pc4');
    } else {
      setVlans({ ...INITIAL_VLANS });
      setTrunks({ left: [10, 20], right: [10, 20] });
      setSource('pc1');
      setTarget('pc3');
    }
    triggerHaptic('light');
    playClickSound();
  };

  const start = () => {
    const next = generateDetailedTrace(source, target, vlans, trunks, l3Role);
    setTrace(next);
    setStepIndex(0);
    setPlaying(true);
    setCompleted(false);
    triggerHaptic('medium');
  };

  useEffect(() => {
    if (!playing || !trace || stepIndex >= trace.steps.length - 1) return;
    const t = window.setTimeout(() => setStepIndex((s) => Math.min(trace.steps.length - 1, s + 1)), 1600);
    return () => window.clearTimeout(t);
  }, [playing, stepIndex, trace]);

  useEffect(() => {
    if (!trace || stepIndex !== trace.steps.length - 1) return;
    setPlaying(false);
    if (trace.outcome.delivered && mode !== 'explore' &&
        source === (mode === 'access' ? 'pc1' : 'pc2') &&
        target === (mode === 'access' ? 'pc2' : 'pc4') &&
        caseSolved(mode, vlans, trunks, l3Role)) {
      setCompleted(true);
      playSuccessSound();
    } else if (!trace.outcome.delivered) {
      playErrorSound();
    }
  }, [trace, stepIndex, mode, source, target, vlans, trunks, l3Role]);

  const changeVlan = (host: HostId, vlan: Vlan) => {
    setVlans((prev) => ({ ...prev, [host]: vlan }));
    setTrace(null);
    setPlaying(false);
    setCompleted(false);
    triggerHaptic('selection');
  };
  const toggleTrunk = (side: 'left' | 'right', vlan: Vlan) => {
    setTrunks((prev) => ({
      ...prev,
      [side]: prev[side].includes(vlan) ? prev[side].filter((v) => v !== vlan) : [...prev[side], vlan].sort(),
    }));
    setTrace(null);
    setPlaying(false);
    setCompleted(false);
    triggerHaptic('selection');
  };
  const pickHost = (id: HostId) => {
    if (id === source) return;
    if (id === target) {
      setSource(id);
      setTarget(source);
    } else setTarget(id);
    setTrace(null);
    setPlaying(false);
    setCompleted(false);
    triggerHaptic('selection');
  };

  const linkClass = (id: NonNullable<TraceStep['activeLinkId']>) =>
    active?.activeLinkId === id ? 'stroke-cyan-500 dark:stroke-cyan-300' : 'stroke-slate-300 dark:stroke-slate-600';

  return (
    <div className="space-y-3 max-w-6xl mx-auto pb-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-700 dark:text-cyan-300">Макет · VLAN</div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">VLAN & Trunk</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {HOSTS.find((h) => h.id === source)?.name} VLAN {vlans[source]} → {HOSTS.find((h) => h.id === target)?.name} VLAN {vlans[target]}
            {l3Role !== 'none' ? ` · L3 на ${l3Role}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => reset(m.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border ${
                mode === m.id
                  ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {mode !== 'explore' && (
        <div className="rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          {mode === 'access'
            ? 'Дело 3: PC-01 не может связаться с PC-02 на одном коммутаторе. Проверь конфигурацию и найди причину.'
            : 'Дело 4: PC-02 и PC-04 на разных коммутаторах не могут обменяться трафиком. Найди, где теряется кадр.'}
          {completed && <span className="ml-2 font-bold text-emerald-700 dark:text-emerald-300">Связь восстановлена.</span>}
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2">
          <svg viewBox="0 0 760 280" className="w-full h-auto" role="img" aria-label="Два коммутатора, четыре ПК, trunk 802.1Q">
            <rect x="6" y="8" width="360" height="264" rx="14" className="fill-cyan-50 dark:fill-cyan-950/20 stroke-cyan-300 dark:stroke-cyan-800" strokeDasharray="5 4" />
            <rect x="394" y="8" width="360" height="264" rx="14" className="fill-indigo-50 dark:fill-indigo-950/20 stroke-indigo-300 dark:stroke-indigo-800" strokeDasharray="5 4" />
            <text x="16" y="26" className="fill-cyan-800 dark:fill-cyan-300" fontSize="11">SW1 · access</text>
            <text x="404" y="26" className="fill-indigo-800 dark:fill-indigo-300" fontSize="11">SW2 · access</text>

            <path d="M78 92 L250 150" className={linkClass('pc1-sw1')} fill="none" strokeWidth="2.5" />
            <path d="M78 208 L250 150" className={linkClass('pc2-sw1')} fill="none" strokeWidth="2.5" />
            <path d="M510 150 L682 92" className={linkClass('sw2-pc3')} fill="none" strokeWidth="2.5" />
            <path d="M510 150 L682 208" className={linkClass('sw2-pc4')} fill="none" strokeWidth="2.5" />
            <path
              d="M310 150 L450 150"
              className={active?.activeLinkId === 'sw1-sw2-trunk' ? 'stroke-amber-500' : 'stroke-amber-400/70'}
              fill="none"
              strokeWidth="4"
            />
            <text x="380" y="140" textAnchor="middle" className="fill-amber-700 dark:fill-amber-300" fontSize="10" fontWeight="700">
              802.1Q
            </text>
            <text x="380" y="168" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400" fontSize="9">
              L {trunks.left.join(',') || '—'} · R {trunks.right.join(',') || '—'}
            </text>

            {HOSTS.map((host) => {
              const vlan = vlans[host.id];
              const isSrc = host.id === source;
              const isDst = host.id === target;
              return (
                <g key={host.id} transform={`translate(${host.x} ${host.y})`} onClick={() => pickHost(host.id)} style={{ cursor: 'pointer' }}>
                  <rect x="-22" y="-16" width="44" height="30" rx="4" className={isSrc || isDst ? 'fill-cyan-100 dark:fill-cyan-900 stroke-cyan-500' : 'fill-white dark:fill-slate-900 stroke-slate-400 dark:stroke-slate-600'} strokeWidth="1.5" />
                  <text y="34" textAnchor="middle" className="fill-slate-900 dark:fill-slate-100" fontSize="11" fontWeight="700">{host.name}</text>
                  <text y="47" textAnchor="middle" className={vlan === 10 ? 'fill-cyan-700 dark:fill-cyan-300' : 'fill-violet-700 dark:fill-violet-300'} fontSize="10">VLAN {vlan}</text>
                  {isSrc && <text y="-24" textAnchor="middle" className="fill-cyan-700 dark:fill-cyan-300" fontSize="9">TX</text>}
                  {isDst && <text y="-24" textAnchor="middle" className="fill-violet-700 dark:fill-violet-300" fontSize="9">RX</text>}
                </g>
              );
            })}

            {(['SW1', 'SW2'] as const).map((id) => {
              const pos = id === 'SW1' ? SW1 : SW2;
              const isL3 = l3Role === id;
              const activeSw = active?.activeDeviceId === id;
              return (
                <g key={id} transform={`translate(${pos.x} ${pos.y})`}>
                  <rect x="-36" y="-18" width="72" height="36" rx="6" className={activeSw ? 'fill-cyan-100 dark:fill-cyan-900 stroke-cyan-500' : 'fill-white dark:fill-slate-900 stroke-slate-400 dark:stroke-slate-600'} strokeWidth="1.5" />
                  <text y="4" textAnchor="middle" className="fill-slate-900 dark:fill-slate-100" fontSize="12" fontWeight="700">{id}</text>
                  {isL3 && <text y="28" textAnchor="middle" className="fill-cyan-700 dark:fill-cyan-300" fontSize="9">SVI .10.1 / .20.1</text>}
                </g>
              );
            })}

            {active && (
              <motion.g key={stepIndex} initial={{ x: active.from.x, y: active.from.y }} animate={{ x: active.to.x, y: active.to.y }} transition={{ duration: 0.7, ease: 'easeInOut' }}>
                <rect x="-28" y="-11" width="56" height="22" rx={active.pdu.isTagged ? 4 : 11} className={active.dropped ? 'fill-rose-500' : active.pdu.isTagged ? 'fill-amber-400' : 'fill-cyan-400'} />
                <text y="4" textAnchor="middle" className="fill-slate-950" fontSize="9" fontWeight="800">
                  {active.dropped && active.pdu.ethType === '0x0806' ? 'TIMEOUT' : active.dropped ? 'DROP' : active.pdu.ethType === '0x0806' ? 'ARP' : active.actionType === 'l3_svi_route' ? 'SVI' : active.pdu.isTagged ? `VID ${active.pdu.vlanId}` : 'untag'}
                </text>
              </motion.g>
            )}
          </svg>
          <div className="flex flex-wrap gap-2 px-2 pb-1 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="text-cyan-700 dark:text-cyan-300">VLAN 10</span>
            <span className="text-violet-700 dark:text-violet-300">VLAN 20</span>
            <span className="text-amber-700 dark:text-amber-300">тег 802.1Q</span>
            <span>нажми ПК, чтобы сменить получателя</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-2 lg:sticky lg:top-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{trace ? `Шаг ${stepIndex + 1} / ${trace.steps.length}` : 'Ожидание'}</span>
            <span className="font-mono">{active?.pdu.ethType === '0x0806' ? 'ARP · Broadcast' : active?.pdu.isTagged ? `802.1Q · VID ${active.pdu.vlanId}` : 'Untagged'}</span>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">{active?.title || 'Запусти передачу'}</div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{active?.detail || 'Выбери отправителя и получателя, затем смотри путь кадра.'}</p>
          {active && (
            <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-2">MAC {active.pdu.srcMac.slice(-8)} → {active.pdu.dstMac.slice(-8)}</div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-2">{active.pdu.ethType === '0x0806' ? `ARP who-has ${active.pdu.vlanId}.1?` : `IP ${active.pdu.srcIp.split('.').slice(2).join('.')} → ${active.pdu.dstIp.split('.').slice(2).join('.')}`}</div>
              <div className={`rounded-lg p-2 ${active.pdu.isTagged ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200' : 'bg-slate-50 dark:bg-slate-900'}`}>
                {active.pdu.isTagged ? `тег VID ${active.pdu.vlanId}` : 'без тега'}
              </div>
              <div className={`rounded-lg p-2 ${active.pdu.ttl === 63 ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200' : 'bg-slate-50 dark:bg-slate-900'}`}>
                {active.pdu.ethType === '0x0806' ? 'ARP · без TTL' : `TTL ${active.pdu.ttl}`}
              </div>
            </div>
          )}
          {active && (
            <details className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
                <span>Подробнее о кадре · Ethernet II / 802.1Q</span>
                <span className="shrink-0 text-cyan-700 dark:text-cyan-300 group-open:hidden">Показать</span>
                <span className="hidden shrink-0 text-cyan-700 dark:text-cyan-300 group-open:inline">Скрыть</span>
              </summary>
              <div className="border-t border-slate-200 dark:border-slate-800 px-3 pb-3 pt-2 space-y-2 text-[11px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Преамбула + SFD · 8 байт на линии</div>
                    <div className="font-mono text-slate-800 dark:text-slate-200">7 B preamble + 1 B SFD</div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Destination MAC · 6 байт</div>
                    <div className="font-mono break-all text-slate-800 dark:text-slate-200">{active.pdu.dstMac}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Source MAC · 6 байт</div>
                    <div className="font-mono break-all text-slate-800 dark:text-slate-200">{active.pdu.srcMac}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">Тег 802.1Q · 4 байта при наличии</div>
                    <div className={`font-mono ${active.pdu.isTagged ? 'text-amber-700 dark:text-amber-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {active.pdu.isTagged ? `TPID 0x8100 · PCP 0 · DEI 0 · VID ${active.pdu.vlanId}` : 'Отсутствует · untagged'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">EtherType · 2 байта</div>
                    <div className="font-mono text-slate-800 dark:text-slate-200">{active.pdu.ethType} · {active.pdu.ethType === '0x0806' ? 'ARP' : 'IPv4'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">{active.pdu.ethType === '0x0806' ? 'ARP · запрос MAC шлюза' : 'IPv4 · Src / Dst · TTL'}</div>
                    <div className="font-mono break-all text-slate-800 dark:text-slate-200">
                      {active.pdu.ethType === '0x0806' ? `Who has 192.168.${active.pdu.vlanId}.1? · нет IP-заголовка` : `${active.pdu.srcIp} → ${active.pdu.dstIp} · TTL ${active.pdu.ttl}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400">FCS · 4 байта</div>
                    <div className="font-mono text-slate-800 dark:text-slate-200">CRC-32 · значение не вычисляется</div>
                  </div>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
                  Это учебная структура кадра, не дамп Wireshark. Размер зависит от полезной нагрузки; преамбула и SFD в длину Ethernet-кадра не входят. FCS показан как поле, без имитации проверки CRC.
                </p>
              </div>
            </details>
          )}
          {active && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Учебная модель: IP ПК автоматически меняется вместе с VLAN (в реальности нужен DHCP renew или настройка статического IP). Для IPv4 считаем ARP и обучение MAC выполненными; при отсутствии шлюза показываем неудачный ARP вместо выдуманного IP-кадра. Native VLAN здесь не рассматривается.
            </p>
          )}
          {active?.rule && <p className="text-[11px] text-slate-500 dark:text-slate-400">{active.rule}</p>}
          <div className="flex gap-1.5">
            {!playing ? (
              <button type="button" onClick={start} className="flex-1 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold py-2 cursor-pointer">
                <Play className="w-4 h-4 inline" /> Запустить
              </button>
            ) : (
              <button type="button" onClick={() => setPlaying(false)} className="flex-1 rounded-xl bg-amber-400 text-slate-950 text-sm font-semibold py-2 cursor-pointer">
                <Pause className="w-4 h-4 inline" /> Пауза
              </button>
            )}
            <button type="button" onClick={() => { setPlaying(false); setStepIndex((s) => Math.max(0, s - 1)); }} className="px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => { setPlaying(false); setStepIndex((s) => Math.min((trace?.steps.length || 1) - 1, s + 1)); }} className="px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => reset()} className="px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer" title="Сброс">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <button type="button" onClick={() => setShowSettings((v) => !v)} className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 cursor-pointer">
          <span className="flex items-center gap-2"><Settings2 className="w-4 h-4" /> Настройки стенда</span>
          <span className="text-xs text-slate-500">{showSettings ? 'скрыть' : 'показать'}</span>
        </button>
        {showSettings && (
          <div className="px-3 pb-3 space-y-3 text-xs">
            <div>
              <div className="mb-1 text-slate-500">Роль L3 / SVI</div>
              <div className="flex gap-1">
                {(['none', 'SW1', 'SW2'] as L3Role[]).map((role) => (
                  <button key={role} type="button" onClick={() => { setL3Role(role); setTrace(null); setPlaying(false); setCompleted(false); }} className={`px-2 py-1 rounded-lg border cursor-pointer ${l3Role === role ? 'bg-cyan-500 text-slate-950 border-cyan-500' : 'border-slate-200 dark:border-slate-700'}`}>
                    {role === 'none' ? 'только L2' : role}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {HOSTS.map((host) => (
                <div key={host.id} className="flex items-center justify-between gap-2">
                  <span>{host.name} · {host.port}</span>
                  <div className="flex gap-1">
                    {([10, 20] as Vlan[]).map((vlan) => (
                      <button key={vlan} type="button" onClick={() => changeVlan(host.id, vlan)} className={`px-2 py-1 rounded-lg border cursor-pointer ${vlans[host.id] === vlan ? (vlan === 10 ? 'bg-cyan-500 text-slate-950 border-cyan-500' : 'bg-violet-500 text-white border-violet-500') : 'border-slate-200 dark:border-slate-700'}`}>
                        {vlan}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {(['left', 'right'] as const).map((side) => (
                <div key={side}>
                  <div className="mb-1 text-slate-500">Trunk {side === 'left' ? 'SW1 Gi0/1' : 'SW2 Gi0/1'}</div>
                  <div className="flex gap-1">
                    {([10, 20] as Vlan[]).map((vlan) => (
                      <button key={vlan} type="button" onClick={() => toggleTrunk(side, vlan)} className={`px-2 py-1 rounded-lg border cursor-pointer ${trunks[side].includes(vlan) ? 'bg-amber-400 text-slate-950 border-amber-400' : 'border-slate-200 dark:border-slate-700'}`}>
                        VLAN {vlan}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
