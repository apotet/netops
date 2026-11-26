import React from 'react';

type Wire = { label: string; short: string; color: string; stripe?: boolean };
const orange = '#f97316', green = '#16a34a', blue = '#2563eb', brown = '#92400e';
const white = (label: string, short: string, color: string): Wire => ({ label, short, color, stripe: true });
const solid = (label: string, short: string, color: string): Wire => ({ label, short, color });
const a: Wire[] = [
  white('Бело-зелёный', 'Б/З', green), solid('Зелёный', 'З', green),
  white('Бело-оранжевый', 'Б/О', orange), solid('Синий', 'С', blue),
  white('Бело-синий', 'Б/С', blue), solid('Оранжевый', 'О', orange),
  white('Бело-коричневый', 'Б/К', brown), solid('Коричневый', 'К', brown),
];
const b: Wire[] = [
  white('Бело-оранжевый', 'Б/О', orange), solid('Оранжевый', 'О', orange),
  white('Бело-зелёный', 'Б/З', green), solid('Синий', 'С', blue),
  white('Бело-синий', 'Б/С', blue), solid('Зелёный', 'З', green),
  white('Бело-коричневый', 'Б/К', brown), solid('Коричневый', 'К', brown),
];

/** Static, numbered pin reference. Avoids ambiguous mirrored RJ45 photo orientation. */
export function EthernetPinout() {
  return (
    <div className="rounded-xl border border-cyan-400/30 bg-cyan-50/50 p-3 dark:bg-cyan-900/10 space-y-3" role="group" aria-label="Схемы расположения жил T568A и T568B">
      <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">Порядок жил по номерам контактов 1–8</div>
      {([{ title: 'T568A', wires: a }, { title: 'T568B', wires: b }] as const).map(group => (
        <div key={group.title} className="space-y-1.5">
          <div className="text-xs font-bold text-cyan-800 dark:text-cyan-200">{group.title}</div>
          <div className="grid grid-cols-8 gap-1" role="list" aria-label={`Контакты ${group.title}`}>
            {group.wires.map((wire, i) => (
              <div key={i} role="listitem" aria-label={`Контакт ${i + 1}: ${wire.label}`} className="min-w-0 text-center">
                <span className="block text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-200">{i + 1}</span>
                <span aria-hidden="true" title={wire.label} className="my-0.5 block h-5 rounded-sm border border-slate-400/60" style={{ background: wire.stripe ? `linear-gradient(90deg, #ffffff 0 39%, ${wire.color} 39% 61%, #ffffff 61% 100%)` : wire.color }}/>
                <span aria-hidden="true" className="block text-[9px] leading-tight text-slate-700 dark:text-slate-300">{wire.short}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="text-[11px] text-slate-600 dark:text-slate-300">Б — бело-, З — зелёный, О — оранжевый, С — синий, К — коричневый. Сверяй контакты по нумерации, а не по положению на случайной фотографии.</p>
    </div>
  );
}
