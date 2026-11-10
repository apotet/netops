import React, { useState, useEffect } from 'react';
import { triggerHaptic } from '../utils/haptics';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';

export interface OsiLayerItem {
  id: number;
  level: string;
  name: string;
  pdu: string;
  color: string;
  glowColor: string;
  protocols: string[];
  description: string;
  devices: string;
  cliTool: string;
  headerFields: string[];
  /** What happens to the PDU when the packet passes this layer going down */
  actionDown: string;
  /** What happens going up (decapsulation) */
  actionUp: string;
  /** Short label for the header block added at this layer */
  headerLabel: string;
  headerClass: string;
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
    actionDown: 'Приложение отдаёт полезную нагрузку (payload)',
    actionUp: 'Приложение получает готовые данные',
    headerLabel: 'Data',
    headerClass: 'bg-pink-500/80 text-pink-50 border-pink-400/50',
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
    actionDown: 'Шифрование / сжатие / кодировка',
    actionUp: 'Расшифровка и разбор представления',
    headerLabel: 'TLS',
    headerClass: 'bg-purple-500/80 text-purple-50 border-purple-400/50',
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
    actionDown: 'Привязка к сессии / диалогу',
    actionUp: 'Восстановление контекста сессии',
    headerLabel: 'Session',
    headerClass: 'bg-indigo-500/80 text-indigo-50 border-indigo-400/50',
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
    actionDown: 'Добавляется TCP/UDP: порты, seq/ack',
    actionUp: 'Снимается L4, данные → сокету',
    headerLabel: 'TCP/UDP',
    headerClass: 'bg-cyan-500/90 text-slate-950 border-cyan-300/60',
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
    actionDown: 'Добавляется IP: src/dst, TTL',
    actionUp: 'Снимается IP, TTL уже уменьшен на hop',
    headerLabel: 'IP',
    headerClass: 'bg-teal-500/90 text-slate-950 border-teal-300/60',
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
    actionDown: 'Оборачивается в Ethernet: MAC + FCS',
    actionUp: 'Снимается кадр, проверяется FCS',
    headerLabel: 'Eth',
    headerClass: 'bg-emerald-500/90 text-slate-950 border-emerald-300/60',
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
    actionDown: 'Кадр → биты / сигналы в среду',
    actionUp: 'Сигналы → биты → восстановление кадра',
    headerLabel: 'Bits',
    headerClass: 'bg-amber-500/90 text-slate-950 border-amber-300/60',
  },
];


/**
 * A concrete, protocol-aware walkthrough. The OSI rows describe conceptual
 * responsibilities; only the headers used by the selected traffic are drawn.
 * This is not a literal extra L5/L6/physical "header" for every packet.
 */
type ScenarioId = 'https' | 'dns' | 'ping';
type Direction = 'down' | 'up';
type InspectorTab = 'meaning' | 'professional' | 'fields';
type PacketBlock = { label: string; kind: 'payload' | 'tls' | 'transport' | 'ip' | 'ethernet' | 'fcs' | 'icmp' };

const SCENARIOS: Record<ScenarioId, {
  label: string; caption: string; application: string; destination: string;
  sourcePort: string; destinationPort: string; protocol: 'TCP' | 'UDP' | 'ICMP';
}> = {
  https: {
    label: 'HTTPS', caption: 'HTTP через TLS и TCP', application: 'HTTP GET /',
    destination: '203.0.113.20', sourcePort: '51432', destinationPort: '443', protocol: 'TCP',
  },
  dns: {
    label: 'DNS', caption: 'DNS-запрос через UDP', application: 'DNS Query A',
    destination: '192.168.2.20', sourcePort: '53124', destinationPort: '53', protocol: 'UDP',
  },
  ping: {
    label: 'Ping', caption: 'ICMP Echo Request без TCP/UDP', application: 'Echo data',
    destination: '192.168.2.20', sourcePort: '—', destinationPort: '—', protocol: 'ICMP',
  },
};

const LEVELS = OSI_STACK_DATA;
const SOURCE_IP = '192.168.1.10';
const SOURCE_MAC = '02:00:00:00:01:10';
const GATEWAY_MAC = '02:00:00:00:01:01';
const ROUTER_WAN_MAC = '02:00:00:00:02:01';
const SERVER_MAC = '02:00:00:00:02:20';

