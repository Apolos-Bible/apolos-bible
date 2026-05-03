import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { X, Search, BookOpen } from 'lucide-react';
import { type ApiSearchResult } from '@/lib/bibleApi';
import { searchVerses } from '@/lib/verseSearch';
import { useVerseStore } from '@/lib/store/useVerseStore';
import { cn } from '@/lib/cn';

type FlatItem =
  | { kind: 'chapter'; groupKey: string; results: ApiSearchResult[] }
  | { kind: 'verse'; result: ApiSearchResult };

interface InsertVerseModalProps {
  open: boolean;
  onClose: () => void;
}

export function InsertVerseModal({ open, onClose }: InsertVerseModalProps) {
  const versionId = useVerseStore((s) => s.versionId);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ApiSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const doSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const r = await searchVerses(versionId, q.trim());
        setResults(r);
        setActiveIdx(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [versionId],
  );

  const handleChange = useCallback(
    (val: string) => {
      setQuery(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(val), 200);
    },
    [doSearch],
  );

  const flatItems = useMemo<FlatItem[]>(() => {
    const groups = new Map<string, ApiSearchResult[]>();
    results.forEach((r) => {
      const key = `${r.book} ${r.chapter}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    });
    const items: FlatItem[] = [];
    for (const [key, groupResults] of groups) {
      items.push({ kind: 'chapter', groupKey: key, results: groupResults });
      for (const r of groupResults) {
        items.push({ kind: 'verse', result: r });
      }
    }
    return items;
  }, [results]);

  const handleSelect = useCallback(
    (r: ApiSearchResult) => {
      (window as any).__studyCanvasActions?.addVerseNode?.({
        verseId: r.id,
        reference: `${r.book} ${r.chapter}:${r.verse}`,
        version_id: versionId,
        text: r.text,
      });
      onClose();
    },
    [versionId, onClose],
  );

  const handleChapterInsert = useCallback(
    (groupResults: ApiSearchResult[]) => {
      groupResults.forEach((r) => {
        (window as any).__studyCanvasActions?.addVerseNode?.({
          verseId: r.id,
          reference: `${r.book} ${r.chapter}:${r.verse}`,
          version_id: versionId,
          text: r.text,
        });
      });
      onClose();
    },
    [versionId, onClose],
  );

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && flatItems[activeIdx]) {
        e.preventDefault();
        const item = flatItems[activeIdx];
        if (item.kind === 'chapter') {
          handleChapterInsert(item.results);
        } else {
          handleSelect(item.result);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [flatItems, activeIdx, handleSelect, handleChapterInsert, onClose],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-2xl shadow-xl p-5 max-w-lg w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-md font-semibold text-text-primary flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" />
            Insert Verse
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search verses (e.g. John 3:16)..."
            className="w-full pl-9 pr-3 py-2 bg-bg-primary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent/50 placeholder:text-text-muted"
          />
        </div>

        <div className="max-h-64 overflow-y-auto">
          {loading && (
            <p className="text-sm text-text-muted text-center py-6">Searching...</p>
          )}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-text-muted text-center py-6">No results found</p>
          )}
          {!loading && query.trim().length < 2 && (
            <p className="text-sm text-text-muted text-center py-6">
              Type at least 2 characters to search
            </p>
          )}
          {flatItems.map((item, i) =>
            item.kind === 'chapter' ? (
              <button
                key={`ch-${item.groupKey}`}
                onClick={() => handleChapterInsert(item.results)}
                className={cn(
                  'w-full text-left px-3 py-1.5 flex items-center gap-2 rounded-lg transition-colors',
                  i === activeIdx ? 'bg-accent/10' : 'hover:bg-bg-tertiary',
                )}
              >
                <BookOpen className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="text-xs font-medium text-accent">
                  {item.groupKey}
                </span>
                <span className="text-2xs text-text-muted ml-auto">
                  {item.results.length} verse{item.results.length !== 1 ? 's' : ''}
                </span>
              </button>
            ) : (
              <button
                key={item.result.id}
                onClick={() => handleSelect(item.result)}
                className={cn(
                  'w-full text-left px-3 py-2 flex flex-col gap-0.5 rounded-lg transition-colors',
                  i === activeIdx ? 'bg-accent/10' : 'hover:bg-bg-tertiary',
                )}
              >
                <span className="text-xs font-medium text-accent">
                  {item.result.book} {item.result.chapter}:{item.result.verse}
                </span>
                <span className="text-xs text-text-muted line-clamp-2 leading-snug">
                  {item.result.text}
                </span>
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
