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
  const archivedCount = useChatStore((s) => s.conversations.filter((conversation) => conversation.archived_at !== null).length)
  const [composerOpen, setComposerOpen] = useState(false)
  const [filter, setFilter] = useState<'active' | 'archived'>('active')

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

      <div className="flex shrink-0 gap-1 border-b border-border-subtle bg-bg-primary/40 px-3 py-2" role="tablist" aria-label={t('chat.filters')}>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'active'}
          onClick={() => setFilter('active')}
          className={filter === 'active'
            ? 'rounded-full bg-bg-tertiary px-3 py-1.5 text-xs font-medium text-text-primary'
            : 'rounded-full px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text-primary'}
        >
          {t('nav.chats')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'archived'}
          onClick={() => setFilter('archived')}
          className={filter === 'archived'
            ? 'rounded-full bg-bg-tertiary px-3 py-1.5 text-xs font-medium text-text-primary'
            : 'rounded-full px-3 py-1.5 text-xs text-text-muted transition-colors hover:text-text-primary'}
        >
          {t('chat.archivedTab')}{archivedCount > 0 ? ` (${archivedCount})` : ''}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <ConversationList
          filter={filter}
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
