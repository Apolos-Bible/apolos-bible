import { useCallback, useRef, type ReactNode, type MouseEvent } from 'react';
import { NodeResizer, NodeResizeControl } from '@xyflow/react';
import { cn } from '@/lib/cn';
import { useIsMobile } from '@/lib/useIsMobile';
import { NodeRadialMenu, type RadialAction } from './NodeRadialMenu';

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
  /** Node-type-specific actions appended to the contextual radial menu. */
  radialActions?: RadialAction[];
};

/**
 * Generic resizable wrapper for study nodes.
 *
 * - Shows resize handles only when the node is selected (Linear-style).
 * - On touch/mobile, replaces the fiddly 12px handles with a single large
 *   bottom-right grip that is comfortable to drag.
 * - Surrounds the selected node with a contextual radial menu (delete,
 *   duplicate, and any node-specific actions) so every action is reachable
 *   without a keyboard — including on mobile.
 * - Width/height changes are persisted by StudyCanvas via the `dimensions`
 *   change in onNodesChange.
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
  radialActions,
}: ResizableNodeProps) {
  const isVisible = onlyOnSelect ? !!selected : true;
  const isMobile = useIsMobile();
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
      {/* Desktop: precise handles on every edge/corner. */}
      {!isMobile && (
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
      )}

      {/* Touch: one large, easy-to-hit grip at the bottom-right corner. */}
      {isMobile && isVisible && (
        <NodeResizeControl
          nodeId={id}
          position="bottom-right"
          minWidth={minWidth}
          minHeight={minHeight}
          maxWidth={maxWidth}
          maxHeight={maxHeight}
          autoScale={false}
          className="!border-0 !bg-transparent"
          style={{ width: 30, height: 30, background: 'transparent', border: 'none' }}
        >
          <div className="pointer-events-none flex items-center justify-center w-[26px] h-[26px] translate-x-1 translate-y-1 rounded-lg bg-accent text-bg-primary shadow-md">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3.5 h-3.5">
              <path d="M13.5 6.5 6.5 13.5M13.5 11 11 13.5" />
            </svg>
          </div>
        </NodeResizeControl>
      )}

      {id && (
        <NodeRadialMenu nodeId={id} selected={selected} extraActions={radialActions} />
      )}

      {children}
    </div>
  );
}
