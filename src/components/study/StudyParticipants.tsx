import type { AwarenessUser } from '@/hooks/useStudySession'
import { useFriendStore } from '@/lib/store/useFriendStore'
import { useAuthStore } from '@/lib/store/useAuthStore'
import { UserAvatar } from '@/components/auth/UserAvatar'

export function StudyParticipants({ users }: { users: AwarenessUser[] }) {
  const friends = useFriendStore((s) => s.friends)
  const currentUser = useAuthStore((s) => s.user)
  const visible = users.slice(0, 5)
  const overflow = users.length - 5
  const contactsById = new Map([
    ...(currentUser ? [[currentUser.id, currentUser] as const] : []),
    ...friends.map((friend) => [friend.id, friend] as const),
  ])

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((u) => (
        <UserAvatar
          key={u.id}
          name={u.name}
          email={contactsById.get(u.id)?.email}
          src={contactsById.get(u.id)?.avatar_url}
          size="md"
          className="border-2 border-border shrink-0"
        />
      ))}
      {overflow > 0 && (
        <div className="w-7 h-7 rounded-full bg-bg-tertiary border-2 border-border flex items-center justify-center text-2xs text-text-muted shrink-0">
          +{overflow}
        </div>
      )}
    </div>
  )
}
