import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Loader2, Network, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useVerseStore } from '@/lib/store/useVerseStore';
import { ResizableNode } from './ResizableNode';
import { useNoWheelOnOverflow } from './useNoWheelOnOverflow';
import { CrossReferencePopover } from './CrossReferencePopover';
import { AiAskPopover } from './AiAskPopover';

export type VerseNodeData = {
  verseId: number;
  reference: string;
  version_id: number;
  text?: string;
};

type VerseNodeType = Node<VerseNodeData, 'verse'>;

export function VerseNode({ id, data, selected }: NodeProps<VerseNodeType>) {
  const { t } = useTranslation();
  const versions = useVerseStore((s) => s.versions);
  const readerVersionId = useVerseStore((s) => s.versionId);
  const versionName = versions.find((v) => v.id === data.version_id)?.abbreviation ?? '';
  const { ref: scrollRef, className: scrollClass } = useNoWheelOnOverflow<HTMLDivElement>();
  const xrefBtnRef = useRef<HTMLButtonElement>(null);
  const [xrefOpen, setXrefOpen] = useState(false);
  const aiBtnRef = useRef<HTMLButtonElement>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const versionBtnRef = useRef<HTMLButtonElement>(null);
  const versionMenuElRef = useRef<HTMLDivElement>(null);
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);
  const [switching, setSwitching] = useState(false);

  useLayoutEffect(() => {
    if (!versionMenuOpen || !versionBtnRef.current) return;
    let raf = 0;
    const tick = () => {
      const rect = versionBtnRef.current!.getBoundingClientRect();
      setMenuPos({ left: rect.left, top: rect.bottom + 4 });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [versionMenuOpen]);

  useEffect(() => {
    if (!versionMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as globalThis.Node | null;
      if (versionBtnRef.current?.contains(t)) return;
      if (versionMenuElRef.current?.contains(t)) return;
      setVersionMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVersionMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [versionMenuOpen]);

  const switchVersion = async (versionId: number) => {
    if (versionId === data.version_id || switching) return;
    setVersionMenuOpen(false);
    setSwitching(true);
    try {
      await (window as any).__studyCanvasActions?.setVerseNodeVersion?.(id, versionId);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <ResizableNode id={id} selected={selected} minWidth={240} minHeight={90}>
      <div
        className={cn(
          'group/verse relative bg-surface border border-border rounded-lg p-3 shadow-sm w-full h-full flex flex-col overflow-visible',
          selected && 'ring-2 ring-accent',
        )}
      >
        <Handle id="top" type="source" position={Position.Top} className="!bg-border" />
        <Handle id="right" type="source" position={Position.Right} className="!bg-border" />
        <Handle id="left" type="source" position={Position.Left} className="!bg-border" />

        <div className="flex items-center justify-between gap-2 mb-1 shrink-0">
          <div className="flex items-center gap-1 text-2xs uppercase tracking-wide min-w-0">
            <span className="text-accent truncate min-w-0">{data.reference}</span>
            <button
              ref={versionBtnRef}
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setVersionMenuOpen((v) => !v);
              }}
              className={cn(
                'nodrag cursor-pointer inline-flex items-center gap-0.5 px-1 py-0.5 rounded shrink-0',
                'text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors',
                versionMenuOpen && 'bg-bg-secondary text-text-primary',
                switching && 'opacity-60 cursor-wait',
              )}
              title={t('study.verseNode.changeVersion', 'Cambiar versión')}
              aria-label={t('study.verseNode.changeVersion', 'Cambiar versión')}
            >
              <span>({versionName || '…'})</span>
              {switching ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : (
                <ChevronDown className="w-2.5 h-2.5" />
              )}
            </button>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              ref={aiBtnRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAiOpen((v) => !v);
              }}
              className={cn(
                'nodrag cursor-pointer flex items-center justify-center w-6 h-6 rounded-md',
                'text-text-muted hover:text-accent hover:bg-accent/10 transition-colors',
                aiOpen && 'bg-accent/10 text-accent',
              )}
              title={t('study.verseNode.askAi', 'Preguntar a la IA')}
              aria-label={t('study.verseNode.askAi', 'Preguntar a la IA')}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <button
              ref={xrefBtnRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setXrefOpen((v) => !v);
              }}
              className={cn(
                'nodrag cursor-pointer flex items-center justify-center w-6 h-6 rounded-md',
                'text-text-muted hover:text-accent hover:bg-accent/10 transition-colors',
                xrefOpen && 'bg-accent/10 text-accent',
              )}
              title={t('study.verseNode.crossRefs')}
              aria-label={t('study.verseNode.crossRefs')}
            >
              <Network className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className={cn('text-sm leading-relaxed text-text-primary overflow-auto flex-1', scrollClass)}
        >
          {data.text || t('study.verseNode.loading')}
        </div>

        <Handle id="bottom" type="source" position={Position.Bottom} className="!bg-border" />

        {xrefOpen && (
          <CrossReferencePopover
            anchorEl={xrefBtnRef.current}
            sourceNodeId={id}
            verseId={data.verseId}
            reference={data.reference}
            verseText={data.text ?? ''}
            versionId={readerVersionId || data.version_id}
            onClose={() => setXrefOpen(false)}
          />
        )}

        {aiOpen && (
          <AiAskPopover
            anchorEl={aiBtnRef.current}
            sourceNodeId={id}
            verseId={data.verseId}
            reference={data.reference}
            verseText={data.text ?? ''}
            onClose={() => setAiOpen(false)}
          />
        )}

        {versionMenuOpen && menuPos && versions.length > 0 && createPortal(
          <div
            ref={versionMenuElRef}
            style={{ position: 'fixed', left: menuPos.left, top: menuPos.top, zIndex: 1000 }}
            className={cn(
              'bg-surface border border-border rounded-md shadow-lg',
              'py-1 min-w-[140px] max-h-64 overflow-y-auto',
            )}
          >
            {versions.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  switchVersion(v.id);
                }}
                className={cn(
                  'w-full text-left px-2.5 py-1.5 text-2xs cursor-pointer',
                  'hover:bg-bg-secondary transition-colors',
                  v.id === data.version_id
                    ? 'text-accent font-medium'
                    : 'text-text-secondary',
                )}
              >
                <span className="font-medium">{v.abbreviation}</span>
                <span className="text-text-muted ml-1.5 normal-case tracking-normal">
                  {v.name}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
      </div>
    </ResizableNode>
  );
}
