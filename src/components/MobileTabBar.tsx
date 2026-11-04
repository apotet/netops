import React from 'react';
import { NavTab } from './Navbar';
import { triggerHaptic } from '../utils/haptics';

interface MobileTabBarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ activeTab, onTabChange }) => {
  const tabs: Array<{ id: NavTab; label: string }> = [
    { id: 'exam', label: 'Экзамен' },
    { id: 'theory', label: 'Теория' },
    { id: 'ipv4', label: 'IPv4' },
    { id: 'practice', label: 'Практика' },
  ];

  const handleSelect = (tabId: NavTab) => {
    triggerHaptic('selection');
    onTabChange(tabId);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-[#07111f]/96 backdrop-blur-2xl border-t border-slate-200 dark:border-cyan-500/20 px-3 pt-2 pb-5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_24px_rgba(0,0,0,0.6)] select-none transition-colors"
      style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))' }}
    >
      <div className="grid grid-cols-4 max-w-md mx-auto items-center">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id || (tab.id === 'theory' && activeTab === 'osi');

          return (
            <button
              key={tab.id}
              onClick={() => handleSelect(tab.id)}
              type="button"
              className="flex flex-col items-center justify-center gap-1.5 py-1 px-2 cursor-pointer transition-all group"
            >
              {/* Dot indicator matching exact design in mockup */}
              <div className="relative w-4 h-4 flex items-center justify-center">
                {isActive ? (
                  <>
                    <span className="absolute w-4 h-4 rounded-full bg-cyan-400/30 animate-ping pointer-events-none" />
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                  </>
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full border border-slate-400 dark:border-slate-600 group-hover:border-slate-600 dark:group-hover:border-slate-400 transition-colors" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[11px] font-bold tracking-tight transition-colors ${
                  isActive
                    ? 'text-cyan-700 dark:text-cyan-300 font-extrabold'
                    : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
