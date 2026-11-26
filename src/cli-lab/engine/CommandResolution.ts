import { CommandArgument, CommandSpec, DeviceMode, DeviceState } from './types';

/** Enter and TAB give an exact keyword precedence over longer prefixes. */
export function matchingKeywords(keywords: string[], token: string): string[] {
  const partial = token.toLowerCase();
  return keywords.includes(partial) ? [partial] : keywords.filter(k => k.startsWith(partial));
}

/** Resolve a completed 'do' prefix with the same mode/privilege rules as Enter. */
export function commandContext(specs: CommandSpec[], words: string[], mode: DeviceMode, privilege: number) {
  const leading = resolveKeywords(specs, words.slice(0, 1), mode, privilege);
  const delegated = words.length > 0 && !leading.ambiguous && leading.tokens[0] === 'do' &&
    leading.candidates.some(s => s.match.length === 1 && s.match[0] === 'do');
  return {
    delegated,
    specs: delegated ? specs.filter(s => s.match[0] !== 'do') : specs,
    words: delegated ? words.slice(1) : words,
    mode: delegated ? 'privileged' as const : mode,
    privilege: delegated ? 15 : privilege,
  };
}

/**
 * Resolve IOS-like abbreviations against registered executable command paths.
 * A keyword may be abbreviated only when it identifies one keyword at its
 * position in the current mode. Exact keywords take precedence over prefixes.
 * Arguments (interfaces, VLANs, hostnames...) are never abbreviated here.
 */
export function resolveKeywords(
  specs: CommandSpec[],
  words: string[],
  mode: DeviceMode,
  privilege: number,
): { tokens: string[]; candidates: CommandSpec[]; ambiguous?: string[] } {
  let candidates = specs.filter(s => s.modes.includes(mode) && (s.minPrivilege ?? 0) <= privilege);
  const tokens = [...words];
  for (let i = 0; i < words.length; i++) {
    const token = words[i].toLowerCase();
    const keywords = Array.from(new Set(candidates.filter(s => s.match.length > i).map(s => s.match[i])));
    if (!keywords.length) break; // argument, not a registered keyword
    const matching = matchingKeywords(keywords, token);
    if (!matching.length) break; // argument to a completed command path
    if (matching.length > 1) return { tokens, candidates: [], ambiguous: matching.sort() };
    tokens[i] = matching[0];
    candidates = candidates.filter(s => s.match.length <= i || s.match[i] === matching[0]);
    // A completed command with arguments can also stay eligible, but only
    // when the token is not a keyword of another command branch.
  }
  return { tokens, candidates };
}

export interface CommandInspection {
  invalidReason?: string;
  status: 'complete' | 'incomplete' | 'invalid' | 'ambiguous';
  tokens: string[];
  spec?: CommandSpec;
  ambiguous?: string[];
  next: CommandArgument[];
}

/** Walk the registered keyword paths and typed suffixes without invoking handlers. */
export function inspectCommand(
  specs: CommandSpec[], words: string[], mode: DeviceMode, privilege: number, device?: DeviceState,
): CommandInspection {
  const context = commandContext(specs, words, mode, privilege);
  let branches = context.specs.filter(s => s.modes.includes(context.mode) && (s.minPrivilege ?? 0) <= context.privilege &&
      (!s.available || !!device && s.available(device)))
    .flatMap(spec => (spec.arguments ?? [[]]).map(args => ({
      spec, path: [...spec.match.map(keyword => ({ keyword })), ...args] as CommandArgument[],
    })));
  const tokens = [...context.words];
  const at = (path: CommandArgument[], index: number): CommandArgument | undefined => {
    const last = path[path.length - 1];
    return path[index] ?? (last && 'rest' in last && last.rest ? last : undefined);
  };
  for (let i = 0; i < tokens.length; i++) {
    const keywords = [...new Set(branches.flatMap(b => {
      const node = at(b.path, i);
      return node && 'keyword' in node ? [node.keyword] : [];
    }))];
    const matching = matchingKeywords(keywords, tokens[i]);
    if (matching.length > 1) return { status: 'ambiguous', tokens: words, ambiguous: matching.sort(), next: [] };
    if (matching.length === 1) {
      tokens[i] = matching[0];
      branches = branches.filter(b => {
        const node = at(b.path, i);
        return node && 'keyword' in node && node.keyword === matching[0];
      });
    } else {
      const messages = new Set<string>();
      branches = branches.filter(b => {
        const node = at(b.path, i);
        if (!node || !('validate' in node)) return false;
        const valid = node.validate(tokens[i], device, tokens.slice(0, i));
        if (!valid && node.invalidMessage) messages.add(node.invalidMessage);
        return valid;
      });
      if (!branches.length && messages.size === 1) {
        return { status: 'invalid', tokens: words, next: [], invalidReason: [...messages][0] };
      }
    }
    if (!branches.length) return { status: 'invalid', tokens: words, next: [] };
  }
  const complete = branches.filter(b => b.path.length <= tokens.length)
    .sort((a, b) => b.spec.match.length - a.spec.match.length)[0];
  const next = branches.flatMap(b => {
    const node = at(b.path, tokens.length);
    return node ? [node] : [];
  });
  const outer = context.delegated ? specs.find(s => s.match.length === 1 && s.match[0] === 'do') : undefined;
  return {
    status: complete ? 'complete' : branches.length ? 'incomplete' : 'invalid',
    tokens: context.delegated ? ['do', ...tokens] : tokens,
    spec: complete ? outer ?? complete.spec : undefined,
    next,
  };
}

export function commandFor(
  specs: CommandSpec[], words: string[], mode: DeviceMode, privilege: number, device?: DeviceState,
): CommandInspection {
  return inspectCommand(specs, words, mode, privilege, device);
}
