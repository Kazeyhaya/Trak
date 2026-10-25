// Traducao entre o formato da API e a tabela "UserMedia" do banco.
// A API usa status/progress/rating; o banco usa o enum TrackingStatus
// (IN_PROGRESS no lugar de WATCHING), progressCurrent e personalRating.
import { StatusTracking } from "./dto/salvar-tracking.dto";

export const TABELA_TRACKING = "UserMedia";

export const CAMPOS_TRACKING =
  "id,mediaItemId,status,progressCurrent,personalRating,notes,pagesRead,totalPages,timesConsumed,startedAt,finishedAt,updatedAt";

export type LinhaUserMedia = {
  id: string;
  mediaItemId: string;
  status: string;
  progressCurrent: number | null;
  personalRating: number | null;
  notes: string | null;
  pagesRead: number | null;
  totalPages: number | null;
  timesConsumed: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
};

export type RegistroTracking = {
  id: string;
  mediaItemId: string;
  status: StatusTracking;
  // Porcentagem (0..100), guardada em progressCurrent.
  progress: number;
  rating: number | null;
  notes: string | null;
  // Livros: paginas da edicao que este usuario le (nao altera a obra para os demais).
  pagesRead: number | null;
  totalPages: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
};

export type AlteracaoTracking = {
  status?: StatusTracking;
  progress?: number;
  rating?: number | null;
  notes?: string | null;
  pagesRead?: number;
  totalPages?: number;
};

export function statusParaBanco(status: StatusTracking) {
  return status === "WATCHING" ? "IN_PROGRESS" : status;
}

export function statusDoBanco(status: string): StatusTracking {
  return (status === "IN_PROGRESS" ? "WATCHING" : status) as StatusTracking;
}

export function deBanco(linha: LinhaUserMedia): RegistroTracking {
  return {
    id: linha.id,
    mediaItemId: linha.mediaItemId,
    status: statusDoBanco(linha.status),
    progress: linha.progressCurrent ?? 0,
    rating: linha.personalRating,
    notes: linha.notes,
    pagesRead: linha.pagesRead ?? null,
    totalPages: linha.totalPages ?? null,
    startedAt: linha.startedAt,
    finishedAt: linha.finishedAt,
    updatedAt: linha.updatedAt
  };
}

// Converte so os campos informados (atualizacao parcial) e preenche as datas
// de inicio/fim e o contador de vezes concluido conforme a mudanca de status.
export function paraBanco(
  alteracao: AlteracaoTracking,
  existente: Pick<LinhaUserMedia, "status" | "startedAt" | "timesConsumed"> | null,
  agora: string
) {
  const linha: Record<string, unknown> = {};

  if (alteracao.status !== undefined) {
    linha.status = statusParaBanco(alteracao.status);
  }
  if (alteracao.progress !== undefined) {
    linha.progressCurrent = alteracao.progress;
  }
  if (alteracao.rating !== undefined) {
    linha.personalRating = alteracao.rating;
  }
  if (alteracao.notes !== undefined) {
    linha.notes = alteracao.notes;
  }
  if (alteracao.pagesRead !== undefined) {
    linha.pagesRead = alteracao.pagesRead;
  }
  if (alteracao.totalPages !== undefined) {
    linha.totalPages = alteracao.totalPages;
  }

  const mudouStatus = alteracao.status !== undefined && statusParaBanco(alteracao.status) !== existente?.status;
  if (mudouStatus && (alteracao.status === "WATCHING" || alteracao.status === "COMPLETED") && !existente?.startedAt) {
    linha.startedAt = agora;
  }
  if (mudouStatus && alteracao.status === "COMPLETED") {
    linha.finishedAt = agora;
    linha.timesConsumed = Math.max(existente?.timesConsumed ?? 0, 1);
  }

  return linha;
}
