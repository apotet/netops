import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Image as ImageIcon } from 'lucide-react';

type Credit = {
  slug: string;
  local: string;
  fileName?: string;
  sourcePage?: string;
  author?: string;
  license?: string;
  licenseUrl?: string;
  description?: string;
};

interface PhotoCreditsProps {
  onClose: () => void;
}

const CREDITS_URL =
  'https://raw.githubusercontent.com/apotet/osi-tcpip-exam-public/main/assets/photos/credits.json';

export const PhotoCredits: React.FC<PhotoCreditsProps> = ({ onClose }) => {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(CREDITS_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setCredits(Array.isArray(data) ? data : []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Не удалось загрузить список источников');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-white dark:bg-[#091524] border border-slate-200 dark:border-cyan-500/30 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-300">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Источники фотографий и лицензии
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Визуальные материалы сохранены для обучения. Условия лицензий — ниже.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
            Фотографии оборудования используются в вопросах L1. Они не перелицензируются этим сайтом и
            остаются под исходными лицензиями Wikimedia Commons (обычно CC BY / CC BY-SA). При
            переиспользовании укажите автора и лицензию.
          </p>

          {loading && <p className="text-slate-500">Загрузка списка…</p>}
          {error && (
            <p className="text-rose-500">
              {error}. Полный список также доступен в{' '}
              <a
                className="underline text-cyan-600 dark:text-cyan-400"
                href="https://github.com/apotet/osi-tcpip-exam-public/blob/main/assets/photos/credits.json"
                target="_blank"
                rel="noopener noreferrer"
              >
                credits.json
              </a>
              .
            </p>
          )}

          {!loading &&
            !error &&
            credits.map((c, idx) => (
              <div
                key={c.slug || idx}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-1"
              >
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {idx + 1}. {c.fileName || c.local || c.slug}
                </div>
                {c.description && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.description}</p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                  {c.author && <span>Автор: {c.author}</span>}
                  {c.license && (
                    <span>
                      Лицензия:{' '}
                      {c.licenseUrl ? (
                        <a
                          href={c.licenseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-600 dark:text-cyan-400 hover:underline"
                        >
                          {c.license}
                        </a>
                      ) : (
                        c.license
                      )}
                    </span>
                  )}
                  {c.sourcePage && (
                    <a
                      href={c.sourcePage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline"
                    >
                      Источник <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
