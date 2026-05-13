import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { useChatStore } from '@/lib/store/useChatStore'
import { useUIStore } from '@/lib/store/useUIStore'
import { ConversationList } from './ConversationList'
import { ChatThread } from './ChatThread'
import { NewChatDialog } from './NewChatDialog'
import { PanelHeader, PanelHeaderButton } from '@/components/layout/PanelHeader'

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
    <div className="w-full h-full bg-bg-secondary md:bg-bg-primary flex flex-col overflow-hidden">
      {selected ? (
        <ChatThread conversation={selected} onBack={() => select(null)} />
      ) : (
        <>
          <PanelHeader
            title={t('nav.chat')}
            onClose={closePanel}
            closeLabel={t('chat.closeChat')}
            actions={
              <PanelHeaderButton onClick={() => setComposerOpen(true)} aria-label={t('common.newChat')} title={t('common.newChat')}>
                <Plus className="h-5 w-5 md:h-4 md:w-4" strokeWidth={1.75} />
              </PanelHeaderButton>
            }
          />
          <ConversationList onNewChat={() => setComposerOpen(true)} />
        </>
      )}

      <NewChatDialog open={composerOpen} onClose={() => setComposerOpen(false)} />
    </div>
  )
}
