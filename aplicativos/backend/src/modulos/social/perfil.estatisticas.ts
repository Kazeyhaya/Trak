// Regras puras do resumo cultural exibido no perfil (contadores e horas).
import { TipoMidia } from "../catalogo/catalogo.types";
import { StatusTracking } from "../tracking/dto/salvar-tracking.dto";

// Usado quando a fonte nao informa a duracao da obra.
export const DURACAO_PADRAO_MIN: Record<TipoMidia, number> = {
  MOVIE: 110,
  SERIES: 8 * 60,
  GAME: 20 * 60,
  BOOK: 6 * 60
};

export type RegistroResumo = {
  status: StatusTracking;
  progress: number | null;
  type?: TipoMidia;
  durationMinutes?: number | null;
};

export type ResumoCultural = {
  gamesCompleted: number;
  booksRead: number;
  moviesWatched: number;
  seriesCompleted: number;
  estimatedHours: number;
};

// Fracao da obra ja consumida: concluido conta inteiro, "quero" nao conta,
// os demais status usam o progresso salvo (0..100).
export function fracaoConsumida(status: StatusTracking, progress: number | null) {
  if (status === "COMPLETED") {
    return 1;
  }
  if (status === "WANT") {
    return 0;
  }
  return Math.max(0, Math.min(100, progress ?? 0)) / 100;
}

export function resumoCultural(registros: RegistroResumo[]): ResumoCultural {
  const resumo: ResumoCultural = {
    gamesCompleted: 0,
    booksRead: 0,
    moviesWatched: 0,
    seriesCompleted: 0,
    estimatedHours: 0
  };
  let minutos = 0;

  for (const registro of registros) {
    if (!registro.type) {
      continue;
    }
    if (registro.status === "COMPLETED") {
      if (registro.type === "GAME") resumo.gamesCompleted++;
      if (registro.type === "BOOK") resumo.booksRead++;
      if (registro.type === "MOVIE") resumo.moviesWatched++;
      if (registro.type === "SERIES") resumo.seriesCompleted++;
    }
    const duracao =
      registro.durationMinutes && registro.durationMinutes > 0
        ? registro.durationMinutes
        : DURACAO_PADRAO_MIN[registro.type];
    minutos += duracao * fracaoConsumida(registro.status, registro.progress);
  }

  resumo.estimatedHours = Math.round(minutos / 60);
  return resumo;
}
