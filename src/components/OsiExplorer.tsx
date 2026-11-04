import React, { useState } from 'react';
import { Layers, ArrowDown, Shield, Server, Cpu, Globe, Laptop, HardDrive } from 'lucide-react';

interface LayerInfo {
  number: number;
  name: string;
  tcpIpName: string;
  pdu: string;
  color: string;
  borderColor: string;
  protocols: string[];
  devices: string[];
  functions: string;
  cliTools: string[];
  headers: string[];
}

const OSI_LAYERS: LayerInfo[] = [
  {
    number: 7,
    name: 'Прикладной (Application)',
    tcpIpName: 'Прикладной уровень (Application)',
    pdu: 'Данные (Data)',
    color: 'from-pink-500/20 to-rose-500/10 text-pink-300',
    borderColor: 'border-pink-500/30',
    protocols: ['HTTP/HTTPS', 'DNS', 'DHCP', 'SSH', 'FTP', 'SMTP', 'WebSocket'],
    devices: ['Веб-серверы', 'Прокси-серверы', 'WAF', 'Балансировщики L7 (Nginx)'],
    functions: 'Взаимодействие приложений пользователя с сетью, API интерфейсы, форматы запросов и ответов.',
    cliTools: ['curl', 'wget', 'nslookup', 'dig', 'ssh'],
    headers: ['HTTP Headers (Host, User-Agent, Content-Type, Cookies)'],
  },
  {
    number: 6,
    name: 'Представительский (Presentation)',
    tcpIpName: 'Прикладной уровень (Application)',
    pdu: 'Данные (Data)',
    color: 'from-purple-500/20 to-indigo-500/10 text-purple-300',
    borderColor: 'border-purple-500/30',
    protocols: ['TLS / SSL', 'ASCII', 'UTF-8', 'JPEG', 'JSON', 'GZIP'],
    devices: ['Крипто-ускорители', 'TLS Termination Gateway'],
    functions: 'Кодирование, сжатие данных и сквозное шифрование (TLS handshake, сертификаты X.509).',
    cliTools: ['openssl s_client', 'certbot'],
    headers: ['TLS Record Header, TLS Handshake ClientHello'],
  },
  {
    number: 5,
    name: 'Сеансовый (Session)',
    tcpIpName: 'Прикладной уровень (Application)',
    pdu: 'Данные (Data)',
    color: 'from-indigo-500/20 to-blue-500/10 text-indigo-300',
    borderColor: 'border-indigo-500/30',
    protocols: ['RPC', 'NetBIOS', 'PPTP', 'SOCKS5'],
    devices: ['Сеансовые шлюзы', 'Кластерные координаторы'],
    functions: 'Управление сессиями, контрольные точки синхронизации, восстановление прерванных сессий.',
    cliTools: ['rpcinfo'],
    headers: ['Session Token / RPC Request ID'],
  },
  {
    number: 4,
    name: 'Транспортный (Transport)',
    tcpIpName: 'Транспортный (Transport)',
    pdu: 'Сегмент (TCP) / Датаграмма (UDP)',
    color: 'from-blue-500/20 to-cyan-500/10 text-blue-300',
    borderColor: 'border-blue-500/30',
    protocols: ['TCP', 'UDP', 'QUIC', 'SCTP'],
    devices: ['L4 Балансировщики нагрузки (HAProxy, IPVS)', 'Stateful межсетевые экраны'],
    functions: 'Сквозная доставка между процессами хостов, адресация по портам (1-65535), 3-way handshake, надежность и контроль перегрузок.',
    cliTools: ['netstat -tulnp', 'ss -tulpn', 'nc -zv', 'telnet'],
    headers: ['Source Port (16b)', 'Dest Port (16b)', 'Seq Number (32b)', 'Ack Number (32b)', 'Flags: SYN/ACK/FIN/RST', 'Window Size'],
  },
  {
    number: 3,
    name: 'Сетевой (Network)',
    tcpIpName: 'Межсетевой (Internet)',
    pdu: 'Пакет (Packet)',
    color: 'from-cyan-500/20 to-teal-500/10 text-cyan-300',
    borderColor: 'border-cyan-500/30',
    protocols: ['IPv4', 'IPv6', 'ICMP', 'IPsec', 'OSPF', 'BGP'],
    devices: ['Маршрутизаторы (Routers)', 'L3-коммутаторы (Multilayer Switches)'],
    functions: 'Логическая адресация IP, таблица маршрутизации (FIB), декремент TTL, фрагментация при превышении MTU.',
    cliTools: ['ip route', 'ping', 'traceroute', 'mtr'],
    headers: ['Version', 'IHL', 'DSCP/TOS', 'Total Length', 'TTL (8b)', 'Protocol (TCP=6, UDP=17, ICMP=1)', 'Src IP', 'Dst IP'],
  },
  {
    number: 2,
    name: 'Канальный (Data Link)',
    tcpIpName: 'Сетевой доступ (Network Access)',
    pdu: 'Кадр (Frame)',
    color: 'from-teal-500/20 to-emerald-500/10 text-teal-300',
    borderColor: 'border-teal-500/30',
    protocols: ['Ethernet (802.3)', 'Wi-Fi (802.11)', 'VLAN (802.1Q)', 'ARP', 'STP (802.1D)', 'LACP (802.3ad)'],
    devices: ['Коммутаторы (Switches L2)', 'Сетевые карты (NIC)', 'Точки доступа (AP)', 'Мосты (Bridges)'],
    functions: 'Физическая адресация по MAC-адресам, изучение таблицы CAM, коммутация без петель (STP), обнаружение ошибок (FCS CRC32).',
    cliTools: ['ip link', 'arp -a', 'brctl', 'bridge fdb show', 'ethtool'],
    headers: ['Preamble', 'Dest MAC (48b)', 'Src MAC (48b)', '802.1Q Tag (optional 32b)', 'EtherType (0x0800=IPv4, 0x0806=ARP)', 'Payload', 'FCS (32b CRC)'],
  },
  {
    number: 1,
    name: 'Физический (Physical)',
    tcpIpName: 'Сетевой доступ (Network Access)',
    pdu: 'Биты (Bits / Signals)',
    color: 'from-amber-500/20 to-orange-500/10 text-amber-300',
    borderColor: 'border-amber-500/30',
    protocols: ['1000BASE-T', '10GBASE-SR/LR', 'SFP/SFP+ / QSFP', 'RJ-45 (8P8C)', 'LC/SC Оптика', 'RS-232'],
    devices: ['Концентраторы (Hubs)', 'Повторители (Repeaters)', 'Патч-панели', 'Медиаконвертеры', 'Трансиверы SFP'],
    functions: 'Преобразование битов в физические сигналы: электрические импульсы по меди, свет по оптоволокну, радиоволны в воздухе.',
    cliTools: ['ethtool eth0', 'ip -s link'],
    headers: ['Нет логических заголовков — передаются импульсы напряжения/света'],
  },
];

