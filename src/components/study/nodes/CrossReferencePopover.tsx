import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Plus, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { bibleApi, type ApiCrossRef } from '@/lib/bibleApi';

const POPOVER_WIDTH = 360;
const POPOVER_MAX_HEIGHT = 460;
const ANCHOR_GAP = 6;

type Tab = 'cross' | 'meaning';

type CrossReferencePopoverProps = {
  anchorEl: HTMLElement | null;
  sourceNodeId: string;
  verseId: number;
  reference: string;
  verseText: string;
  /** version_id of the source verse — cross-refs run against the user's
   *  reading version (TSK mappings live on canonical/ASV; backend handles
   *  the cross-version mapping when version_id is passed). */
  versionId: number;
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

  const spaceBelow = vh - rect.bottom;
  const spaceAbove = rect.top;
  let top = rect.bottom + ANCHOR_GAP;
  if (spaceBelow < 240 && spaceAbove > spaceBelow) {
    top = Math.max(margin, rect.top - ANCHOR_GAP - POPOVER_MAX_HEIGHT);
  }
  return { left, top };
}

export function CrossReferencePopover({
  anchorEl,
  sourceNodeId,
  verseId,
  reference,
  verseText: _verseText,
  versionId,
  onClose,
}: CrossReferencePopoverProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('cross');
  const [pos, setPos] = useState<Position | null>(null);
  const [insertedIds, setInsertedIds] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const [xrefs, setXrefs] = useState<ApiCrossRef[] | null>(null);
  const [xrefsError, setXrefsError] = useState(false);

  const [meaning, setMeaning] = useState<ResultRow[] | null>(null);
  const [meaningError, setMeaningError] = useState(false);

  // Fetch cross-refs in the source verse's version so the user gets results
  // in their reading language (TSK mappings live on canonical/ASV; backend
  // does the per-version mapping when version_id is passed).
  useEffect(() => {
    let cancelled = false;
    setXrefs(null);
    setXrefsError(false);
    bibleApi
      .crossRefs(verseId, versionId)
      .then((data) => !cancelled && setXrefs(data ?? []))
      .catch(() => !cancelled && setXrefsError(true));
    return () => {
      cancelled = true;
    };
  }, [verseId, versionId]);

  // Fetch semantic neighbours lazily on first visit to the meaning tab.
  useEffect(() => {
    if (tab !== 'meaning') return;
    if (meaning !== null || meaningError) return;
    let cancelled = false;
    bibleApi
      .semanticSimilar(verseId, 30)
      .then((resp) => {
        if (cancelled) return;
        const rows: ResultRow[] = (resp?.results ?? []).map((r) => ({
          id: r.verse_id,
          book: r.book,
          slug: r.book_slug,
          chapter: r.chapter,
          verse: r.verse,
          text: r.text,
        }));
        setMeaning(rows);
      })
      .catch(() => !cancelled && setMeaningError(true));
    return () => {
      cancelled = true;
    };
  }, [tab, meaning, meaningError, verseId]);

  // Track anchor position via rAF.
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

  // Close on outside click + Escape.
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

  const insert = (ref: ResultRow) => {
    (window as any).__studyCanvasActions?.addCrossRefNode?.(
      sourceNodeId,
      ref,
      versionId,
    );
    setInsertedIds((prev) => new Set(prev).add(ref.id));
  };

  const insertAll = (list: ResultRow[]) => {
    list.forEach((ref, i) => setTimeout(() => insert(ref), i * 30));
  };

  const activeList = useMemo(
    () => (tab === 'cross' ? xrefs : meaning),
    [tab, xrefs, meaning],
  );

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

      <div className="flex border-b border-border shrink-0">
        <TabButton active={tab === 'cross'} onClick={() => setTab('cross')}>
          {t('study.crossRefs.tabs.crossRefs')}
        </TabButton>
        <TabButton active={tab === 'meaning'} onClick={() => setTab('meaning')}>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {t('study.crossRefs.tabs.meaning')}
          </span>
        </TabButton>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === 'cross' && (
          <ResultsList
            items={xrefs}
            error={xrefsError}
            insertedIds={insertedIds}
            onInsert={insert}
            emptyText={t('study.crossRefs.empty')}
            loadingText={t('study.crossRefs.loading')}
            errorText={t('study.crossRefs.error')}
          />
        )}
        {tab === 'meaning' && (
          <ResultsList
            items={meaning}
            error={meaningError}
            insertedIds={insertedIds}
            onInsert={insert}
            emptyText={t('study.crossRefs.meaning.empty')}
            loadingText={t('study.crossRefs.meaning.loading')}
            errorText={t('study.crossRefs.meaning.error')}
          />
        )}
      </div>

      {activeList && activeList.length > 1 && (
        <div className="border-t border-border px-3 py-2 shrink-0">
          <button
            type="button"
            onClick={() => insertAll(activeList)}
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'cursor-pointer flex-1 px-2 py-2 text-xs font-medium transition-colors',
        'border-b-2',
        active
          ? 'text-text-primary border-accent'
          : 'text-text-muted border-transparent hover:text-text-primary',
      )}
    >
      {children}
    </button>
  );
}

type ResultRow = {
  id: number;
  book: string;
  slug: string;
  chapter: number;
  verse: number;
  text: string;
};

function ResultsList({
  items,
  error,
  insertedIds,
  onInsert,
  emptyText,
  loadingText,
  errorText,
}: {
  items: ResultRow[] | null;
  error: boolean;
  insertedIds: Set<number>;
  onInsert: (ref: ResultRow) => void;
  emptyText: string;
  loadingText: string;
  errorText: string;
}) {
  const { t } = useTranslation();

  if (error) {
    return <div className="px-3 py-4 text-xs text-red-400">{errorText}</div>;
  }
  if (items === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-xs text-text-muted">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        {loadingText}
      </div>
    );
  }
  if (items.length === 0) {
    return <div className="px-3 py-4 text-xs text-text-muted">{emptyText}</div>;
  }

  return (
    <ul className="divide-y divide-border/60">
      {items.map((ref) => {
        const inserted = insertedIds.has(ref.id);
        return (
          <li key={ref.id}>
            <button
              type="button"
              onClick={() => onInsert(ref)}
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
  );
}
