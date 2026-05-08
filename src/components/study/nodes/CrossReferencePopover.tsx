import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Plus, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { bibleApi, type ApiCrossRef, type ApiSearchResult } from '@/lib/bibleApi';

const POPOVER_WIDTH = 360;
const POPOVER_MAX_HEIGHT = 460;
const ANCHOR_GAP = 6;

type Tab = 'cross' | 'similar' | 'meaning';

type CrossReferencePopoverProps = {
  anchorEl: HTMLElement | null;
  sourceNodeId: string;
  verseId: number;
  reference: string;
  verseText: string;
  /** version_id of the source verse — used for the "similar" tab so the
   *  search runs in the user's reading language (cross-refs tab still uses
   *  the canonical/ASV version where the TSK mappings live). */
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

// Minimal stopword filter for ES + EN. Good enough for keyword extraction
// from a single verse to feed the existing search endpoint.
const STOPWORDS = new Set([
  // EN
  'the','a','an','and','or','but','of','to','in','for','with','on','at','by','from',
  'is','are','was','were','be','been','being','have','has','had','do','does','did',
  'will','would','shall','should','may','might','can','could','this','that','these',
  'those','it','its','he','she','they','we','you','i','my','your','his','her','their',
  'our','me','us','them','him','not','no','so','as','if','then','when','where','what',
  'who','whom','which','why','how','than','also','too','very','just','like','about',
  'into','out','up','down','off','over','under','again','more','most','some','any',
  'all','each','every','other','same','such','only','own','here','there','because',
  // ES
  'el','la','los','las','un','una','unos','unas','y','o','u','pero','de','del','al','a',
  'en','por','para','con','sin','sobre','hasta','desde','es','son','era','eran','ser',
  'fue','fueron','fui','sera','sere','ha','han','habia','habian','tener','tiene','tuvo',
  'hacer','hace','hizo','haber','este','esta','estos','estas','ese','esa','esos','esas',
  'aquel','aquella','aquellos','aquellas','lo','le','les','te','me','se','su','sus',
  'mi','mis','tu','tus','nuestro','nuestra','nuestros','nuestras','vuestro','vuestra',
  'vuestros','vuestras','no','si','sí','tambien','también','asi','así','como','si',
  'entonces','cuando','donde','dónde','que','qué','quien','quién','cual','cuál','por',
  'porque','porqué','cómo','muy','mas','más','tan','ya','aun','aún','sólo','solo',
  'todo','toda','todos','todas','otro','otra','otros','otras','mismo','misma','mismos',
  'mismas','sólo','aquí','ahí','allí','allá','siempre','nunca','jamás','también',
  'tampoco','o sea',
]);

function extractKeywords(text: string, max = 6): string[] {
  if (!text) return [];
  const tokens = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of tokens) {
    if (!seen.has(t)) {
      seen.add(t);
      unique.push(t);
    }
  }
  return unique
    .sort((a, b) => b.length - a.length)
    .slice(0, max);
}

