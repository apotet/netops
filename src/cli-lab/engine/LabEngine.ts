import { evaluateGoals } from './GoalEvaluator';
import {
  CommandResult,
  CommandSpec,
  DeviceState,
  GoalPredicate,
  NetworkState,
  VendorProfile,
} from './types';

function cloneState(state: NetworkState): NetworkState {
  return structuredClone(state);
}

function activeDevice(state: NetworkState): DeviceState {
  const d = state.devices[state.activeDeviceId];
  if (!d) throw new Error(`Active device ${state.activeDeviceId} missing`);
  return d;
}

function findCommand(specs: CommandSpec[], tokens: string[]): CommandSpec | undefined {
  const lower = tokens.map((t) => t.toLowerCase());
  let best: CommandSpec | undefined;
  let bestLen = 0;
  for (const spec of specs) {
    const m = spec.match;
    if (m.length > lower.length) continue;
    let ok = true;
    for (let i = 0; i < m.length; i++) {
      if (m[i] !== lower[i]) {
        ok = false;
        break;
      }
    }
    if (ok && m.length >= bestLen) {
      best = spec;
      bestLen = m.length;
    }
  }
  return best;
}

export class LabEngine {
  constructor(
    private profile: VendorProfile,
    private commands: CommandSpec[],
    private state: NetworkState
  ) {}

  getState(): NetworkState {
    return this.state;
  }

  setState(state: NetworkState) {
    this.state = state;
  }

  getPrompt(): string {
    return this.profile.prompt(activeDevice(this.state));
  }

  reset(initial: NetworkState) {
    this.state = cloneState(initial);
  }

  /**
   * Tab-completion for the current input line.
   * Returns completed line and/or candidate tokens when ambiguous.
   */
  complete(line: string): { completed?: string; candidates: string[] } {
    const device = activeDevice(this.state);
    const mode = device.modeCtx.mode;
    const priv = device.privilege;

    const endsWithSpace = /\s$/.test(line);
    const trimmed = line.trim();
    const parts = trimmed.length === 0 ? [] : trimmed.split(/\s+/);
    const tokens = endsWithSpace ? parts : parts.slice(0, -1);
    const partial = endsWithSpace ? '' : (parts[parts.length - 1] ?? '').toLowerCase();

    const available = this.commands.filter((spec) => {
      if (!spec.modes.includes(mode)) return false;
      if (spec.minPrivilege != null && priv < spec.minPrivilege) return false;
      if (tokens.length > spec.match.length) return false;
      for (let i = 0; i < tokens.length; i++) {
        if (spec.match[i] !== tokens[i].toLowerCase()) return false;
      }
      return true;
    });

    const nextSet = new Set<string>();
    const phraseCandidates: string[] = [];

    for (const spec of available) {
      if (tokens.length >= spec.match.length) continue;
      const rest = spec.match.slice(tokens.length);
      if (rest.length === 0) continue;
      if (partial && !rest[0].startsWith(partial)) continue;
      nextSet.add(rest[0]);
      phraseCandidates.push([...tokens, ...rest].join(' '));
    }

    const nextTokens = Array.from(nextSet).sort();
    const uniquePhrases = Array.from(new Set(phraseCandidates)).sort();

    if (uniquePhrases.length === 1) {
      return { completed: uniquePhrases[0] + ' ', candidates: uniquePhrases };
    }

    if (nextTokens.length === 1) {
      const base = tokens.join(' ');
      return {
        completed: (base ? base + ' ' : '') + nextTokens[0] + ' ',
        candidates: nextTokens,
      };
    }

    if (nextTokens.length > 1) {
      let lcp = nextTokens[0];
      for (const t of nextTokens.slice(1)) {
        let i = 0;
        while (i < lcp.length && i < t.length && lcp[i] === t[i]) i++;
        lcp = lcp.slice(0, i);
      }
      if (lcp.length > partial.length) {
        const base = tokens.join(' ');
        return {
          completed: (base ? base + ' ' : '') + lcp,
          candidates: nextTokens,
        };
      }
      return { candidates: nextTokens };
    }

    return { candidates: [] };
  }

  execute(line: string): CommandResult {
    const trimmed = line.trim();
    if (!trimmed) return { output: '' };

    const tokens = trimmed.split(/\s+/);
    const device = activeDevice(this.state);
    const spec = findCommand(this.commands, tokens);

    if (!spec) {
      return { output: this.profile.messages.invalid, error: true };
    }

    if (!spec.modes.includes(device.modeCtx.mode)) {
      return {
        output: `${this.profile.messages.invalid}\n(Команда недоступна в режиме ${device.modeCtx.mode})`,
        error: true,
      };
    }

    if (spec.minPrivilege != null && device.privilege < spec.minPrivilege) {
      return { output: this.profile.messages.needEnable, error: true };
    }

    const working = cloneState(this.state);
    const workingDevice = activeDevice(working);
    const result = spec.handler(tokens, working, workingDevice, this.profile);

    if (result.state) {
      this.state = result.state;
    } else if (result.modeCtx) {
      const next = cloneState(this.state);
      next.devices[next.activeDeviceId].modeCtx = result.modeCtx;
      this.state = next;
    }

    if (result.state) this.state = result.state;

    return {
      output: result.output,
      error: result.error,
      state: this.state,
      modeCtx: this.state.devices[this.state.activeDeviceId].modeCtx,
    };
  }

  checkGoals(goals: GoalPredicate[]) {
    return evaluateGoals(this.state, goals);
  }
}
