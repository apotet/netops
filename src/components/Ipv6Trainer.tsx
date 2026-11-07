import React, { useMemo, useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';

type Mode = 'compress' | 'expand' | 'type' | 'prefix' | 'concept';

const COMPRESS_PAIRS: [string, string][] = [
  ['2001:0db8:0000:0000:0000:0000:0000:0042', '2001:db8::42'],
  ['2001:0db8:1234:0000:0000:0000:0000:0001', '2001:db8:1234::1'],
  ['fe80:0000:0000:0000:021c:7eff:fe12:3456', 'fe80::21c:7eff:fe12:3456'],
  ['fd12:3456:789a:0000:0000:0000:0000:00ab', 'fd12:3456:789a::ab'],
  ['2001:0db8:0000:0001:0000:0000:0000:0009', '2001:db8:0:1::9'],
];

const CONCEPTS = [
  { q: 'Что в IPv6 выполняет задачи, похожие на ARP?', a: 'NDP', opts: ['NDP', 'DNS', 'NAT', 'STP'], e: 'NDP работает через ICMPv6 и находит соседей и их канальные адреса.' },
  { q: 'Что позволяет хосту получить IPv6-адрес без обязательного DHCPv6?', a: 'SLAAC', opts: ['SLAAC', 'ARP', 'PAT', 'VTP'], e: 'SLAAC использует Router Advertisement: хост сам собирает адрес из префикса и идентификатора интерфейса.' },
  { q: 'В каком сообщении хост получает префикс для SLAAC?', a: 'Router Advertisement', opts: ['Router Advertisement', 'ARP Reply', 'TCP SYN', 'DNS Response'], e: 'RA шлёт маршрутизатор. Флаг A=1 в опции префикса разрешает SLAAC.' },
  { q: 'Есть ли в IPv6 broadcast?', a: 'Нет', opts: ['Нет', 'Да, только /64', 'Да, только локальный', 'Только через DHCPv6'], e: 'Broadcast убран. Вместо него multicast и Neighbor Discovery.' },
  { q: 'Что такое Dual Stack?', a: 'Одновременная работа IPv4 и IPv6', opts: ['Одновременная работа IPv4 и IPv6', 'Два IPv6-адреса на интерфейсе', 'Два маршрутизатора', 'Шифрование IPv6'], e: 'Устройство или сеть одновременно поддерживает оба стека.' },
];

const MODES: { id: Mode; label: string }[] = [
  { id: 'compress', label: 'Сжать' },
  { id: 'expand', label: 'Развернуть' },
  { id: 'type', label: 'Тип' },
  { id: 'prefix', label: '/64' },
  { id: 'concept', label: 'Понятия' },
];

function expand(addr: string): string | null {
  const text = addr.trim().toLowerCase();
  if (!/^[0-9a-f:]+$/.test(text) || text.split('::').length > 2) return null;
  const halves = text.split('::');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  if ([...left, ...right].some((x) => !/^[0-9a-f]{1,4}$/.test(x))) return null;
  const missing = 8 - left.length - right.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  return [...left, ...(halves.length === 2 ? Array(missing).fill('0') : []), ...right]
    .map((x) => x.padStart(4, '0'))
    .join(':');
}

function compress(addr: string): string | null {
  const full = expand(addr);
  if (!full) return null;
  const parts = full.split(':').map((x) => x.replace(/^0+(?=[0-9a-f])/, ''));
  let bestS = -1;
  let bestL = 0;
  let s = -1;
  for (let i = 0; i <= parts.length; i++) {
    if (i < parts.length && parts[i] === '0') {
      if (s < 0) s = i;
    } else if (s >= 0) {
      const len = i - s;
      if (len > bestL && len >= 2) {
        bestS = s;
        bestL = len;
      }
      s = -1;
    }
  }
  if (bestS >= 0) {
    const before = parts.slice(0, bestS).join(':');
    const after = parts.slice(bestS + bestL).join(':');
    return `${before}::${after}`;
  }
  return parts.join(':');
}

function prefix64(addr: string): string {
  return `${expand(addr)!.split(':').slice(0, 4).map((x) => x.replace(/^0+(?=[0-9a-f])/, '')).join(':')}::/64`;
}

function samePrefix64(given: string, expected: string): boolean {
  const a = given.trim().split('/');
  const b = expected.split('/');
  return a.length === 2 && a[1] === '64' && expand(a[0]) !== null && expand(a[0]) === expand(b[0]);
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

interface Task {
  q: string;
  answer: string;
  input?: boolean;
  opts?: string[];
  e: string;
}

function makeTask(mode: Mode): Task {
  const pair = COMPRESS_PAIRS[Math.floor(Math.random() * COMPRESS_PAIRS.length)];
  if (mode === 'compress') {
    return { q: `Запиши адрес в канонической сокращённой форме: ${pair[0]}`, answer: pair[1], input: true, e: 'Сначала убираем ведущие нули в группах, затем самую длинную последовательность нулевых групп заменяем на ::. При равной длине берём первую слева. Одиночный ноль не сжимаем.' };
  }
  if (mode === 'expand') {
    return { q: `Разверни до восьми групп по 4 hex-цифры: ${pair[1]}`, answer: pair[0], input: true, e: 'На месте :: возвращаем столько групп 0000, чтобы снова стало восемь групп.' };
  }
  if (mode === 'type') {
    const pool: [string, string][] = [
      ['2001:db8:1234::10', 'Global Unicast'],
      ['fe80::21c:7eff:fe12:3456', 'Link-Local'],
      ['fd12:3456:789a::1', 'Unique Local'],
      ['ff02::1', 'Multicast'],
      ['::1', 'Loopback'],
    ];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return { q: `Какой это тип адреса? ${pick[0]}`, answer: pick[1], opts: shuffled(['Global Unicast', 'Link-Local', 'Unique Local', 'Multicast', 'Loopback']), e: '2000::/3 — global, fe80::/10 — link-local, fc00::/7 — unique local, ff00::/8 — multicast, ::1 — loopback. 2001:db8::/32 имеет вид global, но это документационный диапазон.' };
  }
  if (mode === 'prefix') {
    const pool = ['2001:db8:1234:5678:abcd:ef01:2345:6789', 'fd12:3456:789a:10::25', '2001:db8:aa:bb:1:2:3:4'];
    const addr = pool[Math.floor(Math.random() * pool.length)];
    return { q: `Какой префикс сети /64 у адреса? ${addr}/64`, answer: prefix64(addr), input: true, e: 'При /64 сеть — первые четыре группы. Остальные 64 бита — идентификатор интерфейса.' };
  }
  const concept = CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)];
  return { q: concept.q, answer: concept.a, opts: shuffled(concept.opts), e: concept.e };
}