export function CrossReferencePopover({
  anchorEl,
  sourceNodeId,
  verseId,
  reference,
  verseText,
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

  const [similar, setSimilar] = useState<ApiSearchResult[] | null>(null);
  const [similarError, setSimilarError] = useState(false);

  const keywords = useMemo(() => extractKeywords(verseText), [verseText]);

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

  // Fetch similar verses lazily on first visit to that tab.
  // The backend's /search does a `LIKE %q%` substring match, so we fan out
  // one request per keyword and merge by how many keywords each verse hits.
  useEffect(() => {
    if (tab !== 'similar') return;
    if (similar !== null || similarError) return;
    if (keywords.length === 0) {
      setSimilar([]);
      return;
    }
    let cancelled = false;
    Promise.all(
      keywords.map((kw) =>
        bibleApi.search(versionId, kw).catch(() => [] as ApiSearchResult[]),
      ),
    )
      .then((batches) => {
        if (cancelled) return;
        type Hit = ApiSearchResult & { _score: number };
        const byId = new Map<number, Hit>();
        batches.forEach((batch) => {
          batch.forEach((r) => {
            if (r.id === verseId) return;
            const existing = byId.get(r.id);
            if (existing) existing._score += 1;
            else byId.set(r.id, { ...r, _score: 1 });
          });
        });
        const merged = Array.from(byId.values())
          .sort((a, b) => b._score - a._score || a.text.length - b.text.length)
          .slice(0, 30);
        setSimilar(merged);
      })
      .catch(() => !cancelled && setSimilarError(true));
    return () => {
      cancelled = true;
    };
  }, [tab, keywords, similar, similarError, verseId, versionId]);

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

  const insertWith = (
    ref: { id: number; book: string; slug: string; chapter: number; verse: number; text: string },
    insertVersionId: number,
  ) => {
    (window as any).__studyCanvasActions?.addCrossRefNode?.(
      sourceNodeId,
      ref,
      insertVersionId,
    );
    setInsertedIds((prev) => new Set(prev).add(ref.id));
  };

  const insertCross = (ref: ResultRow) => insertWith(ref, versionId);
  const insertSimilar = (ref: ResultRow) => insertWith(ref, versionId);

  const insertAll = (
    list: ResultRow[],
    insertVersionId: number,
  ) => {
    list.forEach((ref, i) => setTimeout(() => insertWith(ref, insertVersionId), i * 30));
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

      <div className="flex border-b border-border shrink-0">
        <TabButton active={tab === 'cross'} onClick={() => setTab('cross')}>
          {t('study.crossRefs.tabs.crossRefs')}
        </TabButton>
        <TabButton active={tab === 'similar'} onClick={() => setTab('similar')}>
          {t('study.crossRefs.tabs.similar')}
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
            onInsert={insertCross}
            emptyText={t('study.crossRefs.empty')}
            loadingText={t('study.crossRefs.loading')}
            errorText={t('study.crossRefs.error')}
          />
        )}
        {tab === 'similar' && (
          <ResultsList
            items={similar}
            error={similarError}
            insertedIds={insertedIds}
            onInsert={insertSimilar}
            emptyText={
              keywords.length === 0
                ? t('study.crossRefs.similar.noKeywords')
                : t('study.crossRefs.similar.empty')
            }
            loadingText={t('study.crossRefs.similar.loading')}
            errorText={t('study.crossRefs.similar.error')}
            footerHint={
              keywords.length > 0
                ? keywords.join(' · ')
                : undefined
            }
          />
        )}
        {tab === 'meaning' && (
          <div className="px-4 py-8 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 text-accent mb-3">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-text-primary mb-1">
              {t('study.crossRefs.meaning.comingSoon')}
            </div>
            <div className="text-xs text-text-muted leading-relaxed max-w-[260px] mx-auto">
              {t('study.crossRefs.meaning.description')}
            </div>
          </div>
        )}
      </div>

      {(() => {
        const list = tab === 'cross' ? xrefs : tab === 'similar' ? similar : null;
        if (!list || list.length <= 1) return null;
        const ver = versionId;
        return (
          <div className="border-t border-border px-3 py-2 shrink-0">
            <button
              type="button"
              onClick={() => insertAll(list, ver)}
              className="cursor-pointer w-full text-xs text-accent hover:text-accent/80 transition-colors text-left"
            >
              {t('study.crossRefs.insertAll')}
            </button>
          </div>
        );
      })()}
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
  footerHint,
}: {
  items: ResultRow[] | null;
  error: boolean;
  insertedIds: Set<number>;
  onInsert: (ref: ResultRow) => void;
  emptyText: string;
  loadingText: string;
  errorText: string;
  footerHint?: string;
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
    <>
      {footerHint && (
        <div className="px-3 pt-2 pb-1 text-2xs text-text-muted truncate">
          {footerHint}
        </div>
      )}
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
    </>
  );
}
