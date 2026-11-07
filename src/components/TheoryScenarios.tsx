import React from 'react';

const SCENARIOS = [
  {
    title: 'Port Security',
    text: 'Protect отбрасывает кадры с недопустимых MAC. Restrict ещё считает нарушения, shutdown переводит порт в err-disabled. Sticky пишет изученный MAC в running-config.',
    commands: ['show port-security'],
  },
  {
    title: 'DHCP Snooping',
    text: 'Ответы сервера пускаются только с trusted. Binding хранит MAC, IP, VLAN и порт. Слишком низкий rate limit режет и обычный Discover.',
    commands: ['show ip dhcp snooping'],
  },
  {
    title: 'VRRP',
    text: 'Несколько маршрутизаторов делят один VIP шлюза. Выше Priority — ближе к Master. Объявления идут по IP, протокол 112, без TCP.',
    commands: ['show vrrp brief'],
  },
  {
    title: '802.1X',
    text: 'До Access-Accept клиент обменивается EAPOL, обычный трафик закрыт. RADIUS: UDP 1812 — аутентификация, 1813 — учёт.',
    commands: ['show authentication sessions'],
  },
  {
    title: 'CoPP и Storm Control',
    text: 'Потери до устройства не значат потери через него. Нет CRC не значит нет потерь: Storm Control режет кадры по порогу.',
    commands: ['show policy-map control-plane', 'show storm-control'],
  },
];

export const TheoryScenarios: React.FC = () => (
  <div className="space-y-4">
    <div>
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Сценарии</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Рабочие случаи: что проверить, когда симптом уже есть.</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {SCENARIOS.map((item) => (
        <div key={item.title} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/70 bg-white dark:bg-slate-900/40">
          <div className="text-sm font-bold text-cyan-700 dark:text-cyan-300 mb-1">{item.title}</div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{item.text}</p>
          {item.commands.map((command) => (
            <code key={command} className="block mt-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-300">{command}</code>
          ))}
        </div>
      ))}
    </div>
  </div>
);
