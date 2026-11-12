/** CLI Lab 2.0 — core types (vendor-agnostic engine) */

export type VendorId =
  | 'cisco-ios'
  | 'eltex-mes'
  | 'huawei-vrp'
  | 'h3c-comware'
  | 'mikrotik-ros'
  | 'siemens-scalance'
  | 'linux-host';

export type LabMode = 'learn' | 'drill' | 'task';

export type DeviceMode =
  | 'exec'
  | 'privileged'
  | 'config'
  | 'config-if'
  | 'config-vlan'
  | 'unknown';

export interface ModeContext {
  mode: DeviceMode;
  ifName?: string;
  vlanId?: number;
}

export interface Ipv4Address {
  address: string;
  prefix: number;
  mask: string;
}

export interface SwitchportConfig {
  mode: 'access' | 'trunk' | 'unset';
  accessVlan?: number;
  trunkAllowed?: number[];
}

export interface InterfaceState {
  name: string;
  adminUp: boolean;
  /** @deprecated Legacy scenario/snapshot input only; effective status comes from OperationalState. */
  operUp?: boolean;
  ipv4?: Ipv4Address;
  switchport?: SwitchportConfig;
  description?: string;
}

export interface VlanState {
  id: number;
  name?: string;
  active: boolean;
}

export interface RouteEntry {
  prefix: string;
  prefixLen: number;
  nextHop?: string;
  iface?: string;
  metric?: number;
}

export type InterfaceConfig = Omit<InterfaceState, 'operUp'>;

export interface SavedDeviceConfig {
  hostname: string;
  interfaces: Record<string, InterfaceConfig>;
  vlans: Record<number, VlanState>;
  routes: RouteEntry[];
}

export interface DeviceState {
  id: string;
  hostname: string;
  vendor: VendorId;
  privilege: number;
  modeCtx: ModeContext;
  interfaces: Record<string, InterfaceState>;
  vlans: Record<number, VlanState>;
  routes: RouteEntry[];
  startupConfig?: SavedDeviceConfig;
}

export interface NetworkLink {
  a: string;
  aIf: string;
  b: string;
  bIf: string;
  up: boolean;
}

export interface NetworkState {
  devices: Record<string, DeviceState>;
  links: NetworkLink[];
  activeDeviceId: string;
}

export interface CommandResult {
  output: string;
  error?: boolean;
  state?: NetworkState;
  modeCtx?: ModeContext;
}

export type GoalPredicate =
  | { type: 'if.admin'; device: string; ifName: string; up: boolean }
  | { type: 'if.accessVlan'; device: string; ifName: string; vlanId: number }
  | { type: 'if.switchportMode'; device: string; ifName: string; mode: 'access' | 'trunk' }
  | { type: 'vlan.exists'; device: string; vlanId: number; name?: string }
  | { type: 'if.ipv4'; device: string; ifName: string; address: string; prefix: number }
  | { type: 'hostname'; device: string; hostname: string }
  | { type: 'route.exists'; device: string; prefix: string; prefixLen: number; nextHop?: string }
  | { type: 'if.trunkAllowed'; device: string; ifName: string; vlans: number[] }
  | { type: 'mode'; device: string; modes: DeviceMode[] }
  | { type: 'privilege'; device: string; min: number }
  | { type: 'config.saved'; device: string }
  | { type: 'l2.vlanReachable'; vlanId: number; fromDevice: string; fromIf: string; toDevice: string; toIf: string }
  | { type: 'ipv4.sviReachable'; device: string; destination: string };

export interface GoalCheckResult {
  predicate: GoalPredicate;
  passed: boolean;
  detail: string;
}

export interface ScenarioStep {
  id: string;
  instruction: string;
  explanation?: string;
  hint?: string;
  accept: GoalPredicate[];
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  vendor: VendorId;
  concepts: string[];
  difficulty: 1 | 2 | 3;
  modesAllowed: LabMode[];
  initialState: NetworkState;
  steps?: ScenarioStep[];
  goals: GoalPredicate[];
  successMessage: string;
  /** Optional guided next scenario shown only after successful completion. */
  nextScenarioId?: string;
  /** Diagnostic exercises keep the root cause and repair target hidden until solved. */
  diagnostic?: boolean;
  /** Learner-facing goals; unlike internal predicates these must not disclose the fault. */
  publicGoalLabels?: string[];
}

export interface VendorProfile {
  id: VendorId;
  displayName: string;
  capabilities: string[];
  initialMode: ModeContext;
  prompt: (device: DeviceState) => string;
  messages: {
    invalid: string;
    incomplete: string;
    needEnable: string;
  };
}

export interface ParsedCommand {
  raw: string;
  tokens: string[];
}

export type CommandHandler = (
  tokens: string[],
  state: NetworkState,
  device: DeviceState,
  profile: VendorProfile
) => CommandResult;

/** A suffix node after a command's canonical keyword path. Validators are read-only. */
export type CommandArgument =
  | { keyword: string; description?: string }
  | { name: string; description: string;
      validate: (value: string, device: DeviceState | undefined, preceding: string[]) => boolean;
      /** A final free-text argument can consume multiple words (e.g. VLAN name). */
      rest?: boolean };

export interface CommandSpec {
  id: string;
  match: string[];
  modes: DeviceMode[];
  minPrivilege?: number;
  /** Alternative argument paths; omitted means exactly the registered keywords. */
  arguments?: CommandArgument[][];
  handler: CommandHandler;
}
