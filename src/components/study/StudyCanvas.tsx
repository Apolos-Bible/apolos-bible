import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  BackgroundVariant,
  ConnectionMode,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type OnNodeDrag,
  type OnSelectionChangeFunc,
  useStore,
  useStoreApi,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import * as Y from 'yjs';
import { useStudyStore } from '@/lib/store/useStudyStore';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useUIStore } from '@/lib/store/useUIStore';
import { useVerseStore } from '@/lib/store/useVerseStore';
import { useIsMobile } from '@/lib/useIsMobile';
import {
  getNodesMap,
  getEdgesMap,
  nodeFromYMap,
  edgeFromYMap,
  deleteCanvasNodes,
  filterVersesMissingFromCanvas,
  resizeCanvasNode,
  writeNodeToMap,
  writeEdgeToMap,
} from '@/lib/study/yDocHelpers';
import { findFreeSpot, findFreeSpotForStack, type Rect as PlacementRect } from '@/lib/study/canvasPlacement';
import { pointsBounds, strokeHit, type StrokeData, type StrokeKind } from '@/lib/study/strokes';
import { StudyDocContext } from '@/lib/study/StudyDocContext';
import { hasVerseDrag, readVerseDrag, endVerseDrag } from '@/lib/study/verseDrag';
import { studyNodeTypes } from './nodes';
import type { FileNodeData } from './nodes/FileNode';
import { studyEdgeTypes } from './edges';
import { RemoteCursors } from './cursor/RemoteCursors';
import { DrawingLayer, type DrawSettings } from './DrawingLayer';
import type { Tool } from './StudyMode';
import type { AwarenessUser } from '@/hooks/useStudySession';

const POSITION_SYNC_INTERVAL_MS = 50;
const REMOTE_POSITION_ANIMATION_MS = 80;

interface StudyCanvasProps {
  tool: Tool;
  biblePanelOpen: boolean;
  doc: Y.Doc | null;
  connected: boolean;
  synced: boolean;
  reconnectKey: number;
  users: AwarenessUser[];
  setLocalCursor: (x: number, y: number) => void;
  setLocalSelection: (nodeIds: string[]) => void;
  setLocalDragging: (dragging: boolean) => void;
  isGuest: boolean;
  loginRequired?: boolean;
  drawSettings: DrawSettings;
  spaceHeld: boolean;
  /**
   * Width in px of a panel docked to the right edge (the guided study
   * walkthrough), so overlays anchored there — the minimap — slide out of
   * its way instead of hiding behind it.
   */
  rightInset?: number;
}

function stripEphemeralNodeData(data: any) {
  if (!data || typeof data !== 'object') return data ?? {};

  const { _dimensions, ...rest } = data;
  return rest;
}

function getCanvasSnapshotSignature(nodes: Node[], edges: Edge[]) {
  return JSON.stringify({
    nodes: nodes
      .map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        width: (node as any).width,
        height: (node as any).height,
        data: stripEphemeralNodeData(node.data),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    edges: edges
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        data: edge.data ?? {},
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
}

type Rect = { x: number; y: number; w: number; h: number };

/**
 * Pick the handle ids for source and target so the edge takes the shortest
 * visual path: each end exits through the side of its node that faces the
 * other node's center.
 */
function pickHandlesByGeometry(source: Rect, target: Rect): {
  sourceHandle: 'top' | 'right' | 'bottom' | 'left';
  targetHandle: 'top' | 'right' | 'bottom' | 'left';
} {
  const scx = source.x + source.w / 2;
  const scy = source.y + source.h / 2;
  const tcx = target.x + target.w / 2;
  const tcy = target.y + target.h / 2;
  const dx = tcx - scx;
  const dy = tcy - scy;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: 'right', targetHandle: 'left' }
      : { sourceHandle: 'left', targetHandle: 'right' };
  }
  return dy >= 0
    ? { sourceHandle: 'bottom', targetHandle: 'top' }
    : { sourceHandle: 'top', targetHandle: 'bottom' };
}

// Header row + padding is ~52px; each wrapped line of body text is ~22px.
// At this width/font-size a line fits roughly 48 characters.
function heightForVerseText(text: string) {
  const lines = Math.max(1, Math.ceil(text.length / 48));
  return Math.min(320, Math.max(90, 52 + lines * 22));
}

// Sticky notes get the same treatment as verses: a note created with text
// already in it (pinned from the guided study) opens tall enough to read
// instead of hiding its content behind a scrollbar.
const STICKY_WIDTH = 240;

/**
 * Rough sizes for node types that do not store their own, used only to keep new
 * nodes from landing on top of them.
 */
const NODE_FALLBACK_SIZE: Record<string, { width: number; height: number }> = {
  sticky: { width: STICKY_WIDTH, height: 120 },
  verse: { width: 320, height: 110 },
  passage: { width: 400, height: 180 },
  'ai-note': { width: 300, height: 180 },
  file: { width: 420, height: 300 },
};

/**
 * What is already on the canvas, as rectangles. Drawing nodes are 1x1 markers
 * for their strokes, so they are not something to avoid.
 */
function obstaclesFrom(
  nodes: { type?: string; position: { x: number; y: number }; width?: number; height?: number }[],
): PlacementRect[] {
  return nodes
    .filter((n) => n.type !== 'drawing')
    .map((n) => {
      const fallback = NODE_FALLBACK_SIZE[n.type ?? 'sticky'] ?? { width: 300, height: 120 };
      return {
        x: n.position.x,
        y: n.position.y,
        width: typeof n.width === 'number' && n.width > 8 ? n.width : fallback.width,
        height: typeof n.height === 'number' && n.height > 8 ? n.height : fallback.height,
      };
    });
}
// Body is `text-sm` with `leading-relaxed` inside px-3 padding: ~30 characters
// per line at this width, ~23px per line.
const STICKY_CHARS_PER_LINE = 30;

function heightForStickyText(text: string) {
  const lines = text
    .split('\n')
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / STICKY_CHARS_PER_LINE)), 0);
  // 16px drag bar + 16px vertical padding, then a line at a time.
  return Math.min(420, Math.max(120, 32 + lines * 23));
}

function parseChapterAnchor(anchorRef: string) {
  const match = anchorRef.match(/^(.+)-(\d+)$/);
  if (!match) return null;

  return {
    bookSlug: match[1],
    chapter: Number(match[2]),
  };
}

function parseVerseAnchor(anchorRef: string) {
  // bookSlug-chapter-verseStart[:verseEnd]
  const match = anchorRef.match(/^(.+)-(\d+)-(\d+)(?::(\d+))?$/);
  if (!match) return null;
  const verseStart = Number(match[3]);
  const verseEnd = match[4] ? Number(match[4]) : verseStart;
  return {
    bookSlug: match[1],
    chapter: Number(match[2]),
    verseStart,
    verseEnd,
  };
}

