import type { PracticeLink } from '../data/practiceLinks';
import React, { useEffect, useState } from 'react';
import { BookOpen, Layers, FileText, Table2, Library } from 'lucide-react';
import { TheoryModels } from './TheoryModels';
import { TheoryPorts } from './TheoryPorts';
import { TheoryCheatsheets } from './TheoryCheatsheets';
import { TheoryScenarios } from './TheoryScenarios';
import { TheoryRazbory } from './TheoryRazbory';
import { KnowledgeBase } from './KnowledgeBase';

interface TheoryViewProps {
  onOpenPractice?: (link: PracticeLink) => void;
  initialQuestionId?: string | null;
  fromExam?: boolean;
  onReturnToExam?: () => void;
  onNavigateToIpv6: () => void;
  onNavigateToIpv4: (prefix?: number, mode?: 'calc' | 'trainer') => void;
  onClearInitialQuestion?: () => void;
}

type TheorySection = 'razbory' | 'knowledge' | 'models' | 'ports' | 'cheatsheets' | 'scenarios';

const SECTIONS: { id: TheorySection; label: string; icon: React.ReactNode }[] = [
  { id: 'razbory', label: 'Разборы вопросов', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'knowledge', label: 'База знаний', icon: <Library className="w-3.5 h-3.5" /> },
  { id: 'models', label: 'OSI и TCP/IP', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'ports', label: 'Порты', icon: <Table2 className="w-3.5 h-3.5" /> },
  { id: 'cheatsheets', label: 'Шпаргалки L1–L7', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'scenarios', label: 'Сценарии', icon: <FileText className="w-3.5 h-3.5" /> },
];

export const TheoryView: React.FC<TheoryViewProps> = ({
  onOpenPractice,
  initialQuestionId,
  fromExam,
  onReturnToExam,
  onNavigateToIpv4,
  onNavigateToIpv6,
  onClearInitialQuestion,
}) => {
  const [section, setSection] = useState<TheorySection>('razbory');
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [returnQuestionId, setReturnQuestionId] = useState<string | null>(null);
  const [focusQuestionId, setFocusQuestionId] = useState<string | null>(null);

  useEffect(() => {
    if (initialQuestionId) {
      setSection('razbory');
      setFocusQuestionId(initialQuestionId);
    }
  }, [initialQuestionId]);

  const openLesson = (id: string, fromQuestionId?: string) => {
    setLessonId(id);
    setReturnQuestionId(fromQuestionId || focusQuestionId || initialQuestionId || null);
    setSection('knowledge');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openQuestionFromLesson = (questionId: string) => {
    setFocusQuestionId(questionId);
    setSection('razbory');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const effectiveQuestionId = focusQuestionId || initialQuestionId;

  return (
    <div className="font-sans space-y-5 max-w-5xl mx-auto pb-16">
      <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-cyan-500/20 bg-white dark:bg-[#091524] space-y-3">
        <h1 className="text-2xl sm:text-3xl text-slate-900 dark:text-white flex items-center gap-2 font-sans font-bold">
          <BookOpen className="w-5 h-5 text-cyan-500" />
          Теория и разборы
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Разборы вопросов, база знаний, модели OSI/TCP-IP, порты и шпаргалки по уровням.
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                section === s.id
                  ? 'bg-cyan-500 text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {section === 'models' && <TheoryModels />}
      {section === 'ports' && <TheoryPorts />}
      {section === 'cheatsheets' && <TheoryCheatsheets />}
      {section === 'scenarios' && <TheoryScenarios />}
      {section === 'knowledge' && (
        <KnowledgeBase
          onOpenPractice={onOpenPractice}
          initialLessonId={lessonId}
          returnQuestionId={returnQuestionId}
          onOpenQuestion={openQuestionFromLesson}
          onClearLesson={() => setLessonId(null)}
        />
      )}
      {section === 'razbory' && (
        <TheoryRazbory
          onOpenPractice={onOpenPractice}
          initialQuestionId={effectiveQuestionId}
          fromExam={fromExam}
          onReturnToExam={onReturnToExam}
          onNavigateToIpv4={onNavigateToIpv4}
          onNavigateToIpv6={onNavigateToIpv6}
          onClearInitialQuestion={onClearInitialQuestion}
          onOpenLesson={openLesson}
        />
      )}
    </div>
  );
};
