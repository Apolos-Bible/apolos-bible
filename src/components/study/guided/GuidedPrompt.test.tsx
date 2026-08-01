import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import { GuidedPrompt } from './GuidedPrompt'

const noop = () => {}

function prompt(index: number, autoFocus = false) {
  return (
    <GuidedPrompt
      key={index}
      index={index}
      question={`Pregunta ${index + 1}`}
      answer={null}
      myAnswer=""
      revealed={false}
      onChange={noop}
      onBlur={noop}
      onReveal={noop}
      autoFocus={autoFocus}
    />
  )
}

describe('GuidedPrompt focus', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('keeps the cursor in the current answer if another question is revealed while editing', () => {
    act(() => root.render(<>{prompt(0)}</>))
    const currentAnswer = container.querySelector('textarea')!
    currentAnswer.focus()

    // A reveal from another interaction or participant must not move focus
    // away from the answer currently being written.
    act(() => root.render(<>{prompt(0)}{prompt(1, true)}</>))

    expect(container.querySelectorAll('textarea')).toHaveLength(2)
    expect(document.activeElement).toBe(currentAnswer)
  })

  it('still focuses a newly revealed question when no field is being edited', () => {
    act(() => root.render(<>{prompt(0)}{prompt(1, true)}</>))

    expect(document.activeElement).toBe(container.querySelectorAll('textarea')[1])
  })
})
