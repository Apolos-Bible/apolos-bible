import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { bibleApi, type ApiCrossRef } from '@/lib/bibleApi';

// Cross-references in the DB are seeded against the canonical (ASV) version.
// We insert the resulting verse nodes referencing that version so the cached
// text matches the verse id.
const CANONICAL_VERSION_ID = 1;

type CrossReferencePopoverProps = {
  sourceNodeId: string;
  verseId: number;
  reference: string;
  onClose: () => void;
};

export function CrossReferencePopover({
  sourceNodeId,
  verseId,
  reference,
  onClose,
}: CrossReferencePopoverProps) {
  const { t } = useTranslation();
  const [refs, setRefs] = useState<ApiCrossRef[] | null>(null);
  const [error, setError] = useState(false);
  const [insertedIds, setInsertedIds] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Close on outside click + Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as globalThis.Node | null)) {
        onClose();
      }
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
  }, [onClose]);

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
      // small stagger so positions don't collide on initial calc
      setTimeout(() => insert(ref), i * 30);
    });
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'nodrag nowheel absolute top-full left-0 mt-2 z-20',
        'w-[340px] max-h-[420px] overflow-hidden flex flex-col',
        'bg-surface border border-border rounded-lg shadow-xl',
      )}
      onClick={(e) => e.stopPropagation()}
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
    </div>
  );
}
