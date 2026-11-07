import { json, request } from "./base";
import { comCursor, comoPagina, type Pagina } from "./paginacao";

export type CommentEntry = {
  id: string;
  userId: string;
  mediaItemId: string;
  content: string;
  createdAt: string;
  user?: { username: string; displayName: string | null } | null;
  likesCount: number;
  likedByUser: boolean;
  isOwn: boolean;
};

export const getComments = async (mediaItemId: string, cursor?: string | null) =>
  comoPagina(
    await request<CommentEntry[] | Pagina<CommentEntry>>(
      comCursor(`/comentarios?mediaItemId=${encodeURIComponent(mediaItemId)}`, cursor)
    )
  );

export const createComment = (mediaItemId: string, content: string) =>
  request<CommentEntry>("/comentarios", { method: "POST", body: json({ mediaItemId, content }) });

export const deleteComment = (commentId: string) =>
  request<{ ok: true }>(`/comentarios/${encodeURIComponent(commentId)}`, { method: "DELETE" });

export const setCommentLike = (commentId: string, liked: boolean) =>
  request<{ commentId: string; likesCount: number }>(`/comentarios/${encodeURIComponent(commentId)}/curtidas`, {
    method: liked ? "POST" : "DELETE"
  });

export const reportComment = (commentId: string, reason: string, details?: string) =>
  request<{ id: string }>(`/comentarios/${encodeURIComponent(commentId)}/denuncias`, {
    method: "POST",
    body: json({ reason, ...(details ? { details } : {}) })
  });
