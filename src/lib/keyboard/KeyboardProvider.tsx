import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { isMac } from '@/lib/platform'
import { COMMANDS_BY_ID, type CommandScope } from './commands'
import {
  eventToStep,
  parseBinding,
  sequenceIsPrefix,
  sequenceMatches,
  type EventStep,
  type KeyStep,
} from './binding'
import { getRegisteredCommandIds, nextScopeToken, useKeyboardStore, type CommandHandler } from './store'

/** How long a partial chord ("g" of "g p") stays armed. */
const SEQUENCE_TIMEOUT_MS = 900

const ScopeTokenContext = createContext<number | null>(null)

const DEV = (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true

/** Parsed bindings are stable per spec — parse once. */
const bindingCache = new Map<string, KeyStep[]>()
function stepsFor(binding: string): KeyStep[] {
  let steps = bindingCache.get(binding)
  if (!steps) {
    steps = parseBinding(binding)
    bindingCache.set(binding, steps)
  }
  return steps
}

function maxSteps(keys: string[]): number {
  return keys.reduce((max, binding) => Math.max(max, stepsFor(binding).length), 0)
}

function isTextEntry(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || typeof el.closest !== 'function') return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return el.closest('[data-keyboard-input]') != null
}

/**
 * Claims a scope token during render and registers/unregisters the scope
 * around the component's lifetime.
 *
 * Priority comes from the token, not from array order: tokens are handed out in
 * render order (parents before children, earlier opens before later ones), so
 * sorting descending gives "innermost / most recently opened wins" regardless
 * of the order React happens to run effects in.
 */
function useScopeRegistration(scope: CommandScope, blocking: boolean, enabled: boolean): number | null {
  const registerScope = useKeyboardStore((s) => s.registerScope)
  const unregisterScope = useKeyboardStore((s) => s.unregisterScope)

  const tokenRef = useRef<number | null>(null)
  if (enabled && tokenRef.current == null) tokenRef.current = nextScopeToken()
  const token = tokenRef.current

  useLayoutEffect(() => {
    if (token == null || !enabled) return
    registerScope({ token, scope, blocking })
    return () => unregisterScope(token)
  }, [token, scope, blocking, enabled, registerScope, unregisterScope])

  return enabled ? token : null
}

/**
 * Mounts the app's single keydown listener and the always-on `app` scope.
 * Everything else registers into it via `useCommand` / `KeyboardScope`.
 */
export function KeyboardProvider({ children }: { children: ReactNode }) {
  const token = useScopeRegistration('app', false, true)

  const bufferRef = useRef<EventStep[]>([])
  const bufferAtRef = useRef(0)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return

      const now = Date.now()
      if (now - bufferAtRef.current > SEQUENCE_TIMEOUT_MS) bufferRef.current = []
      bufferAtRef.current = now
      bufferRef.current = [...bufferRef.current, eventToStep(e)]
      const buffer = bufferRef.current

      const inTextEntry = isTextEntry(e.target)
      const { scopes, handlers } = useKeyboardStore.getState()
      const ordered = [...scopes].sort((a, b) => b.token - a.token)

      let keepBuffer = false
      let handled = false

      for (const scope of ordered) {
        const registered = handlers[scope.token]

        if (registered) {
          const candidates = Object.entries(registered)
            .map(([id, handler]) => ({ id, handler, spec: COMMANDS_BY_ID[id] }))
            .filter((entry) => entry.spec != null)
            .filter((entry) => !inTextEntry || entry.spec.allowInInput === true)
            // Longer sequences win over the single key that ends them, so
            // "g p" beats a bare "p" bound in the same scope.
            .sort((a, b) => maxSteps(b.spec.keys) - maxSteps(a.spec.keys))

          for (const entry of candidates) {
            for (const binding of entry.spec.keys) {
              const steps = stepsFor(binding)
              if (sequenceMatches(steps, buffer, isMac)) {
                // A handler may decline (return false) when it isn't applicable
                // right now — e.g. Enter with no verse focused.
                if (entry.handler(e) === false) continue
                handled = true
                if (!entry.spec.passthrough) e.preventDefault()
                break
              }
              if (sequenceIsPrefix(steps, buffer, isMac)) keepBuffer = true
            }
            if (handled) break
          }
        }

        // A blocking scope (dialog, menu) ends the walk so keys never leak to
        // the page behind it.
        if (handled || scope.blocking) break
      }

      bufferRef.current = handled || !keepBuffer ? [] : buffer
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return <ScopeTokenContext.Provider value={token}>{children}</ScopeTokenContext.Provider>
}

/**
 * Pushes a scope for as long as it is mounted. `blocking` scopes shadow
 * everything below them — use it for modals and menus.
 */
export function KeyboardScope({
  scope,
  blocking = false,
  enabled = true,
  children,
}: {
  scope: CommandScope
  blocking?: boolean
  enabled?: boolean
  children: ReactNode
}) {
  const parent = useContext(ScopeTokenContext)
  const token = useScopeRegistration(scope, blocking, enabled)

  return (
    <ScopeTokenContext.Provider value={enabled ? token : parent}>
      {children}
    </ScopeTokenContext.Provider>
  )
}

/**
 * Binds `handler` to a registry command inside the nearest scope.
 * Return `false` from the handler to decline the key and let it fall through.
 */
export function useCommand(commandId: string, handler: CommandHandler, options?: { enabled?: boolean }) {
  useCommands({ [commandId]: handler }, options)
}

/** Bind several commands at once: `useCommands({ 'reader.nextVerse': fn })`. */
export function useCommands(map: Record<string, CommandHandler>, options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  const token = useContext(ScopeTokenContext)
  const setHandlers = useKeyboardStore((s) => s.setHandlers)
  const clearHandlers = useKeyboardStore((s) => s.clearHandlers)

  // Keep the latest closures without re-registering, so callers don't have to
  // memoize every handler.
  const mapRef = useRef(map)
  mapRef.current = map

  const ids = Object.keys(map).sort().join('|')

  useEffect(() => {
    if (!enabled || token == null) return
    const commandIds = ids ? ids.split('|') : []
    if (commandIds.length === 0) return

    if (DEV) {
      commandIds
        .filter((id) => !COMMANDS_BY_ID[id])
        .forEach((id) => console.warn(`[keyboard] "${id}" is not in the command registry — it will never fire.`))
    }

    const bound: Record<string, CommandHandler> = {}
    commandIds.forEach((id) => {
      bound[id] = (e) => mapRef.current[id]?.(e)
    })
    setHandlers(token, bound)

    return () => clearHandlers(token, commandIds)
  }, [ids, enabled, token, setHandlers, clearHandlers])
}

/** Command ids with a live handler — what the cheatsheet lists. */
export function useRegisteredCommandIds(): Set<string> {
  const handlers = useKeyboardStore((s) => s.handlers)
  return useMemo(() => getRegisteredCommandIds(handlers), [handlers])
}
