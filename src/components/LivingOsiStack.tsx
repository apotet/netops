import React, { useState, useEffect } from 'react';
import { triggerHaptic } from '../utils/haptics';
import {
  Sparkles,
  ArrowDown,
  ArrowUp,
  Layers,
  ChevronRight,
  Shield,
  Activity,
  Cpu,
  Globe,
  Radio,
  FileCode,
  HardDrive,
  ExternalLink,
} from 'lucide-react';

export interface OsiLayerItem {
  id: number;
  level: string; // 'L7', 'L6', etc.
  name: string;
  pdu: string;
  color: string;
  glowColor: string;
  protocols: string[];
  description: string;
  devices: string;
  cliTool: string;
  headerFields: string[];
}

export const OSI_STACK_DATA: OsiLayerItem[] = [
  {
    id: 7,
    level: 'L7',
    name: 'Прикладной',
    pdu: 'Данные',
    color: 'text-pink-400',
    glowColor: 'rgba(244, 114, 182, 0.4)',
    protocols: ['HTTP/3', 'HTTPS', 'DNS', 'DHCP', 'SSH', 'BGP'],
    description: 'Интерфейс приложений пользователя, API, веб-сокеты и сетевые сервисы.',
    devices: 'WAF, L7-балансировщики (Nginx/Envoy), веб-серверы',
    cliTool: 'curl -Iv https://site, dig +trace, nslookup',
    headerFields: ['HTTP Request/Response', 'DNS Query Type A/AAAA', 'DHCP Options'],
  },
  {
    id: 6,
    level: 'L6',
    name: 'Представления',
    pdu: 'Данные',
    color: 'text-purple-400',
    glowColor: 'rgba(192, 132, 252, 0.4)',
    protocols: ['TLS 1.3', 'JSON', 'ASCII', 'UTF-8', 'GZIP'],
    description: 'Шифрование сессии (TLS handshake), согласование кодировок и сжатие данных.',
    devices: 'Крипто-шлюзы, TLS Termination прокси',
    cliTool: 'openssl s_client -connect host:443',
    headerFields: ['TLS Record Header', 'Cipher Suites', 'X.509 Certificate'],
  },
  {
    id: 5,
    level: 'L5',
    name: 'Сеансовый',
    pdu: 'Данные',
    color: 'text-indigo-400',
    glowColor: 'rgba(129, 140, 248, 0.4)',
    protocols: ['RPC', 'NetBIOS', 'gRPC Sessions', 'SOCKS5'],
    description: 'Управление сессиями, контрольные точки синхронизации и восстановление диалога.',
    devices: 'Сеансовые шлюзы, координаторы микросервисов',
    cliTool: 'rpcinfo -p, nc -zv host 1080',
    headerFields: ['Session ID', 'Sync Points', 'Transaction Token'],
  },
  {
    id: 4,
    level: 'L4',
    name: 'Транспортный',
    pdu: 'Сегмент',
    color: 'text-cyan-400',
    glowColor: 'rgba(34, 211, 238, 0.4)',
    protocols: ['TCP', 'UDP', 'QUIC', 'SCTP'],
    description: 'Сквозная доставка процессов по портам (1-65535), 3-way handshake, скользящее окно.',
    devices: 'L4 балансировщики нагрузки (HAProxy, IPVS), Stateful Firewall',
    cliTool: 'ss -tulpn, netstat -rn, nc -zv',
    headerFields: ['Src Port (16b)', 'Dst Port (16b)', 'Seq/Ack Num', 'Flags: SYN/ACK/FIN/RST'],
  },
  {
    id: 3,
    level: 'L3',
    name: 'Сетевой',
    pdu: 'Пакет',
    color: 'text-teal-400',
    glowColor: 'rgba(45, 212, 191, 0.4)',
    protocols: ['IPv4', 'IPv6', 'ICMP', 'OSPF', 'IPsec'],
    description: 'Логическая сквозная IP-маршрутизация, декремент TTL, фрагментация MTU, таблицы FIB.',
    devices: 'Маршрутизаторы (Routers), L3-коммутаторы',
    cliTool: 'ip route, traceroute, ping, mtr',
    headerFields: ['Src IP (32b)', 'Dst IP (32b)', 'TTL (8b)', 'Protocol (TCP=6, UDP=17, ICMP=1)'],
  },
  {
    id: 2,
    level: 'L2',
    name: 'Канальный',
    pdu: 'Кадр',
    color: 'text-emerald-400',
    glowColor: 'rgba(52, 211, 153, 0.4)',
    protocols: ['Ethernet (802.3)', 'VLAN (802.1Q)', 'ARP', 'STP'],
    description: 'Физическая адресация по MAC-адресам, CAM-таблица коммутатора, защита от петель (STP).',
    devices: 'L2 Коммутаторы (Switches), сетевые карты (NIC)',
    cliTool: 'ip link, arp -a, bridge fdb show',
    headerFields: ['Dst MAC (48b)', 'Src MAC (48b)', '802.1Q Tag (VLAN ID)', 'EtherType', 'FCS CRC-32'],
  },
  {
    id: 1,
    level: 'L1',
    name: 'Физический',
    pdu: 'Биты',
    color: 'text-amber-400',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    protocols: ['1000BASE-T', '10GBASE-LR', 'Wi-Fi 6', 'SFP+'],
    description: 'Передача сигналов по меди (витая пара), импульсов по оптоволокну (SMF/MMF) или радиоэфиру.',
    devices: 'SFP/SFP+ модули, оптические кроссы, рефлектометры (OTDR), патч-панели',
    cliTool: 'ethtool eth0, ip link show',
    headerFields: ['Преамбула (7B)', 'SFD (1B)', 'Физические уровни напряжения/света'],
  },
];

