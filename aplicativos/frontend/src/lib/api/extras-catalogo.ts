import { request } from "./base";

export type WatchProvider = {
  name: string;
  category: "STREAMING" | "RENT" | "BUY" | "STORE" | "READ";
  url?: string | null;
};

export type ExternalRating = {
  source: string;
  value: string;
};

export type SeriesInfo = {
  totalEpisodes: number;
  airedEpisodes: number;
  isOngoing: boolean;
  nextEpisodeAirDate: string | null;
};

export type CatalogExtras = {
  genres: string[];
  watchProviders: WatchProvider[];
  watchLink: string | null;
  trakRating: {
    average: number | null;
    count: number;
  };
  externalRatings: ExternalRating[];
  pageCount?: number | null;
  seriesInfo?: SeriesInfo | null;
};

export const getCatalogExtras = (mediaItemId: string) =>
  request<CatalogExtras>(`/catalogo/${encodeURIComponent(mediaItemId)}/extras`);

export const getCatalogCovers = (mediaItemId: string) =>
  request<{ capas: string[] }>(`/catalogo/${encodeURIComponent(mediaItemId)}/capas`);
