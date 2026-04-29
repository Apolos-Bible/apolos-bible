import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
                className="text-text-muted hover:text-text-primary transition-colors p-1 rounded hover:bg-bg-tertiary"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                  <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
                </svg>
              </button>
              <button
                onClick={closePanel}
                aria-label={t('chat.closeChat')}
                className="text-text-muted hover:text-text-primary transition-colors p-1 rounded hover:bg-bg-tertiary"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                  <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
                </svg>
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
