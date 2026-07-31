import { useCallback, useRef, useState, type DragEvent } from 'react';
import { FileText, Link2, Loader2, Paperclip, Plus, UploadCloud, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/cn';
import { safeExternalUrl } from '@/lib/study/externalUrl';
import { studyApi } from '@/lib/study/studyApi';
import type { FileNodeData } from './nodes/FileNode';

const MAX_FILE_BYTES = 40 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp,.avif,.pdf,.txt,.md,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip';

type PendingFile = { id: string; file: File };
type PendingLink = { id: string; url: string; name: string };

interface FileInsertDialogProps {
  open: boolean;
  sessionId: string | null;
  onClose: () => void;
  onAdd: (items: FileNodeData[]) => void;
}

function itemId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FileInsertDialog({ open, sessionId, onClose, onAdd }: FileInsertDialogProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [links, setLinks] = useState<PendingLink[]>([]);
  const [linkValue, setLinkValue] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeAndReset = useCallback(() => {
    if (busy) return;
    setFiles([]);
    setLinks([]);
    setLinkValue('');
    setError(null);
    setDragActive(false);
    onClose();
  }, [busy, onClose]);

  const appendFiles = useCallback((incoming: File[]) => {
    const accepted: PendingFile[] = [];
    let rejected = false;

    for (const file of incoming) {
      if (file.size > MAX_FILE_BYTES) {
        rejected = true;
        continue;
      }
      accepted.push({ id: itemId(), file });
    }

    if (accepted.length > 0) setFiles((current) => [...current, ...accepted]);
    setError(rejected ? t('study.file.tooLarge') : null);
  }, [t]);

  const handleDrop = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragActive(false);
    appendFiles(Array.from(event.dataTransfer.files));
  }, [appendFiles]);

  const addLink = useCallback(() => {
    const url = safeExternalUrl(linkValue);
    if (!url) {
      setError(t('study.file.invalidLink'));
      return;
    }
    const parsed = new URL(url);
    setLinks((current) => [...current, { id: itemId(), url, name: parsed.hostname }]);
    setLinkValue('');
    setError(null);
  }, [linkValue, t]);

  const addToCanvas = useCallback(async () => {
    if (!sessionId || busy || (files.length === 0 && links.length === 0)) return;
    setBusy(true);
    setError(null);

    const successfulIds = new Set<string>();
    const nodes: FileNodeData[] = [];
    let failed = false;

    // Keep large uploads sequential. Several 40 MB requests in parallel can
    // exhaust a mobile connection or all PHP-FPM workers for the study.
    for (const item of files) {
      try {
        const result = await studyApi.uploadFile(sessionId, item.file);
        successfulIds.add(item.id);
        nodes.push({
          kind: 'upload',
          fileId: result.id,
          name: result.name,
          mimeType: result.mime_type,
          size: result.size,
          contentUrl: result.content_url,
        });
      } catch {
        failed = true;
      }
    }

    nodes.push(...links.map((link) => ({
      kind: 'link' as const,
      fileId: `link-${link.id}`,
      name: link.name,
      mimeType: 'text/html',
      size: 0,
      contentUrl: link.url,
    })));

    if (nodes.length > 0) onAdd(nodes);
    setFiles((current) => current.filter((item) => !successfulIds.has(item.id)));
    setLinks([]);
    setBusy(false);

    if (failed) {
      setError(t('study.file.someFailed'));
    } else {
      setFiles([]);
      setLinkValue('');
      onClose();
    }
  }, [busy, files, links, onAdd, onClose, sessionId, t]);

  const count = files.length + links.length;

  return (
    <Dialog
      open={open}
      onClose={closeAndReset}
      labelledBy="file-insert-title"
      describedBy="file-insert-description"
      closeOnBackdrop={!busy}
      className="relative mx-4 flex max-h-[min(720px,90vh)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
      initialFocus="[data-file-dropzone]"
    >
      <header className="flex items-start justify-between border-b border-border-subtle px-5 py-4">
        <div>
          <h2 id="file-insert-title" className="flex items-center gap-2 text-md font-semibold text-text-primary">
            <Paperclip className="h-4 w-4 text-accent" />
            {t('study.file.dialogTitle')}
          </h2>
          <p id="file-insert-description" className="mt-1 text-xs text-text-muted">
            {t('study.file.dialogDescription')}
          </p>
        </div>
        <button type="button" onClick={closeAndReset} disabled={busy} aria-label={t('common.close')} className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-40">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        <button
          type="button"
          data-file-dropzone
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDragActive(true); }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false); }}
          onDrop={handleDrop}
          className={cn(
            'flex w-full flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center transition-colors',
            dragActive ? 'border-accent bg-accent/10' : 'border-border bg-bg-secondary hover:border-accent/50 hover:bg-bg-tertiary',
          )}
        >
          <UploadCloud className="mb-3 h-7 w-7 text-accent" />
          <span className="text-sm font-medium text-text-primary">{t('study.file.dropTitle')}</span>
          <span className="mt-1 text-xs text-text-muted">{t('study.file.dropHint')}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          className="hidden"
          onChange={(event) => {
            appendFiles(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />

        <div>
          <label htmlFor="file-link-input" className="mb-1.5 block text-xs font-medium text-text-secondary">
            {t('study.file.linkLabel')}
          </label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
              <input
                id="file-link-input"
                type="url"
                value={linkValue}
                onChange={(event) => setLinkValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') { event.preventDefault(); addLink(); }
                }}
                placeholder="https://example.com"
                className="w-full rounded-lg border border-border bg-bg-primary py-2 pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent/50"
              />
            </div>
            <button type="button" onClick={addLink} disabled={!linkValue.trim()} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-40">
              <Plus className="h-3.5 w-3.5" />
              {t('study.file.queueLink')}
            </button>
          </div>
          <p className="mt-1.5 text-2xs text-text-muted">{t('study.file.linkSecurity')}</p>
        </div>

        {count > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-secondary">{t('study.file.selected', { count })}</span>
              <button type="button" onClick={() => { setFiles([]); setLinks([]); }} disabled={busy} className="text-2xs text-text-muted hover:text-text-primary disabled:opacity-40">
                {t('study.file.clearAll')}
              </button>
            </div>
            <div className="divide-y divide-border-subtle overflow-hidden rounded-lg border border-border">
              {files.map((item) => (
                <div key={item.id} className="flex items-center gap-3 bg-bg-secondary px-3 py-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-text-primary">{item.file.name}</p>
                    <p className="text-2xs text-text-muted">{formatBytes(item.file.size)}</p>
                  </div>
                  <button type="button" onClick={() => setFiles((current) => current.filter((file) => file.id !== item.id))} disabled={busy} aria-label={t('study.file.removeItem', { name: item.file.name })} className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-bg-tertiary hover:text-red-400 disabled:opacity-40">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {links.map((link) => (
                <div key={link.id} className="flex items-center gap-3 bg-bg-secondary px-3 py-2.5">
                  <Link2 className="h-4 w-4 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-text-primary">{link.name}</p>
                    <p className="truncate text-2xs text-text-muted">{link.url}</p>
                  </div>
                  <button type="button" onClick={() => setLinks((current) => current.filter((item) => item.id !== link.id))} disabled={busy} aria-label={t('study.file.removeItem', { name: link.name })} className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-bg-tertiary hover:text-red-400 disabled:opacity-40">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-border-subtle px-5 py-4">
        <button type="button" onClick={closeAndReset} disabled={busy} className="rounded-lg px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary disabled:opacity-40">
          {t('common.cancel')}
        </button>
        <button type="button" onClick={() => void addToCanvas()} disabled={busy || count === 0 || !sessionId} className="inline-flex min-w-28 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-bg-primary transition-opacity hover:opacity-90 disabled:opacity-40">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {busy ? t('study.file.uploading') : t('study.file.addCount', { count })}
        </button>
      </footer>
    </Dialog>
  );
}
