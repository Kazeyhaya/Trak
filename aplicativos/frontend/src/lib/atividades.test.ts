import { describe, expect, it } from "vitest";
import type { Activity } from "./api";
import { descreverAtividade, tempoRelativo } from "./atividades";
import type { CatalogItem } from "./catalogo-api";

const jogo = { type: "GAME" } as CatalogItem;

function atividade(type: Activity["type"], data: Activity["data"] = {}, item: CatalogItem | null = null) {
  return { type, data, item };
}

describe("descreverAtividade", () => {
  it("usa o rotulo de status conforme o tipo de midia", () => {
    expect(descreverAtividade(atividade("STATUS", { status: "COMPLETED" }, jogo))).toBe("marcou como “Zerado”");
    expect(descreverAtividade(atividade("STATUS", { status: "DROPPED" }))).toBe("marcou como “Abandonado”");
  });

  it("concorda singular e plural", () => {
    expect(descreverAtividade(atividade("RATING", { rating: 1 }))).toBe("deu 1 estrela para");
    expect(descreverAtividade(atividade("RATING", { rating: 4 }))).toBe("deu 4 estrelas para");
    expect(descreverAtividade(atividade("EPISODES", { count: 1, season: 2 }))).toBe("assistiu 1 episódio da T2 de");
    expect(descreverAtividade(atividade("EPISODES", { count: 3 }))).toBe("assistiu 3 episódios de");
  });

  it("descreve comentarios e favoritos", () => {
    expect(descreverAtividade(atividade("COMMENT"))).toBe("comentou em");
    expect(descreverAtividade(atividade("FAVORITE"))).toBe("favoritou");
  });
});

describe("tempoRelativo", () => {
  const agora = new Date("2026-10-19T12:00:00Z");

  it.each([
    ["2026-10-19T11:59:30Z", "agora"],
    ["2026-10-19T11:55:00Z", "há 5 min"],
    ["2026-10-19T09:00:00Z", "há 3 h"],
    ["2026-10-18T12:00:00Z", "há 1 dia"],
    ["2026-10-15T12:00:00Z", "há 4 dias"]
  ])("%s -> %s", (iso, esperado) => {
    expect(tempoRelativo(iso, agora)).toBe(esperado);
  });

  it("datas antigas viram data por extenso e futuras viram 'agora'", () => {
    expect(tempoRelativo("2026-01-02T12:00:00Z", agora)).toMatch(/2026/);
    expect(tempoRelativo("2027-01-01T00:00:00Z", agora)).toBe("agora");
  });
});
