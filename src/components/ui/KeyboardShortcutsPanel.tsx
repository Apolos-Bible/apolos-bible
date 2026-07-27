import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '@/lib/store/useUIStore'
import { Dialog } from '@/components/ui/Dialog'
import {
  COMMANDS,
  COMMAND_GROUP_ORDER,
  formatBinding,
  useRegisteredCommandIds,
  type CommandGroup,
  type CommandSpec,
  type TranslationKey,
} from '@/lib/keyboard'
import { isMac } from '@/lib/platform'
import { cn } from '@/lib/cn'

const GROUP_LABEL_KEYS: Record<CommandGroup, TranslationKey> = {
  navigation: 'shortcuts.groupNavigation',
  verse: 'shortcuts.groupVerse',
  panels: 'shortcuts.groupPanels',
  study: 'shortcuts.groupStudy',
  app: 'shortcuts.groupApp',
}

/**
 * Rendered from the command registry, filtered to the commands that actually
 * have a handler right now. A shortcut can't be listed unless it works, and it
 * can't work without appearing here.
 */
export function KeyboardShortcutsPanel() {
  const { t } = useTranslation()
  const shortcutsPanelOpen = useUIStore((s) => s.shortcutsPanelOpen)
  const toggleShortcutsPanel = useUIStore((s) => s.toggleShortcutsPanel)
  const registered = useRegisteredCommandIds()

  const groups = useMemo(() => {
    const live = COMMANDS.filter((command) => !command.hidden && registered.has(command.id))

    // A command that is currently overridden must not be listed: its key belongs
    // to the overriding command right now, and two rows claiming one key is
    // exactly the drift this panel exists to prevent.
    const overridden = new Set(live.flatMap((command) => command.overrides ?? []))
    const available = live.filter((command) => !overridden.has(command.id))

    return COMMAND_GROUP_ORDER.map((group) => ({
      group,
      commands: available.filter((command) => command.group === group),
    })).filter((entry) => entry.commands.length > 0)
  }, [registered])

  return (
    <Dialog
      open={shortcutsPanelOpen}
      onClose={toggleShortcutsPanel}
      labelledBy="shortcuts-title"
      className="max-w-lg w-full max-h-[80vh] flex flex-col bg-bg-secondary rounded-xl border border-border-subtle shadow-2xl overflow-hidden mx-4"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle shrink-0">
        <h2 id="shortcuts-title" className="text-md font-medium text-text-primary">
          {t('shortcuts.title')}
        </h2>
        <button
          type="button"
          onClick={toggleShortcutsPanel}
          className="text-text-muted hover:text-text-secondary transition-colors text-lg leading-none"
          aria-label={t('shortcuts.closePanelAria')}
        >
          ×
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        {groups.map(({ group, commands }) => (
          <section key={group} className="mb-4 last:mb-1">
            <h3 className="text-2xs font-semibold uppercase tracking-wider text-text-muted py-1.5">
              {t(GROUP_LABEL_KEYS[group])}
            </h3>
            <ul className="flex flex-col gap-0.5">
              {commands.map((command) => (
                <li key={command.id} className="flex items-center justify-between py-1.5 gap-4">
                  <span className="text-sm text-text-secondary">{t(command.descriptionKey)}</span>
                  <Bindings command={command} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Dialog>
  )
}

function Bindings({ command }: { command: CommandSpec }) {
  const { t } = useTranslation()

  return (
    <span className="flex items-center gap-1.5 shrink-0">
      {command.keys.map((binding, bindingIndex) => (
        <Fragment key={binding}>
          {bindingIndex > 0 && <span className="text-2xs text-text-muted">{t('shortcuts.or')}</span>}
          <span className="flex items-center gap-1">
            {formatBinding(binding, isMac).map((step, stepIndex) => (
              <Fragment key={stepIndex}>
                {stepIndex > 0 && <span className="text-2xs text-text-muted">{t('shortcuts.then')}</span>}
                <span className="flex items-center gap-0.5">
                  {step.map((chip) => (
                    <kbd
                      key={chip}
                      className={cn(
                        'bg-bg-tertiary border border-border-subtle rounded px-1.5 py-0.5',
                        'text-xs font-mono text-text-secondary shrink-0',
                      )}
                    >
                      {chip}
                    </kbd>
                  ))}
                </span>
              </Fragment>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  )
}
