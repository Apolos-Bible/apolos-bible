import { describe, it, expect, beforeEach } from 'vitest'
import { useContextMenuStore } from '../useContextMenuStore'

beforeEach(() => {
  useContextMenuStore.setState({
    open: false,
    x: 0,
    y: 0,
    items: [],
  })
})

describe('useContextMenuStore', () => {
  it('starts closed', () => {
    const state = useContextMenuStore.getState()
    expect(state.open).toBe(false)
    expect(state.items).toEqual([])
    expect(state.x).toBe(0)
    expect(state.y).toBe(0)
  })

  it('openMenu sets position and items', () => {
    const items = [
      { type: 'action' as const, label: 'Copy', onClick: () => {} },
      { type: 'separator' as const },
      { type: 'action' as const, label: 'Paste', onClick: () => {} },
    ]
    useContextMenuStore.getState().openMenu(150, 250, items)
    const state = useContextMenuStore.getState()
    expect(state.open).toBe(true)
    expect(state.x).toBe(150)
    expect(state.y).toBe(250)
    expect(state.items).toEqual(items)
  })

  it('closeMenu closes and clears items', () => {
    const items = [
      { type: 'action' as const, label: 'Copy', onClick: () => {} },
    ]
    const store = useContextMenuStore.getState()
    store.openMenu(100, 200, items)
    store.closeMenu()
    const state = useContextMenuStore.getState()
    expect(state.open).toBe(false)
    expect(state.items).toEqual([])
  })

  it('openMenu with empty items', () => {
    useContextMenuStore.getState().openMenu(0, 0, [])
    expect(useContextMenuStore.getState().open).toBe(true)
    expect(useContextMenuStore.getState().items).toEqual([])
  })
})
