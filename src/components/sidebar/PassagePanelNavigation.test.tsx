import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockT } = vi.hoisted(() => ({
  mockT: (key: string) => ({
    'nav.favorites': 'Favoritos',
    'nav.myNotes': 'Mis notas',
    'notes.editor.openPassage': 'Abrir pasaje',
  })[key] ?? key,
}))

vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: () => ({
    t: mockT,
    i18n: { language: 'es' },
  }),
}))

import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { useBookmarkStore } from '@/lib/store/useBookmarkStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { FavoritesPanel } from './FavoritesPanel'
import { MyNotesPanel } from './MyNotesPanel'

const user = { id: 1, name: 'Daniel', email: 'daniel@apolos.test' }
const bookmarkVerse = {
  id: 26137,
  number: 16,
  chapter: 3,
  book: 'Juan',
  slug: 'juan',
  text: 'Porque de tal manera amó Dios al mundo...',
}
const noteVerse = {
  id: 27464,
  number: 28,
  chapter: 8,
  book: 'Romanos',
  slug: 'romanos',
  text: 'A los que aman a Dios, todas las cosas les ayudan a bien.',
}

describe('passage navigation from personal panels', () => {
  let container: HTMLDivElement
  let root: Root
  let pathname = ''

  function LocationProbe() {
    pathname = useLocation().pathname
    return null
  }

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    pathname = ''
    useAuthStore.setState({ user, loading: false })
    useUIStore.setState({ locale: 'es', activePanel: null })
    useBookmarkStore.setState({
      bookmarks: [{ id: 10, verse_id: bookmarkVerse.id, note: null, created_at: '2026-08-01T00:00:00Z', verse: bookmarkVerse }],
      bookmarkedIds: new Set([bookmarkVerse.id]),
      loading: false,
      load: vi.fn().mockResolvedValue(undefined),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    act(() => root.unmount())
    container.remove()
  })

  it('opens a favorite through the canonical URL including its verse', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/marketplace']}>
          <FavoritesPanel />
          <LocationProbe />
        </MemoryRouter>,
      )
    })

    const favorite = [...container.querySelectorAll('button')]
      .find((button) => button.textContent?.includes('Juan 3:16'))
    expect(favorite).toBeDefined()

    act(() => favorite!.dispatchEvent(new MouseEvent('click', { bubbles: true })))

    expect(pathname).toBe('/es/bible/juan/3/16')
  })

  it('opens a note through the canonical URL including its verse', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path) => path === '/api/user/notes'
      ? [{
          id: 20,
          body: 'Una esperanza que no depende de las circunstancias.',
          note_type: 'reflection',
          is_public: false,
          created_at: '2026-08-01T00:00:00Z',
          verse: noteVerse,
        }]
      : [])

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/marketplace']}>
          <MyNotesPanel />
          <LocationProbe />
        </MemoryRouter>,
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const openPassage = container.querySelector<HTMLButtonElement>('button[aria-label="Abrir pasaje"]')
    expect(openPassage).not.toBeNull()

    act(() => openPassage!.dispatchEvent(new MouseEvent('click', { bubbles: true })))

    expect(pathname).toBe('/es/bible/romanos/8/28')
  })
})
