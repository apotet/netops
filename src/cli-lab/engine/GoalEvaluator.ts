import { hasUnsavedChanges } from './ConfigPersistence';
import { checkVlanPath } from './VlanPath';
import { checkSviIpv4Reachability } from './SviIpv4Reachability';
import { DeviceState, GoalCheckResult, GoalPredicate, NetworkState } from './types';

function deviceOf(state: NetworkState, id: string): DeviceState | undefined {
  return state.devices[id];
}

export function evaluatePredicate(state: NetworkState, p: GoalPredicate): GoalCheckResult {
  const dev = 'device' in p ? deviceOf(state, p.device) : undefined;

  switch (p.type) {
    case 'ipv4.sviReachable': {
      const result = checkSviIpv4Reachability(state, p.device, p.destination);
      return { predicate: p, passed: result.kind === 'remote', detail: result.detail };
    }
    case 'l2.vlanReachable': {
      const result = checkVlanPath(state, p.vlanId, p.fromDevice, p.fromIf, p.toDevice, p.toIf);
      return { predicate: p, passed: result.reachable, detail: result.detail };
    }
    case 'config.saved': {
      const ok = !!dev && !hasUnsavedChanges(dev);
      return { predicate: p, passed: ok, detail: ok
        ? `${dev.hostname}: running-config сохранена в startup-config`
        : `${dev?.hostname ?? p.device}: есть несохранённые изменения. Выполните copy running-config startup-config` };
    }
    case 'hostname': {
      const ok = !!dev && dev.hostname.toLowerCase() === p.hostname.toLowerCase();
      return {
        predicate: p,
        passed: ok,
        detail: ok
          ? `Hostname = ${p.hostname}`
          : `Ожидался hostname ${p.hostname}, сейчас ${dev?.hostname ?? '—'}`,
      };
    }
    case 'mode': {
      const current = dev?.modeCtx.mode;
      const ok = !!current && p.modes.includes(current);
      return {
        predicate: p,
        passed: ok,
        detail: ok
          ? `Режим ${current}`
          : `Режим сейчас ${current ?? '—'}, нужен один из: ${p.modes.join(', ')}`,
      };
    }
    case 'privilege': {
      const ok = !!dev && dev.privilege >= p.min;
      return {
        predicate: p,
        passed: ok,
        detail: ok
          ? `Privilege ≥ ${p.min}`
          : `Privilege сейчас ${dev?.privilege ?? 0}, нужно ≥ ${p.min}`,
      };
    }
    case 'vlan.exists': {
      const vlan = dev?.vlans[p.vlanId];
      const exists = !!vlan;
      const nameOk = p.name ? vlan?.name?.toLowerCase() === p.name.toLowerCase() : true;
      const ok = exists && nameOk;
      return {
        predicate: p,
        passed: ok,
        detail: ok
          ? `VLAN ${p.vlanId}${p.name ? ` (${p.name})` : ''} есть`
          : `Нет VLAN ${p.vlanId}${p.name ? ` с именем ${p.name}` : ''}`,
      };
    }
    case 'if.admin': {
      const iface = dev?.interfaces[p.ifName];
      const ok = !!iface && iface.adminUp === p.up;
      return {
        predicate: p,
        passed: ok,
        detail: ok
          ? `${p.ifName} admin ${p.up ? 'up' : 'down'}`
          : `${p.ifName}: ожидался admin ${p.up ? 'up' : 'down'}`,
      };
    }
    case 'if.switchportMode': {
      const iface = dev?.interfaces[p.ifName];
      const ok = iface?.switchport?.mode === p.mode;
      return {
        predicate: p,
        passed: ok,
        detail: ok
          ? `${p.ifName} mode ${p.mode}`
          : `${p.ifName}: mode сейчас ${iface?.switchport?.mode ?? 'unset'}, нужен ${p.mode}`,
      };
    }
    case 'if.accessVlan': {
      const iface = dev?.interfaces[p.ifName];
      const ok =
        iface?.switchport?.mode === 'access' && iface.switchport.accessVlan === p.vlanId;
      return {
        predicate: p,
        passed: ok,
        detail: ok
          ? `${p.ifName} access VLAN ${p.vlanId}`
          : `${p.ifName}: access VLAN сейчас ${iface?.switchport?.accessVlan ?? '—'}, нужен ${p.vlanId}`,
      };
    }
    case 'if.ipv4': {
      const iface = dev?.interfaces[p.ifName];
      const ok = iface?.ipv4?.address === p.address && iface?.ipv4?.prefix === p.prefix;
      return {
        predicate: p,
        passed: ok,
        detail: ok
          ? `${p.ifName} ${p.address}/${p.prefix}`
          : `${p.ifName}: сейчас ${iface?.ipv4 ? `${iface.ipv4.address}/${iface.ipv4.prefix}` : 'без IP'}`,
      };
    }
    case 'if.trunkAllowed': {
      const iface = dev?.interfaces[p.ifName];
      const allowed = iface?.switchport?.trunkAllowed ?? [];
      const need = [...p.vlans].sort((a, b) => a - b);
      const have = [...allowed].sort((a, b) => a - b);
      const ok =
        iface?.switchport?.mode === 'trunk' &&
        need.length === have.length &&
        need.every((v, i) => v === have[i]);
      return {
        predicate: p,
        passed: ok,
        detail: ok
          ? `${p.ifName} trunk allowed ${need.join(',')}`
          : `${p.ifName}: allowed сейчас ${have.join(',') || '—'}, нужно ${need.join(',')}`,
      };
    }
    case 'route.exists': {
      const routes = dev?.routes ?? [];
      const found = routes.find((r) => {
        if (r.prefix !== p.prefix || r.prefixLen !== p.prefixLen) return false;
        if (p.nextHop && r.nextHop !== p.nextHop) return false;
        return true;
      });
      const ok = !!found;
      return {
        predicate: p,
        passed: ok,
        detail: ok
          ? `Маршрут ${p.prefix}/${p.prefixLen}${p.nextHop ? ` via ${p.nextHop}` : ''}`
          : `Нет маршрута ${p.prefix}/${p.prefixLen}${p.nextHop ? ` via ${p.nextHop}` : ''}`,
      };
    }
    default:
      return { predicate: p, passed: false, detail: 'Неизвестный предикат' };
  }
}

export function evaluateGoals(
  state: NetworkState,
  goals: GoalPredicate[]
): { allPassed: boolean; results: GoalCheckResult[] } {
  const results = goals.map((g) => evaluatePredicate(state, g));
  return { allPassed: results.every((r) => r.passed), results };
}
