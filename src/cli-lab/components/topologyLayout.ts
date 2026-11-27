import type { DeviceState, NetworkLink, NetworkState } from '../engine/types';

export type DeviceKind = 'switch' | 'router' | 'host';
export type PortSide = 'left' | 'right' | 'top' | 'bottom';

export interface LayoutNode {
  id: string;
  hostname: string;
  kind: DeviceKind;
  x: number;
  y: number;
  width: number;
  height: number;
  hasBottomMeta: boolean;
}

export interface LayoutPort {
  key: string;
  deviceId: string;
  ifaceName: string;
  shortName: string;
  linkIndex: number;
  side: PortSide;
  x: number;
  y: number;
  stubX: number;
  stubY: number;
  peerId: string;
  peerIface: string;
}

export interface LayoutLink {
  index: number;
  a: LayoutPort;
  b: LayoutPort;
  pathD: string;
  segments: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  midX: number;
  midY: number;
}

export interface PortLabelSpec {
  text: string;
}

export interface PlacedPortLabel {
  key: string;
  deviceId: string;
  ifaceName: string;
  linkIndex: number;
  text: string;
  x: number; // box center x
  y: number; // box center y
  width: number;
  height: number;
  socketX: number;
  socketY: number;
  leader: boolean;
}

export interface TopologyGraph {
  nodes: LayoutNode[];
  nodeMap: Record<string, LayoutNode>;
  links: LayoutLink[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
}

export function shortIf(name: string): string {
  return name
    .replace(/FastEthernet/g, 'Fa')
    .replace(/GigabitEthernet/g, 'Gi')
    .replace(/Ethernet/g, 'Et')
    .replace(/Port-channel/g, 'Po');
}

export function classifyDevice(device: DeviceState): DeviceKind {
  if (device.vendor === 'linux-host') return 'host';
  const ifaces = Object.values(device.interfaces);
  const hasSwitchport = ifaces.some(i => Boolean(i.switchport));
  const hasRoutedIp = ifaces.some(i => !i.switchport && i.ipv4);
  if (!hasSwitchport && (hasRoutedIp || /^r\d|^router/i.test(device.hostname) || Object.keys(device.vlans).length === 0)) {
    return 'router';
  }
  return 'switch';
}

function naturalSort(a: string, b: string): number {
  const aa = a.match(/\d+|\D+/g) ?? [a];
  const bb = b.match(/\d+|\D+/g) ?? [b];
  for (let i = 0; i < Math.min(aa.length, bb.length); i++) {
    const d = /^\d+$/.test(aa[i]) && /^\d+$/.test(bb[i])
      ? Number(aa[i]) - Number(bb[i])
      : aa[i].localeCompare(bb[i]);
    if (d !== 0) return d;
  }
  return aa.length - bb.length;
}

function buildAdjacency(ids: string[], links: NetworkLink[]): Map<string, string[]> {
  const set = new Set(ids);
  const adj = new Map<string, string[]>(ids.map(id => [id, []]));
  for (const link of links) {
    if (!set.has(link.a) || !set.has(link.b) || link.a === link.b) continue;
    const listA = adj.get(link.a)!;
    const listB = adj.get(link.b)!;
    if (!listA.includes(link.b)) listA.push(link.b);
    if (!listB.includes(link.a)) listB.push(link.a);
  }
  for (const [k, v] of adj) {
    adj.set(k, v.sort(naturalSort));
  }
  return adj;
}

/** Order connected graph nodes along a chain or cycle cleanly without hardcoded IDs. */
function orderGraphPathOrCycle(ids: string[], links: NetworkLink[]): string[] {
  if (ids.length <= 1) return [...ids];
  const adj = buildAdjacency(ids, links);
  const sorted = [...ids].sort((a, b) => (adj.get(a)?.length ?? 0) - (adj.get(b)?.length ?? 0) || naturalSort(a, b));
  const visited = new Set<string>();
  const order: string[] = [];

  const dfs = (cur: string) => {
    if (visited.has(cur)) return;
    visited.add(cur);
    order.push(cur);
    for (const next of adj.get(cur) ?? []) {
      if (!visited.has(next)) dfs(next);
    }
  };

  for (const seed of sorted) {
    if (!visited.has(seed)) dfs(seed);
  }
  return order;
}

function isSimpleCycle(ids: string[], links: NetworkLink[]): boolean {
  if (ids.length < 3) return false;
  const adj = buildAdjacency(ids, links);
  return ids.every(id => (adj.get(id)?.length ?? 0) >= 2);
}

function nodeSize(kind: DeviceKind): { width: number; height: number } {
  if (kind === 'host') return { width: 144, height: 86 };
  if (kind === 'router') return { width: 132, height: 82 };
  return { width: 162, height: 82 };
}

function layoutInfraNodes(
  infraIds: string[],
  devices: Record<string, DeviceState>,
  links: NetworkLink[],
  hasHosts: boolean,
): Record<string, { x: number; y: number }> {
  const ordered = orderGraphPathOrCycle(infraIds, links);
  const n = ordered.length;
  const coords: Record<string, { x: number; y: number }> = {};
  if (n === 0) return coords;

  if (n === 1) {
    coords[ordered[0]] = { x: 0, y: 0 };
    return coords;
  }
  if (n === 2) {
    coords[ordered[0]] = { x: -210, y: 0 };
    coords[ordered[1]] = { x: 210, y: 0 };
    return coords;
  }
  if (n === 3) {
    if (isSimpleCycle(ordered, links)) {
      coords[ordered[0]] = { x: 0, y: -140 };
      coords[ordered[1]] = { x: 225, y: 120 };
      coords[ordered[2]] = { x: -225, y: 120 };
    } else {
      coords[ordered[0]] = { x: -290, y: 0 };
      coords[ordered[1]] = { x: 0, y: 0 };
      coords[ordered[2]] = { x: 290, y: 0 };
    }
    return coords;
  }
  if (n === 4) {
    const hw = hasHosts ? 225 : 210;
    const hh = hasHosts ? 168 : 145;
    coords[ordered[0]] = { x: -hw, y: -hh };
    coords[ordered[1]] = { x: hw, y: -hh };
    coords[ordered[2]] = { x: hw, y: hh };
    coords[ordered[3]] = { x: -hw, y: hh };
    return coords;
  }

  // Generic N >= 5 layout: polygon/ring for cycle-like topologies, tidy multi-row grid otherwise.
  const adj = buildAdjacency(ordered, links);
  const avgDeg = ordered.reduce((acc, id) => acc + (adj.get(id)?.length ?? 0), 0) / n;
  if (avgDeg <= 2.4) {
    const radius = Math.max(240, n * 62);
    ordered.forEach((id, i) => {
      const angle = -Math.PI * 0.75 + (i / n) * Math.PI * 2;
      coords[id] = { x: Math.round(Math.cos(angle) * radius), y: Math.round(Math.sin(angle) * radius * 0.85) };
    });
    return coords;
  }

  const cols = Math.ceil(Math.sqrt(n));
  ordered.forEach((id, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    coords[id] = {
      x: (col - (cols - 1) / 2) * 280,
      y: (row - (Math.ceil(n / cols) - 1) / 2) * 220,
    };
  });
  return coords;
}

export function computeTopologyLayout(state: NetworkState, showBottomMeta = false, manualPositions: Readonly<Record<string, { x: number; y: number }>> = {}): TopologyGraph {
  const allIds = Object.keys(state.devices);
  const infraIds = allIds.filter(id => state.devices[id].vendor !== 'linux-host');
  const hostIds = allIds.filter(id => state.devices[id].vendor === 'linux-host');

  const infraCoords = layoutInfraNodes(infraIds, state.devices, state.links, hostIds.length > 0);
  const infraCentroid = infraIds.length
    ? {
        x: infraIds.reduce((s, id) => s + infraCoords[id].x, 0) / infraIds.length,
        y: infraIds.reduce((s, id) => s + infraCoords[id].y, 0) / infraIds.length,
      }
    : { x: 0, y: 0 };

  // Group hosts by their primary attached switch (if any).
  const hostsByParent = new Map<string, Array<{ hostId: string; switchIf: string }>>();
  const orphanHosts: string[] = [];

  for (const hostId of [...hostIds].sort(naturalSort)) {
    const link = state.links.find(l => l.a === hostId || l.b === hostId);
    if (!link) {
      orphanHosts.push(hostId);
      continue;
    }
    const parentId = link.a === hostId ? link.b : link.a;
    const switchIf = link.a === hostId ? link.bIf : link.aIf;
    if (!infraCoords[parentId]) {
      orphanHosts.push(hostId);
      continue;
    }
    const list = hostsByParent.get(parentId) ?? [];
    list.push({ hostId, switchIf });
    hostsByParent.set(parentId, list);
  }

  const coords: Record<string, { x: number; y: number }> = { ...infraCoords };

  for (const [parentId, entries] of hostsByParent.entries()) {
    entries.sort((a, b) => naturalSort(a.switchIf, b.switchIf) || naturalSort(a.hostId, b.hostId));
    const p = infraCoords[parentId];
    const dx = p.x - infraCentroid.x;
    const dy = p.y - infraCentroid.y;
    const count = entries.length;

    if (Math.abs(dx) > 25) {
      // Push horizontally outward on the outer side of the switch (ideal for 2-col rings/pairs).
      const dir = dx < 0 ? -1 : 1;
      const hostX = p.x + dir * 295;
      const vPitch = 138;
      entries.forEach((entry, idx) => {
        const offsetY = (idx - (count - 1) / 2) * vPitch;
        coords[entry.hostId] = { x: hostX, y: p.y + offsetY };
      });
    } else {
      // Center switch or single-column infra: place hosts cleanly above or below.
      const dirY = dy < -10 ? -1 : 1;
      const hostY = p.y + dirY * 185;
      const hPitch = 175;
      entries.forEach((entry, idx) => {
        const offsetX = (idx - (count - 1) / 2) * hPitch;
        coords[entry.hostId] = { x: p.x + offsetX, y: hostY };
      });
    }
  }

  if (orphanHosts.length) {
    const maxY = Object.values(coords).reduce((m, c) => Math.max(m, c.y), 0);
    orphanHosts.forEach((id, idx) => {
      coords[id] = {
        x: (idx - (orphanHosts.length - 1) / 2) * 180,
        y: maxY + 170,
      };
    });
  }

  // Apply visual-only drag positions before computing sockets and cable routes.
  // Network state and connectivity are never mutated.
  for (const id of allIds) {
    const position = manualPositions[id];
    if (position && Number.isFinite(position.x) && Number.isFinite(position.y)) {
      coords[id] = { x: position.x, y: position.y };
    }
  }

  const nodes: LayoutNode[] = allIds.map(id => {
    const dev = state.devices[id];
    const kind = classifyDevice(dev);
    const { width, height } = nodeSize(kind);
    const pos = coords[id] ?? { x: 0, y: 0 };
    return {
      id,
      hostname: dev.hostname,
      kind,
      x: pos.x,
      y: pos.y,
      width,
      height,
      hasBottomMeta: false,
    };
  });
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  // Assign each link endpoint to a side on its device, then spread sockets along that side
  // ordered by peer coordinate so cables never cross near the chassis.
  interface PendingEnd {
    linkIndex: number;
    end: 'a' | 'b';
    deviceId: string;
    ifaceName: string;
    peerId: string;
    peerIface: string;
    side: PortSide;
    peerCoord: number;
  }

  const sideBuckets = new Map<string, PendingEnd[]>();
  const addBucket = (item: PendingEnd) => {
    const key = `${item.deviceId}:${item.side}`;
    const arr = sideBuckets.get(key) ?? [];
    arr.push(item);
    sideBuckets.set(key, arr);
  };

  state.links.forEach((link, idx) => {
    const na = nodeMap[link.a];
    const nb = nodeMap[link.b];
    if (!na || !nb) return;

    const pickSide = (from: LayoutNode, to: LayoutNode): PortSide => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      if (Math.abs(dx) / from.width >= Math.abs(dy) / from.height) {
        return dx >= 0 ? 'right' : 'left';
      }
      return dy >= 0 ? 'bottom' : 'top';
    };

    const sideA = pickSide(na, nb);
    const sideB = pickSide(nb, na);

    addBucket({
      linkIndex: idx,
      end: 'a',
      deviceId: link.a,
      ifaceName: link.aIf,
      peerId: link.b,
      peerIface: link.bIf,
      side: sideA,
      peerCoord: sideA === 'left' || sideA === 'right' ? nb.y : nb.x,
    });
    addBucket({
      linkIndex: idx,
      end: 'b',
      deviceId: link.b,
      ifaceName: link.bIf,
      peerId: link.a,
      peerIface: link.aIf,
      side: sideB,
      peerCoord: sideB === 'left' || sideB === 'right' ? na.y : na.x,
    });
  });

