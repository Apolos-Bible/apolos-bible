export interface ChatCommand {
  trigger:     string  // e.g. 'v'
  label:       string  // e.g. '/v'
  description: string
}

export const CHAT_COMMANDS: ChatCommand[] = [
  {
    trigger:     'v',
    label:       '/v',
    description: 'Buscar e insertar un versículo',
  },
]

export function filterCommands(input: string): ChatCommand[] {
  const term = input.replace(/^\//, '').toLowerCase()
  if (!term) return CHAT_COMMANDS
  return CHAT_COMMANDS.filter(c => c.trigger.startsWith(term) || c.label.startsWith('/' + term))
}
