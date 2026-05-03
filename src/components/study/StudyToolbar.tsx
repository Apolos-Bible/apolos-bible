import { useCallback, useState } from 'react';
import { MousePointer2, Hand, StickyNote, BookOpen, Undo, Redo, ZoomIn, ZoomOut, Maximize2, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Tooltip } from '@/components/ui/Tooltip';
import { InsertVerseModal } from './InsertVerseModal';
import type { Tool } from './StudyMode';

function ToolbarButton({
  icon, active, onClick,
}: {
  icon: React.ReactNode; active?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors',
        active && 'text-accent bg-bg-tertiary',
      )}
    >
      {icon}
    </button>
  );
}

interface StudyToolbarProps {
  tool: Tool;
  onToolChange: (t: Tool) => void;
  showInsertVerse: boolean;
  onOpenInsertVerse: () => void;
  onCloseInsertVerse: () => void;
  biblePanelOpen: boolean;
  onToggleBiblePanel: () => void;
}

export function StudyToolbar({ tool, onToolChange, showInsertVerse, onOpenInsertVerse, onCloseInsertVerse, biblePanelOpen, onToggleBiblePanel }: StudyToolbarProps) {
  const getActions = useCallback(() => (window as any).__studyCanvasActions, []);
  const [locked, setLocked] = useState(false);

  const handleSticky = useCallback(() => {
    getActions()?.addStickyNote?.();
    onToolChange('select');
  }, [getActions, onToolChange]);

  const handleVerse = useCallback(() => {
    onToolChange('verse');
    onOpenInsertVerse();
  }, [onToolChange, onOpenInsertVerse]);

  const handleUndo = useCallback(() => getActions()?.undo?.(), [getActions]);
  const handleRedo = useCallback(() => getActions()?.redo?.(), [getActions]);

  const handleLock = useCallback(() => {
    setLocked(v => !v);
    getActions()?.toggleLock?.();
  }, [getActions]);

  return (
    <>
      <div className={cn(
        'absolute top-1/2 -translate-y-1/2 z-10 transition-all duration-300',
        biblePanelOpen ? 'left-[436px]' : 'left-4',
      )}>
        <div className="rounded-2xl bg-surface/90 backdrop-blur shadow-lg p-1.5 flex flex-col gap-1">
          {/* Tools */}
          <Tooltip label="Select (V)" side="right">
            <ToolbarButton icon={<MousePointer2 className="w-4 h-4" />} active={tool === 'select'} onClick={() => onToolChange('select')} />
          </Tooltip>
          <Tooltip label="Hand (H)" side="right">
            <ToolbarButton icon={<Hand className="w-4 h-4" />} active={tool === 'hand'} onClick={() => onToolChange('hand')} />
          </Tooltip>

          <div className="h-px bg-border mx-1" />

          {/* Create */}
          <Tooltip label="Sticky Note (N)" side="right">
            <ToolbarButton icon={<StickyNote className="w-4 h-4" />} active={tool === 'sticky'} onClick={handleSticky} />
          </Tooltip>
          <Tooltip label="Insert Verse (I)" side="right">
            <ToolbarButton
              icon={
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                  <path d="M3 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3V2Z" strokeLinejoin="round"/>
                  <path d="M3 2v10" />
                  <path d="M12 6h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              active={tool === 'verse'}
              onClick={handleVerse}
            />
          </Tooltip>

          <div className="h-px bg-border mx-1" />

          {/* Bible */}
          <Tooltip label="Bible (B)" side="right">
            <ToolbarButton
              icon={<BookOpen className="w-4 h-4" />}
              active={biblePanelOpen}
              onClick={onToggleBiblePanel}
            />
          </Tooltip>

          <div className="h-px bg-border mx-1" />

          {/* History */}
          <Tooltip label="Undo (Ctrl+Z)" side="right">
            <ToolbarButton icon={<Undo className="w-4 h-4" />} onClick={handleUndo} />
          </Tooltip>
          <Tooltip label="Redo (Ctrl+Shift+Z)" side="right">
            <ToolbarButton icon={<Redo className="w-4 h-4" />} onClick={handleRedo} />
          </Tooltip>

          <div className="h-px bg-border mx-1" />

          {/* View controls */}
          <Tooltip label="Zoom In" side="right">
            <ToolbarButton icon={<ZoomIn className="w-4 h-4" />} onClick={() => getActions()?.zoomIn?.()} />
          </Tooltip>
          <Tooltip label="Zoom Out" side="right">
            <ToolbarButton icon={<ZoomOut className="w-4 h-4" />} onClick={() => getActions()?.zoomOut?.()} />
          </Tooltip>
          <Tooltip label="Fit View" side="right">
            <ToolbarButton icon={<Maximize2 className="w-4 h-4" />} onClick={() => getActions()?.fitView?.()} />
          </Tooltip>
          <Tooltip label={locked ? 'Unlock' : 'Lock'} side="right">
            <ToolbarButton
              icon={locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              active={locked}
              onClick={handleLock}
            />
          </Tooltip>
        </div>
      </div>

      <InsertVerseModal open={showInsertVerse} onClose={onCloseInsertVerse} />
    </>
  );
}
