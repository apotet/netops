import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';

interface ZoomableImageProps {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
  imgClassName?: string;
  /** Open fullscreen viewer on click (default true) */
  fullscreenOnClick?: boolean;
  /** Keep tall lesson cheat sheets fully visible before opening the viewer. */
  previewFullHeight?: boolean;
}

// 100% means that the entire photo fits in the viewport.
const MIN_SCALE = 0.5;
const MAX_SCALE = 6;

export const ZoomableImage: React.FC<ZoomableImageProps> = ({
  src,
  alt,
  caption,
  className = '',
  imgClassName = '',
  fullscreenOnClick = true,
  previewFullHeight = false,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  // Allow panning only within the scaled image's actual overflow in each axis.
  const clampOffset = useCallback((point: { x: number; y: number }, atScale: number) => {
    const container = containerRef.current;
    const img = imageRef.current;
    if (!container || !img) return { x: 0, y: 0 };
    const maxX = Math.max(0, (img.offsetWidth * atScale - container.clientWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * atScale - container.clientHeight) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, point.x)),
      y: Math.max(-maxY, Math.min(maxY, point.y)),
    };
  }, []);

  const updateOffset = useCallback((point: { x: number; y: number }) => {
    const next = clampOffset(point, scaleRef.current);
    offsetRef.current = next;
    setOffset(next);
  }, [clampOffset]);

  const resetTransform = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    scaleRef.current = 1;
    offsetRef.current = { x: 0, y: 0 };
  }, []);

  useEffect(() => {
    resetTransform();
  }, [src, open, resetTransform]);

  // Lock body scroll while fullscreen is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === '0' || e.key === 'Home') resetTransform();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, resetTransform]);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const applyScaleAt = useCallback((nextScale: number, clientX?: number, clientY?: number) => {
    const s = clampScale(nextScale);
    const prev = scaleRef.current;
    if (Math.abs(s - prev) < 0.0001) return;
    let next = { ...offsetRef.current };
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const cx = (clientX ?? rect.left + rect.width / 2) - rect.left - rect.width / 2;
      const cy = (clientY ?? rect.top + rect.height / 2) - rect.top - rect.height / 2;
      const ratio = s / prev;
      next = { x: cx - (cx - next.x) * ratio, y: cy - (cy - next.y) * ratio };
    }
    next = clampOffset(next, s);
    scaleRef.current = s;
    offsetRef.current = next;
    setScale(s);
    setOffset(next);
  }, [clampOffset]);

  const moveBy = useCallback((dx: number, dy: number) => {
    updateOffset({ x: offsetRef.current.x + dx, y: offsetRef.current.y + dy });
  }, [updateOffset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); moveBy(0, 64); }
      if (e.key === 'ArrowDown') { e.preventDefault(); moveBy(0, -64); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); moveBy(64, 0); }
      if (e.key === 'ArrowRight') { e.preventDefault(); moveBy(-64, 0); }
      if (e.key === '+' || e.key === '=') applyScaleAt(scaleRef.current * 1.25);
      if (e.key === '-' || e.key === '_') applyScaleAt(scaleRef.current / 1.25);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, moveBy, applyScaleAt]);

  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      applyScaleAt(scaleRef.current * factor, e.clientX, e.clientY);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [open, applyScaleAt]);

  const touchDistance = (t: React.TouchList) => {
    if (t.length < 2) return 0;
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.hypot(dx, dy);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = { dist: touchDistance(e.touches), scale: scaleRef.current };
      dragRef.current = null;
    } else if (e.touches.length === 1 && scaleRef.current > 1) {
      dragRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        ox: offsetRef.current.x,
        oy: offsetRef.current.y,
      };
      pinchRef.current = null;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dist = touchDistance(e.touches);
      if (pinchRef.current.dist <= 0) return;
      const next = pinchRef.current.scale * (dist / pinchRef.current.dist);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      applyScaleAt(next, midX, midY);
    } else if (e.touches.length === 1 && dragRef.current && scaleRef.current > 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - dragRef.current.x;
      const dy = e.touches[0].clientY - dragRef.current.y;
      updateOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy });
    }
  };

  const onTouchEnd = () => {
    pinchRef.current = null;
    dragRef.current = null;
    // Do not snap 50% / 75% pinch-zoom back to 100%.
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (scaleRef.current > 1) {
      resetTransform();
    } else {
      applyScaleAt(2.5, e.clientX, e.clientY);
    }
  };

  const openViewer = () => {
    if (fullscreenOnClick) setOpen(true);
  };

  return (
    <>
      <div
        className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-black/60 p-2 ${className}`}
      >
        <button
          type="button"
          onClick={openViewer}
          className="relative block w-full overflow-hidden rounded-xl cursor-zoom-in group text-left"
          aria-label={`Открыть ${alt} на весь экран`}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            loading="lazy"
            className={`${previewFullHeight ? 'max-h-none' : 'max-h-80'} w-full object-contain rounded-xl mx-auto pointer-events-none ${imgClassName}`}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-mono opacity-90 group-hover:opacity-100">
            <Maximize2 className="w-3 h-3" />
            На весь экран
          </span>
        </button>
        {caption && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-1.5 font-mono">
            {caption}
          </p>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 shrink-0">
            <div className="min-w-0 text-xs sm:text-sm text-white/90 font-medium truncate">{alt}</div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={resetTransform}
                className="px-2 py-1 rounded-lg text-[11px] font-mono text-white/80 hover:bg-white/10 cursor-pointer"
                title="Сбросить масштаб (0)"
              >
                <Minimize2 className="w-3.5 h-3.5 inline mr-1" />
                100%
              </button>
              <span className="text-[11px] font-mono text-cyan-300 w-10 text-right">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-white hover:bg-white/10 cursor-pointer"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div
            ref={containerRef}
            data-photo-viewer-pan
            className="relative flex-1 overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
            onDoubleClick={onDoubleClick}
            onMouseDown={(e) => {
              if (e.button !== 0 || scaleRef.current <= 1) return;
              e.preventDefault();
              dragRef.current = {
                x: e.clientX,
                y: e.clientY,
                ox: offsetRef.current.x,
                oy: offsetRef.current.y,
              };
              const onMove = (ev: MouseEvent) => {
                if (!dragRef.current) return;
                updateOffset({
                  x: dragRef.current.ox + (ev.clientX - dragRef.current.x),
                  y: dragRef.current.oy + (ev.clientY - dragRef.current.y),
                });
              };
              const onUp = () => {
                dragRef.current = null;
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          >
            <img
              ref={imageRef}
              data-photo-viewer-image
              src={src}
              alt={alt}
              draggable={false}
              className="absolute top-1/2 left-1/2 block object-contain pointer-events-none"
              style={{
                // Fit BOTH dimensions. The old fixed width overflowed tall
                // photos vertically even at the nominal 100% zoom.
                width: 'auto',
                height: 'auto',
                maxWidth: '100%',
                maxHeight: '100%',
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: 'center center',
              }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 px-2 pt-2 border-t border-white/10 shrink-0" aria-label="Масштаб фотографии">
            <button type="button" onClick={() => applyScaleAt(scaleRef.current / 1.25)}
              disabled={scale <= MIN_SCALE} aria-label="Уменьшить фото"
              className="min-h-9 min-w-9 rounded-lg bg-white/10 text-white disabled:opacity-30">−</button>
            {([0.5, 0.75, 1] as const).map(value => (
              <button key={value} type="button" onClick={() => applyScaleAt(value)}
                aria-label={`Масштаб ${Math.round(value * 100)}%`}
                aria-pressed={Math.abs(scale - value) < 0.01}
                className={`min-h-9 rounded-lg border px-2.5 text-[12px] font-mono ${Math.abs(scale - value) < 0.01 ? 'border-cyan-400 text-cyan-300' : 'border-white/20 text-white/80'}`}>
                {Math.round(value * 100)}%
              </button>
            ))}
            <button type="button" onClick={() => applyScaleAt(scaleRef.current * 1.25)}
              disabled={scale >= MAX_SCALE} aria-label="Увеличить фото"
              className="min-h-9 min-w-9 rounded-lg bg-white/10 text-white disabled:opacity-30">+</button>
          </div>
          <div className="px-3 pb-2 pt-1.5 text-[10px] sm:text-[11px] text-white/50 font-mono text-center shrink-0">
            100% — фото целиком · колесо / щипок — масштаб · перетаскивание — сдвиг · Esc — закрыть
          </div>
        </div>
      )}
    </>
  );
};
