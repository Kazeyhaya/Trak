import { describe, expect, it } from "vitest";
import { LIMITE_ARQUIVO_BYTES, listaPeloNome, validarArquivo } from "./importacao";

describe("listaPeloNome", () => {
  it.each([
    ["watchlist.csv", "watchlist"],
    ["ratings.csv", "ratings"],
    ["Diary.CSV", "diary"],
    ["watched.csv", "watched"],
    ["qualquer.csv", "watched"]
  ])("%s -> %s", (nome, esperado) => {
    expect(listaPeloNome(nome)).toBe(esperado);
  });
});

describe("validarArquivo", () => {
  const arquivo = (nome: string, tamanho: number) => ({ name: nome, size: tamanho }) as File;

  it("aceita extensao e tamanho validos", () => {
    expect(validarArquivo(arquivo("watched.CSV", 100), [".csv"])).toBeNull();
  });

  it("recusa extensao errada", () => {
    expect(validarArquivo(arquivo("foto.png", 100), [".csv"])).toMatch(/\.csv/);
  });

  it("recusa arquivo grande demais", () => {
    expect(validarArquivo(arquivo("a.json", LIMITE_ARQUIVO_BYTES + 1), [".json"])).toMatch(/5 MB/);
  });
});
