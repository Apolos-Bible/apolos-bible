import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { exportStudyToText } from '../exportStudy';
import { getNodesMap, nodeFromYMap, writeNodeToMap } from '../yDocHelpers';

describe('board file nodes', () => {
  it('round-trips file metadata and dimensions through the shared Yjs document', () => {
    const doc = new Y.Doc();
    const data = {
      fileId: 'file-uuid',
      name: 'mapa.png',
      mimeType: 'image/png',
      size: 2048,
      contentUrl: 'https://apolos.io/api/study-files/file-uuid/content?signature=test',
    };

    writeNodeToMap(getNodesMap(doc), {
      id: 'file-node-1',
      type: 'file',
      position: { x: 120, y: 80 },
      width: 420,
      height: 300,
      data,
    });

    const stored = getNodesMap(doc).get('file-node-1');
    expect(stored).toBeDefined();
    expect(nodeFromYMap('file-node-1', stored!)).toMatchObject({
      id: 'file-node-1',
      type: 'file',
      position: { x: 120, y: 80 },
      width: 420,
      height: 300,
      data,
    });
  });

  it('includes attached files in text exports', () => {
    const doc = new Y.Doc();
    writeNodeToMap(getNodesMap(doc), {
      id: 'file-node-1',
      type: 'file',
      position: { x: 0, y: 0 },
      data: {
        fileId: 'file-uuid',
        name: 'guia.pdf',
        mimeType: 'application/pdf',
        size: 4096,
        contentUrl: 'https://apolos.io/signed-file',
      },
    });

    const exported = exportStudyToText({ doc, title: 'Compartido' });
    expect(exported).toContain('Archivo — guia.pdf');
    expect(exported).toContain('application/pdf · 4096 bytes');
    expect(exported).not.toContain('https://apolos.io/signed-file');
  });

  it('persists sandboxed web-page nodes as the same collaborative file type', () => {
    const doc = new Y.Doc();
    writeNodeToMap(getNodesMap(doc), {
      id: 'link-node-1',
      type: 'file',
      position: { x: 40, y: 60 },
      width: 560,
      height: 400,
      data: {
        kind: 'link',
        fileId: 'link-uuid',
        name: 'example.com',
        mimeType: 'text/html',
        size: 0,
        contentUrl: 'https://example.com/',
      },
    });

    const stored = getNodesMap(doc).get('link-node-1');
    expect(nodeFromYMap('link-node-1', stored!)).toMatchObject({
      type: 'file',
      width: 560,
      height: 400,
      data: { kind: 'link', contentUrl: 'https://example.com/' },
    });
  });

  it('persists external-only links without turning them back into iframes', () => {
    const doc = new Y.Doc();
    writeNodeToMap(getNodesMap(doc), {
      id: 'external-link-1',
      type: 'file',
      position: { x: 0, y: 0 },
      data: {
        kind: 'link',
        linkMode: 'external',
        fileId: 'link-uuid',
        name: 'blocked.example',
        mimeType: 'text/html',
        size: 0,
        contentUrl: 'https://blocked.example/',
      },
    });

    const stored = getNodesMap(doc).get('external-link-1');
    expect(nodeFromYMap('external-link-1', stored!)).toMatchObject({
      type: 'file',
      data: { kind: 'link', linkMode: 'external' },
    });
  });
});
