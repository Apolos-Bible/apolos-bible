import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import { ProfileActionBar } from './ProfileActionBar'

describe('ProfileActionBar blocking controls', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const render = (status: 'none' | 'accepted' | 'blocked', onBlock = vi.fn(), onUnblock = vi.fn()) => {
    act(() => root.render(
      <ProfileActionBar
        mode="other"
        status={status}
        onAdd={vi.fn()}
        onCancel={vi.fn()}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onRemove={vi.fn()}
        onMessage={vi.fn()}
        onShare={vi.fn()}
        onBlock={onBlock}
        onUnblock={onUnblock}
      />,
    ))
    return { onBlock, onUnblock }
  }

  it.each(['none', 'accepted'] as const)('offers blocking for %s relationships', (status) => {
    const { onBlock } = render(status)
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes('friend.block'))
    expect(button).toBeDefined()
    act(() => button!.click())
    expect(onBlock).toHaveBeenCalledOnce()
  })

  it('only offers unblocking when the viewer owns the block', () => {
    const { onUnblock } = render('blocked')
    const buttons = [...container.querySelectorAll('button')]
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.textContent).toContain('friend.unblock')
    act(() => buttons[0]!.click())
    expect(onUnblock).toHaveBeenCalledOnce()
  })
})