export const OsiExplorer: React.FC = () => {
  const [selectedLayerNum, setSelectedLayerNum] = useState<number>(7);
  const selected = OSI_LAYERS.find((l) => l.number === selectedLayerNum) || OSI_LAYERS[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20 shadow-xl">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
          Интерактивный справочник
        </span>
        <h2 className="text-2xl font-black tracking-tight text-white mt-1">
          7 Уровней модели OSI и стек TCP/IP
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Нажмите на любой уровень, чтобы изучить его PDU, протоколы, структуру заголовков, устройства и CLI-команды
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Layer Stack list (7 -> 1) */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
            Стек уровней (от L7 к L1)
          </div>
          {OSI_LAYERS.map((layer) => {
            const isSelected = layer.number === selectedLayerNum;
            return (
              <button
                key={layer.number}
                onClick={() => setSelectedLayerNum(layer.number)}
                type="button"
                className={`w-full p-3.5 rounded-xl text-left border transition-all flex items-center justify-between cursor-pointer min-h-[54px] ${
                  isSelected
                    ? `bg-slate-900/90 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400`
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs ${
                      isSelected ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    L{layer.number}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-white">{layer.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">PDU: {layer.pdu}</div>
                  </div>
                </div>

                <div className="text-right hidden sm:block">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 font-mono text-cyan-300">
                    {layer.tcpIpName.split(' ')[0]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Layer Details */}
        <div className="lg:col-span-7 p-6 rounded-2xl glass-panel border border-cyan-500/20 shadow-xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-cyan-500/20 border border-cyan-400/40 font-mono font-bold text-cyan-300 text-xs">
                  Уровень {selected.number}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Стек TCP/IP: <span className="text-white font-bold">{selected.tcpIpName}</span>
                </span>
              </div>
              <h3 className="text-xl font-black text-white mt-2">{selected.name}</h3>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Единица данных (PDU)</span>
              <span className="font-mono text-sm font-bold text-cyan-300">{selected.pdu}</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Назначение и функции
            </h4>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              {selected.functions}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-2">
                Ключевые протоколы
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selected.protocols.map((p) => (
                  <span
                    key={p}
                    className="px-2.5 py-1 rounded-md bg-cyan-950/50 border border-cyan-500/30 text-cyan-300 font-mono text-xs"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-2">
                Оборудование уровня
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selected.devices.map((d) => (
                  <span
                    key={d}
                    className="px-2.5 py-1 rounded-md bg-purple-950/50 border border-purple-500/30 text-purple-300 text-xs"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
              CLI команды диагностики
            </h4>
            <div className="flex flex-wrap gap-2">
              {selected.cliTools.map((tool) => (
                <span
                  key={tool}
                  className="px-2.5 py-1 rounded-md bg-black/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs"
                >
                  $ {tool}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
              Поля заголовка кадра / пакета
            </h4>
            <div className="p-3 rounded-xl bg-black/40 border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
              {selected.headers.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-amber-400">▸</span>
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
