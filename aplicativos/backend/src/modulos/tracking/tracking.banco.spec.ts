import { deBanco, LinhaUserMedia, paraBanco, statusDoBanco, statusParaBanco } from "./tracking.banco";

const AGORA = "2026-10-19T12:00:00.000Z";

const linha: LinhaUserMedia = {
  id: "u-1",
  mediaItemId: "tmdb_movie_1",
  status: "IN_PROGRESS",
  progressCurrent: 40,
  personalRating: 4,
  notes: "bom",
  timesConsumed: 0,
  startedAt: "2026-01-01T00:00:00.000Z",
  finishedAt: null,
  updatedAt: "2026-01-02T00:00:00.000Z"
};

describe("status", () => {
  it("WATCHING da API e IN_PROGRESS no banco, nos dois sentidos", () => {
    expect(statusParaBanco("WATCHING")).toBe("IN_PROGRESS");
    expect(statusDoBanco("IN_PROGRESS")).toBe("WATCHING");
  });

  it("os demais status passam iguais", () => {
    for (const status of ["WANT", "COMPLETED", "PAUSED", "DROPPED"] as const) {
      expect(statusParaBanco(status)).toBe(status);
      expect(statusDoBanco(status)).toBe(status);
    }
  });
});

describe("deBanco", () => {
  it("converte a linha de UserMedia para o formato da API", () => {
    expect(deBanco(linha)).toEqual({
      id: "u-1",
      mediaItemId: "tmdb_movie_1",
      status: "WATCHING",
      progress: 40,
      rating: 4,
      notes: "bom",
      startedAt: "2026-01-01T00:00:00.000Z",
      finishedAt: null,
      updatedAt: "2026-01-02T00:00:00.000Z"
    });
  });

  it("progresso nulo vira 0", () => {
    expect(deBanco({ ...linha, progressCurrent: null }).progress).toBe(0);
  });
});

describe("paraBanco", () => {
  it("envia so os campos informados, com os nomes do banco", () => {
    expect(paraBanco({ rating: 5 }, linha, AGORA)).toEqual({ personalRating: 5 });
    expect(paraBanco({ progress: 60, notes: null }, linha, AGORA)).toEqual({ progressCurrent: 60, notes: null });
    expect(paraBanco({ rating: null }, linha, AGORA)).toEqual({ personalRating: null });
  });

  it("comecar a assistir preenche startedAt so na primeira vez", () => {
    expect(paraBanco({ status: "WATCHING" }, null, AGORA)).toEqual({ status: "IN_PROGRESS", startedAt: AGORA });
    expect(paraBanco({ status: "WATCHING" }, { ...linha, status: "PAUSED" }, AGORA)).toEqual({ status: "IN_PROGRESS" });
  });

  it("concluir preenche finishedAt e soma uma vez consumido", () => {
    expect(paraBanco({ status: "COMPLETED", progress: 100 }, linha, AGORA)).toEqual({
      status: "COMPLETED",
      progressCurrent: 100,
      finishedAt: AGORA,
      timesConsumed: 1
    });
    expect(paraBanco({ status: "COMPLETED" }, null, AGORA)).toMatchObject({ startedAt: AGORA, timesConsumed: 1 });
  });

  it("salvar o mesmo status de novo nao mexe nas datas nem no contador", () => {
    expect(paraBanco({ status: "COMPLETED" }, { ...linha, status: "COMPLETED", timesConsumed: 1 }, AGORA)).toEqual({
      status: "COMPLETED"
    });
  });
});
