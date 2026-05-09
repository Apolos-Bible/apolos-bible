import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';

export function ArrowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style = {},
  data,
  selected,
}: EdgeProps) {
  const { deleteElements } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const removeEdge = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    deleteElements({ edges: [{ id }] });
  };

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: 'var(--text-muted)', strokeWidth: 1.5, ...style }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan absolute flex items-center gap-1.5"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
        >
          {data?.label != null && (
            <div className="text-2xs bg-surface border border-border rounded px-1.5 py-0.5 text-text-muted">
              {String(data.label)}
            </div>
          )}
          {selected && (
            <button
              type="button"
              onClick={removeEdge}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') removeEdge(e);
              }}
              className="flex items-center justify-center w-5 h-5 rounded-full bg-surface border border-border text-text-muted hover:text-text-primary hover:border-border-strong shadow-sm"
              aria-label="Remove edge"
              title="Remove edge"
            >
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 3l6 6M9 3l-6 6" />
              </svg>
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
