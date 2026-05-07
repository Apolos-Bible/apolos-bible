import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MousePointer2, Hand, StickyNote, BookOpen, Undo, Redo, ZoomIn, ZoomOut, Maximize2, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { modKey } from '@/lib/platform';
import { Tooltip } from '@/components/ui/Tooltip';
import { InsertVerseModal } from './InsertVerseModal';
import { useUIStore } from '@/lib/store/useUIStore';
import type { Tool } from './StudyMode';

function ToolbarButton({
  icon, active, onClick, disabled,
}: {
  icon: React.ReactNode; active?: boolean; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors',
        active && 'text-accent bg-bg-tertiary',
        disabled && 'opacity-40 cursor-not-allowed hover:text-text-secondary hover:bg-transparent',
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
  isGuest: boolean;
}

export function StudyToolbar({ tool, onToolChange, showInsertVerse, onOpenInsertVerse, onCloseInsertVerse, biblePanelOpen, onToggleBiblePanel, isGuest }: StudyToolbarProps) {
  const { t } = useTranslation();
  const getActions = useCallback(() => (window as any).__studyCanvasActions, []);
  const openAuthModal = useUIStore(s => s.openAuthModal);
  const [locked, setLocked] = useState(false);

  const handleSticky = useCallback(() => {
    if (isGuest) { openAuthModal('login'); return; }
    getActions()?.addStickyNote?.();
    onToolChange('select');
  }, [getActions, onToolChange, isGuest, openAuthModal]);

  const handleVerse = useCallback(() => {
    if (isGuest) { openAuthModal('login'); return; }
    onToolChange('verse');
    onOpenInsertVerse();
  }, [onToolChange, onOpenInsertVerse, isGuest, openAuthModal]);

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
          <Tooltip label={t('study.toolbar.select')} side="right">
            <ToolbarButton icon={<MousePointer2 className="w-4 h-4" />} active={tool === 'select'} onClick={() => onToolChange('select')} />
          </Tooltip>
          <Tooltip label={t('study.toolbar.hand')} side="right">
            <ToolbarButton icon={<Hand className="w-4 h-4" />} active={tool === 'hand'} onClick={() => onToolChange('hand')} />
          </Tooltip>

          <div className="h-px bg-border mx-1" />

          {/* Create */}
          <Tooltip label={isGuest ? 'Log in to edit' : t('study.toolbar.stickyNote')} side="right">
            <ToolbarButton icon={<StickyNote className="w-4 h-4" />} active={tool === 'sticky'} onClick={handleSticky} disabled={isGuest} />
          </Tooltip>
          <Tooltip label={isGuest ? 'Log in to edit' : t('study.toolbar.insertVerse')} side="right">
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
              disabled={isGuest}
            />
          </Tooltip>

          <div className="h-px bg-border mx-1" />

          {/* Bible */}
          <Tooltip label={t('study.toolbar.bible')} side="right">
            <ToolbarButton
              icon={<BookOpen className="w-4 h-4" />}
              active={biblePanelOpen}
              onClick={onToggleBiblePanel}
            />
          </Tooltip>

          {!isGuest && <div className="h-px bg-border mx-1" />}

          {/* History */}
          {!isGuest && <Tooltip label={t('study.toolbar.undo', { modKey })} side="right">
            <ToolbarButton icon={<Undo className="w-4 h-4" />} onClick={handleUndo} />
          </Tooltip>}
          {!isGuest && <Tooltip label={t('study.toolbar.redo', { modKey })} side="right">
            <ToolbarButton icon={<Redo className="w-4 h-4" />} onClick={handleRedo} />
          </Tooltip>}

          {!isGuest && <div className="h-px bg-border mx-1" />}

          {/* View controls */}
          <Tooltip label={t('study.toolbar.zoomIn')} side="right">
            <ToolbarButton icon={<ZoomIn className="w-4 h-4" />} onClick={() => getActions()?.zoomIn?.()} />
          </Tooltip>
          <Tooltip label={t('study.toolbar.zoomOut')} side="right">
            <ToolbarButton icon={<ZoomOut className="w-4 h-4" />} onClick={() => getActions()?.zoomOut?.()} />
          </Tooltip>
          <Tooltip label={t('study.toolbar.fitView')} side="right">
            <ToolbarButton icon={<Maximize2 className="w-4 h-4" />} onClick={() => getActions()?.fitView?.()} />
          </Tooltip>
          <Tooltip label={locked ? t('study.toolbar.unlock') : t('study.toolbar.lock')} side="right">
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
