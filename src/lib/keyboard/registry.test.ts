import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { COMMANDS, type CommandScope } from './commands'
import { parseBinding } from './binding'
import en from '@/locales/en.json'
import es from '@/locales/es.json'

const SRC = join(process.cwd(), 'src')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : []
  })
}

/** Every source file except the registry itself. */
const CALL_SITES = sourceFiles(SRC)
  .filter((path) => !path.endsWith(join('keyboard', 'commands.ts')))
  .map((path) => ({ path, text: readFileSync(path, 'utf8') }))

/** Scopes that can be active at the same time, so their bindings must not clash. */
const CONCURRENT_SCOPES: [CommandScope, CommandScope][] = [
  ['app', 'reader'],
  ['app', 'study'],
]

const ID = String.raw`(?:app|reader|study|dialog)\.[A-Za-z]+`

/**
 * Command ids that source actually binds. Matches the two call shapes —
 * `useCommands({ 'id': fn })` and `useCommand('id', fn)` — rather than any
 * quoted string, so i18n keys sharing a namespace prefix aren't miscounted.
 */
function boundCommandIds(): Set<string> {
  const bound = new Set<string>()
  const patterns = [new RegExp(`'(${ID})'\\s*:`, 'g'), new RegExp(`useCommand\\(\\s*'(${ID})'`, 'g')]

  for (const { text } of CALL_SITES) {
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) bound.add(match[1])
    }
  }
  return bound
}

function bindingsOf(scope: CommandScope) {
  return COMMANDS.filter((command) => command.scope === scope).flatMap((command) =>
    command.keys.map((binding) => ({ id: command.id, binding })),
  )
}

describe('command registry', () => {
  it('has unique ids', () => {
    const ids = COMMANDS.map((command) => command.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has at least one parseable binding per command', () => {
    for (const command of COMMANDS) {
      expect(command.keys.length, command.id).toBeGreaterThan(0)
      for (const binding of command.keys) {
        const steps = parseBinding(binding)
        expect(steps.length, `${command.id} → ${binding}`).toBeGreaterThan(0)
        expect(steps.every((step) => step.key.length > 0), `${command.id} → ${binding}`).toBe(true)
      }
    }
  })

  it('never binds the same keys twice within one scope', () => {
    const scopes = [...new Set(COMMANDS.map((command) => command.scope))]
    for (const scope of scopes) {
      const seen = new Map<string, string>()
      for (const { id, binding } of bindingsOf(scope)) {
        const previous = seen.get(binding)
        expect(previous, `"${binding}" is bound by both ${previous} and ${id} in scope "${scope}"`).toBeUndefined()
        seen.set(binding, id)
      }
    }
  })

  it('never lets a scope shadow a binding of a scope it coexists with', () => {
    for (const [outer, inner] of CONCURRENT_SCOPES) {
      const outerBindings = new Map(bindingsOf(outer).map(({ binding, id }) => [binding, id]))
      for (const { id, binding } of bindingsOf(inner)) {
        const clash = outerBindings.get(binding)
        if (clash == null) continue

        // Taking over a wider scope's key is allowed, but only when declared.
        const declared = COMMANDS.find((command) => command.id === id)?.overrides ?? []
        expect(
          declared,
          `"${binding}" is bound by ${id} (${inner}) and shadows ${clash} (${outer}) — ` +
            `add overrides: ['${clash}'] to ${id} if that is intended`,
        ).toContain(clash)
      }
    }
  })

  it('only declares overrides for commands that exist and actually clash', () => {
    for (const command of COMMANDS) {
      for (const overridden of command.overrides ?? []) {
        const target = COMMANDS.find((candidate) => candidate.id === overridden)
        expect(target, `${command.id} overrides unknown command ${overridden}`).toBeDefined()

        const shared = command.keys.filter((binding) => target!.keys.includes(binding))
        expect(
          shared,
          `${command.id} overrides ${overridden} but shares no binding with it — stale declaration`,
        ).not.toEqual([])
      }
    }
  })

  it('describes every command in both locales', () => {
    for (const command of COMMANDS) {
      expect(en, `en.json is missing ${command.descriptionKey}`).toHaveProperty(command.descriptionKey)
      expect(es, `es.json is missing ${command.descriptionKey}`).toHaveProperty(command.descriptionKey)
    }
  })

  // The two halves of the contract the cheatsheet depends on: a documented
  // shortcut must be wired to something, and a wired shortcut must be declared.
  it('wires a handler for every registered command', () => {
    const handled = boundCommandIds()
    const unwired = COMMANDS.map((command) => command.id).filter((id) => !handled.has(id))

    expect(unwired, `declared but never handled: ${unwired.join(', ')}`).toEqual([])
  })

  it('declares every command id that a handler binds', () => {
    const known = new Set(COMMANDS.map((command) => command.id))
    const undeclared = [...boundCommandIds()].filter((id) => !known.has(id))

    expect(undeclared, `handled but not in the registry: ${undeclared.join(', ')}`).toEqual([])
  })
})
