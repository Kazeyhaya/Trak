import { describe, expect, it } from "vitest";

import { miniaturaCapa } from "./imagens";

describe("miniaturaCapa", () => {
  it("reduz capas do TMDB para a menor largura que cobre 2x o tamanho exibido", () => {
    expect(miniaturaCapa("https://image.tmdb.org/t/p/w500/abc.jpg", 80)).toBe(
      "https://image.tmdb.org/t/p/w185/abc.jpg"
    );
    expect(miniaturaCapa("https://image.tmdb.org/t/p/original/abc.jpg", 160)).toBe(
      "https://image.tmdb.org/t/p/w342/abc.jpg"
    );
  });

  it("usa o endpoint de resize do RAWG", () => {
    expect(miniaturaCapa("https://media.rawg.io/media/games/x/y.jpg", 150)).toBe(
      "https://media.rawg.io/media/resize/420/-/games/x/y.jpg"
    );
  });

  it("troca o preset do IGDB", () => {
    expect(miniaturaCapa("https://images.igdb.com/igdb/image/upload/t_1080p/co1.jpg", 60)).toBe(
      "https://images.igdb.com/igdb/image/upload/t_cover_small/co1.jpg"
    );
  });

  it("mantém URLs desconhecidas e trata vazio", () => {
    expect(miniaturaCapa("https://exemplo.com/capa.png", 100)).toBe("https://exemplo.com/capa.png");
    expect(miniaturaCapa(null, 100)).toBeNull();
  });
});

describe("carregadorImagem", () => {
  it("pede ao provedor o tamanho que o next/image precisa", async () => {
    const { default: carregadorImagem } = await import("./carregador-imagem");
    expect(carregadorImagem({ src: "https://image.tmdb.org/t/p/w500/x.jpg", width: 360 })).toBe(
      "https://image.tmdb.org/t/p/w500/x.jpg"
    );
    expect(carregadorImagem({ src: "https://image.tmdb.org/t/p/original/x.jpg", width: 300 })).toBe(
      "https://image.tmdb.org/t/p/w342/x.jpg"
    );
    expect(carregadorImagem({ src: "https://media.rawg.io/media/games/a/b.jpg", width: 360 })).toBe(
      "https://media.rawg.io/media/resize/420/-/games/a/b.jpg"
    );
    // Sem tamanhos alternativos: a URL volta como veio, sem passar pela Vercel.
    expect(carregadorImagem({ src: "https://covers.openlibrary.org/b/id/1-L.jpg", width: 640 })).toBe(
      "https://covers.openlibrary.org/b/id/1-L.jpg"
    );
  });
});
