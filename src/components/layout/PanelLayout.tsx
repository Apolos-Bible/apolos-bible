import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'
import { useVerseStore } from '@/lib/store/useVerseStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useContextMenuStore } from '@/lib/store/useContextMenuStore'
import { MobileTopBar } from './MobileTopBar'
import { MobileBottomNav } from './MobileBottomNav'
import { MobileProfileSheet } from './MobileProfileSheet'
import { MobileSearchView } from './MobileSearchView'
import { BookSelector } from '@/components/sidebar/BookSelector'

interface PanelLayoutProps {
  sidebar: ReactNode
  main: ReactNode
  panel: ReactNode | null
  leftPanel?: ReactNode
}

export function PanelLayout({ sidebar, main, panel, leftPanel }: PanelLayoutProps) {
  const { t } = useTranslation()
  const studyVerseId = useVerseStore((s) => s.studyVerseId)
  const closeStudyPanel = useVerseStore((s) => s.closeStudyPanel)
  const commentaryOpen = useUIStore((s) => s.commentaryOpen)
  const toggleCommentary = useUIStore((s) => s.toggleCommentary)
  const mobileBookPickerOpen = useUIStore((s) => s.mobileBookPickerOpen)
  const closeMobileBookPicker = useUIStore((s) => s.closeMobileBookPicker)
  const mobileSearchOpen = useUIStore((s) => s.mobileSearchOpen)
  const mobileSidebarOpen = useUIStore((s) => s.mobileSidebarOpen)

  const closeMobileStudyPanel = () => {
    if (commentaryOpen) {
      toggleCommentary()
    }
    if (studyVerseId) {
      closeStudyPanel()
    }
  }

  const selectedVerseIds = useVerseStore((s) => s.selectedVerseIds)
  const selectVerse = useVerseStore((s) => s.selectVerse)
  const verses = useVerseStore((s) => s.verses)
  const openMenu = useContextMenuStore((s) => s.openMenu)
  const addToast = useUIStore((s) => s.addToast)

  return (
    <div className="app-viewport w-full overflow-hidden bg-bg-primary">
      <div className="md:hidden flex h-full flex-col">
        {mobileSearchOpen ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <MobileSearchView />
          </div>
        ) : mobileSidebarOpen ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <MobileProfileSheet />
          </div>
        ) : leftPanel ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            {leftPanel}
          </div>
        ) : (
          <>
        <MobileTopBar />

        <main className="min-h-0 flex-1 overflow-hidden relative">
          {main}

          {selectedVerseIds.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-4">
              <div className="pointer-events-auto relative inline-flex h-12 px-4 items-center justify-center rounded-full border border-border-subtle bg-bg-secondary text-text-secondary shadow-lg gap-2">
                <span className="text-sm font-medium tabular-nums">{selectedVerseIds.length}</span>
                {selectedVerseIds.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      const multiVerses = verses.filter(v => selectedVerseIds.includes(v.id))
                      const bookName = multiVerses[0]?.book ?? ''
                      const rect = e.currentTarget.getBoundingClientRect()
                      openMenu(rect.left + rect.width / 2, rect.top - 8, [
                        {
                          type: 'action',
                          label: t('study.copyVerseText'),
                          onClick: () => {
                            navigator.clipboard.writeText(multiVerses.map(v => v.text).join('\n\n'))
                            addToast(t('toast.copied'), 'success')
                          },
                        },
                        {
                          type: 'action',
                          label: t('verse.copyReference'),
                          onClick: () => {
                            const refs = multiVerses.map(v => `${bookName} ${v.chapter}:${v.verse}`).join(', ')
                            navigator.clipboard.writeText(refs)
                            addToast(t('verse.copiedRef', { ref: refs }), 'success')
                          },
                        },
                        {
                          type: 'action',
                          label: t('verse.shareVerse'),
                          onClick: () => {
                            const shareText = multiVerses.map(v => `${bookName} ${v.chapter}:${v.verse} — ${v.text}`).join('\n\n')
                            const shareUrl = window.location.href
                            if (navigator.share) {
                              navigator.share({ title: t('verse.shareVerse'), text: shareText, url: shareUrl })
                            } else {
                              navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`)
                              addToast(t('toast.copied'), 'success')
                            }
                          },
                        },
                      ])
                    }}
                    className="flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    aria-label={t('verse.openActions', { verse: selectedVerseIds.length })}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <circle cx="3.5" cy="8" r="1.2" />
                      <circle cx="8" cy="8" r="1.2" />
                      <circle cx="12.5" cy="8" r="1.2" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => selectVerse(null)}
                  className="flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                  aria-label={t('verse.clear')}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                    <path d="M3 3l6 6M9 3l-6 6" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </main>
          </>
        )}

        <MobileBottomNav />

        <div
          className={cn(
            'fixed inset-0 z-40 transition-opacity duration-200 md:hidden',
            mobileBookPickerOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <div className="absolute inset-0 bg-black/60" onClick={closeMobileBookPicker} />
          <div
            className={cn(
              'absolute inset-x-0 bottom-0 top-12 rounded-t-2xl bg-bg-secondary shadow-2xl flex flex-col transition-transform duration-300',
              mobileBookPickerOpen ? 'translate-y-0' : 'translate-y-full',
            )}
          >
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3 shrink-0">
              <span className="text-sm font-medium text-text-primary">{t('layout.changeChapter')}</span>
              <button
                type="button"
                onClick={closeMobileBookPicker}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
                aria-label={t('layout.closeChapterPicker')}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                  <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
              <BookSelector />
            </div>
          </div>
        </div>

        <div
          className={cn(
            'absolute inset-0 z-30 transition-opacity duration-200 md:hidden',
            panel ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
          )}
        >
          <div className="absolute inset-0 bg-black/60" onClick={closeMobileStudyPanel} />
          <div className="absolute inset-x-0 bottom-0 top-4 rounded-t-2xl bg-bg-secondary shadow-2xl">
            <div className="h-full overflow-hidden">
              {panel}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden md:flex h-full w-full overflow-hidden">
        <aside className="flex-shrink-0 w-sidebar h-full overflow-hidden">
          {sidebar}
        </aside>

        <aside
          className={cn(
            'flex-shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out border-r border-border-subtle',
            leftPanel != null ? 'w-panel opacity-100' : 'w-0 opacity-0 border-0',
          )}
        >
          <div className="w-panel h-full">
            {leftPanel}
          </div>
        </aside>

        <main className="flex-1 min-w-0 h-full overflow-hidden" data-tour="reading">
          {main}
        </main>

        <aside
          className={cn(
            'flex-shrink-0 h-full overflow-hidden transition-all duration-300 ease-in-out',
            panel !== null ? 'w-panel opacity-100' : 'w-0 opacity-0',
          )}
        >
          <div className="w-panel h-full">
            {panel}
          </div>
        </aside>
      </div>
    </div>
  )
}
