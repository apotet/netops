import React, { useState } from 'react';
import { Activity, Layers, Cpu, Terminal, FlaskConical } from 'lucide-react';
import { PacketJourney } from './PacketJourney';
import { VlanSimulator } from './VlanSimulator';
import { ProtocolSimulators } from './ProtocolSimulators';
import { CliLabShell } from '../cli-lab/CliLabShell';

export type PracticeSimulator = 'journey' | 'vlan' | 'protocols' | 'cli';

interface PracticeItem {
  id: PracticeSimulator;
  title: string;
  badge: string;
  subtitle: string;
  icon: React.ReactNode;
}

const PRACTICE_ITEMS: PracticeItem[] = [
  {
    id: 'journey',
    title: 'Путь пакета',
    badge: 'ARP / ICMP',
    subtitle: 'Пошаговый ping от ПК через коммутатор и маршрутизатор к серверу',
    icon: <Activity className="w-4 h-4 text-cyan-400" />,
  },
  {
    id: 'vlan',
    title: 'VLAN & Trunk',
    badge: '802.1Q',
    subtitle: 'Интерактивный коммутатор, изоляция портов и транкинг',
    icon: <Layers className="w-4 h-4 text-purple-400" />,
  },
  {
    id: 'protocols',
    title: 'DHCP / NAT / TCP',
    badge: 'DORA & Handshake',
    subtitle: 'Пошаговые симуляторы сетевых протоколов и трансляции адресов',
    icon: <Cpu className="w-4 h-4 text-emerald-400" />,
  },
  {
    id: 'cli',
    title: 'CLI Lab 2.0',
    badge: 'Cisco IOS',
    subtitle: 'Лаборатория с проверкой состояния: VLAN, access-порт, режимы IOS',
    icon: <Terminal className="w-4 h-4 text-amber-400" />,
  },
];

function cardClass(isActive: boolean): string {
  if (isActive) {
    return 'p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-3 bg-gradient-to-b from-cyan-50 to-white dark:from-cyan-950/80 dark:to-slate-900 border-cyan-500 dark:border-cyan-400 shadow-lg shadow-cyan-500/10 dark:shadow-cyan-500/20 ring-1 ring-cyan-400/50';
  }
  return 'p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-slate-700 hover:bg-cyan-50 dark:hover:bg-slate-800/60';
}

function iconWrapClass(isActive: boolean): string {
  return isActive
    ? 'p-2 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300'
    : 'p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400';
}

export const PracticeHub: React.FC<{ initialSimulator?: PracticeSimulator }> = ({ initialSimulator }) => {
  const [activeSimulator, setActiveSimulator] = useState<PracticeSimulator>(() =>
    initialSimulator ?? (typeof window !== 'undefined' && window.innerWidth < 640 ? 'journey' : 'cli')
  );

  return (
    <div className="space-y-6">
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#091524] border border-slate-200 dark:border-cyan-500/20 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-400/30 text-cyan-700 dark:text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider mb-2">
              <FlaskConical className="w-3.5 h-3.5" />
              Интерактивная лаборатория
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Сетевая практика и симуляторы
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Стенды для отработки сетевых процессов и CLI Lab 2.0 с проверкой конфигурации по состоянию устройства.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRACTICE_ITEMS.map((item) => {
            const isActive = activeSimulator === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSimulator(item.id)}
                type="button"
                className={cardClass(isActive)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={iconWrapClass(isActive)}>{item.icon}</div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{item.title}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-slate-700">
                    {item.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2">{item.subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="animate-fade-in">
        {activeSimulator === 'journey' && <PacketJourney />}
        {activeSimulator === 'vlan' && <VlanSimulator />}
        {activeSimulator === 'protocols' && <ProtocolSimulators />}
        {activeSimulator === 'cli' && <CliLabShell />}
      </div>
    </div>
  );
};
