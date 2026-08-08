import * as Y from 'yjs';

export function getNodesMap(doc: Y.Doc): Y.Map<Y.Map<any>> {
  return doc.getMap('nodes');
}

export function getEdgesMap(doc: Y.Doc): Y.Map<Y.Map<any>> {
  return doc.getMap('edges');
}

// --- Attached AI context documents (shared across all study participants) ---
// Extracted text of PDFs a participant shared as grounding context for Apolos.
// They live in the Yjs doc so everyone sees the same attachments and anyone's
// "/apolos" question carries them. They are NEVER auto-added to the canvas.
export interface StoredAiDocument {
  id: string;
  name: string;
  text: string;
  truncated?: boolean;
  addedBy?: string | null;
  addedAt: number;
}

export function getAiDocumentsArray(doc: Y.Doc): Y.Array<StoredAiDocument> {
  return doc.getArray('aiDocuments');
}

export function addAiDocument(doc: Y.Doc, document: StoredAiDocument) {
  doc.transact(() => {
    getAiDocumentsArray(doc).push([document]);
  });
}

export function removeAiDocument(doc: Y.Doc, id: string) {
  doc.transact(() => {
    const arr = getAiDocumentsArray(doc);
    const idx = arr.toArray().findIndex((d) => d.id === id);
    if (idx !== -1) arr.delete(idx, 1);
  });
}

// --- Guided studies -------------------------------------------------------
// A guided session walks everyone through the same steps, so the current step
// and which passages have already been placed on the canvas live in the shared
// doc. Personal answers do NOT: those are private and stay in the backend.
export function getGuidedMap(doc: Y.Doc): Y.Map<any> {
  return doc.getMap('guided');
}

export function readGuidedStep(doc: Y.Doc): number | null {
  const value = getGuidedMap(doc).get('currentStep');
  return typeof value === 'number' ? value : null;
}

export function writeGuidedStep(doc: Y.Doc, step: number) {
  doc.transact(() => {
    getGuidedMap(doc).set('currentStep', step);
  });
}

/**
 * Claim a step's passage insertion. Returns false when someone else already
 * placed it, so two participants opening the step don't duplicate the verses.
 */
export function claimGuidedInsert(doc: Y.Doc, stepId: number): boolean {
  const key = `inserted:${stepId}`;
  const guided = getGuidedMap(doc);
  if (guided.get(key)) return false;
  doc.transact(() => {
    guided.set(key, true);
  });
  return true;
}

interface CanvasVerseIdentity {
  verseId: number;
  version_id: number;
  text?: string;
}

function verseIdentity(verseId: unknown, versionId: unknown): string | null {
  if (typeof verseId !== 'number' || typeof versionId !== 'number') return null;
  return `${versionId}:${verseId}`;
}

function textIdentity(text: unknown): string | null {
  if (typeof text !== 'string') return null;
  const normalized = text.normalize('NFC').replace(/\s+/g, ' ').trim();
  return normalized ? normalized : null;
}

/**
 * Remove verses whose text is already represented on the canvas. Both an
 * individual verse node and a verse nested inside a passage node count. This
 * is the last line of defence for old guided sessions that predate the shared
 * `inserted:<step>` marker (or opened before that marker finished syncing).
 */
export function filterVersesMissingFromCanvas<T extends CanvasVerseIdentity>(
  doc: Y.Doc,
  verses: T[],
): T[] {
  const existing = new Set<string>();
  const existingTexts = new Set<string>();

  getNodesMap(doc).forEach((nodeMap) => {
    const type = nodeMap.get('type');
    const data = nodeMap.get('data');
    if (!data || typeof data !== 'object') return;

    if (type === 'verse') {
      const identity = verseIdentity(data.verseId, data.version_id);
      if (identity) existing.add(identity);
      const text = textIdentity(data.text);
      if (text) existingTexts.add(text);
      return;
    }

    if (type === 'passage' && Array.isArray(data.verses)) {
      data.verses.forEach((verse: any) => {
        const identity = verseIdentity(verse?.verseId, verse?.version_id ?? data.version_id);
        if (identity) existing.add(identity);
        const text = textIdentity(verse?.text);
        if (text) existingTexts.add(text);
      });
    }
  });

  return verses.filter((verse) => {
    const identity = `${verse.version_id}:${verse.verseId}`;
    const text = textIdentity(verse.text);
    if (existing.has(identity) || (text != null && existingTexts.has(text))) return false;
    existing.add(identity);
    if (text) existingTexts.add(text);
    return true;
  });
}

