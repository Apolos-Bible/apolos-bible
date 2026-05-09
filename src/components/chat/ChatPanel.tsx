import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X } from 'lucide-react'
import { useChatStore } from '@/lib/store/useChatStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { ConversationList } from './ConversationList'
import { ChatThread } from './ChatThread'
import { NewChatDialog } from './NewChatDialog'

export function ChatPanel() {
  const closePanel    = useUIStore(s => s.closePanel)
  const conversations = useChatStore(s => s.conversations)
  const selectedId    = useChatStore(s => s.selectedId)
  const load          = useChatStore(s => s.load)
  const select        = useChatStore(s => s.select)

  const { t } = useTranslation()
  const [composerOpen, setComposerOpen] = useState(false)

  useEffect(() => { load() }, [load])

  const selected = conversations.find(c => c.id === selectedId) ?? null

  return (
    <div className="w-full h-full bg-bg-primary flex flex-col overflow-hidden">
      {selected ? (
        <ChatThread conversation={selected} onBack={() => select(null)} />
      ) : (
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
            <span className="text-sm font-medium text-text-primary">{t('nav.chat')}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setComposerOpen(true)}
                aria-label={t('common.newChat')}
                title={t('common.newChat')}
                className="cursor-pointer text-text-muted hover:text-text-primary transition-colors p-1 rounded hover:bg-bg-tertiary"
              >
                <Plus className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <button
                onClick={closePanel}
                aria-label={t('chat.closeChat')}
                title={t('chat.closeChat')}
                className="cursor-pointer text-text-muted hover:text-text-primary transition-colors p-1 rounded hover:bg-bg-tertiary"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>
          <ConversationList />
        </>
      )}

      <NewChatDialog open={composerOpen} onClose={() => setComposerOpen(false)} />
    </div>
  )
}
