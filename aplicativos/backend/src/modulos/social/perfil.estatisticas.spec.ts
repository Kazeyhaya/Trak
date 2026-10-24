import { calcularConquistas, DURACAO_PADRAO_MIN, fracaoConsumida, resumoCultural } from "./perfil.estatisticas";

describe("fracaoConsumida", () => {
  it("concluido conta inteiro e 'quero' nao conta", () => {
    expect(fracaoConsumida("COMPLETED", 10)).toBe(1);
    expect(fracaoConsumida("WANT", 80)).toBe(0);
  });

  it("demais status usam o progresso, limitado a 0..100", () => {
    expect(fracaoConsumida("WATCHING", 50)).toBe(0.5);
    expect(fracaoConsumida("PAUSED", 150)).toBe(1);
    expect(fracaoConsumida("DROPPED", null)).toBe(0);
  });
});

describe("resumoCultural", () => {
  it("soma as duracoes reais proporcionais ao progresso", () => {
    const resumo = resumoCultural([
      { status: "COMPLETED", progress: 100, type: "MOVIE", durationMinutes: 120 },
      { status: "WATCHING", progress: 50, type: "SERIES", durationMinutes: 600 },
      { status: "COMPLETED", progress: 100, type: "GAME", durationMinutes: 1800 },
      { status: "WANT", progress: 0, type: "BOOK", durationMinutes: 400 }
    ]);

    expect(resumo).toEqual({
      gamesCompleted: 1,
      booksRead: 0,
      moviesWatched: 1,
      seriesCompleted: 0,
      // 120 + 300 + 1800 = 2220 min = 37 h
      estimatedHours: 37
    });
  });

  it("usa a duracao padrao quando a obra nao tem duracao", () => {
    const resumo = resumoCultural([{ status: "COMPLETED", progress: 100, type: "BOOK", durationMinutes: null }]);
    expect(resumo.booksRead).toBe(1);
    expect(resumo.estimatedHours).toBe(Math.round(DURACAO_PADRAO_MIN.BOOK / 60));
  });

  it("ignora registros sem tipo (item fora do catalogo salvo)", () => {
    expect(resumoCultural([{ status: "COMPLETED", progress: 100 }]).estimatedHours).toBe(0);
  });
});

describe("calcularConquistas", () => {
  it("desbloqueia conquistas conforme o resumo cultural e favoritos/notas", () => {
    const conquistas = calcularConquistas(
      {
        gamesCompleted: 5,
        booksRead: 1,
        moviesWatched: 10,
        seriesCompleted: 1,
        estimatedHours: 120
      },
      { ratingsCount: 12, favoritesCount: 4 }
    );

    const desbloqueadas = conquistas.filter((c) => c.unlocked).map((c) => c.id);
    expect(desbloqueadas).toEqual([
      "primeira_obra",
      "cinefilo",
      "gamer_dedicado",
      "explorador_cultural",
      "cem_horas",
      "curador",
      "critico"
    ]);
  });
});
