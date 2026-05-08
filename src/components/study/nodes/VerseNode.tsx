import { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { Network } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useVerseStore } from '@/lib/store/useVerseStore';
import { ResizableNode } from './ResizableNode';
import { useNoWheelOnOverflow } from './useNoWheelOnOverflow';
import { CrossReferencePopover } from './CrossReferencePopover';

export type VerseNodeData = {
  verseId: number;
  reference: string;
  version_id: number;
  text?: string;
};

type VerseNodeType = Node<VerseNodeData, 'verse'>;

export function VerseNode({ id, data, selected }: NodeProps<VerseNodeType>) {
  const { t } = useTranslation();
  const versions = useVerseStore((s) => s.versions);
  const versionName = versions.find((v) => v.id === data.version_id)?.abbreviation ?? '';
  const { ref: scrollRef, className: scrollClass } = useNoWheelOnOverflow<HTMLDivElement>();
  const [xrefOpen, setXrefOpen] = useState(false);

  return (
    <ResizableNode id={id} selected={selected} minWidth={240} minHeight={90}>
      <div
        className={cn(
          'group/verse relative bg-surface border border-border rounded-lg p-3 shadow-sm w-full h-full flex flex-col overflow-visible',
          selected && 'ring-2 ring-accent',
        )}
      >
        <Handle type="target" position={Position.Top} className="!bg-border" />

        <div className="flex items-center justify-between gap-2 mb-1 shrink-0">
          <div className="text-2xs text-accent uppercase tracking-wide truncate">
            {data.reference}
            {versionName && <span className="text-text-muted ml-1">({versionName})</span>}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setXrefOpen((v) => !v);
            }}
            className={cn(
              'nodrag cursor-pointer flex items-center justify-center w-6 h-6 rounded-md shrink-0',
              'text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors',
              'opacity-0 group-hover/verse:opacity-100 focus-visible:opacity-100 transition-opacity',
              (selected || xrefOpen) && 'opacity-100',
              xrefOpen && 'bg-black/5 dark:bg-white/10 text-text-primary',
            )}
            title={t('study.verseNode.crossRefs')}
            aria-label={t('study.verseNode.crossRefs')}
          >
            <Network className="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          ref={scrollRef}
          className={cn('text-sm leading-relaxed text-text-primary overflow-auto flex-1', scrollClass)}
        >
          {data.text || t('study.verseNode.loading')}
        </div>

        <Handle type="source" position={Position.Bottom} className="!bg-border" />

        {xrefOpen && (
          <CrossReferencePopover
            sourceNodeId={id}
            verseId={data.verseId}
            reference={data.reference}
            onClose={() => setXrefOpen(false)}
          />
        )}
      </div>
    </ResizableNode>
  );
}