interface LivingOsiStackProps {
  activeLevel?: string | null;
  onSelectLevel?: (level: string) => void;
  onExploreTheory?: (level: string) => void;
  onStartExamForLevel?: (level: string) => void;
  compact?: boolean;
}

export const LivingOsiStack: React.FC<LivingOsiStackProps> = ({
  activeLevel = 'L4',
  onSelectLevel,
  onExploreTheory,
  onStartExamForLevel,
  compact = false,
}) => {
  const [selectedLayerId, setSelectedLayerId] = useState<number>(4); // default L4 as in mockup
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const [isAutoAnimating, setIsAutoAnimating] = useState<boolean>(true);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  // Sync external activeLevel prop
  useEffect(() => {
    if (activeLevel) {
      const num = parseInt(activeLevel.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num >= 1 && num <= 7) {
        setSelectedLayerId(num);
      }
    }
  }, [activeLevel]);

  // Optical packet pulse animation down the fiber
  useEffect(() => {
    if (!isAutoAnimating) return;

    const interval = setInterval(() => {
      setSelectedLayerId((prev) => {
        if (direction === 'down') {
          if (prev <= 1) {
            setDirection('up');
            return 2;
          }
          return prev - 1;
        } else {
          if (prev >= 7) {
            setDirection('down');
            return 6;
          }
          return prev + 1;
        }
      });
    }, 2400);

    return () => clearInterval(interval);
  }, [direction, isAutoAnimating]);

  const handleLayerClick = (layer: OsiLayerItem) => {
    triggerHaptic('selection');
    setIsAutoAnimating(false);
    setSelectedLayerId(layer.id);
    if (onSelectLevel) {
      onSelectLevel(layer.level);
    }
  };

  const selectedLayer = OSI_STACK_DATA.find((l) => l.id === selectedLayerId) || OSI_STACK_DATA[3];

  return (
    <div className="w-full select-none space-y-3">
      {/* Stack Section Header */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight flex items-center gap-1.5">
            <span>Путь пакета</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
            (живая инкапсуляция)
          </span>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            setDirection((d) => (d === 'down' ? 'up' : 'down'));
          }}
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 border border-slate-300 dark:border-cyan-500/30 text-cyan-800 dark:text-cyan-300 font-mono text-[11px] font-bold transition-colors cursor-pointer"
          title="Сменить направление: инкапсуляция или декапсуляция"
        >
          {direction === 'down' ? (
            <>
              <span>L7 → L1</span>
              <ArrowDown className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            </>
          ) : (
            <>
              <span>L1 → L7</span>
              <ArrowUp className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            </>
          )}
        </button>
      </div>

      {/* Vertical Stack with Optical Fiber Channel */}
      <div className="relative rounded-2xl bg-white dark:bg-[#091524] border border-slate-200 dark:border-cyan-500/20 p-2.5 sm:p-3 overflow-hidden shadow-lg dark:shadow-2xl transition-colors">
        {/* Optical Fiber Background Glow in dark mode */}
        <div className="absolute top-0 right-1/4 w-32 h-full bg-cyan-500/5 blur-2xl pointer-events-none" />

        {/* Central Vertical Dotted Fiber Track */}
        <div
          className="absolute top-5 bottom-5 right-[102px] sm:right-[130px] w-px border-l-2 border-dashed border-slate-300 dark:border-cyan-500/30 pointer-events-none z-0"
          aria-hidden="true"
        />

        {/* Stack Layer Cards (L7 down to L1) */}
        <div className="space-y-1.5 relative z-10">
          {OSI_STACK_DATA.map((layer) => {
            const isSelected = selectedLayerId === layer.id;

            return (
              <div
                key={layer.id}
                onClick={() => handleLayerClick(layer)}
                className={`relative group rounded-xl p-3 sm:px-4 sm:py-3 transition-all duration-200 cursor-pointer flex items-center justify-between border ${
                  isSelected
                    ? 'bg-cyan-50 dark:bg-gradient-to-r dark:from-cyan-950/90 dark:via-slate-900 dark:to-cyan-950/70 border-cyan-500 dark:border-cyan-400 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/50'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900/90 text-slate-700 dark:text-slate-300'
                }`}
              >
                {/* Left: Level Badge & Layer Title */}
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`font-mono font-black text-xs sm:text-sm tracking-tight w-6 shrink-0 ${
                      isSelected ? 'text-cyan-700 dark:text-cyan-300 font-extrabold' : layer.color
                    }`}
                  >
                    {layer.level}
                  </span>

                  <span
                    className={`text-xs sm:text-sm font-semibold truncate ${
                      isSelected ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {layer.name}
                  </span>
                </div>

                {/* Right: Optical Fiber Node & PDU Name */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Glowing Node on the Fiber Path */}
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    {isSelected ? (
                      <div className="relative flex items-center justify-center">
                        {/* Outer optical beacon wave */}
                        <span className="absolute w-6 h-6 rounded-full bg-cyan-400/30 animate-ping" />
                        {/* Inner radiant diode */}
                        <div className="w-3.5 h-3.5 rounded-full bg-cyan-500 dark:bg-cyan-400 border-2 border-white dark:border-[#091524] shadow-[0_0_12px_#22d3ee]" />
                      </div>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-cyan-500/40 transition-colors" />
                    )}
                  </div>

                  {/* PDU Name */}
                  <span
                    className={`text-xs sm:text-sm font-mono w-16 sm:w-20 text-right ${
                      isSelected ? 'text-cyan-700 dark:text-cyan-300 font-bold' : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {layer.pdu}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Layer Micro-Inspection Card */}
      {selectedLayer && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-gradient-to-r dark:from-slate-900/95 dark:to-[#0b1b2d] border border-slate-200 dark:border-cyan-500/30 space-y-2.5 animate-fade-in text-xs transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-400/30">
                {selectedLayer.level}
              </span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">{selectedLayer.name} уровень</span>
            </div>

            <div className="flex items-center gap-1.5">
              {onExploreTheory && (
                <button
                  onClick={() => onExploreTheory(selectedLayer.level)}
                  type="button"
                  className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-semibold cursor-pointer transition-colors"
                >
                  В теорию →
                </button>
              )}
              {onStartExamForLevel && (
                <button
                  onClick={() => onStartExamForLevel(selectedLayer.level)}
                  type="button"
                  className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white dark:bg-cyan-500/20 dark:hover:bg-cyan-500/30 border border-cyan-600 dark:border-cyan-400/40 dark:text-cyan-300 text-[11px] font-bold cursor-pointer transition-colors"
                >
                  Тест {selectedLayer.level} →
                </button>
              )}
            </div>
          </div>

          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px] sm:text-xs">
            {selectedLayer.description}
          </p>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400 font-bold">Протоколы:</span>
            {selectedLayer.protocols.map((p) => (
              <span
                key={p}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200/80 dark:bg-black/40 text-cyan-800 dark:text-cyan-300 border border-slate-300 dark:border-cyan-500/20"
              >
                {p}
              </span>
            ))}
          </div>

          <div className="pt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            <span>PDU: <strong className="text-slate-800 dark:text-white">{selectedLayer.pdu}</strong></span>
            <span className="truncate max-w-[200px] text-right">CLI: <code className="text-cyan-700 dark:text-cyan-400">{selectedLayer.cliTool.split(',')[0]}</code></span>
          </div>
        </div>
      )}
    </div>
  );
};
