import type { AwarenessUser } from '@/hooks/useStudySession'

export function StudyParticipants({ users }: { users: AwarenessUser[] }) {
  const visible = users.slice(0, 5)
  const overflow = users.length - 5

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((u) => (
        <div
          key={u.id}
          className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-2xs font-medium shrink-0"
          style={{ borderColor: u.color, backgroundColor: u.color + '22', color: u.color }}
          title={u.name}
        >
          {u.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div className="w-7 h-7 rounded-full bg-bg-tertiary border-2 border-border flex items-center justify-center text-2xs text-text-muted shrink-0">
          +{overflow}
        </div>
      )}
    </div>
  )
}