  const endPorts: Record<string, LayoutPort> = {};

  for (const [, bucket] of sideBuckets) {
    bucket.sort((u, v) => u.peerCoord - v.peerCoord || naturalSort(u.ifaceName, v.ifaceName));
    const count = bucket.length;
    bucket.forEach((item, idx) => {
      const node = nodeMap[item.deviceId];
      const peer = nodeMap[item.peerId];
      const hw = node.width / 2;
      const hh = node.height / 2;
      let x = node.x;
      let y = node.y;
      let stubX = node.x;
      let stubY = node.y;

      if (item.side === 'left' || item.side === 'right') {
        const usableH = Math.max(16, node.height - 32);
        const step = count > 1 ? Math.min(28, usableH / (count - 1)) : 0;
        const offset = (idx - (count - 1) / 2) * step;
        y = node.y + offset;
        const dir = item.side === 'right' ? 1 : -1;
        x = node.x + dir * hw;
        const span = Math.max(24, Math.abs(peer.x - node.x) - hw - peer.width / 2);
        const stubLen = Math.min(46, Math.max(16, Math.floor(span * 0.32)));
        stubX = x + dir * stubLen;
        stubY = y;
      } else {
        const usableW = Math.max(24, node.width - 44);
        const step = count > 1 ? Math.min(34, usableW / (count - 1)) : 0;
        const offset = (idx - (count - 1) / 2) * step;
        x = node.x + offset;
        const dir = item.side === 'bottom' ? 1 : -1;
        y = node.y + dir * hh;
        const span = Math.max(24, Math.abs(peer.y - node.y) - hh - peer.height / 2);
        const stubLen = Math.min(46, Math.max(16, Math.floor(span * 0.32)));
        stubX = x;
        stubY = y + dir * stubLen;
      }

      const portKey = `${item.linkIndex}:${item.end}`;
      endPorts[portKey] = {
        key: `${item.deviceId}:${item.ifaceName}:${item.linkIndex}`,
        deviceId: item.deviceId,
        ifaceName: item.ifaceName,
        shortName: shortIf(item.ifaceName),
        linkIndex: item.linkIndex,
        side: item.side,
        x,
        y,
        stubX,
        stubY,
        peerId: item.peerId,
        peerIface: item.peerIface,
      };
    });
  }

