import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Cable,
  ChevronUp,
  LocateFixed,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Terminal,
  Unplug,
  X,
} from 'lucide-react';
import type { InterfaceState, NetworkState } from '../engine/types';
import type { TopologyLayer, TopologyLayerChoice } from '../topologyLayers';
import { interfaceStatus } from '../engine/OperationalState';
import { deriveSpanningTree, type SpanningTreeResult } from '../engine/SpanningTree';
import { checkHostIpv4Reachability } from '../engine/HostIpv4Reachability';
import { getPortDetails } from '../portDetails';
import { HostPingPanel } from './HostPingPanel';
import {
  computeGraphBounds,
  computeTopologyLayout,
  placePortLabels,
  shortIf,
  type LayoutNode,
  type PortLabelSpec,
} from './topologyLayout';

export interface ExperimentalTopologyV2Props {
  state: NetworkState;
  layer?: TopologyLayer;
  layerChoice?: TopologyLayerChoice;
  onChangeLayerChoice?: (choice: TopologyLayerChoice) => void;
  activeDeviceId: string;
  onSelectDevice: (id: string) => void;
  onOpenDeviceConsole?: (id: string) => void;
  onToggleLink?: (linkIndex: number) => void;
  fullscreen?: boolean;
  onEnterFullscreen?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

type Selection =
  | { kind: 'port'; deviceId: string; interfaceName: string; linkIndex?: number }
  | { kind: 'link'; linkIndex: number }
  | { kind: 'host'; hostId: string }
  | null;

interface ViewTransform {
  scale: number;
  tx: number;
  ty: number;
}

function vlanAccent(vlanId?: number): string {
  if (vlanId === 10) return '#0ea5e9';
  if (vlanId === 20) return '#a78bfa';
  if (vlanId === 30) return '#14b8a6';
  if (vlanId === 1) return '#64748b';
  return '#10b981';
}

function stpRoleTag(role?: string): string {
  if (role === 'root') return 'RP';
  if (role === 'designated') return 'DP';
  if (role === 'nondesignated') return 'ND';
  return '';
}

function isPhysicalPort(iface: InterfaceState): boolean {
  return !/^Vlan\d+$/i.test(iface.name);
}

const LAYER_OPTIONS: ReadonlyArray<readonly [TopologyLayerChoice, string]> = [
  ['auto', 'Авто'],
  ['phy', 'Физика'],
  ['vlan', 'VLAN'],
  ['stp', 'STP'],
  ['ip', 'IP'],
];

export const ExperimentalTopologyV2: React.FC<ExperimentalTopologyV2Props> = ({
  state,
  layer = 'stp',
  layerChoice = 'auto',
  onChangeLayerChoice,
  activeDeviceId,
  onSelectDevice,
  onOpenDeviceConsole,
  onToggleLink,
  fullscreen = false,
  onEnterFullscreen,
  collapsed = false,
  onToggleCollapse,
}) => {
  const [selection, setSelection] = useState<Selection>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [desktopInspectorOpen, setDesktopInspectorOpen] = useState(true);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 720, height: 420 });
  const [transform, setTransform] = useState<ViewTransform>({ scale: 1, tx: 0, ty: 0 });
  const [manualPositions, setManualPositions] = useState<Record<string, { x: number; y: number }>>({});

  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; lastX: number; lastY: number; active: boolean; deviceId: string | null } | null>(null);
  const touchPoints = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; centerX: number; centerY: number } | null>(null);
  const suppressClickRef = useRef(false);
  const suppressTimerRef = useRef<number | null>(null);
  const userAdjustedRef = useRef(false);
  const hasFittedRef = useRef(false);

  const tree = useMemo<SpanningTreeResult | null>(() => {
    try {
      return deriveSpanningTree(state, { kind: 'cst' });
    } catch {
      return null;
    }
  }, [state]);

  const rootDevices = useMemo(
    () => new Set(Object.values(tree?.bridges ?? {}).map(b => b.rootDevice)),
    [tree],
  );

  const graph = useMemo(() => computeTopologyLayout(state, layer === 'ip', manualPositions), [state, layer, manualPositions]);

  const labelSpecs = useMemo(() => {
    const specs: Record<string, PortLabelSpec> = {};
    graph.links.forEach(link => {
      const rawLink = state.links[link.index];
      const aDev = state.devices[link.a.deviceId];
      const bDev = state.devices[link.b.deviceId];
      const aIf = aDev?.interfaces[link.a.ifaceName];
      const bIf = bDev?.interfaces[link.b.ifaceName];
      const aStp = tree?.bridges[link.a.deviceId]?.ports[link.a.ifaceName];
      const bStp = tree?.bridges[link.b.deviceId]?.ports[link.b.ifaceName];
      const aBlocked = aStp?.portState === 'blocking' && aStp.portRole !== 'disabled';
      const bBlocked = bStp?.portState === 'blocking' && bStp.portRole !== 'disabled';
      const aStat = interfaceStatus(state, aDev, aIf ?? { name: link.a.ifaceName, adminUp: false });
      const bStat = interfaceStatus(state, bDev, bIf ?? { name: link.b.ifaceName, adminUp: false });
      const phyUp = !!rawLink?.up && aStat.operUp && bStat.operUp;

      const formatEnd = (
        shortName: string,
        devKind: string,
        iface: InterfaceState | undefined,
        stpPort: typeof aStp,
        blocked: boolean,
        adminUp: boolean,
      ): string => {
        if (devKind === 'host') return shortName;
        if (!adminUp) return `${shortName} SHUT`;
        if (!phyUp) return `${shortName} DOWN`;
        if (layer === 'vlan' && iface?.switchport) {
          if (iface.switchport.mode === 'access') return `${shortName} A:${iface.switchport.accessVlan ?? 1}`;
          if (iface.switchport.mode === 'trunk') return `${shortName} TRK`;
        }
        if (layer === 'stp' && stpPort) {
          const role = stpRoleTag(stpPort.portRole);
          if (blocked) return `${shortName} ${role || 'BLK'} ⊘`;
          if (role) return `${shortName} ${role}`;
        }
        return shortName;
      };

      const aKind = graph.nodeMap[link.a.deviceId]?.kind ?? 'switch';
      const bKind = graph.nodeMap[link.b.deviceId]?.kind ?? 'switch';

      specs[link.a.key] = {
        text: formatEnd(link.a.shortName, aKind, aIf, aStp, aBlocked, aIf?.adminUp ?? false),
      };
      specs[link.b.key] = {
        text: formatEnd(link.b.shortName, bKind, bIf, bStp, bBlocked, bIf?.adminUp ?? false),
      };
    });
    return specs;
  }, [graph, state, tree, layer]);

  const placedLabels = useMemo(() => placePortLabels(graph, labelSpecs), [graph, labelSpecs]);
  const fullBounds = useMemo(() => computeGraphBounds(graph, placedLabels), [graph, placedLabels]);

  const topologySignature = useMemo(
    () => `${Object.keys(state.devices).join(',')}::${state.links.map(l => `${l.a}:${l.aIf}-${l.b}:${l.bIf}`).join(',')}`,
    [state.devices, state.links],
  );

  const computeFitTransform = useCallback((w: number, h: number): ViewTransform => {
    const safeW = Math.max(200, w);
    const safeH = Math.max(180, h);
    const maxFitScale = safeW >= 1100 ? 1.45 : 1.28;
    const scale = Math.min(maxFitScale, Math.max(0.25, Math.min(safeW / fullBounds.width, safeH / fullBounds.height) * 0.94));
    const cx = fullBounds.minX + fullBounds.width / 2;
    const cy = fullBounds.minY + fullBounds.height / 2;
    return {
      scale,
      tx: safeW / 2 - cx * scale,
      ty: safeH / 2 - cy * scale,
    };
  }, [fullBounds]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize(prev => {
          if (Math.abs(prev.width - rect.width) < 1 && Math.abs(prev.height - rect.height) < 1) {
            return prev;
          }
          return { width: rect.width, height: rect.height };
        });
      }
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [collapsed, fullscreen]);

  // Reset manual zoom when scenario / topology structure changes cleanly.
  useEffect(() => {
    userAdjustedRef.current = false;
    hasFittedRef.current = false;
    setManualPositions({});
  }, [topologySignature]);

  // Fit on initial mount, scenario change, or container resize when user hasn't manually zoomed/panned.
  useEffect(() => {
    if (!userAdjustedRef.current || !hasFittedRef.current) {
      setTransform(computeFitTransform(containerSize.width, containerSize.height));
      hasFittedRef.current = true;
    }
  }, [containerSize.width, containerSize.height, computeFitTransform]);

  // Native non-passive wheel zoom prevents page scroll while zooming toward cursor.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || collapsed) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = stage.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      const factor = Math.exp(-Math.max(-120, Math.min(120, delta)) * 0.0022);
      userAdjustedRef.current = true;
      setTransform(previous => {
        const scale = Math.max(0.25, Math.min(4, previous.scale * factor));
        const ratio = scale / previous.scale;
        return { scale, tx: x - (x - previous.tx) * ratio, ty: y - (y - previous.ty) * ratio };
      });
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [collapsed]);

  const armSuppressClick = () => {
    suppressClickRef.current = true;
    if (suppressTimerRef.current !== null) window.clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      suppressTimerRef.current = null;
    }, 40);
  };

  useEffect(() => () => {
    if (suppressTimerRef.current !== null) window.clearTimeout(suppressTimerRef.current);
  }, []);

  const fitView = useCallback(() => {
    suppressClickRef.current = false;
    userAdjustedRef.current = false;
    hasFittedRef.current = true;
    setTransform(computeFitTransform(containerSize.width, containerSize.height));
  }, [computeFitTransform, containerSize.width, containerSize.height]);

  const resetLayout = () => {
    setManualPositions({});
    userAdjustedRef.current = false;
    hasFittedRef.current = false;
  };

  const tryCapture = (target: EventTarget & HTMLDivElement, pointerId: number) => {
    try {
      target.setPointerCapture(pointerId);
    } catch {
      // Synthetic PointerEvents in headless verification may not map to an active OS pointer.
    }
  };

  const tryReleaseCapture = (target: EventTarget & HTMLDivElement, pointerId: number) => {
    try {
      if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
    } catch {
      // Ignore synthetic release errors.
    }
  };

  const startPan = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as Element;
    // Ports and cables retain their selection gesture; only device bodies drag.
    const deviceId = target.closest('[data-draggable-device]')?.getAttribute('data-draggable-device') ?? null;
    if (event.pointerType === 'touch') {
      touchPoints.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPoints.current.size === 1) {
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          lastX: event.clientX,
          lastY: event.clientY,
          active: false,
          deviceId,
        };
      } else if (touchPoints.current.size === 2) {
        const [p, q] = [...touchPoints.current.values()];
        pinchRef.current = {
          distance: Math.max(1, Math.hypot(p.x - q.x, p.y - q.y)),
          centerX: (p.x + q.x) / 2,
          centerY: (p.y + q.y) / 2,
        };
        dragRef.current = null;
        armSuppressClick();
      }
      return;
    }
    if (event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      active: false,
      deviceId,
    };
  };

  const movePan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') {
      const old = touchPoints.current.get(event.pointerId);
      if (!old) return;
      touchPoints.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const points = [...touchPoints.current.values()];
      if (points.length >= 2) {
        const [p, q] = points;
        const distance = Math.max(1, Math.hypot(p.x - q.x, p.y - q.y));
        const centerX = (p.x + q.x) / 2;
        const centerY = (p.y + q.y) / 2;
        const previous = pinchRef.current;
        if (previous && previous.distance > 0) {
          const rect = event.currentTarget.getBoundingClientRect();
          userAdjustedRef.current = true;
          armSuppressClick();
          setTransform(t => {
            const scale = Math.max(0.25, Math.min(4, t.scale * (distance / previous.distance)));
            const ratio = scale / t.scale;
            const ox = previous.centerX - rect.left;
            const oy = previous.centerY - rect.top;
            return {
              scale,
              tx: centerX - rect.left - (ox - t.tx) * ratio,
              ty: centerY - rect.top - (oy - t.ty) * ratio,
            };
          });
        }
        pinchRef.current = { distance, centerX, centerY };
        return;
      }
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 6) {
        drag.active = true;
        userAdjustedRef.current = true;
        tryCapture(event.currentTarget, event.pointerId);
      }
      if (drag.active) {
        const dx = event.clientX - drag.lastX;
        const dy = event.clientY - drag.lastY;
        drag.lastX = event.clientX;
        drag.lastY = event.clientY;
        if (drag.deviceId) {
          const id = drag.deviceId;
          const scale = transform.scale;
          const base = graph.nodeMap[id];
          if (base) setManualPositions(prev => {
            const old = prev[id] ?? { x: base.x, y: base.y };
            return { ...prev, [id]: { x: old.x + dx / scale, y: old.y + dy / scale } };
          });
        } else {
          setTransform(t => ({ ...t, tx: t.tx + dx, ty: t.ty + dy }));
        }
      }
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.active && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) {
      drag.active = true;
      userAdjustedRef.current = true;
      tryCapture(event.currentTarget, event.pointerId);
    }
    if (drag.active) {
      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      if (drag.deviceId) {
        const id = drag.deviceId;
        const scale = transform.scale;
        const base = graph.nodeMap[id];
        if (base) setManualPositions(prev => {
          const old = prev[id] ?? { x: base.x, y: base.y };
          return { ...prev, [id]: { x: old.x + dx / scale, y: old.y + dy / scale } };
        });
      } else {
        setTransform(previous => ({ ...previous, tx: previous.tx + dx, ty: previous.ty + dy }));
      }
    }
  };

  const stopPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch') {
      touchPoints.current.delete(event.pointerId);
      if (touchPoints.current.size < 2) {
        pinchRef.current = null;
      }
    }
    if (dragRef.current?.pointerId === event.pointerId) {
      if (dragRef.current.active) {
        armSuppressClick();
      }
      dragRef.current = null;
    }
    tryReleaseCapture(event.currentTarget, event.pointerId);
  };

  const guardClick = (fn: () => void) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    fn();
  };

  const revealSelection = (nextSelection: Exclude<Selection, null>) => {
    setSelection(nextSelection);
    setDesktopInspectorOpen(true);
    setMobileSheetOpen(true);
  };

  const modeledHosts = useMemo(
    () => Object.values(state.devices).filter(d => d.vendor === 'linux-host'),
    [state.devices],
  );
  const activeDevice = state.devices[activeDeviceId];
  const selectedPortDetails = selection?.kind === 'port'
    ? getPortDetails(state, selection.deviceId, selection.interfaceName)
    : null;
  const selectedLink = selection?.kind === 'link' ? state.links[selection.linkIndex] : null;
  const selectedLinkDetailsA = selectedLink ? getPortDetails(state, selectedLink.a, selectedLink.aIf) : null;
  const selectedLinkDetailsB = selectedLink ? getPortDetails(state, selectedLink.b, selectedLink.bIf) : null;
  const selectedHost = selection?.kind === 'host' ? state.devices[selection.hostId] : null;

  if (collapsed) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-mono text-slate-600 dark:text-slate-300">Схема топологии скрыта</span>
        <div className="flex items-center gap-2">
          {onEnterFullscreen && (
            <button
              type="button"
              onClick={onEnterFullscreen}
              className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 text-cyan-700 dark:text-cyan-300 font-semibold cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Во весь экран
            </button>
          )}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="rounded-lg bg-cyan-500/15 px-2.5 py-1.5 text-cyan-700 dark:text-cyan-300 font-semibold cursor-pointer"
            >
              Показать схему
            </button>
          )}
        </div>
      </div>
    );
  }

  const thumbSummary = selectedLink && selectedLinkDetailsA && selectedLinkDetailsB
    ? `Кабель ${selectedLinkDetailsA.deviceName} ${shortIf(selectedLink.aIf)} ↔ ${selectedLinkDetailsB.deviceName} ${shortIf(selectedLink.bIf)}`
    : selectedPortDetails
      ? `${selectedPortDetails.deviceName} · ${shortIf(selectedPortDetails.interfaceName)}`
      : selectedHost
        ? `${selectedHost.hostname} · ${selectedHost.interfaces.Ethernet0?.ipv4?.address ?? 'PC'}`
        : `${activeDevice?.hostname ?? activeDeviceId}${layer === 'stp' && rootDevices.has(activeDeviceId) ? ' · ★ Root' : ''}`;

  const sheetTitle = selectedLink
    ? `Соединение #${selection?.kind === 'link' ? selection.linkIndex + 1 : ''}`
    : selectedPortDetails
      ? `${selectedPortDetails.deviceName} · ${shortIf(selectedPortDetails.interfaceName)}`
      : selectedHost
        ? selectedHost.hostname
        : `Инспектор · ${activeDevice?.hostname ?? activeDeviceId}`;

  const renderInspectorBody = (showCloseButton: boolean) => {
    if (selectedLink && selectedLinkDetailsA && selectedLinkDetailsB) {
      return (
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Соединение #{selection?.kind === 'link' ? selection.linkIndex + 1 : ''}
              </div>
              <div className="font-bold text-white font-mono">
                {selectedLinkDetailsA.deviceName} {shortIf(selectedLink.aIf)} ⇄ {selectedLinkDetailsB.deviceName} {shortIf(selectedLink.bIf)}
              </div>
            </div>
            {showCloseButton ? (
              <button
                type="button"
                onClick={() => setSelection(null)}
                aria-label="Сбросить выбор соединения"
                className="p-1.5 rounded-md text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSelection(null)}
                className="px-2 py-1 rounded-md border border-slate-700 text-[10.5px] font-medium text-slate-300 hover:text-white cursor-pointer"
              >
                К устройству
              </button>
            )}
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-2 font-mono text-[11px] text-slate-100">
            {!selectedLink.up
              ? '✕ Кабель физически отключён'
              : selectedLinkDetailsA.physical === 'up' && selectedLinkDetailsB.physical === 'up'
                ? (selectedLinkDetailsA.stp?.state === 'blocking' || selectedLinkDetailsB.stp?.state === 'blocking')
                  ? '⊘ PHY Up · STP Blocking (петля заблокирована)'
                  : '● PHY Up · Линия активна'
                : '✕ PHY Down (проверьте admin up на обоих концах)'}
          </div>
          {[selectedLinkDetailsA, selectedLinkDetailsB].map((end, i) => (
            <div key={`${end.deviceId}-${end.interfaceName}-${i}`} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold font-mono text-white">
                  {end.deviceName} · {shortIf(end.interfaceName)}
                </span>
                {state.devices[end.deviceId]?.vendor === 'cisco-ios' && (
                  <button
                    type="button"
                    onClick={() => (onOpenDeviceConsole ?? onSelectDevice)(end.deviceId)}
                    className="text-[11px] font-semibold text-cyan-300 hover:underline cursor-pointer"
                  >
                    Консоль
                  </button>
                )}
              </div>
              <div className="text-[11px] text-slate-300 font-mono space-y-0.5">
                <div>Admin: {end.admin} · PHY: {end.physical}/{end.protocol}</div>
                <div>
                  Режим: {end.switchport?.mode ?? 'L3'}
                  {end.switchport?.mode === 'access' ? ` · VLAN ${end.switchport.accessVlan ?? 1}` : ''}
                  {end.switchport?.mode === 'trunk' ? ` · allowed ${end.switchport.trunkAllowed?.join(',') ?? '1-4094'}` : ''}
                </div>
                {end.ipv4 && <div>IP: {end.ipv4.address}/{end.ipv4.prefix}</div>}
                {end.stp && <div>STP: {end.stp.role} · {end.stp.state} (cost {end.stp.pathCost})</div>}
              </div>
            </div>
          ))}
          {onToggleLink && selection?.kind === 'link' && (
            <button
              type="button"
              onClick={() => onToggleLink(selection.linkIndex)}
              className={selectedLink.up
                ? 'w-full min-h-[40px] rounded-lg border border-red-500/50 bg-red-500/15 text-red-200 font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer'
                : 'w-full min-h-[40px] rounded-lg border border-emerald-500/50 bg-emerald-500/15 text-emerald-200 font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer'}
            >
              {selectedLink.up ? <Unplug className="w-3.5 h-3.5" /> : <Cable className="w-3.5 h-3.5" />}
              {selectedLink.up ? 'Отключить кабель' : 'Восстановить кабель'}
            </button>
          )}
        </div>
      );
    }

    if (selectedPortDetails) {
      return (
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Порт устройства
              </div>
              <div className="font-bold font-mono text-white">
                {selectedPortDetails.deviceName} · {selectedPortDetails.interfaceName}
              </div>
            </div>
            {showCloseButton ? (
              <button
                type="button"
                onClick={() => setSelection(null)}
                aria-label="Сбросить параметры порта"
                className="p-1.5 rounded-md text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSelection(null)}
                className="px-2 py-1 rounded-md border border-slate-700 text-[10.5px] font-medium text-slate-300 hover:text-white cursor-pointer"
              >
                К устройству
              </button>
            )}
          </div>
          <dl className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-2 gap-y-1 text-[11px] text-slate-200">
            <dt className="text-slate-400">Админ.</dt><dd className="font-mono">{selectedPortDetails.admin}</dd>
            <dt className="text-slate-400">Физика</dt><dd className="font-mono">{selectedPortDetails.physical} / {selectedPortDetails.protocol}</dd>
            <dt className="text-slate-400">Сосед</dt><dd className="font-mono break-words">{selectedPortDetails.peer ?? 'нет линка'}</dd>
            <dt className="text-slate-400">Режим</dt><dd className="font-mono">{selectedPortDetails.switchport?.mode ?? 'L3 / routed'}</dd>
            {selectedPortDetails.switchport?.mode === 'access' && (
              <><dt className="text-slate-400">Access VLAN</dt><dd className="font-mono">{selectedPortDetails.switchport.accessVlan ?? 1}</dd></>
            )}
            {selectedPortDetails.switchport?.mode === 'trunk' && (
              <><dt className="text-slate-400">Allowed</dt><dd className="font-mono break-words">{selectedPortDetails.switchport.trunkAllowed?.join(', ') ?? '1-4094 (all)'}</dd></>
            )}
            {selectedPortDetails.ipv4 && (
              <><dt className="text-slate-400">IPv4</dt><dd className="font-mono">{selectedPortDetails.ipv4.address}/{selectedPortDetails.ipv4.prefix}</dd></>
            )}
            {selectedPortDetails.stp && (
              <>
                <dt className="text-slate-400">STP Роль</dt><dd className="font-mono">{selectedPortDetails.stp.role} · {selectedPortDetails.stp.state}</dd>
                <dt className="text-slate-400">Root / Cost</dt><dd className="font-mono">{state.devices[selectedPortDetails.stp.root]?.hostname ?? selectedPortDetails.stp.root} · {selectedPortDetails.stp.pathCost}</dd>
              </>
            )}
            {selectedPortDetails.stpError && <><dt className="text-slate-400">STP</dt><dd>{selectedPortDetails.stpError}</dd></>}
          </dl>
          {state.devices[selectedPortDetails.deviceId]?.vendor === 'cisco-ios' && (
            <button
              type="button"
              onClick={() => (onOpenDeviceConsole ?? onSelectDevice)(selectedPortDetails.deviceId)}
              className="w-full min-h-[40px] rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              Перейти в консоль {selectedPortDetails.deviceName}
            </button>
          )}
        </div>
      );
    }

    if (selectedHost) {
      return (
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Конечный узел
              </div>
              <div className="font-bold font-mono text-white">
                {selectedHost.hostname}
              </div>
            </div>
            {showCloseButton ? (
              <button
                type="button"
                onClick={() => setSelection(null)}
                aria-label="Сбросить выбор ПК"
                className="p-1.5 rounded-md text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSelection(null)}
                className="px-2 py-1 rounded-md border border-slate-700 text-[10.5px] font-medium text-slate-300 hover:text-white cursor-pointer"
              >
                К устройству
              </button>
            )}
          </div>
          {Object.values(selectedHost.interfaces).map(iface => (
            <div key={iface.name} className="rounded-lg border border-slate-700 bg-slate-950/60 p-2 font-mono text-[11px] space-y-0.5 text-slate-200">
              <div className="font-semibold text-white">{iface.name}</div>
              <div>IP: {iface.ipv4 ? `${iface.ipv4.address}/${iface.ipv4.prefix}` : 'не задан'}</div>
              <div>Статус: {interfaceStatus(state, selectedHost, iface).physical}</div>
            </div>
          ))}
          <HostPingPanel key={selectedHost.id} state={state} hostId={selectedHost.id} />
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-slate-300">Связь с другими ПК</div>
            {modeledHosts.filter(h => h.id !== selectedHost.id).map(peer => {
              const res = checkHostIpv4Reachability(state, selectedHost.id, peer.id);
              return (
                <div key={peer.id} className="flex items-center justify-between gap-2 text-[11px] font-mono py-0.5 border-b border-slate-800">
                  <span className={res.reachable ? 'text-emerald-300' : 'text-slate-400'}>
                    {res.reachable ? '✓' : '✗'} {peer.hostname}
                  </span>
                  <span className="text-slate-400">{res.vlanId ? `VLAN ${res.vlanId}` : '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              Активное устройство
            </div>
            <div className="font-bold font-mono text-sm text-white flex items-center gap-2 mt-0.5">
              <span>{activeDevice?.hostname ?? activeDeviceId}</span>
              {layer === 'stp' && rootDevices.has(activeDeviceId) && (
                <span className="text-[11px] text-emerald-300 font-semibold">★ Root</span>
              )}
            </div>
          </div>
          {onOpenDeviceConsole && activeDevice?.vendor === 'cisco-ios' && (
            <button
              type="button"
              onClick={() => onOpenDeviceConsole(activeDevice.id)}
              className="shrink-0 min-h-[34px] px-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              Консоль
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">
          Нажмите на кабель, разъём порта или компьютер на схеме для диагностики.
        </p>
        {activeDevice && (
          <div className="space-y-1">
            <div className="text-[11px] font-semibold text-slate-300">Интерфейсы {activeDevice.hostname}</div>
            <div className="space-y-1">
              {Object.values(activeDevice.interfaces).map(iface => {
                const st = interfaceStatus(state, activeDevice, iface);
                const stpPort = tree?.bridges[activeDevice.id]?.ports[iface.name];
                return (
                  <button
                    key={iface.name}
                    type="button"
                    onClick={() => setSelection({ kind: 'port', deviceId: activeDevice.id, interfaceName: iface.name })}
                    className="w-full text-left px-2.5 py-2 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-cyan-500/60 flex items-center justify-between gap-2 font-mono text-[11px] cursor-pointer"
                  >
                    <span className="font-semibold text-slate-100">{shortIf(iface.name)}</span>
                    <span className="text-slate-400 truncate">
                      {iface.ipv4
                        ? `${iface.ipv4.address}/${iface.ipv4.prefix}`
                        : iface.switchport?.mode === 'trunk'
                          ? 'TRK'
                          : iface.switchport?.mode === 'access'
                            ? `A:${iface.switchport.accessVlan ?? 1}`
                            : 'unset'}
                      {stpPort && layer === 'stp' ? ` · ${stpRoleTag(stpPort.portRole)}${stpPort.portState === 'blocking' ? ' ⊘' : ''}` : ''}
                    </span>
                    <span className={st.operUp ? 'text-emerald-400 shrink-0' : 'text-red-400 shrink-0'}>
                      {st.operUp ? 'up' : 'down'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {onToggleLink && state.links.some(l => state.devices[l.a]?.vendor === 'cisco-ios' && state.devices[l.b]?.vendor === 'cisco-ios') && (
          <div className="space-y-1.5 pt-1 border-t border-slate-800">
            <div className="text-[11px] font-semibold text-slate-300">Кабели кольца (тест отказа)</div>
            <div className="grid grid-cols-1 gap-1">
              {state.links.map((link, idx) => {
                if (state.devices[link.a]?.vendor !== 'cisco-ios' || state.devices[link.b]?.vendor !== 'cisco-ios') return null;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onToggleLink(idx)}
                    className={link.up
                      ? 'px-2.5 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 text-[11px] font-mono text-left flex items-center justify-between cursor-pointer'
                      : 'px-2.5 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-[11px] font-mono text-left flex items-center justify-between cursor-pointer'}
                  >
                    <span>{state.devices[link.a].hostname} {shortIf(link.aIf)} ↔ {state.devices[link.b].hostname} {shortIf(link.bIf)}</span>
                    <span>{link.up ? 'вкл' : 'обрыв'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {modeledHosts.length >= 4 && (
          <div className="space-y-1 pt-1 border-t border-slate-800">
            <div className="text-[11px] font-semibold text-slate-300">Связь ПК (модель IP + VLAN + CST)</div>
            <div className="grid grid-cols-1 gap-1">
              {([
                ['pc1v10', 'pc3v10'],
                ['pc2v10', 'pc4v10'],
                ['pc1v20', 'pc3v20'],
                ['pc2v20', 'pc4v20'],
              ] as const).map(([a, b]) => {
                if (!state.devices[a] || !state.devices[b]) return null;
                const res = checkHostIpv4Reachability(state, a, b);
                return (
                  <div
                    key={a + b}
                    className={res.reachable
                      ? 'px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 font-mono text-[11px] flex justify-between'
                      : 'px-2 py-1 rounded bg-red-500/10 text-red-300 font-mono text-[11px] flex justify-between'}
                  >
                    <span>{res.reachable ? '✓' : '✗'} {state.devices[a].hostname} ↔ {state.devices[b].hostname}</span>
                    <span>{res.vlanId ? `V${res.vlanId}` : '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      data-topology-ux="v2"
      className={
        fullscreen
          ? 'dark flex-1 min-h-0 h-full w-full flex flex-col bg-[#091220] text-slate-100 rounded-lg border border-slate-800 overflow-hidden'
          : 'dark rounded-2xl border border-slate-700 bg-[#091220] text-slate-100 overflow-hidden shadow-lg flex flex-col'
      }
    >
      {/* Single Slim Unified Control Bar */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-2 sm:px-3 py-1.5 border-b border-slate-800 bg-slate-900/95 min-h-[44px]">
        <div
          className="flex items-center gap-1 overflow-x-auto min-w-0 py-0.5"
          role="group"
          aria-label="Слой сетевой топологии"
        >
          {onChangeLayerChoice ? (
            LAYER_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={layerChoice === value}
                onClick={() => onChangeLayerChoice(value)}
                className={
                  layerChoice === value
                    ? 'shrink-0 rounded-lg bg-cyan-500 px-2 sm:px-2.5 py-1.5 text-[11px] font-bold text-slate-950 cursor-pointer'
                    : 'shrink-0 rounded-lg border border-slate-700 bg-slate-800/70 px-2 sm:px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:border-slate-500 cursor-pointer'
                }
              >
                {label}
                {value === 'auto' && layerChoice === 'auto' ? <span className="hidden sm:inline">{` · ${layer.toUpperCase()}`}</span> : ''}
              </button>
            ))
          ) : (
            <span className="font-mono text-xs font-semibold text-cyan-300 px-1 whitespace-nowrap">
              Слой · {layer.toUpperCase()}
            </span>
          )}
          {layer === 'stp' && rootDevices.size > 0 && (
            <span className="hidden md:inline-flex shrink-0 ml-1 text-[11px] font-mono text-emerald-300 whitespace-nowrap">
              Root: {[...rootDevices].map(id => state.devices[id]?.hostname ?? id).join(', ')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Strictly ONE prominent Fit button (no + / - zoom buttons) */}
          <button
            type="button"
            data-topology-fit
            onClick={fitView}
            aria-label="Вписать схему"
            className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 sm:px-3 rounded-lg border border-cyan-500/60 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 text-xs font-bold whitespace-nowrap cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
            Вписать
          </button>
          <button type="button" data-topology-auto-layout onClick={resetLayout} className="min-h-[36px] px-2 rounded-lg border border-slate-600 text-slate-200 text-xs whitespace-nowrap">Авторасстановка</button>

          {/* Desktop collapsible Inspector rail toggle */}
          <button
            type="button"
            data-inspector-toggle
            aria-pressed={desktopInspectorOpen}
            onClick={() => setDesktopInspectorOpen(v => !v)}
            className="hidden lg:inline-flex items-center gap-1.5 min-h-[36px] px-2.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:border-slate-500 text-slate-200 text-xs font-semibold whitespace-nowrap cursor-pointer"
          >
            {desktopInspectorOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            Инспектор
          </button>

          {!fullscreen && onEnterFullscreen && (
            <button
              type="button"
              onClick={onEnterFullscreen}
              className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:border-slate-500 text-slate-200 text-xs font-semibold whitespace-nowrap cursor-pointer"
              title="Развернуть схему на весь экран"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">На весь экран</span>
            </button>
          )}

          {!fullscreen && onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="min-h-[36px] px-2 rounded-lg text-slate-400 hover:text-white text-xs font-medium cursor-pointer"
              title="Скрыть схему"
            >
              <Minimize2 className="w-3.5 h-3.5 sm:hidden" />
              <span className="hidden sm:inline">Скрыть</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Edge-to-Edge Canvas + Side Rail (Desktop) or Bottom Sheet (Mobile) */}
      <div className={fullscreen ? 'relative flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden' : 'relative flex flex-col lg:flex-row overflow-hidden'}>
        {/* Left / Main Canvas Column */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col relative">
          <div
            ref={stageRef}
            data-topology-stage="v2"
            onPointerDown={startPan}
            onPointerMove={movePan}
            onPointerUp={stopPan}
            onPointerCancel={stopPan}
            className={
              fullscreen
                ? 'relative flex-1 min-h-0 w-full bg-[#091220] select-none overflow-hidden touch-none overscroll-none cursor-grab active:cursor-grabbing'
                : 'relative w-full h-[320px] sm:h-[400px] lg:h-[440px] bg-[#091220] select-none overflow-hidden touch-none overscroll-none cursor-grab active:cursor-grabbing'
            }
          >
            <svg
              width="100%"
              height="100%"
              className="block w-full h-full"
              role="img"
              aria-label="Интерактивная сетевая топология"
            >
              <defs>
                <pattern id="exp-topo-v2-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="1.5" cy="1.5" r="1" fill="#1e293b" />
                </pattern>
              </defs>
              <rect
                width="100%"
                height="100%"
                fill="url(#exp-topo-v2-dots)"
                onClick={() => guardClick(() => {
                  setSelection(null);
                  setMobileSheetOpen(false);
                })}
              />

              <g data-topology-transform transform={`translate(${transform.tx}, ${transform.ty}) scale(${transform.scale})`}>
                {/* 1. Cables */}
                {graph.links.map(link => {
                  const rawLink = state.links[link.index];
                  const aDev = state.devices[link.a.deviceId];
                  const bDev = state.devices[link.b.deviceId];
                  const aIf = aDev?.interfaces[link.a.ifaceName];
                  const bIf = bDev?.interfaces[link.b.ifaceName];
                  const aStat = interfaceStatus(state, aDev, aIf ?? { name: link.a.ifaceName, adminUp: false });
                  const bStat = interfaceStatus(state, bDev, bIf ?? { name: link.b.ifaceName, adminUp: false });
                  const phyUp = !!rawLink?.up && aStat.operUp && bStat.operUp;
                  const aStp = tree?.bridges[link.a.deviceId]?.ports[link.a.ifaceName];
                  const bStp = tree?.bridges[link.b.deviceId]?.ports[link.b.ifaceName];
                  const aBlocked = aStp?.portState === 'blocking' && aStp.portRole !== 'disabled';
                  const bBlocked = bStp?.portState === 'blocking' && bStp.portRole !== 'disabled';
                  const stpBlocked = layer === 'stp' && phyUp && (aBlocked || bBlocked);

                  const aMode = aIf?.switchport?.mode;
                  const bMode = bIf?.switchport?.mode;
                  const isTrunk = aMode === 'trunk' && bMode === 'trunk';
                  const mismatch = (aMode === 'trunk' && bMode === 'access') || (aMode === 'access' && bMode === 'trunk');
                  const accessVlan = aMode === 'access' ? aIf?.switchport?.accessVlan : bMode === 'access' ? bIf?.switchport?.accessVlan : undefined;

                  let strokeColor = '#10b981';
                  let strokeDash: string | undefined;
                  let strokeW = 3;
                  if (!phyUp) {
                    strokeColor = '#ef4444';
                    strokeDash = '7 5';
                    strokeW = 2.5;
                  } else if (stpBlocked) {
                    strokeColor = '#f59e0b';
                    strokeDash = '9 4 2 4';
                    strokeW = 3;
                  } else if (layer === 'vlan') {
                    if (mismatch) {
                      strokeColor = '#f59e0b';
                      strokeDash = '6 4';
                    } else if (isTrunk) {
                      strokeColor = '#38bdf8';
                      strokeW = 4.2;
                    } else if (accessVlan != null) {
                      strokeColor = vlanAccent(accessVlan);
                    }
                  }

                  const isLinkSelected = selection?.kind === 'link' && selection.linkIndex === link.index;
                  const isEndPortSelected = selection?.kind === 'port' && (
                    (selection.deviceId === link.a.deviceId && selection.interfaceName === link.a.ifaceName) ||
                    (selection.deviceId === link.b.deviceId && selection.interfaceName === link.b.ifaceName)
                  );
                  const highlighted = isLinkSelected || isEndPortSelected;

                  return (
                    <g
                      key={`cable-${link.index}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`Кабель ${aDev?.hostname} ${link.a.shortName} — ${bDev?.hostname} ${link.b.shortName}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        guardClick(() => revealSelection({ kind: 'link', linkIndex: link.index }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          revealSelection({ kind: 'link', linkIndex: link.index });
                        }
                      }}
                      className="cursor-pointer focus:outline-none"
                    >
                      {highlighted && (
                        <path
                          d={link.pathD}
                          fill="none"
                          stroke="#22d3ee"
                          strokeOpacity={0.35}
                          strokeWidth={strokeW + 7}
                          strokeLinecap="round"
                        />
                      )}
                      <path
                        d={link.pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={highlighted ? strokeW + 1.2 : strokeW}
                        strokeDasharray={strokeDash}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {isTrunk && phyUp && !stpBlocked && layer === 'vlan' && (
                        <path
                          d={link.pathD}
                          fill="none"
                          stroke="#0f172a"
                          strokeWidth={1.3}
                          strokeDasharray="4 4"
                          strokeLinecap="round"
                        />
                      )}
                      <path d={link.pathD} fill="none" stroke="transparent" strokeWidth={20} />

                      {!phyUp && (
                        <g transform={`translate(${link.midX}, ${link.midY})`} className="pointer-events-none">
                          <circle r={9.5} fill="#450a0a" stroke="#ef4444" strokeWidth={1.6} />
                          <path d="M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5" stroke="#fecaca" strokeWidth={1.8} strokeLinecap="round" />
                        </g>
                      )}
                      {stpBlocked && (
                        <g transform={`translate(${link.midX}, ${link.midY})`} className="pointer-events-none">
                          <polygon points="0,-10 9,-4 9,4 0,10 -9,4 -9,-4" fill="#451a03" stroke="#f59e0b" strokeWidth={1.6} />
                          <circle r={4.5} fill="none" stroke="#fde68a" strokeWidth={1.4} />
                          <line x1={-3} y1={3} x2={3} y2={-3} stroke="#fde68a" strokeWidth={1.4} />
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* 2. Devices */}
                {graph.nodes.map(node => renderDeviceNode(
                  node,
                  state,
                  layer,
                  activeDeviceId,
                  rootDevices,
                  tree,
                  selection,
                  guardClick,
                  (id) => {
                    onSelectDevice(id);
                    setSelection(null);
                  },
                  (hostId) => revealSelection({ kind: 'host', hostId }),
                ))}

                {/* 3. Physical Port Sockets */}
                {graph.links.flatMap(link => [
                  { port: link.a, linkIndex: link.index },
                  { port: link.b, linkIndex: link.index },
                ]).map(({ port, linkIndex }) => {
                  const rawLink = state.links[linkIndex];
                  const dev = state.devices[port.deviceId];
                  const iface = dev?.interfaces[port.ifaceName];
                  const stat = interfaceStatus(state, dev, iface ?? { name: port.ifaceName, adminUp: false });
                  const peerDev = state.devices[port.peerId];
                  const peerIf = peerDev?.interfaces[port.peerIface];
                  const peerStat = interfaceStatus(state, peerDev, peerIf ?? { name: port.peerIface, adminUp: false });
                  const phyUp = !!rawLink?.up && stat.operUp && peerStat.operUp;
                  const stpPort = tree?.bridges[port.deviceId]?.ports[port.ifaceName];
                  const isBlocked = layer === 'stp' && phyUp && stpPort?.portState === 'blocking' && stpPort.portRole !== 'disabled';

                  const isPortSelected =
                    (selection?.kind === 'port' && selection.deviceId === port.deviceId && selection.interfaceName === port.ifaceName) ||
                    (selection?.kind === 'link' && selection.linkIndex === linkIndex);

                  let fill = '#10b981';
                  let border = '#022c22';
                  if (!iface?.adminUp) {
                    fill = '#475569';
                    border = '#94a3b8';
                  } else if (!phyUp) {
                    fill = '#ef4444';
                    border = '#fecaca';
                  } else if (isBlocked) {
                    fill = '#f59e0b';
                    border = '#fef3c7';
                  }

                  return (
                    <g
                      key={`socket-${port.key}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`Порт ${dev?.hostname} ${port.ifaceName}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        guardClick(() => revealSelection({ kind: 'port', deviceId: port.deviceId, interfaceName: port.ifaceName, linkIndex }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          revealSelection({ kind: 'port', deviceId: port.deviceId, interfaceName: port.ifaceName, linkIndex });
                        }
                      }}
                      className="cursor-pointer focus:outline-none"
                    >
                      <title>{`${dev?.hostname} ${port.ifaceName} · ${stat.physical}/${stat.protocol}${stpPort ? ` · STP ${stpPort.portRole}/${stpPort.portState}` : ''}`}</title>
                      {isPortSelected && (
                        <circle cx={port.x} cy={port.y} r={10} fill="none" stroke="#22d3ee" strokeWidth={2.2} />
                      )}
                      <rect
                        x={port.x - 5.5}
                        y={port.y - 5.5}
                        width={11}
                        height={11}
                        rx={2.5}
                        fill={fill}
                        stroke={isPortSelected ? '#22d3ee' : border}
                        strokeWidth={1.5}
                      />
                      {isBlocked && (
                        <line x1={port.x - 3} y1={port.y + 3} x2={port.x + 3} y2={port.y - 3} stroke="#451a03" strokeWidth={1.6} />
                      )}
                      {!iface?.adminUp && (
                        <path d={`M ${port.x - 2.5} ${port.y - 2.5} L ${port.x + 2.5} ${port.y + 2.5} M ${port.x + 2.5} ${port.y - 2.5} L ${port.x - 2.5} ${port.y + 2.5}`} stroke="#f8fafc" strokeWidth={1.3} />
                      )}
                    </g>
                  );
                })}

                {/* 4. Collision-Free Port Labels Anchored to Sockets */}
                {placedLabels.map(label => {
                  const dev = state.devices[label.deviceId];
                  const rawLink = state.links[label.linkIndex];
                  const iface = dev?.interfaces[label.ifaceName];
                  const stpPort = tree?.bridges[label.deviceId]?.ports[label.ifaceName];
                  const aStat = interfaceStatus(state, dev, iface ?? { name: label.ifaceName, adminUp: false });
                  const link = graph.links[label.linkIndex];
                  const peerPort = link.a.deviceId === label.deviceId && link.a.ifaceName === label.ifaceName ? link.b : link.a;
                  const peerDev = state.devices[peerPort.deviceId];
                  const peerIf = peerDev?.interfaces[peerPort.ifaceName];
                  const peerStat = interfaceStatus(state, peerDev, peerIf ?? { name: peerPort.ifaceName, adminUp: false });
                  const phyUp = !!rawLink?.up && aStat.operUp && peerStat.operUp;
                  const isBlocked = layer === 'stp' && phyUp && stpPort?.portState === 'blocking' && stpPort.portRole !== 'disabled';

                  const isHighlighted =
                    (selection?.kind === 'port' && selection.deviceId === label.deviceId && selection.interfaceName === label.ifaceName) ||
                    (selection?.kind === 'link' && selection.linkIndex === label.linkIndex);

                  const borderStroke = isHighlighted
                    ? '#22d3ee'
                    : !phyUp
                      ? '#ef4444'
                      : isBlocked
                        ? '#f59e0b'
                        : '#334155';
                  const bgFill = isHighlighted ? '#083344' : '#0f172a';
                  const textFill = isHighlighted ? '#ecfeff' : isBlocked ? '#fde68a' : !phyUp ? '#fecaca' : '#e2e8f0';

                  return (
                    <g
                      key={`lbl-${label.key}`}
                      role="button"
                      tabIndex={0}
                      aria-label={`Подпись порта ${dev?.hostname} ${label.ifaceName}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        guardClick(() => revealSelection({ kind: 'port', deviceId: label.deviceId, interfaceName: label.ifaceName, linkIndex: label.linkIndex }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          revealSelection({ kind: 'port', deviceId: label.deviceId, interfaceName: label.ifaceName, linkIndex: label.linkIndex });
                        }
                      }}
                      className="cursor-pointer focus:outline-none"
                    >
                      <rect
                        x={label.x - label.width / 2}
                        y={label.y - label.height / 2}
                        width={label.width}
                        height={label.height}
                        rx={4}
                        fill={bgFill}
                        fillOpacity={0.95}
                        stroke={borderStroke}
                        strokeWidth={isHighlighted ? 1.6 : 1}
                      />
                      <text
                        x={label.x}
                        y={label.y + 3.8}
                        textAnchor="middle"
                        fontSize={10.5}
                        fontWeight={600}
                        fill={textFill}
                        className="font-mono pointer-events-none select-none"
                      >
                        {label.text}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Slim Single-Line Legend & Gesture Hint */}
          <div className="shrink-0 px-2.5 sm:px-3 py-1 border-t border-slate-800/90 bg-slate-950/90 flex items-center justify-between gap-2 text-[10.5px] font-mono text-slate-400 overflow-x-auto whitespace-nowrap">
            <div className="flex items-center gap-x-3">
              <span><span className="text-emerald-400">━</span> {layer === 'stp' ? 'Forwarding' : 'PHY Up'}</span>
              {layer === 'stp' && <span><span className="text-amber-400">╍⊘</span> STP Blocking</span>}
              <span><span className="text-red-400">╌✕</span> PHY Down</span>
              {layer === 'stp' && <span>★ Root · RP/DP/ND</span>}
              {layer === 'vlan' && <span>A:10 Access · TRK Trunk</span>}
            </div>
            <span className="hidden lg:inline text-slate-500">
              Колёсико — масштаб · перетаскивание — панорама · {Math.round(transform.scale * 100)}%
            </span>
          </div>
        </div>

        {/* Desktop Side-by-Side Collapsible Inspector Rail */}
        {desktopInspectorOpen && (
          <aside
            data-desktop-inspector
            className="hidden lg:flex w-[320px] xl:w-[348px] shrink-0 h-full min-h-0 border-l border-slate-800 bg-slate-900/95 flex-col overflow-hidden text-xs"
            aria-label="Инспектор выбранного элемента"
            aria-live="polite"
          >
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3">
              {renderInspectorBody(true)}
            </div>
          </aside>
        )}

        {/* Mobile Compact Bottom Thumb Bar */}
        <div className="lg:hidden shrink-0 px-2.5 py-1.5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-2">
          <button
            type="button"
            data-mobile-inspector-trigger
            aria-expanded={mobileSheetOpen}
            onClick={() => setMobileSheetOpen(v => !v)}
            className="flex-1 min-w-0 min-h-[38px] px-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between gap-2 text-left text-xs font-mono text-slate-100 cursor-pointer"
          >
            <span className="truncate">
              <span className="text-cyan-400 font-semibold">Инспектор</span> · {thumbSummary}
            </span>
            <ChevronUp className={`w-4 h-4 shrink-0 text-cyan-300 transition-transform ${mobileSheetOpen ? 'rotate-180' : ''}`} />
          </button>

          {fullscreen && onOpenDeviceConsole && activeDevice?.vendor === 'cisco-ios' && (
            <button
              type="button"
              onClick={() => onOpenDeviceConsole(activeDevice.id)}
              className="shrink-0 min-h-[38px] px-2.5 rounded-lg border border-cyan-500/40 bg-cyan-500/15 text-cyan-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              {activeDevice.hostname}
            </button>
          )}
        </div>

        {/* Mobile Slide-Up Bottom Sheet Inspector */}
        {mobileSheetOpen && (
          <section
            data-mobile-inspector-sheet
            aria-label="Инспектор элемента топологии"
            aria-live="polite"
            className="lg:hidden absolute inset-x-0 bottom-0 z-20 max-h-[58dvh] flex flex-col rounded-t-2xl border-t border-cyan-500/40 bg-slate-900 shadow-[0_-12px_36px_rgba(2,6,23,0.9)] text-xs"
          >
            <div className="shrink-0 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between gap-2">
              <div className="min-w-0 flex items-center gap-2">
                <span className="inline-block w-7 h-1 rounded-full bg-slate-600 shrink-0" aria-hidden="true" />
                <span className="font-mono font-bold text-slate-100 truncate">{sheetTitle}</span>
              </div>
              <button
                type="button"
                data-mobile-inspector-close
                onClick={() => setMobileSheetOpen(false)}
                aria-label="Закрыть инспектор"
                className="w-11 h-11 -my-1 -mr-1.5 inline-flex items-center justify-center rounded-lg text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3">
              {renderInspectorBody(false)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

function renderDeviceNode(
  node: LayoutNode,
  state: NetworkState,
  layer: TopologyLayer,
  activeDeviceId: string,
  rootDevices: Set<string>,
  tree: SpanningTreeResult | null,
  selection: Selection,
  guardClick: (fn: () => void) => void,
  onSelectSwitch: (id: string) => void,
  onSelectHost: (id: string) => void,
) {
  const dev = state.devices[node.id];
  if (!dev) return null;
  const hw = node.width / 2;
  const hh = node.height / 2;
  const isActive = activeDeviceId === node.id;
  const isRoot = layer === 'stp' && rootDevices.has(node.id);
  const isHostSelected = selection?.kind === 'host' && selection.hostId === node.id;

  if (node.kind === 'host') {
    const eth0 = Object.values(dev.interfaces)[0];
    const ipText = eth0?.ipv4 ? `${eth0.ipv4.address}/${eth0.ipv4.prefix}` : 'no IP';
    const hostLink = state.links.find(l => l.a === node.id || l.b === node.id);
    const swId = hostLink ? (hostLink.a === node.id ? hostLink.b : hostLink.a) : undefined;
    const swIf = hostLink ? (hostLink.a === node.id ? hostLink.bIf : hostLink.aIf) : undefined;
    const accessVlan = swId && swIf ? state.devices[swId]?.interfaces[swIf]?.switchport?.accessVlan : undefined;
    const strokeCol = isHostSelected ? '#22d3ee' : layer === 'vlan' && accessVlan ? vlanAccent(accessVlan) : '#38bdf8';

    return (
      <g
        key={node.id}
        data-draggable-device={node.id}
        role="button"
        tabIndex={0}
        aria-label={`Компьютер ${node.hostname}, ${ipText}`}
        onClick={(e) => {
          e.stopPropagation();
          guardClick(() => onSelectHost(node.id));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectHost(node.id);
          }
        }}
        className="cursor-pointer focus:outline-none"
      >
        <rect x={node.x - hw} y={node.y - hh}
          width={node.width} height={node.height} rx={9}
          fill="#101c32" stroke={strokeCol} strokeWidth={isHostSelected ? 2.5 : 1.5} />

        <g pointerEvents="none">
          <rect x={node.x - 33} y={node.y - 31}
            width={15} height={38} rx={3} fill="#1d3156"
            stroke="#5b78a9" strokeWidth={1.1} />
          <rect x={node.x - 30} y={node.y - 27}
            width={9} height={5} rx={2} fill="#0c1830"
            stroke="#80b5dd" strokeWidth={0.7} />
          <circle cx={node.x - 25.5} cy={node.y - 14} r={2.1} fill="#38bdf8" />
          <g fill="#607fa7">
            <circle cx={node.x - 29} cy={node.y + 2} r={0.8} />
            <circle cx={node.x - 25.5} cy={node.y + 2} r={0.8} />
            <circle cx={node.x - 22} cy={node.y + 2} r={0.8} />
          </g>
          <rect x={node.x - 14} y={node.y - 32}
            width={49} height={32} rx={4} fill="#1d3156"
            stroke="#7db7e5" strokeWidth={1.2} />
          <rect x={node.x - 11} y={node.y - 29}
            width={43} height={25} rx={2} fill="#209fce" />
          <path d={`M ${node.x - 9} ${node.y - 27} L ${node.x + 3} ${node.y - 27} L ${node.x + 28} ${node.y - 5} L ${node.x + 17} ${node.y - 5} Z`}
            fill="#8bdbfa" opacity={0.65} />
          <path d={`M ${node.x + 12} ${node.y} V ${node.y + 6} M ${node.x + 2} ${node.y + 6} H ${node.x + 22}`}
            stroke="#7c9bc9" strokeWidth={2.5} strokeLinecap="round" />
        </g>

        <text x={node.x} y={node.y + 19} textAnchor="middle" fontSize={12} fontWeight={700} fill="#f8fafc" className="font-mono pointer-events-none select-none">
          {node.hostname}
        </text>
        <text x={node.x} y={node.y + 34} textAnchor="middle" fontSize={10.5} fill="#bae6fd" className="font-mono pointer-events-none select-none">
          {ipText}
        </text>
        {layer === 'vlan' && accessVlan != null && (
          <text x={node.x + hw - 6} y={node.y - hh + 12} textAnchor="end" fontSize={9.5} fontWeight={700} fill={vlanAccent(accessVlan)} className="font-mono pointer-events-none select-none">
            V{accessVlan}
          </text>
        )}
      </g>
    );
  }

  const physPorts = Object.values(dev.interfaces).filter(isPhysicalPort).slice(0, 16);
  const ips = layer === 'ip'
    ? Object.values(dev.interfaces)
      .filter(i => i.ipv4)
      .map(i => `${shortIf(i.name)} ${i.ipv4!.address}/${i.ipv4!.prefix}`)
    : [];

  const bodyFill = isActive ? '#0c4a6e' : isRoot ? '#064e3b' : '#132033';
  const bodyStroke = isActive ? '#22d3ee' : isRoot ? '#34d399' : '#64748b';

  return (
    <g
      key={node.id}
      data-draggable-device={node.id}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={`${node.kind === 'router' ? 'Маршрутизатор' : 'Коммутатор'} ${node.hostname}${isActive ? ', активный' : ''}${isRoot ? ', Root Bridge' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        guardClick(() => onSelectSwitch(node.id));
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectSwitch(node.id);
        }
      }}
      className="cursor-pointer focus:outline-none"
    >
      <rect
        x={node.x - hw} y={node.y - hh}
        width={node.width} height={node.height} rx={7}
        fill={bodyFill} stroke={bodyStroke}
        strokeWidth={isActive || isRoot ? 2.5 : 1.6}
      />
      <path
        d={`M ${node.x - hw + 7} ${node.y - hh + 3} H ${node.x + hw - 7}`}
        stroke="#94a3b8" strokeOpacity={0.55} strokeWidth={1.3}
        strokeLinecap="round" pointerEvents="none"
      />
      <rect
        x={node.x - hw + 7} y={node.y - hh + 7}
        width={node.width - 14} height={30} rx={3}
        fill="#09111f" stroke="#475569" strokeWidth={0.8}
      />
      {node.kind === 'router' ? (
        <g className="pointer-events-none" stroke="#38bdf8" fill="none" strokeWidth={2}>
          <circle cx={node.x} cy={node.y - hh + 22} r={10} />
          <path d={`M ${node.x - 7} ${node.y - hh + 22} H ${node.x + 7} M ${node.x} ${node.y - hh + 15} V ${node.y - hh + 29}`} />
        </g>
      ) : (
        <>
          {Array.from({ length: 16 }, (_, idx) => {
            const col = idx % 8;
            const row = Math.floor(idx / 8);
            const px = node.x - hw + 12 + col * ((node.width - 30) / 8);
            const py = node.y - hh + 10 + row * 13;
            const iface = physPorts[idx];
            const st = iface ? interfaceStatus(state, dev, iface) : null;
            const stpPort = iface ? tree?.bridges[node.id]?.ports[iface.name] : null;
            const blocked = layer === 'stp' && !!st?.operUp && stpPort?.portState === 'blocking' && stpPort.portRole !== 'disabled';
            const ledColor = !iface ? '#334155' : !iface.adminUp ? '#64748b' : !st?.operUp ? '#ef4444' : blocked ? '#f59e0b' : '#34d399';
            return (
              <g key={idx} pointerEvents="none">
                <rect x={px} y={py} width={9.5} height={10} rx={1}
                  fill="#020617" stroke="#64748b" strokeWidth={0.7} />
                <path d={`M ${px + 2} ${py + 1} V ${py + 3} H ${px + 7.5} V ${py + 1}`}
                  stroke="#94a3b8" strokeWidth={0.6} fill="none" />
                <rect x={px + 2.2} y={py + 7} width={5} height={1.5} rx={0.4}
                  fill="#475569" />
                <circle cx={px + 4.7} cy={py + 11.1} r={1.1} fill={ledColor} />
              </g>
            );
          })}
          <circle cx={node.x + hw - 11} cy={node.y - hh + 22}
            r={2.5} fill={isActive ? '#22d3ee' : '#34d399'} pointerEvents="none" />
        </>
      )}

      <text
        x={node.x}
        y={ips.length > 0 ? node.y + 6 : node.y + 12}
        textAnchor="middle"
        fontSize={14}
        fontWeight={700}
        fill="#f8fafc"
        className="font-mono pointer-events-none select-none"
      >
        {node.hostname}
      </text>
      <text
        x={node.x}
        y={ips.length > 0 ? node.y + 19 : node.y + 26}
        textAnchor="middle"
        fontSize={9.5}
        fontWeight={600}
        fill={isRoot ? '#6ee7b7' : isActive ? '#67e8f9' : '#94a3b8'}
        className="font-mono pointer-events-none select-none"
      >
        {isRoot && isActive ? '★ ROOT · CLI' : isRoot ? '★ ROOT' : isActive ? '● CLI' : node.kind === 'router' ? 'ROUTER' : 'SWITCH'}
      </text>
      {ips.length > 0 && (
        <text
          x={node.x}
          y={node.y + 32}
          textAnchor="middle"
          fontSize={9.5}
          fill="#bae6fd"
          className="font-mono pointer-events-none select-none"
        >
          {ips[0]}{ips.length > 1 ? ` (+${ips.length - 1})` : ''}
        </text>
      )}
    </g>
  );
}
