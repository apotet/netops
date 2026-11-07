import React, { useState } from 'react';
import {
  Layers,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
  FlaskConical,
  BookOpen,
  Search,
} from 'lucide-react';
import { TOTAL_QUESTION_COUNT } from '../data/questionsData';
import { NetOpsLogo } from './NetOpsLogo';

export type NavTab = 'exam' | 'theory' | 'ipv4' | 'ipv6' | 'practice' | 'osi';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenCommandPalette?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  isDark,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  onOpenCommandPalette,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    { id: 'exam', label: 'Экзамен', icon: <Layers className="w-4 h-4" /> },
    { id: 'theory', label: 'Теория и разборы', icon: <BookOpen className="w-4 h-4 text-cyan-400" /> },
    { id: 'ipv4', label: 'IPv4 Тренажёр', icon: <Sparkles className="w-4 h-4 text-amber-400" /> },
    { id: 'ipv6', label: 'IPv6 Тренажёр', icon: <Sparkles className="w-4 h-4 text-cyan-400" /> },
    { id: 'practice', label: 'Практика', icon: <FlaskConical className="w-4 h-4 text-indigo-400" /> },
  ];

  const handleTabClick = (tab: NavTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#07111f]/90 border-b border-slate-200 dark:border-cyan-500/20 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => handleTabClick('exam')}
            type="button"
            className="flex items-center gap-2 sm:gap-2.5 text-left cursor-pointer group min-w-0"
          >
            <NetOpsLogo />
          </button>
        </div>

        <nav className="hidden lg:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id || (tab.id === 'theory' && activeTab === 'osi');
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                type="button"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[38px] cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white dark:text-slate-950 shadow-md shadow-cyan-500/20 font-extrabold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-cyan-400/50 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all cursor-pointer min-h-[38px]"
              title="Поиск и командная строка (Cmd+K / Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="hidden md:inline font-mono text-[11px] text-slate-500 dark:text-slate-400">⌘K</span>
            </button>
          )}

          <button
            onClick={onToggleSound}
            type="button"
            className="hidden sm:flex p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors min-h-[38px] min-w-[38px] items-center justify-center cursor-pointer"
            aria-label={soundEnabled ? 'Выключить звук' : 'Включить звук'}
            title={soundEnabled ? 'Звук включен' : 'Звук выключен'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
          </button>

          <button
            onClick={onToggleTheme}
            type="button"
            className="hidden sm:flex p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors min-h-[38px] min-w-[38px] items-center justify-center cursor-pointer"
            aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500" />
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            className="lg:hidden p-2 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
            aria-label="Открыть меню"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden p-4 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#07111f]/98 backdrop-blur-2xl space-y-3 shadow-2xl">
          <div className="space-y-1.5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id || (tab.id === 'theory' && activeTab === 'osi');
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  type="button"
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all min-h-[44px] cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white dark:text-slate-950 font-black'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 px-1">
              Быстрые настройки
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onToggleSound}
                type="button"
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex flex-col items-center justify-center gap-1 hover:border-cyan-500/40 cursor-pointer"
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                )}
                <span className="text-[10px]">{soundEnabled ? 'Звук вкл' : 'Без звука'}</span>
              </button>

              <button
                onClick={onToggleTheme}
                type="button"
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex flex-col items-center justify-center gap-1 hover:border-cyan-500/40 cursor-pointer"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
                <span className="text-[10px]">{isDark ? 'Тёмная' : 'Светлая'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
