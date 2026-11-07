import type { CatalogItem, MediaType } from "../catalogo-api";
import { json, request } from "./base";

export const TRACKING_STATUSES = ["WANT", "WATCHING", "COMPLETED", "PAUSED", "DROPPED"] as const;

export type TrackingStatus = (typeof TRACKING_STATUSES)[number];

export type TrackingEntry = {
  id: string;
  mediaItemId: string;
  status: TrackingStatus;
  progress: number;
  rating: number | null;
  notes: string | null;
  // Livros: paginas da edicao lida por este usuario (salvas no tracking dele, nao na obra).
  pagesRead?: number | null;
  totalPages?: number | null;
  customCoverUrl?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  favoriteCharacterName?: string | null;
  favoriteCharacterAvatar?: string | null;
  // Vezes que a obra foi concluida (0 enquanto nunca foi).
  timesConsumed?: number;
  updatedAt: string;
  item?: CatalogItem | null;
};

export type TrackingPayload = Partial<Pick<TrackingEntry, "status" | "progress" | "rating" | "notes">> & {
  pagesRead?: number;
  totalPages?: number;
  customCoverUrl?: string | null;
  favoriteCharacterName?: string | null;
  favoriteCharacterAvatar?: string | null;
  timesConsumed?: number;
};

// Limites compartilhados com a validacao da API (SalvarTrackingDto).
export const TRACKING_PAGES_MAX = 50000;

export function getStatusLabel(status: TrackingStatus, type?: MediaType) {
  switch (status) {
    case "WANT":
      return type === "GAME" ? "Quero jogar" : type === "BOOK" ? "Quero ler" : "Quero ver";
    case "WATCHING":
      return type === "GAME" ? "Jogando" : type === "BOOK" ? "Lendo" : "Assistindo";
    case "COMPLETED":
      return type === "GAME" ? "Zerado" : type === "BOOK" ? "Lido" : "Concluído";
    case "PAUSED":
      return "Pausado";
    case "DROPPED":
      return "Abandonado";
  }
}

export const getTrackingItems = () => request<TrackingEntry[]>("/tracking");

export const getTrackingItem = (mediaItemId: string) =>
  request<TrackingEntry | null>(`/tracking/items/${encodeURIComponent(mediaItemId)}`);

export const saveTrackingItem = (mediaItemId: string, payload: TrackingPayload) =>
  request<TrackingEntry>(`/tracking/items/${encodeURIComponent(mediaItemId)}`, {
    method: "PUT",
    body: json(payload)
  });

export const removeTrackingItem = (mediaItemId: string) =>
  request<{ ok: true }>(`/tracking/items/${encodeURIComponent(mediaItemId)}`, {
    method: "DELETE"
  });
