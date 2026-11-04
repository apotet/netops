import React from 'react';
import { Network } from 'lucide-react';
import { OsiExplorer } from './OsiExplorer';

export const TheoryModels: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/40 p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <Network className="w-4 h-4 text-cyan-500" />
          Сопоставление моделей
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-slate-500 dark:text-slate-400">
                <th className="py-2 pr-3 font-semibold">OSI</th>
                <th className="py-2 pr-3 font-semibold">TCP/IP</th>
                <th className="py-2 font-semibold">Примеры</th>
              </tr>
            </thead>
            <tbody className="text-slate-700 dark:text-slate-300">
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 pr-3 font-mono">L7 Application</td>
                <td className="py-2 pr-3" rowSpan={3}>
                  Application
                </td>
                <td className="py-2">HTTP, DNS, SSH, SMTP</td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 pr-3 font-mono">L6 Presentation</td>
                <td className="py-2">TLS, JSON, UTF-8, JPEG</td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 pr-3 font-mono">L5 Session</td>
                <td className="py-2">RPC, NetBIOS, SOCKS</td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 pr-3 font-mono">L4 Transport</td>
                <td className="py-2 pr-3">Transport</td>
                <td className="py-2">TCP, UDP, QUIC — порты 1–65535</td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 pr-3 font-mono">L3 Network</td>
                <td className="py-2 pr-3">Internet</td>
                <td className="py-2">IPv4/IPv6, ICMP, OSPF, BGP</td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 pr-3 font-mono">L2 Data Link</td>
                <td className="py-2 pr-3" rowSpan={2}>
                  Network Access
                </td>
                <td className="py-2">Ethernet, 802.1Q, ARP, STP</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 font-mono">L1 Physical</td>
                <td className="py-2">Медь, оптика, радио, SFP</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          В TCP/IP уровни L5–L7 OSI обычно слиты в Application. L1 и L2 — Network Access. Не путайте
          «уровень модели» и «конкретный протокол»: ICMP — часть Internet layer, хотя работает «поверх» IP.
        </p>
      </div>
      <OsiExplorer />
    </div>
  );
};
