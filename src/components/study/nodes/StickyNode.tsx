import { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { Settings2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { StudyDocContext } from '@/lib/study/StudyDocContext';
import { getNodesMap } from '@/lib/study/yDocHelpers';
import { ResizableNode } from './ResizableNode';
import { useNoWheelOnOverflow } from './useNoWheelOnOverflow';

const STICKY_COLORS = [
  { value: 'yellow', bg: 'bg-yellow-500/10 border-yellow-500/30', swatch: 'bg-yellow-500', colorKey: 'study.colorYellow' },
  { value: 'blue',   bg: 'bg-blue-500/10 border-blue-500/30',     swatch: 'bg-blue-500',   colorKey: 'study.colorBlue' },
  { value: 'green',  bg: 'bg-green-500/10 border-green-500/30',   swatch: 'bg-green-500',  colorKey: 'study.colorGreen' },
  { value: 'pink',   bg: 'bg-pink-500/10 border-pink-500/30',     swatch: 'bg-pink-500',   colorKey: 'study.colorPink' },
];

export type StickyNodeData = {
  text: string;
  color: string;
};

type StickyNodeType = Node<StickyNodeData, 'sticky'>;

export function StickyNode({ id, data, selected }: NodeProps<StickyNodeType>) {
  const { t } = useTranslation();
  const doc = useContext(StudyDocContext);

  const [text, setText] = useState(data.text ?? '');
  const [color, setColor] = useState(data.color ?? 'yellow');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { ref: textareaRef, className: textareaWheelClass } = useNoWheelOnOverflow<HTMLTextAreaElement>();
  const settingsRef = useRef<HTMLDivElement>(null);

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

useEffect(() => {
    if (!settingsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!settingsRef.current?.contains(e.target as Node | null)) {
        setSettingsOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [settingsOpen]);

  const colorStyle = STICKY_COLORS.find((c) => c.value === color) ?? STICKY_COLORS[0];

  return (
    <ResizableNode id={id} selected={selected} minWidth={180} minHeight={90}>
    <div
      className={cn(
        'group/sticky relative rounded-lg border shadow-sm w-full h-full flex flex-col',
        'cursor-grab active:cursor-grabbing transition-shadow',
        colorStyle.bg,
        selected && 'ring-2 ring-accent shadow-md',
      )}
    >
      <Handle id="top" type="source" position={Position.Top} className="!bg-border" />
      <Handle id="right" type="source" position={Position.Right} className="!bg-border" />
      <Handle id="left" type="source" position={Position.Left} className="!bg-border" />

      {/* Drag handle bar */}
      <div
        className={cn(
          'flex items-center justify-center h-4 rounded-t-lg',
          'cursor-grab active:cursor-grabbing',
          'opacity-0 group-hover/sticky:opacity-100 transition-opacity',
          selected && 'opacity-100',
        )}
        title={t('study.sticky.dragHandle', 'Arrastrar')}
      >
        <div className="flex gap-0.5 opacity-50">
          <span className="w-1 h-1 rounded-full bg-current" />
          <span className="w-1 h-1 rounded-full bg-current" />
          <span className="w-1 h-1 rounded-full bg-current" />
          <span className="w-1 h-1 rounded-full bg-current" />
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        className={cn('nodrag cursor-text flex-1 min-h-[60px] w-full bg-transparent border-none outline-none resize-none text-sm text-text-primary px-3 pb-3 pt-1 placeholder:text-text-muted leading-relaxed', textareaWheelClass)}
        placeholder={t('study.sticky.placeholder')}
      />

      {/* Settings button */}
      <div
        ref={settingsRef}
        className={cn(
          'nodrag absolute bottom-1.5 right-1.5',
          'opacity-0 group-hover/sticky:opacity-100 focus-within:opacity-100 transition-opacity',
          (selected || settingsOpen) && 'opacity-100',
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSettingsOpen((o) => !o);
          }}
          className={cn(
            'cursor-pointer flex items-center justify-center w-6 h-6 rounded-md',
            'text-text-muted hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-colors',
            settingsOpen && 'bg-black/5 dark:bg-white/10 text-text-primary',
          )}
          title={t('study.sticky.settings', 'Opciones')}
          aria-label={t('study.sticky.settings', 'Opciones')}
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>

        {settingsOpen && (
          <div
            className={cn(
              'absolute bottom-full right-0 mb-1.5 z-10',
              'bg-surface border border-border rounded-lg shadow-lg',
              'p-2 flex items-center gap-1.5',
            )}
          >
            {STICKY_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleColorChange(c.value);
                }}
                className={cn(
                  'cursor-pointer w-5 h-5 rounded-full transition-transform hover:scale-110',
                  c.swatch,
                  color === c.value && 'ring-2 ring-text-primary ring-offset-2 ring-offset-surface',
                )}
                title={t(c.colorKey)}
                aria-label={t(c.colorKey)}
              />
            ))}
          </div>
        )}
      </div>

      <Handle id="bottom" type="source" position={Position.Bottom} className="!bg-border" />
    </div>
    </ResizableNode>
  );
}
