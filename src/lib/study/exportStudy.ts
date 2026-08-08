import * as Y from 'yjs';
import { getNodesMap, getEdgesMap } from './yDocHelpers';

type RawNode = {
  id: string;
  type: string;
  data: any;
  position: { x: number; y: number };
};

type LabeledNode = RawNode & { index: number; label: string };

function truncate(s: string, n: number): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > n ? `${flat.slice(0, n - 1)}…` : flat;
}

function labelFor(node: RawNode): string {
  const d = node.data ?? {};
  switch (node.type) {
    case 'sticky':
      return d.text ? `Nota: "${truncate(d.text, 40)}"` : 'Nota adhesiva';
    case 'verse':
      return d.reference ? `Versículo ${d.reference}` : 'Versículo';
    case 'passage':
      return d.reference ? `Pasaje ${d.reference}` : 'Pasaje';
    case 'comment':
      return `Comentario de ${d.authorName ?? 'desconocido'}`;
    case 'ai-note':
      return d.sourceReference ? `Nota IA (${d.sourceReference})` : 'Nota IA';
    case 'file':
      return d.name ? `Archivo ${d.name}` : 'Archivo';
    case 'drawing':
      return 'Dibujo';
    default:
      return node.type;
  }
}

function renderNode(node: LabeledNode): string | null {
  const d = node.data ?? {};
  const head = `[#${node.index}]`;
  switch (node.type) {
    case 'sticky': {
      const color = d.color ? ` (color: ${d.color})` : '';
      const text = (d.text ?? '').toString();
      return `${head} Nota adhesiva${color}\n${text || '(vacía)'}`;
    }
    case 'verse': {
      const ref = d.reference ?? '(sin referencia)';
      const text = d.text ?? '(texto no cargado)';
      return `${head} Versículo — ${ref}\n${text}`;
    }
    case 'passage': {
      const ref = d.reference ?? '(sin referencia)';
      const verses = Array.isArray(d.verses) ? d.verses : [];
      const body = verses.length
        ? verses.map((v: any) => `  ${v.verse}. ${v.text}`).join('\n')
        : '  (versículos no cargados)';
      return `${head} Pasaje — ${ref}\n${body}`;
    }
    case 'comment': {
      const author = d.authorName ?? 'desconocido';
      const date = d.createdAt ? ` · ${d.createdAt}` : '';
      const text = d.text ?? '';
      return `${head} Comentario de ${author}${date}\n${text}`;
    }
    case 'ai-note': {
      const src = d.sourceReference ? ` (sobre ${d.sourceReference})` : '';
      const q = d.question ?? '';
      const a = d.answer ?? '';
      return `${head} Nota IA${src}\nPregunta: ${q}\nRespuesta: ${a}`;
    }
    case 'file': {
      const name = d.name ?? '(sin nombre)';
      const mime = d.mimeType ?? 'application/octet-stream';
      const size = typeof d.size === 'number' ? ` · ${d.size} bytes` : '';
      // Signed upload URLs are bearer capabilities for private objects and
      // must not escape through a copied export. Public link nodes are
      // deliberate user-authored content, so their destination is retained.
      const url = d.kind === 'link' && d.contentUrl ? `\n${d.contentUrl}` : '';
      return `${head} Archivo — ${name}\n${mime}${size}${url}`;
    }
    case 'drawing':
      return null;
    default:
      // Unknown collaborative types may carry internal or private metadata.
      return `${head} ${node.type}`;
  }
}

export type ExportStudyInput = {
  doc: Y.Doc;
  title?: string | null;
};

export function exportStudyToText({ doc, title }: ExportStudyInput): string {
  const nodesMap = getNodesMap(doc);
  const edgesMap = getEdgesMap(doc);

  const raw: RawNode[] = [];
  nodesMap.forEach((m, id) => {
    const type = (m.get('type') as string) ?? 'sticky';
    if (type === 'drawing') return;
    raw.push({
      id: (m.get('id') as string) ?? id,
      type,
      data: m.get('data') ?? {},
      position: (m.get('position') as { x: number; y: number }) ?? { x: 0, y: 0 },
    });
  });

  raw.sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);

  const nodes: LabeledNode[] = raw.map((n, i) => ({
    ...n,
    index: i + 1,
    label: labelFor(n),
  }));

  const byId = new Map<string, LabeledNode>();
  nodes.forEach((n) => byId.set(n.id, n));

  const lines: string[] = [];
  lines.push(`# Estudio: ${title?.trim() || '(sin título)'}`);
  lines.push(`Exportado: ${new Date().toISOString()}`);
  lines.push('');

  if (nodes.length === 0) {
    lines.push('(Este estudio no tiene nodos.)');
  } else {
    lines.push(`## Nodos (${nodes.length})`);
    lines.push('');
    for (const n of nodes) {
      const rendered = renderNode(n);
      if (rendered) {
        lines.push(rendered);
        lines.push('');
      }
    }
  }

  const edges: { source: string; target: string; sourceHandle?: string; targetHandle?: string }[] = [];
  edgesMap.forEach((m) => {
    const source = m.get('source') as string | undefined;
    const target = m.get('target') as string | undefined;
    if (!source || !target) return;
    edges.push({
      source,
      target,
      sourceHandle: m.get('sourceHandle') as string | undefined,
      targetHandle: m.get('targetHandle') as string | undefined,
    });
  });

  const visible = edges.filter((e) => byId.has(e.source) && byId.has(e.target));
  if (visible.length > 0) {
    lines.push(`## Conexiones (${visible.length})`);
    lines.push('');
    for (const e of visible) {
      const s = byId.get(e.source)!;
      const t = byId.get(e.target)!;
      lines.push(`[#${s.index}] ${s.label}  →  [#${t.index}] ${t.label}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function studyHasContent(doc: Y.Doc): boolean {
  const nodesMap = getNodesMap(doc);
  let hasNonDrawing = false;
  nodesMap.forEach((m) => {
    if (hasNonDrawing) return;
    const type = (m.get('type') as string) ?? 'sticky';
    if (type !== 'drawing') hasNonDrawing = true;
  });
  return hasNonDrawing;
}
