import { contextualHelp } from './ContextualHelp';
import { commandFor, inspectCommand, matchingKeywords } from './CommandResolution';
import { initializeStartupConfigs } from './ConfigPersistence';
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


export class LabEngine {
  constructor(
    private profile: VendorProfile,
    private commands: CommandSpec[],
    private state: NetworkState
  ) {
    this.state = initializeStartupConfigs(state);
  }

  getState(): NetworkState {
    return this.state;
  }

  setState(state: NetworkState) {
    this.state = initializeStartupConfigs(state);
  }

  /** Switch console target without resetting either device's mode/configuration. */
  selectDevice(deviceId: string): boolean {
    if (!this.state.devices[deviceId]) return false;
    this.state = { ...this.state, activeDeviceId: deviceId };
    return true;
  }

  getPrompt(): string {
    return this.profile.prompt(activeDevice(this.state));
  }

  reset(initial: NetworkState) {
    this.state = initializeStartupConfigs(cloneState(initial));
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

    // An empty prefix is not a request to invent the next command keyword.
    // In particular, repeated Tab presses must never construct a command.
    if (!partial) return { candidates: [] };

    const parsed = inspectCommand(this.commands, tokens, mode, priv, device);
    if (parsed.ambiguous) return { candidates: parsed.ambiguous };
    if (parsed.status === 'invalid') return { candidates: [] };
    // Argument values are validated, never invented by TAB. Keywords after
    // dynamic arguments use the same path as Enter and contextual help.
    const keywords = [...new Set(parsed.next.flatMap(node => 'keyword' in node ? [node.keyword] : []))];
    const nextTokens = matchingKeywords(keywords, partial).sort();

    const base = tokens.join(' ');
    const prefix = base ? base + ' ' : '';
    if (nextTokens.length === 1) {
      return { completed: prefix + nextTokens[0] + ' ', candidates: nextTokens };
    }

    if (nextTokens.length > 1) {
      let common = nextTokens[0];
      for (const word of nextTokens.slice(1)) {
        let i = 0;
        while (i < common.length && i < word.length && common[i] === word[i]) i++;
        common = common.slice(0, i);
      }
      if (common.length > partial.length) {
        return { completed: prefix + common, candidates: nextTokens };
      }
      return { candidates: nextTokens };
    }

    return { candidates: [] };
  }

  /** Context-sensitive ? help, read-only and available independent of scenario. */
  help(line: string): string {
    const trimmedEnd = line.trimEnd();
    return contextualHelp(this.commands, activeDevice(this.state), trimmedEnd.endsWith('?') ? trimmedEnd : line + '?');
  }

  execute(line: string): CommandResult {
    const trimmed = line.trim();
    if (!trimmed) return { output: '' };
    if (trimmed.endsWith('?')) return { output: this.help(line) };

    const tokens = trimmed.split(/\s+/);
    const device = activeDevice(this.state);
    const resolved = commandFor(this.commands, tokens, device.modeCtx.mode, device.privilege, device);
    if (resolved.ambiguous) {
      return { output: '% Ambiguous command: ' + resolved.ambiguous.join(', '), error: true };
    }
    if (resolved.status === 'incomplete') return { output: this.profile.messages.incomplete, error: true };
    const spec = resolved.spec;
    if (!spec) {
      // Do not silently accept a command from another IOS configuration mode.
      // Only report wrong mode if a full command, including its arguments,
      // resolves in another mode. Matching leading keywords is insufficient.
      const elsewhere = this.commands.some(s =>
        !s.modes.includes(device.modeCtx.mode) && s.modes.some(mode =>
          inspectCommand(this.commands, tokens, mode, Math.max(device.privilege, s.minPrivilege ?? 0), device).spec === s
        )
      );
      return { output: elsewhere ? this.profile.messages.invalid + '\n(Команда недоступна в этом режиме)' : this.profile.messages.invalid, error: true };
    }

    const working = cloneState(this.state);
    const workingDevice = activeDevice(working);
    const result = spec.handler(resolved.tokens, working, workingDevice, this.profile);

    if (!result.error && result.state) {
      this.state = result.state;
    } else if (!result.error && result.modeCtx) {
      const next = cloneState(this.state);
      next.devices[next.activeDeviceId].modeCtx = result.modeCtx;
      this.state = next;
    }

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