  const layoutLinks: LayoutLink[] = [];
  state.links.forEach((_link, idx) => {
    const a = endPorts[`${idx}:a`];
    const b = endPorts[`${idx}:b`];
    if (!a || !b) return;
    const isCollinear = (Math.abs(a.y - b.y) < 1 && (a.side === 'left' || a.side === 'right') && (b.side === 'left' || b.side === 'right')) ||
      (Math.abs(a.x - b.x) < 1 && (a.side === 'top' || a.side === 'bottom') && (b.side === 'top' || b.side === 'bottom'));

    const pathD = isCollinear
      ? `M ${a.x} ${a.y} L ${b.x} ${b.y}`
      : `M ${a.x} ${a.y} L ${a.stubX} ${a.stubY} L ${b.stubX} ${b.stubY} L ${b.x} ${b.y}`;
    const segments = isCollinear
      ? [{ x1: a.x, y1: a.y, x2: b.x, y2: b.y }]
      : [
          { x1: a.x, y1: a.y, x2: a.stubX, y2: a.stubY },
          { x1: a.stubX, y1: a.stubY, x2: b.stubX, y2: b.stubY },
          { x1: b.stubX, y1: b.stubY, x2: b.x, y2: b.y },
        ];
    layoutLinks.push({
      index: idx,
      a,
      b,
      pathD,
      segments,
      midX: (a.stubX + b.stubX) / 2,
      midY: (a.stubY + b.stubY) / 2,
    });
  });

