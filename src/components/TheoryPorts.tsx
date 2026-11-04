import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { WELL_KNOWN_PORTS, PORT_RANGES } from '../data/wellKnownPorts';

export const TheoryPorts: React.FC = () => {
  const [portFilter, setPortFilter] = useState('');
  const filteredPorts = useMemo(() => {
    const q = portFilter.trim().toLowerCase();
    if (!q) return WELL_KNOWN_PORTS;
    return WELL_KNOWN_PORTS.filter(
      (p) =>
        p.port.includes(q) ||
        p.service.toLowerCase().includes(q) ||
        p.proto.toLowerCase().includes(q) ||
        (p.note || '').toLowerCase().includes(q)
    );
  }, [portFilter]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PORT_RANGES.map((r) => (
          <div
            key={r.title}
            className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 space-y-1"
          >
            <div className="text-xs font-bold text-cyan-700 dark:text-cyan-300 font-mono">{r.title}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{r.text}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={portFilter}
          onChange={(e) => setPortFilter(e.target.value)}
          placeholder="Фильтр: 443, DNS, TCP…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-950/40">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 text-left text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                <th className="px-3 py-2.5 font-semibold">Порт</th>
                <th className="px-3 py-2.5 font-semibold">Протокол</th>
                <th className="px-3 py-2.5 font-semibold">Служба</th>
                <th className="px-3 py-2.5 font-semibold hidden sm:table-cell">Заметка</th>
              </tr>
            </thead>
            <tbody>
              {filteredPorts.map((p) => (
                <tr
                  key={`${p.port}-${p.service}`}
                  className="border-t border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <td className="px-3 py-2 font-mono font-bold text-cyan-700 dark:text-cyan-300 whitespace-nowrap">
                    {p.port}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{p.proto}</td>
                  <td className="px-3 py-2 font-medium">{p.service}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                    {p.note || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPorts.length === 0 && (
          <p className="p-4 text-sm text-slate-500">Ничего не найдено по фильтру.</p>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Учебный набор частых портов для экзамена и эксплуатации, не полный реестр IANA.
      </p>
    </div>
  );
};
