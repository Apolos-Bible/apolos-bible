import { memo } from 'react';
import { NodeResizer, type NodeProps } from '@xyflow/react';
import { cn } from '@/lib/cn';
import { buildPenPath, strokeGeometryBounds, type StrokeData } from '@/lib/study/strokes';

function StrokeShape({ data }: { data: StrokeData }) {
  const { kind, color, size, points, filled } = data;
  const common = {
    stroke: color,
    strokeWidth: size,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: filled ? color : 'none',
  };

  if (kind === 'pen') {
    if (points.length < 2) return null;
    if (points.length === 2) {
      // Single dot
      return <circle cx={points[0]} cy={points[1]} r={size / 2} fill={color} />;
    }
    return <path d={buildPenPath(points)} {...common} fill="none" />;
  }
  if (kind === 'line') {
    if (points.length < 4) return null;
    return <line x1={points[0]} y1={points[1]} x2={points[2]} y2={points[3]} {...common} fill="none" />;
  }
  if (kind === 'arrow') {
    if (points.length < 4) return null;
    const [x1, y1, x2, y2] = points;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const head = Math.max(8, size * 3);
    const ax = x2 - Math.cos(ang - Math.PI / 6) * head;
    const ay = y2 - Math.sin(ang - Math.PI / 6) * head;
    const bx = x2 - Math.cos(ang + Math.PI / 6) * head;
    const by = y2 - Math.sin(ang + Math.PI / 6) * head;
    return (
      <g {...common} fill="none">
        <line x1={x1} y1={y1} x2={x2} y2={y2} />
        <polyline points={`${ax},${ay} ${x2},${y2} ${bx},${by}`} />
      </g>
    );
  }
  if (kind === 'rect') {
    const b = strokeGeometryBounds(data);
    return <rect x={b.x} y={b.y} width={b.w} height={b.h} {...common} />;
  }
  if (kind === 'ellipse') {
    const b = strokeGeometryBounds(data);
    return <ellipse cx={b.x + b.w / 2} cy={b.y + b.h / 2} rx={b.w / 2} ry={b.h / 2} {...common} />;
  }
  return null;
}

export const DrawingNode = memo(function DrawingNode({ data, selected }: NodeProps) {
  const stroke = data as unknown as StrokeData;
  const vb = stroke.viewBox ?? { x: 0, y: 0, w: 1, h: 1 };

  return (
    <div
      className={cn(
        'relative w-full h-full rounded-sm transition-shadow',
        selected && 'ring-2 ring-accent',
      )}
    >
      <NodeResizer
        isVisible={!!selected}
        keepAspectRatio
        minWidth={20}
        minHeight={20}
        lineStyle={{ borderWidth: 6, borderColor: 'transparent' }}
        lineClassName="hover:!border-accent/60 transition-colors"
        handleStyle={{ width: 10, height: 10, borderRadius: 3 }}
        handleClassName="!bg-accent !border-2 !border-bg-primary"
      />
      <svg
        width="100%"
        height="100%"
        viewBox={`${vb.x} ${vb.y} ${Math.max(1, vb.w)} ${Math.max(1, vb.h)}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ overflow: 'visible', pointerEvents: 'none' }}
      >
        <StrokeShape data={stroke} />
      </svg>
    </div>
  );
});
