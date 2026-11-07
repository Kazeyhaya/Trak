import { describe, expect, it } from "vitest";
import type { ProfileLibraryItem } from "./api";
import type { CatalogItem, MediaType } from "./catalogo-api";
import {
  filtrarConcluidosNoAno,
  filtrarEstante,
  filtrarFavoritos,
  problemaUsername
} from "./perfil";

function criarItem(id: string, title: string, type: MediaType): CatalogItem {
  return {
    id,
    externalId: id,
    source: "test",
    type,
    title,
    coverUrl: null,
    synopsis: null,
    releaseYear: 2024
  };
}

describe("problemaUsername", () => {
  it("aceita nomes validos (inclusive em maiusculas, que viram minusculas)", () => {
    expect(problemaUsername("alex_allen")).toBeNull();
    expect(problemaUsername("Alex217")).toBeNull();
  });

  it("explica quando o navegador preencheu o e-mail", () => {
    expect(problemaUsername("alexallen217@gmail.c")).toMatch(/não o seu e-mail/);
  });

  it("explica tamanho e caracteres invalidos", () => {
    expect(problemaUsername("ab")).toMatch(/pelo menos 3/);
    expect(problemaUsername("a".repeat(21))).toMatch(/no máximo 20/);
    expect(problemaUsername("alex.allen")).toMatch(/sem espaços ou pontos/);
    expect(problemaUsername("joão")).toMatch(/sem acento/);
  });
});

describe("filtrarConcluidosNoAno", () => {
  const lista: ProfileLibraryItem[] = [
    {
      mediaItemId: "item-1",
      status: "COMPLETED",
      rating: 5,
      progress: 100,
      updatedAt: "2026-05-10T12:00:00Z",
      item: criarItem("item-1", "Obra 1", "MOVIE")
    },
    {
      mediaItemId: "item-2",
      status: "COMPLETED",
      rating: 4,
      progress: 100,
      updatedAt: "2025-11-20T12:00:00Z",
      item: criarItem("item-2", "Obra 2", "MOVIE")
    },
    {
      mediaItemId: "item-3",
      status: "WATCHING",
      rating: null,
      progress: 50,
      updatedAt: "2026-06-01T12:00:00Z",
      item: criarItem("item-3", "Obra 3", "MOVIE")
    },
    {
      mediaItemId: "item-4",
      status: "COMPLETED",
      rating: null,
      progress: 100,
      updatedAt: null,
      item: criarItem("item-4", "Obra 4", "MOVIE")
    }
  ];

  it("filtra apenas itens concluidos no ano indicado ou sem data definida", () => {
    const res2026 = filtrarConcluidosNoAno(lista, 2026);
    expect(res2026.map((i) => i.mediaItemId)).toEqual(["item-1", "item-4"]);

    const res2025 = filtrarConcluidosNoAno(lista, 2025);
    expect(res2025.map((i) => i.mediaItemId)).toEqual(["item-2", "item-4"]);
  });
});

describe("filtrarEstante", () => {
  const lista: ProfileLibraryItem[] = [
    {
      mediaItemId: "1",
      status: "WATCHING",
      progress: 40,
      rating: null,
      item: criarItem("1", "Filme 1", "MOVIE")
    },
    {
      mediaItemId: "2",
      status: "COMPLETED",
      progress: 100,
      rating: 5,
      item: criarItem("2", "Jogo 1", "GAME")
    },
    {
      mediaItemId: "3",
      status: "WANT",
      progress: 0,
      rating: null,
      item: criarItem("3", "Livro 1", "BOOK")
    }
  ];

  it("retorna tudo quando nenhum filtro e selecionado", () => {
    expect(filtrarEstante(lista)).toHaveLength(3);
    expect(filtrarEstante(lista, "", "")).toHaveLength(3);
  });

  it("filtra por status e por tipo", () => {
    expect(filtrarEstante(lista, "COMPLETED")).toHaveLength(1);
    expect(filtrarEstante(lista, undefined, "GAME")).toHaveLength(1);
    expect(filtrarEstante(lista, "COMPLETED", "MOVIE")).toHaveLength(0);
  });
});

describe("filtrarFavoritos", () => {
  const favs: CatalogItem[] = [
    criarItem("1", "Filme", "MOVIE"),
    criarItem("2", "Jogo", "GAME"),
    criarItem("3", "Série", "SERIES")
  ];

  it("retorna todos os favoritos sem filtro", () => {
    expect(filtrarFavoritos(favs)).toEqual(favs);
    expect(filtrarFavoritos(favs, "")).toEqual(favs);
  });

  it("filtra por tipo", () => {
    expect(filtrarFavoritos(favs, "MOVIE")).toEqual([favs[0]]);
    expect(filtrarFavoritos(favs, "BOOK")).toEqual([]);
  });
});
