import { useStore } from '@xyflow/react';
import { RemoteCursor } from './RemoteCursor';
import type { AwarenessUser } from '@/hooks/useStudySession';

export function RemoteCursors({
  users,
  currentUserId,
}: {
  users: AwarenessUser[];
  currentUserId?: number | string;
}) {
  const transform = useStore((s) => s.transform);
  const remoteUsers = users.filter(
    (u) => u.cursor && !u.dragging && currentUserId != null && String(u.id) !== String(currentUserId)
  );

  return (
    <>
      {remoteUsers.map((user) => {
        const [tx, ty, zoom] = transform;

        return (
          <RemoteCursor
            key={user.id}
            x={user.cursor!.x * zoom + tx}
            y={user.cursor!.y * zoom + ty}
            color={user.color}
            name={user.name}
          />
        );
      })}
    </>
  );
}
