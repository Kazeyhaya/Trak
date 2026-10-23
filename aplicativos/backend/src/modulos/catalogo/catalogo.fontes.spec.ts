import {
  anoDe,
  mapearOpenLibrary,
  mapearRawg,
  mapearTmdb,
  montarId,
  normalizarTitulo,
  parsearId
} from "./catalogo.fontes";

describe("parsearId / montarId", () => {
  it.each([
    ["tmdb_movie_550", { source: "tmdb", type: "MOVIE", externalId: "550" }],
    ["tmdb_series_1399", { source: "tmdb", type: "SERIES", externalId: "1399" }],
    ["rawg_game_3498", { source: "rawg", type: "GAME", externalId: "3498" }],
    ["openlibrary_book_OL82563W", { source: "openlibrary", type: "BOOK", externalId: "OL82563W" }]
  ])("interpreta %s", (id, esperado) => {
    expect(parsearId(id)).toEqual(esperado);
  });

  it.each(["", "abc", "tmdb_movie_", "tmdb_movie_55a", "rawg_game_1/../x", "openlibrary_book_OL1M", "media_tmdb_550"])(
    "rejeita %p",
    (id) => {
      expect(parsearId(id)).toBeNull();
    }
  );

  it("montarId e o inverso de parsearId", () => {
    for (const id of ["tmdb_movie_1", "tmdb_series_2", "rawg_game_3", "openlibrary_book_OL4W"]) {
      const parsed = parsearId(id)!;
      expect(montarId(parsed.source, parsed.type, parsed.externalId)).toBe(id);
    }
  });
});

describe("mapeadores", () => {
  it("TMDB usa name/first_air_date para series e monta a URL do poster", () => {
    const item = mapearTmdb({ id: 1399, name: "GoT", first_air_date: "2011-04-17", poster_path: "/p.jpg", overview: "" }, "SERIES");
    expect(item).toMatchObject({
      id: "tmdb_series_1399",
      title: "GoT",
      releaseYear: 2011,
      coverUrl: "https://image.tmdb.org/t/p/w500/p.jpg",
      synopsis: null
    });
  });

  it("RAWG preserva a imagem em alta resolucao", () => {
    const item = mapearRawg({
      id: 1,
      name: "Jogo",
      released: "2013-09-17",
      background_image: "https://media.rawg.io/media/games/456/abc.jpg"
    });
    expect(item.coverUrl).toBe("https://media.rawg.io/media/games/456/abc.jpg");
    expect(item.releaseYear).toBe(2013);
  });

  it("RAWG sem imagem fica com coverUrl null", () => {
    expect(mapearRawg({ id: 1, name: "J", released: null, background_image: null }).coverUrl).toBeNull();
  });

  it("Open Library aceita descricao como texto ou objeto e usa a primeira capa valida", () => {
    const busca = mapearOpenLibrary({ key: "/works/OL1W", title: "Livro", cover_i: 10, first_publish_year: 1954 });
    expect(busca).toMatchObject({
      id: "openlibrary_book_OL1W",
      externalId: "OL1W",
      coverUrl: "https://covers.openlibrary.org/b/id/10-L.jpg",
      releaseYear: 1954
    });

    const obra = mapearOpenLibrary({
      key: "/works/OL2W",
      title: "Obra",
      covers: [-1, 22],
      description: { value: "  Texto  " },
      first_publish_date: "October 1954"
    });
    expect(obra).toMatchObject({ coverUrl: "https://covers.openlibrary.org/b/id/22-L.jpg", synopsis: "Texto", releaseYear: 1954 });
  });

  it("Open Library: resultados de /subjects trazem a capa em cover_id", () => {
    const item = mapearOpenLibrary({ key: "/works/OL3W", title: "Assunto", cover_id: 33 });
    expect(item.coverUrl).toBe("https://covers.openlibrary.org/b/id/33-L.jpg");
  });
});

describe("utilitarios", () => {
  it("anoDe encontra o ano em formatos variados", () => {
    expect(anoDe("2020-01-01")).toBe(2020);
    expect(anoDe("May 1999")).toBe(1999);
    expect(anoDe("")).toBeNull();
    expect(anoDe(null)).toBeNull();
  });

  it("normalizarTitulo ignora acentos, caixa e pontuacao", () => {
    expect(normalizarTitulo("Pokémon: Let's Go!")).toBe("pokemon let s go");
    expect(normalizarTitulo("THE WITCHER® 3")).toBe("the witcher 3");
  });
});
