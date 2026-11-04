import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Key,
  FolderGit2,
  Sparkles,
  RotateCcw,
  Smartphone,
  Laptop,
  Check,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import {
  pushProjectToGitHub,
  generateProjectZip,
  downloadBlob,
  getProjectFiles,
  testRemoteSiteAccessibility,
  AccessibilityTestResult,
} from '../projectExporter';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeployModal: React.FC<DeployModalProps> = ({ isOpen, onClose }) => {
  const [token, setToken] = useState<string>(() => {
    try {
      return localStorage.getItem('gh_pat_token') || '';
    } catch {
      return '';
    }
  });
  const [repoName, setRepoName] = useState<string>('my-gemini-mirror-site');
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [pushStatus, setPushStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successResult, setSuccessResult] = useState<{
    repoUrl: string;
    pageUrl: string;
    owner: string;
    actionsUrl?: string;
  } | null>(null);

  const [testResult, setTestResult] = useState<AccessibilityTestResult | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  const [liveActionStatus, setLiveActionStatus] = useState<{
    status: 'queued' | 'in_progress' | 'completed' | 'unknown';
    conclusion: 'success' | 'failure' | 'cancelled' | null;
    updatedAt?: string;
  } | null>(null);

  // Poll GitHub Actions status when successResult is available
  React.useEffect(() => {
    if (!successResult || !token) return;

    let isSubscribed = true;
    const cleanRepo = repoName.replace(/^https?:\/\/github\.com\//i, '').replace(/^.*\//, '').trim() || 'my-gemini-mirror-site';
    const authHeader = {
      Authorization: `Bearer ${token.trim()}`,
      Accept: 'application/vnd.github.v3+json',
    };

    const checkStatus = async () => {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${successResult.owner}/${cleanRepo}/actions/runs?per_page=1`,
          { headers: authHeader }
        );
        if (!res.ok) return;
        const data = await res.json();
        const latestRun = data.workflow_runs?.[0];
        if (latestRun && isSubscribed) {
          setLiveActionStatus({
            status: latestRun.status,
            conclusion: latestRun.conclusion,
            updatedAt: latestRun.updated_at,
          });
        }
      } catch {
        // quiet fallback
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 6000);
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [successResult, token, repoName]);

  const projectFiles = React.useMemo(() => {
    try {
      return getProjectFiles();
    } catch {
      return [];
    }
  }, [isOpen]);

  const hasCompiledIndex = projectFiles.some((f) => f.path === 'index.html' && f.content.includes('./assets/index-'));
  const hasAssets = projectFiles.some((f) => f.path.startsWith('assets/'));
  const hasPracticeHub = projectFiles.some((f) => f.path.includes('PracticeHub.tsx'));
  const hasNewIpv4 = projectFiles.some(
    (f) => f.path.includes('Ipv4Trainer.tsx') && f.content.includes('Правило непрерывности')
  );

  const handleRunAccessibilityTest = async (targetUrl?: string) => {
    const url = targetUrl || (successResult ? successResult.pageUrl : 'https://apotet.github.io/my-gemini-mirror-site/');
    setIsTesting(true);
    try {
      const res = await testRemoteSiteAccessibility(url);
      setTestResult(res);
    } catch {
      // quiet fallback
    } finally {
      setIsTesting(false);
    }
  };

  const forceReloadApp = () => {
    window.location.href = window.location.origin + window.location.pathname + '?reload=' + Date.now();
  };

  if (!isOpen) return null;

  const handlePush = async () => {
    if (!token.trim()) {
      setErrorMsg('Пожалуйста, введите ваш токен доступа GitHub (PAT).');
      return;
    }
    setErrorMsg('');
    setIsPushing(true);
    setProgressPercent(5);
    setPushStatus('Инициализация выгрузки...');

    try {
      localStorage.setItem('gh_pat_token', token.trim());
    } catch {
      // safe fallback
    }

    try {
      const cleanRepo =
        repoName.replace(/^https?:\/\/github\.com\//i, '').replace(/^.*\//, '').trim() ||
        'my-gemini-mirror-site';

      // 1. Try server-side publishing bridge first (100% reliable on mobile Safari, no CORS / ITP issues)
      setPushStatus('Синхронизация через серверный мост...');
      setProgressPercent(20);

      let serverSuccess = false;
      try {
        const srvRes = await fetch('/api/publish-github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token.trim(), repoName: cleanRepo }),
        });

        if (srvRes.ok) {
          const srvData = await srvRes.json();
          if (srvData.success) {
            serverSuccess = true;
            setProgressPercent(100);
            setPushStatus('Готово! Зеркало успешно опубликовано.');
            setSuccessResult(srvData);
            setTimeout(() => {
              handleRunAccessibilityTest(srvData.pageUrl);
            }, 1500);
            return;
          }
        } else {
          const errData = await srvRes.json().catch(() => ({}));
          // If GitHub returned 401 or bad credentials from server, fail immediately with clear message
          if (errData.error && (srvRes.status === 401 || errData.error.includes('Bad credentials'))) {
            throw new Error('Недействительный токен GitHub (Bad credentials). Проверьте правильность токена.');
          }
          if (errData.error) {
            throw new Error(errData.error);
          }
        }
      } catch (srvErr: any) {
        if (srvErr.message && !srvErr.message.includes('Failed to fetch') && !srvErr.message.includes('404')) {
          throw srvErr;
        }
        console.warn('Server bridge unavailable, falling back to direct browser push:', srvErr);
      }

      // 2. Direct browser push fallback (if server bridge was not available)
      setPushStatus('Прямая выгрузка в GitHub...');
      const result = await pushProjectToGitHub({
        token: token.trim(),
        repoName: cleanRepo,
        isPrivate: false,
        onProgress: (status, current) => {
          setPushStatus(status);
          setProgressPercent(current);
        },
      });

      setSuccessResult(result);

      // Run live reachability test automatically after push
      setTimeout(() => {
        handleRunAccessibilityTest(result.pageUrl);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      let message = err.message || 'Ошибка синхронизации с GitHub.';
      if (message.includes('Load failed') || message.includes('Failed to fetch')) {
        message =
          'Браузер Safari заблокировал прямой запрос к GitHub API. Мы переключили режим на серверную выгрузку — пожалуйста, нажмите кнопку ещё раз.';
      }
      setErrorMsg(message);
    } finally {
      setIsPushing(false);
    }
  };

  const handleDownloadZip = () => {
    const a = document.createElement('a');
    a.href = '/osi-tcpip-trainer-source.zip';
    a.download = 'osi-tcpip-trainer-source.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl p-6 sm:p-8 rounded-2xl bg-[#0c1726] border border-cyan-500/40 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-cyan-500/25 to-blue-500/25 border border-cyan-400/40 text-cyan-400 shadow-lg shadow-cyan-500/10">
            <UploadCloud className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Публикация зеркала на GitHub
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                v2.4 Bundle
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Единый сайт для iPhone, Android и ПК без логинов и задержек
            </p>
          </div>
        </div>

        {/* Universal URL Showcase Card */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-blue-950/60 border border-cyan-500/40 mb-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Единая универсальная ссылка:
            </span>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <Smartphone className="w-3 h-3" /> Телефон
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-cyan-400">
                <Laptop className="w-3 h-3" /> Компьютер
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-black/40 border border-slate-700/60">
            <a
              href="https://apotet.github.io/my-gemini-mirror-site/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs sm:text-sm font-mono text-cyan-300 hover:underline truncate font-bold flex items-center gap-1.5"
            >
              https://apotet.github.io/my-gemini-mirror-site/
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
            </a>
            <button
              onClick={() => handleRunAccessibilityTest('https://apotet.github.io/my-gemini-mirror-site/')}
              disabled={isTesting}
              type="button"
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer"
            >
              <Activity className="w-3 h-3" />
              {isTesting ? 'Проверка...' : 'Тест ссылки'}
            </button>
          </div>

          <div className="text-[11px] text-slate-300 space-y-1">
            <p>
              💡 <strong>Почему ссылка Google Cloud (.run.app) не открывалась на телефоне:</strong> адреса предпросмотра среды разработки защищены сессией Google. На iPhone/Android без входа в тот же аккаунт Google система возвращает ошибку.
            </p>
            <p className="text-slate-400">
              Ссылка на <strong>GitHub Pages выше</strong> — полностью публичная, доступна любому устройству и браузеру (Safari, Chrome, Telegram) без каких-либо логинов.
            </p>
          </div>
        </div>

        {/* Live Accessibility Test Results if run */}
        {testResult && (
          <div className={`p-3.5 rounded-xl border mb-5 text-xs space-y-2 ${testResult.ok && testResult.hasFreshCode ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200' : 'bg-amber-950/50 border-amber-500/50 text-amber-200'}`}>
            <div className="font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                {testResult.ok && testResult.hasFreshCode ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                )}
                Результат проверки публичного URL (HTTP {testResult.status})
              </span>
              <span className="text-[10px] font-mono opacity-80">Live Check</span>
            </div>
            <ul className="text-[11px] space-y-1 pl-1 opacity-90">
              {testResult.details.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ul>
            {testResult.ok && !testResult.hasFreshCode && (
              <p className="text-[11px] font-semibold text-amber-300 pt-1 border-t border-amber-500/20">
                ⚡ Для обновления сайта нажмите кнопку публикации ниже. В репозиторий отправится готовая production-сборка (7 файлов), и сайт сразу обновится.
              </p>
            )}
          </div>
        )}

        {/* Bundle verification banner */}
        {hasCompiledIndex && hasAssets ? (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-[11px] text-emerald-300 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                <strong>Production Bundle готов (v2.4):</strong> Скомпилированные JS/CSS файлы включены. GitHub Pages запустится мгновенно без необходимости компиляции Node.js.
              </span>
            </div>
            <button
              onClick={forceReloadApp}
              type="button"
              title="Перезагрузить код"
              className="px-2 py-1 text-emerald-300 hover:text-white rounded bg-emerald-900/60 hover:bg-emerald-800 text-[10px] font-mono cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Сброс
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-200 flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Подготовка бандла... При первой синхронизации создаются скомпилированные ассеты.</span>
          </div>
        )}

        {/* Change summary */}
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-[11px] text-slate-300 space-y-1 mb-5">
          <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Включено в это обновление:
          </span>
          <ul className="list-disc list-inside text-slate-400 space-y-0.5 pl-1">
            <li><strong className="text-slate-200">IPv4 Тренажёр:</strong> непрерывные биты маски (перед 1 не бывает 0, клик по 2 или 1 ставит единицы).</li>
            <li><strong className="text-slate-200">Вкладка «Практика»:</strong> все 4 симулятора (Путь пакета, VLAN, Протоколы, CLI) в одном хабе.</li>
            <li><strong className="text-slate-200">Production-бандл в корне:</strong> полное решение проблемы с открытием на iPhone/Safari.</li>
          </ul>
        </div>

        {successResult ? (
          <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-4">
            <div className="flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-base">Файлы успешно выгружены на GitHub!</h3>
                <p className="text-xs text-emerald-400/90">
                  Скомпилированная сборка и исходный код отправлены в репозиторий.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  Статус автосборки GitHub:
                </span>
                {liveActionStatus?.status === 'in_progress' || liveActionStatus?.status === 'queued' ? (
                  <span className="flex items-center gap-1.5 text-amber-400 font-mono font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Публикация страниц... (~15 сек)
                  </span>
                ) : liveActionStatus?.conclusion === 'success' ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-mono font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Готово! Сайт обновлён
                  </span>
                ) : (
                  <span className="text-emerald-300 font-mono text-[11px]">
                    ✓ Бандл отправлен (статический деплой)
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-cyan-500/20">
                <span className="text-slate-400">Единая ссылка для телефона и ПК:</span>
                <a
                  href={successResult.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-cyan-300 hover:underline flex items-center gap-1 font-bold"
                >
                  {successResult.pageUrl}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/30">
                <span className="text-slate-400">Репозиторий GitHub:</span>
                <a
                  href={successResult.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-slate-300 hover:underline flex items-center gap-1"
                >
                  {successResult.owner}/{repoName}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => handleRunAccessibilityTest(successResult.pageUrl)}
                disabled={isTesting}
                type="button"
                className="flex-1 py-2.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5" />
                {isTesting ? 'Проверка...' : 'Проверить обновление на сайте'}
              </button>

              <button
                onClick={() => {
                  setSuccessResult(null);
                  setLiveActionStatus(null);
                }}
                type="button"
                className="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Снова
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {token.trim() ? (
              <div className="p-3 rounded-xl bg-cyan-950/60 border border-cyan-400/50 flex items-center justify-between text-xs text-cyan-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white">Токен GitHub найден в памяти браузера: </span>
                    <span className="font-mono text-[11px] text-cyan-300">
                      {token.trim().slice(0, 7)}••••••••••••••••••••
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setToken('')}
                  type="button"
                  className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Сменить
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  Персональный токен GitHub (PAT)
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Токен сохраняется в локальной памяти вашего браузера. Требуется право <code className="text-cyan-300">repo</code>.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-cyan-400" />
                Имя репозитория
              </label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="my-gemini-mirror-site"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {isPushing && (
              <div className="space-y-2 p-3 rounded-xl bg-slate-900/80 border border-cyan-500/30">
                <div className="flex justify-between text-xs text-slate-300">
                  <span className="truncate pr-2 font-mono text-[11px]">{pushStatus}</span>
                  <span className="font-bold text-cyan-400">{progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={handlePush}
                disabled={isPushing}
                type="button"
                className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer min-h-[44px]"
              >
                <Sparkles className="w-4 h-4" />
                {isPushing ? 'Выгрузка и компиляция...' : 'Опубликовать зеркало в 1 клик'}
              </button>

              <button
                onClick={handleDownloadZip}
                type="button"
                className="py-3 px-4 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Скачать ZIP
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
