import { CommandSpec, DeviceState, DeviceMode } from './types';
import { resolveKeywords } from './CommandResolution';

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
  conf: 'Enter configuration mode (abbreviation)',
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
  run: 'Running configuration (abbreviation)',
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
  wr: 'Write configuration (abbreviation)',
  write: 'Write configuration',
};

const argumentHelp: Record<string, { name: string; detail: string }> = {
  'cisco.hostname': { name: 'WORD', detail: 'Device hostname' },
  'cisco.vlan': { name: '<1-4094>', detail: 'VLAN identifier' },
  'cisco.vlan_name': { name: 'WORD', detail: 'VLAN name' },
  'cisco.interface': { name: 'INTERFACE', detail: 'Interface name, e.g. Fa0/24' },
  'cisco.switchport_access_vlan': { name: '<1-4094>', detail: 'Access VLAN identifier' },
  'cisco.switchport_trunk_allowed_vlan': { name: '<vlan-list>', detail: 'Replace allowed VLANs, e.g. 10,20' },
  'cisco.switchport_trunk_allowed_vlan_add': { name: '<vlan-list>', detail: 'VLANs to add (e.g. 20 or 10,20)' },
  'cisco.switchport_trunk_allowed_vlan_remove': { name: '<vlan-list>', detail: 'VLANs to remove (e.g. 20 or 10,20)' },
  'cisco.ip_address': { name: 'A.B.C.D', detail: 'IPv4 address, followed by subnet mask' },
  'cisco.ip_route': { name: 'A.B.C.D', detail: 'Destination network, mask and next hop' },
  'cisco.show_interfaces': { name: 'INTERFACE', detail: 'Interface name, e.g. Fa0/24' },
  'cisco.show_interface': { name: 'INTERFACE', detail: 'Interface name, e.g. Fa0/24' },
};

function format(items: Map<string, string>): string {
  if (!items.size) return '% Unrecognized command at this position (CLI Lab subset).';
  return [...items].sort(([a], [b]) => a.localeCompare(b)).map(([key, label]) =>
    `  ${key.padEnd(22)} ${label}`).join('\n');
}

/** true when a keyword is valid in the current configuration/privilege context. */
function available(commands: CommandSpec[], mode: DeviceMode, privilege: number): CommandSpec[] {
  return commands.filter(spec =>
    spec.modes.includes(mode) &&
    (spec.minPrivilege == null || privilege >= spec.minPrivilege) &&
    spec.id !== 'cisco.show_incomplete' &&
    spec.id !== 'cisco.show_help' &&
    spec.id !== 'cisco.help_question'
  );
}

export function contextualHelp(commands: CommandSpec[], device: DeviceState, line: string): string {
  // Input includes the question mark, which is not part of the actual command.
  const raw = line.slice(0, -1);
  const spaceBeforeQuestion = /\s$/.test(raw);
  const parts = raw.trim() ? raw.trim().split(/\s+/) : [];
  const partial = spaceBeforeQuestion ? '' : (parts.pop() ?? '').toLowerCase();
  let completed = parts.map(x => x.toLowerCase());
  let mode = device.modeCtx.mode;
  let privilege = device.privilege;

  // Cisco 'do show ... ?' from configuration modes queries privileged EXEC.
  if (completed[0] === 'do' && ['config', 'config-if', 'config-vlan'].includes(mode)) {
    completed = completed.slice(1);
    mode = 'privileged';
    privilege = 15;
  }

  const items = new Map<string, string>();
  const specs = available(commands, mode, privilege);
  // Resolve already typed unique abbreviations, but keep the trailing partial
  // keyword untouched so '?' still lists its possible expansions.
  const resolved = resolveKeywords(specs, completed, mode, privilege);
  if (resolved.ambiguous) {
    for (const word of resolved.ambiguous) items.set(word, keywordDescriptions[word] ?? 'CLI keyword');
    return format(items);
  }
  completed = resolved.tokens.map(token => token.toLowerCase());

  for (const spec of specs) {
    const path = spec.match;
    const prefix = completed.every((token, i) => i < path.length && path[i] === token);
    if (!prefix) continue;
    if (completed.length < path.length) {
      const next = path[completed.length];
      if (next.startsWith(partial)) items.set(next, keywordDescriptions[next] ?? 'Supported CLI keyword');
    } else if (!partial) {
      // Only registered executable command branches advertise an argument.
      const arg = argumentHelp[spec.id];
      if (arg) items.set(arg.name, arg.detail);
      // These commands can be submitted as-is.
      if (!arg && spec.id !== 'cisco.do' && spec.id !== 'cisco.switchport_trunk_allowed_vlan') items.set('<cr>', 'Execute command');
    }
  }

  // 'do ?' in config mode shows executable privileged commands.
  if (mode === device.modeCtx.mode && completed.length === 0 &&
      ['config', 'config-if', 'config-vlan'].includes(mode) && 'do'.startsWith(partial)) {
    items.set('do', keywordDescriptions.do);
  }

  // 'show interfaces Fa0/24 ?' is a dynamic-argument command, handled by the registered
  // show interfaces handler. Validate port before offering the switchport subcommand.
  if (!partial && completed.length === 3 &&
      (completed[0] === 'show') &&
      (completed[1] === 'interfaces' || completed[1] === 'interface')) {
    const iface = completed[2].replace(/^fa(?=\d)/, 'fastethernet').replace(/^gi(?=\d)/, 'gigabitethernet');
    if (Object.keys(device.interfaces).some(x => x.toLowerCase() === iface)) {
      items.set('<cr>', 'Display interface details');
      if (completed[1] === 'interfaces') items.set('switchport', 'Display interface switching configuration');
    }
  }

  // For command parameters supplied after executable keywords, avoid a misleading <cr>
  // for an incomplete trailing argument (e.g. interface Fa0/24): support the common cases.
  if (items.size === 0 && !partial && completed.length >= 2) {
    const joined = completed.join(' ');
    if (/^interface\s+\S+$/.test(joined) && device.interfaces[completed[1].replace(/^fa(?=\d)/, 'fastethernet').replace(/^gi(?=\d)/, 'gigabitethernet')]) {
      items.set('<cr>', 'Enter interface configuration mode');
    } else if (/^vlan\s+\d+$/.test(joined) && +completed[1] >= 1 && +completed[1] <= 4094) {
      items.set('<cr>', 'Select VLAN');
    } else if (/^switchport access vlan\s+\d+$/.test(joined) && +completed[3] >= 1 && +completed[3] <= 4094) {
      items.set('<cr>', 'Assign access VLAN');
    } else if (/^switchport trunk allowed vlan\s+(?:(?:add|remove)\s+)?\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.test(joined)) {
      items.set('<cr>', 'Set allowed VLANs');
    }
  }

  return format(items);
}
