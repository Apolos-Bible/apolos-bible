import { describe, expect, it } from 'vitest'
import {
  fromYouVersionClientId,
  parseYouVersionChapterHtml,
  remoteVerseApiId,
  safeExternalUrl,
  toYouVersionClientId,
  usfmForBookSlug,
  youVersionBibleToApiVersion,
  youVersionIndexToApiBooks,
} from './youVersion'

describe('YouVersion adapter', () => {
  it('keeps remote Bible IDs separate from local database IDs', () => {
    const clientId = toYouVersionClientId(147)

    expect(clientId).toBeGreaterThan(1_000_000_000)
    expect(fromYouVersionClientId(clientId)).toBe(147)
    expect(fromYouVersionClientId(147)).toBeNull()
  })

  it('normalizes Bible metadata and rejects unsafe links', () => {
    expect(youVersionBibleToApiVersion({
      id: 147,
      abbreviation: 'RVES',
      localized_abbreviation: 'RVES',
      title: 'Reina-Valera Antigua',
      localized_title: 'Reina-Valera Antigua',
      language_tag: 'es',
      copyright: 'Copyright notice',
      publisher_url: 'https://publisher.example/bible',
      youversion_deep_link: 'javascript:alert(1)',
    })).toMatchObject({
      provider: 'youversion',
      providerId: 147,
      abbreviation: 'RVES',
      language: 'es',
      copyright: 'Copyright notice',
      publisherUrl: 'https://publisher.example/bible',
      deepLink: undefined,
    })

    expect(safeExternalUrl('data:text/html,bad')).toBeUndefined()
  })

  it('maps a YouVersion index to the canonical reader book slugs', () => {
    const books = youVersionIndexToApiBooks({
      text_direction: 'ltr',
      books: [
        {
          id: 'GEN',
          title: 'Génesis',
          canon: 'old_testament',
          chapters: [
            { id: 1, passage_id: 'GEN.1', title: 1 },
            { id: 2, passage_id: 'GEN.2', title: 2 },
          ],
        },
        {
          id: 'JHN',
          title: 'Juan',
          canon: 'new_testament',
          chapters: [{ id: 1, passage_id: 'JHN.1', title: 1 }],
        },
        {
          id: 'TOB',
          title: 'Tobit',
          canon: 'deuterocanon',
          chapters: [{ id: 1, passage_id: 'TOB.1', title: 1 }],
        },
      ],
    })

    expect(books).toEqual([
      expect.objectContaining({ number: 1, slug: 'genesis', name: 'Génesis', chapters_count: 2 }),
      expect.objectContaining({ number: 43, slug: 'john', name: 'Juan', chapters_count: 1 }),
    ])
    expect(usfmForBookSlug('john')).toEqual({ number: 43, usfm: 'JHN' })
  })

  it('resolves localized reader slugs when loading a YouVersion comparison', () => {
    expect(usfmForBookSlug('juan')).toEqual({ number: 43, usfm: 'JHN' })
    expect(usfmForBookSlug('apocalipsis')).toEqual({ number: 66, usfm: 'REV' })
  })

  it('extracts numbered verses from YouVersion chapter HTML', () => {
    const html = `
      <div class="p">
        <span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>
        En el principio era el Verbo.
        <span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>
        Él estaba en el principio con Dios.
      </div>
    `

    expect(parseYouVersionChapterHtml(html)).toEqual([
      { number: 1, text: 'En el principio era el Verbo.' },
      { number: 2, text: 'Él estaba en el principio con Dios.' },
    ])
  })

  it('creates stable negative IDs for remote verses', () => {
    const id = remoteVerseApiId(147, 43, 3, 16)

    expect(id).toBeLessThan(0)
    expect(remoteVerseApiId(147, 43, 3, 16)).toBe(id)
    expect(remoteVerseApiId(147, 43, 3, 17)).not.toBe(id)
  })
})
