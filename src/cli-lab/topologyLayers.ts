import type { Scenario } from './engine/types';

/** Display only facts actually represented by the CLI NetworkState. */
export type TopologyLayer = 'phy' | 'vlan' | 'stp' | 'ip';
export type TopologyLayerChoice = 'auto' | TopologyLayer;

/**
 * A stable, public scenario-level choice, not a guess from hidden diagnostic
 * predicates or a live CLI command. It must not reveal the fault in a task.
 */
export function defaultTopologyLayer(scenario: Pick<Scenario, 'concepts'>): TopologyLayer {
  const tags = new Set(scenario.concepts.map(value => value.toLowerCase()));
  if (['stp', 'rstp', 'mstp'].some(tag => tags.has(tag))) return 'stp';
  if (tags.has('svi') || tags.has('ipv4') || tags.has('static-route')) return 'ip';
  if (['vlan', 'trunk', 'access-port', 'l2-path'].some(tag => tags.has(tag))) return 'vlan';
  return 'phy';
}

export function resolveTopologyLayer(
  selected: TopologyLayerChoice,
  scenario: Pick<Scenario, 'concepts'>,
): TopologyLayer {
  return selected === 'auto' ? defaultTopologyLayer(scenario) : selected;
}
