import React, { useState } from 'react';

type NodeKey = 'pc' | 'switch' | 'router' | 'server';
type DetectiveTopologyProps = {
  faultId: 'mask' | 'gateway';
  fixed: boolean;
};

const NODES: { id: NodeKey; title: string; subtitle: string; x: number; y: number }[] = [
  { id: 'pc', title: 'PC-01', subtitle: '192.168.1.10', x: 12, y: 38 },
  { id: 'switch', title: 'SW-01', subtitle: 'L2', x: 181, y: 38 },
  { id: 'router', title: 'R1', subtitle: 'L3', x: 350, y: 38 },
  { id: 'server', title: 'SRV-01', subtitle: '192.168.2.20', x: 519, y: 38 },
];

const NODE_DETAILS: Record<NodeKey, { heading: string; rows: string[] }> = {
  pc: {
    heading: 'PC-01 · рабочая станция',
    rows: ['IPv4: 192.168.1.10', 'Интерфейс: Ethernet0', 'ARP и маршруты зависят от выбранного случая'],
  },
  switch: {
    heading: 'SW-01 · коммутатор L2',
    rows: ['Сеть доступа: 192.168.1.0/24', 'Соединяет ПК с LAN-интерфейсом R1', 'Маршрутизацию между подсетями не выполняет'],
  },
  router: {
    heading: 'R1 · маршрутизатор',
    rows: ['LAN 1: 192.168.1.1/24', 'LAN 2: 192.168.2.1/24', 'Две непосредственно подключённые сети'],
  },
  server: {
    heading: 'SRV-01 · сервер',
    rows: ['IPv4: 192.168.2.20/24', 'Сеть: 192.168.2.0/24', 'Шлюз: 192.168.2.1'],
  },
};

/** A neutral topology: the faulty setting is deliberately not highlighted before diagnosis. */
export const DetectiveTopology: React.FC<DetectiveTopologyProps> = ({ faultId, fixed }) => {
  const [selected, setSelected] = useState<NodeKey | null>(null);
  const selectedDetails = selected ? NODE_DETAILS[selected] : null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/70 p-3 sm:p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Топология расследования</p>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">Нажми на устройство для осмотра</span>
      </div>
      <div className="overflow-x-auto">
        <div className="relative min-w-[560px] max-w-[720px] mx-auto">
          <svg viewBox="0 0 640 125" className="w-full h-auto" role="img" aria-label="Схема сети: PC-01 через SW-01 и R1 связан с SRV-01. Две IPv4-подсети.">
            <rect x="5" y="7" width="320" height="113" rx="12" className="fill-cyan-50 dark:fill-cyan-950/30 stroke-cyan-300 dark:stroke-cyan-600/60" strokeDasharray="5 4" />
            <rect x="335" y="7" width="300" height="113" rx="12" className="fill-indigo-50 dark:fill-blue-950/30 stroke-indigo-300 dark:stroke-blue-500/60" strokeDasharray="5 4" />
            <text x="162" y="24" textAnchor="middle" className="fill-cyan-800 dark:fill-cyan-200" fontSize="12">LAN 1 · 192.168.1.0/24</text>
            <text x="486" y="24" textAnchor="middle" className="fill-indigo-800 dark:fill-blue-200" fontSize="12">LAN 2 · 192.168.2.0/24</text>
            <path d="M130 64 H181 M299 64 H350 M468 64 H519" fill="none"
              className={fixed ? 'stroke-emerald-600 dark:stroke-emerald-400' : 'stroke-slate-400 dark:stroke-slate-500'}
              strokeWidth="3" strokeLinecap="round" />
            <text x="324" y="108" className="fill-slate-600 dark:fill-slate-300" textAnchor="middle" fontSize="10">R1: .1.1 / .2.1</text>
            {NODES.map((node) => (
              <g key={node.id}>
                <rect x={node.x} y={node.y} width="118" height="52" rx="9"
                  className={selected === node.id
                    ? 'fill-cyan-100 dark:fill-cyan-900 stroke-cyan-600 dark:stroke-cyan-300'
                    : 'fill-white dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500'}
                  strokeWidth={selected === node.id ? 2.5 : 1.5} />
                <text x={node.x + 59} y={node.y + 21} className="fill-slate-900 dark:fill-white" fontSize="13" textAnchor="middle" fontWeight="bold">{node.title}</text>
                <text x={node.x + 59} y={node.y + 38} className="fill-slate-600 dark:fill-slate-300" fontSize="10" textAnchor="middle">{node.subtitle}</text>
              </g>
            ))}
          </svg>
          <div className="absolute inset-0" aria-label="Выбор устройства">
            {NODES.map((node) => (
              <button
                key={node.id}
                type="button"
                aria-label={`Осмотреть ${node.title}`}
                aria-pressed={selected === node.id}
                onClick={() => setSelected(selected === node.id ? null : node.id)}
                className="absolute rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                style={{ left: `${node.x / 640 * 100}%`, top: `${node.y / 125 * 100}%`, width: `${118 / 640 * 100}%`, height: `${52 / 125 * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>
      {selectedDetails ? (
        <div className="rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200" role="status">
          <strong className="text-slate-900 dark:text-white">{selectedDetails.heading}</strong>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            {selectedDetails.rows.map((row) => <li key={row}>{row}</li>)}
          </ul>
          {selected === 'pc' && (
            <p className="mt-2 text-cyan-700 dark:text-cyan-300">
              {faultId === 'mask' ? 'Данные из захвата: ARP-запрос к 192.168.2.20.' : 'Данные из таблицы маршрутов: default route отсутствует.'}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">Линии обозначают физические соединения, а не подтверждённую доступность. Состояние сети выясни по симптомам.</p>
      )}
      {fixed && <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300" role="status">Настройка ПК исправлена в учебной модели. Повторная проверка проходит через R1.</p>}
    </div>
  );
};
