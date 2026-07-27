import { create } from 'zustand'
import type { CommandScope } from './commands'

/**
 * Handlers are registered against a *scope instance*, not a scope name, so two
 * dialogs of the same kind can be open at once and only the topmost responds.
 *
 * `token` doubles as priority: tokens are handed out in render order, so a
 * higher token means "more specific / more recently opened".
 */
export interface ScopeInstance {
  token: number
  scope: CommandScope
  /** Shadows every scope below it — dispatch stops here. */
  blocking: boolean
}

/** Returning `false` declines the key — dispatch keeps looking further down. */
export type CommandHandler = (e: KeyboardEvent) => boolean | void

type KeyboardStore = {
  scopes: ScopeInstance[]
  /** scope token → command id → handler */
  handlers: Record<number, Record<string, CommandHandler>>

  registerScope: (instance: ScopeInstance) => void
  unregisterScope: (token: number) => void
  setHandlers: (token: number, handlers: Record<string, CommandHandler>) => void
  clearHandlers: (token: number, commandIds: string[]) => void
}

let _scopeSeq = 0

/** Claim the next token. Pure counter — safe to call during render. */
export function nextScopeToken(): number {
  return ++_scopeSeq
}

export const useKeyboardStore = create<KeyboardStore>((set) => ({
  scopes: [],
  handlers: {},

  registerScope: (instance) =>
    set((s) =>
      s.scopes.some((entry) => entry.token === instance.token)
        ? s
        : { scopes: [...s.scopes, instance] },
    ),

  unregisterScope: (token) =>
    set((s) => {
      const handlers = { ...s.handlers }
      delete handlers[token]
      return { scopes: s.scopes.filter((entry) => entry.token !== token), handlers }
    }),

  setHandlers: (token, incoming) =>
    set((s) => ({
      handlers: {
        ...s.handlers,
        [token]: { ...(s.handlers[token] ?? {}), ...incoming },
      },
    })),

  clearHandlers: (token, commandIds) =>
    set((s) => {
      const forToken = s.handlers[token]
      if (!forToken) return s
      const next = { ...forToken }
      let changed = false
      commandIds.forEach((id) => {
        if (id in next) {
          delete next[id]
          changed = true
        }
      })
      if (!changed) return s
      return { handlers: { ...s.handlers, [token]: next } }
    }),
}))

/**
 * Every command id that currently has a handler, regardless of whether a
 * blocking scope is shadowing it. The cheatsheet uses this: with the cheatsheet
 * dialog open (a blocking scope), the reader's shortcuts are shadowed for
 * dispatch but must still be listed — they're what the user came to look up.
 */
export function getRegisteredCommandIds(
  handlers: Record<number, Record<string, CommandHandler>>,
): Set<string> {
  const ids = new Set<string>()
  for (const perScope of Object.values(handlers)) {
    for (const id of Object.keys(perScope)) ids.add(id)
  }
  return ids
}
