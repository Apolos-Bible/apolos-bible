import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  books: vi.fn(),
  prefetchVersion: vi.fn(),
  chaptersToArray: vi.fn(),
}))

vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: () => ({
    t: (key: string) => ({
      'settings.storage.downloadBible': 'Descargar una Biblia',
      'settings.storage.version': 'Versión',
      'settings.storage.download': 'Descargar',
      'settings.storage.automatic': 'Descargas automáticas',
      'settings.storage.autoOff': 'Desactivadas',
      'settings.storage.autoWifi': 'Solo Wi-Fi',
      'settings.storage.autoAlways': 'Cualquier conexión',
      'settings.storage.downloaded': 'Disponible sin conexión',
      'settings.storage.empty': 'Todavía no hay Biblias completas descargadas.',
      'settings.storage.chapters': 'capítulos',
      'settings.storage.remove': 'Eliminar descarga',
      'settings.storage.title': 'Offline y almacenamiento',
      'settings.storage.subtitle': 'Administra las Biblias guardadas.',
    })[key] ?? key,
  }),
}))

vi.mock('@/lib/bibleApi', () => ({
  bibleApi: { books: mocks.books },
}))

vi.mock('@/lib/db', () => ({
  db: {
    chapters: {
      toArray: mocks.chaptersToArray,
      where: vi.fn(),
    },
    books: { delete: vi.fn() },
  },
}))

vi.mock('@/lib/prefetchBible', () => ({
  offlineAutoDownload: () => 'wifi',
  prefetchVersion: mocks.prefetchVersion,
}))

import { StorageSettings } from './StorageSettings'

describe('StorageSettings', () => {
  let container: HTMLDivElement
  let root: Root
  let cachedRows: Array<{ versionId: number; data: unknown }>

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    cachedRows = []
    mocks.chaptersToArray.mockImplementation(async () => cachedRows)
    mocks.books.mockResolvedValue([{ slug: 'juan', chapters_count: 1 }])
    mocks.prefetchVersion.mockImplementation(async (versionId: number) => {
      cachedRows = [{ versionId, data: { verses: [] } }]
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.clearAllMocks()
  })

  it('removes the download action after the selected version is stored', async () => {
    await act(async () => {
      root.render(<StorageSettings versions={[{
        id: 1,
        name: 'Reina-Valera 1960',
        abbreviation: 'RVR60',
        language: 'es',
        provider: 'local',
      }]} />)
      await Promise.resolve()
    })

    const download = [...container.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === 'Descargar')
    expect(download).toBeDefined()

    await act(async () => {
      download!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect([...container.querySelectorAll('button')]
      .some((button) => button.textContent?.trim() === 'Descargar')).toBe(false)
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Disponible sin conexión')
  })
})
