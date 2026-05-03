import { useStudyStore } from '@/lib/store/useStudyStore';
import { useUIStore } from '@/lib/store/useUIStore';

export function handleStudyInvitation(payload: any) {
  const data = payload.data ?? {};
  const title = payload.notification?.title ?? payload.data?.title ?? 'Study Invitation';
  const body = payload.notification?.body ?? payload.data?.body ?? '';

  if (data?.route !== 'study') return false;

  const sessionId = data.session_id;
  const invitationId = data.invitation_id;

  if (!sessionId) return false;

  const addToast = useUIStore.getState().addToast;
  const acceptInvitation = useStudyStore.getState().acceptInvitation;
  const enterStudyMode = useUIStore.getState().enterStudyMode;
  const loadInvitations = useStudyStore.getState().loadInvitations;

  addToast(`${title}\n${body}`, 'info', {
    duration: 10000,
    action: {
      label: 'Join',
      onClick: async () => {
        try {
          if (invitationId) {
            await acceptInvitation(invitationId);
          } else if (sessionId) {
            await useStudyStore.getState().join(sessionId);
          }
          enterStudyMode();
        } catch {
          addToast('Failed to join study session', 'error');
        }
      },
    },
  });

  loadInvitations();
  return true;
}
