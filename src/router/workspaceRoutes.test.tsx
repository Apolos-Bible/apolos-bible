import { renderToString } from 'react-dom/server'
import { MemoryRouter, matchRoutes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { NotFound } from './routes/NotFound'
import { workspaceRoutes } from './workspaceRoutes'

describe('workspace routes', () => {
  it('matches a localized Bible chapter URL', () => {
    const matches = matchRoutes(workspaceRoutes, '/es/bible/genesis/1')

    expect(matches?.at(-1)?.route.path).toBe(':lang/bible/:book/:chapter')
    expect(matches?.at(-1)?.params).toMatchObject({
      lang: 'es',
      book: 'genesis',
      chapter: '1',
    })
  })

  it('renders a normal not-found route without requiring an error route id', () => {
    expect(() => renderToString(
      <MemoryRouter initialEntries={['/missing']}>
        <NotFound />
      </MemoryRouter>,
    )).not.toThrow()
  })
})
