import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MousePointer2, Hand, StickyNote, BookOpen, Undo, Redo, ZoomIn, ZoomOut, Maximize2, Lock, Unlock, Pencil, Eraser, Minus, ArrowRight, Square, Circle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { modKey } from '@/lib/platform';
import { Tooltip } from '@/components/ui/Tooltip';
import { InsertVerseModal } from './InsertVerseModal';
import { useUIStore } from '@/lib/store/useUIStore';
import { DRAW_COLORS, DRAW_SIZES, type Tool } from './StudyMode';
import type { DrawSettings } from './DrawingLayer';
import type { StrokeKind } from '@/lib/study/strokes';

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
  drawSettings: DrawSettings;
  onDrawSettingsChange: (next: DrawSettings) => void;
}

const STROKE_KINDS: { kind: StrokeKind; icon: React.ReactNode; label: string }[] = [
  { kind: 'pen', icon: <Pencil className="w-3.5 h-3.5" />, label: 'Pen' },
  { kind: 'line', icon: <Minus className="w-3.5 h-3.5" />, label: 'Line' },
  { kind: 'arrow', icon: <ArrowRight className="w-3.5 h-3.5" />, label: 'Arrow' },
  { kind: 'rect', icon: <Square className="w-3.5 h-3.5" />, label: 'Rectangle' },
  { kind: 'ellipse', icon: <Circle className="w-3.5 h-3.5" />, label: 'Ellipse' },
];

export function StudyToolbar({ tool, onToolChange, showInsertVerse, onOpenInsertVerse, onCloseInsertVerse, biblePanelOpen, onToggleBiblePanel, isGuest, drawSettings, onDrawSettingsChange }: StudyToolbarProps) {
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

  const handleDraw = useCallback(() => {
    if (isGuest) { openAuthModal('login'); return; }
    onToolChange('draw');
  }, [isGuest, openAuthModal, onToolChange]);

  const handleErase = useCallback(() => {
    if (isGuest) { openAuthModal('login'); return; }
    onToolChange('erase');
  }, [isGuest, openAuthModal, onToolChange]);

  const drawPopoverOpen = tool === 'draw';

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

          {/* Draw */}
          <Tooltip label={isGuest ? 'Log in to edit' : 'Draw (D)'} side="right">
            <ToolbarButton icon={<Pencil className="w-4 h-4" />} active={tool === 'draw'} onClick={handleDraw} disabled={isGuest} />
          </Tooltip>
          <Tooltip label={isGuest ? 'Log in to edit' : 'Eraser (E)'} side="right">
            <ToolbarButton icon={<Eraser className="w-4 h-4" />} active={tool === 'erase'} onClick={handleErase} disabled={isGuest} />
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

      {drawPopoverOpen && (
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 z-10 transition-all duration-300',
            biblePanelOpen ? 'left-[492px]' : 'left-[60px]',
          )}
        >
          <div className="rounded-2xl bg-surface/95 backdrop-blur shadow-lg border border-border p-2 flex flex-col gap-2 min-w-[160px]">
            <div className="text-2xs uppercase tracking-wide text-text-muted px-1">Brush</div>
            <div className="flex gap-1">
              {STROKE_KINDS.map(({ kind, icon, label }) => (
                <Tooltip key={kind} label={label} side="bottom">
                  <button
                    onClick={() => onDrawSettingsChange({ ...drawSettings, kind })}
                    className={cn(
                      'w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors',
                      drawSettings.kind === kind && 'text-accent bg-bg-tertiary',
                    )}
                  >
                    {icon}
                  </button>
                </Tooltip>
              ))}
            </div>

            <div className="text-2xs uppercase tracking-wide text-text-muted px-1 mt-1">Color</div>
            <div className="flex gap-1.5 px-1">
              {DRAW_COLORS.map((c, i) => (
                <Tooltip key={c} label={`${i + 1}`} side="bottom">
                  <button
                    onClick={() => onDrawSettingsChange({ ...drawSettings, color: c })}
                    className={cn(
                      'w-5 h-5 rounded-full border transition-transform',
                      drawSettings.color === c ? 'border-text-primary scale-110' : 'border-border',
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${i + 1}`}
                  />
                </Tooltip>
              ))}
            </div>

            <div className="text-2xs uppercase tracking-wide text-text-muted px-1 mt-1">Size</div>
            <div className="flex gap-1.5 items-center px-1">
              {DRAW_SIZES.map((sz, i) => (
                <Tooltip key={sz} label={`${i === 0 ? 'Small' : i === 1 ? 'Medium' : 'Large'} ([ ])`} side="bottom">
                  <button
                    onClick={() => onDrawSettingsChange({ ...drawSettings, size: sz })}
                    className={cn(
                      'h-7 px-2 rounded-md flex items-center justify-center hover:bg-bg-tertiary transition-colors',
                      drawSettings.size === sz && 'bg-bg-tertiary',
                    )}
                  >
                    <span
                      className="rounded-full"
                      style={{
                        width: sz * 1.6,
                        height: sz * 1.6,
                        backgroundColor: drawSettings.color,
                      }}
                    />
                  </button>
                </Tooltip>
              ))}
            </div>

            {(drawSettings.kind === 'rect' || drawSettings.kind === 'ellipse') && (
              <>
                <div className="h-px bg-border" />
                <label className="flex items-center gap-2 px-1 text-xs text-text-secondary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={drawSettings.filled}
                    onChange={(e) => onDrawSettingsChange({ ...drawSettings, filled: e.target.checked })}
                    className="accent-accent"
                  />
                  Filled
                </label>
              </>
            )}
          </div>
        </div>
      )}

      <InsertVerseModal open={showInsertVerse} onClose={onCloseInsertVerse} />
    </>
  );
}
