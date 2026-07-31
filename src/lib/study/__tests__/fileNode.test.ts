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
    expect(exported).toContain('https://apolos.io/signed-file');
  });
});
