import { CommandSpec, DeviceState } from './types';
import { inspectCommand } from './CommandResolution';

/**
 * Cisco-like contextual CLI help. The tree is built from executable command specs
 * (not from scenario hints), so unsupported keywords never appear.
 * Output is a lab approximation, not an IOS command reference.
 */
const keywordDescriptions: Record<string, string> = {
  access: 'Access-port characteristics',
  add: 'Add VLANs without replacing the current allowed list',
  all: 'Permit all VLANs (1-4094)',
  address: 'Configure IPv4 address',
  allowed: 'Set permitted trunk VLANs',
  brief: 'Brief summary',
  configure: 'Enter configuration mode',
  copy: 'Copy running configuration',
  disable: 'Leave privileged EXEC',
  do: 'Run EXEC command from configuration mode',
  enable: 'Enter privileged EXEC',
  end: 'Leave configuration mode',
  exit: 'Exit current mode',
  hostname: 'Set device hostname',
  interface: 'Select or inspect an interface',
  interfaces: 'Interface information',
  ip: 'IP-related commands',
  memory: 'Save configuration',
  mode: 'Select switchport mode',
  name: 'Set VLAN name',
  no: 'Negate a command',
  none: 'Permit no VLANs on this trunk',
  reload: 'Simulated device reload',
  remove: 'Remove VLANs from the current allowed list',
  route: 'Static routes / route display',
  'running-config': 'Current configuration',
  show: 'Show device information',
  shutdown: 'Administratively disable interface',
  startup: 'Startup configuration',
  'startup-config': 'Saved startup configuration',
  status: 'Interface status summary',
  switchport: 'Layer 2 switching configuration',
  terminal: 'Configure from terminal',
  trunk: 'Trunk-port characteristics',
  vlan: 'VLAN configuration or display',
  vlans: 'VLAN selection',
  write: 'Write configuration',
};

function format(items: Map<string, string>): string {
  if (!items.size) return '% Unrecognized command at this position (CLI Lab subset).';
  return [...items].sort(([a], [b]) => a.localeCompare(b)).map(([key, label]) =>
    `  ${key.padEnd(22)} ${label}`).join('\n');
}

export function contextualHelp(commands: CommandSpec[], device: DeviceState, line: string): string {
  const raw = line.slice(0, -1);
  const spaceBeforeQuestion = /\s$/.test(raw);
  const completed = raw.trim() ? raw.trim().split(/\s+/) : [];
  const partial = spaceBeforeQuestion ? '' : (completed.pop() ?? '').toLowerCase();
  const parsed = inspectCommand(commands, completed, device.modeCtx.mode, device.privilege, device);
  const items = new Map<string, string>();
  if (parsed.ambiguous) {
    for (const word of parsed.ambiguous) items.set(word, keywordDescriptions[word] ?? 'CLI keyword');
    return format(items);
  }
  if (parsed.status === 'invalid') return format(items);
  for (const node of parsed.next) {
    if ('keyword' in node) {
      if (node.keyword.startsWith(partial)) items.set(node.keyword, node.description ?? keywordDescriptions[node.keyword] ?? 'CLI keyword');
    } else if (!partial || node.validate(partial, device, parsed.tokens)) {
      items.set(node.name, node.description);
    }
  }
  if (!partial && parsed.status === 'complete') items.set('<cr>', 'Execute command');

  const output = format(items);
  // Word help never silently becomes syntax help: preserve space/no-space semantics.
  if (!spaceBeforeQuestion && partial && items.has(partial)) {
    const next = inspectCommand(commands, [...completed, partial], device.modeCtx.mode, device.privilege, device);
    if (next.next.length) return output + '\n\n' +
      '  Подсказка: для списка подкоманд добавьте пробел перед ?: ' + [...completed, partial].join(' ') + ' ?';
  }
  return output;
}
