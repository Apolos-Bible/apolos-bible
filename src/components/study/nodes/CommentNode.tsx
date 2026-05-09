import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { cn } from '@/lib/cn';
import { ResizableNode } from './ResizableNode';
import { useNoWheelOnOverflow } from './useNoWheelOnOverflow';

export type CommentNodeData = {
  authorName: string;
  text: string;
  createdAt: string;
};

type CommentNodeType = Node<CommentNodeData, 'comment'>;

export function CommentNode({ id, data, selected }: NodeProps<CommentNodeType>) {
  const { ref: scrollRef, className: scrollClass } = useNoWheelOnOverflow<HTMLParagraphElement>();
  return (
    <ResizableNode id={id} selected={selected} minWidth={200} minHeight={80}>
      <div
        className={cn(
          'bg-surface border border-border rounded-lg p-3 shadow-sm w-full h-full flex flex-col overflow-hidden',
          selected && 'ring-2 ring-accent',
        )}
      >
        <Handle id="top" type="source" position={Position.Top} className="!bg-border" />
        <Handle id="right" type="source" position={Position.Right} className="!bg-border" />
        <Handle id="left" type="source" position={Position.Left} className="!bg-border" />
        <div className="flex items-center gap-2 mb-1.5 shrink-0">
          <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-2xs font-medium text-accent shrink-0">
            {data.authorName.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-text-primary">{data.authorName}</span>
          <span className="text-2xs text-text-muted ml-auto">{data.createdAt}</span>
        </div>
        <p ref={scrollRef} className={cn('text-sm text-text-secondary overflow-auto flex-1', scrollClass)}>{data.text}</p>
        <Handle id="bottom" type="source" position={Position.Bottom} className="!bg-border" />
      </div>
    </ResizableNode>
  );
}