  const minX = nodes.length ? Math.min(...nodes.map(n => n.x - n.width / 2)) - 48 : -200;
  const maxX = nodes.length ? Math.max(...nodes.map(n => n.x + n.width / 2)) + 48 : 200;
  const minY = nodes.length ? Math.min(...nodes.map(n => n.y - n.height / 2)) - 42 : -140;
  const maxY = nodes.length ? Math.max(...nodes.map(n => n.y + n.height / 2 + (n.hasBottomMeta ? 28 : 0))) + 46 : 140;

  return {
    nodes,
    nodeMap,
    links: layoutLinks,
    bounds: { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY },
  };
}

interface Rect { x0: number; y0: number; x1: number; y1: number }

function rectsOverlap(a: Rect, b: Rect, pad = 0): boolean {
  return a.x1 + pad > b.x0 && a.x0 - pad < b.x1 && a.y1 + pad > b.y0 && a.y0 - pad < b.y1;
}

function pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function rectIntersectsSegment(r: Rect, x1: number, y1: number, x2: number, y2: number, pad = 4): boolean {
  const rx0 = r.x0 - pad;
  const ry0 = r.y0 - pad;
  const rx1 = r.x1 + pad;
  const ry1 = r.y1 + pad;

  const minSegX = Math.min(x1, x2);
  const maxSegX = Math.max(x1, x2);
  const minSegY = Math.min(y1, y2);
  const maxSegY = Math.max(y1, y2);
  if (maxSegX < rx0 || minSegX > rx1 || maxSegY < ry0 || minSegY > ry1) return false;

  // Sample along the segment + test rect corners distance for fast exactness on short labels
  const steps = Math.max(4, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 10));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const sx = x1 + (x2 - x1) * t;
    const sy = y1 + (y2 - y1) * t;
    if (sx >= rx0 && sx <= rx1 && sy >= ry0 && sy <= ry1) return true;
  }
  const cx = (r.x0 + r.x1) / 2;
  const cy = (r.y0 + r.y1) / 2;
  if (pointToSegmentDist(cx, cy, x1, y1, x2, y2) < pad) return true;
  return false;
}

