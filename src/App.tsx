import React, { useState, useEffect, useRef } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { ExamView, type ExamViewHandle } from './components/ExamView';
import { Ipv4Trainer, Ipv4SubTab } from './components/Ipv4Trainer';
import { Ipv6Trainer } from './components/Ipv6Trainer';
import { PracticeHub } from './components/PracticeHub';
import { TheoryView } from './components/TheoryView';
import { MobileTabBar } from './components/MobileTabBar';
import { CommandPalette } from './components/CommandPalette';
import { PhotoCredits } from './components/PhotoCredits';
import { TOTAL_QUESTION_COUNT } from './data/questionsData';

function readStoredBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return v === '1' || v === 'true';
  } catch {
    return fallback;
  }
}

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('exam');
  const examViewRef = useRef<ExamViewHandle>(null);
  const [isDark, setIsDark] = useState<boolean>(() => readStoredBool('osi_theme_dark', true));
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => readStoredBool('osi_sound', false));
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [showCredits, setShowCredits] = useState<boolean>(false);

  const [theoryQuestionId, setTheoryQuestionId] = useState<string | null>(null);
  const [theoryFromExam, setTheoryFromExam] = useState<boolean>(false);
  const [ipv4InitialPrefix, setIpv4InitialPrefix] = useState<number | undefined>(undefined);
  const [ipv4InitialSubTab, setIpv4InitialSubTab] = useState<Ipv4SubTab | undefined>(undefined);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    try {
      localStorage.setItem('osi_theme_dark', isDark ? '1' : '0');
    } catch {
      // ignore
    }
  }, [isDark]);

  useEffect(() => {
    try {
      localStorage.setItem('osi_sound', soundEnabled ? '1' : '0');
    } catch {
      // ignore
    }
  }, [soundEnabled]);

  const handleNavigateToTheory = (questionId: string) => {
    setTheoryQuestionId(questionId);
    setTheoryFromExam(true);
    setActiveTab('theory');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab: NavTab) => {
    if (tab === 'exam' && activeTab === 'exam') examViewRef.current?.returnToParameters();
    setActiveTab(tab);
    if (tab !== 'theory') {
      setTheoryQuestionId(null);
      setTheoryFromExam(false);
    }
  };

  const handleReturnToExam = () => {
    setTheoryQuestionId(null);
    setTheoryFromExam(false);
    setActiveTab('exam');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToIpv6 = () => {
    setActiveTab('ipv6');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToIpv4 = (prefix?: number, mode?: 'calc' | 'trainer') => {
    if (prefix) setIpv4InitialPrefix(prefix);
    if (mode === 'calc') setIpv4InitialSubTab('calculator');
    else if (mode === 'trainer') setIpv4InitialSubTab('practice');
    setActiveTab('ipv4');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 text-slate-900 dark:bg-[#07111f] dark:text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black transition-colors duration-150">
      <Navbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isDark={isDark}
        onToggleTheme={() => setIsDark((v) => !v)}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((v) => !v)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-28 lg:pb-8">
        {activeTab === 'exam' && (
          <ExamView ref={examViewRef} soundEnabled={soundEnabled} onNavigateToTheory={handleNavigateToTheory} onNavigateToLearning={() => {
            setTheoryQuestionId(null);
            setTheoryFromExam(false);
            setActiveTab('theory');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} />
        )}
        {(activeTab === 'theory' || activeTab === 'osi') && (
          <TheoryView
            initialQuestionId={theoryQuestionId}
            fromExam={theoryFromExam}
            onReturnToExam={handleReturnToExam}
            onNavigateToIpv4={handleNavigateToIpv4}
            onNavigateToIpv6={handleNavigateToIpv6}
            onClearInitialQuestion={() => {
              setTheoryQuestionId(null);
              setTheoryFromExam(false);
            }}
          />
        )}
        {activeTab === 'ipv6' && <Ipv6Trainer />}
        {activeTab === 'ipv4' && (
          <Ipv4Trainer
            soundEnabled={soundEnabled}
            initialPrefix={ipv4InitialPrefix}
            initialSubTab={ipv4InitialSubTab}
          />
        )}
        {activeTab === 'practice' && <PracticeHub />}
      </main>

      <MobileTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'theory') {
            setTheoryQuestionId(null);
            setTheoryFromExam(false);
          }
        }}
        onSelectLayer={() => {
          setActiveTab('theory');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onToggleTheme={() => setIsDark((v) => !v)}
        isDark={isDark}
      />

      <footer className="border-t border-slate-200 dark:border-cyan-500/20 py-8 px-4 bg-slate-100/90 dark:bg-[#050c17]/90 text-slate-500 dark:text-slate-400 text-xs mt-12 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="font-bold text-slate-800 dark:text-slate-200">
              NetOps
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {TOTAL_QUESTION_COUNT} практических вопросов, симуляции L2/L3 протоколов и CLI-терминал.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs font-mono">
            <button
              type="button"
              onClick={() => setShowCredits(true)}
              className="text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
            >
              Источники фото и лицензии
            </button>
            <span>•</span>
            <a
              href="https://github.com/apotet/osi-tcpip-exam-public"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Исходный репозиторий
            </a>
          </div>
        </div>
      </footer>

      {showCredits && <PhotoCredits onClose={() => setShowCredits(false)} />}
    </div>
  );
}

export default App;
