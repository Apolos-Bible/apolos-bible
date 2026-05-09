import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Send, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { aiApi } from '@/lib/aiApi';

const POPOVER_WIDTH = 360;
const ANCHOR_GAP = 6;

type Position = { left: number; top: number };

type AiAskPopoverProps = {
  anchorEl: HTMLElement | null;
  sourceNodeId: string;
  verseId: number;
  reference: string;
  verseText: string;
  onClose: () => void;
};

function computePosition(rect: DOMRect): Position {
  const vw = window.innerWidth;
  const margin = 8;
  let left = rect.left;
  if (left + POPOVER_WIDTH + margin > vw) {
    left = Math.max(margin, vw - POPOVER_WIDTH - margin);
  }
  if (left < margin) left = margin;
  return { left, top: rect.bottom + ANCHOR_GAP };
}

export function AiAskPopover({
  anchorEl,
  sourceNodeId,
  verseId,
  reference,
  verseText,
  onClose,
}: AiAskPopoverProps) {
  const { t } = useTranslation();
  const [pos, setPos] = useState<Position | null>(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (!anchorEl) return;
    let raf = 0;
    let lastKey = '';
    const tick = () => {
      const rect = anchorEl.getBoundingClientRect();
      const key = `${rect.left}|${rect.top}|${rect.right}|${rect.bottom}`;
      if (key !== lastKey) {
        lastKey = key;
        setPos(computePosition(rect));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anchorEl]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as globalThis.Node | null;
      if (containerRef.current?.contains(target)) return;
      if (anchorEl?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [anchorEl, onClose, loading]);

  const submit = async (override?: string) => {
    const q = (override ?? question).trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiApi.verseQuestion({
        verse_id: verseId,
        reference,
        text: verseText,
        question: q,
      });
      (window as any).__studyCanvasActions?.addAiNoteNode?.(sourceNodeId, {
        question: q,
        answer: res.answer,
        reference,
      });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? t('study.aiAsk.error', 'Algo falló al consultar la IA.'));
    } finally {
      setLoading(false);
    }
  };

  const presets: Array<{ key: string; label: string; question: string }> = [
    {
      key: 'historical',
      label: t('study.aiAsk.preset.historical', 'Contexto histórico'),
      question: '¿Cuál es el contexto histórico de este versículo? ¿Qué estaba pasando en esa época?',
    },
    {
      key: 'literary',
      label: t('study.aiAsk.preset.literary', 'Contexto literario'),
      question: '¿Cuál es el contexto literario de este versículo dentro del libro y del pasaje en el que aparece?',
    },
    {
      key: 'cultural',
      label: t('study.aiAsk.preset.cultural', 'Contexto cultural'),
      question: '¿Qué costumbres, prácticas o referencias culturales del mundo bíblico ayudan a entender este versículo?',
    },
    {
      key: 'meaning',
      label: t('study.aiAsk.preset.meaning', '¿Qué significa?'),
      question: '¿Qué significa este versículo? Explícalo de forma clara y directa.',
    },
    {
      key: 'original',
      label: t('study.aiAsk.preset.original', 'Idioma original'),
      question: '¿Hay palabras clave en hebreo o griego en este versículo cuyo matiz se pierde en la traducción al español?',
    },
    {
      key: 'application',
      label: t('study.aiAsk.preset.application', 'Aplicación'),
      question: '¿Cómo se puede aplicar este versículo a la vida cristiana hoy?',
    },
  ];

  if (!pos) return null;

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        width: POPOVER_WIDTH,
        zIndex: 1000,
      }}
      className={cn(
        'flex flex-col overflow-hidden',
        'bg-surface border border-border rounded-lg shadow-xl',
      )}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-medium text-text-primary">
          {t('study.aiAsk.title', 'Preguntar a la IA')}
        </span>
        <span className="text-2xs text-text-muted ml-2 truncate">{reference}</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto cursor-pointer text-text-muted hover:text-text-primary"
          aria-label={t('common.close', 'Cerrar')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-3">
        <div className="flex flex-wrap gap-1 mb-2">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              disabled={loading}
              onClick={() => {
                setQuestion(p.question);
                submit(p.question);
              }}
              className={cn(
                'cursor-pointer text-2xs px-2 py-1 rounded-full border border-border',
                'text-text-secondary hover:text-accent hover:border-accent/50 hover:bg-accent/5',
                'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              title={p.question}
            >
              {p.label}
            </button>
          ))}
        </div>

        <textarea
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={3}
          placeholder={t(
            'study.aiAsk.placeholder',
            '¿Qué quieres saber sobre este versículo?',
          )}
          disabled={loading}
          className={cn(
            'w-full resize-none bg-bg-secondary border border-border rounded-md px-2.5 py-2',
            'text-sm text-text-primary placeholder:text-text-muted',
            'focus:outline-none focus:ring-1 focus:ring-accent',
            'disabled:opacity-60',
          )}
        />

        {error && (
          <p className="mt-2 text-2xs text-red-400">{error}</p>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="text-2xs text-text-muted">
            {t('study.aiAsk.hint', 'Enter para enviar · Shift+Enter para salto de línea')}
          </span>
          <button
            type="button"
            onClick={() => submit()}
            disabled={loading || !question.trim()}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
              'bg-accent text-bg-primary hover:opacity-90 transition-opacity',
              'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
            )}
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            {t('study.aiAsk.send', 'Preguntar')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
