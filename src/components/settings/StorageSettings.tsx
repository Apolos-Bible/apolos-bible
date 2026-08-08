import { useEffect, useMemo, useState } from 'react'
import { Check, Database, Download, Loader2, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { bibleApi, type ApiVersion } from '@/lib/bibleApi'
import { db } from '@/lib/db'
import { offlineAutoDownload, prefetchVersion, type OfflineAutoDownload } from '@/lib/prefetchBible'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { Select } from '@/components/ui/Select'

type CachedVersion = { versionId: number; chapters: number; bytes: number }

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function cachedVersions(): Promise<CachedVersion[]> {
  const rows = await db.chapters.toArray()
  const grouped = new Map<number, CachedVersion>()
  for (const row of rows) {
    const item = grouped.get(row.versionId) ?? { versionId: row.versionId, chapters: 0, bytes: 0 }
    item.chapters += 1
    item.bytes += new Blob([JSON.stringify(row.data)]).size
    grouped.set(row.versionId, item)
  }
  return [...grouped.values()]
}

export function StorageSettings({ versions }: { versions: ApiVersion[] }) {
  const { t } = useTranslation()
  const localVersions = useMemo(() => versions.filter((version) => version.provider !== 'youversion'), [versions])
  const [cached, setCached] = useState<CachedVersion[]>([])
  const [selected, setSelected] = useState<number | null>(localVersions[0]?.id ?? null)
  const [autoDownload, setAutoDownload] = useState<OfflineAutoDownload>(offlineAutoDownload)
  const [busy, setBusy] = useState<number | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const selectedVersionId = localVersions.some((version) => version.id === selected)
    ? selected
    : localVersions[0]?.id ?? null
  const selectedIsDownloaded = selectedVersionId !== null
    && cached.some((version) => version.versionId === selectedVersionId)

  const refresh = () => cachedVersions().then(setCached)
  useEffect(() => { void refresh() }, [])

  async function downloadVersion() {
    if (selectedVersionId === null) return
    setBusy(selectedVersionId)
    setProgress(null)
    try {
      const books = await bibleApi.books(selectedVersionId)
      await prefetchVersion(selectedVersionId, books, (done, total) => setProgress({ done, total }))
      await refresh()
    } finally {
      setBusy(null)
      setProgress(null)
    }
  }

  async function removeVersion(versionId: number) {
    const version = versions.find((candidate) => candidate.id === versionId)
    if (!window.confirm(t('settings.storage.removeConfirm', { version: version?.name ?? `#${versionId}` }))) return
    setBusy(versionId)
    try {
      await db.chapters.where('versionId').equals(versionId).delete()
      await db.books.delete(versionId)
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="border-b border-border-subtle pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{t('settings.storage.title')}</h1>
        <p className="mt-1 text-sm text-text-muted">{t('settings.storage.subtitle')}</p>
      </header>

      <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-4 sm:p-5">
        <SectionLabel>{t('settings.storage.downloadBible')}</SectionLabel>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Select
            value={selectedVersionId ?? ''}
            onChange={(value) => setSelected(Number(value))}
            ariaLabel={t('settings.storage.version')}
            options={localVersions.map((version) => ({ value: version.id, label: `${version.abbreviation} — ${version.name}` }))}
            className="flex-1"
          />
          {selectedIsDownloaded ? (
            <span role="status" className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-500">
              <Check size={15} />
              {t('settings.storage.downloaded')}
            </span>
          ) : (
            <button type="button" onClick={() => void downloadVersion()} disabled={busy !== null || selectedVersionId === null} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-white disabled:opacity-50">
              {busy === selectedVersionId ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {progress ? `${progress.done}/${progress.total}` : t('settings.storage.download')}
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-4 sm:p-5">
        <SectionLabel>{t('settings.storage.automatic')}</SectionLabel>
        <div className="mt-4">
          <Select
            value={autoDownload}
            onChange={(value) => {
              const next = value as OfflineAutoDownload
              localStorage.setItem('offlineAutoDownload', next)
              setAutoDownload(next)
            }}
            ariaLabel={t('settings.storage.automatic')}
            options={[
              { value: 'off', label: t('settings.storage.autoOff') },
              { value: 'wifi', label: t('settings.storage.autoWifi') },
              { value: 'always', label: t('settings.storage.autoAlways') },
            ]}
            className="w-full sm:max-w-sm"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-4 sm:p-5">
        <SectionLabel>{t('settings.storage.downloaded')}</SectionLabel>
        {cached.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">{t('settings.storage.empty')}</p>
        ) : (
          <ul className="mt-2 divide-y divide-border-subtle">
            {cached.map((item) => {
              const version = versions.find((candidate) => candidate.id === item.versionId)
              return <li key={item.versionId} className="flex items-center gap-3 py-3">
                <Database size={17} className="text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text-primary">{version?.name ?? `#${item.versionId}`}</span>
                  <span className="text-xs text-text-muted">{item.chapters} {t('settings.storage.chapters')} · {formatBytes(item.bytes)}</span>
                </span>
                <button type="button" onClick={() => void removeVersion(item.versionId)} disabled={busy !== null} className="rounded-full p-2 text-text-muted hover:bg-bg-tertiary hover:text-red-400" aria-label={t('settings.storage.remove')}><Trash2 size={15} /></button>
              </li>
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
