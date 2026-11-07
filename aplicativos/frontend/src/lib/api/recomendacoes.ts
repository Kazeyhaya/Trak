import type { CatalogItem } from "../catalogo-api";
import { request } from "./base";

export type Recommendation = CatalogItem & { reason: string; score: number };

export type Alert = {
  kind: "NEW_EPISODE" | "UPCOMING_EPISODE" | "UPCOMING_RELEASE";
  date: string;
  label: string;
  mediaItemId: string;
  item: CatalogItem | null;
};

export const getRecommendations = () => request<{ seeds: string[]; items: Recommendation[] }>("/recomendacoes");

export const getAlerts = () => request<Alert[]>("/alertas");
