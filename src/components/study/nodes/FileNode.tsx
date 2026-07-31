import { memo, useEffect, useState } from 'react';
import { Download, ExternalLink, FileArchive, FileText, Loader2, Paperclip } from 'lucide-react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { ResizableNode } from './ResizableNode';

export type FileNodeData = {
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  contentUrl: string;
};

type FileNodeType = Node<FileNodeData, 'file'>;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unit;
  return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

function extensionOf(name: string): string {
  const extension = name.split('.').pop();
  return extension && extension !== name ? extension.toUpperCase() : 'FILE';
}

export const FileNode = memo(function FileNode({ id, data, selected }: NodeProps<FileNodeType>) {
  const { t } = useTranslation();
  const isImage = data.mimeType.startsWith('image/');
  const isPdf = data.mimeType === 'application/pdf';
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFailed, setPdfFailed] = useState(false);
  const openFile = () => window.open(data.contentUrl, '_blank', 'noopener,noreferrer');

  // apolos.io deliberately sends SAMEORIGIN for framed responses. Fetching the
  // signed private PDF first and framing its local blob URL keeps that security
  // header intact while still allowing the apolos.bible board to preview it.
  useEffect(() => {
    if (!isPdf) return;

    const controller = new AbortController();
    let objectUrl: string | null = null;
    setPdfUrl(null);
    setPdfFailed(false);

    fetch(data.contentUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`PDF request failed (${response.status})`);
        return response.blob();
      })
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error('[study-file] PDF preview failed', error);
          setPdfFailed(true);
        }
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [data.contentUrl, isPdf]);

  return (
    <ResizableNode
      id={id}
      selected={selected}
      minWidth={isPdf ? 320 : 220}
      minHeight={isPdf ? 300 : isImage ? 180 : 120}
      radialActions={[
        {
          key: 'open-file',
          icon: <ExternalLink className="h-[18px] w-[18px]" />,
          label: t('study.file.open'),
          onClick: openFile,
        },
      ]}
    >
      <article
        className={cn(
          'group/file relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm',
          selected && 'ring-2 ring-accent',
        )}
      >
        <Handle id="top" type="source" position={Position.Top} className="!bg-border" />
        <Handle id="right" type="source" position={Position.Right} className="!bg-border" />
        <Handle id="left" type="source" position={Position.Left} className="!bg-border" />

        <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border-subtle px-3">
          <Paperclip className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-text-primary" title={data.name}>
            {data.name}
          </span>
          <span className="shrink-0 text-2xs text-text-muted">{formatBytes(data.size)}</span>
          <button
            type="button"
            onClick={openFile}
            className="nodrag inline-flex h-6 w-6 items-center justify-center rounded text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            aria-label={t('study.file.open')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </header>

        {isImage ? (
          <div className="min-h-0 flex-1 bg-bg-secondary p-2">
            <img
              src={data.contentUrl}
              alt={data.name}
              draggable={false}
              className="nodrag h-full w-full select-none object-contain"
            />
          </div>
        ) : isPdf && pdfUrl ? (
          <object
            data={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
            type="application/pdf"
            aria-label={data.name}
            className="nodrag nowheel min-h-0 w-full flex-1 bg-white"
          >
            <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
              <FileText className="h-8 w-8 text-accent" />
              <p className="text-sm text-text-secondary">{t('study.file.pdfFallback')}</p>
              <button type="button" onClick={openFile} className="nodrag text-xs font-medium text-accent hover:underline">
                {t('study.file.open')}
              </button>
            </div>
          </object>
        ) : isPdf ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
            {pdfFailed ? (
              <>
                <FileText className="h-8 w-8 text-accent" />
                <p className="text-sm text-text-secondary">{t('study.file.pdfFallback')}</p>
                <button type="button" onClick={openFile} className="nodrag text-xs font-medium text-accent hover:underline">
                  {t('study.file.open')}
                </button>
              </>
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center gap-4 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              {data.mimeType.includes('zip') ? <FileArchive className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">{data.name}</p>
              <p className="mt-1 text-2xs uppercase tracking-wide text-text-muted">{extensionOf(data.name)} · {formatBytes(data.size)}</p>
            </div>
            <button
              type="button"
              onClick={openFile}
              className="nodrag inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary text-text-secondary transition-colors hover:text-accent"
              aria-label={t('study.file.open')}
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        )}

        <Handle id="bottom" type="source" position={Position.Bottom} className="!bg-border" />
      </article>
    </ResizableNode>
  );
});
