import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Info,
  Server,
  Laptop,
  ArrowRight,
} from 'lucide-react';

interface JourneyStep {
  title: string;
  location: string;
  stageName: string;
  description: string;
  activeDevice: 'pc' | 'switch' | 'router' | 'server';
  frame: {
    srcMac: string;
    dstMac: string;
    etherType: string;
    srcIp: string;
    dstIp: string;
    ttl: number;
    payload: string;
  };
  note: string;
}

const JOURNEY_STEPS: JourneyStep[] = [
  {
    title: 'Шаг 1: Формирование ICMP Echo Request на ПК',
    location: 'ПК (192.168.1.10)',
    stageName: 'L3 / L2 Проверка маршрута и ARP',
    description:
      'Пользователь вводит `ping 192.168.2.20`. ПК сверяет адрес назначения со своей маской /24. 192.168.2.20 находится в другой подсети! Значит пакет должен быть направлен на шлюз по умолчанию (192.168.1.1).',
    activeDevice: 'pc',
    frame: {
      srcMac: '00:11:22:AA:BB:10',
      dstMac: '00:11:22:GW:01:01 (MAC шлюза)',
      etherType: '0x0800 (IPv4)',
      srcIp: '192.168.1.10',
      dstIp: '192.168.2.20',
      ttl: 64,
      payload: 'ICMP Echo Request (type 8, code 0)',
    },
    note: 'Обратите внимание: IP получателя — это сервер (192.168.2.20), но MAC получателя — это шлюз по умолчанию (маршрутизатор), а не сервер!',
  },
  {
    title: 'Шаг 2: Коммутация кадра на Switch L2',
    location: 'Коммутатор LAN (L2)',
    stageName: 'L2 Коммутация по MAC-таблице',
    description:
      'Кадр поступает на порт Fa0/1 коммутатора. Коммутатор запоминает source MAC (00:11:22:AA:BB:10 -> порт Fa0/1) в таблице CAM. Затем смотрит destination MAC (шлюз) и пересылает кадр в порт Gi0/1 к маршрутизатору.',
    activeDevice: 'switch',
    frame: {
      srcMac: '00:11:22:AA:BB:10',
      dstMac: '00:11:22:GW:01:01',
      etherType: '0x0800 (IPv4)',
      srcIp: '192.168.1.10',
      dstIp: '192.168.2.20',
      ttl: 64,
      payload: 'ICMP Echo Request',
    },
    note: 'Коммутатор L2 не меняет IP и MAC заголовки! Он лишь передаёт неизменный кадр на соответствующий порт.',
  },
  {
    title: 'Шаг 3: Маршрутизация на Router L3',
    location: 'Маршрутизатор (R1)',
    stageName: 'L3 Маршрутизация & Декремент TTL',
    description:
      'Маршрутизатор принимает кадр на eth0, снимает заголовок Ethernet L2. В заголовке IPv4 он уменьшает TTL на 1 (64 -> 63) и пересчитывает контрольную сумму IPv4 Checksum. Смотрит таблицу маршрутизации: 192.168.2.0/24 доступна через интерфейс eth1.',
    activeDevice: 'router',
    frame: {
      srcMac: '00:11:22:GW:02:01 (eth1 маршрутизатора)',
      dstMac: '00:11:22:SR:20:20 (MAC сервера)',
      etherType: '0x0800 (IPv4)',
      srcIp: '192.168.1.10',
      dstIp: '192.168.2.20',
      ttl: 63,
      payload: 'ICMP Echo Request',
    },
    note: 'Ключевой закон сетей: при прохождении через каждый L3-маршрутизатор IP-адреса остаются прежними, а L2 MAC-адреса полностью перезаписываются!',
  },
  {
    title: 'Шаг 4: Приём пакета сервером и ответ',
    location: 'Сервер (192.168.2.20)',
    stageName: 'L3/L4 Приём ICMP Echo Request',
    description:
      'Сервер сверяет destination MAC и destination IP — совпадает! ОС сервера принимает ICMP Echo Request (type 8) и формирует ответ ICMP Echo Reply (type 0). IP-адреса источника и получателя меняются местами.',
    activeDevice: 'server',
    frame: {
      srcMac: '00:11:22:SR:20:20',
      dstMac: '00:11:22:GW:02:01',
      etherType: '0x0800 (IPv4)',
      srcIp: '192.168.2.20',
      dstIp: '192.168.1.10',
      ttl: 64,
      payload: 'ICMP Echo Reply (type 0, code 0)',
    },
    note: 'Сервер отправляет ответ обратно на шлюз 192.168.2.1 со своим начальным TTL (обычно 64 в Linux или 128 в Windows).',
  },
  {
    title: 'Шаг 5: Обратная маршрутизация и доставка на ПК',
    location: 'ПК (192.168.1.10)',
    stageName: 'Успешный Ping (Echo Reply)',
    description:
      'Маршрутизатор R1 снова уменьшает TTL (64 -> 63), перезаписывает MAC на (Src: 00:11:22:GW:01:01, Dst: 00:11:22:AA:BB:10) и доставляет ответ через коммутатор на ПК. В терминале отображается: "64 bytes from 192.168.2.20: icmp_seq=1 ttl=63 time=2.14 ms".',
    activeDevice: 'pc',
    frame: {
      srcMac: '00:11:22:GW:01:01',
      dstMac: '00:11:22:AA:BB:10',
      etherType: '0x0800 (IPv4)',
      srcIp: '192.168.2.20',
      dstIp: '192.168.1.10',
      ttl: 63,
      payload: 'ICMP Echo Reply [OK]',
    },
    note: 'Круг замкнулся! Весь путь занял несколько миллисекунд.',
  },
];