function packetBlocks(level: number, scenario: ScenarioId): PacketBlock[] {
  const result: PacketBlock[] = [{ label: SCENARIOS[scenario].application, kind: 'payload' }];
  if (scenario === 'https' && level <= 6) result.unshift({ label: 'TLS Record', kind: 'tls' });
  if (level <= 4 && scenario !== 'ping') {
    result.unshift({ label: SCENARIOS[scenario].protocol, kind: 'transport' });
  }
  if (level <= 3) {
    if (scenario === 'ping') result.unshift({ label: 'ICMP', kind: 'icmp' });
    result.unshift({ label: 'IPv4', kind: 'ip' });
  }
  if (level <= 2) {
    result.unshift({ label: 'Ethernet', kind: 'ethernet' });
    result.push({ label: 'FCS', kind: 'fcs' });
  }
  return result;
}

function layerDetails(level: number, scenario: ScenarioId, direction: Direction) {
  const s = SCENARIOS[scenario];
  const isPing = scenario === 'ping';
  const common = {
    7: {
      meaning: isPing
        ? 'Утилита ping просит систему отправить ICMP Echo Request. TCP и UDP ей не нужны.'
        : scenario === 'https'
          ? 'Браузер формирует HTTP-запрос. Следующий этап защитит его с помощью TLS.'
          : 'Клиент формирует вопрос DNS: какой IPv4-адрес соответствует имени?',
      professional: isPing
        ? 'ICMP Echo Request формируется в сетевом стеке. Ping — пользовательская программа, но ICMP передаётся непосредственно в IP.'
        : scenario === 'https'
          ? 'HTTP прикладного уровня. Для этого примера используется HTTPS поверх TLS 1.3 и TCP; не обобщать на HTTP/3 (QUIC/UDP).'
          : 'DNS message с Query Type A; рассматриваем UDP. В других условиях DNS может использовать TCP или защищённый транспорт.',
      fields: [['Данные приложения', s.application], ['Назначение', s.destination]],
    },
    6: {
      meaning: scenario === 'https'
        ? 'TLS защищает HTTP-запрос. На схеме появляется TLS Record, а не универсальный «заголовок L6».'
        : 'Отдельного заголовка шестого уровня в этом обмене нет. Данные проходят дальше без нового блока.',
      professional: scenario === 'https'
        ? 'L6 — концептуальная функция OSI. В реальном TCP/IP TLS работает над TCP. Шифруется прикладное содержимое; на проводе видны и другие служебные поля TLS.'
        : 'Функции представления не обязаны иметь отдельную единицу данных или заголовок для каждого протокола.',
      fields: scenario === 'https' ? [['Функция', 'Шифрование TLS'], ['На проводе', 'TLS Record внутри TCP']] : [['Дополнительный заголовок', 'Не добавляется']],
    },
    5: {
      meaning: 'Сеансовые функции могут поддерживать диалог приложений, но здесь мы не дорисовываем вымышленный заголовок Session.',
      professional: 'Уровни L5–L7 — модель OSI, а не обязательные последовательно вложенные заголовки современного TCP/IP. Управление сессией зависит от приложения и протокола.',
      fields: [['Дополнительный заголовок', 'Не добавляется'], ['Состав PDU', 'Не меняется']],
    },
    4: {
      meaning: isPing
        ? 'У ICMP нет TCP/UDP-портов. Отдельный транспортный заголовок не появляется.'
        : s.protocol === 'TCP'
          ? 'TCP добавляет порты источника и назначения, номера последовательности и флаги.'
          : 'UDP добавляет порты и длину датаграммы. TCP-соединение не устанавливается.',
      professional: isPing
        ? 'ICMP инкапсулируется напрямую в IPv4 (Protocol 1), а не в TCP или UDP.'
        : s.protocol === 'TCP'
          ? 'В примере показан TCP-сегмент с прикладным TLS Record. TCP handshake происходит до передачи этого HTTP-запроса и не нарисован как один пакет.'
          : 'UDP header содержит source port, destination port, length и checksum. Для этого запроса DNS destination port 53.',
      fields: isPing ? [['Транспорт', 'Нет TCP/UDP'], ['Порты', 'Не применяются']] :
        [['Протокол', s.protocol], ['Source port', s.sourcePort], ['Destination port', s.destinationPort]],
    },
    3: {
      meaning: 'IPv4 добавляет IP-адреса отправителя и получателя. На исходном ПК TTL равен 64; роутер уменьшит его при пересылке.',
      professional: 'Маршрут определяет next hop. При обычной маршрутизации без NAT IP назначения сохраняется; TTL уменьшается на маршрутизаторе, а не при каждом уровне OSI.',
      fields: [['Src IPv4', SOURCE_IP], ['Dst IPv4', s.destination], ['TTL на ПК', '64'], ['Protocol', isPing ? '1 · ICMP' : s.protocol === 'TCP' ? '6 · TCP' : '17 · UDP']],
    },
    2: {
      meaning: 'Для удалённой сети кадр направлен на MAC шлюза, а не на MAC конечного сервера. Сетевая карта добавляет Ethernet-заголовок и FCS.',
      professional: 'В модели ПК уже знает MAC шлюза из ARP. Ethernet-кадр включает dst/src MAC, EtherType 0x0800, payload IPv4 и FCS. При маршрутизации L2-заголовок будет создан заново.',
      fields: [['Src MAC', SOURCE_MAC], ['Dst MAC', GATEWAY_MAC + ' · шлюз'], ['EtherType', '0x0800 · IPv4'], ['FCS', 'CRC-32']],
    },
    1: {
      meaning: 'Сетевой адаптер передаёт готовый кадр как физические сигналы. Новый заголовок «Bits» внутрь кадра не добавляется.',
      professional: 'Физический уровень кодирует поток в сигналы среды. Преамбула и SFD передаются перед Ethernet MAC-кадром, но не являются новым вложенным L1-заголовком IP-пакета.',
      fields: [['Среда', 'Ethernet · пример проводного соединения'], ['Что передаётся', 'Биты и сигналы'], ['Добавленный заголовок', 'Нет']],
    },
  };
  const base = common[level as keyof typeof common];
  if (direction === 'down') return base;
  const receivingMeaning: Record<number, string> = {
    1: 'Сетевая карта принимает сигналы и восстанавливает Ethernet-кадр. Заголовок Bits не появляется.',
    2: 'Конечный сервер проверяет FCS, снимает Ethernet-обёртку и передаёт IP-пакет выше. MAC здесь уже адреса последнего перехода.',
    3: 'Сервер проверяет IP-адрес назначения и передаёт полезную нагрузку TCP/UDP или обработчику ICMP. После одного маршрутизатора TTL равен 63.',
    4: isPing ? 'Отдельного TCP/UDP нет: ICMP Echo Request обрабатывает сетевой стек.' : 'Транспортный протокол проверяет порт назначения, снимает свой заголовок и передаёт данные выше.',
    5: 'Обработка сеансового контекста зависит от приложения. Универсальный Session-заголовок снимать не нужно.',
    6: scenario === 'https' ? 'TLS проверяет и расшифровывает данные. HTTP-запрос становится доступным приложению.' : 'Отдельного заголовка представления не было — снимать нечего.',
    7: 'Приложение получило полезную нагрузку. Передача по стеку завершена.',
  };
  if (level === 2) return {
    ...base,
    meaning: receivingMeaning[level],
    professional: 'Это последний Ethernet-hop, а не исходный кадр ПК → шлюз. После маршрутизатора L2-заголовок формируется заново, IP-адреса без NAT остаются прежними.',
    fields: [['Src MAC', ROUTER_WAN_MAC + ' · роутер'], ['Dst MAC', SERVER_MAC + ' · сервер'], ['EtherType', '0x0800 · IPv4'], ['FCS', 'Проверяется при приёме']],
  };
  if (level === 3) return {
    ...base,
    meaning: receivingMeaning[level],
    professional: 'Маршрутизатор уменьшил исходный TTL 64 на 1. На конечном хосте IPv4 передаёт данные обработчику, определяемому полем Protocol: 6/TCP, 17/UDP, 1/ICMP.',
    fields: [['Src IPv4', SOURCE_IP], ['Dst IPv4', s.destination], ['TTL у сервера', '63'], ['Protocol', isPing ? '1 · ICMP' : s.protocol === 'TCP' ? '6 · TCP' : '17 · UDP']],
  };
  return { ...base, meaning: receivingMeaning[level] };
}

