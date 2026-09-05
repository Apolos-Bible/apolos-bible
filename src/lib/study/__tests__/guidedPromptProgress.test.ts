import { describe, expect, it } from 'vitest'
import { visibleGuidedPromptCount } from '../guidedPromptProgress'

const progressivePrompts = [
  { question: 'Primera', answer: 'Respuesta uno' },
  { question: 'Segunda', answer: 'Respuesta dos' },
  { question: 'Tercera', answer: 'Respuesta tres' },
]

describe('visibleGuidedPromptCount', () => {
  it('does not reveal another question merely because the person started typing', () => {
    const revealed = new Set<number>()

    // Draft text is intentionally not part of the progression state: only an
    // explicit reveal can add an index to this set.
    expect(visibleGuidedPromptCount(progressivePrompts, (index) => revealed.has(index))).toBe(1)
  })

  it('reveals the next question after the current reference answer is requested', () => {
    const revealed = new Set([0])

    expect(visibleGuidedPromptCount(progressivePrompts, (index) => revealed.has(index))).toBe(2)
  })

  it('shows personal questions one at a time', () => {
    const personalPrompts = [
      { question: '¿Cómo estás?', answer: null },
      { question: '¿Qué quieres cambiar?', answer: null },
    ]

    expect(visibleGuidedPromptCount(personalPrompts, () => false)).toBe(1)
  })

  it('keeps a personal prompt as the first step before later questions', () => {
    const mixedPrompts = [
      { question: 'Personal', answer: null },
      { question: 'Sobre el texto', answer: 'Respuesta' },
      { question: 'Otra del texto', answer: 'Otra respuesta' },
    ]

    expect(visibleGuidedPromptCount(mixedPrompts, () => false)).toBe(1)
  })
})
