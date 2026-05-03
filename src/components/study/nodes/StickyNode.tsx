import { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { cn } from '@/lib/cn';
import { StudyDocContext } from '@/lib/study/StudyDocContext';
import { getNodesMap } from '@/lib/study/yDocHelpers';

const STICKY_COLORS = [
  { value: 'yellow', bg: 'bg-yellow-500/10 border-yellow-500/30', name: 'Yellow' },
  { value: 'blue', bg: 'bg-blue-500/10 border-blue-500/30', name: 'Blue' },
  { value: 'green', bg: 'bg-green-500/10 border-green-500/30', name: 'Green' },
  { value: 'pink', bg: 'bg-pink-500/10 border-pink-500/30', name: 'Pink' },
];

export type StickyNodeData = {
  text: string;
  color: string;
};

type StickyNodeType = Node<StickyNodeData, 'sticky'>;

export function StickyNode({ id, data, selected }: NodeProps<StickyNodeType>) {
  const doc = useContext(StudyDocContext);

  const [text, setText] = useState(data.text ?? '');
  const [color, setColor] = useState(data.color ?? 'yellow');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Listen to Yjs changes from other clients
  useEffect(() => {
    if (!doc) return;
    const nodesMap = getNodesMap(doc);
    const nodeMap = nodesMap.get(id);
    if (!nodeMap) return;
    const handler = () => {
      const d = nodeMap.get('data');
      if (d && typeof d === 'object') {
        setText(d.text ?? '');
        setColor(d.color ?? 'yellow');
      }
    };
    nodeMap.observe(handler);
    return () => {
      nodeMap.unobserve(handler);
    };
  }, [doc, id]);

  // Write local changes to Yjs (debounced for typing)
  const writeToYjs = useCallback(
    (newText: string, newColor: string) => {
      if (!doc) return;
      const nodesMap = getNodesMap(doc);
      const nodeMap = nodesMap.get(id);
      if (!nodeMap) return;
      doc.transact(() => {
        nodeMap.set('data', { text: newText, color: newColor });
      });
    },
    [doc, id],
  );

  const handleTextChange = useCallback(
    (val: string) => {
      setText(val);
      writeToYjs(val, color);
    },
    [color, writeToYjs],
  );

  const handleColorChange = useCallback(
    (c: string) => {
      setColor(c);
      writeToYjs(text, c);
    },
    [text, writeToYjs],
  );

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const colorStyle = STICKY_COLORS.find((c) => c.value === color) ?? STICKY_COLORS[0];

  return (
    <div
      className={cn(
        'rounded-lg border shadow-sm min-w-[200px] max-w-[320px]',
        colorStyle.bg,
        selected && 'ring-2 ring-accent',
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-border" />

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        className="w-full bg-transparent border-none outline-none resize-none text-sm text-text-primary p-3 placeholder:text-text-muted"
        placeholder="Write a note..."
        rows={1}
      />

      <div className="flex items-center gap-1 px-2 pb-2">
        {STICKY_COLORS.map((c) => (
          <button
            key={c.value}
            onClick={() => handleColorChange(c.value)}
            className={cn(
              'w-5 h-5 rounded-full border-2 transition-all',
              c.value === 'yellow' && 'bg-yellow-500/80 border-yellow-500',
              c.value === 'blue' && 'bg-blue-500/80 border-blue-500',
              c.value === 'green' && 'bg-green-500/80 border-green-500',
              c.value === 'pink' && 'bg-pink-500/80 border-pink-500',
              color === c.value && 'ring-1 ring-text-primary ring-offset-1 ring-offset-bg-primary',
            )}
            title={c.name}
          />
        ))}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-border" />
    </div>
  );
}
