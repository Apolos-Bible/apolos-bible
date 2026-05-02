import { useEffect, useRef, useCallback, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { getOrCreateProvider, destroyProvider } from '@/lib/study/hocuspocusClient';

export interface AwarenessUser {
  id: number;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  selectedNodeIds?: string[];
  dragging?: boolean;
  role?: string;
}

export function useStudySession(sessionId: string | null, wsToken: string | null) {
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnectKey, setReconnectKey] = useState(0);
  const [users, setUsers] = useState<AwarenessUser[]>([]);

  // Create / destroy provider based on sessionId
  useEffect(() => {
    if (!sessionId || !wsToken) {
      setDoc(null);
      setConnected(false);
      return;
    }

    const provider = getOrCreateProvider(sessionId, wsToken);
    providerRef.current = provider;
    setDoc(provider.document);

    // Manual awareness subscription
    const onAwareness = () => {
      const states = provider.awareness.getStates();
      const list: AwarenessUser[] = [];
      states.forEach((state) => {
        if (state.user) {
          list.push({
            id: state.user.id,
            name: state.user.name,
            color: state.user.color ?? '#c8a96a',
            cursor: state.cursor,
            selectedNodeIds: Array.isArray(state.selectedNodeIds) ? state.selectedNodeIds : [],
            dragging: Boolean(state.dragging),
            role: state.user.role,
          });
        }
      });
      setUsers(list);
    };

    const onStatus = (e: { status: string }) => {
      if (e.status === 'connected') {
        setConnected(true);
        setReconnectKey(k => k + 1);
        onAwareness();
      } else if (e.status === 'disconnected') {
        setConnected(false);
      }
    };

    provider.awareness.on('change', onAwareness);
    provider.on('status', onStatus);
    setConnected(provider.status === 'connected');
    onAwareness();

    if (provider.document) {
      setDoc(provider.document);
    }

    return () => {
      provider.off('status', onStatus);
      provider.awareness.off('change', onAwareness);
      destroyProvider(sessionId);
      providerRef.current = null;
      setDoc(null);
      setConnected(false);
      setUsers([]);
    };
  }, [sessionId, wsToken]);

  const setLocalCursor = useCallback((x: number, y: number) => {
    providerRef.current?.awareness.setLocalStateField('cursor', { x, y });
  }, []);

  const setLocalUser = useCallback((user: { id: number; name: string; color: string; role?: string }) => {
    providerRef.current?.awareness.setLocalStateField('user', user);
  }, []);

  const setLocalSelection = useCallback((nodeIds: string[]) => {
    providerRef.current?.awareness.setLocalStateField('selectedNodeIds', nodeIds);
  }, []);

  const setLocalDragging = useCallback((dragging: boolean) => {
    providerRef.current?.awareness.setLocalStateField('dragging', dragging);
  }, []);

  return {
    provider: providerRef.current,
    doc,
    connected,
    reconnectKey,
    users,
    setLocalCursor,
    setLocalUser,
    setLocalSelection,
    setLocalDragging,
  };
}
