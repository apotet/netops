import React, { useState, useEffect, useRef } from 'react';
import { NavTab } from './Navbar';
import { triggerHaptic } from '../utils/haptics';
import {
  Search,
  Layers,
  BookOpen,
  Calculator,
  Terminal,
  Moon,
  Sun,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: NavTab) => void;
  onSelectLayer: (layer: string) => void;
  onToggleTheme: () => void;
  isDark: boolean;
}

interface CommandItem {
  id: string;
  title: string;
  category: 'Навигация' | 'Уровни OSI' | 'Система';
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onSelectLayer,
  onToggleTheme,
  isDark,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    {
      id: 'tab-exam',
      title: 'Экзамен — Режим тестирования',
      category: 'Навигация',
      shortcut: '1',
      icon: <Layers className="w-4 h-4 text-cyan-400" />,
      action: () => onSelectTab('exam'),
    },
    {
      id: 'tab-theory',
      title: 'Теория и подробные разборы вопросов',
      category: 'Навигация',
      shortcut: '2',
      icon: <BookOpen className="w-4 h-4 text-indigo-400" />,
      action: () => onSelectTab('theory'),
    },
    {
      id: 'tab-ipv4',
      title: 'IPv4 Тренажёр — Расчёт масок и подсетей',
      category: 'Навигация',
      shortcut: '3',
      icon: <Calculator className="w-4 h-4 text-emerald-400" />,
      action: () => onSelectTab('ipv4'),
    },
    {
      id: 'tab-practice',
      title: 'Интерактивная практика — Симуляторы и CLI',
      category: 'Навигация',
      shortcut: '4',
      icon: <Terminal className="w-4 h-4 text-amber-400" />,
      action: () => onSelectTab('practice'),
    },
    {
      id: 'layer-l7',
      title: 'L7 Прикладной уровень (HTTP/3, DNS, DHCP)',
      category: 'Уровни OSI',
      shortcut: 'L7',
      icon: <span className="font-mono text-xs font-bold text-pink-400">L7</span>,
      action: () => onSelectLayer('L7'),
    },
    {
      id: 'layer-l4',
      title: 'L4 Транспортный уровень (TCP 3-way, UDP, Порты)',
      category: 'Уровни OSI',
      shortcut: 'L4',
      icon: <span className="font-mono text-xs font-bold text-cyan-400">L4</span>,
      action: () => onSelectLayer('L4'),
    },
    {
      id: 'layer-l3',
      title: 'L3 Сетевой уровень (IPv4/IPv6, TTL, Маршрутизация)',
      category: 'Уровни OSI',
      shortcut: 'L3',
      icon: <span className="font-mono text-xs font-bold text-teal-400">L3</span>,
      action: () => onSelectLayer('L3'),
    },
    {
      id: 'layer-l2',
      title: 'L2 Канальный уровень (Ethernet, MAC, VLAN 802.1Q)',
      category: 'Уровни OSI',
      shortcut: 'L2',
      icon: <span className="font-mono text-xs font-bold text-emerald-400">L2</span>,
      action: () => onSelectLayer('L2'),
    },
    {
      id: 'layer-l1',
      title: 'L1 Физический уровень (Оптика, SFP, витая пара)',
      category: 'Уровни OSI',
      shortcut: 'L1',
      icon: <span className="font-mono text-xs font-bold text-amber-400">L1</span>,
      action: () => onSelectLayer('L1'),
    },
    {
      id: 'action-theme',
      title: isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему',
      category: 'Система',
      icon: isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />,
      action: onToggleTheme,
    },
  ];

  const filtered = commands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      (cmd.shortcut && cmd.shortcut.toLowerCase().includes(q))
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        triggerHaptic('selection');
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-md">
      <div
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#091524] border border-slate-200 dark:border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 transition-colors"
        onKeyDown={handleKeyDown}
      >
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-900/80">
          <Search className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Быстрый поиск команд, уровней OSI (L1-L7), тем и разделов..."
            className="flex-1 bg-transparent border-0 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm focus:outline-none font-mono"
          />
          <button
            onClick={onClose}
            type="button"
            className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs font-mono"
          >
            Esc
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Команд не найдено. Попробуйте другой запрос.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    triggerHaptic('selection');
                    item.action();
                    onClose();
                  }}
                  className={`p-2.5 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-cyan-50 text-cyan-900 border border-cyan-400 dark:bg-cyan-950/70 dark:text-white dark:border-cyan-400/40'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-black/40 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    <span className="font-medium">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase">
                      {item.category}
                    </span>
                    {item.shortcut && (
                      <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] border border-slate-300 dark:border-slate-700">
                        {item.shortcut}
                      </kbd>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-2.5 bg-slate-100 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <span>Навигация: ↑ ↓</span>
          <span>Выбрать: Enter</span>
        </div>
      </div>
    </div>
  );
};
