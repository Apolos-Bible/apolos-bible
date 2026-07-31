import { StickyNode } from './StickyNode';
import { VerseNode } from './VerseNode';
import { PassageNode } from './PassageNode';
import { CommentNode } from './CommentNode';
import { AiNoteNode } from './AiNoteNode';
import { DrawingNode } from './DrawingNode';
import { FileNode } from './FileNode';

export const studyNodeTypes = {
  sticky: StickyNode,
  verse: VerseNode,
  passage: PassageNode,
  comment: CommentNode,
  'ai-note': AiNoteNode,
  drawing: DrawingNode,
  file: FileNode,
};
