import type { GuidedPrompt } from './guidedApi'

/**
 * Decide how many prompts a guided step should expose.
 *
 * Every prompt is progressive: the first one that has not been deliberately
 * continued is the current prompt. This keeps an introductory reflection from
 * opening every writing field at once.
 */
export function visibleGuidedPromptCount(
  prompts: GuidedPrompt[],
  isRevealed: (index: number) => boolean,
): number {
  const current = prompts.findIndex((_, index) => !isRevealed(index))
  return current === -1 ? prompts.length : current + 1
}
