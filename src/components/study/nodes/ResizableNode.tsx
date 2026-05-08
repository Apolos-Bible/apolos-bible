import { useCallback, useRef, type ReactNode, type MouseEvent } from 'react';
import { NodeResizer } from '@xyflow/react';
import { cn } from '@/lib/cn';

type ResizableNodeProps = {
  id?: string;
  selected?: boolean;
  children: ReactNode;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  /** Show resize handles only when node is selected (default true). */
  onlyOnSelect?: boolean;
  className?: string;
};

/**
 * Generic resizable wrapper for study nodes.
 *
 * - Shows resize handles only when the node is selected (Linear-style).
 * - Width/height changes are persisted by StudyCanvas via the
 *   `dimensions` change in onNodesChange.
 * - Double-click on the node body fits the node to its content.
 */
export function ResizableNode({
  id,
  selected,
  children,
  minWidth = 180,
  minHeight = 80,
  maxWidth,
  maxHeight,
  onlyOnSelect = true,
  className,
}: ResizableNodeProps) {
  const isVisible = onlyOnSelect ? !!selected : true;
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleDoubleClick = useCallback((e: MouseEvent) => {
    if (!id) return;
    // Don't fit-to-content when dbl-clicking inside an input/textarea or button.
    const target = e.target as HTMLElement | null;
    if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName))) return;

    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const nodeEl = wrapper.closest('.react-flow__node') as HTMLElement | null;
    if (!nodeEl) return;

    const prevW = nodeEl.style.width;
    const prevH = nodeEl.style.height;
    nodeEl.style.width = 'auto';
    nodeEl.style.height = 'auto';
    const measuredW = Math.max(minWidth, Math.ceil(nodeEl.offsetWidth));
    const measuredH = Math.max(minHeight, Math.ceil(nodeEl.offsetHeight));
    nodeEl.style.width = prevW;
    nodeEl.style.height = prevH;

    (window as any).__studyCanvasActions?.resizeNode?.(id, measuredW, measuredH);
  }, [id, minWidth, minHeight]);

  return (
    <div
      ref={wrapperRef}
      className={cn('relative w-full h-full', className)}
      onDoubleClick={handleDoubleClick}
    >
      <NodeResizer
        isVisible={isVisible}
        minWidth={minWidth}
        minHeight={minHeight}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
        lineStyle={{ borderWidth: 6, borderColor: 'transparent' }}
        lineClassName="hover:!border-accent/60 transition-colors"
        handleStyle={{ width: 12, height: 12, borderRadius: 3 }}
        handleClassName="!bg-accent !border-2 !border-bg-primary"
      />
      {children}
    </div>
  );
}
