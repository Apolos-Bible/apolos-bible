/**
 * The keybinding registry — the single source of truth.
 *
 * Adding a shortcut means adding a spec here and wiring a handler with
 * `useCommand(id, fn)` somewhere inside the matching scope. The cheatsheet
 * (`?`) renders from this list filtered to the handlers that are actually
 * registered, so a documented shortcut can never drift from a working one:
 * no handler → not listed, no spec → won't bind.
 *
 * Scopes stack. `app` is always active; `reader` is pushed by the Bible
 * reader; `study` by the study canvas; `dialog` by every modal/menu and is
 * *blocking*, so a key never leaks past an open dialog to the page behind it.
 */

import type en from '@/locales/en.json'

/** Any key present in the translation catalogue. */
export type TranslationKey = keyof typeof en

export type CommandScope = 'app' | 'reader' | 'study' | 'dialog'

export type CommandGroup = 'app' | 'navigation' | 'verse' | 'panels' | 'study'

export interface CommandSpec {
  id: string
  /** Bindings that trigger it. All are bound; all are shown. */
  keys: string[]
  scope: CommandScope
  group: CommandGroup
  /** i18n key for the cheatsheet row. */
  descriptionKey: TranslationKey
  /** Fire even while focus is in a text field. Default false. */
  allowInInput?: boolean
  /** Don't call preventDefault when it fires. Default false. */
  passthrough?: boolean
  /** Bound but omitted from the cheatsheet (aliases, redundant chords). */
  hidden?: boolean
  /**
   * Command ids this one deliberately takes over while its scope is active.
   * Reusing a key that a wider scope already owns is fine, but it has to be
   * declared: the registry test rejects undeclared shadowing, and the
   * cheatsheet hides the overridden row so two entries never claim one key.
   */
  overrides?: string[]
}

export const COMMAND_GROUP_ORDER: CommandGroup[] = ['navigation', 'verse', 'panels', 'study', 'app']

