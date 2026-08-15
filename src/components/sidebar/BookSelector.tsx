
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useActiveVerseStore } from '@/lib/store/useVerseStore'
import type { Book } from '@/lib/store/useVerseStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { useIsMobile } from '@/lib/useIsMobile'
import { paths } from '@/router/paths'
import { cn } from '@/lib/cn'
import { BookOpen, ExternalLink, GraduationCap } from 'lucide-react'
import { useContextMenuStore } from '@/lib/store/useContextMenuStore'
import { createWorkspaceTab, useWorkspaceStore } from '@/lib/store/useWorkspaceStore'
import { StartStudyModal } from '@/components/study/StartStudyModal'
import { useWorkspacePane } from '@/components/layout/WorkspacePaneContext'
import { Select } from '@/components/ui/Select'
import { isYouVersionVersion } from '@/lib/youVersion'

interface BookGroupProps {
  label: string
  books: Book[]
  selectedBook: string
  openBook: string
  selectedChapter: number
  onOpenBook: (id: string) => void
  onSelectChapter: (bookId: string, chapter: number, event?: React.MouseEvent) => void
  onChapterContextMenu: (event: React.MouseEvent, bookId: string, chapter: number) => void
  isMobile?: boolean
}

function BookGroup({ label, books, selectedBook, openBook, selectedChapter, onOpenBook, onSelectChapter, onChapterContextMenu, isMobile = false }: BookGroupProps) {
  return (
    <div>
      <p className="text-2xs uppercase tracking-wider text-text-muted px-4 py-1 select-none">
        {label}
      </p>
      {books.map((book) => {
        const isActiveBook = selectedBook === book.id
        const isOpen = openBook === book.id
        const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1)

        return (
          <div key={book.id}>
            <button
              data-book-id={book.id}
              onClick={() => onOpenBook(book.id)}
              aria-expanded={isOpen}
              className={cn(
                'flex w-full items-center gap-2 px-4 text-left transition-colors duration-100',
                isMobile ? 'py-3 text-[15px]' : 'py-1.5 text-sm',
                isActiveBook
                  ? 'text-accent bg-bg-tertiary font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
              )}
            >
              <span
                className={cn(
                  'text-2xs transition-transform duration-150',
                  isOpen && 'rotate-90',
                )}
                aria-hidden="true"
              >
                ▸
              </span>
              <span className="min-w-0 flex-1 truncate">{book.name}</span>
              {isActiveBook && (
                <span className="text-2xs font-normal text-text-muted">
                  {selectedChapter}/{book.chapters}
                </span>
              )}
            </button>

            <div
              className={cn(
                'grid overflow-hidden bg-bg-primary/50 transition-[grid-template-rows,opacity] duration-200 ease-out',
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
              aria-hidden={!isOpen}
            >
              <div className="min-h-0 overflow-hidden">
                <div className={cn('grid gap-1 px-4 py-2', isMobile ? 'grid-cols-5' : 'grid-cols-6')}>
                  {chapters.map((chapter) => {
                    const isCurrent = isActiveBook && selectedChapter === chapter

                    return (
                      <button
                        key={chapter}
                        data-chapter-id={`${book.id}-${chapter}`}
                        onClick={(event) => onSelectChapter(book.id, chapter, event)}
                        onContextMenu={(event) => onChapterContextMenu(event, book.id, chapter)}
                        tabIndex={isOpen ? 0 : -1}
                        className={cn(
                          'rounded transition-colors duration-100',
                          isMobile ? 'h-11 text-sm' : 'h-7 text-xs',
                          isCurrent
                            ? 'bg-accent text-bg-primary font-medium'
                            : 'text-text-muted hover:bg-bg-tertiary hover:text-text-primary',
                        )}
                      >
                        {chapter}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function BookSelector() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const books = useActiveVerseStore((s) => s.books)
  const versions = useActiveVerseStore((s) => s.versions)
  const versionId = useActiveVerseStore((s) => s.versionId)
  const setVersion = useActiveVerseStore((s) => s.setVersion)
  const selectedBook = useActiveVerseStore((s) => s.selectedBook)
  const selectedChapter = useActiveVerseStore((s) => s.selectedChapter)
  const loadChapter = useActiveVerseStore((s) => s.loadChapter)
  const locale = useUIStore((s) => s.locale)
  const closeMobileSidebar = useUIStore((s) => s.closeMobileSidebar)
  const closeMobileBookPicker = useUIStore((s) => s.closeMobileBookPicker)
  const openMenu = useContextMenuStore((s) => s.openMenu)
  const openTab = useWorkspaceStore((s) => s.openTab)
  const activateGroup = useWorkspaceStore((s) => s.activateGroup)
  const workspacePane = useWorkspacePane()
  const isMobile = useIsMobile()
  const [openBook, setOpenBook] = useState(selectedBook)
  const [showStartStudy, setShowStartStudy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const openChapterInNewTab = (bookId: string, chapter: number) => {
    if (workspacePane) activateGroup(workspacePane.groupId)
    const path = paths.bible({ lang: locale, book: bookId, chapter })
    const tab = createWorkspaceTab(path, path, `${bookId} ${chapter}`)
    // Bible tabs normally share the canonical `bible` identity. A chapter
    // opened explicitly in a new window needs its own editor tab identity.
    tab.id = `bible:${bookId}:${chapter}:${Date.now()}`
    openTab(tab, useWorkspaceStore.getState().activeGroupId)
    closeMobileSidebar()
    closeMobileBookPicker()
    navigate(path)
  }

  const handleSelectChapter = (bookId: string, chapter: number, event?: React.MouseEvent) => {
    if (workspacePane) activateGroup(workspacePane.groupId)
    if (event?.button === 0 && (event.metaKey || event.ctrlKey) && !isMobile) {
      event.preventDefault()
      openChapterInNewTab(bookId, chapter)
      return
    }
    loadChapter(bookId, chapter)
    closeMobileSidebar()
    closeMobileBookPicker()
    // Keep the active workspace tab and browser route in sync with the
    // chapter selected from the sidebar. This also works when the sidebar is
    // being shown over a full-page route.
    const path = paths.bible({ lang: locale, book: bookId, chapter })
    if (pathname !== path) navigate(path)
  }

  const handleChapterContextMenu = (event: React.MouseEvent, bookId: string, chapter: number) => {
    event.preventDefault()
    event.stopPropagation()
    const open = () => handleSelectChapter(bookId, chapter)
    openMenu(event.clientX, event.clientY, [
      { type: 'action', label: t('sidebar.chapter.open'), icon: <BookOpen className="h-4 w-4" />, onClick: open },
      { type: 'action', label: t('sidebar.chapter.openNewWindow'), icon: <ExternalLink className="h-4 w-4" />, shortcut: '⌘/Ctrl ↵', onClick: () => openChapterInNewTab(bookId, chapter) },
      { type: 'separator' },
      { type: 'action', label: t('sidebar.chapter.startStudy'), icon: <GraduationCap className="h-4 w-4" />, onClick: () => { loadChapter(bookId, chapter); setShowStartStudy(true) } },
    ])
  }

  useEffect(() => {
    if (selectedBook) setOpenBook(selectedBook)
  }, [selectedBook])

  useEffect(() => {
    if (!selectedBook || !scrollRef.current) return
    const container = scrollRef.current
    const timer = setTimeout(() => {
      const chapterId = `${selectedBook}-${selectedChapter}`
      const chapterEl = container.querySelector<HTMLElement>(`[data-chapter-id="${chapterId}"]`)
      if (chapterEl) {
        chapterEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
      } else {
        const bookEl = container.querySelector<HTMLElement>(`[data-book-id="${selectedBook}"]`)
        if (bookEl) {
          bookEl.scrollIntoView({ block: 'start', behavior: 'smooth' })
        }
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [selectedBook, selectedChapter])

  const oldTestament = books.filter((b) => b.testament === 'old')
  const newTestament = books.filter((b) => b.testament === 'new')
  const selectableVersions = versions
  const loadingBooks = useActiveVerseStore((s) => s.loadingBooks)

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto pb-1">
      <div className="sticky top-0 z-20 border-b border-border-subtle bg-bg-secondary px-3 py-2">
        <Select
          value={versionId}
          onChange={setVersion}
          ariaLabel={t('youVersion.changeVersion')}
          placeholder={t('common.loading')}
          disabled={selectableVersions.length === 0}
          options={selectableVersions.map((version) => ({
            value: version.id,
            label: version.abbreviation,
            description: `${version.name}${isYouVersionVersion(version) ? ` · ${t('youVersion.provider')}` : ''}`,
          }))}
          buttonClassName="h-9 rounded-lg"
          searchable
          searchPlaceholder={t('youVersion.searchVersion')}
        />
      </div>
      {loadingBooks ? <BookLibrarySkeleton /> : <><BookGroup
        label={t('sidebar.oldTestament')}
        books={oldTestament}
        selectedBook={selectedBook}
        openBook={openBook}
        selectedChapter={selectedChapter}
        onOpenBook={setOpenBook}
        onSelectChapter={handleSelectChapter}
        onChapterContextMenu={handleChapterContextMenu}
        isMobile={isMobile}
      />
      <div className="mt-2">
        <BookGroup
          label={t('sidebar.newTestament')}
          books={newTestament}
          selectedBook={selectedBook}
          openBook={openBook}
          selectedChapter={selectedChapter}
          onOpenBook={setOpenBook}
          onSelectChapter={handleSelectChapter}
          onChapterContextMenu={handleChapterContextMenu}
          isMobile={isMobile}
        />
      </div>
      </>}
      <StartStudyModal open={showStartStudy} onClose={() => setShowStartStudy(false)} />
    </div>
  )
}

function BookLibrarySkeleton() {
  return <div role="status" aria-label="Cargando libros y capítulos" className="space-y-5 px-3 py-4 motion-safe:animate-pulse">
    {Array.from({ length: 2 }, (_, group) => <div key={group}><span className="block h-2.5 w-28 rounded bg-bg-tertiary"/><div className="mt-3 space-y-2">{Array.from({ length: group === 0 ? 8 : 5 }, (_, index) => <div key={index} className="flex items-center justify-between"><span className="block h-3.5 rounded bg-bg-tertiary" style={{ width: `${52 + (index % 4) * 9}%` }}/><span className="block h-3.5 w-5 rounded bg-bg-tertiary"/></div>)}</div></div>)}
    <span className="sr-only">Cargando biblioteca bíblica…</span>
  </div>
}
