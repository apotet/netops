import React, { useId, useState } from 'react';
import type { NetworkState } from '../engine/types';
import { runHostPing, type HostPingResult } from '../hostPing';

/** Selected-PC diagnostic only: no Cisco console switch, goal check or network mutation. */
export function HostPingPanel({ state, hostId }: { state: NetworkState; hostId: string }) {
  const [command, setCommand] = useState('');
  const [last, setLast] = useState<{ command: string; result: HostPingResult } | null>(null);
  const inputId = useId();
  const host = state.devices[hostId];
  if (!host || host.vendor !== 'linux-host') return null;
  return (
    <section aria-label={`Учебный ping ${host.hostname}`} className="min-w-0 space-y-2 rounded-lg border border-cyan-500/30 p-2">
      <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
        Ping из {host.hostname}
      </label>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">Между ПК модели, без настоящего ICMP. Консоль коммутатора не меняется.</p>
      <form onSubmit={event => {
        event.preventDefault();
        if (!command.trim()) return;
        setLast({ command: command.trim(), result: runHostPing(state, hostId, command) });
      }} className="flex min-w-0 flex-wrap gap-2">
        <input id={inputId} value={command} onChange={event => setCommand(event.target.value)}
          placeholder="ping 192.168.10.12" autoComplete="off" autoCapitalize="off" spellCheck={false}
          className="min-w-0 flex-1 basis-36 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 px-2 py-2 font-mono text-base text-slate-900 dark:text-slate-100" />
        <button type="submit" className="min-h-10 rounded bg-cyan-600 px-3 py-2 text-xs font-semibold text-white">Выполнить ping</button>
      </form>
      {last && (
        <div className="min-w-0 space-y-1" role="status" aria-live="polite">
          <p className="text-[11px] text-slate-500">Последний запуск; после изменения сети повторите ping.</p>
          <pre className="whitespace-pre-wrap break-words text-[11px] font-mono text-slate-800 dark:text-slate-200">{host.hostname}&gt; {last.command}{'\n'}{last.result.output}</pre>
        </div>
      )}
    </section>
  );
}
