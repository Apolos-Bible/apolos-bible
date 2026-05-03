import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { cn } from '@/lib/cn';

export type CommentNodeData = {
  authorName: string;
  text: string;
  createdAt: string;
};

type CommentNodeType = Node<CommentNodeData, 'comment'>;

export function CommentNode({ data, selected }: NodeProps<CommentNodeType>) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg p-3 min-w-[220px] max-w-[320px] shadow-sm',
        selected && 'ring-2 ring-accent',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-border" />
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-2xs font-medium text-accent shrink-0">
          {data.authorName.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-medium text-text-primary">{data.authorName}</span>
        <span className="text-2xs text-text-muted ml-auto">{data.createdAt}</span>
      </div>
      <p className="text-sm text-text-secondary">{data.text}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-border" />
    </div>
  );
}
