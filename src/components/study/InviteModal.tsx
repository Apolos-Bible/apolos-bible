import { useState, useCallback, useEffect } from 'react';
import { X, Search, UserPlus, Check, Clock } from 'lucide-react';
import { useFriendStore } from '@/lib/store/useFriendStore';
import { useStudyStore } from '@/lib/store/useStudyStore';
import { useUIStore } from '@/lib/store/useUIStore';
import { studyApi } from '@/lib/study/studyApi';
import { cn } from '@/lib/cn';

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
}

export function InviteModal({ open, onClose }: InviteModalProps) {
  const friends = useFriendStore((s) => s.friends);
  const searchUsers = useFriendStore((s) => s.searchUsers);
  const searchResults = useFriendStore((s) => s.searchResults);
  const isSearching = useFriendStore((s) => s.isSearching);
  const invite = useStudyStore((s) => s.invite);
  const activeSession = useStudyStore((s) => s.activeSession);
  const addToast = useUIStore((s) => s.addToast);

  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState(false);
  const [userStatus, setUserStatus] = useState<Map<number, string>>(new Map());

  // Load existing participants and invitations when modal opens
  useEffect(() => {
    if (!open || !activeSession) return;
    studyApi.get(activeSession.id).then((session) => {
      const map = new Map<number, string>();
      session.participants.forEach(p => map.set(p.id, 'In session'));
      studyApi.invitations().then((invitations) => {
        const sessionInvites = invitations.filter(i => i.session_id === activeSession.id);
        sessionInvites.forEach(i => {
          if (!map.has(i.invitee_id)) {
            map.set(i.invitee_id, i.status === 'pending' ? 'Pending' : i.status);
          }
        });
        setUserStatus(map);
      }).catch(() => setUserStatus(map));
    }).catch(() => {});
  }, [open, activeSession]);

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (q.trim().length >= 2) {
        searchUsers(q);
      }
    },
    [searchUsers]
  );

  const toggleUser = (id: number) => {
    if (userStatus.has(id)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) return;
    setSending(true);
    try {
      await invite(Array.from(selectedIds));
      setUserStatus((prev) => {
        const next = new Map(prev);
        selectedIds.forEach(id => next.set(id, 'Pending'));
        return next;
      });
      addToast('Invitations sent!', 'success');
      setSelectedIds(new Set());
      setQuery('');
    } catch {
      addToast('Failed to send invitations', 'error');
    } finally {
      setSending(false);
    }
  };

  const shownUsers = query.trim().length >= 2
    ? searchResults.filter((u) => !friends.some((f) => f.id === u.id)).concat(
        friends.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))
      )
    : friends;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-md font-semibold text-text-primary">Invite to Study</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search friends..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-text-primary outline-none focus:border-accent/50 placeholder:text-text-muted"
          />
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1 mb-4">
          {shownUsers.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">
              {query.trim().length >= 2 ? 'No users found' : 'No friends yet'}
            </p>
          ) : (
            shownUsers.map((user) => {
              const status = userStatus.get(user.id);
              const selected = selectedIds.has(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  disabled={!!status}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                    status ? 'opacity-60' : selected ? 'bg-accent/10' : 'hover:bg-bg-tertiary',
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-bg-tertiary border border-border flex items-center justify-center text-sm font-medium text-text-secondary shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{user.name}</p>
                  </div>
                  {status ? (
                    <span className={cn(
                      'text-2xs flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full',
                      status === 'In session' ? 'text-green-400 bg-green-500/10' :
                      status === 'Pending' ? 'text-amber-400 bg-amber-500/10' :
                      'text-text-muted bg-bg-tertiary',
                    )}>
                      {status === 'In session' ? <Check className="w-3 h-3" /> :
                       status === 'Pending' ? <Clock className="w-3 h-3" /> :
                       <Check className="w-3 h-3" />}
                      {status}
                    </span>
                  ) : (
                    <div
                      className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                        selected ? 'bg-accent border-accent' : 'border-border',
                      )}
                    >
                      {selected && (
                        <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3">
                          <path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={selectedIds.size === 0 || sending}
          className={cn(
            'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors',
            selectedIds.size > 0
              ? 'bg-accent text-white hover:bg-accent/90'
              : 'bg-bg-tertiary text-text-muted cursor-not-allowed',
          )}
        >
          <UserPlus className="w-4 h-4" />
          {sending ? 'Sending...' : `Invite (${selectedIds.size})`}
        </button>
      </div>
    </div>
  );
}
