import { useCallback, useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { StrokeKind } from '@/lib/study/strokes';

export interface DrawSettings {
  kind: StrokeKind;
  color: string;
  size: number;
  filled: boolean;
}

interface DrawingLayerProps {
  active: boolean;
  erasing: boolean;
  paused?: boolean;
  settings: DrawSettings;
  /** Begin a new stroke at flow point. Returns the new node id. */
  beginStroke: (settings: DrawSettings, point: { x: number; y: number }) => string | null;
  /** Append a point to an in-progress stroke (pen) or update endpoint (shape). */
  extendStroke: (id: string, kind: StrokeKind, point: { x: number; y: number }) => void;
  /** Finalize a stroke: lock viewBox, commit undo step. */
  finishStroke: (id: string) => void;
  /** Erase strokes whose geometry intersects the given flow point. */
  eraseAtFlow: (point: { x: number; y: number }) => void;
}

const POINT_INTERVAL_MS = 16;

export function DrawingLayer({
  active,
  erasing,
  paused = false,
  settings,
  beginStroke,
  extendStroke,
  finishStroke,
  eraseAtFlow,
}: DrawingLayerProps) {
  const { screenToFlowPosition } = useReactFlow();

  const isDrawingRef = useRef(false);
  const activeIdRef = useRef<string | null>(null);
  const activeKindRef = useRef<StrokeKind | null>(null);
  const pendingPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastWriteAtRef = useRef(0);
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest props for stable window listeners.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const erasingRef = useRef(erasing);
  erasingRef.current = erasing;
  const beginRef = useRef(beginStroke);
  beginRef.current = beginStroke;
  const extendRef = useRef(extendStroke);
  extendRef.current = extendStroke;
  const finishRef = useRef(finishStroke);
  finishRef.current = finishStroke;
  const eraseRef = useRef(eraseAtFlow);
  eraseRef.current = eraseAtFlow;

  const flowPoint = useCallback(
    (clientX: number, clientY: number) => screenToFlowPosition({ x: clientX, y: clientY }),
    [screenToFlowPosition],
  );

  const flushPending = useCallback(() => {
    const p = pendingPointRef.current;
    const id = activeIdRef.current;
    const kind = activeKindRef.current;
    if (!p || !id || !kind) return;
    extendRef.current(id, kind, p);
    pendingPointRef.current = null;
    lastWriteAtRef.current = performance.now();
  }, []);

  const schedule = useCallback(() => {
    if (writeTimerRef.current) return;
    const elapsed = performance.now() - lastWriteAtRef.current;
    const wait = Math.max(0, POINT_INTERVAL_MS - elapsed);
    writeTimerRef.current = setTimeout(() => {
      writeTimerRef.current = null;
      flushPending();
    }, wait);
  }, [flushPending]);

  useEffect(() => {
    if (!active || paused) return;

    const isDrawableTarget = (e: PointerEvent) => {
      const path = e.composedPath();
      let onPane = false;
      for (const el of path) {
        if (!(el instanceof HTMLElement)) continue;
        const cl = el.classList;
        // Allow drawing on top of existing drawing nodes; non-drawing nodes block.
        if (cl.contains('react-flow__node') && !cl.contains('react-flow__node-drawing')) {
          return false;
        }
        if (
          cl.contains('react-flow__edge') ||
          cl.contains('react-flow__controls') ||
          cl.contains('react-flow__minimap') ||
          cl.contains('react-flow__panel') ||
          cl.contains('react-flow__resize-control')
        ) {
          return false;
        }
        if (
          cl.contains('react-flow__pane') ||
          cl.contains('react-flow__viewport') ||
          cl.contains('react-flow') ||
          cl.contains('react-flow__node-drawing')
        ) {
          onPane = true;
        }
      }
      return onPane;
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (!isDrawableTarget(e)) return;
      e.preventDefault();
      e.stopPropagation();
      isDrawingRef.current = true;
      const p = flowPoint(e.clientX, e.clientY);

      if (erasingRef.current) {
        eraseRef.current(p);
        return;
      }

      const s = settingsRef.current;
      const id = beginRef.current(s, p);
      if (!id) return;
      activeIdRef.current = id;
      activeKindRef.current = s.kind;
      lastWriteAtRef.current = performance.now();
    };

    const onMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const p = flowPoint(e.clientX, e.clientY);
      if (erasingRef.current) {
        eraseRef.current(p);
        return;
      }
      if (!activeIdRef.current) return;
      pendingPointRef.current = p;
      schedule();
    };

    const onUp = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      e.preventDefault();
      e.stopPropagation();

      if (writeTimerRef.current) {
        clearTimeout(writeTimerRef.current);
        writeTimerRef.current = null;
      }
      if (pendingPointRef.current) flushPending();

      const id = activeIdRef.current;
      activeIdRef.current = null;
      activeKindRef.current = null;
      if (id) finishRef.current(id);
    };

    window.addEventListener('pointerdown', onDown, { capture: true });
    window.addEventListener('pointermove', onMove, { capture: true });
    window.addEventListener('pointerup', onUp, { capture: true });
    window.addEventListener('pointercancel', onUp, { capture: true });

    return () => {
      window.removeEventListener('pointerdown', onDown, { capture: true } as any);
      window.removeEventListener('pointermove', onMove, { capture: true } as any);
      window.removeEventListener('pointerup', onUp, { capture: true } as any);
      window.removeEventListener('pointercancel', onUp, { capture: true } as any);
    };
  }, [active, paused, flowPoint, flushPending, schedule]);

  useEffect(() => {
    return () => {
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    };
  }, []);

  return null;
}
