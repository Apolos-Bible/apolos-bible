export interface ChatCommand {
  trigger:     string  // e.g. 'v'
  label:       string  // e.g. '/v'
  description: string  // i18n key
}

export const CHAT_COMMANDS: ChatCommand[] = [
  {
    trigger:     'v',
    label:       '/v',
    description: 'chat.commandVerseDesc',
  },
]

export function filterCommands(input: string): ChatCommand[] {
  const term = input.replace(/^\//, '').toLowerCase()
  if (!term) return CHAT_COMMANDS
  return CHAT_COMMANDS.filter(c => c.trigger.startsWith(term) || c.label.startsWith('/' + term))
}
