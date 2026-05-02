import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { cn } from '@/lib/cn';
import { useVerseStore } from '@/lib/store/useVerseStore';

export type VerseNodeData = {
  verseId: number;
  reference: string;
  version_id: number;
  text?: string;
};

type VerseNodeType = Node<VerseNodeData, 'verse'>;

export function VerseNode({ data, selected }: NodeProps<VerseNodeType>) {
  const versions = useVerseStore((s) => s.versions);

  const versionName = versions.find((v) => v.id === data.version_id)?.abbreviation ?? '';

  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg p-3 min-w-[280px] max-w-[400px] shadow-sm',
        selected && 'ring-2 ring-accent',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-border" />
      <div className="text-2xs text-accent uppercase tracking-wide mb-1">
        {data.reference}
        {versionName && <span className="text-text-muted ml-1">({versionName})</span>}
      </div>
      <div className="text-sm leading-relaxed text-text-primary">
        {data.text || 'Loading...'}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-border" />
    </div>
  );
}
