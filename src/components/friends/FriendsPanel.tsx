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
    <div className="flex h-full w-full min-w-0 flex-col overflow-hidden border-r border-border-subtle bg-bg-secondary">
      <PanelHeader
        title={t('nav.chats')}
        description={t('chat.inboxDescription')}
        className="bg-bg-primary/60"
        onClose={closePanel}
        closeLabel={t('chat.closeChats')}
        actions={
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            aria-label={t('common.newChat')}
            title={t('common.newChat')}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent transition-colors hover:bg-accent/20 md:h-8 md:w-8"
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
