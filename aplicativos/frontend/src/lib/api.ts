import type { CatalogItem, MediaType } from "./catalogo-api";
import { supabase } from "./supabase-client";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };

  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }

  if (init.body) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor.", 0);
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join(" ") : body?.message;
    throw new ApiError(message ?? "Algo deu errado. Tente novamente.", response.status);
  }

  // O Nest responde corpo vazio quando o controller retorna null.
  const text = await response.text();
  return (text ? JSON.parse(text) : null) as T;
}

// Tracking

export const TRACKING_STATUSES = ["WANT", "WATCHING", "COMPLETED", "PAUSED"] as const;

export type TrackingStatus = (typeof TRACKING_STATUSES)[number];

export type TrackingEntry = {
  id: string;
  mediaItemId: string;
  status: TrackingStatus;
  progress: number;
  favorite: boolean;
  updatedAt: string;
  item?: CatalogItem | null;
};

export type TrackingPayload = Partial<Pick<TrackingEntry, "status" | "progress">>;

export function getStatusLabel(status: TrackingStatus, type?: MediaType) {
  switch (status) {
    case "WANT":
      return type === "GAME" ? "Quero jogar" : type === "BOOK" ? "Quero ler" : "Quero ver";
    case "WATCHING":
      return type === "GAME" ? "Jogando" : type === "BOOK" ? "Lendo" : "Assistindo";
    case "COMPLETED":
      return type === "GAME" ? "Zerado" : "Concluído";
    case "PAUSED":
      return "Pausado";
  }
}

export function getTrackingItems() {
  return request<TrackingEntry[]>("/tracking");
}

export function getTrackingItem(mediaItemId: string) {
  return request<TrackingEntry | null>(`/tracking/items/${encodeURIComponent(mediaItemId)}`);
}

export function saveTrackingItem(mediaItemId: string, payload: TrackingPayload) {
  return request<TrackingEntry>(`/tracking/items/${encodeURIComponent(mediaItemId)}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function removeTrackingItem(mediaItemId: string) {
  return request<{ ok: true }>(`/tracking/items/${encodeURIComponent(mediaItemId)}`, {
    method: "DELETE"
  });
}

// Favoritos

export type FavoriteEntry = {
  mediaItemId: string;
  createdAt: string;
  item: CatalogItem | null;
};

export function getFavorites() {
  return request<FavoriteEntry[]>("/favoritos");
}

export function addFavorite(mediaItemId: string) {
  return request<{ ok: true }>("/favoritos", {
    method: "POST",
    body: JSON.stringify({ mediaItemId })
  });
}

export function removeFavorite(mediaItemId: string) {
  return request<{ ok: true }>(`/favoritos/${encodeURIComponent(mediaItemId)}`, {
    method: "DELETE"
  });
}

// Comentarios

export type CommentEntry = {
  id: string;
  userId: string;
  mediaItemId: string;
  content: string;
  createdAt: string;
  likesCount: number;
  likedByUser: boolean;
  isOwn: boolean;
};

export function getComments(mediaItemId: string) {
  return request<CommentEntry[]>(`/comentarios?mediaItemId=${encodeURIComponent(mediaItemId)}`);
}

export function createComment(mediaItemId: string, content: string) {
  return request<CommentEntry>("/comentarios", {
    method: "POST",
    body: JSON.stringify({ mediaItemId, content })
  });
}

export function deleteComment(commentId: string) {
  return request<{ ok: true }>(`/comentarios/${encodeURIComponent(commentId)}`, {
    method: "DELETE"
  });
}

export function setCommentLike(commentId: string, liked: boolean) {
  return request<{ commentId: string; likesCount: number }>(
    `/comentarios/${encodeURIComponent(commentId)}/curtidas`,
    { method: liked ? "POST" : "DELETE" }
  );
}
