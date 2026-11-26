import type { CommandSpec, DeviceMode, Scenario } from '../../engine/types';
import { ciscoIosCommands } from './commands';

export type CommandCategory = 'navigation' | 'configuration' | 'diagnostics' | 'persistence' | 'help';

export interface CiscoCommandEntry {
  id: string;
  syntax: string;
  modes: DeviceMode[];
  category: CommandCategory;
  topics: string[];
  explanation: string;
  /** Executable in the CLI Lab: generated strictly from registered handlers. */
  implemented: true;
}

// Metadata for real command handlers. The registry is NOT a claim of complete IOS coverage.
// For new commands, add the handler to ciscoIosCommands first, then metadata here.
// Unknown implementations remain visible as "other" with no fabricated description.
const metadata: Record<string, { category: CommandCategory; topics: string[]; explanation: string }> = {
  'cisco.show_ip_interface': { category: 'diagnostics', topics: ["ipv4","svi","diagnostics"], explanation: 'Детальный просмотр IP-адреса и маски указанного интерфейса.' },
  'cisco.spanning_tree': { category: 'diagnostics', topics: ["stp","diagnostics"], explanation: 'Состояние CST: корень и роли портов.' },
  'cisco.stp_bridge_priority': { category: 'configuration', topics: ["stp"], explanation: 'Приоритет Root Bridge в едином CST (только VLAN 1 в модели).' },
  'cisco.no_stp_bridge_priority': { category: 'configuration', topics: ["stp"], explanation: 'Сброс приоритета моста CST.' },
  'cisco.stp_cost': { category: 'configuration', topics: ["stp"], explanation: 'Стоимость пути порта в CST.' },
  'cisco.no_stp_cost': { category: 'configuration', topics: ["stp"], explanation: 'Сброс стоимости пути порта CST.' },
  'cisco.stp_port_priority': { category: 'configuration', topics: ["stp"], explanation: 'Приоритет порта в CST.' },
  'cisco.no_stp_port_priority': { category: 'configuration', topics: ["stp"], explanation: 'Сброс приоритета порта CST.' },
  'cisco.switchport_trunk_allowed_vlan_add': { category: 'configuration', topics: ["trunk","l2-path"], explanation: 'Добавить VLAN к разрешённым на trunk, не стирая остальные.' },
  'cisco.switchport_trunk_allowed_vlan_remove': { category: 'configuration', topics: ["trunk","l2-path"], explanation: 'Удалить VLAN из списка разрешённых на trunk.' },
  'cisco.enable': { category: 'navigation', topics: [], explanation: 'Вход в privileged EXEC.' },
  'cisco.disable': { category: 'navigation', topics: [], explanation: 'Выход из privileged EXEC.' },
  'cisco.exit': { category: 'navigation', topics: [], explanation: 'Выход из текущего режима.' },
  'cisco.end': { category: 'navigation', topics: [], explanation: 'Возврат из конфигурации в privileged EXEC.' },
  'cisco.configure_terminal': { category: 'navigation', topics: [], explanation: 'Вход в глобальную конфигурацию.' },
  'cisco.configure_terminal_short': { category: 'navigation', topics: [], explanation: 'Сокращённый вход в глобальную конфигурацию.' },
  'cisco.interface': { category: 'configuration', topics: ['access-port', 'trunk', 'interface-admin', 'l2-path', 'multi-device'], explanation: 'Выбор интерфейса для настройки.' },
  'cisco.vlan': { category: 'configuration', topics: ['vlan', 'trunk', 'access-port', 'l2-path'], explanation: 'Создание или выбор локального VLAN.' },
  'cisco.vlan_name': { category: 'configuration', topics: ['vlan'], explanation: 'Имя выбранного VLAN.' },
  'cisco.switchport_mode_access': { category: 'configuration', topics: ['vlan', 'access-port'], explanation: 'Режим access на порту.' },
  'cisco.switchport_access_vlan': { category: 'configuration', topics: ['vlan', 'access-port'], explanation: 'Назначение VLAN на access-порт.' },
  'cisco.switchport_mode_trunk': { category: 'configuration', topics: ['trunk', 'l2-path'], explanation: 'Включение trunk-режима.' },
  'cisco.switchport_trunk_allowed_vlan': { category: 'configuration', topics: ['trunk', 'l2-path'], explanation: 'Список разрешённых VLAN на trunk.' },
  'cisco.no_shutdown': { category: 'configuration', topics: ['interface-admin', 'trunk', 'access-port', 'l2-path'], explanation: 'Административное включение порта.' },
  'cisco.shutdown': { category: 'configuration', topics: ['interface-admin', 'diagnostics'], explanation: 'Административное выключение порта.' },
  'cisco.show_interfaces': { category: 'diagnostics', topics: ['interface-admin', 'trunk', 'access-port', 'diagnostics', 'l2-path'], explanation: 'Текущее состояние и настройки портов в модели.' },
  'cisco.show_interface': { category: 'diagnostics', topics: ['interface-admin', 'diagnostics'], explanation: 'Диагностика выбранного интерфейса.' },
  'cisco.show_interfaces_status': { category: 'diagnostics', topics: ['interface-admin', 'diagnostics'], explanation: 'Краткая таблица портов.' },
  'cisco.show_interfaces_trunk': { category: 'diagnostics', topics: ['trunk', 'diagnostics', 'l2-path'], explanation: 'Список trunk-портов и разрешённых VLAN.' },
  'cisco.show_vlan_brief': { category: 'diagnostics', topics: ['vlan', 'diagnostics', 'l2-path'], explanation: 'Список VLAN на выбранном устройстве.' },
  'cisco.show_ip_interface_brief': { category: 'diagnostics', topics: ['ipv4', 'interface-admin', 'diagnostics'], explanation: 'Состояние портов и IP-адреса.' },
  'cisco.show_running_config': { category: 'diagnostics', topics: ['diagnostics', 'vlan', 'trunk', 'ipv4'], explanation: 'Текущая рабочая конфигурация.' },
  'cisco.show_startup_config': { category: 'diagnostics', topics: ['diagnostics'], explanation: 'Сохранённая конфигурация.' },
  'cisco.copy_running_startup': { category: 'persistence', topics: [], explanation: 'Сохранение running-config в startup-config.' },
  'cisco.write_memory': { category: 'persistence', topics: [], explanation: 'Сохранение текущей конфигурации.' },
  'cisco.wr_mem': { category: 'persistence', topics: [], explanation: 'Короткая форма сохранения конфигурации.' },
  'cisco.reload_simulated': { category: 'persistence', topics: [], explanation: 'Учебная перезагрузка: восстановление сохранённой конфигурации.' },
  'cisco.show_help': { category: 'help', topics: [], explanation: 'Список поддерживаемых веток show.' },
  'cisco.help_question': { category: 'help', topics: [], explanation: 'Общая помощь по режиму CLI.' },
};

