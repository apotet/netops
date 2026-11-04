import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, CornerDownLeft, Trash2, HelpCircle } from 'lucide-react';

interface HistoryItem {
  command: string;
  output: string;
  isError?: boolean;
}

const COMMAND_OUTPUTS: Record<string, string> = {
  help: `Доступные сетевые команды:
  ping <ip/host>        — Проверка доступности хоста по ICMP
  traceroute <ip/host>  — Трассировка маршрута по TTL
  ip addr / ip a        — Просмотр сетевых интерфейсов и IP/масок
  ip route              — Просмотр таблицы маршрутизации (L3)
  arp -a                — Просмотр ARP-кэша соответствия IP -> MAC (L2)
  netstat -tulnp        — Просмотр слушающих TCP/UDP сокетов и портов
  curl -I <url>         — Проверка L7 HTTP-заголовков ответа
  clear                 — Очистить экран консоли`,

  'ip addr': `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP
    link/ether 00:11:22:aa:bb:10 brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.10/24 brd 192.168.1.255 scope global eth0
       valid_lft forever preferred_lft forever`,

  'ip a': `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP
    link/ether 00:11:22:aa:bb:10 brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.10/24 brd 192.168.1.255 scope global eth0`,

  'ip route': `default via 192.168.1.1 dev eth0 proto static metric 100 
192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.10 metric 100`,

  'arp -a': `? (192.168.1.1) at 00:11:22:gw:01:01 [ether] on eth0
? (192.168.1.25) at 52:54:00:12:34:56 [ether] on eth0`,

  'netstat -tulnp': `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      892/sshd            
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      1044/nginx          
tcp        0      0 0.0.0.0:443             0.0.0.0:*               LISTEN      1044/nginx          
udp        0      0 0.0.0.0:53              0.0.0.0:*                           712/named           
udp        0      0 0.0.0.0:67              0.0.0.0:*                           645/dhcpd`,
};

export const CliSimulator: React.FC = () => {
  const [input, setInput] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      command: 'welcome',
      output: `Добро пожаловать в сетевой CLI-тренажёр (Linux / Cisco environment)!\nВведите 'help' для просмотра списка доступных команд.`,
    },
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleCommand = (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) return;

    if (trimmed.toLowerCase() === 'clear') {
      setHistory([]);
      setInput('');
      return;
    }

    const lower = trimmed.toLowerCase();
    let output = '';
    let isError = false;

    if (COMMAND_OUTPUTS[lower]) {
      output = COMMAND_OUTPUTS[lower];
    } else if (lower.startsWith('ping')) {
      const parts = trimmed.split(' ');
      const target = parts[1] || '8.8.8.8';
      output = `PING ${target} (${target}) 56(84) bytes of data.
64 bytes from ${target}: icmp_seq=1 ttl=117 time=14.2 ms
64 bytes from ${target}: icmp_seq=2 ttl=117 time=13.8 ms
64 bytes from ${target}: icmp_seq=3 ttl=117 time=14.5 ms
64 bytes from ${target}: icmp_seq=4 ttl=117 time=14.1 ms

--- ${target} ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3004ms
rtt min/avg/max/mdev = 13.8/14.15/14.5/0.25 ms`;
    } else if (lower.startsWith('traceroute')) {
      const parts = trimmed.split(' ');
      const target = parts[1] || '8.8.8.8';
      output = `traceroute to ${target} (${target}), 30 hops max, 60 byte packets
 1  gateway (192.168.1.1)  0.641 ms  0.512 ms  0.489 ms
 2  10.50.0.1 (10.50.0.1)  2.124 ms  2.089 ms  2.045 ms
 3  core-gw.isp.net (185.12.34.1)  5.412 ms  5.389 ms  5.312 ms
 4  dns.google (${target})  14.214 ms  14.152 ms  14.089 ms`;
    } else if (lower.startsWith('curl')) {
      output = `HTTP/2 200 OK
date: ${new Date().toUTCString()}
content-type: text/html; charset=UTF-8
server: cloudflare
strict-transport-security: max-age=31536000; includeSubDomains; preload
x-content-type-options: nosniff
vary: Accept-Encoding`;
    } else {
      isError = true;
      output = `bash: команда не найдена: ${trimmed}. Введите 'help' для просмотра списка доступных команд.`;
    }

    setHistory((prev) => [...prev, { command: trimmed, output, isError }]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommand(input);
    }
  };

  const quickCommands = ['help', 'ip addr', 'ip route', 'arp -a', 'netstat -tulnp', 'ping 192.168.2.20', 'traceroute 8.8.8.8'];

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl glass-panel border border-cyan-500/20 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
            Практика терминала
          </span>
          <h2 className="text-2xl font-black tracking-tight text-white mt-1">
            Сетевой CLI-эмулятор
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Выполняйте реальные сетевые команды для закрепления теории уровней L2, L3, L4 и L7
          </p>
        </div>

        <button
          onClick={() => setHistory([])}
          type="button"
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all min-h-[44px] cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          Очистить
        </button>
      </div>

      {/* Quick shortcuts */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-400 font-mono">Быстрый ввод:</span>
        {quickCommands.map((cmd) => (
          <button
            key={cmd}
            onClick={() => handleCommand(cmd)}
            type="button"
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-300 text-xs font-mono transition-all cursor-pointer min-h-[36px]"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Terminal window */}
      <div
        onClick={() => inputRef.current?.focus()}
        className="rounded-2xl bg-[#050b14] border border-cyan-500/30 shadow-2xl p-4 sm:p-6 font-mono text-xs sm:text-sm text-slate-200 min-h-[420px] flex flex-col cursor-text"
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800 text-slate-400 select-none">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <span className="ml-2 text-xs font-mono text-slate-400">admin@network-lab:~</span>
          </div>
          <span className="text-[11px] text-cyan-500/70">bash 5.2</span>
        </div>

        {/* Command Output Log */}
        <div className="flex-1 space-y-4 overflow-y-auto">
          {history.map((item, idx) => (
            <div key={idx} className="space-y-1">
              {item.command !== 'welcome' && (
                <div className="flex items-center gap-2 text-cyan-400">
                  <span className="text-slate-500">user@host:~$</span>
                  <span className="font-bold text-white">{item.command}</span>
                </div>
              )}
              <pre
                className={`whitespace-pre-wrap font-mono text-xs leading-relaxed ${
                  item.isError ? 'text-rose-400' : 'text-slate-300'
                }`}
              >
                {item.output}
              </pre>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input line */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-800/80 mt-2">
          <span className="text-cyan-400 font-bold">user@host:~$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите команду (например, 'ping 8.8.8.8' или 'ip route')..."
            className="flex-1 bg-transparent border-0 outline-none text-white font-mono text-xs sm:text-sm placeholder:text-slate-600"
            autoFocus
          />
          <button
            onClick={() => handleCommand(input)}
            type="button"
            className="p-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <CornerDownLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
