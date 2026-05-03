import { useContext, useEffect, useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { cn } from '@/lib/cn';
import { bibleApi } from '@/lib/bibleApi';
import { StudyDocContext } from '@/lib/study/StudyDocContext';
import { getNodesMap } from '@/lib/study/yDocHelpers';

export type PassageNodeData = {
  bookSlug: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  reference: string;
  version_id: number;
  verses?: { verseId?: number; reference?: string; verse: number; text: string }[];
};

type PassageNodeType = Node<PassageNodeData, 'passage'>;

export function PassageNode({ id, data, selected }: NodeProps<PassageNodeType>) {
  const doc = useContext(StudyDocContext);
  const [loadFailed, setLoadFailed] = useState(false);
  const verses = data.verses ?? [];

  useEffect(() => {
    if (!doc || verses.length > 0 || !data.bookSlug || !data.chapter || !data.version_id) return;

    let cancelled = false;

    async function loadPassage() {
      setLoadFailed(false);

      try {
        const chapter = await bibleApi.chapter(data.version_id, data.bookSlug, data.chapter);
        if (cancelled) return;

        const startVerse = data.startVerse || 1;
        const endVerse = data.endVerse || chapter.verses[chapter.verses.length - 1]?.number || startVerse;
        const loadedVerses = chapter.verses
          .filter((verse) => verse.number >= startVerse && verse.number <= endVerse)
          .map((verse) => ({
            verseId: verse.id,
            reference: `${chapter.book.name} ${data.chapter}:${verse.number}`,
            verse: verse.number,
            text: verse.text,
          }));

        const nodeMap = getNodesMap(doc).get(id);
        if (!nodeMap || loadedVerses.length === 0) return;

        doc.transact(() => {
          nodeMap.set('data', {
            ...data,
            reference: data.reference || `${chapter.book.name} ${data.chapter}:${startVerse}-${endVerse}`,
            verses: loadedVerses,
          });
        });
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    }

    loadPassage();

    return () => {
      cancelled = true;
    };
  }, [doc, id, data, verses.length]);

  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg p-3 min-w-[300px] max-w-[450px] max-h-[400px] shadow-sm flex flex-col',
        selected && 'ring-2 ring-accent',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-border" />
      <div className="text-2xs text-accent uppercase tracking-wide mb-2 shrink-0">
        {data.reference}
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {verses.length > 0 ? (
          verses.map((v) => (
            <div key={v.verse} className="flex gap-2 text-sm leading-relaxed">
              <span className="text-2xs text-text-muted shrink-0 mt-0.5 w-4 text-right">
                {v.verse}
              </span>
              <span className="text-text-primary">{v.text}</span>
            </div>
          ))
        ) : loadFailed ? (
          <p className="text-sm text-red-400">Could not load passage.</p>
        ) : (
          <p className="text-sm text-text-muted">Loading passage...</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-border" />
    </div>
  );
}
