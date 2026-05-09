import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Markdown } from '@/components/ui/Markdown';
import { ResizableNode } from './ResizableNode';
import { useNoWheelOnOverflow } from './useNoWheelOnOverflow';

export type AiNoteNodeData = {
  question: string;
  answer: string;
  sourceReference?: string;
  model?: string;
};

type AiNoteNodeType = Node<AiNoteNodeData, 'ai-note'>;

export function AiNoteNode({ id, data, selected }: NodeProps<AiNoteNodeType>) {
  const { t } = useTranslation();
  const { ref: scrollRef, className: scrollClass } = useNoWheelOnOverflow<HTMLDivElement>();

  return (
    <ResizableNode id={id} selected={selected} minWidth={240} minHeight={120}>
      <div
        className={cn(
          'relative bg-surface border border-accent/40 rounded-lg p-3 shadow-sm w-full h-full flex flex-col overflow-hidden',
          'before:absolute before:inset-0 before:rounded-lg before:pointer-events-none',
          'before:bg-gradient-to-br before:from-accent/5 before:to-transparent',
          selected && 'ring-2 ring-accent',
        )}
      >
        <Handle id="top" type="source" position={Position.Top} className="!bg-border" />
        <Handle id="right" type="source" position={Position.Right} className="!bg-border" />
        <Handle id="left" type="source" position={Position.Left} className="!bg-border" />

        <div className="relative flex items-center gap-1.5 mb-1.5 shrink-0">
          <Sparkles className="w-3 h-3 text-accent" />
          <span className="text-2xs font-medium text-accent uppercase tracking-wide">
            {t('study.aiNote.badge', 'AI-Generated')}
          </span>
          {data.sourceReference && (
            <span className="text-2xs text-text-muted ml-auto truncate">
              {data.sourceReference}
            </span>
          )}
        </div>

        {data.question && (
          <div className="relative text-2xs text-text-muted italic mb-1.5 shrink-0 line-clamp-2">
            {data.question}
          </div>
        )}

        <div
          ref={scrollRef}
          className={cn('relative overflow-auto flex-1', scrollClass)}
        >
          <Markdown>{data.answer}</Markdown>
        </div>

        <Handle id="bottom" type="source" position={Position.Bottom} className="!bg-border" />
      </div>
    </ResizableNode>
  );
}
