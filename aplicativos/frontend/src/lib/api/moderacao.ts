import type { CatalogItem } from "../catalogo-api";
import { json, request } from "./base";

export type ReportStatus = "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED";

export type Report = {
  id: string;
  commentId: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  reportsForComment: number;
  // `content` e o texto original mesmo depois de ocultado; `removed` diz se saiu do ar.
  comment: { id: string; content: string; mediaItemId: string; createdAt: string; removed: boolean } | null;
  item: CatalogItem | null;
};

export const getReports = (status?: ReportStatus) =>
  request<Report[]>(`/moderacao/denuncias${status ? `?status=${status}` : ""}`);

export const moderateReport = (id: string, status: ReportStatus, removerComentario = false) =>
  request<Report>(`/moderacao/denuncias/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: json({ status, removerComentario })
  });
