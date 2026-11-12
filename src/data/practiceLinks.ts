export type PracticeLink =
  | 'vlan' | 'packet' | 'dhcp' | 'nat' | 'tcp'
  | 'cli-vlan' | 'cli-trunk' | 'cli-gateway' | 'cli-modes' | 'cli-diagnostic' | 'cli-svi' | 'cli-svi-followup';

interface PracticeDestination {
  simulator: 'journey' | 'vlan' | 'protocols' | 'cli';
  protocol?: 'dhcp' | 'nat' | 'tcp';
  scenarioId?: string;
}

export const PRACTICE_DESTINATIONS: Record<PracticeLink, PracticeDestination> = {
  vlan: { simulator: 'vlan' },
  packet: { simulator: 'journey' },
  dhcp: { simulator: 'protocols', protocol: 'dhcp' },
  nat: { simulator: 'protocols', protocol: 'nat' },
  tcp: { simulator: 'protocols', protocol: 'tcp' },
  'cli-modes': { simulator: 'cli', scenarioId: 'cisco-ios-modes-basic' },
  'cli-diagnostic': { simulator: 'cli', scenarioId: 'cisco-show-diagnostic-basic' },
  'cli-vlan': { simulator: 'cli', scenarioId: 'cisco-vlan-access-basic' },
  'cli-trunk': { simulator: 'cli', scenarioId: 'cisco-trunk-basic' },
  'cli-gateway': { simulator: 'cli', scenarioId: 'cisco-l3-gateway-basic' },
  'cli-svi': { simulator: 'cli', scenarioId: 'cisco-two-switch-management-svi' },
  'cli-svi-followup': { simulator: 'cli', scenarioId: 'cisco-access-vlan-svi-followup' },
};
