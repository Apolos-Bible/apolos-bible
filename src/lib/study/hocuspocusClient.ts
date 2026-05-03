import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

type ProviderEntry = {
  provider: HocuspocusProvider;
  token: string;
  refs: number;
};

const activeProviders: Map<string, ProviderEntry> = new Map();

function decodePayload(token: string) {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function signatureEnd(token: string) {
  return token.split('.')[2]?.slice(-16);
}

export function getOrCreateProvider(sessionId: string, wsToken: string): HocuspocusProvider {
  const existing = activeProviders.get(sessionId);
  if (existing?.token === wsToken) {
    existing.refs += 1;
    return existing.provider;
  }

  if (existing) {
    existing.provider.disconnect();
    existing.provider.destroy();
    activeProviders.delete(sessionId);
  }

  const doc = new Y.Doc();
  const wsUrl = import.meta.env.VITE_HOCUSPOCUS_URL ?? 'ws://localhost:1234';

  console.debug('[hocuspocus]', sessionId, 'creating provider', {
    apiUrl: import.meta.env.VITE_API_URL,
    wsUrl,
    tokenLength: wsToken.length,
    tokenParts: wsToken.split('.').length,
    tokenSignatureEnd: signatureEnd(wsToken),
    decodedPayload: decodePayload(wsToken),
  });

  const provider = new HocuspocusProvider({
    url: wsUrl,
    name: sessionId,
    document: doc,
    token: wsToken,
    connect: true,
  });

  provider.on('awarenessChange', () => {
    // Awareness updates are handled by useCursorAwareness hook
  });

  provider.on('status', (event: { status: string }) => {
    console.debug('[hocuspocus]', sessionId, event.status);
  });

  provider.on('authenticationFailed', (event: { reason: string }) => {
    console.warn('[hocuspocus]', sessionId, 'authentication failed:', event.reason);
  });

  activeProviders.set(sessionId, {
    provider,
    token: wsToken,
    refs: 1,
  });

  return provider;
}

export function destroyProvider(sessionId: string) {
  const entry = activeProviders.get(sessionId);
  if (entry) {
    entry.refs -= 1;
    if (entry.refs > 0) return;

    entry.provider.disconnect();
    entry.provider.destroy();
    activeProviders.delete(sessionId);
  }
}

export function destroyAllProviders() {
  activeProviders.forEach((entry) => {
    entry.provider.disconnect();
    entry.provider.destroy();
  });
  activeProviders.clear();
}