export const COMMANDS: CommandSpec[] = [
  {
    id: 'app.assistant', keys: ['mod+shift+j'], scope: 'app', group: 'app',
    descriptionKey: 'assistant.open', allowInInput: true,
  },
  // ── App (always active) ──────────────────────────────────────────────────
  {
    id: 'app.commandPalette',
    keys: ['mod+k'],
    scope: 'app',
    group: 'app',
    descriptionKey: 'shortcuts.openCommandPalette',
    allowInInput: true,
  },
  {
    id: 'app.closeTab',
    keys: ['mod+w'],
    scope: 'app',
    group: 'app',
    descriptionKey: 'shortcuts.closeTab',
    allowInInput: true,
  },
  {
    id: 'app.search',
    keys: ['/'],
    scope: 'app',
    group: 'app',
    descriptionKey: 'shortcuts.search',
  },
  {
    id: 'app.shortcuts',
    keys: ['?'],
    scope: 'app',
    group: 'app',
    descriptionKey: 'shortcuts.togglePanel',
  },
  {
    id: 'app.goHome',
    keys: ['g h'],
    scope: 'app',
    group: 'navigation',
    descriptionKey: 'shortcuts.goHome',
  },
  {
    id: 'app.goProfile',
    keys: ['g p'],
    scope: 'app',
    group: 'navigation',
    descriptionKey: 'shortcuts.goProfile',
  },
  {
    id: 'app.goSettings',
    keys: ['g s'],
    scope: 'app',
    group: 'navigation',
    descriptionKey: 'shortcuts.goSettings',
  },
  {
    id: 'app.cycleRegion',
    keys: ['f6'],
    scope: 'app',
    group: 'navigation',
    descriptionKey: 'shortcuts.cycleRegion',
    allowInInput: true,
  },
  {
    id: 'app.cycleRegionBack',
    keys: ['shift+f6'],
    scope: 'app',
    group: 'navigation',
    descriptionKey: 'shortcuts.cycleRegionBack',
    allowInInput: true,
    hidden: true,
  },

  // ── Dialogs ─────────────────────────────────────────────────────────────
  {
    id: 'dialog.close',
    keys: ['escape', 'mod+w'],
    scope: 'dialog',
    group: 'app',
    descriptionKey: 'shortcuts.closeDialog',
    allowInInput: true,
    overrides: ['app.closeTab'],
  },

  // ── Reader: navigation ──────────────────────────────────────────────────
  {
    id: 'reader.nextVerse',
    keys: ['j'],
    scope: 'reader',
    group: 'navigation',
    descriptionKey: 'shortcuts.nextVerse',
  },
  {
    id: 'reader.prevVerse',
    keys: ['k'],
    scope: 'reader',
    group: 'navigation',
    descriptionKey: 'shortcuts.prevVerse',
  },
  {
    id: 'reader.nextChapter',
    keys: ['arrowright', 'l'],
    scope: 'reader',
    group: 'navigation',
    descriptionKey: 'shortcuts.nextChapter',
  },
  {
    id: 'reader.prevChapter',
    keys: ['arrowleft'],
    scope: 'reader',
    group: 'navigation',
    descriptionKey: 'shortcuts.prevChapter',
  },
  {
    id: 'reader.focusBooks',
    keys: ['b'],
    scope: 'reader',
    group: 'navigation',
    descriptionKey: 'shortcuts.focusBooks',
  },
  {
    id: 'reader.toggleSelection',
    keys: ['enter', 'space'],
    scope: 'reader',
    group: 'verse',
    descriptionKey: 'shortcuts.toggleSelection',
  },
  {
    id: 'reader.extendSelectionNext',
    keys: ['shift+j', 'shift+arrowdown'],
    scope: 'reader',
    group: 'verse',
    descriptionKey: 'shortcuts.extendSelectionNext',
  },
  {
    id: 'reader.extendSelectionPrev',
    keys: ['shift+k', 'shift+arrowup'],
    scope: 'reader',
    group: 'verse',
    descriptionKey: 'shortcuts.extendSelectionPrev',
  },
  {
    id: 'reader.selectAll',
    keys: ['mod+a'],
    scope: 'reader',
    group: 'verse',
    descriptionKey: 'shortcuts.selectAll',
  },
  {
    id: 'reader.clearSelection',
    keys: ['escape'],
    scope: 'reader',
    group: 'verse',
    descriptionKey: 'shortcuts.clearSelection',
  },

  // ── Reader: verse actions ───────────────────────────────────────────────
  {
    id: 'reader.openActions',
    keys: ['.', 'contextmenu', 'shift+f10'],
    scope: 'reader',
    group: 'verse',
    descriptionKey: 'shortcuts.openActions',
  },
  {
    id: 'reader.addNote',
    keys: ['n'],
    scope: 'reader',
    group: 'verse',
    descriptionKey: 'shortcuts.focusNote',
  },
  {
    id: 'reader.toggleHighlight',
    keys: ['h'],
    scope: 'reader',
    group: 'verse',
    descriptionKey: 'shortcuts.toggleHighlight',
  },
  {
    id: 'reader.highlightColor',
    keys: ['1', '2', '3'],
    scope: 'reader',
    group: 'verse',
    descriptionKey: 'shortcuts.highlightColor',
  },
  {
    id: 'reader.toggleFavorite',
    keys: ['f'],
    scope: 'reader',
    group: 'verse',
    descriptionKey: 'shortcuts.toggleFavorite',
  },
  {
    id: 'reader.copyText',
    keys: ['mod+c'],
    scope: 'reader',
    group: 'verse',
    descriptionKey: 'shortcuts.copyText',
  },
  {
    id: 'reader.copyReference',
    keys: ['mod+shift+c'],
    scope: 'reader',
    group: 'verse',
    descriptionKey: 'shortcuts.copyReference',
  },
  {
    id: 'reader.crossReferences',
    keys: ['x'],
    scope: 'reader',
    group: 'verse',
    descriptionKey: 'shortcuts.crossReferences',
  },
  {
    id: 'reader.compareVersions',
    keys: ['d'],
    scope: 'reader',
    group: 'verse',
    descriptionKey: 'shortcuts.compareVersions',
  },
  {
    id: 'reader.shareVerses',
    keys: ['mod+shift+s'],
    scope: 'reader',
    group: 'verse',
    descriptionKey: 'shortcuts.shareVerses',
  },
  {
    id: 'reader.similarVerses',
    keys: ['s'],
    scope: 'reader',
    group: 'verse',
    descriptionKey: 'shortcuts.similarVerses',
  },

  // ── Reader: view & panels ───────────────────────────────────────────────
  {
    id: 'reader.toggleReadingMode',
    keys: ['v'],
    scope: 'reader',
    group: 'panels',
    descriptionKey: 'shortcuts.toggleReadingMode',
  },
  {
    id: 'reader.toggleCommentary',
    keys: ['m'],
    scope: 'reader',
    group: 'panels',
    descriptionKey: 'shortcuts.toggleCommentary',
  },
  {
    id: 'reader.panelFavorites',
    keys: ['g f'],
    scope: 'reader',
    group: 'panels',
    descriptionKey: 'shortcuts.panelFavorites',
  },
  {
    id: 'reader.panelNotes',
    keys: ['g n'],
    scope: 'reader',
    group: 'panels',
    descriptionKey: 'shortcuts.panelNotes',
  },
  {
    id: 'reader.panelFriends',
    keys: ['g a'],
    scope: 'reader',
    group: 'panels',
    descriptionKey: 'shortcuts.panelFriends',
  },
  {
    id: 'reader.panelChat',
    keys: ['g c'],
    scope: 'reader',
    group: 'panels',
    descriptionKey: 'shortcuts.panelChat',
  },
  {
    id: 'reader.panelStudies',
    keys: ['g e'],
    scope: 'reader',
    group: 'panels',
    descriptionKey: 'shortcuts.panelStudies',
  },

  // ── Study canvas ────────────────────────────────────────────────────────
  {
    id: 'study.toolSelect',
    keys: ['v'],
    scope: 'study',
    group: 'study',
    descriptionKey: 'shortcuts.studyToolSelect',
  },
  {
    id: 'study.toolHand',
    keys: ['h'],
    scope: 'study',
    group: 'study',
    descriptionKey: 'shortcuts.studyToolHand',
  },
  {
    id: 'study.toolDraw',
    keys: ['d'],
    scope: 'study',
    group: 'study',
    descriptionKey: 'shortcuts.studyToolDraw',
  },
  {
    id: 'study.toolErase',
    keys: ['e'],
    scope: 'study',
    group: 'study',
    descriptionKey: 'shortcuts.studyToolErase',
  },
  {
    id: 'study.addNote',
    keys: ['n'],
    scope: 'study',
    group: 'study',
    descriptionKey: 'shortcuts.studyAddNote',
  },
  {
    id: 'study.insertVerse',
    keys: ['i'],
    scope: 'study',
    group: 'study',
    descriptionKey: 'shortcuts.studyInsertVerse',
  },
  {
    id: 'study.toggleBible',
    keys: ['b'],
    scope: 'study',
    group: 'study',
    descriptionKey: 'shortcuts.studyToggleBible',
  },
  {
    id: 'study.bibleSearch',
    keys: ['/'],
    scope: 'study',
    group: 'study',
    descriptionKey: 'shortcuts.studyBibleSearch',
    // On the canvas, "/" searching the Bible tool beats opening the palette;
    // the palette is still on mod+k.
    overrides: ['app.search'],
  },
  {
    id: 'study.toggleChat',
    keys: ['a'],
    scope: 'study',
    group: 'study',
    descriptionKey: 'shortcuts.studyToggleChat',
  },
  {
    id: 'study.toggleGuide',
    keys: ['g'],
    scope: 'study',
    group: 'study',
    descriptionKey: 'shortcuts.studyToggleGuide',
  },
  {
    id: 'study.askApolos',
    keys: ['mod+j'],
    scope: 'study',
    group: 'study',
    descriptionKey: 'shortcuts.studyAskApolos',
    allowInInput: true,
  },
  {
    id: 'study.undo',
    keys: ['mod+z'],
    scope: 'study',
    group: 'study',
    descriptionKey: 'shortcuts.studyUndo',
    allowInInput: true,
  },
  {
    id: 'study.redo',
    keys: ['mod+shift+z'],
    scope: 'study',
    group: 'study',
    descriptionKey: 'shortcuts.studyRedo',
    allowInInput: true,
  },
  {
    id: 'study.drawSizeDown',
    keys: ['['],
    scope: 'study',
    group: 'study',
    descriptionKey: 'shortcuts.studyDrawSizeDown',
  },
  {
    id: 'study.drawSizeUp',
    keys: [']'],
    scope: 'study',
    group: 'study',
    descriptionKey: 'shortcuts.studyDrawSizeUp',
  },
  {
    id: 'study.drawColor',
    keys: ['1', '2', '3', '4', '5', '6'],
    scope: 'study',
    group: 'study',
    descriptionKey: 'shortcuts.studyDrawColor',
  },
]

export const COMMANDS_BY_ID: Record<string, CommandSpec> = COMMANDS.reduce<Record<string, CommandSpec>>(
  (acc, command) => {
    acc[command.id] = command
    return acc
  },
  {},
)

export type CommandId = string
