import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { bibleApi, type ApiCrossRef } from '@/lib/bibleApi';

const CANONICAL_VERSION_ID = 1;

const POPOVER_WIDTH = 340;
const POPOVER_MAX_HEIGHT = 420;
const ANCHOR_GAP = 6;

type CrossReferencePopoverProps = {
  anchorEl: HTMLElement | null;
  sourceNodeId: string;
  verseId: number;
  reference: string;
  onClose: () => void;
};

type Position = { left: number; top: number };

function computePosition(rect: DOMRect): Position {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 8;

  let left = rect.left;
  if (left + POPOVER_WIDTH + margin > vw) {
    left = Math.max(margin, vw - POPOVER_WIDTH - margin);
  }
  if (left < margin) left = margin;

  // Open downward by default; flip if we'd clip the bottom and there's more
  // room above.
  const spaceBelow = vh - rect.bottom;
  const spaceAbove = rect.top;
  let top = rect.bottom + ANCHOR_GAP;
  if (spaceBelow < 220 && spaceAbove > spaceBelow) {
    top = Math.max(margin, rect.top - ANCHOR_GAP - POPOVER_MAX_HEIGHT);
  }
  return { left, top };
}

export function CrossReferencePopover({
  anchorEl,
  sourceNodeId,
  verseId,
  reference,
  onClose,
}: CrossReferencePopoverProps) {
  const { t } = useTranslation();
  const [refs, setRefs] = useState<ApiCrossRef[] | null>(null);
  const [error, setError] = useState(false);
  const [insertedIds, setInsertedIds] = useState<Set<number>>(new Set());
  const [pos, setPos] = useState<Position | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch refs.
  useEffect(() => {
    let cancelled = false;
    setRefs(null);
    setError(false);
    bibleApi
      .crossRefs(verseId)
      .then((data) => {
        if (cancelled) return;
        setRefs(data ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [verseId]);

  // Track anchor position via rAF so canvas pan/zoom keeps the popover glued.
  useLayoutEffect(() => {
    if (!anchorEl) return;
    let raf = 0;
    let lastKey = '';
    const tick = () => {
      const rect = anchorEl.getBoundingClientRect();
      const key = `${rect.left}|${rect.top}|${rect.right}|${rect.bottom}`;
      if (key !== lastKey) {
        lastKey = key;
        setPos(computePosition(rect));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anchorEl]);

  // Outside click + Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as globalThis.Node | null;
      if (containerRef.current?.contains(target)) return;
      if (anchorEl?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [anchorEl, onClose]);

  const insert = (ref: ApiCrossRef) => {
    (window as any).__studyCanvasActions?.addCrossRefNode?.(
      sourceNodeId,
      ref,
      CANONICAL_VERSION_ID,
    );
    setInsertedIds((prev) => new Set(prev).add(ref.id));
  };

  const insertAll = () => {
    if (!refs) return;
    refs.forEach((ref, i) => {
      setTimeout(() => insert(ref), i * 30);
    });
  };

  if (!pos) return null;

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        width: POPOVER_WIDTH,
        maxHeight: POPOVER_MAX_HEIGHT,
        zIndex: 1000,
      }}
      className={cn(
        'flex flex-col overflow-hidden',
        'bg-surface border border-border rounded-lg shadow-xl',
      )}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border shrink-0">
        <div className="text-2xs uppercase tracking-wide text-text-muted truncate">
          {t('study.crossRefs.title', { ref: reference })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-text-muted hover:text-text-primary transition-colors"
          aria-label={t('action.close', 'Close')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {refs === null && !error && (
          <div className="flex items-center justify-center gap-2 py-6 text-xs text-text-muted">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t('study.crossRefs.loading')}
          </div>
        )}
        {error && (
          <div className="px-3 py-4 text-xs text-red-400">
            {t('study.crossRefs.error')}
          </div>
        )}
        {refs && refs.length === 0 && (
          <div className="px-3 py-4 text-xs text-text-muted">
            {t('study.crossRefs.empty')}
          </div>
        )}
        {refs && refs.length > 0 && (
          <ul className="divide-y divide-border/60">
            {refs.map((ref) => {
              const inserted = insertedIds.has(ref.id);
              return (
                <li key={ref.id}>
                  <button
                    type="button"
                    onClick={() => insert(ref)}
                    disabled={inserted}
                    className={cn(
                      'group/row w-full text-left px-3 py-2 flex items-start gap-2',
                      'hover:bg-bg-secondary transition-colors',
                      inserted && 'opacity-50 cursor-default',
                      !inserted && 'cursor-pointer',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-2xs font-medium text-accent uppercase tracking-wide mb-0.5">
                        {ref.book} {ref.chapter}:{ref.verse}
                      </div>
                      <div className="text-xs leading-relaxed text-text-secondary line-clamp-3">
                        {ref.text}
                      </div>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 mt-0.5 flex items-center justify-center w-5 h-5 rounded',
                        inserted
                          ? 'text-green-500'
                          : 'text-text-muted opacity-0 group-hover/row:opacity-100 group-focus-visible/row:opacity-100 transition-opacity',
                      )}
                      aria-label={inserted ? t('study.crossRefs.inserted') : t('study.crossRefs.insert')}
                    >
                      {inserted ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {refs && refs.length > 1 && (
        <div className="border-t border-border px-3 py-2 shrink-0">
          <button
            type="button"
            onClick={insertAll}
            className="cursor-pointer w-full text-xs text-accent hover:text-accent/80 transition-colors text-left"
          >
            {t('study.crossRefs.insertAll')}
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
