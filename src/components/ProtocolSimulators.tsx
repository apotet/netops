import React, { useState } from 'react';
import {
  Server,
  Laptop,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Globe,
  Radio,
  FileSearch,
} from 'lucide-react';

type ProtoSimTab = 'dhcp' | 'nat' | 'wireshark';

export const ProtocolSimulators: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ProtoSimTab>('dhcp');

  // DHCP Simulator State
  const [dhcpStep, setDhcpStep] = useState<number>(0);
  const dhcpStages = [
    {
      name: 'DHCP DISCOVER',
      direction: 'Клиент → Broadcast (255.255.255.255)',
      srcIp: '0.0.0.0',
      dstIp: '255.255.255.255',
      srcPort: 'UDP 68',
      dstPort: 'UDP 67',
      flags: 'Broadcast: 1 (B=1)',
      desc: 'Клиент подключается к сети, у него нет IP-адреса. Он рассылает широковещательный Discover, запрашивая конфигурацию у любого доступного DHCP-сервера.',
    },
    {
      name: 'DHCP OFFER',
      direction: 'DHCP-Сервер → Клиент',
      srcIp: '192.168.10.2 (Сервер)',
      dstIp: '255.255.255.255',
      srcPort: 'UDP 67',
      dstPort: 'UDP 68',
      flags: 'Предложен IP: 192.168.10.100',
      desc: 'Сервер резервирует свободный IP из пула (192.168.10.100/24, шлюз 192.168.10.1, DNS 192.0.2.53) и отправляет клиенту предложение аренды.',
    },
    {
      name: 'DHCP REQUEST',
      direction: 'Клиент → Broadcast',
      srcIp: '0.0.0.0',
      dstIp: '255.255.255.255',
      srcPort: 'UDP 68',
      dstPort: 'UDP 67',
      flags: 'Запрос принят: 192.168.10.100',
      desc: 'Клиент официально запрашивает предложенный IP у сервера, уведомляя остальные DHCP-серверы о выборе.',
    },
    {
      name: 'DHCP ACK',
      direction: 'DHCP-Сервер → Клиент',
      srcIp: '192.168.10.2',
      dstIp: '255.255.255.255',
      srcPort: 'UDP 67',
      dstPort: 'UDP 68',
      flags: 'Аренда подтверждена на 8 часов',
      desc: 'Сервер финализирует аренду (Acknowledge). Клиент применяет IP, маску /24, шлюз и DNS. Сеть настроена!',
    },
  ];

  // NAT/PAT Simulator State
  const [natStep, setNatStep] = useState<number>(0);
  const natStages = [
    {
      step: '1. Формирование пакета на ПК (Inside Local)',
      src: '192.168.1.50 : 54210',
      dst: '93.184.216.34 : 80 (example.com)',
      location: 'Локальная сеть LAN',
      desc: 'ПК отправляет HTTP-запрос веб-серверу в интернете. Приватный IP (RFC 1918) не маршрутизируется в глобальном интернете.',
    },
    {
      step: '2. Трансляция на NAT-маршрутизаторе (PAT Translation)',
      src: '203.0.113.5 : 40001 (Inside Global)',
      dst: '93.184.216.34 : 80',
      location: 'Маршрутизатор NAT/PAT',
      desc: 'Маршрутизатор заменяет приватный IP 192.168.1.50 на свой публичный IP 203.0.113.5, выделяет уникальный порт 40001 и сохраняет запись в таблице трансляций.',
    },
    {
      step: '3. Ответ веб-сервера через интернет',
      src: '93.184.216.34 : 80',
      dst: '203.0.113.5 : 40001',
      location: 'Интернет WAN',
      desc: 'Веб-сервер отправляет ответ HTTP 200 OK на публичный IP маршрутизатора и порт 40001.',
    },
    {
      step: '4. Обратная трансляция клиенту',
      src: '93.184.216.34 : 80',
      dst: '192.168.1.50 : 54210',
      location: 'Возврат в LAN',
      desc: 'Маршрутизатор находит порт 40001 в таблице трансляций, переписывает адрес на 192.168.1.50:54210 и доставляет ответ клиенту.',
    },
  ];

  // Wireshark Capture State
  const [selectedPacket, setSelectedPacket] = useState<number>(0);
  const wiresharkPackets = [
    {
      no: 1,
      time: '0.000000',
      src: '192.168.1.50',
      dst: '93.184.216.34',
      proto: 'TCP',
      length: 74,
      info: '54210 → 80 [SYN] Seq=0 Win=64240 Len=0 MSS=1460 SACK_PERM',
      details: {
        ethernet: 'Dst: 00:11:22:gw:01:01, Src: 00:11:22:aa:bb:50, Type: IPv4 (0x0800)',
        ip: 'IPv4, Src: 192.168.1.50, Dst: 93.184.216.34, TTL: 64, Protocol: TCP (6)',
        tcp: 'Source Port: 54210, Dst Port: 80, Seq: 0, Flags: 0x002 (SYN)',
      },
    },
    {
      no: 2,
      time: '0.014210',
      src: '93.184.216.34',
      dst: '192.168.1.50',
      proto: 'TCP',
      length: 74,
      info: '80 → 54210 [SYN, ACK] Seq=0 Ack=1 Win=65535 Len=0 MSS=1460',
      details: {
        ethernet: 'Dst: 00:11:22:aa:bb:50, Src: 00:11:22:gw:01:01, Type: IPv4 (0x0800)',
        ip: 'IPv4, Src: 93.184.216.34, Dst: 192.168.1.50, TTL: 52, Protocol: TCP (6)',
        tcp: 'Source Port: 80, Dst Port: 54210, Seq: 0, Ack: 1, Flags: 0x012 (SYN, ACK)',
      },
    },
    {
      no: 3,
      time: '0.014380',
      src: '192.168.1.50',
      dst: '93.184.216.34',
      proto: 'TCP',
      length: 66,
      info: '54210 → 80 [ACK] Seq=1 Ack=1 Win=64240 Len=0',
      details: {
        ethernet: 'Dst: 00:11:22:gw:01:01, Src: 00:11:22:aa:bb:50, Type: IPv4 (0x0800)',
        ip: 'IPv4, Src: 192.168.1.50, Dst: 93.184.216.34, TTL: 64, Protocol: TCP (6)',
        tcp: 'Source Port: 54210, Dst Port: 80, Seq: 1, Ack: 1, Flags: 0x010 (ACK)',
      },
    },
    {
      no: 4,
      time: '0.015120',
      src: '192.168.1.50',
      dst: '93.184.216.34',
      proto: 'HTTP',
      length: 142,
      info: 'GET / HTTP/1.1 (Host: example.com)',
      details: {
        ethernet: 'Dst: 00:11:22:gw:01:01, Src: 00:11:22:aa:bb:50, Type: IPv4 (0x0800)',
        ip: 'IPv4, Src: 192.168.1.50, Dst: 93.184.216.34, TTL: 64, Protocol: TCP (6)',
        tcp: 'Source Port: 54210, Dst Port: 80, Seq: 1, Ack: 1, Flags: [PSH, ACK]',
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-cyan-500/20 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
              Сетевые протоколы и анализ
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
              DHCP DORA · NAT / PAT · Wireshark
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Ключевые прикладные и транспортные симуляции из основного репозитория
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('dhcp')}
              type="button"
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dhcp'
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              DHCP DORA
            </button>
            <button
              onClick={() => setActiveTab('nat')}
              type="button"
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'nat'
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              NAT / PAT
            </button>
            <button
              onClick={() => setActiveTab('wireshark')}
              type="button"
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'wireshark'
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Wireshark Захват
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: DHCP DORA */}
      {activeTab === 'dhcp' && (
        <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-cyan-500/20 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                4 шага DORA (Discover, Offer, Request, Acknowledge)
              </span>
              <h3 className="text-xl font-bold text-white mt-1">
                {dhcpStages[dhcpStep].name}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDhcpStep((prev) => Math.max(0, prev - 1))}
                disabled={dhcpStep === 0}
                type="button"
                className="py-2 px-3 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-200 text-xs font-bold"
              >
                Назад
              </button>
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-black/40 text-cyan-300">
                {dhcpStep + 1} / 4
              </span>
              <button
                onClick={() => setDhcpStep((prev) => Math.min(3, prev + 1))}
                disabled={dhcpStep === 3}
                type="button"
                className="py-2 px-3 rounded-lg bg-cyan-500 disabled:opacity-40 text-slate-950 text-xs font-bold"
              >
                Далее
              </button>
              <button
                onClick={() => setDhcpStep(0)}
                type="button"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* DORA 4 steps tabs */}
          <div className="grid grid-cols-4 gap-2">
            {dhcpStages.map((st, idx) => (
              <button
                key={idx}
                onClick={() => setDhcpStep(idx)}
                type="button"
                className={`p-3 rounded-xl text-center border transition-all cursor-pointer ${
                  dhcpStep === idx
                    ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 font-bold'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400'
                }`}
              >
                <div className="text-[10px] font-mono">Шаг {idx + 1}</div>
                <div className="text-xs truncate">{st.name}</div>
              </button>
            ))}
          </div>

          {/* Interactive details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#060f1b] border border-cyan-500/30 space-y-3 font-mono text-xs">
              <div className="text-xs uppercase font-bold text-cyan-400">Параметры UDP / IP пакета</div>
              <div className="space-y-1.5 text-slate-300">
                <div><span className="text-slate-500">Направление:</span> {dhcpStages[dhcpStep].direction}</div>
                <div><span className="text-slate-500">Source IP:</span> {dhcpStages[dhcpStep].srcIp}</div>
                <div><span className="text-slate-500">Dest IP:</span> {dhcpStages[dhcpStep].dstIp}</div>
                <div><span className="text-slate-500">Порты:</span> {dhcpStages[dhcpStep].srcPort} → {dhcpStages[dhcpStep].dstPort}</div>
                <div><span className="text-slate-500">Флаги:</span> {dhcpStages[dhcpStep].flags}</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="text-xs uppercase font-bold text-slate-400">Что происходит:</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {dhcpStages[dhcpStep].desc}
              </p>
              <div className="mt-3 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[11px] text-cyan-300">
                <strong>Важно для экзамена:</strong> Клиент до получения адреса отправляет запросы с порта UDP 68 на порт UDP 67 сервера!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: NAT / PAT */}
      {activeTab === 'nat' && (
        <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-cyan-500/20 shadow-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                Трансляция сетевых адресов и портов (PAT / NAPT)
              </span>
              <h3 className="text-xl font-bold text-white mt-1">
                {natStages[natStep].step}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setNatStep((prev) => Math.max(0, prev - 1))}
                disabled={natStep === 0}
                type="button"
                className="py-2 px-3 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-200 text-xs font-bold"
              >
                Назад
              </button>
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-black/40 text-cyan-300">
                {natStep + 1} / 4
              </span>
              <button
                onClick={() => setNatStep((prev) => Math.min(3, prev + 1))}
                disabled={natStep === 3}
                type="button"
                className="py-2 px-3 rounded-lg bg-cyan-500 disabled:opacity-40 text-slate-950 text-xs font-bold"
              >
                Далее
              </button>
            </div>
          </div>

          {/* Translation table simulation */}
          <div className="p-4 rounded-2xl bg-[#060f1b] border border-cyan-500/30 font-mono text-xs overflow-x-auto">
            <div className="text-cyan-400 font-bold uppercase text-[11px] mb-2">
              Таблица трансляций NAT на маршрутизаторе (show ip nat translations)
            </div>
            <table className="w-full text-left">
              <thead className="text-slate-500 uppercase text-[10px]">
                <tr>
                  <th className="p-2">Протокол</th>
                  <th className="p-2">Inside Local (LAN)</th>
                  <th className="p-2">Inside Global (WAN IP+Port)</th>
                  <th className="p-2">Outside Global (Сервер)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr className="bg-cyan-950/30">
                  <td className="p-2 text-cyan-300 font-bold">tcp</td>
                  <td className="p-2">192.168.1.50:54210</td>
                  <td className="p-2 text-amber-300 font-bold">203.0.113.5:40001</td>
                  <td className="p-2">93.184.216.34:80</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="text-xs uppercase font-bold text-slate-400">Пояснение этапа:</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {natStages[natStep].desc}
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Wireshark Frame Analyzer */}
      {activeTab === 'wireshark' && (
        <div className="p-6 sm:p-8 rounded-3xl glass-panel border border-cyan-500/20 shadow-2xl space-y-6">
          <div>
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
              Инспектор сетевых пакетов (Wireshark Capture)
            </span>
            <h3 className="text-xl font-bold text-white mt-1">
              Разбор TCP 3-Way Handshake и HTTP запроса
            </h3>
          </div>

          {/* Packet List table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#060f1b]">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">No.</th>
                  <th className="p-2.5">Time</th>
                  <th className="p-2.5">Source</th>
                  <th className="p-2.5">Destination</th>
                  <th className="p-2.5">Protocol</th>
                  <th className="p-2.5">Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {wiresharkPackets.map((pkt, idx) => (
                  <tr
                    key={pkt.no}
                    onClick={() => setSelectedPacket(idx)}
                    className={`cursor-pointer transition-colors ${
                      selectedPacket === idx
                        ? 'bg-cyan-950/80 text-cyan-300 font-bold'
                        : 'hover:bg-slate-900/40 text-slate-300'
                    }`}
                  >
                    <td className="p-2.5">{pkt.no}</td>
                    <td className="p-2.5">{pkt.time}</td>
                    <td className="p-2.5">{pkt.src}</td>
                    <td className="p-2.5">{pkt.dst}</td>
                    <td className="p-2.5 text-cyan-400 font-bold">{pkt.proto}</td>
                    <td className="p-2.5 truncate max-w-xs">{pkt.info}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Packet Tree Inspector */}
          <div className="p-5 rounded-2xl bg-[#091725] border border-cyan-500/30 space-y-3 font-mono text-xs">
            <div className="text-xs font-bold text-cyan-400 uppercase">
              Инспекция уровней пакета #{wiresharkPackets[selectedPacket].no}:
            </div>

            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-blue-400 font-bold block mb-1">
                  ▸ Ethernet II (Frame L2)
                </span>
                <span className="text-slate-300">
                  {wiresharkPackets[selectedPacket].details.ethernet}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-purple-400 font-bold block mb-1">
                  ▸ Internet Protocol Version 4 (Packet L3)
                </span>
                <span className="text-slate-300">
                  {wiresharkPackets[selectedPacket].details.ip}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-1">
                  ▸ Transmission Control Protocol (Segment L4)
                </span>
                <span className="text-slate-300">
                  {wiresharkPackets[selectedPacket].details.tcp}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