function StudyCanvasInner({
  tool,
  biblePanelOpen,
  doc,
  connected,
  synced,
  reconnectKey,
  users,
  setLocalCursor,
  setLocalSelection,
  setLocalDragging,
  isGuest,
  loginRequired = isGuest,
  drawSettings,
  spaceHeld,
  rightInset = 0,
}: StudyCanvasProps) {
  const activeSession = useStudyStore((s) => s.activeSession);
  const isMobile = useIsMobile();
  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow();
  const isInteractive = useStore((s) => s.nodesDraggable || s.nodesConnectable || s.elementsSelectable);
  const rfStore = useStoreApi();
  const openAuthModal = useUIStore((s) => s.openAuthModal);

  const toggleLock = useCallback(() => {
    const s = rfStore.getState();
    const val = !(s.nodesDraggable || s.nodesConnectable || s.elementsSelectable);
    rfStore.setState({ nodesDraggable: val, nodesConnectable: val, elementsSelectable: val });
  }, [rfStore]);
  const user = useAuthStore((s) => s.user);
  const versionId = useVerseStore((s) => s.versionId);

  // Ensure the Bible versions list is loaded so verse-node version switching
  // and other version-aware UIs have something to render.
  useEffect(() => {
    const { versions, loadVersions } = useVerseStore.getState();
    if (versions.length === 0) {
      loadVersions().catch(() => {});
    }
  }, []);

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const remoteSelectionSignature = users
    .filter((remoteUser) => String(remoteUser.id) !== String(user?.id))
    .map((remoteUser) => ({
      id: remoteUser.id,
      color: remoteUser.color,
      selectedNodeIds: remoteUser.selectedNodeIds ?? [],
    }))
    .filter((remoteUser) => remoteUser.selectedNodeIds.length > 0)
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((remoteUser) => `${remoteUser.id}:${remoteUser.color}:${[...remoteUser.selectedNodeIds].sort().join(',')}`)
    .join('|');

  const nodesForRender = useMemo(() => {
    const remoteSelectionColorByNode = new Map<string, string>();

    if (!remoteSelectionSignature) return nodes;

    remoteSelectionSignature.split('|').forEach((entry) => {
      const [, color, selectedIds] = entry.split(':');
      selectedIds.split(',').forEach((nodeId) => {
        if (!nodeId) return;
        if (!remoteSelectionColorByNode.has(nodeId)) {
          remoteSelectionColorByNode.set(nodeId, color);
        }
      });
    });

    return nodes.map((node) => {
      const remoteColor = remoteSelectionColorByNode.get(node.id);
      if (!remoteColor) return node;

      return {
        ...node,
        style: {
          ...node.style,
          outline: `2px solid ${remoteColor}`,
          outlineOffset: 3,
          boxShadow: `0 0 0 5px ${remoteColor}22`,
        },
      };
    });
  }, [nodes, remoteSelectionSignature]);

  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const yjsSnapshotSignatureRef = useRef('');
  const pendingPositionWritesRef = useRef(new Map<string, { x: number; y: number }>());
  const positionWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayedNodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const remoteAnimationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    displayedNodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Keep the latest doc available to stable React Flow callbacks.
  const docRef = useRef(doc);
  docRef.current = doc;

  const cancelRemotePositionAnimation = useCallback(() => {
    if (remoteAnimationFrameRef.current != null) {
      cancelAnimationFrame(remoteAnimationFrameRef.current);
      remoteAnimationFrameRef.current = null;
    }
  }, []);

  const applyRemoteSnapshot = useCallback((nextNodes: Node[], nextEdges: Edge[]) => {
    setEdges(nextEdges);

    const previousNodes = displayedNodesRef.current;
    if (previousNodes.length === 0) {
      cancelRemotePositionAnimation();
      displayedNodesRef.current = nextNodes;
      setNodes(nextNodes);
      return;
    }

    const previousById = new Map(previousNodes.map((node) => [node.id, node]));
    const startPositions = new Map<string, { x: number; y: number }>();

    nextNodes.forEach((node) => {
      const previous = previousById.get(node.id);
      if (!previous) return;

      if (previous.position.x !== node.position.x || previous.position.y !== node.position.y) {
        startPositions.set(node.id, previous.position);
      }
    });

    if (startPositions.size === 0) {
      cancelRemotePositionAnimation();
      displayedNodesRef.current = nextNodes;
      setNodes(nextNodes);
      return;
    }

    cancelRemotePositionAnimation();

    const startedAt = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / REMOTE_POSITION_ANIMATION_MS);
      const eased = 1 - Math.pow(1 - progress, 3);

      const frameNodes = nextNodes.map((node) => {
        const start = startPositions.get(node.id);
        if (!start) return node;

        return {
          ...node,
          position: {
            x: start.x + (node.position.x - start.x) * eased,
            y: start.y + (node.position.y - start.y) * eased,
          },
        };
      });

      displayedNodesRef.current = frameNodes;
      setNodes(frameNodes);

      if (progress < 1) {
        remoteAnimationFrameRef.current = requestAnimationFrame(step);
      } else {
        remoteAnimationFrameRef.current = null;
        displayedNodesRef.current = nextNodes;
        setNodes(nextNodes);
      }
    };

    remoteAnimationFrameRef.current = requestAnimationFrame(step);
  }, [cancelRemotePositionAnimation]);

  const flushPendingPositionWrites = useCallback(() => {
    if (isGuest) return;
    const d = docRef.current;
    if (!d || pendingPositionWritesRef.current.size === 0) return;

    const pendingPositions = new Map(pendingPositionWritesRef.current);
    pendingPositionWritesRef.current.clear();

    if (positionWriteTimerRef.current) {
      clearTimeout(positionWriteTimerRef.current);
      positionWriteTimerRef.current = null;
    }

    d.transact(() => {
      const nodesMap = getNodesMap(d);

      pendingPositions.forEach((position, nodeId) => {
        const existing = nodesMap.get(nodeId);
        if (existing) {
          existing.set('position', { x: position.x, y: position.y });
        }
      });
    }, 'local');
  }, [isGuest]);

  const schedulePositionWrite = useCallback((nodeId: string, position: { x: number; y: number }) => {
    if (isGuest) return;
    pendingPositionWritesRef.current.set(nodeId, position);

    if (positionWriteTimerRef.current) return;

    positionWriteTimerRef.current = setTimeout(() => {
      positionWriteTimerRef.current = null;
      flushPendingPositionWrites();
    }, POSITION_SYNC_INTERVAL_MS);
  }, [flushPendingPositionWrites, isGuest]);

  useEffect(() => {
    return () => {
      if (positionWriteTimerRef.current) {
        clearTimeout(positionWriteTimerRef.current);
      }
      cancelRemotePositionAnimation();
    };
  }, [cancelRemotePositionAnimation]);

  // --- Yjs sync: Yjs → React state ---
  useEffect(() => {
    if (!doc) return;

    const nodesMap = getNodesMap(doc);
    const edgesMap = getEdgesMap(doc);
    if (!isGuest) {
      undoManagerRef.current = new Y.UndoManager([nodesMap, edgesMap], {
        trackedOrigins: new Set([null, 'local']),
      });
    }

    const syncFromYjs = (_events: any[], transaction: any) => {
      const currentNodes: Node[] = [];
      nodesMap.forEach((nodeMap, id) => {
        const node = nodeFromYMap(id, nodeMap);
        currentNodes.push({
          ...node,
          data: stripEphemeralNodeData(node.data),
        });
      });

      const currentEdges: Edge[] = [];
      edgesMap.forEach((edgeMap, id) => {
        currentEdges.push(edgeFromYMap(id, edgeMap));
      });

      const signature = getCanvasSnapshotSignature(currentNodes, currentEdges);

      // Local writes: React state is already up to date via onNodesChange.
      // Just keep the signature ref fresh so a later undo (origin=UndoManager)
      // sees a real diff and triggers applyRemoteSnapshot.
      if (transaction?.origin === 'local') {
        yjsSnapshotSignatureRef.current = signature;
        return;
      }

      if (signature === yjsSnapshotSignatureRef.current) return;

      yjsSnapshotSignatureRef.current = signature;
      applyRemoteSnapshot(currentNodes, currentEdges);
    };

    console.debug('[sync] doc ready, nodes:', nodesMap.size, 'edges:', edgesMap.size);

    nodesMap.observeDeep(syncFromYjs);
    edgesMap.observeDeep(syncFromYjs);

    syncFromYjs(); // initial load

    return () => {
      nodesMap.unobserveDeep(syncFromYjs);
      edgesMap.unobserveDeep(syncFromYjs);
      undoManagerRef.current?.destroy();
      undoManagerRef.current = null;
    };
  }, [applyRemoteSnapshot, doc, reconnectKey]);

  // --- Auto-start: create initial nodes for verse/chapter sessions ---
  useEffect(() => {
    if (!doc || !activeSession || !user || isGuest) return;
    if (activeSession.type === 'free') return;
    if (!activeSession.anchor_ref) return;
    // Wait for the Y.Doc to finish syncing from the server before deciding the
    // canvas is empty — otherwise we re-seed the verses every visit because
    // the local map starts empty until the snapshot arrives.
    if (!synced) return;

    const isHost = activeSession.host_user_id === Number(user.id);
    if (!isHost) return;

    const nodesMap = getNodesMap(doc);
    const edgesMap = getEdgesMap(doc);
    if (nodesMap.size > 0) return; // already has content

    let cancelled = false;

    const seed = async () => {
      const { bibleApi } = await import('@/lib/bibleApi');
      const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

      let verseList: { verseId: number; reference: string; version_id: number; text: string }[] = [];
      let bookName = '';

      if (activeSession.type === 'chapter') {
        const anchor = parseChapterAnchor(activeSession.anchor_ref!);
        if (!anchor) return;
        try {
          const data = await bibleApi.chapter(versionId, anchor.bookSlug, anchor.chapter);
          if (cancelled) return;
          bookName = data.book.name;
          verseList = data.verses.map(v => ({
            verseId: v.id,
            reference: `${bookName} ${anchor.chapter}:${v.number}`,
            version_id: versionId,
            text: v.text,
          }));
        } catch (e) {
          console.error('[seed] chapter fetch failed', e);
          return;
        }
      } else if (activeSession.type === 'verse') {
        const anchor = parseVerseAnchor(activeSession.anchor_ref!);
        if (!anchor) return;
        try {
          const data = await bibleApi.chapter(versionId, anchor.bookSlug, anchor.chapter);
          if (cancelled) return;
          bookName = data.book.name;
          const start = Math.max(1, anchor.verseStart);
          const end = Math.min(data.verses.length, Math.max(start, anchor.verseEnd));
          verseList = data.verses
            .filter(v => v.number >= start && v.number <= end)
            .map(v => ({
              verseId: v.id,
              reference: `${bookName} ${anchor.chapter}:${v.number}`,
              version_id: versionId,
              text: v.text,
            }));
        } catch (e) {
          console.error('[seed] verse fetch failed', e);
          return;
        }
      }

      if (cancelled || verseList.length === 0) return;
      // Race guard: another client may have seeded between dispatch and now.
      if (nodesMap.size > 0) return;

      const nodeW = 320;
      const gap = 40;
      const baseTs = Date.now();

      if (verseList.length === 1) {
        const v = verseList[0];
        const nodeH = heightForVerseText(v.text);
        const id = `verse-auto-${baseTs}`;
        doc.transact(() => {
          writeNodeToMap(nodesMap, {
            id,
            type: 'verse',
            position: { x: center.x - nodeW / 2, y: center.y - nodeH / 2 },
            width: nodeW,
            height: nodeH,
            data: v,
          });
        });
      } else {
        const heights = verseList.map((v) => heightForVerseText(v.text));
        const startX = center.x - nodeW / 2;
        const totalH = heights.reduce((sum, h) => sum + h, 0) + (verseList.length - 1) * gap;
        const startY = center.y - totalH / 2;
        const ids: string[] = [];
        doc.transact(() => {
          let y = startY;
          verseList.forEach((v, i) => {
            const nodeH = heights[i];
            const id = `verse-auto-${baseTs}-${i}`;
            ids.push(id);
            writeNodeToMap(nodesMap, {
              id,
              type: 'verse',
              position: { x: startX, y },
              width: nodeW,
              height: nodeH,
              data: v,
            });
            y += nodeH + gap;
            if (i > 0) {
              const prev = ids[i - 1];
              writeEdgeToMap(edgesMap, {
                id: `chain-${prev}-${id}`,
                source: prev,
                target: id,
                sourceHandle: 'bottom',
                targetHandle: 'top',
                type: 'default',
                data: { kind: 'chain' },
              });
            }
          });
        });
      }
    };

    void seed();
    return () => { cancelled = true; };
  }, [doc, synced, activeSession, user, versionId, screenToFlowPosition, isGuest]);

  // --- React Flow changes → Yjs ---
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const d = docRef.current;
      if (!d) {
        setNodes((nds) => applyNodeChanges(changes, nds));
        return;
      }

      if (isGuest) return;

      if (changes.some((change) => change.type === 'position')) {
        cancelRemotePositionAnimation();
      }

      d.transact(() => {
        const nodesMap = getNodesMap(d);

        for (const change of changes) {
          if (change.type === 'position' && change.position) {
            schedulePositionWrite(change.id, { x: change.position.x, y: change.position.y });
          } else if (change.type === 'dimensions' && change.dimensions && change.resizing === false) {
            const existing = nodesMap.get(change.id);
            if (existing) {
              existing.set('width', Math.round(change.dimensions.width));
              existing.set('height', Math.round(change.dimensions.height));
            }
          } else if (change.type === 'remove') {
            pendingPositionWritesRef.current.delete(change.id);
            nodesMap.delete(change.id);
          }
        }
      }, 'local');

      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [cancelRemotePositionAnimation, schedulePositionWrite, isGuest],
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const d = docRef.current;
      if (!d) {
        setEdges((eds) => applyEdgeChanges(changes, eds));
        return;
      }

      if (isGuest) return;

      d.transact(() => {
        const edgesMap = getEdgesMap(d);
        for (const change of changes) {
          if (change.type === 'remove') {
            edgesMap.delete(change.id);
          }
        }
      }, 'local');

      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [isGuest],
  );

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      if (isGuest) return;
      const d = docRef.current;
      if (!d || !connection.source || !connection.target) return;

      const id = `edge-${connection.source}-${connection.target}-${Date.now()}`;

      d.transact(() => {
        const edgesMap = getEdgesMap(d);
        writeEdgeToMap(edgesMap, {
          id,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        });
      }, 'local');

      // Update React state immediately (observer filters out 'local' origin)
      setEdges((eds) => [
        ...eds,
        {
          id,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle ?? undefined,
          targetHandle: connection.targetHandle ?? undefined,
          type: 'default',
        },
      ]);
    },
    [isGuest],
  );

  // --- Canvas actions (accessed by toolbar) ---
  // These use docRef.current so they always have the latest doc
  // Center of the visible canvas area, in flow coordinates.
  // Accounts for the BiblePanel overlay (left side, w-panel = 420px) so newly
  // inserted nodes land in the part of the canvas the user can actually see.
  const getVisibleCenterFlow = useCallback(() => {
    const panelOffset = biblePanelOpen ? 420 : 0;
    const screenX = panelOffset + (window.innerWidth - panelOffset) / 2;
    const screenY = window.innerHeight / 2;
    return screenToFlowPosition({ x: screenX, y: screenY });
  }, [screenToFlowPosition, biblePanelOpen]);

  const addStickyNote = useCallback((pos?: { x: number; y: number }, text?: string) => {
    if (isGuest) return;
    const d = docRef.current;
    if (!d) return;
    const id = `sticky-${Date.now()}`;
    const height = heightForStickyText(text ?? '');
    let position = pos;
    if (!position) {
      const center = getVisibleCenterFlow();
      position = { x: center.x - STICKY_WIDTH / 2, y: center.y - height / 2 };
    }
    // Never bury what is already there: slide to the nearest free spot.
    position = findFreeSpot(
      { ...position, width: STICKY_WIDTH, height },
      obstaclesFrom(displayedNodesRef.current),
    );
    d.transact(() => {
      const nodesMap = getNodesMap(d);
      writeNodeToMap(nodesMap, {
        id,
        type: 'sticky',
        position,
        width: STICKY_WIDTH,
        height,
        data: { text: text ?? '', color: 'yellow' },
      });
    });
  }, [isGuest, getVisibleCenterFlow]);

  const addVerseNode = useCallback((data: { verseId: number; reference: string; version_id: number; text?: string }, at?: { x: number; y: number }) => {
    if (isGuest) return;
    const d = docRef.current;
    if (!d) return;
    const id = `verse-${data.verseId}-${Date.now()}`;
    const center = at ?? getVisibleCenterFlow();
    const position = findFreeSpot(
      { x: center.x - 150, y: center.y - 40, width: 320, height: 110 },
      obstaclesFrom(displayedNodesRef.current),
    );
    d.transact(() => {
      const nodesMap = getNodesMap(d);
      writeNodeToMap(nodesMap, { id, type: 'verse', position, data });
    });
  }, [getVisibleCenterFlow, isGuest]);

  const addPassageNode = useCallback((data: { bookSlug: string; chapter: number; startVerse?: number; endVerse?: number; reference: string; version_id: number; verses: { verseId: number; reference: string; verse: number; text: string }[] }) => {
    if (isGuest) return;
    const d = docRef.current;
    if (!d) return;
    const id = `passage-${Date.now()}`;
    const center = getVisibleCenterFlow();
    const position = findFreeSpot(
      { x: center.x - 200, y: center.y - 60, width: 400, height: 180 },
      obstaclesFrom(displayedNodesRef.current),
    );
    d.transact(() => {
      const nodesMap = getNodesMap(d);
      writeNodeToMap(nodesMap, { id, type: 'passage', position, data });
    });
  }, [getVisibleCenterFlow, isGuest]);

  const addFileNodes = useCallback((items: FileNodeData[]) => {
    if (isGuest) return;
    const d = docRef.current;
    if (!d || items.length === 0) return;

    const center = getVisibleCenterFlow();
    const occupied = obstaclesFrom(displayedNodesRef.current);
    const placements = items.map((data, index) => {
      const isLink = data.kind === 'link';
      const isPdf = data.mimeType === 'application/pdf';
      const isImage = data.mimeType.startsWith('image/');
      const width = isLink ? 560 : isPdf ? 480 : isImage ? 420 : 320;
      const height = isLink ? 400 : isPdf ? 560 : isImage ? 300 : 140;
      const position = findFreeSpot(
        { x: center.x - width / 2, y: center.y - height / 2, width, height },
        occupied,
      );
      occupied.push({ ...position, width, height });

      return { id: `file-${data.fileId}-${Date.now()}-${index}`, data, position, width, height };
    });

    d.transact(() => {
      const nodesMap = getNodesMap(d);
      placements.forEach(({ id, data, position, width, height }) => {
        writeNodeToMap(nodesMap, { id, type: 'file', position, width, height, data });
      });
    });
    undoManagerRef.current?.stopCapturing();
  }, [getVisibleCenterFlow, isGuest]);

  const addFileNode = useCallback((data: FileNodeData) => addFileNodes([data]), [addFileNodes]);

  // Insert a sequence of verses as individual verse nodes stacked vertically
  // and connected bottom→top, so multi-verse selections become a chain rather
  // than a single passage block.
  const addVerseChain = useCallback((
    verses: { verseId: number; reference: string; version_id: number; text: string }[],
    at?: { x: number; y: number },
    options?: {
      dedupe?: boolean;
      idPrefix?: string;
      data?: Record<string, unknown>;
    },
  ) => {
    if (isGuest) return;
    if (!verses || verses.length === 0) return;
    const d = docRef.current;
    if (!d) return;
    const versesToInsert = options?.dedupe
      ? filterVersesMissingFromCanvas(d, verses)
      : verses;
    if (versesToInsert.length === 0) return;
    const nodeW = 320;
    const gap = 40;
    const heights = versesToInsert.map((v) => heightForVerseText(v.text));
    const baseTs = Date.now();
    const totalH = heights.reduce((sum, h) => sum + h, 0) + (versesToInsert.length - 1) * gap;
    // A drop positions the chain's top-left under the pointer; a toolbar insert
    // centres it in the visible canvas.
    const anchor = at ?? getVisibleCenterFlow();
    // The chain is placed as one block, so look for room for the whole column
    // rather than for its first verse.
    const spot = findFreeSpotForStack(
      {
        x: at ? anchor.x : anchor.x - nodeW / 2,
        y: at ? anchor.y : anchor.y - totalH / 2,
        width: nodeW,
      },
      heights,
      gap,
      obstaclesFrom(displayedNodesRef.current),
    );
    const startX = spot.x;
    const startY = spot.y;
    d.transact(() => {
      const nodesMap = getNodesMap(d);
      const edgesMap = getEdgesMap(d);
      const ids: string[] = [];
      let y = startY;
      versesToInsert.forEach((v, i) => {
        // Guided insertions use stable ids. If two synced participants claim
        // the same step concurrently, Yjs merges these keys instead of leaving
        // two timestamped copies of every verse on the canvas.
        const id = options?.idPrefix
          ? `${options.idPrefix}-verse-${v.version_id}-${v.verseId}`
          : `verse-${v.verseId}-${baseTs}-${i}`;
        ids.push(id);
        const nodeH = heights[i];
        const position = { x: startX, y };
        writeNodeToMap(nodesMap, {
          id,
          type: 'verse',
          position,
          width: nodeW,
          height: nodeH,
          data: options?.data ? { ...v, ...options.data } : v,
        });
        y += nodeH + gap;
        if (i > 0) {
          const prev = ids[i - 1];
          writeEdgeToMap(edgesMap, {
            id: `chain-${prev}-${id}`,
            source: prev,
            target: id,
            sourceHandle: 'bottom',
            targetHandle: 'top',
            type: 'default',
            data: { kind: 'chain' },
          });
        }
      });
    });
    undoManagerRef.current?.stopCapturing();
  }, [getVisibleCenterFlow, isGuest]);

  const undo = useCallback(() => {
    if (isGuest) return;
    undoManagerRef.current?.undo();
  }, [isGuest]);

  const redo = useCallback(() => {
    if (isGuest) return;
    undoManagerRef.current?.redo();
  }, [isGuest]);

  const resizeNode = useCallback((id: string, width: number, height: number) => {
    if (isGuest) return;
    const d = docRef.current;
    if (!d) return;
    const w = Math.round(width);
    const h = Math.round(height);
    if (!resizeCanvasNode(d, id, w, h)) return;
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, width: w, height: h } : n)));
    undoManagerRef.current?.stopCapturing();
  }, [isGuest]);

  // Programmatic node deletion (touch contextual menu). Mirrors the keyboard
  // delete path: removes the node(s) and any connected edges from the Y.Doc so
  // collaborators stay in sync, then updates local React Flow state.
  const deleteNodes = useCallback((ids: string[]) => {
    if (isGuest || ids.length === 0) return;
    const d = docRef.current;
    if (!d) return;
    const idSet = new Set(ids);
    const edgeIdsToDelete = deleteCanvasNodes(d, idSet);
    const edgeIdSet = new Set(edgeIdsToDelete);
    ids.forEach((id) => pendingPositionWritesRef.current.delete(id));
    setNodes((nds) => nds.filter((n) => !idSet.has(n.id)));
    if (edgeIdSet.size) setEdges((eds) => eds.filter((e) => !edgeIdSet.has(e.id)));
    undoManagerRef.current?.stopCapturing();
  }, [isGuest]);

  // Duplicate a node in place (offset slightly). Connected edges are not
  // copied — only the node, its type, dimensions and (deep-cloned) data.
  const duplicateNode = useCallback((id: string) => {
    if (isGuest) return;
    const d = docRef.current;
    if (!d) return;
    const src = displayedNodesRef.current.find((n) => n.id === id);
    if (!src || !src.type) return;

    const newId = `${src.type}-dup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const position = { x: src.position.x + 28, y: src.position.y + 28 };
    const width = (src as any).width;
    const height = (src as any).height;
    let data: unknown;
    try {
      data = JSON.parse(JSON.stringify(src.data ?? {}));
    } catch {
      data = { ...(src.data as object) };
    }

    d.transact(() => {
      const nodesMap = getNodesMap(d);
      writeNodeToMap(nodesMap, { id: newId, type: src.type as string, position, width, height, data: data as any });
    }, 'local');
    setNodes((nds) => [
      ...nds,
      { id: newId, type: src.type, position, width, height, data } as unknown as Node,
    ]);
    undoManagerRef.current?.stopCapturing();
  }, [isGuest]);

  // Cross references: insert a verse node positioned around the source and
  // connect it with an edge tagged 'xref'.
  const addCrossRefNode = useCallback((
    sourceNodeId: string,
    ref: { id: number; book: string; slug: string; chapter: number; verse: number; text: string },
    version_id: number,
  ) => {
    if (isGuest) return;
    const d = docRef.current;
    if (!d) return;

    const source = displayedNodesRef.current.find((n) => n.id === sourceNodeId);
    if (!source) return;

    const newNodeId = `verse-${ref.id}-${Date.now()}`;
    const edgeId = `xref-${sourceNodeId}-${newNodeId}`;

    // Avoid duplicate verse for this source.
    const alreadyHas = displayedNodesRef.current.some((n) => {
      const data: any = n.data;
      return data?.verseId === ref.id && edgesRef.current.some(
        (e) => e.source === sourceNodeId && e.target === n.id,
      );
    });
    if (alreadyHas) return;

    const sw = (source as any).width ?? 260;
    const sh = (source as any).height ?? 100;
    const cx = source.position.x + sw / 2;
    const cy = source.position.y + sh / 2;
    const xrefCount = edgesRef.current.filter(
      (e) => e.source === sourceNodeId && e.id.startsWith('xref-'),
    ).length;
    const angle = -Math.PI / 4 + xrefCount * (Math.PI / 7);
    const distance = 340;
    const nodeW = 280;
    const nodeH = 110;
    // The fan spreads by count already; this keeps it off whatever else is out
    // there, including nodes other people added.
    const position = findFreeSpot(
      {
        x: cx + Math.cos(angle) * distance - nodeW / 2,
        y: cy + Math.sin(angle) * distance - nodeH / 2,
        width: nodeW,
        height: nodeH,
      },
      obstaclesFrom(displayedNodesRef.current),
    );

    const handles = pickHandlesByGeometry(
      { x: source.position.x, y: source.position.y, w: sw, h: sh },
      { x: position.x, y: position.y, w: nodeW, h: nodeH },
    );

    d.transact(() => {
      const nodesMap = getNodesMap(d);
      const edgesMap = getEdgesMap(d);
      writeNodeToMap(nodesMap, {
        id: newNodeId,
        type: 'verse',
        position,
        width: nodeW,
        height: nodeH,
        data: {
          verseId: ref.id,
          reference: `${ref.book} ${ref.chapter}:${ref.verse}`,
          version_id,
          text: ref.text,
        },
      });
      writeEdgeToMap(edgesMap, {
        id: edgeId,
        source: sourceNodeId,
        target: newNodeId,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        type: 'default',
        data: { kind: 'xref' },
      });
    });
    undoManagerRef.current?.stopCapturing();
  }, [isGuest]);

  // Switch the Bible version of an existing verse node in place. Looks up the
  // equivalent verse (same canonical book + chapter + verse number) and
  // updates the node's data via Y.Doc so collaborators see the change.
  const setVerseNodeVersion = useCallback(async (
    nodeId: string,
    versionId: number,
  ) => {
    if (isGuest) return;
    const d = docRef.current;
    if (!d) return;

    const node = displayedNodesRef.current.find((n) => n.id === nodeId);
    if (!node || node.type !== 'verse') return;
    const currentVerseId = (node.data as any)?.verseId;
    if (!currentVerseId) return;

    const { bibleApi } = await import('@/lib/bibleApi');
    const result = await bibleApi.verseInVersion(currentVerseId, versionId);

    d.transact(() => {
      const nodesMap = getNodesMap(d);
      const m = nodesMap.get(nodeId);
      if (!m) return;
      m.set('data', {
        verseId: result.id,
        reference: result.reference,
        version_id: result.version_id,
        text: result.text,
      });
    }, 'local');

    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                verseId: result.id,
                reference: result.reference,
                version_id: result.version_id,
                text: result.text,
              },
            }
          : n,
      ),
    );
  }, [isGuest]);

  // AI notes: insert an ai-note node positioned around the source and connect
  // it with an edge tagged 'ai'.
  const addAiNoteNode = useCallback((
    sourceNodeId: string,
    payload: { question: string; answer: string; reference?: string },
  ) => {
    if (isGuest) return;
    const d = docRef.current;
    if (!d) return;

    const source = displayedNodesRef.current.find((n) => n.id === sourceNodeId);
    if (!source) return;

    const newNodeId = `ai-${Date.now()}`;
    const edgeId = `ai-${sourceNodeId}-${newNodeId}`;

    const sw = (source as any).width ?? 260;
    const sh = (source as any).height ?? 100;
    const cx = source.position.x + sw / 2;
    const cy = source.position.y + sh / 2;
    const aiCount = edgesRef.current.filter(
      (e) => e.source === sourceNodeId && e.id.startsWith('ai-'),
    ).length;
    const angle = Math.PI / 4 + aiCount * (Math.PI / 7);
    const distance = 340;
    const nodeW = 300;
    const nodeH = 180;
    const position = findFreeSpot(
      {
        x: cx + Math.cos(angle) * distance - nodeW / 2,
        y: cy + Math.sin(angle) * distance - nodeH / 2,
        width: nodeW,
        height: nodeH,
      },
      obstaclesFrom(displayedNodesRef.current),
    );

    const handles = pickHandlesByGeometry(
      { x: source.position.x, y: source.position.y, w: sw, h: sh },
      { x: position.x, y: position.y, w: nodeW, h: nodeH },
    );

    d.transact(() => {
      const nodesMap = getNodesMap(d);
      const edgesMap = getEdgesMap(d);
      writeNodeToMap(nodesMap, {
        id: newNodeId,
        type: 'ai-note',
        position,
        width: nodeW,
        height: nodeH,
        data: {
          question: payload.question,
          answer: payload.answer,
          sourceReference: payload.reference,
        },
      });
      writeEdgeToMap(edgesMap, {
        id: edgeId,
        source: sourceNodeId,
        target: newNodeId,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        type: 'default',
        data: { kind: 'ai' },
      });
    });
    undoManagerRef.current?.stopCapturing();
  }, [isGuest]);

  // --- Drawing strokes (as 'drawing' nodes for native selection/move/resize) ---
  const beginStroke = useCallback(
    (s: DrawSettings, point: { x: number; y: number }): string | null => {
      if (isGuest) return null;
      const d = docRef.current;
      if (!d) return null;
      const id = `draw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const data: StrokeData = {
        kind: s.kind,
        color: s.color,
        size: s.size,
        filled: s.filled,
        points: [point.x, point.y],
        viewBox: { x: point.x, y: point.y, w: 1, h: 1 },
        authorId: user?.id,
      };
      const position = { x: point.x, y: point.y };
      d.transact(() => {
        const nodesMap = getNodesMap(d);
        writeNodeToMap(nodesMap, { id, type: 'drawing', position, width: 1, height: 1, data });
      }, 'local');
      setNodes((nds) => [
        ...nds,
        { id, type: 'drawing', position, width: 1, height: 1, data } as unknown as Node,
      ]);
      return id;
    },
    [isGuest, user?.id],
  );

  const extendStroke = useCallback(
    (id: string, kind: StrokeKind, point: { x: number; y: number }) => {
      if (isGuest) return;
      const d = docRef.current;
      if (!d) return;
      const current = displayedNodesRef.current.find((n) => n.id === id);
      if (!current) return;
      const prev = current.data as unknown as StrokeData;
      const newPoints =
        kind === 'pen'
          ? [...prev.points, point.x, point.y]
          : prev.points.length >= 2
          ? [prev.points[0], prev.points[1], point.x, point.y]
          : [point.x, point.y];
      const bounds = pointsBounds(newPoints);
      const newData: StrokeData = { ...prev, points: newPoints, viewBox: bounds };
      const position = { x: bounds.x, y: bounds.y };
      d.transact(() => {
        const nodesMap = getNodesMap(d);
        const m = nodesMap.get(id);
        if (!m) return;
        m.set('data', newData);
        m.set('position', position);
        m.set('width', bounds.w);
        m.set('height', bounds.h);
      }, 'local');
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? ({ ...n, position, width: bounds.w, height: bounds.h, data: newData } as unknown as Node)
            : n,
        ),
      );
    },
    [isGuest],
  );

  const finishStroke = useCallback(
    (_id: string) => {
      undoManagerRef.current?.stopCapturing();
    },
    [],
  );

  const eraseAtFlow = useCallback(
    (p: { x: number; y: number }) => {
      if (isGuest) return;
      const d = docRef.current;
      if (!d) return;
      const zoom = rfStore.getState().transform[2] || 1;
      const flowThreshold = 4 / zoom;
      const toDelete: string[] = [];
      for (const n of displayedNodesRef.current) {
        if (n.type !== 'drawing') continue;
        const data = n.data as unknown as StrokeData;
        if (!data?.viewBox) continue;
        const w = (n as any).width ?? data.viewBox.w;
        const h = (n as any).height ?? data.viewBox.h;
        const sx = w / data.viewBox.w;
        const sy = h / data.viewBox.h;
        const scale = Math.min(sx, sy); // 'meet'
        if (scale <= 0) continue;
        const offsetX = (w - data.viewBox.w * scale) / 2;
        const offsetY = (h - data.viewBox.h * scale) / 2;
        const localX = p.x - n.position.x;
        const localY = p.y - n.position.y;
        const sxg = data.viewBox.x + (localX - offsetX) / scale;
        const syg = data.viewBox.y + (localY - offsetY) / scale;
        if (strokeHit(data, sxg, syg, flowThreshold / scale)) {
          toDelete.push(n.id);
        }
      }
      if (toDelete.length === 0) return;
      d.transact(() => {
        const nodesMap = getNodesMap(d);
        toDelete.forEach((id) => nodesMap.delete(id));
      }, 'local');
      const dropped = new Set(toDelete);
      setNodes((nds) => nds.filter((n) => !dropped.has(n.id)));
    },
    [isGuest, rfStore],
  );

  // --- AI assistant bridge ---
  // Serialize a compact, semantic view of the canvas for the backend so the
  // assistant can reason about what's already on the board. Drawings carry no
  // text, so they're omitted.
  const getCanvasContext = useCallback(() => {
    const nodes = displayedNodesRef.current
      .filter((n) => n.type !== 'drawing')
      .map((n) => {
        const data: any = n.data ?? {};
        const out: any = { id: n.id, type: n.type };
        if (data.reference) out.reference = data.reference;
        if (n.type === 'sticky' && data.text) out.text = data.text;
        if (n.type === 'ai-note') {
          out.text = [data.question, data.answer].filter(Boolean).join(' — ');
        }
        if (n.type === 'file') out.text = data.name;
        return out;
      });
    const edges = edgesRef.current.map((e) => ({
      source: e.source,
      target: e.target,
      kind: (e.data as any)?.kind ?? '',
    }));
    return { nodes, edges };
  }, []);

  // Apply a backend-resolved mutation plan to the shared Yjs doc in one
  // transaction. New nodes get temp ids the model invented; we map them to real
  // ids so 'connect' ops (which may reference temp ids OR existing node ids)
  // resolve correctly. Placement reuses the radial fan-out / pickHandlesByGeometry
  // patterns used by addCrossRefNode/addAiNoteNode.
  const applyAiMutations = useCallback((mutations: Array<Record<string, any>>) => {
    if (isGuest) return;
    const d = docRef.current;
    if (!d || !Array.isArray(mutations) || mutations.length === 0) return;

    const adds = mutations.filter((m) => m?.op === 'add_node');
    const connects = mutations.filter((m) => m?.op === 'connect');
    if (adds.length === 0 && connects.length === 0) return;

    const baseTs = Date.now();
    const idMap = new Map<string, string>();
    const rects = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const n of displayedNodesRef.current) {
      rects.set(n.id, {
        x: n.position.x,
        y: n.position.y,
        w: (n as any).width ?? 280,
        h: (n as any).height ?? 120,
      });
    }

    // Anchor the new cluster on an existing node the AI is connecting to, if any.
    let anchor: { x: number; y: number } | null = null;
    for (const c of connects) {
      const ex = displayedNodesRef.current.find((n) => n.id === c.source || n.id === c.target);
      if (ex) {
        anchor = {
          x: ex.position.x + ((ex as any).width ?? 280) / 2,
          y: ex.position.y + ((ex as any).height ?? 120) / 2,
        };
        break;
      }
    }
    const center = anchor ?? getVisibleCenterFlow();
    const sizeFor = (type: string) =>
      type === 'ai-note' ? { w: 300, h: 180 } : type === 'passage' ? { w: 360, h: 220 } : { w: 300, h: 120 };

    d.transact(() => {
      const nodesMap = getNodesMap(d);
      const edgesMap = getEdgesMap(d);

      adds.forEach((m, i) => {
        const realId = `${m.type === 'ai-note' ? 'ai' : m.type}-${baseTs}-${i}`;
        idMap.set(m.temp_id, realId);
        const { w, h } = sizeFor(m.type);
        let position: { x: number; y: number };
        if (anchor) {
          const angle = Math.PI / 4 + i * (Math.PI / 6);
          const distance = 360 + (i % 2) * 80;
          position = {
            x: center.x + Math.cos(angle) * distance - w / 2,
            y: center.y + Math.sin(angle) * distance - h / 2,
          };
        } else {
          const cols = Math.max(1, Math.ceil(Math.sqrt(adds.length)));
          const col = i % cols;
          const row = Math.floor(i / cols);
          const gx = 340;
          const gy = 240;
          position = {
            x: center.x - ((cols - 1) * gx) / 2 + col * gx - w / 2,
            y: center.y + row * gy - h / 2,
          };
        }
        rects.set(realId, { x: position.x, y: position.y, w, h });
        writeNodeToMap(nodesMap, { id: realId, type: m.type, position, width: w, height: h, data: m.data });
      });

      connects.forEach((c, i) => {
        const source = idMap.get(c.source) ?? c.source;
        const target = idMap.get(c.target) ?? c.target;
        if (source === target) return;
        const sr = rects.get(source);
        const tr = rects.get(target);
        if (!sr || !tr) return; // edge references a node that doesn't exist
        const handles = pickHandlesByGeometry(sr, tr);
        writeEdgeToMap(edgesMap, {
          id: `ai-${source}-${target}-${baseTs}-${i}`,
          source,
          target,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          type: 'default',
          data: { kind: c.kind || 'ai', ...(c.label ? { label: c.label } : {}) },
        });
      });
    });
    undoManagerRef.current?.stopCapturing();
  }, [isGuest, getVisibleCenterFlow]);

