import * as Y from 'yjs';

export function getNodesMap(doc: Y.Doc): Y.Map<Y.Map<any>> {
  return doc.getMap('nodes');
}

export function getEdgesMap(doc: Y.Doc): Y.Map<Y.Map<any>> {
  return doc.getMap('edges');
}

export function nodeFromYMap(id: string, m: Y.Map<any>) {
  return {
    id: m.get('id') ?? id,
    type: m.get('type') ?? 'sticky',
    position: m.get('position') ?? { x: 0, y: 0 },
    data: m.get('data') ?? {},
  };
}

export function edgeFromYMap(id: string, m: Y.Map<any>) {
  return {
    id: m.get('id') ?? id,
    source: m.get('source') ?? '',
    target: m.get('target') ?? '',
    type: m.get('type') ?? 'default',
    data: m.get('data') ?? {},
  };
}

export function writeNodeToMap(nodesMap: Y.Map<Y.Map<any>>, node: { id: string; type?: string; position?: { x: number; y: number }; data?: any }) {
  const nodeMap = nodesMap.get(node.id) ?? new Y.Map();
  nodeMap.set('id', node.id);
  if (node.type) nodeMap.set('type', node.type);
  if (node.position) nodeMap.set('position', node.position);
  if (node.data) nodeMap.set('data', node.data);
  nodesMap.set(node.id, nodeMap);
}

export function writeEdgeToMap(edgesMap: Y.Map<Y.Map<any>>, edge: { id: string; source: string; target: string; type?: string; data?: any }) {
  const edgeMap = edgesMap.get(edge.id) ?? new Y.Map();
  edgeMap.set('id', edge.id);
  edgeMap.set('source', edge.source);
  edgeMap.set('target', edge.target);
  if (edge.type) edgeMap.set('type', edge.type);
  if (edge.data) edgeMap.set('data', edge.data);
  edgesMap.set(edge.id, edgeMap);
}