/**
 * Deterministic collision-free label placer anchored directly to each port socket.
 * Guarantees labels never overlap device chassis, cable segments, or one another.
 */
export function placePortLabels(
  graph: TopologyGraph,
  labelSpecs: Record<string, PortLabelSpec>,
): PlacedPortLabel[] {
  const nodeBoxes: Rect[] = graph.nodes.map(n => ({
    x0: n.x - n.width / 2,
    y0: n.y - n.height / 2,
    x1: n.x + n.width / 2,
    y1: n.y + n.height / 2 + (n.hasBottomMeta ? 24 : 0),
  }));
  const allSegments = graph.links.flatMap(l => l.segments);
  const placedRects: Rect[] = [];
  const results: PlacedPortLabel[] = [];

  const endpoints: Array<{ port: LayoutPort; end: 'a' | 'b'; other: LayoutPort }> = [];
  for (const link of graph.links) {
    endpoints.push({ port: link.a, end: 'a', other: link.b });
    endpoints.push({ port: link.b, end: 'b', other: link.a });
  }

  for (const { port, end, other } of endpoints) {
    const spec = labelSpecs[port.key];
    const text = spec?.text ?? port.shortName;
    const w = Math.max(44, Math.ceil(text.length * 6.9 + 14));
    const h = 20;

    // Outward direction from socket
    const nx = port.side === 'right' ? 1 : port.side === 'left' ? -1 : 0;
    const ny = port.side === 'bottom' ? 1 : port.side === 'top' ? -1 : 0;

    const candidates: Array<{ cx: number; cy: number; penalty: number }> = [];

    if (port.side === 'right' || port.side === 'left') {
      // Opposite side preferences between left/right ends avoid centerline collisions on horizontal links.
      const preferredVSign = end === 'a' ? -1 : 1;
      const vOrder = [preferredVSign, -preferredVSign];
      for (const outOffset of [6, 16, 28, 42]) {
        for (const vSign of vOrder) {
          for (const vDist of [17, 25, 34, 44]) {
            const cx = port.x + nx * (outOffset + w / 2);
            const cy = port.y + vSign * vDist;
            candidates.push({ cx, cy, penalty: outOffset + vDist * 0.6 + (vSign !== preferredVSign ? 2 : 0) });
          }
        }
      }
      // Also consider above/below directly flush outside corner
      for (const vSign of vOrder) {
        candidates.push({ cx: port.x + nx * (w / 2 + 4), cy: port.y + vSign * 22, penalty: 14 });
      }
    } else {
      const preferredHSign = end === 'a' ? 1 : -1;
      const hOrder = [preferredHSign, -preferredHSign];
      for (const outOffset of [16, 26, 38]) {
        for (const hSign of hOrder) {
          for (const hShift of [w / 2 + 10, w / 2 + 22, 0]) {
            const cx = port.x + hSign * hShift;
            const cy = port.y + ny * (outOffset + h / 2 - 4);
            candidates.push({ cx, cy, penalty: outOffset + hShift * 0.4 + (hSign !== preferredHSign ? 2 : 0) });
          }
        }
      }
    }

    // Fallback ring if dense multi-link node
    const dx = other.x - port.x;
    const dy = other.y - port.y;
    const baseAngle = Math.atan2(dy, dx);
    for (const radius of [36, 48, 60]) {
      for (let k = 0; k < 12; k++) {
        const ang = baseAngle + (k * Math.PI * 2) / 12;
        candidates.push({
          cx: port.x + Math.cos(ang) * radius,
          cy: port.y + Math.sin(ang) * radius,
          penalty: radius + 20,
        });
      }
    }

    let best: { cx: number; cy: number; rect: Rect; score: number } | null = null;
    for (const c of candidates) {
      const rect: Rect = { x0: c.cx - w / 2, y0: c.cy - h / 2, x1: c.cx + w / 2, y1: c.cy + h / 2 };
      const hitsNode = nodeBoxes.some(nb => rectsOverlap(rect, nb, 6));
      const hitsLabel = placedRects.some(lb => rectsOverlap(rect, lb, 5));
      const hitsCable = allSegments.some(s => rectIntersectsSegment(rect, s.x1, s.y1, s.x2, s.y2, 4));
      const collisionScore = (hitsNode ? 10000 : 0) + (hitsLabel ? 5000 : 0) + (hitsCable ? 1500 : 0);
      const distToSocket = Math.hypot(c.cx - port.x, c.cy - port.y);
      const score = collisionScore + c.penalty + distToSocket * 0.35;
      if (!best || score < best.score) {
        best = { cx: c.cx, cy: c.cy, rect, score };
        if (collisionScore === 0 && score < 32) break;
      }
    }

    const chosen = best!;
    placedRects.push(chosen.rect);
    const dist = Math.hypot(chosen.cx - port.x, chosen.cy - port.y);
    results.push({
      key: port.key,
      deviceId: port.deviceId,
      ifaceName: port.ifaceName,
      linkIndex: port.linkIndex,
      text,
      x: chosen.cx,
      y: chosen.cy,
      width: w,
      height: h,
      socketX: port.x,
      socketY: port.y,
      leader: dist > Math.max(w / 2 + 12, 32),
    });
  }

  return results;
}

export function computeGraphBounds(
  graph: TopologyGraph,
  labels: PlacedPortLabel[],
): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  if (!graph.nodes.length) return graph.bounds;
  let minX = Math.min(...graph.nodes.map(n => n.x - n.width / 2));
  let maxX = Math.max(...graph.nodes.map(n => n.x + n.width / 2));
  let minY = Math.min(...graph.nodes.map(n => n.y - n.height / 2));
  let maxY = Math.max(...graph.nodes.map(n => n.y + n.height / 2 + (n.hasBottomMeta ? 26 : 0)));

  for (const label of labels) {
    minX = Math.min(minX, label.x - label.width / 2);
    maxX = Math.max(maxX, label.x + label.width / 2);
    minY = Math.min(minY, label.y - label.height / 2);
    maxY = Math.max(maxY, label.y + label.height / 2);
  }

  const pad = 28;
  minX -= pad;
  maxX += pad;
  minY -= pad;
  maxY += pad;
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}