function visibleBlocks(level: number, scenario: ScenarioId, direction: Direction): PacketBlock[] {
  if (direction === 'down') return packetBlocks(level, scenario);
  if (level === 1) return packetBlocks(2, scenario);
  if (level === 3 && scenario === 'ping') {
    return [{ label: 'ICMP', kind: 'icmp' }, { label: SCENARIOS[scenario].application, kind: 'payload' }];
  }
  return packetBlocks(Math.min(7, level + 1), scenario);
}

function pduForLevel(level: number, scenario: ScenarioId, direction: Direction): string {
  if (direction === 'down') return pduAt(level, scenario);
  if (level === 1) return 'Кадр';
  if (level === 2) return 'IP-пакет';
  if (level === 3) return scenario === 'ping' ? 'ICMP' : scenario === 'dns' ? 'UDP-датаграмма' : 'TCP-сегмент';
  return 'Данные';
}

function pduAt(level: number, scenario: ScenarioId): string {
  if (level === 1) return 'Сигналы';
  if (level === 2) return 'Кадр';
  if (level === 3) return 'IP-пакет';
  if (level === 4 && scenario === 'https') return 'TCP-сегмент';
  if (level === 4 && scenario === 'dns') return 'UDP-датаграмма';
  return 'Данные';
}

const packetColors: Record<PacketBlock['kind'], string> = {
  payload: 'bg-pink-500/20 text-pink-900 dark:text-pink-100 border-pink-500/50',
  tls: 'bg-purple-500/20 text-purple-900 dark:text-purple-100 border-purple-500/50',
  transport: 'bg-cyan-500/20 text-cyan-900 dark:text-cyan-100 border-cyan-500/50',
  ip: 'bg-teal-500/20 text-teal-900 dark:text-teal-100 border-teal-500/50',
  ethernet: 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-100 border-emerald-500/50',
  fcs: 'bg-slate-300/50 text-slate-800 dark:bg-slate-600/30 dark:text-slate-200 border-slate-400/50',
  icmp: 'bg-amber-500/20 text-amber-900 dark:text-amber-100 border-amber-500/50',
};

