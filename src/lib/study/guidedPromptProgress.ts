import type { GuidedPrompt } from './guidedApi'

/**
 * Decide how many prompts a guided step should expose.
 *
 * Prompts with a reference answer are progressive: the first one whose answer
 * has not been deliberately revealed is the current prompt. Personal prompts
 * have no reference answer and never become gates.
 */
export function visibleGuidedPromptCount(
  prompts: GuidedPrompt[],
  isRevealed: (index: number) => boolean,
): number {
  const current = prompts.findIndex((prompt, index) => Boolean(prompt.answer) && !isRevealed(index))
  return current === -1 ? prompts.length : current + 1
}