/**
 * Decide whether mounting a guided step should seed its passage. An existing
 * canvas wins even if it was copied into a newly reopened session, while step
 * changes made after mounting are still allowed through to per-verse dedupe.
 */
export function shouldAutoInsertGuidedPassage({
  doc,
  firstStepInVisit,
  progressSessionId,
  sessionId,
}: {
  doc: Y.Doc;
  firstStepInVisit: boolean;
  progressSessionId: string | null | undefined;
  sessionId: string;
}): boolean {
  if (!firstStepInVisit) return true;
  return progressSessionId !== sessionId && getNodesMap(doc).size === 0;
}

export function nodeFromYMap(id: string, m: Y.Map<any>) {
  const node: any = {
    id: m.get('id') ?? id,
    type: m.get('type') ?? 'sticky',
    position: m.get('position') ?? { x: 0, y: 0 },
    data: m.get('data') ?? {},
  };
  const width = m.get('width');
  const height = m.get('height');
  if (typeof width === 'number') node.width = width;
  if (typeof height === 'number') node.height = height;
  return node;
}

export function edgeFromYMap(id: string, m: Y.Map<any>) {
  const edge: any = {
    id: m.get('id') ?? id,
    source: m.get('source') ?? '',
    target: m.get('target') ?? '',
    type: m.get('type') ?? 'default',
    data: m.get('data') ?? {},
  };
  const sourceHandle = m.get('sourceHandle');
  const targetHandle = m.get('targetHandle');
  if (sourceHandle != null) edge.sourceHandle = sourceHandle;
  if (targetHandle != null) edge.targetHandle = targetHandle;
  return edge;
}

export function writeNodeToMap(nodesMap: Y.Map<Y.Map<any>>, node: { id: string; type?: string; position?: { x: number; y: number }; data?: any; width?: number; height?: number }) {
  const existing = nodesMap.get(node.id);
  const nodeMap = existing ?? new Y.Map();
  nodeMap.set('id', node.id);
  if (node.type) nodeMap.set('type', node.type);
  if (node.position) nodeMap.set('position', node.position);
  if (node.data) nodeMap.set('data', node.data);
  if (typeof node.width === 'number') nodeMap.set('width', node.width);
  if (typeof node.height === 'number') nodeMap.set('height', node.height);
  if (!existing) nodesMap.set(node.id, nodeMap);
}

export function writeEdgeToMap(edgesMap: Y.Map<Y.Map<any>>, edge: { id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; type?: string; data?: any }) {
  const existing = edgesMap.get(edge.id);
  const edgeMap = existing ?? new Y.Map();
  edgeMap.set('id', edge.id);
  edgeMap.set('source', edge.source);
  edgeMap.set('target', edge.target);
  if (edge.sourceHandle != null) edgeMap.set('sourceHandle', edge.sourceHandle);
  if (edge.targetHandle != null) edgeMap.set('targetHandle', edge.targetHandle);
  if (edge.type) edgeMap.set('type', edge.type);
  if (edge.data) edgeMap.set('data', edge.data);
  if (!existing) edgesMap.set(edge.id, edgeMap);
}

export function resizeCanvasNode(doc: Y.Doc, id: string, width: number, height: number): boolean {
  const node = getNodesMap(doc).get(id);
  if (!node) return false;
  doc.transact(() => {
    node.set('width', Math.round(width));
    node.set('height', Math.round(height));
  }, 'local');
  return true;
}

export function deleteCanvasNodes(doc: Y.Doc, ids: Iterable<string>): string[] {
  const nodeIds = new Set(ids);
  if (nodeIds.size === 0) return [];
  const nodes = getNodesMap(doc);
  const edges = getEdgesMap(doc);
  const deletedEdgeIds: string[] = [];
  edges.forEach((edge, edgeId) => {
    if (nodeIds.has(edge.get('source')) || nodeIds.has(edge.get('target'))) deletedEdgeIds.push(edgeId);
  });
  doc.transact(() => {
    nodeIds.forEach((id) => nodes.delete(id));
    deletedEdgeIds.forEach((id) => edges.delete(id));
  }, 'local');
  return deletedEdgeIds;
}