useEffect(() => {
    (window as any).__studyCanvasActions = { addStickyNote, addVerseNode, addPassageNode, addFileNode, addFileNodes, addVerseChain, addCrossRefNode, addAiNoteNode, setVerseNodeVersion, undo, redo, resizeNode, deleteNodes, duplicateNode, zoomIn, zoomOut, fitView, toggleLock, getCanvasContext, applyAiMutations };
    (window as any).__studyCanvasState = { isLocked: !isInteractive };
    return () => { delete (window as any).__studyCanvasActions; delete (window as any).__studyCanvasState; };
  }, [addStickyNote, addVerseNode, addPassageNode, addFileNode, addFileNodes, addVerseChain, addCrossRefNode, addAiNoteNode, setVerseNodeVersion, undo, redo, resizeNode, deleteNodes, duplicateNode, zoomIn, zoomOut, fitView, toggleLock, getCanvasContext, applyAiMutations, isInteractive]);

  // --- Cursor tracking ---
  const handleCanvasPointerMove = useCallback(
    (event: React.MouseEvent<Element, MouseEvent>) => {
      if (isGuest) return;
      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setLocalCursor(pos.x, pos.y);
    },
    [setLocalCursor, screenToFlowPosition, isGuest],
  );

  const getSelectedNodeIds = useCallback((fallbackNodeId: string) => {
    const selectedNodeIds = rfStore
      .getState()
      .nodes
      .filter((node) => node.selected)
      .map((node) => node.id);

    return selectedNodeIds.length > 0 ? selectedNodeIds : [fallbackNodeId];
  }, [rfStore]);

  const handleNodeDragStart: OnNodeDrag = useCallback(
    (event, node) => {
      if (isGuest) return;
      handleCanvasPointerMove(event);
      setLocalDragging(true);
      setLocalSelection(getSelectedNodeIds(node.id));
    },
    [getSelectedNodeIds, handleCanvasPointerMove, setLocalDragging, setLocalSelection, isGuest],
  );

  const handleNodeDrag: OnNodeDrag = useCallback(
    (event) => {
      if (isGuest) return;
      handleCanvasPointerMove(event);
    },
    [handleCanvasPointerMove, isGuest],
  );

  const handleNodeDragStop: OnNodeDrag = useCallback(
    (event, node) => {
      if (isGuest) return;
      handleCanvasPointerMove(event);
      flushPendingPositionWrites();
      undoManagerRef.current?.stopCapturing();
      setLocalDragging(false);
      setLocalSelection(getSelectedNodeIds(node.id));
    },
    [flushPendingPositionWrites, getSelectedNodeIds, handleCanvasPointerMove, setLocalDragging, setLocalSelection, isGuest],
  );

  // --- Verses dropped from the Bible panel ---------------------------------
  const [dropActive, setDropActive] = useState(false);
  const dropDepthRef = useRef(0);

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    if (isGuest || !hasVerseDrag(event.dataTransfer)) return;
    dropDepthRef.current += 1;
    setDropActive(true);
  }, [isGuest]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    if (isGuest || !hasVerseDrag(event.dataTransfer)) return;
    dropDepthRef.current = Math.max(0, dropDepthRef.current - 1);
    if (dropDepthRef.current === 0) setDropActive(false);
  }, [isGuest]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (isGuest || !hasVerseDrag(event.dataTransfer)) return;
    // Claiming the event is what makes the pane a valid drop target.
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    if (!dropActive) setDropActive(true);
  }, [isGuest, dropActive]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    dropDepthRef.current = 0;
    setDropActive(false);
    if (isGuest) return;
    const payload = readVerseDrag(event.dataTransfer);
    if (!payload || payload.items.length === 0) return;
    event.preventDefault();
    endVerseDrag();

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    if (payload.items.length === 1) {
      const item = payload.items[0];
      addVerseNode(
        { verseId: item.verseId, reference: item.reference, version_id: item.version_id, text: item.text },
        // addVerseNode centres the node on the point it's given; offset so the
        // node's top-left lands under the pointer instead.
        { x: position.x + 150, y: position.y + 40 },
      );
    } else {
      addVerseChain(payload.items, position);
    }
  }, [isGuest, screenToFlowPosition, addVerseNode, addVerseChain]);

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      if (isGuest) return;
      setLocalSelection(selectedNodes.map((node) => node.id));
    },
    [setLocalSelection, isGuest],
  );

  return (
    <StudyDocContext.Provider value={doc}>
      <div
        className="w-full h-full relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dropActive && (
          <div className="absolute inset-0 z-30 pointer-events-none rounded-lg ring-2 ring-inset ring-accent/50 bg-accent/5" />
        )}
        {!connected && (
          <div
            className="absolute top-3 z-20 bg-orange-500/10 border border-orange-500/30 rounded-lg px-2.5 py-1 text-xs text-orange-400 pointer-events-none transition-[right] duration-300"
            style={{ right: rightInset + 12 }}
          >
            Connecting...
          </div>
        )}
        {connected && nodes.length === 0 && !isGuest && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-sm text-text-muted mb-4">Start your study</p>
              <div className="flex items-center gap-4 text-2xs text-text-muted">
                <span><kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary border border-border text-2xs font-mono text-text-secondary">N</kbd> Sticky</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary border border-border text-2xs font-mono text-text-secondary">I</kbd> Verse</span>
                <span><kbd className="px-1.5 py-0.5 rounded bg-bg-tertiary border border-border text-2xs font-mono text-text-secondary">Space</kbd> Pan</span>
              </div>
            </div>
          </div>
        )}
        {connected && nodes.length === 0 && isGuest && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-text-muted">The study canvas is empty</p>
          </div>
        )}
        <ReactFlow
          nodes={nodesForRender}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onMouseMove={handleCanvasPointerMove}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onSelectionChange={handleSelectionChange}
          onPaneClick={loginRequired ? () => openAuthModal('login') : undefined}
          nodeTypes={studyNodeTypes}
          edgeTypes={studyEdgeTypes}
          fitView
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={['Backspace', 'Delete']}
          multiSelectionKeyCode="Shift"
          selectionKeyCode="Shift"
          elevateEdgesOnSelect
          className={`bg-bg-secondary${
            tool === 'draw' || tool === 'erase'
              ? spaceHeld
                ? ' cursor-grab'
                : tool === 'erase'
                ? ' [&_.react-flow__pane]:cursor-cell'
                : ' [&_.react-flow__pane]:cursor-crosshair'
              : ''
          }`}
          defaultEdgeOptions={{ type: 'default', animated: false }}
          proOptions={{ hideAttribution: true }}
          panOnDrag={
            tool === 'draw' || tool === 'erase'
              ? (spaceHeld ? [0, 1] : [1])
              : (tool === 'hand' || isGuest || isMobile ? [0, 1] : [1])
          }
          nodesDraggable={!isGuest && tool === 'select'}
          nodesConnectable={!isGuest && tool === 'select'}
          elementsSelectable={!isGuest || tool === 'select'}
          selectionOnDrag={!isMobile && !isGuest && tool === 'select'}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="var(--color-text-muted)"
          />
          {!isMobile && (
            <MiniMap
              position="top-right"
              className="!bg-surface !border-border !rounded-lg"
              style={{ right: rightInset, transition: 'right 300ms' }}
              maskColor="var(--color-bg-primary)"
              nodeColor={(n: Node) => {
                if (n.type === 'sticky') return '#eab308';
                if (n.type === 'verse') return '#6d7cea';
                if (n.type === 'file') return '#c8a96a';
                return '#6b7280';
              }}
            />
          )}
          <RemoteCursors users={users} currentUserId={user?.id} />
          <DrawingLayer
            active={!isGuest && (tool === 'draw' || tool === 'erase')}
            paused={spaceHeld}
            erasing={tool === 'erase'}
            settings={drawSettings}
            beginStroke={beginStroke}
            extendStroke={extendStroke}
            finishStroke={finishStroke}
            eraseAtFlow={eraseAtFlow}
          />
        </ReactFlow>
      </div>
    </StudyDocContext.Provider>
  );
}

export function StudyCanvas(props: StudyCanvasProps) {
  return (
    <ReactFlowProvider>
      <StudyCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