interface LivingOsiStackProps {
  activeLevel?: string | null;
  onSelectLevel?: (level: string) => void;
  onExploreTheory?: (level: string) => void;
  onStartExamForLevel?: (level: string) => void;
  onOpenNetwork?: () => void;
  compact?: boolean;
}

export const LivingOsiStack: React.FC<LivingOsiStackProps> = ({
  activeLevel, onSelectLevel, onExploreTheory, onStartExamForLevel, onOpenNetwork,
}) => {
  const [scenario, setScenario] = useState<ScenarioId>('https');
  const [direction, setDirection] = useState<Direction>('down');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState<InspectorTab>('meaning');
  const [reducedMotion, setReducedMotion] = useState(false);
  const layerId = direction === 'down' ? 7 - step : 1 + step;
  const layer = LEVELS.find((item) => item.id === layerId) || LEVELS[0];
  const details = layerDetails(layerId, scenario, direction);
  const blocks = visibleBlocks(layerId, scenario, direction);
  const last = step === 6;

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!activeLevel) return;
    const value = Number(activeLevel.replace(/[^0-9]/g, ''));
    if (value >= 1 && value <= 7) {
      setStep(direction === 'down' ? 7 - value : value - 1);
      setPlaying(false);
    }
  }, [activeLevel, direction]);

  useEffect(() => {
    if (!playing) return;
    if (last) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setStep((value) => Math.min(6, value + 1)), 2700);
    return () => window.clearTimeout(timer);
  }, [playing, step, last]);

  const selectLayer = (id: number) => {
    triggerHaptic('selection');
    setPlaying(false);
    setStep(direction === 'down' ? 7 - id : id - 1);
    onSelectLevel?.('L' + id);
  };

  const selectScenario = (next: ScenarioId) => {
    setScenario(next);
    setStep(0);
    setPlaying(false);
    setTab('meaning');
  };

  const changeDirection = (next: Direction) => {
    setDirection(next);
    setStep(0);
    setPlaying(false);
  };

  const move = (amount: number) => {
    setPlaying(false);
    setStep((value) => Math.max(0, Math.min(6, value + amount)));
  };

  return (
    <section className="w-full space-y-3" aria-label="Интерактивный путь пакета">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Путь пакета</h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">Реальный стек на выбранном примере · 7 уровней OSI</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-700" aria-label="Направление передачи">
          <button type="button" onClick={() => changeDirection('down')} aria-pressed={direction === 'down'}
            className={'px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer min-h-10 ' + (direction === 'down' ? 'bg-cyan-500 text-slate-950' : 'text-slate-700 dark:text-slate-200')}>
            <ArrowDown className="w-3.5 h-3.5 inline" aria-hidden="true" /> Отправка
          </button>
          <button type="button" onClick={() => changeDirection('up')} aria-pressed={direction === 'up'}
            className={'px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer min-h-10 ' + (direction === 'up' ? 'bg-cyan-500 text-slate-950' : 'text-slate-700 dark:text-slate-200')}>
            <ArrowUp className="w-3.5 h-3.5 inline" aria-hidden="true" /> Приём
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Пример сетевого обмена">
        {(['https', 'dns', 'ping'] as ScenarioId[]).map((id) => (
          <button key={id} type="button" onClick={() => selectScenario(id)} aria-pressed={scenario === id}
            className={'min-h-10 px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer ' +
              (scenario === id ? 'bg-cyan-500 text-slate-950 border-cyan-500' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700')}>
            {SCENARIOS[id].label}
          </button>
        ))}
        <span className="self-center text-xs text-slate-600 dark:text-slate-300">{SCENARIOS[scenario].caption}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
        <div className="space-y-3 min-w-0">
          <div className="rounded-2xl bg-white dark:bg-[#091524] border border-slate-200 dark:border-cyan-500/25 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Шаг {step + 1} из 7 · {layer.level} {layer.name}</span>
              <span className="text-[11px] text-slate-600 dark:text-slate-300">{direction === 'down' ? 'Инкапсуляция ↓' : 'Декапсуляция ↑'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1" aria-label="Текущий состав данных">
              {blocks.map((block, index) => (
                <span key={block.kind + '-' + index}
                  className={'rounded-lg border px-2 py-1.5 text-xs font-mono font-bold break-words ' + packetColors[block.kind]}>
                  {block.label}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {layerId === 1 ? 'Передаётся поток сигналов — блока Bits внутри Ethernet нет.' :
                direction === 'down' ? 'Заголовки слева добавляются по мере инкапсуляции.' : 'Заголовки снимаются при обработке на принимающем устройстве.'}
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#091524] border border-slate-200 dark:border-cyan-500/25 p-2 space-y-1.5">
            {LEVELS.map((item) => {
              const selected = item.id === layerId;
              return (
                <button key={item.id} type="button" onClick={() => selectLayer(item.id)}
                  aria-pressed={selected} aria-label={'Уровень ' + item.id + ': ' + item.name}
                  className={'w-full min-h-[44px] flex items-center justify-between gap-2 text-left rounded-xl px-3 py-2 border cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500 transition-colors ' +
                    (selected ? 'bg-cyan-500/10 border-cyan-500 dark:border-cyan-400' : 'border-slate-200 dark:border-slate-800 hover:border-cyan-500/50')}>
                  <span className="flex items-center min-w-0 gap-2">
                    <span className={'font-mono font-bold shrink-0 text-xs ' + (selected ? 'text-cyan-700 dark:text-cyan-300' : 'text-slate-600 dark:text-slate-300')}>{item.level}</span>
                    <span className={'text-xs sm:text-sm font-semibold ' + (selected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300')}>{item.name}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {selected && <span className="w-2 h-2 rounded-full bg-cyan-500" aria-hidden="true" />}
                    <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">{pduForLevel(item.id, scenario, direction)}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => move(-1)} disabled={step === 0} aria-label="Предыдущий шаг"
                  className="min-h-11 min-w-11 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white disabled:opacity-40 cursor-pointer">
                  <ChevronLeft className="w-4 h-4 mx-auto" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => {
                    if (reducedMotion) { move(1); return; }
                    if (last) { setStep(0); setPlaying(true); return; }
                    setPlaying((value) => !value);
                  }} aria-label={playing ? 'Пауза' : reducedMotion ? 'Следующий шаг' : 'Воспроизвести'}
                  className="min-h-11 px-4 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer flex items-center gap-2">
                  {playing ? <Pause className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4" aria-hidden="true" />}
                  {playing ? 'Пауза' : reducedMotion ? 'Шаг' : 'Пуск'}
                </button>
                <button type="button" onClick={() => move(1)} disabled={last} aria-label="Следующий шаг"
                  className="min-h-11 min-w-11 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white disabled:opacity-40 cursor-pointer">
                  <ChevronRight className="w-4 h-4 mx-auto" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => { setPlaying(false); setStep(0); }} aria-label="К началу"
                  className="min-h-11 min-w-11 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white cursor-pointer">
                  <RotateCcw className="w-4 h-4 mx-auto" aria-hidden="true" />
                </button>
              </div>
              <span role="status" className="text-xs text-slate-600 dark:text-slate-300">{last ? 'Конец прохода' : playing ? 'Авто' : 'Ручной режим'}</span>
            </div>
            {reducedMotion && <p className="text-xs text-slate-600 dark:text-slate-300">Анимация отключена настройкой устройства. Переходи по шагам вручную.</p>}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl bg-white dark:bg-[#091524] border border-slate-200 dark:border-cyan-500/25 p-3 sm:p-4 space-y-3 lg:sticky lg:top-20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{layer.level} · {layer.name}</h3>
            <span className="text-xs text-cyan-700 dark:text-cyan-300 font-semibold">{pduForLevel(layerId, scenario, direction)}</span>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 dark:bg-slate-900 p-1" aria-label="Вид объяснения">
            {([
              ['meaning', 'Смысл'],
              ['professional', 'По делу'],
              ['fields', 'Поля'],
            ] as Array<[InspectorTab, string]>).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}
                className={'min-h-10 rounded-lg px-2 py-2 text-xs font-semibold cursor-pointer ' +
                  (tab === id ? 'bg-cyan-500 text-slate-950' : 'text-slate-700 dark:text-slate-300')}>
                {label}
              </button>
            ))}
          </div>
          <div aria-live="polite" className="text-sm leading-relaxed text-slate-800 dark:text-slate-200 min-h-[100px]">
            {tab === 'meaning' && <p>{details.meaning}</p>}
            {tab === 'professional' && <p>{details.professional}</p>}
            {tab === 'fields' && (
              <dl className="space-y-2">
                {details.fields.map(([name, value]) => (
                  <div key={name} className="grid grid-cols-1 sm:grid-cols-2 gap-1 rounded-lg bg-slate-50 dark:bg-slate-900 p-2">
                    <dt className="text-xs text-slate-600 dark:text-slate-400">{name}</dt>
                    <dd className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100 break-all">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          {onExploreTheory && <button type="button" onClick={() => onExploreTheory(layer.level)}
            className="min-h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
            Подробнее об уровне
          </button>}
          {onStartExamForLevel && <button type="button" onClick={() => onStartExamForLevel(layer.level)}
            className="min-h-10 ml-2 px-3 rounded-lg border border-cyan-500 text-xs font-bold text-cyan-700 dark:text-cyan-300 cursor-pointer">
            Тест {layer.level}
          </button>}
        </div>
      </div>
      <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <p>Модель OSI объясняет функции. В реальных стеках L5 и L6 не обязаны добавлять отдельные заголовки.</p>
        {onOpenNetwork && <button type="button" onClick={onOpenNetwork}
          className="min-h-11 px-3 rounded-xl border border-cyan-500 text-cyan-800 dark:text-cyan-300 font-bold cursor-pointer">
          По сети: открыть симулятор ping →
        </button>}
      </div>
    </section>
  );
};
