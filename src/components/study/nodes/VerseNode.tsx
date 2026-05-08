import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useVerseStore } from '@/lib/store/useVerseStore';
import { ResizableNode } from './ResizableNode';
import { useNoWheelOnOverflow } from './useNoWheelOnOverflow';

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

  return (
    <ResizableNode id={id} selected={selected} minWidth={240} minHeight={90}>
      <div
        className={cn(
          'bg-surface border border-border rounded-lg p-3 shadow-sm w-full h-full flex flex-col overflow-hidden',
          selected && 'ring-2 ring-accent',
        )}
      >
        <Handle type="target" position={Position.Top} className="!bg-border" />
        <div className="text-2xs text-accent uppercase tracking-wide mb-1">
          {data.reference}
          {versionName && <span className="text-text-muted ml-1">({versionName})</span>}
        </div>
        <div ref={scrollRef} className={cn('text-sm leading-relaxed text-text-primary overflow-auto flex-1', scrollClass)}>
          {data.text || t('study.verseNode.loading')}
        </div>
        <Handle type="source" position={Position.Bottom} className="!bg-border" />
      </div>
    </ResizableNode>
  );
}
