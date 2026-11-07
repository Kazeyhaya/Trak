import { request } from "./base";

export type NotificationType = "FOLLOW" | "COMMENT" | "REPLY" | "MEDIA_UPDATE";

export type NotificationItem = {
  id: string;
  userId: string;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  mediaItemId?: string | null;
  link: string;
  read: boolean;
  data: Record<string, unknown>;
  createdAt: string;
  actor?: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
};

export const getNotifications = (limite = 30) =>
  request<NotificationItem[]>(`/notificacoes?limite=${limite}`);

export const getUnreadNotificationsCount = () =>
  request<{ count: number }>("/notificacoes/nao-lidas/count");

export const markNotificationRead = (id: string) =>
  request<{ ok: boolean }>(`/notificacoes/${encodeURIComponent(id)}/lida`, { method: "PATCH" });

export const markAllNotificationsRead = () =>
  request<{ ok: boolean }>("/notificacoes/marcar-todas-lidas", { method: "POST" });
