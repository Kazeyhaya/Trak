import { SupabaseService } from "../../comum/supabase/supabase.service";
import { criarSupabaseServiceMock, Operacao, Resposta } from "../../testes/supabase.mock";
import { CatalogoService } from "../catalogo/catalogo.service";
import { AtividadesService } from "../social/atividades.service";
import { LinhaUserMedia } from "./tracking.banco";
import { TrackingService } from "./tracking.service";

// Linha como vem da tabela UserMedia.
const existente: LinhaUserMedia = {
  id: "t1",
  mediaItemId: "tmdb_movie_1",
  status: "IN_PROGRESS",
  progressCurrent: 40,
  personalRating: 3,
  notes: "anotacao",
  timesConsumed: 0,
  startedAt: "2026-01-01",
  finishedAt: null,
  updatedAt: "2026-01-01"
};

function montar(responder: (op: Operacao) => Resposta, totalEpisodios = 10) {
  const supabase = criarSupabaseServiceMock(responder);
  const catalogo = {
    garantirNoBanco: jest.fn(async () => undefined),
    buscarSalvos: jest.fn(async () => new Map()),
    totalEpisodiosExibidos: jest.fn(async () => totalEpisodios)
  };
  const atividades = { registrar: jest.fn(async () => undefined) };
  const service = new TrackingService(
    supabase.service as unknown as SupabaseService,
    catalogo as unknown as CatalogoService,
    atividades as unknown as AtividadesService
  );
  return { service, chamadas: supabase.chamadas, catalogo, atividades };
}

describe("TrackingService.salvar", () => {
  it("usa a tabela UserMedia e responde no formato da API", async () => {
    const { service, chamadas } = montar(() => ({ data: existente }));

    const resultado = await service.buscar("u1", "tmdb_movie_1");

    expect(chamadas[0].table).toBe("UserMedia");
    expect(resultado).toMatchObject({ status: "WATCHING", progress: 40, rating: 3 });
  });

  it("atualizacao parcial envia so os campos informados, com nomes do banco", async () => {
    const { service, chamadas, atividades } = montar((op) =>
      op.action === "update" ? { data: { ...existente, personalRating: 5 } } : { data: existente }
    );

    const resultado = await service.salvar("u1", "tmdb_movie_1", { rating: 5 });

    const update = chamadas.find((c) => c.action === "update")!;
    expect(update.table).toBe("UserMedia");
    expect(Object.keys(update.payload as object).sort()).toEqual(["personalRating", "updatedAt"]);
    expect(resultado.rating).toBe(5);
    expect(atividades.registrar).toHaveBeenCalledTimes(1);
    expect(atividades.registrar).toHaveBeenCalledWith("u1", "RATING", "tmdb_movie_1", { rating: 5 });
  });

  it("concluir leva a 100%, registra a data de fim e gera atividade", async () => {
    const { service, chamadas, atividades } = montar((op) =>
      op.action === "update"
        ? { data: { ...existente, status: "COMPLETED", progressCurrent: 100 } }
        : { data: existente }
    );

    await service.salvar("u1", "tmdb_movie_1", { status: "COMPLETED" });

    expect(chamadas.find((c) => c.action === "update")!.payload).toMatchObject({
      status: "COMPLETED",
      progressCurrent: 100,
      timesConsumed: 1
    });
    expect(chamadas.find((c) => c.action === "update")!.payload).toHaveProperty("finishedAt");
    expect(atividades.registrar).toHaveBeenCalledWith("u1", "STATUS", "tmdb_movie_1", { status: "COMPLETED" });
  });

  it("WATCHING da API e gravado como IN_PROGRESS", async () => {
    const { service, chamadas } = montar((op) =>
      op.action === "insert" ? { data: { ...existente, status: "IN_PROGRESS" } } : { data: null }
    );

    const resultado = await service.salvar("u1", "tmdb_movie_1", { status: "WATCHING" });

    expect(chamadas.find((c) => c.action === "insert")!.payload).toMatchObject({ status: "IN_PROGRESS" });
    expect(resultado.status).toBe("WATCHING");
  });

  it("primeiro registro garante o MediaItem e envia os campos obrigatorios", async () => {
    const { service, chamadas, catalogo } = montar((op) =>
      op.action === "insert" ? { data: { ...existente, status: "WANT", progressCurrent: 0 } } : { data: null }
    );

    await service.salvar("u1", "tmdb_movie_1", {});

    expect(catalogo.garantirNoBanco).toHaveBeenCalledWith("tmdb_movie_1", undefined);
    const insert = chamadas.find((c) => c.action === "insert")!;
    expect(insert.payload).toMatchObject({
      userId: "u1",
      mediaItemId: "tmdb_movie_1",
      status: "WANT",
      progressCurrent: 0,
      timesConsumed: 0
    });
    expect(insert.payload).toHaveProperty("createdAt");
    expect(insert.payload).toHaveProperty("updatedAt");
  });

  it("importacao nao gera atividades", async () => {
    const { service, atividades } = montar((op) =>
      op.action === "insert" ? { data: { ...existente, status: "COMPLETED" } } : { data: null }
    );

    await service.salvarParaUsuario("u1", "tmdb_movie_1", { status: "COMPLETED", rating: 4 }, { registrarAtividade: false });

    expect(atividades.registrar).not.toHaveBeenCalled();
  });

  it("propaga erro do banco", async () => {
    const { service } = montar(() => ({ error: { message: "falhou" } }));
    await expect(service.salvar("u1", "x", {})).rejects.toThrow("falhou");
  });
});

describe("TrackingService.marcarEpisodios", () => {
  it("recalcula progresso e status a partir dos episodios assistidos", async () => {
    const assistidos = [
      { season: 0, episode: 1 },
      { season: 1, episode: 1 },
      { season: 1, episode: 2 }
    ];
    const { service, chamadas } = montar((op) => {
      if (op.table === "EpisodeProgress" && op.action === "select") {
        return { data: assistidos };
      }
      if (op.table === "UserMedia" && op.action === "update") {
        return { data: { ...existente, status: "IN_PROGRESS", progressCurrent: 50 } };
      }
      return { data: op.table === "UserMedia" ? { ...existente, status: "WANT" } : null };
    }, 4);

    const resultado = await service.marcarEpisodios("u1", "tmdb_series_1", { season: 1, episodes: [1, 2, 2], watched: true });

    const upsert = chamadas.find((c) => c.table === "EpisodeProgress" && c.action === "upsert")!;
    // Episodio repetido e enviado uma vez so.
    expect(upsert.payload).toHaveLength(2);
    // Especiais (temporada 0) nao contam: 2 de 4 episodios.
    expect(chamadas.find((c) => c.action === "update")!.payload).toMatchObject({
      progressCurrent: 50,
      status: "IN_PROGRESS"
    });
    expect(resultado.episodes).toEqual(assistidos);
    expect(resultado.tracking).toMatchObject({ status: "WATCHING", progress: 50 });
  });

  it("desmarcar apaga apenas os episodios da temporada informada", async () => {
    const { service, chamadas } = montar((op) => (op.table === "UserMedia" ? { data: existente } : { data: [] }));

    await service.marcarEpisodios("u1", "tmdb_series_1", { season: 2, episodes: [3], watched: false });

    const remocao = chamadas.find((c) => c.table === "EpisodeProgress" && c.action === "delete")!;
    expect(remocao.filtros).toEqual(
      expect.arrayContaining([
        ["eq", "season", 2],
        ["in", "episode", [3]]
      ])
    );
  });
});
