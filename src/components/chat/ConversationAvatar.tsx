import { UsersRound } from 'lucide-react'
import { UserAvatar } from '@/components/auth/UserAvatar'
import { cn } from '@/lib/cn'
import type { Conversation } from '@/lib/chatApi'

interface ConversationAvatarProps {
  conversation: Conversation
  selfId?: number
  className?: string
}

export function ConversationAvatar({ conversation, selfId, className }: ConversationAvatarProps) {
  if (conversation.type === 'dm') {
    const person = conversation.participants.find((participant) => participant.id !== selfId)
      ?? conversation.participants[0]
    return (
      <UserAvatar
        name={person?.name}
        email={person?.email}
        src={person?.avatar_url}
        size="xl"
        className={className}
      />
    )
  }

  if (conversation.avatar_url) {
    return (
      <UserAvatar
        name={conversation.name}
        src={conversation.avatar_url}
        size="xl"
        className={className}
      />
    )
  }

  const people = [
    ...conversation.participants.filter((participant) => participant.id !== selfId),
    ...conversation.participants.filter((participant) => participant.id === selfId),
  ].slice(0, 2)

  if (people.length < 2) {
    return (
      <span className={cn('flex items-center justify-center rounded-full bg-accent/15 text-accent', className)}>
        <UsersRound aria-hidden="true" className="h-[45%] w-[45%]" strokeWidth={1.75} />
      </span>
    )
  }

  return (
    <span className={cn('relative block overflow-hidden rounded-full bg-bg-tertiary', className)}>
      <UserAvatar
        name={people[0].name}
        email={people[0].email}
        src={people[0].avatar_url}
        size="md"
        className="absolute left-0 top-0 h-[68%] w-[68%] border-2 border-bg-secondary"
      />
      <UserAvatar
        name={people[1].name}
        email={people[1].email}
        src={people[1].avatar_url}
        size="md"
        className="absolute bottom-0 right-0 h-[68%] w-[68%] border-2 border-bg-secondary"
      />
    </span>
  )
}
