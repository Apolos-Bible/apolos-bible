import { useEffect, useState } from 'react';
import { RotateCw, Clock, Users, Play, RefreshCw, Check, X } from 'lucide-react';
import { useStudyStore } from '@/lib/store/useStudyStore';
import { useUIStore } from '@/lib/store/useUIStore';
import { cn } from '@/lib/cn';
import type { StudySession } from '@/lib/study/studyApi';

export function MyStudiesPanel() {
  const myStudies = useStudyStore((s) => s.myStudies);
  const pendingInvitations = useStudyStore((s) => s.pendingInvitations);
  const loadMyStudies = useStudyStore((s) => s.loadMyStudies);
  const loadInvitations = useStudyStore((s) => s.loadInvitations);
  const join = useStudyStore((s) => s.join);
  const reopen = useStudyStore((s) => s.reopen);
  const acceptInvitation = useStudyStore((s) => s.acceptInvitation);
  const declineInvitation = useStudyStore((s) => s.declineInvitation);
  const enterStudyMode = useUIStore((s) => s.enterStudyMode);
  const closePanel     = useUIStore((s) => s.closePanel);
  const [filter, setFilter] = useState<'all' | 'active' | 'ended'>('all');

  useEffect(() => {
    loadMyStudies();
    loadInvitations();
  }, [loadMyStudies, loadInvitations]);

  const filtered = filter === 'all'
    ? myStudies
    : myStudies.filter((s) => s.status === filter);

  const handleJoin = async (session: StudySession) => {
    if (session.status === 'ended') {
      await reopen(session.id);
      enterStudyMode();
    } else {
      await join(session.id);
      enterStudyMode();
    }
  };

  const handleAcceptInvitation = async (invitationId: number) => {
    await acceptInvitation(invitationId);
    enterStudyMode();
  };

  const activeCount = myStudies.filter((s) => s.status === 'active').length;

  return (
    <div className="h-full flex flex-col bg-bg-secondary border-r border-border-subtle">
      <div className="px-4 pt-3 pb-2 shrink-0 flex items-center justify-between">
        <span className="font-medium text-md text-text-primary">My Studies</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { loadMyStudies(); loadInvitations(); }}
            className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={closePanel}
            className="w-6 h-6 flex items-center justify-center rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            title="Close"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Pending invitations */}
      {pendingInvitations.length > 0 && (
        <div className="px-3 pb-3 shrink-0">
          <p className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-1.5 px-1">
            Pending Invitations ({pendingInvitations.length})
          </p>
          <div className="space-y-1">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-accent/5 border border-accent/20 rounded-lg px-3 py-2 flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary truncate">
                    {inv.session?.title ?? 'Study session'}
                  </p>
                  <p className="text-2xs text-text-muted">
                    Invited by user #{inv.inviter_id}
                  </p>
                </div>
                <button
                  onClick={() => handleAcceptInvitation(inv.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                  title="Accept"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => declineInvitation(inv.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  title="Decline"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pb-3 flex gap-1.5 shrink-0">
        {(['all', 'active', 'ended'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-2.5 py-1 rounded-full text-2xs font-medium capitalize transition-colors',
              filter === f
                ? 'bg-accent/20 text-accent'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary',
            )}
          >
            {f === 'all' ? 'All' : f}
            {f === 'active' && activeCount > 0 && (
              <span className="ml-1 opacity-70">{activeCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-text-muted">
              {filter === 'active' ? 'No active studies' : filter === 'ended' ? 'No ended studies' : 'No studies yet'}
            </p>
            <p className="text-2xs text-text-muted mt-1">
              Start a new study from the sidebar
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((session) => (
              <button
                key={session.id}
                onClick={() => handleJoin(session)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-bg-tertiary transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-bg-tertiary border border-border shrink-0 flex items-center justify-center overflow-hidden">
                    {session.thumbnail_url ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL ?? ''}/storage/${session.thumbnail_url}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center">
                        {session.type === 'verse' ? (
                          <span className="text-2xs text-accent font-bold">V</span>
                        ) : session.type === 'chapter' ? (
                          <span className="text-2xs text-accent font-bold">C</span>
                        ) : (
                          <span className="text-2xs text-accent font-bold">F</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm text-text-primary truncate font-medium">
                        {session.title}
                      </p>
                      {session.status === 'active' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-2xs text-text-muted mt-0.5">
                      {session.type === 'verse'
                        ? `Verse: ${session.anchor_ref}`
                        : session.type === 'chapter'
                          ? `Chapter: ${session.anchor_ref}`
                          : 'Free study'}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-2xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {session.participants?.length ?? 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {session.last_activity_at
                          ? new Date(session.last_activity_at).toLocaleDateString()
                          : ''}
                      </span>
                      {session.status === 'ended' && (
                        <span className="flex items-center gap-1 text-orange-400">
                          <RotateCw className="w-3 h-3" />
                          Reopen
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {session.status === 'ended' ? (
                      <RotateCw className="w-4 h-4 text-text-muted" />
                    ) : (
                      <Play className="w-4 h-4 text-accent" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
