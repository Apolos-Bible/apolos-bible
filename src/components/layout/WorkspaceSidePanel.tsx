import { FriendsPanel } from '@/components/friends/FriendsPanel'
import { FriendsHubPanel } from '@/components/friends/FriendsHubPanel'
import { FavoritesPanel } from '@/components/sidebar/FavoritesPanel'
import { MyNotesPanel } from '@/components/sidebar/MyNotesPanel'
import { MyStudiesPanel } from '@/components/study/MyStudiesPanel'
import type { Panel } from '@/lib/store/useUIStore'

export function WorkspaceSidePanel({ panel }: { panel: Panel | null }) {
  const content = panel === 'favorites' ? <FavoritesPanel />
    : panel === 'my-notes' ? <MyNotesPanel />
    : panel === 'my-studies' ? <MyStudiesPanel />
    : panel === 'friends' ? <FriendsHubPanel />
    : panel === 'chat' ? <FriendsPanel />
    : null

  if (!content) return null

  return (
    <div className="workspace-side-panel-frame h-full w-full min-w-0 overflow-hidden">
      {content}
    </div>
  )
}