const TOTAL = 10;

export const Ipv6Trainer: React.FC = () => {
  const [mode, setMode] = useState<Mode>('compress');
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [task, setTask] = useState<Task>(() => makeTask('compress'));
  const [answer, setAnswer] = useState('');
  const [picked, setPicked] = useState('');
  const [checked, setChecked] = useState(false);
  const [ok, setOk] = useState(false);
  const [done, setDone] = useState(false);

  const progress = useMemo(() => (done ? 100 : (index / TOTAL) * 100), [done, index]);

  const startMode = (next: Mode) => {
    setMode(next);
    setIndex(0);
    setCorrect(0);
    setDone(false);
    setChecked(false);
    setAnswer('');
    setPicked('');
    setTask(makeTask(next));
  };

  const check = () => {
    if (checked) return;
    const given = task.input ? answer : picked;
    if (!given.trim()) return;
    const good = mode === 'prefix' ? samePrefix64(given, task.answer) : given.trim().toLowerCase() === task.answer.toLowerCase();
    setOk(good);
    setChecked(true);
    if (good) setCorrect((n) => n + 1);
  };

  const next = () => {
    if (index + 1 >= TOTAL) {
      setDone(true);
      return;
    }
    setIndex((n) => n + 1);
    setChecked(false);
    setAnswer('');
    setPicked('');
    setTask(makeTask(mode));
  };

  return (
    <div className="font-sans max-w-5xl mx-auto space-y-5">
      <div className="rounded-2xl border border-slate-200 dark:border-cyan-500/20 bg-white dark:bg-slate-900/40 p-5 sm:p-6">
        <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Продолжение после IPv4</p>
        <h1 className="text-2xl sm:text-3xl text-slate-900 dark:text-white mt-2 font-sans font-bold">Не учи IPv6 как стену из цифр</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Смотри на адрес как на восемь групп по 16 бит. В типичной LAN первые 64 бита — префикс сети, вторые 64 — идентификатор интерфейса.</p>
        <div className="mt-4 border-l-4 border-amber-400 bg-slate-50 dark:bg-slate-950/60 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
          <strong className="text-amber-400">Главная мысль:</strong> IPv6 — 128 бит = 8 групп × 16 бит. Одна hex-цифра = 4 бита. Поэтому одна группа из четырёх hex-цифр = 16 бит.
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <section className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/40 p-4">
          <h2 className="text-slate-900 dark:text-white mb-2 font-sans font-bold">1. Увидь структуру /64</h2>
          <p className="text-xs text-slate-500 mb-3 font-mono">2001:db8:1234:5678:abcd:ef01:2345:6789/64</p>
          <div className="grid grid-cols-4 gap-1.5">
            {['2001','0db8','1234','5678'].map((g) => <span key={g} className="text-center font-mono text-xs font-bold rounded-lg py-2 bg-cyan-500/15 text-cyan-300">{g}</span>)}
            {['abcd','ef01','2345','6789'].map((g) => <span key={g} className="text-center font-mono text-xs font-bold rounded-lg py-2 bg-blue-500/15 text-blue-300">{g}</span>)}
          </div>
          <p className="text-xs text-slate-500 mt-2"><span className="text-cyan-400">●</span> префикс /64 &nbsp; <span className="text-blue-400">●</span> интерфейс</p>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">/64 означает: первые четыре группы — сеть. Это не «маска 255…», а длина префикса в битах. На Ethernet LAN /64 типичен, но не единственный: на линк между роутерами бывает /127.</p>
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/40 p-4 space-y-2">
          <h2 className="text-slate-900 dark:text-white font-sans font-bold">2. Научись сокращать</h2>
          <div className="rounded-xl bg-slate-100 dark:bg-slate-950 p-3 text-sm font-sans space-y-1">
            <div className="text-amber-600 dark:text-amber-300 font-mono">2001:0db8:0000:0000:0000:0000:0000:0042</div>
            <div className="text-slate-500">↓ убираем ведущие нули и одну самую длинную цепочку нулевых групп</div>
            <div className="text-cyan-700 dark:text-cyan-300 font-mono">2001:db8::42</div>
          </div>
          <div className="rounded-xl bg-slate-100 dark:bg-slate-950 p-3 text-sm font-sans space-y-1">
            <div className="text-amber-600 dark:text-amber-300 font-mono">fe80:0000:0000:0000:021c:7eff:fe12:3456</div>
            <div className="text-slate-500">↓</div>
            <div className="text-cyan-700 dark:text-cyan-300 font-mono">fe80::21c:7eff:fe12:3456</div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">Сначала убираем ведущие нули в каждой группе. Потом самую длинную цепочку из двух и более нулей заменяем на ::. При равной длине берём первую слева. Одиночный ноль остаётся как 0: <span className="font-mono">2001:db8:0:1::9</span>. :: в адресе только один раз.</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">В <span className="font-mono">fe80::21c:7eff:fe12:3456</span> хвост когда-то собирали по modified EUI-64. Сейчас ОС чаще ставят стабильный приватный IID (RFC 7217) или временный (RFC 8981).</p>
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/40 p-4 space-y-2">
          <h2 className="text-slate-900 dark:text-white font-sans font-bold">3. Узнавай тип адреса</h2>
          {[
            ['2000::/3', 'Global Unicast. 2001:db8::/32 — документация, в интернете не маршрутизируют.'],
            ['fe80::/10', 'Link-Local. Работает только в пределах канала.'],
            ['fc00::/7', 'Unique Local. Внутренние адреса, ближе к частным IPv4. На практике почти всегда fd00::/8.'],
            ['ff00::/8', 'Multicast. Broadcast в IPv6 нет.'],
            ['::1', 'Loopback, аналог 127.0.0.1.'],
          ].map(([code, text]) => (
            <div key={code} className="rounded-xl bg-slate-50 dark:bg-slate-950/50 p-2">
              <code className="text-cyan-400 text-xs font-mono">{code}</code>
              <p className="text-xs text-slate-600 dark:text-slate-300">{text}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/40 p-4 space-y-2">
          <h2 className="text-slate-900 dark:text-white font-sans font-bold">4–5. NDP, RA и SLAAC</h2>
          <p className="text-xs text-slate-500">NDP — это зонтик. В него входят RS/RA (роутер) и NS/NA (соседи). DAD — это тоже NS/NA до начала использования адреса. Поэтому NDP не «следующий шаг после SLAAC», а механизм, который работает с самого начала.</p>
          {[
            ['1', 'Link-Local', 'Интерфейс получает адрес из fe80::/10.'],
            ['2', 'Router Advertisement', 'Роутер сообщает префикс сети и параметры.'],
            ['3', 'SLAAC', 'Хост собирает адрес из префикса RA с флагом A. Перед использованием — DAD. DHCPv6 не обязателен.'],
            ['4', 'NDP', 'Через ICMPv6 находит соседей и роутеры, задачи похожи на ARP.'],
            ['5', 'Dual Stack', 'IPv4 и IPv6 часто работают параллельно на время перехода.'],
          ].map(([n, title, text]) => (
            <div key={n} className="flex gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 text-xs font-bold grid place-items-center shrink-0">{n}</span>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{title}</div>
                <p className="text-xs text-slate-500">{text}</p>
              </div>
            </div>
          ))}
        </section>
      </div>

      <div>
        <p className="text-xs font-bold tracking-widest text-cyan-400 uppercase">Тренировка · 10 заданий</p>
        <h2 className="text-xl text-slate-900 dark:text-white font-sans font-bold">Закрепим без зубрёжки</h2>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => startMode(item.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${mode === item.id ? 'bg-cyan-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div className="h-full bg-cyan-400 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-cyan-500/20 bg-white dark:bg-slate-900/40 p-4 sm:p-5 space-y-4">
        <div className="flex justify-between text-xs text-slate-500 font-bold">
          <span>{done ? 'Подход завершён' : `Задание ${index + 1} из ${TOTAL}`}</span>
          <span>{correct} верно</span>
        </div>

        {done ? (
          <div className="space-y-3">
            <p className="text-lg font-bold text-slate-900 dark:text-white">{correct} из {TOTAL}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {correct >= 8 ? 'Основные конструкции IPv6 уже читаются.' : 'Вернись к сжатию и /64 и сделай ещё один подход.'}
            </p>
            <button type="button" onClick={() => startMode(mode)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm">
              <RotateCcw className="w-4 h-4" /> Ещё 10
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm sm:text-base text-slate-800 dark:text-slate-100 leading-relaxed break-all">{task.q}</p>
            {task.input ? (
              <input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') check(); }}
                disabled={checked}
                placeholder="введи ответ"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-mono"
              />
            ) : (
              <div className="grid gap-2">
                {task.opts?.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={checked}
                    onClick={() => setPicked(opt)}
                    className={`text-left px-3 py-2.5 rounded-xl border text-sm ${picked === opt ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-200 dark:border-slate-700'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {checked && (
              <div className={`flex gap-2 rounded-xl p-3 text-sm ${ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                {ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                <div>
                  <div className="font-bold">{ok ? 'Верно' : 'Не совсем'}</div>
                  {!ok && <div className={`text-xs mt-1 break-all ${task.input ? 'font-mono' : 'font-sans'}`}>{task.answer}</div>}
                  <p className="mt-1 text-slate-600 dark:text-slate-300">{task.e}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {!checked ? (
                <button type="button" onClick={check} className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm">Проверить</button>
              ) : (
                <button type="button" onClick={next} className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-sm">Дальше</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
