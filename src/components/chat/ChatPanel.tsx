import { useEffect, useState } from 'react'
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

  const [composerOpen, setComposerOpen] = useState(false)

  useEffect(() => { load() }, [load])

  const selected = conversations.find(c => c.id === selectedId) ?? null

  return (
    <div className="w-full md:w-[640px] h-full bg-bg-primary border-r border-border-subtle flex overflow-hidden">
      {/* Left: conversation list */}
      <div className={`flex flex-col w-full md:w-64 md:shrink-0 border-r border-border-subtle ${selectedId !== null ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle shrink-0">
          <span className="text-sm font-medium text-text-primary">Chat</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setComposerOpen(true)}
              aria-label="New chat"
              title="New chat"
              className="text-text-muted hover:text-text-primary transition-colors p-1 rounded hover:bg-bg-tertiary"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={closePanel}
              aria-label="Close chat"
              className="text-text-muted hover:text-text-primary transition-colors p-1 rounded hover:bg-bg-tertiary"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <ConversationList />
      </div>

      {/* Right: thread */}
      <div className={`flex-1 min-w-0 ${selectedId !== null ? 'flex' : 'hidden md:flex'} flex-col`}>
        {selected ? (
          <ChatThread conversation={selected} onBack={() => select(null)} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-text-muted px-6 text-center">
            Select a conversation, or start a new one.
          </div>
        )}
      </div>

      <NewChatDialog open={composerOpen} onClose={() => setComposerOpen(false)} />
    </div>
  )
}
