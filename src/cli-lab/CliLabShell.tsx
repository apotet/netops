import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LabEngine } from './engine/LabEngine';
import { evaluateGoals } from './engine/GoalEvaluator';
import { LabMode, Scenario } from './engine/types';
import { ciscoIosProfile } from './vendors/cisco-ios/profile';
import { ciscoIosCommands } from './vendors/cisco-ios/commands';
import { ciscoVlanAccessScenario } from './scenarios/cisco-vlan-access';
import { ciscoL3GatewayScenario } from './scenarios/cisco-l3-gateway';
import { ciscoTrunkScenario } from './scenarios/cisco-trunk';
import {
  Terminal as TerminalIcon,
  RotateCcw,
  CheckCircle2,
  Circle,
  HelpCircle,
  ChevronRight,
  Cpu,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface HistoryLine {
  type: 'input' | 'output' | 'system';
  prompt?: string;
  text: string;
  error?: boolean;
}

const SCENARIOS: Scenario[] = [
  ciscoVlanAccessScenario,
  ciscoTrunkScenario,
  ciscoL3GatewayScenario,
];

function goalLabel(g: Scenario['goals'][number]): string {
  switch (g.type) {
    case 'vlan.exists':
      return `VLAN ${g.vlanId}${g.name ? ` (${g.name})` : ''}`;
    case 'if.accessVlan':
      return `${g.ifName} access VLAN ${g.vlanId}`;
    case 'if.switchportMode':
      return `${g.ifName} mode ${g.mode}`;
    case 'if.admin':
      return `${g.ifName} admin ${g.up ? 'up' : 'down'}`;
    case 'if.ipv4':
      return `${g.ifName} ${g.address}/${g.prefix}`;
    case 'hostname':
      return `hostname ${g.hostname}`;
    case 'route.exists':
      return `route ${g.prefix}/${g.prefixLen}${g.nextHop ? ` via ${g.nextHop}` : ''}`;
    case 'if.trunkAllowed':
      return `${g.ifName} trunk allowed ${g.vlans.join(',')}`;
    case 'mode':
      return `режим: ${g.modes.join('|')}`;
    case 'privilege':
      return `privilege ≥ ${g.min}`;
    default:
      return 'goal';
  }
}

export const CliLabShell: React.FC = () => {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const [labMode, setLabMode] = useState<LabMode>('learn');
  const [history, setHistory] = useState<HistoryLine[]>([]);
  const [input, setInput] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [hintOpen, setHintOpen] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [goalResults, setGoalResults] = useState<ReturnType<typeof evaluateGoals> | null>(null);
  const [tick, setTick] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const stepIndexRef = useRef(0);

  const engine = useMemo(() => {
    return new LabEngine(ciscoIosProfile, ciscoIosCommands, structuredClone(scenario.initialState));
  }, [scenario]);

  const refreshGoals = () => {
    const result = evaluateGoals(engine.getState(), scenario.goals);
    setGoalResults(result);
    return result;
  };

  const resetLab = () => {
    engine.reset(structuredClone(scenario.initialState));
    const first = scenario.steps?.[0];
    const intro = `${scenario.title}\n${scenario.description}\n\nVendor: ${ciscoIosProfile.displayName} (documented subset).\nType ? for commands. Tab completes. ↑↓ — history. Mode: ${labMode}`;
    const stepLine =
      labMode === 'learn' && first
        ? `\n—— Шаг 1 / ${scenario.steps!.length} ——\n${first.instruction}${first.hint ? `\nПодсказка: ${first.hint}` : ''}`
        : '';
    setHistory([{ type: 'system', text: intro + stepLine }]);
    setStepIndex(0);
    stepIndexRef.current = 0;
    setHintOpen(false);
    setCompleted(false);
    setGoalResults(null);
    setInput('');
    setHistIndex(null);
    setTick((t) => t + 1);
    inputRef.current?.focus();
  };

  useEffect(() => {
    resetLab();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labMode, scenarioId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreen) setFullscreen(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [fullscreen]);

  const steps = scenario.steps ?? [];

  const tryAdvanceLearnStep = () => {
    if (labMode !== 'learn') return;
    const idx = stepIndexRef.current;
    const current = steps[idx];
    if (!current?.accept?.length) return;

    const state = engine.getState();
    const { allPassed } = evaluateGoals(state, current.accept);
    if (!allPassed) return;

    const next = idx + 1;
    setHintOpen(false);

    if (next >= steps.length) {
      stepIndexRef.current = next;
      setStepIndex(next);
      setCompleted(true);
      const goals = evaluateGoals(state, scenario.goals);
      setGoalResults(goals);
      setHistory((h) => [
        ...h,
        {
          type: 'system',
          text: `✓ Шаг выполнен. ${current.explanation || ''}\n\n✓ ${scenario.successMessage}`,
        },
      ]);
      return;
    }

    const nextStep = steps[next];
    const nextLine = nextStep
      ? `\n—— Шаг ${next + 1} / ${steps.length} ——\n${nextStep.instruction}${
          nextStep.hint ? `\nПодсказка: ${nextStep.hint}` : ''
        }`
      : '';
    stepIndexRef.current = next;
    setStepIndex(next);
    setHistory((h) => [
      ...h,
      {
        type: 'system',
        text: `✓ Шаг выполнен. ${current.explanation || ''}${nextLine}`,
      },
    ]);
  };

  const runCheck = () => {
    const result = refreshGoals();
    setCompleted(result.allPassed);
    setHistory((h) => [
      ...h,
      {
        type: 'system',
        text: result.allPassed
          ? `✓ ${scenario.successMessage}`
          : `Проверка: ${result.results.filter((r) => r.passed).length}/${result.results.length} целей.\n` +
            result.results.map((r) => `${r.passed ? '✓' : '✗'} ${r.detail}`).join('\n'),
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const result = engine.complete(input);
      if (result.completed != null) {
        setInput(result.completed);
        return;
      }
      if (result.candidates.length > 1) {
        setHistory((h) => [
          ...h,
          {
            type: 'system',
            text: result.candidates.join('  '),
          },
        ]);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const next =
        histIndex === null ? cmdHistory.length - 1 : Math.max(0, histIndex - 1);
      setHistIndex(next);
      setInput(cmdHistory[next] ?? '');
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIndex === null) return;
      if (histIndex >= cmdHistory.length - 1) {
        setHistIndex(null);
        setInput('');
        return;
      }
      const next = histIndex + 1;
      setHistIndex(next);
      setInput(cmdHistory[next] ?? '');
      return;
    }
  };

  const submitLine = () => {
    const line = input;
    if (!line.trim()) return;
    const prompt = engine.getPrompt();
    const result = engine.execute(line);
    setHistory((h) => [
      ...h,
      { type: 'input', prompt, text: line },
      ...(result.output
        ? [{ type: 'output' as const, text: result.output, error: result.error }]
        : []),
    ]);
    setCmdHistory((prev) => {
      if (prev[prev.length - 1] === line) return prev;
      return [...prev, line].slice(-80);
    });
    setHistIndex(null);
    setInput('');
    setTick((t) => t + 1);

    if (labMode !== 'exam') {
      refreshGoals();
    }

    tryAdvanceLearnStep();

    if (labMode === 'task' || labMode === 'exam' || labMode === 'drill') {
      const g = engine.checkGoals(scenario.goals);
      if (g.allPassed) {
        setCompleted(true);
        setGoalResults(g);
        setHistory((h) => [...h, { type: 'system', text: `✓ ${scenario.successMessage}` }]);
      }
    }

    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const modes: LabMode[] = ['learn', 'drill', 'task', 'exam'];
  void tick;
  const currentStep = steps[stepIndex];
  const showGoalsLive = labMode !== 'exam' || completed;

  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm p-4 sm:p-6 overflow-auto space-y-4'
          : 'space-y-4 max-w-5xl mx-auto'
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-500" />
            CLI Lab 2.0
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {ciscoIosProfile.displayName} · проверка по состоянию · Tab · ↑↓ history
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setLabMode(m)}
              className={
                labMode === m
                  ? 'px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide cursor-pointer bg-cyan-500 text-slate-950'
                  : 'px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScenarioId(s.id)}
            className={
              scenarioId === s.id
                ? 'px-3 py-1.5 rounded-xl text-xs font-semibold border border-cyan-500 bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 cursor-pointer'
                : 'px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer'
            }
          >
            {s.title}
          </button>
        ))}
      </div>

      <div
        className={
          fullscreen
            ? 'grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-7xl mx-auto'
            : 'grid grid-cols-1 lg:grid-cols-3 gap-4'
        }
      >
        <div
          className={
            fullscreen
              ? 'lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-950 text-slate-100 overflow-hidden shadow-xl flex flex-col min-h-[calc(100vh-10rem)]'
              : 'lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-950 text-slate-100 overflow-hidden shadow-xl flex flex-col min-h-[420px]'
          }
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900/80">
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-300">
              <TerminalIcon className="w-3.5 h-3.5" />
              {scenario.id}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFullscreen((v) => !v)}
                className="hidden sm:inline-flex text-xs text-slate-400 hover:text-white items-center gap-1 cursor-pointer"
                title={fullscreen ? 'Выйти из полного экрана (Esc)' : 'Полный экран'}
              >
                {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                {fullscreen ? 'Окно' : 'Полный экран'}
              </button>
              <button
                type="button"
                onClick={resetLab}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Сброс
              </button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed space-y-1"
          >
            {history.map((h, i) => (
              <div
                key={i}
                className={
                  h.error
                    ? 'text-rose-300 whitespace-pre-wrap'
                    : h.type === 'system'
                      ? 'text-amber-200/90 whitespace-pre-wrap'
                      : 'whitespace-pre-wrap'
                }
              >
                {h.type === 'input' ? (
                  <span>
                    <span className="text-emerald-400">{h.prompt} </span>
                    <span className="text-white">{h.text}</span>
                  </span>
                ) : (
                  h.text
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitLine();
            }}
            className="border-t border-slate-800 bg-slate-900/90 px-3 py-2 flex items-center gap-2"
          >
            <span className="font-mono text-[12px] text-emerald-400 shrink-0">
              {engine.getPrompt()}
            </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-0 outline-none font-mono text-[12px] text-white placeholder:text-slate-600"
              placeholder="command… (Tab · ↑↓ · ?)"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              className="text-cyan-400 hover:text-cyan-300 cursor-pointer"
              aria-label="Submit"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-4 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
              Сценарий
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">{scenario.title}</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {scenario.description}
            </p>
          </div>

          {labMode === 'learn' && currentStep && !completed && (
            <div className="rounded-2xl border border-cyan-500/40 bg-cyan-50 dark:bg-cyan-950/30 p-4 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300 font-mono">
                Шаг {stepIndex + 1} / {steps.length}
              </div>
              <p className="text-sm text-slate-900 dark:text-white leading-relaxed">
                {currentStep.instruction}
              </p>
              <button
                type="button"
                onClick={() => setHintOpen((v) => !v)}
                className="text-xs text-cyan-700 dark:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {hintOpen ? 'Скрыть подсказку' : 'Подсказка'}
              </button>
              {hintOpen && currentStep.hint && (
                <p className="text-xs font-mono text-cyan-800 dark:text-cyan-200 bg-white/50 dark:bg-black/30 rounded-lg px-2 py-1.5">
                  {currentStep.hint}
                </p>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                Цели
              </div>
              {(labMode === 'task' || labMode === 'exam' || labMode === 'drill') && (
                <button
                  type="button"
                  onClick={runCheck}
                  className="text-[11px] font-bold px-2 py-1 rounded-lg bg-cyan-500 text-slate-950 cursor-pointer"
                >
                  Проверить
                </button>
              )}
            </div>
            <ul className="space-y-1.5">
              {(showGoalsLive
                ? goalResults?.results ??
                  scenario.goals.map((g) => ({
                    predicate: g,
                    passed: false,
                    detail: goalLabel(g),
                  }))
                : scenario.goals.map((g) => ({
                    predicate: g,
                    passed: false,
                    detail: goalLabel(g),
                  }))
              ).map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300"
                >
                  {r.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <span>{r.detail}</span>
                </li>
              ))}
            </ul>
            {completed && (
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-300 pt-1">
                {scenario.successMessage}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 p-3 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Режимы</p>
            <p>
              <span className="font-mono text-cyan-600 dark:text-cyan-400">learn</span> — пошагово с
              подсказками · <span className="font-mono text-cyan-600 dark:text-cyan-400">drill</span> —
              свободная практика · <span className="font-mono text-cyan-600 dark:text-cyan-400">task</span>/
              <span className="font-mono text-cyan-600 dark:text-cyan-400">exam</span> — только цели,
              проверка по кнопке или автоматически.
            </p>
            <p className="mt-2">
              Сокращения интерфейсов: <span className="font-mono">fa0/1</span>,{' '}
              <span className="font-mono">gi0/0</span>. Из config: <span className="font-mono">do show …</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
