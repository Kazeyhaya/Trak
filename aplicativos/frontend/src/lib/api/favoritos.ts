import type { CatalogItem } from "../catalogo-api";
import { json, request } from "./base";

export type FavoriteEntry = { mediaItemId: string; createdAt: string; item: CatalogItem | null };

export const getFavorites = () => request<FavoriteEntry[]>("/favoritos");

export const checkFavorite = (mediaItemId: string) =>
  request<{ isFavorite: boolean }>(`/favoritos/${encodeURIComponent(mediaItemId)}`);

export const addFavorite = (mediaItemId: string) =>
  request<{ ok: true }>("/favoritos", { method: "POST", body: json({ mediaItemId }) });

export const removeFavorite = (mediaItemId: string) =>
  request<{ ok: true }>(`/favoritos/${encodeURIComponent(mediaItemId)}`, { method: "DELETE" });

export const reorderFavorites = (mediaItemIds: string[]) =>
  request<{ ok: true }>("/favoritos/ordem", { method: "PUT", body: json({ mediaItemIds }) });
