import React, { useState } from 'react';
import { ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';

type Mode = 'with-sni' | 'without-sni';

export const SniDiagram: React.FC = () => {
  const [mode, setMode] = useState<Mode>('with-sni');
  const withSni = mode === 'with-sni';

  const chosen = withSni ? 'shop.example.test (сертификат B)' : 'www.example.test (сертификат по умолчанию A)';
  const validation = withSni
    ? 'Имя совпадает с SAN → проверка проходит'
    : 'Запрошен shop.example.test, в сертификате его нет → ошибка имени';

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('with-sni')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
            withSni ? 'bg-cyan-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          Клиент отправляет SNI
        </button>
        <button
          type="button"
          onClick={() => setMode('without-sni')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
            !withSni ? 'bg-cyan-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          Клиент не отправляет SNI
        </button>
      </div>

      <div className="grid gap-2 text-sm">
        <Step label="Клиент" value="Открывает https://shop.example.test" />
        <Arrow />
        <Step
          label="ClientHello"
          value={withSni ? 'server_name = shop.example.test' : 'расширения SNI нет'}
        />
        <Arrow />
        <Step label="Сервер 203.0.113.10" value={`Выбирает: ${chosen}`} />
        <Arrow />
        <Step
          label="Проверка имени"
          value={validation}
          tone={withSni ? 'ok' : 'bad'}
        />
        <Arrow />
        <Step
          label="Результат"
          value={withSni ? 'HTTPS устанавливается, имя подтверждено' : 'Соединение может установиться, но браузер покажет ошибку сертификата'}
          tone={withSni ? 'ok' : 'bad'}
        />
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
        Учебная модель. Сертификат A покрывает только www.example.test. Сертификат B — shop.example.test.
      </p>
    </div>
  );
};

function Step({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 ${
        tone === 'ok'
          ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30'
          : tone === 'bad'
            ? 'border-amber-500/40 bg-amber-50 dark:bg-amber-950/30'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/40'
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
        {tone === 'ok' && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
        {tone === 'bad' && <ShieldAlert className="w-3 h-3 text-amber-500" />}
        {label}
      </div>
      <div className="text-slate-800 dark:text-slate-100 mt-0.5">{value}</div>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex justify-center text-cyan-500">
      <ArrowRight className="w-4 h-4 rotate-90" />
    </div>
  );
}
