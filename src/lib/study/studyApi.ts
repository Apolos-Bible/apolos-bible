import { api } from '@/lib/api';
import type { StudySession, StudyInvitation, StudyCreateResponse, StudyJoinResponse } from './studyApi';

export const studyApi = {
  list: (status?: 'active' | 'ended') => {
    const qs = status ? `?status=${status}` : '';
    return api.get<StudySession[]>(`/api/studies${qs}`);
  },

  create: (data: { type: string; anchor_ref?: string; title: string }) =>
    api.post<StudyCreateResponse>('/api/studies', data),

  get: (id: string) =>
    api.get<StudySession>(`/api/studies/${id}`),

  join: (id: string) =>
    api.post<StudyJoinResponse>(`/api/studies/${id}/join`),

  leave: (id: string) =>
    api.post<{ ok: boolean }>(`/api/studies/${id}/leave`),

  end: (id: string) =>
    api.post<StudySession>(`/api/studies/${id}/end`),

  invite: (id: string, userIds: number[]) =>
    api.post<{ invitations: StudyInvitation[] }>(`/api/studies/${id}/invite`, { user_ids: userIds }),

  reopen: (id: string) =>
    api.post<StudyCreateResponse>(`/api/studies/${id}/reopen`),

  invitations: () =>
    api.get<StudyInvitation[]>('/api/studies/invitations'),

  acceptInvitation: (invitationId: number) =>
    api.post<StudyJoinResponse>(`/api/studies/invitations/${invitationId}/accept`),

  declineInvitation: (invitationId: number) =>
    api.post<{ ok: boolean }>(`/api/studies/invitations/${invitationId}/decline`),
};

export interface StudyParticipant {
  id: number;
  name: string;
  role: 'host' | 'editor' | 'viewer';
  cursor_color: string;
  is_present: boolean;
}

export interface StudySession {
  id: string;
  type: 'verse' | 'chapter' | 'free';
  anchor_ref: string | null;
  title: string;
  host_user_id: number;
  status: 'active' | 'ended';
  thumbnail_url: string | null;
  last_activity_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  participants: StudyParticipant[];
  host: { id: number; name: string } | null;
}

export interface StudyInvitation {
  id: number;
  session_id: string;
  inviter_id: number;
  invitee_id: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  session?: StudySession;
  created_at: string;
}

export interface StudyCreateResponse {
  session: StudySession;
  ws_token: string;
  participant: StudyParticipant;
}

export interface StudyJoinResponse {
  session: StudySession;
  ws_token: string;
  participant: StudyParticipant;
}