function classifyFallback(spec: CommandSpec): CommandCategory {
  if (spec.match[0] === 'show') return 'diagnostics';
  if (spec.match[0] === '?' || spec.match.includes('?')) return 'help';
  return 'configuration';
}

export function listCiscoCommands(): CiscoCommandEntry[] {
  return ciscoIosCommands.map(spec => {
    const meta = metadata[spec.id];
    return {
      id: spec.id,
      syntax: spec.match.join(' '),
      modes: [...spec.modes],
      category: meta?.category ?? classifyFallback(spec),
      topics: meta?.topics ?? [],
      explanation: meta?.explanation ?? 'Команда реализована в учебной подмодели Cisco IOS; подробное описание ещё не добавлено.',
      implemented: true,
    };
  });
}

/**
 * Recommendations affect study hints ONLY. All registered commands remain available
 * in their normal privilege/CLI modes, regardless of the selected scenario.
 */
export function commandCatalogForScenario(scenario: Pick<Scenario, 'concepts'>): {
  recommended: CiscoCommandEntry[];
  otherDiagnostics: CiscoCommandEntry[];
  otherCommands: CiscoCommandEntry[];
} {
  const catalog = listCiscoCommands();
  const concepts = new Set(scenario.concepts);
  const recommended = catalog.filter(x => x.topics.some(t => concepts.has(t)) ||
    x.category === 'navigation' || x.category === 'persistence' || x.category === 'help');
  const selected = new Set(recommended.map(x => x.id));
  return {
    recommended,
    otherDiagnostics: catalog.filter(x => !selected.has(x.id) && x.category === 'diagnostics'),
    otherCommands: catalog.filter(x => !selected.has(x.id) && x.category !== 'diagnostics'),
  };
}
