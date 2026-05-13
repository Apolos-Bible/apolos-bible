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
  writeNodeToMap,
  writeEdgeToMap,
} from '@/lib/study/yDocHelpers';
import { pointsBounds, strokeHit, type StrokeData, type StrokeKind } from '@/lib/study/strokes';
import { StudyDocContext } from '@/lib/study/StudyDocContext';
import { studyNodeTypes } from './nodes';
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
  drawSettings: DrawSettings;
  spaceHeld: boolean;
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
  drawSettings,
  spaceHeld,
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
      const nodeH = 100;
      const gap = 40;
      const baseTs = Date.now();

      if (verseList.length === 1) {
        const v = verseList[0];
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
        const startX = center.x - nodeW / 2;
        const totalH = verseList.length * nodeH + (verseList.length - 1) * gap;
        const startY = center.y - totalH / 2;
        const ids: string[] = [];
        doc.transact(() => {
          verseList.forEach((v, i) => {
            const id = `verse-auto-${baseTs}-${i}`;
            ids.push(id);
            writeNodeToMap(nodesMap, {
              id,
              type: 'verse',
              position: { x: startX, y: startY + i * (nodeH + gap) },
              width: nodeW,
              height: nodeH,
              data: v,
            });
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

  const addStickyNote = useCallback((pos?: { x: number; y: number }) => {
    if (isGuest) return;
    const d = docRef.current;
    if (!d) return;
    const id = `sticky-${Date.now()}`;
    let position = pos;
    if (!position) {
      const center = getVisibleCenterFlow();
      position = { x: center.x - 100, y: center.y - 60 };
    }
    d.transact(() => {
      const nodesMap = getNodesMap(d);
      writeNodeToMap(nodesMap, { id, type: 'sticky', position, data: { text: '', color: 'yellow' } });
    });
  }, [isGuest, getVisibleCenterFlow]);

  const addVerseNode = useCallback((data: { verseId: number; reference: string; version_id: number }) => {
    if (isGuest) return;
    const d = docRef.current;
    if (!d) return;
    const id = `verse-${data.verseId}-${Date.now()}`;
    const center = getVisibleCenterFlow();
    const position = { x: center.x - 150, y: center.y - 40 };
    d.transact(() => {
      const nodesMap = getNodesMap(d);
      writeNodeToMap(nodesMap, { id, type: 'verse', position, data });
    });
  }, [getVisibleCenterFlow, isGuest]);

  const addPassageNode = useCallback((data: { bookSlug: string; chapter: number; reference: string; version_id: number; verses: { verseId: number; reference: string; verse: number; text: string }[] }) => {
    if (isGuest) return;
    const d = docRef.current;
    if (!d) return;
    const id = `passage-${Date.now()}`;
    const center = getVisibleCenterFlow();
    const position = { x: center.x - 200, y: center.y - 60 };
    d.transact(() => {
      const nodesMap = getNodesMap(d);
      writeNodeToMap(nodesMap, { id, type: 'passage', position, data });
    });
  }, [getVisibleCenterFlow, isGuest]);

  // Insert a sequence of verses as individual verse nodes stacked vertically
  // and connected bottom→top, so multi-verse selections become a chain rather
  // than a single passage block.
  const addVerseChain = useCallback((verses: { verseId: number; reference: string; version_id: number; text: string }[]) => {
    if (isGuest) return;
    if (!verses || verses.length === 0) return;
    const d = docRef.current;
    if (!d) return;
    const center = getVisibleCenterFlow();
    const nodeW = 320;
    const nodeH = 100;
    const gap = 40;
    const baseTs = Date.now();
    const startX = center.x - nodeW / 2;
    const totalH = verses.length * nodeH + (verses.length - 1) * gap;
    const startY = center.y - totalH / 2;
    d.transact(() => {
      const nodesMap = getNodesMap(d);
      const edgesMap = getEdgesMap(d);
      const ids: string[] = [];
      verses.forEach((v, i) => {
        const id = `verse-${v.verseId}-${baseTs}-${i}`;
        ids.push(id);
        const position = { x: startX, y: startY + i * (nodeH + gap) };
        writeNodeToMap(nodesMap, { id, type: 'verse', position, width: nodeW, height: nodeH, data: v });
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
    d.transact(() => {
      const nodesMap = getNodesMap(d);
      const existing = nodesMap.get(id);
      if (!existing) return;
      existing.set('width', w);
      existing.set('height', h);
    }, 'local');
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, width: w, height: h } : n)));
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
    const position = {
      x: cx + Math.cos(angle) * distance - nodeW / 2,
      y: cy + Math.sin(angle) * distance - nodeH / 2,
    };

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
    const position = {
      x: cx + Math.cos(angle) * distance - nodeW / 2,
      y: cy + Math.sin(angle) * distance - nodeH / 2,
    };

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

useEffect(() => {
    (window as any).__studyCanvasActions = { addStickyNote, addVerseNode, addPassageNode, addVerseChain, addCrossRefNode, addAiNoteNode, setVerseNodeVersion, undo, redo, resizeNode, zoomIn, zoomOut, fitView, toggleLock };
    (window as any).__studyCanvasState = { isLocked: !isInteractive };
    return () => { delete (window as any).__studyCanvasActions; delete (window as any).__studyCanvasState; };
  }, [addStickyNote, addVerseNode, addPassageNode, addVerseChain, addCrossRefNode, addAiNoteNode, setVerseNodeVersion, undo, redo, resizeNode, zoomIn, zoomOut, fitView, toggleLock, isInteractive]);

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

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      if (isGuest) return;
      setLocalSelection(selectedNodes.map((node) => node.id));
    },
    [setLocalSelection, isGuest],
  );

  return (
    <StudyDocContext.Provider value={doc}>
      <div className="w-full h-full relative">
        {!connected && (
          <div className="absolute top-3 right-3 z-20 bg-orange-500/10 border border-orange-500/30 rounded-lg px-2.5 py-1 text-xs text-orange-400 pointer-events-none">
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
          onPaneClick={isGuest ? () => openAuthModal('login') : undefined}
          nodeTypes={studyNodeTypes}
          edgeTypes={studyEdgeTypes}
          fitView
          connectionMode={ConnectionMode.Loose}
          deleteKeyCode={['Backspace', 'Delete']}
          multiSelectionKeyCode="Shift"
          selectionKeyCode="Shift"
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
              : (tool === 'hand' || isGuest ? [0, 1] : [1])
          }
          nodesDraggable={!isGuest && tool === 'select'}
          nodesConnectable={!isGuest && tool === 'select'}
          elementsSelectable={!isGuest || tool === 'select'}
          selectionOnDrag={!isGuest && tool === 'select'}
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
              maskColor="var(--color-bg-primary)"
              nodeColor={(n: Node) => {
                if (n.type === 'sticky') return '#eab308';
                if (n.type === 'verse') return '#c8a96a';
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
