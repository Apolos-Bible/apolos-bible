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
  const nodeMap = nodesMap.get(node.id) ?? new Y.Map();
  nodeMap.set('id', node.id);
  if (node.type) nodeMap.set('type', node.type);
  if (node.position) nodeMap.set('position', node.position);
  if (node.data) nodeMap.set('data', node.data);
  if (typeof node.width === 'number') nodeMap.set('width', node.width);
  if (typeof node.height === 'number') nodeMap.set('height', node.height);
  nodesMap.set(node.id, nodeMap);
}

export function writeEdgeToMap(edgesMap: Y.Map<Y.Map<any>>, edge: { id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; type?: string; data?: any }) {
  const edgeMap = edgesMap.get(edge.id) ?? new Y.Map();
  edgeMap.set('id', edge.id);
  edgeMap.set('source', edge.source);
  edgeMap.set('target', edge.target);
  if (edge.sourceHandle != null) edgeMap.set('sourceHandle', edge.sourceHandle);
  if (edge.targetHandle != null) edgeMap.set('targetHandle', edge.targetHandle);
  if (edge.type) edgeMap.set('type', edge.type);
  if (edge.data) edgeMap.set('data', edge.data);
  edgesMap.set(edge.id, edgeMap);
}