export const PacketJourney: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const step = JOURNEY_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < JOURNEY_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
              Интерактивная симуляция
            </span>
            <h2 className="text-2xl font-black tracking-tight text-white mt-1">
              Путь сетевого пакета: от ПК до Сервера
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Пошаговая визуализация работы протоколов L2/L3: ARP, Ethernet, MAC-таблица, IP-маршрутизация и TTL
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              type="button"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="Назад"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-mono text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300 font-bold">
              {currentStep + 1} / {JOURNEY_STEPS.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentStep === JOURNEY_STEPS.length - 1}
              type="button"
              className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold transition-all min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="Далее"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleReset}
              type="button"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              title="Сброс"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step progress pills */}
        <div className="grid grid-cols-5 gap-2 mt-6">
          {JOURNEY_STEPS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              type="button"
              className={`py-2 px-2 text-center rounded-lg text-[11px] font-semibold transition-all border ${
                idx === currentStep
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/30'
                  : idx < currentStep
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              Шаг {idx + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Network Topology Visualizer */}
      <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20 shadow-xl overflow-hidden">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400" />
          Топология сети и текущее положение пакета
        </h3>

        <div className="relative py-8 px-4 rounded-xl bg-[#07111f] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Node 1: PC */}
          <div
            className={`flex flex-col items-center p-4 rounded-xl border transition-all ${
              step.activeDevice === 'pc'
                ? 'bg-cyan-950/60 border-cyan-400 shadow-lg shadow-cyan-500/30 scale-105'
                : 'bg-slate-900/60 border-slate-800 opacity-60'
            }`}
          >
            <div className="p-3 rounded-full bg-cyan-500/20 text-cyan-300 mb-2">
              <Laptop className="w-7 h-7" />
            </div>
            <span className="font-bold text-xs text-white">ПК Клиент</span>
            <span className="text-[10px] font-mono text-cyan-400">192.168.1.10/24</span>
            <span className="text-[9px] font-mono text-slate-400">MAC: 00:11:22:AA:BB:10</span>
          </div>

          <div className="text-slate-600 font-mono text-xs flex flex-col items-center">
            <span>LAN 1</span>
            <ArrowRight className="w-5 h-5 text-cyan-500/50 hidden md:block" />
          </div>

          {/* Node 2: Switch */}
          <div
            className={`flex flex-col items-center p-4 rounded-xl border transition-all ${
              step.activeDevice === 'switch'
                ? 'bg-blue-950/60 border-blue-400 shadow-lg shadow-blue-500/30 scale-105'
                : 'bg-slate-900/60 border-slate-800 opacity-60'
            }`}
          >
            <div className="p-3 rounded-full bg-blue-500/20 text-blue-300 mb-2">
              <div className="w-7 h-7 flex items-center justify-center font-bold text-xs">L2 SW</div>
            </div>
            <span className="font-bold text-xs text-white">Коммутатор</span>
            <span className="text-[10px] font-mono text-blue-400">VLAN 1 Default</span>
            <span className="text-[9px] font-mono text-slate-400">Таблица CAM</span>
          </div>

          <div className="text-slate-600 font-mono text-xs flex flex-col items-center">
            <span>Trunk / Link</span>
            <ArrowRight className="w-5 h-5 text-cyan-500/50 hidden md:block" />
          </div>

          {/* Node 3: Router */}
          <div
            className={`flex flex-col items-center p-4 rounded-xl border transition-all ${
              step.activeDevice === 'router'
                ? 'bg-purple-950/60 border-purple-400 shadow-lg shadow-purple-500/30 scale-105'
                : 'bg-slate-900/60 border-slate-800 opacity-60'
            }`}
          >
            <div className="p-3 rounded-full bg-purple-500/20 text-purple-300 mb-2">
              <div className="w-7 h-7 flex items-center justify-center font-bold text-xs">L3 RT</div>
            </div>
            <span className="font-bold text-xs text-white">Маршрутизатор R1</span>
            <span className="text-[10px] font-mono text-purple-400">192.168.1.1 ↔ 192.168.2.1</span>
            <span className="text-[9px] font-mono text-slate-400">Шлюз Default Gateway</span>
          </div>

          <div className="text-slate-600 font-mono text-xs flex flex-col items-center">
            <span>LAN 2</span>
            <ArrowRight className="w-5 h-5 text-cyan-500/50 hidden md:block" />
          </div>

          {/* Node 4: Server */}
          <div
            className={`flex flex-col items-center p-4 rounded-xl border transition-all ${
              step.activeDevice === 'server'
                ? 'bg-emerald-950/60 border-emerald-400 shadow-lg shadow-emerald-500/30 scale-105'
                : 'bg-slate-900/60 border-slate-800 opacity-60'
            }`}
          >
            <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-300 mb-2">
              <Server className="w-7 h-7" />
            </div>
            <span className="font-bold text-xs text-white">Сервер</span>
            <span className="text-[10px] font-mono text-emerald-400">192.168.2.20/24</span>
            <span className="text-[9px] font-mono text-slate-400">MAC: 00:11:22:SR:20:20</span>
          </div>
        </div>
      </div>

      {/* Frame / Packet Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step description */}
        <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-bold font-mono">
              {step.stageName}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Локация: <span className="text-slate-200 font-bold">{step.location}</span>
            </span>
          </div>

          <h3 className="text-lg font-bold text-white">{step.title}</h3>
          <p className="text-sm text-slate-300 leading-relaxed">{step.description}</p>

          <div className="p-4 rounded-xl bg-amber-950/30 border-l-4 border-amber-400 text-xs text-amber-200/90 leading-relaxed">
            <strong className="block text-amber-300 font-bold mb-1">Важно для экзамена:</strong>
            {step.note}
          </div>

          <div className="pt-2 flex gap-3">
            <button
              onClick={handleNext}
              disabled={currentStep === JOURNEY_STEPS.length - 1}
              type="button"
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2 min-h-[48px] cursor-pointer shadow-lg shadow-cyan-500/20"
            >
              Следующий шаг
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Packet Headers Inspector */}
        <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20 shadow-xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
            <span>Анализатор заголовков кадра (Wireshark View)</span>
            <span className="font-mono text-[10px] text-slate-400">Captured in transit</span>
          </h3>

          <div className="space-y-2 text-xs font-mono">
            {/* L2 Layer */}
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 space-y-1">
              <div className="text-[10px] font-bold text-blue-300 uppercase tracking-wide">
                L2: Ethernet II Frame
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500">Src MAC:</span> {step.frame.srcMac}
                </div>
                <div>
                  <span className="text-slate-500">Dst MAC:</span> {step.frame.dstMac}
                </div>
              </div>
              <div className="text-slate-400 text-[11px]">
                <span className="text-slate-500">EtherType:</span> {step.frame.etherType}
              </div>
            </div>

            {/* L3 Layer */}
            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-1">
              <div className="text-[10px] font-bold text-purple-300 uppercase tracking-wide">
                L3: Internet Protocol Version 4 (IPv4)
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>
                  <span className="text-slate-500">Src IP:</span> {step.frame.srcIp}
                </div>
                <div>
                  <span className="text-slate-500">Dst IP:</span> {step.frame.dstIp}
                </div>
              </div>
              <div className="flex gap-4 text-slate-400 text-[11px]">
                <div>
                  <span className="text-slate-500">TTL:</span>{' '}
                  <span className="font-bold text-purple-300">{step.frame.ttl}</span>
                </div>
                <div>
                  <span className="text-slate-500">Protocol:</span> 1 (ICMP)
                </div>
              </div>
            </div>

            {/* L4 Payload */}
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
              <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-wide">
                L4/L7 Payload: ICMP
              </div>
              <div className="text-slate-200">{step.frame.payload}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
