import { afterEach, describe, expect, it, vi } from 'vitest'
import { containsFocus, focusWhenReady, getFocusable, isFocusIdle } from './focus'

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('keyboard focus contracts', () => {
  it('returns enabled visible controls in document order and excludes inert content', () => {
    document.body.innerHTML = `
      <div id="dialog">
        <button id="first">First</button>
        <button disabled>Disabled</button>
        <div inert><button>Inert</button></div>
        <a id="last" href="/next">Last</a>
      </div>
    `
    for (const id of ['first', 'last']) {
      vi.spyOn(document.getElementById(id)!, 'getBoundingClientRect').mockReturnValue({ height: 20 } as DOMRect)
    }

    expect(getFocusable(document.getElementById('dialog')! as HTMLElement).map((element) => element.id))
      .toEqual(['first', 'last'])
  })

  it('recognizes contained focus and never treats an external editor as idle', () => {
    document.body.innerHTML = '<section id="reader"><button id="inside">Read</button></section><input id="outside">'
    const reader = document.getElementById('reader')!
    document.getElementById('inside')!.focus()
    expect(containsFocus(reader)).toBe(true)
    expect(isFocusIdle(reader)).toBe(true)

    document.getElementById('outside')!.focus()
    expect(containsFocus(reader)).toBe(false)
    expect(isFocusIdle(reader)).toBe(false)
  })

  it('focuses a region that mounts on a later animation frame', () => {
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(callback, 16))
    focusWhenReady('[data-region="reader"]')
    const reader = document.createElement('main')
    reader.tabIndex = -1
    reader.dataset.region = 'reader'
    document.body.append(reader)
    vi.advanceTimersByTime(16)
    expect(reader).toBe(document.activeElement)
    vi.unstubAllGlobals()
  })
})
