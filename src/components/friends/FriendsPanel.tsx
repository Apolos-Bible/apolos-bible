import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { useUIStore } from '@/lib/store/useUIStore'
import { useChatStore } from '@/lib/store/useChatStore'
import { ConversationList } from '@/components/chat/ConversationList'
import { NewChatDialog } from '@/components/chat/NewChatDialog'
import { PanelHeader } from '@/components/layout/PanelHeader'

/** The social inbox: direct messages and group conversations share one list. */
export function FriendsPanel() {
  const { t } = useTranslation()
  const closePanel = useUIStore((s) => s.closePanel)
  const openFloating = useChatStore((s) => s.openFloating)
  const [composerOpen, setComposerOpen] = useState(false)

  return (
    <div className="w-full md:w-panel h-full bg-bg-secondary border-r border-border-subtle flex flex-col overflow-hidden">
      <PanelHeader
        title={t('nav.chats')}
        onClose={closePanel}
        closeLabel={t('chat.closeChats')}
        actions={
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            aria-label={t('common.newChat')}
            title={t('common.newChat')}
            className="inline-flex h-10 w-10 md:h-8 md:w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          >
            <Plus className="h-5 w-5 md:h-4 md:w-4" strokeWidth={1.75} />
          </button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ConversationList
          onNewChat={() => setComposerOpen(true)}
          onSelect={(conversation) => { void openFloating(conversation.id) }}
        />
      </div>

      <NewChatDialog
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreated={async (conversation) => { await openFloating(conversation.id) }}
      />
    </div>
  )
}
