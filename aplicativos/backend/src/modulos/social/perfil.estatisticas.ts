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

export type ConquistaCultural = {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  current: number;
  target: number;
};

export function calcularConquistas(
  resumo: ResumoCultural,
  extras: { ratingsCount?: number; favoritesCount?: number } = {}
): ConquistaCultural[] {
  const totalConcluidos =
    resumo.gamesCompleted + resumo.booksRead + resumo.moviesWatched + resumo.seriesCompleted;
  const tiposConcluidos = [
    resumo.moviesWatched > 0,
    resumo.seriesCompleted > 0,
    resumo.gamesCompleted > 0,
    resumo.booksRead > 0
  ].filter(Boolean).length;
  const ratingsCount = extras.ratingsCount ?? 0;
  const favoritesCount = extras.favoritesCount ?? 0;

  const definicoes: Array<Omit<ConquistaCultural, "unlocked">> = [
    {
      id: "primeira_obra",
      title: "Primeira Obra",
      description: "Conclua sua primeira obra no Trak",
      icon: "✨",
      current: Math.min(totalConcluidos, 1),
      target: 1
    },
    {
      id: "cinefilo",
      title: "Cinéfilo",
      description: "Assista a 10 filmes completos",
      icon: "🎬",
      current: Math.min(resumo.moviesWatched, 10),
      target: 10
    },
    {
      id: "maratonista",
      title: "Maratonista",
      description: "Conclua 5 séries ou animes",
      icon: "📺",
      current: Math.min(resumo.seriesCompleted, 5),
      target: 5
    },
    {
      id: "gamer_dedicado",
      title: "Gamer Dedicado",
      description: "Zere 5 jogos no seu catálogo",
      icon: "🎮",
      current: Math.min(resumo.gamesCompleted, 5),
      target: 5
    },
    {
      id: "leitor_voraz",
      title: "Leitor Voraz",
      description: "Conclua a leitura de 5 livros",
      icon: "📚",
      current: Math.min(resumo.booksRead, 5),
      target: 5
    },
    {
      id: "explorador_cultural",
      title: "Explorador Cultural",
      description: "Conclua ao menos 1 filme, 1 série, 1 jogo e 1 livro",
      icon: "🧭",
      current: tiposConcluidos,
      target: 4
    },
    {
      id: "cem_horas",
      title: "100 Horas de Cultura",
      description: "Acumule 100 horas consumidas em obras",
      icon: "⏳",
      current: Math.min(resumo.estimatedHours, 100),
      target: 100
    },
    {
      id: "curador",
      title: "Curador",
      description: "Monte sua vitrine com pelo menos 4 favoritos",
      icon: "⭐",
      current: Math.min(favoritesCount, 4),
      target: 4
    },
    {
      id: "critico",
      title: "Crítico Cultural",
      description: "Avalie 10 obras com nota",
      icon: "🖋️",
      current: Math.min(ratingsCount, 10),
      target: 10
    }
  ];

  return definicoes.map((item) => ({
    ...item,
    unlocked: item.current >= item.target
  }));
}
