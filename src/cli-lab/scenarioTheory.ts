/**
 * Explicit curriculum mapping. Never infer answers from hidden diagnostic
 * predicates: links are broad learning topics, not fault-specific spoilers.
 */
export interface CliTheoryTopics {
  all: readonly string[];
  steps: readonly (readonly string[])[];
}

export const CLI_SCENARIO_THEORY: Record<string, CliTheoryTopics> = {
  'cisco-four-switch-host-ring': {
    all: ['cli-vlan-trunk', 'l2-svi', 'cli-ip-static-route', 'ts-method'],
    steps: [['cli-vlan-trunk', 'ts-method'], ['cli-vlan-trunk', 'l2-svi'], ['cli-ip-static-route', 'ts-method']],
  },
  'cisco-ios-modes-basic': {
    all: ['cli-ios-modes', 'cli-show-help-tab'],
    steps: [['cli-ios-modes'], ['cli-ios-modes'], ['cli-ios-modes'], ['cli-ios-modes'],
      ['cli-ios-modes'], ['cli-ios-modes'], ['cli-ios-modes']],
  },
  'cisco-show-diagnostic-basic': {
    all: ['cli-show-help-tab', 'ts-method', 'l2-vlan'],
    steps: [['cli-show-help-tab', 'ts-method'], ['ts-method', 'cli-show-help-tab']],
  },
  'cisco-vlan-access-basic': {
    all: ['l2-vlan', 'cli-vlan-trunk', 'cli-ios-modes'],
    steps: [['cli-ios-modes'], ['cli-ios-modes'], ['l2-vlan', 'cli-vlan-trunk'],
      ['cli-vlan-trunk', 'l2-vlan']],
  },
  'cisco-access-vlan-svi-followup': {
    all: ['l2-svi', 'cli-ip-static-route', 'cli-ios-modes'],
    steps: [['l2-svi', 'cli-ip-static-route'], ['cli-ip-static-route', 'cli-ios-modes']],
  },
  'cisco-trunk-basic': {
    all: ['cli-vlan-trunk', 'l2-vlan'],
    steps: [['cli-ios-modes'], ['l2-vlan'], ['cli-vlan-trunk'], ['cli-vlan-trunk']],
  },
  'cisco-l3-gateway-basic': {
    all: ['cli-ip-static-route', 'cli-ios-modes'],
    steps: [['cli-ios-modes'], ['cli-ios-modes'], ['cli-ip-static-route'], ['cli-ip-static-route']],
  },
  'cisco-two-switch-vlan10': {
    all: ['cli-vlan-trunk', 'l2-vlan', 'cli-ios-modes'],
    steps: [['cli-vlan-trunk'], ['cli-vlan-trunk'], ['cli-vlan-trunk'],
      ['cli-vlan-trunk', 'l2-vlan'], ['cli-ios-modes'], ['cli-ios-modes']],
  },
  'cisco-two-switch-management-svi': {
    all: ['l2-svi', 'cli-vlan-trunk', 'cli-ip-static-route', 'cli-ios-modes'],
    steps: [['cli-vlan-trunk'], ['l2-svi', 'cli-ip-static-route'], ['cli-vlan-trunk'],
      ['l2-svi', 'cli-ip-static-route'], ['cli-show-help-tab', 'ts-method'], ['cli-ios-modes']],
  },
  'cisco-three-switch-l2-diagnostics': {
    all: ['cli-vlan-trunk', 'ts-method', 'cli-show-help-tab'],
    steps: [['ts-method', 'cli-vlan-trunk'], ['ts-method', 'cli-ios-modes']],
  },
  'cisco-two-switch-vlan-selective-diagnostics': {
    all: ['cli-vlan-trunk', 'ts-method', 'cli-show-help-tab'],
    steps: [['ts-method', 'cli-vlan-trunk'], ['ts-method', 'cli-ios-modes']],
  },
};

export function scenarioTheoryIds(scenarioId: string, stepIndex?: number): readonly string[] {
  const topics = CLI_SCENARIO_THEORY[scenarioId];
  if (!topics) return [];
  return stepIndex === undefined ? topics.all : topics.steps[stepIndex] ?? topics.all;
}
