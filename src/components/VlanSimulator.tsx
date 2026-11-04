import React, { useState } from 'react';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const VlanSimulator: React.FC = () => {
  const [sourcePort, setSourcePort] = useState<number>(1);
  const [destPort, setDestPort] = useState<number>(2);
  const [vlanMapping] = useState<{ [port: number]: { vlan: number; name: string; type: 'access' | 'trunk' } }>({
    1: { vlan: 10, name: 'Бухгалтерия (VLAN 10)', type: 'access' },
    2: { vlan: 10, name: 'Финансы (VLAN 10)', type: 'access' },
    3: { vlan: 20, name: 'Инженеры (VLAN 20)', type: 'access' },
    4: { vlan: 20, name: 'Разработка (VLAN 20)', type: 'access' },
    5: { vlan: 99, name: 'Trunk 802.1Q (Все VLAN)', type: 'trunk' },
  });

  const [simulationResult, setSimulationResult] = useState<{
    status: 'delivered' | 'blocked' | 'trunked';
    message: string;
    details: string;
    tagInfo?: string;
  } | null>(null);

  const runSimulation = () => {
    const src = vlanMapping[sourcePort];
    const dst = vlanMapping[destPort];

    if (sourcePort === destPort) {
      setSimulationResult({
        status: 'blocked',
        message: 'Нельзя отправить кадр самому себе в тот же порт.',
        details: 'Коммутатор никогда не пересылает кадр обратно в порт, из которого он был получен (правило Split Horizon).',
      });
      return;
    }

    if (dst.type === 'trunk') {
      setSimulationResult({
        status: 'trunked',
        message: `Кадр помечен 802.1Q тегом VLAN ${src.vlan} и отправлен в Trunk!`,
        details: `Коммутатор добавляет 4-байтный тег IEEE 802.1Q (TPID 0x8100, VID ${src.vlan}) для передачи кадра между коммутаторами без смешивания широковещательных доменов.`,
        tagInfo: `IEEE 802.1Q: TPID=0x8100 | PCP=0 | DEI=0 | VID=${src.vlan}`,
      });
      return;
    }

    if (src.vlan === dst.vlan) {
      setSimulationResult({
        status: 'delivered',
        message: `Успех! Кадр доставлен внутри изолированного VLAN ${src.vlan}.`,
        details: `Порты ${sourcePort} и ${destPort} находятся в одном широковещательном домене (Broadcast Domain). Коммутатор передаёт untagged кадр без участия маршрутизатора.`,
      });
    } else {
      setSimulationResult({
        status: 'blocked',
        message: `Кадр отклонён: разные VLAN (${src.vlan} ≠ ${dst.vlan})!`,
        details: `L2-коммутатор строго изолирует VLAN друг от друга. Прямая передача на уровне L2 невозможна. Для связи между VLAN 10 и VLAN 20 требуется L3-маршрутизатор (Router-on-a-stick или L3-Switch SVI).`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20 shadow-xl">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
          Интерактивная лаборатория
        </span>
        <h2 className="text-2xl font-black tracking-tight text-white mt-1">
          VLAN & Trunk 802.1Q: Симулятор изоляции портов
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Исследуйте, как коммутатор изолирует широковещательные домены и почему для связи между разными VLAN необходим L3-маршрутизатор
        </p>
      </div>

      {/* Switch Interactive Board */}
      <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20 shadow-xl space-y-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Панель портов управляемого коммутатора
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {Object.entries(vlanMapping).map(([pStr, info]) => {
            const portNum = Number(pStr);
            const isSource = sourcePort === portNum;
            const isDest = destPort === portNum;

            let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
            if (info.vlan === 10) badgeColor = 'bg-cyan-950/60 text-cyan-300 border-cyan-500/50';
            if (info.vlan === 20) badgeColor = 'bg-purple-950/60 text-purple-300 border-purple-500/50';
            if (info.type === 'trunk') badgeColor = 'bg-amber-950/60 text-amber-300 border-amber-500/50';

            return (
              <div
                key={portNum}
                className={`p-4 rounded-xl border transition-all ${badgeColor} ${
                  isSource ? 'ring-2 ring-cyan-400 shadow-lg' : ''
                } ${isDest ? 'ring-2 ring-blue-400 shadow-lg' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-xs">Порт {portNum}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold bg-black/40">
                    {info.type}
                  </span>
                </div>
                <div className="text-xs font-semibold mb-3">{info.name}</div>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
                  <button
                    onClick={() => setSourcePort(portNum)}
                    type="button"
                    className={`py-1.5 px-2 rounded text-[11px] font-bold transition-all min-h-[34px] cursor-pointer ${
                      isSource
                        ? 'bg-cyan-500 text-slate-950'
                        : 'bg-black/30 hover:bg-black/50 text-slate-300'
                    }`}
                  >
                    {isSource ? '✓ Источник' : 'Как источник'}
                  </button>
                  <button
                    onClick={() => setDestPort(portNum)}
                    type="button"
                    className={`py-1.5 px-2 rounded text-[11px] font-bold transition-all min-h-[34px] cursor-pointer ${
                      isDest
                        ? 'bg-blue-500 text-slate-950'
                        : 'bg-black/30 hover:bg-black/50 text-slate-300'
                    }`}
                  >
                    {isDest ? '✓ Получатель' : 'Как получатель'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action button */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-300 font-mono">
            Передача: <span className="text-cyan-400 font-bold">Порт {sourcePort}</span> (VLAN{' '}
            {vlanMapping[sourcePort].vlan}) →{' '}
            <span className="text-blue-400 font-bold">Порт {destPort}</span> (VLAN{' '}
            {vlanMapping[destPort].vlan})
          </div>

          <button
            onClick={runSimulation}
            type="button"
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs hover:brightness-110 active:scale-[0.99] transition-all flex items-center gap-2 min-h-[48px] shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Проверить передачу кадра
          </button>
        </div>

        {/* Simulation Result */}
        {simulationResult && (
          <div
            className={`p-5 rounded-xl border animate-fade-in ${
              simulationResult.status === 'delivered'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : simulationResult.status === 'trunked'
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {simulationResult.status === 'delivered' ? (
                <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : simulationResult.status === 'trunked' ? (
                <Layers className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-xs">
                <div className="font-bold text-sm text-white">{simulationResult.message}</div>
                <div className="text-slate-300 leading-relaxed">{simulationResult.details}</div>
                {simulationResult.tagInfo && (
                  <div className="mt-2 p-2 rounded bg-black/40 font-mono text-cyan-300">
                    {simulationResult.tagInfo}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 802.1Q Tag Anatomy */}
      <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20 shadow-xl space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
          Анатомия 4-байтного тега 802.1Q (Trunk)
        </h3>
        <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
            <div className="text-cyan-400 font-bold">TPID (16 бит)</div>
            <div className="text-[11px] text-slate-400">0x8100</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
            <div className="text-purple-400 font-bold">PCP (3 бита)</div>
            <div className="text-[11px] text-slate-400">Приоритет QoS</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
            <div className="text-amber-400 font-bold">DEI (1 бит)</div>
            <div className="text-[11px] text-slate-400">Drop Eligible</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-700">
            <div className="text-emerald-400 font-bold">VID (12 бит)</div>
            <div className="text-[11px] text-slate-400">Номер VLAN (1–4094)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
