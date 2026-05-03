import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  BackgroundVariant,
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
import { useVerseStore } from '@/lib/store/useVerseStore';
import {
  getNodesMap,
  getEdgesMap,
  nodeFromYMap,
  edgeFromYMap,
  writeNodeToMap,
  writeEdgeToMap,
} from '@/lib/study/yDocHelpers';
import { StudyDocContext } from '@/lib/study/StudyDocContext';
import { studyNodeTypes } from './nodes';
import { studyEdgeTypes } from './edges';
import { RemoteCursors } from './cursor/RemoteCursors';
import type { Tool } from './StudyMode';
import type { AwarenessUser } from '@/hooks/useStudySession';

const POSITION_SYNC_INTERVAL_MS = 50;
const REMOTE_POSITION_ANIMATION_MS = 80;

interface StudyCanvasProps {
  tool: Tool;
  biblePanelOpen: boolean;
  doc: Y.Doc | null;
  connected: boolean;
  reconnectKey: number;
  users: AwarenessUser[];
  setLocalCursor: (x: number, y: number) => void;
  setLocalSelection: (nodeIds: string[]) => void;
  setLocalDragging: (dragging: boolean) => void;
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

function parseChapterAnchor(anchorRef: string) {
  const match = anchorRef.match(/^(.+)-(\d+)$/);
  if (!match) return null;

  return {
    bookSlug: match[1],
    chapter: Number(match[2]),
  };
}

function StudyCanvasInner({
  tool,
  biblePanelOpen,
  doc,
  connected,
  reconnectKey,
  users,
  setLocalCursor,
  setLocalSelection,
  setLocalDragging,
}: StudyCanvasProps) {
  const activeSession = useStudyStore((s) => s.activeSession);
  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow();
  const isInteractive = useStore((s) => s.nodesDraggable || s.nodesConnectable || s.elementsSelectable);
  const rfStore = useStoreApi();

  const toggleLock = useCallback(() => {
    const s = rfStore.getState();
    const val = !(s.nodesDraggable || s.nodesConnectable || s.elementsSelectable);
    rfStore.setState({ nodesDraggable: val, nodesConnectable: val, elementsSelectable: val });
  }, [rfStore]);
  const user = useAuthStore((s) => s.user);
  const versionId = useVerseStore((s) => s.versionId);

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
  const remoteAnimationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    displayedNodesRef.current = nodes;
  }, [nodes]);

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
  }, []);

  const schedulePositionWrite = useCallback((nodeId: string, position: { x: number; y: number }) => {
    pendingPositionWritesRef.current.set(nodeId, position);

    if (positionWriteTimerRef.current) return;

    positionWriteTimerRef.current = setTimeout(() => {
      positionWriteTimerRef.current = null;
      flushPendingPositionWrites();
    }, POSITION_SYNC_INTERVAL_MS);
  }, [flushPendingPositionWrites]);

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
    undoManagerRef.current = new Y.UndoManager([nodesMap, edgesMap]);

    const syncFromYjs = (_events: any[], transaction: any) => {
      if (transaction?.origin === 'local') return;

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
    if (!doc || !activeSession || !user) return;
    if (activeSession.type === 'free') return;
    if (!activeSession.anchor_ref) return;

    const isHost = activeSession.host_user_id === Number(user.id);
    if (!isHost) return;

    const nodesMap = getNodesMap(doc);
    if (nodesMap.size > 0) return; // already has content

    const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

    if (activeSession.type === 'verse') {
      const id = `verse-auto-${Date.now()}`;
      doc.transact(() => {
        writeNodeToMap(nodesMap, {
          id,
          type: 'verse',
          position: { x: center.x - 150, y: center.y - 40 },
          data: {
            verseId: 0, // will be resolved on the node
            reference: activeSession.anchor_ref,
            version_id: 0,
          },
        });
      });
    } else if (activeSession.type === 'chapter') {
      const anchor = parseChapterAnchor(activeSession.anchor_ref);
      if (!anchor) return;

      const id = `passage-auto-${Date.now()}`;
      doc.transact(() => {
        writeNodeToMap(nodesMap, {
          id,
          type: 'passage',
          position: { x: center.x - 180, y: center.y - 60 },
          data: {
            bookSlug: anchor.bookSlug,
            chapter: anchor.chapter,
            startVerse: 1,
            endVerse: 999,
            reference: activeSession.anchor_ref,
            version_id: versionId,
          },
        });
      });
    }
  }, [doc, activeSession, user, versionId, screenToFlowPosition]);

  // --- React Flow changes → Yjs ---
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const d = docRef.current;
      if (!d) {
        setNodes((nds) => applyNodeChanges(changes, nds));
        return;
      }

      if (changes.some((change) => change.type === 'position')) {
        cancelRemotePositionAnimation();
      }

      d.transact(() => {
        const nodesMap = getNodesMap(d);

        for (const change of changes) {
          if (change.type === 'position' && change.position) {
            schedulePositionWrite(change.id, { x: change.position.x, y: change.position.y });
          } else if (change.type === 'remove') {
            pendingPositionWritesRef.current.delete(change.id);
            nodesMap.delete(change.id);
          }
        }
      }, 'local');

      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [cancelRemotePositionAnimation, schedulePositionWrite],
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const d = docRef.current;
      if (!d) {
        setEdges((eds) => applyEdgeChanges(changes, eds));
        return;
      }

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
    [],
  );

  const handleConnect: OnConnect = useCallback(
    (connection) => {
      const d = docRef.current;
      if (!d || !connection.source || !connection.target) return;

      const id = `edge-${connection.source}-${connection.target}-${Date.now()}`;

      d.transact(() => {
        const edgesMap = getEdgesMap(d);
        writeEdgeToMap(edgesMap, {
          id,
          source: connection.source,
          target: connection.target,
        });
      }, 'local');

      // Update React state immediately (observer filters out 'local' origin)
      setEdges((eds) => [
        ...eds,
        { id, source: connection.source, target: connection.target, type: 'default' },
      ]);
    },
    [],
  );

  // --- Canvas actions (accessed by toolbar) ---
  // These use docRef.current so they always have the latest doc
  const addStickyNote = useCallback((pos?: { x: number; y: number }) => {
    const d = docRef.current;
    if (!d) return;
    const id = `sticky-${Date.now()}`;
    const position = pos ?? { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 };
    d.transact(() => {
      const nodesMap = getNodesMap(d);
      writeNodeToMap(nodesMap, { id, type: 'sticky', position, data: { text: '', color: 'yellow' } });
    });
  }, []);

  const addVerseNode = useCallback((data: { verseId: number; reference: string; version_id: number }) => {
    const d = docRef.current;
    if (!d) return;
    const id = `verse-${data.verseId}-${Date.now()}`;
    const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const position = { x: center.x - 150, y: center.y - 40 };
    d.transact(() => {
      const nodesMap = getNodesMap(d);
      writeNodeToMap(nodesMap, { id, type: 'verse', position, data });
    });
  }, [screenToFlowPosition]);

  const addPassageNode = useCallback((data: { bookSlug: string; chapter: number; reference: string; version_id: number; verses: { verseId: number; reference: string; verse: number; text: string }[] }) => {
    const d = docRef.current;
    if (!d) return;
    const id = `passage-${Date.now()}`;
    const center = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const position = { x: center.x - 200, y: center.y - 60 };
    d.transact(() => {
      const nodesMap = getNodesMap(d);
      writeNodeToMap(nodesMap, { id, type: 'passage', position, data });
    });
  }, [screenToFlowPosition]);

  const undo = useCallback(() => {
    undoManagerRef.current?.undo();
  }, []);

  const redo = useCallback(() => {
    undoManagerRef.current?.redo();
  }, []);

  useEffect(() => {
    (window as any).__studyCanvasActions = { addStickyNote, addVerseNode, addPassageNode, undo, redo, zoomIn, zoomOut, fitView, toggleLock };
    (window as any).__studyCanvasState = { isLocked: !isInteractive };
    return () => { delete (window as any).__studyCanvasActions; delete (window as any).__studyCanvasState; };
  }, [addStickyNote, addVerseNode, addPassageNode, undo, redo, zoomIn, zoomOut, fitView, toggleLock, isInteractive]);

  // --- Cursor tracking ---
  const handleCanvasPointerMove = useCallback(
    (event: React.MouseEvent<Element, MouseEvent>) => {
      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setLocalCursor(pos.x, pos.y);
    },
    [setLocalCursor, screenToFlowPosition],
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
      handleCanvasPointerMove(event);
      setLocalDragging(true);
      setLocalSelection(getSelectedNodeIds(node.id));
    },
    [getSelectedNodeIds, handleCanvasPointerMove, setLocalDragging, setLocalSelection],
  );

  const handleNodeDrag: OnNodeDrag = useCallback(
    (event) => {
      handleCanvasPointerMove(event);
    },
    [handleCanvasPointerMove],
  );

  const handleNodeDragStop: OnNodeDrag = useCallback(
    (event, node) => {
      handleCanvasPointerMove(event);
      flushPendingPositionWrites();
      setLocalDragging(false);
      setLocalSelection(getSelectedNodeIds(node.id));
    },
    [flushPendingPositionWrites, getSelectedNodeIds, handleCanvasPointerMove, setLocalDragging, setLocalSelection],
  );

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      setLocalSelection(selectedNodes.map((node) => node.id));
    },
    [setLocalSelection],
  );

  return (
    <StudyDocContext.Provider value={doc}>
      <div className="w-full h-full relative">
        {!connected && (
          <div className="absolute top-3 right-3 z-20 bg-orange-500/10 border border-orange-500/30 rounded-lg px-2.5 py-1 text-xs text-orange-400 pointer-events-none">
            Connecting...
          </div>
        )}
        {connected && nodes.length === 0 && (
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
          nodeTypes={studyNodeTypes}
          edgeTypes={studyEdgeTypes}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
          multiSelectionKeyCode="Shift"
          selectionKeyCode="Shift"
          className="bg-bg-secondary"
          defaultEdgeOptions={{ type: 'default', animated: false }}
          panOnDrag={tool === 'hand' ? [0, 1] : [1]}
          nodesDraggable={tool === 'select'}
          nodesConnectable={tool === 'select'}
          elementsSelectable={tool === 'select'}
          selectionOnDrag={tool === 'select'}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="var(--color-text-muted)"
          />
          <MiniMap
            className="!bg-surface !border-border !rounded-lg"
            maskColor="var(--color-bg-primary)"
            nodeColor={(n: Node) => {
              if (n.type === 'sticky') return '#eab308';
              if (n.type === 'verse') return '#c8a96a';
              return '#6b7280';
            }}
          />
          <RemoteCursors users={users} currentUserId={user?.id} />
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
