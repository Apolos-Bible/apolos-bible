import type { ReactNode, MouseEvent } from 'react';
import { NodeToolbar, Position } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { Trash2, Copy } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useIsMobile } from '@/lib/useIsMobile';
import { useStudyStore } from '@/lib/store/useStudyStore';

/**
 * A single action shown in a node's radial contextual menu.
 *
 * `onClick` receives the originating mouse event so node-specific actions can
 * use the button as an anchor for their own popovers if needed.
 */
export type RadialAction = {
  key: string;
  icon: ReactNode;
  label: string;
  onClick: (e: MouseEvent) => void;
  /** Render with destructive (red) styling. */
  danger?: boolean;
  /** Highlight as currently active (e.g. its popover is open). */
  active?: boolean;
};

/** Read the canvas action bridge lazily — it is (re)assigned by StudyCanvas. */
const canvasActions = () =>
  (window as any).__studyCanvasActions as
    | { deleteNodes?: (ids: string[]) => void; duplicateNode?: (id: string) => void }
    | undefined;

/**
 * Slots placing buttons around the perimeter of a node, in priority order.
 * Each slot is a `NodeToolbar` anchor (side + alignment) — these render in
 * screen space (constant size, tracking pan/zoom) via React Flow's portal.
 * The bottom-right corner is intentionally left free for the resize grip.
 */
const SLOTS: { position: Position; align: 'start' | 'center' | 'end' }[] = [
  { position: Position.Top, align: 'center' }, // top-center  (primary: delete)
  { position: Position.Top, align: 'start' }, // top-left    (duplicate)
  { position: Position.Top, align: 'end' }, // top-right
  { position: Position.Right, align: 'start' }, // right-upper
  { position: Position.Left, align: 'start' }, // left-upper
  { position: Position.Right, align: 'center' }, // right-mid
  { position: Position.Left, align: 'center' }, // left-mid
  { position: Position.Bottom, align: 'start' }, // bottom-left
];

/**
 * Contextual radial menu that surrounds a selected node with touch-friendly
 * action buttons. Built so that mobile users can reach actions that were
 * previously keyboard-only (delete) or fiddly (per-type controls).
 *
 * Always provides Delete + Duplicate; node types pass `extraActions` for their
 * own controls (sticky color, verse version/AI/cross-refs, ...).
 *
 * Only renders for the single selected node and never for guests (who cannot
 * edit). Buttons stop pointer propagation so they don't drag the node or
 * deselect it through the pane.
 */
export function NodeRadialMenu({
  nodeId,
  selected,
  extraActions = [],
}: {
  nodeId: string;
  selected?: boolean;
  extraActions?: RadialAction[];
}) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const isGuest = useStudyStore((s) => s.isGuest);

  if (!selected || isGuest) return null;

  const universal: RadialAction[] = [
    {
      key: 'delete',
      icon: <Trash2 className="w-[18px] h-[18px]" />,
      label: t('study.node.delete', 'Eliminar'),
      danger: true,
      onClick: () => canvasActions()?.deleteNodes?.([nodeId]),
    },
    {
      key: 'duplicate',
      icon: <Copy className="w-[18px] h-[18px]" />,
      label: t('study.node.duplicate', 'Duplicar'),
      onClick: () => canvasActions()?.duplicateNode?.(nodeId),
    },
  ];

  const all = [...universal, ...extraActions].slice(0, SLOTS.length);

  return (
    <>
      {all.map((action, i) => {
        const slot = SLOTS[i];
        return (
          <NodeToolbar
            key={action.key}
            nodeId={nodeId}
            position={slot.position}
            align={slot.align}
            offset={14}
          >
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick(e);
              }}
              className={cn(
                'pointer-events-auto flex items-center justify-center rounded-full select-none',
                'bg-surface/95 backdrop-blur border border-border-subtle shadow-lg',
                'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors',
                isMobile ? 'w-11 h-11' : 'w-9 h-9',
                action.active && 'text-accent bg-bg-tertiary',
                action.danger &&
                  'text-fav hover:text-fav hover:bg-fav/10 border-fav/30',
              )}
              title={action.label}
              aria-label={action.label}
            >
              {action.icon}
            </button>
          </NodeToolbar>
        );
      })}
    </>
  );
}
