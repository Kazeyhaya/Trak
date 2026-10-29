import { NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { criarSupabaseServiceMock } from "../../testes/supabase.mock";
import { CatalogoService } from "./catalogo.service";
import { GoogleBooksService } from "./google-books.service";
import { HardcoverService } from "./hardcover.service";

type Rotas = Record<string, unknown>;

// Responde ao fetch pela primeira rota cujo trecho aparece na URL.
function mockFetch(rotas: Rotas) {
  return jest.spyOn(global, "fetch").mockImplementation(async (entrada) => {
    const url = String(entrada);
    const chave = Object.keys(rotas).find((trecho) => url.includes(trecho));
    if (!chave) {
      return new Response("nao encontrado", { status: 404 });
    }
    return new Response(JSON.stringify(rotas[chave]), { status: 200 });
  });
}

function criarServico(
  googleBooksService = new GoogleBooksService(),
  hardcoverService = new HardcoverService()
) {
  const supabase = criarSupabaseServiceMock();
  return new CatalogoService(
    supabase.service as unknown as SupabaseService,
    googleBooksService,
    hardcoverService
  );
}

const envOriginal = { ...process.env };

afterEach(() => {
  jest.restoreAllMocks();
  process.env = { ...envOriginal };
});

describe("CatalogoService.listar", () => {
  it("sem chaves de API ainda lista livros do Google Books e OpenLibrary de forma híbrida", async () => {
    delete process.env.TMDB_API_KEY;
    delete process.env.RAWG_API_KEY;
    mockFetch({
      "trending/weekly": {
        works: [{ key: "/works/OL1W", title: "O Senhor dos Anéis", cover_i: 12345 }]
      },
      "googleapis.com/books": {
        items: [{ id: "gb1", volumeInfo: { title: "Duna", description: "Ficção científica épica." } }]
      }
    });

    const itens = await criarServico().listar(undefined, "book");

    expect(itens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "openlibrary_book_OL1W", type: "BOOK", title: "O Senhor dos Anéis" }),
        expect.objectContaining({ id: "media_gbooks_gb1", type: "BOOK", title: "Duna" })
      ])
    );
  });

  it("filtro de tipo consulta apenas a fonte correspondente", async () => {
    process.env.TMDB_API_KEY = "k";
    process.env.RAWG_API_KEY = "k";
    const fetch = mockFetch({ "/search/movie": { results: [{ id: 603, title: "Matrix" }] } });

    const itens = await criarServico().listar("matrix", "movie");

    expect(itens.map((i) => i.id)).toEqual(["tmdb_movie_603"]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("guarda respostas em cache, mas nao guarda falhas", async () => {
    process.env.TMDB_API_KEY = "k";
    const servico = criarServico();
    const fetch = mockFetch({});

    await expect(servico.buscarPorId("tmdb_movie_1")).rejects.toBeInstanceOf(NotFoundException);
    await expect(servico.buscarPorId("tmdb_movie_1")).rejects.toBeInstanceOf(NotFoundException);
    expect(fetch).toHaveBeenCalledTimes(2);

    fetch.mockRestore();
    const sucesso = mockFetch({ "/movie/2": { id: 2, title: "Ok" } });
    await servico.buscarPorId("tmdb_movie_2");
    await servico.buscarPorId("tmdb_movie_2");
    expect(sucesso).toHaveBeenCalledTimes(1);
  });

  it("id invalido nao chama nenhuma API", async () => {
    const fetch = mockFetch({});
    await expect(criarServico().buscarPorId("../../etc")).rejects.toBeInstanceOf(NotFoundException);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("CatalogoService series", () => {
  const tv = {
    id: 1,
    name: "Serie",
    seasons: [
      { season_number: 0, name: "Especiais", episode_count: 2, air_date: null },
      { season_number: 1, name: "T1", episode_count: 10, air_date: "2020-01-01" },
      { season_number: 2, name: "T2", episode_count: 8, air_date: "2021-01-01" },
      { season_number: 3, name: "T3", episode_count: 0, air_date: null }
    ],
    last_episode_to_air: { season_number: 2, episode_number: 3, name: "E3", air_date: "2026-10-15" },
    next_episode_to_air: { season_number: 2, episode_number: 4, name: "E4", air_date: "2026-10-22" }
  };

  beforeEach(() => {
    process.env.TMDB_API_KEY = "k";
  });

  it("lista temporadas com especiais por ultimo e sem temporadas vazias", async () => {
    mockFetch({ "/tv/1": tv });
    const temporadas = await criarServico().listarTemporadas("tmdb_series_1");
    expect(temporadas.map((t) => t.seasonNumber)).toEqual([1, 2, 0]);
  });

  it("conta so os episodios ja exibidos", async () => {
    mockFetch({ "/tv/1": tv });
    expect(await criarServico().totalEpisodiosExibidos("tmdb_series_1")).toBe(13);
  });

  it("temporadas de um filme dao 404", async () => {
    await expect(criarServico().listarTemporadas("tmdb_movie_1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("avisa sobre o proximo episodio", async () => {
    mockFetch({ "/tv/1": tv });
    const novidade = await criarServico().novidades("tmdb_series_1", new Date("2026-10-19T12:00:00Z"));
    expect(novidade).toEqual({ kind: "UPCOMING_EPISODE", date: "2026-10-22", label: "T2E4 estreia em breve" });
  });

  it("avisa sobre episodio recem-lancado quando nao ha proximo", async () => {
    mockFetch({ "/tv/1": { ...tv, next_episode_to_air: null } });
    const novidade = await criarServico().novidades("tmdb_series_1", new Date("2026-10-19T12:00:00Z"));
    expect(novidade?.kind).toBe("NEW_EPISODE");
  });

  it("nao avisa sobre lancamentos antigos", async () => {
    mockFetch({ "/movie/5": { id: 5, title: "Antigo", release_date: "1999-01-01" } });
    expect(await criarServico().novidades("tmdb_movie_5", new Date("2026-10-19T12:00:00Z"))).toBeNull();
  });
});

describe("CatalogoService.buscarJogoPorNome", () => {
  it("prefere o resultado com nome identico", async () => {
    process.env.RAWG_API_KEY = "k";
    mockFetch({
      "/games": {
        results: [
          { id: 1, name: "Portal 2", background_image: null, released: null },
          { id: 2, name: "Portal", background_image: null, released: null }
        ]
      }
    });
    expect((await criarServico().buscarJogoPorNome("PORTAL"))?.id).toBe("rawg_game_2");
  });
});

describe("CatalogoService diagnostico", () => {
  it("registra no log quando a API externa recusa a chave (401)", async () => {
    process.env.TMDB_API_KEY = "chave-errada";
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));
    const servico = criarServico();
    const aviso = jest.spyOn((servico as unknown as { logger: { warn: (m: string) => void } }).logger, "warn");

    expect(await servico.listar(undefined, "movie")).toEqual([]);
    expect(aviso).toHaveBeenCalledWith(expect.stringMatching(/api\.themoviedb\.org respondeu 401.*chave de API invalida/));
    // A chave nunca aparece no log.
    expect(aviso.mock.calls.flat().join(" ")).not.toContain("chave-errada");
  });

  it("avisa ao subir quando faltam chaves", () => {
    delete process.env.TMDB_API_KEY;
    process.env.RAWG_API_KEY = "  ";
    const servico = criarServico();
    const aviso = jest.spyOn((servico as unknown as { logger: { warn: (m: string) => void } }).logger, "warn");

    servico.onModuleInit();

    expect(aviso).toHaveBeenCalledWith(expect.stringContaining("TMDB_API_KEY nao configurada"));
    expect(aviso).toHaveBeenCalledWith(expect.stringContaining("RAWG_API_KEY nao configurada"));
  });
});

describe("CatalogoService.listar (animes e animacoes)", () => {
  beforeEach(() => {
    process.env.TMDB_API_KEY = "k";
    process.env.RAWG_API_KEY = "k";
  });

  it("sem busca usa o discover do TMDB com o genero Animacao, em series e filmes", async () => {
    const fetch = mockFetch({
      "/discover/tv": { results: [{ id: 12971, name: "Dragon Ball Z", genre_ids: [16] }] },
      "/discover/movie": { results: [{ id: 129, title: "A Viagem de Chihiro", genre_ids: [16] }] }
    });

    const itens = await criarServico().listar(undefined, "anime");

    expect(itens.map((i) => i.id)).toEqual(["tmdb_series_12971", "tmdb_movie_129"]);
    const urls = fetch.mock.calls.map(([url]) => String(url));
    expect(urls).toHaveLength(2);
    expect(urls.every((url) => url.includes("with_genres=16"))).toBe(true);
    // Jogos e livros nao entram nesse filtro.
    expect(urls.some((url) => url.includes("rawg") || url.includes("openlibrary"))).toBe(false);
  });

  it("com busca mantem so os resultados do genero Animacao", async () => {
    mockFetch({
      "/search/tv": {
        results: [
          { id: 1, name: "Naruto", genre_ids: [16, 10759] },
          { id: 2, name: "Naruto: O Documentario", genre_ids: [99] }
        ]
      },
      "/search/movie": { results: [{ id: 3, title: "Naruto (live action)" }] }
    });

    const itens = await criarServico().listar("naruto", "anime");

    expect(itens.map((i) => i.title)).toEqual(["Naruto"]);
  });

  it("aba de series exclui animes e animacoes (genero 16)", async () => {
    const fetch = mockFetch({
      "/discover/tv": {
        results: [
          { id: 1396, name: "Breaking Bad", genre_ids: [18, 80] },
          { id: 12971, name: "Dragon Ball Z", genre_ids: [16, 10759] }
        ]
      }
    });

    const itens = await criarServico().listar(undefined, "series");

    expect(itens.map((i) => i.title)).toEqual(["Breaking Bad"]);
    expect(String(fetch.mock.calls[0]?.[0])).toContain("without_genres=16");
  });

  it("aba de novelas consulta o genero soap e paises produtores", async () => {
    const fetch = mockFetch({
      "/discover/tv": {
        results: [
          { id: 2190, name: "Avenida Brasil", genre_ids: [10766, 18], origin_country: ["BR"] }
        ]
      }
    });

    const itens = await criarServico().listar(undefined, "novela");

    expect(itens.map((i) => i.title)).toEqual(["Avenida Brasil"]);
    const urls = fetch.mock.calls.map(([url]) => String(url));
    expect(urls.some((u) => u.includes("with_genres=10766"))).toBe(true);
  });

  it("aba de doramas consulta paises asiaticos e exclui animacoes", async () => {
    const fetch = mockFetch({
      "/discover/tv": {
        results: [
          { id: 93405, name: "Pousando no Amor", genre_ids: [18, 35], origin_country: ["KR"] }
        ]
      }
    });

    const itens = await criarServico().listar(undefined, "dorama");

    expect(itens.map((i) => i.title)).toEqual(["Pousando no Amor"]);
    const url = String(fetch.mock.calls[0]?.[0]);
    expect(url).toContain("with_origin_country=KR%7CJP%7CCN%7CTW%7CTH");
    expect(url).toContain("without_genres=16%2C10764%2C10767");
  });

  it("filtra por genero em todas as fontes suportadas", async () => {
    const fetch = mockFetch({
      "/discover/movie": { results: [{ id: 10, title: "Filme Acao", genre_ids: [28] }] },
      "/discover/tv": { results: [{ id: 20, name: "Serie Acao", genre_ids: [10759] }] },
      "/games": { results: [{ id: 30, name: "Jogo Acao", background_image: null, released: null }] },
      "googleapis.com/books": { items: [{ id: "gb9", volumeInfo: { title: "Livro Acao" } }] }
    });

    const itens = await criarServico().listar(undefined, undefined, "acao");

    expect(itens.map((i) => i.id)).toEqual([
      "tmdb_movie_10",
      "tmdb_series_20",
      "rawg_game_30",
      "media_gbooks_gb9"
    ]);
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it("filtra por manga na aba de livros ou tipo manga", async () => {
    const mockHc = new HardcoverService();
    jest.spyOn(mockHc, "searchBooks").mockResolvedValueOnce([
      {
        id: "media_hardcover_101",
        externalId: "101",
        source: "hardcover",
        type: "BOOK",
        subtype: "MANGA",
        title: "Chainsaw Man",
        coverUrl: "https://assets.hardcover.app/csm.jpg",
        synopsis: null,
        releaseYear: 2018
      }
    ]);
    const mockGb = new GoogleBooksService();
    jest.spyOn(mockGb, "searchBooks").mockResolvedValueOnce([]);
    mockFetch({
      "/subjects/manga.json": { works: [] }
    });

    const servico = criarServico(mockGb, mockHc);
    const itens = await servico.listar(undefined, "book", "manga");

    expect(itens.some((i) => i.title === "Chainsaw Man")).toBe(true);
    expect(mockHc.searchBooks).toHaveBeenCalledWith("manga", 20);
  });

  it("filtra por quadrinhos/hqs na aba de livros", async () => {
    const mockHc = new HardcoverService();
    jest.spyOn(mockHc, "searchBooks").mockResolvedValueOnce([
      {
        id: "media_hardcover_202",
        externalId: "202",
        source: "hardcover",
        type: "BOOK",
        subtype: "HQ",
        title: "Watchmen",
        coverUrl: "https://assets.hardcover.app/watchmen.jpg",
        synopsis: null,
        releaseYear: 1986
      }
    ]);
    const mockGb = new GoogleBooksService();
    jest.spyOn(mockGb, "searchBooks").mockResolvedValueOnce([]);
    mockFetch({
      "/subjects/comic_books.json": { works: [] }
    });

    const servico = criarServico(mockGb, mockHc);
    const itens = await servico.listar(undefined, "book", "quadrinhos");

    expect(itens.some((i) => i.title === "Watchmen")).toBe(true);
    expect(mockHc.searchBooks).toHaveBeenCalledWith("graphic novel", 20);
  });
});

describe("CatalogoService.extras", () => {
  beforeEach(() => {
    process.env.TMDB_API_KEY = "k";
    process.env.OMDB_API_KEY = "omdb-k";
  });

  it("retorna onde assistir (BR), nota do Trak e notas do IMDb/Rotten Tomatoes/Metacritic via OMDb", async () => {
    mockFetch({
      "/movie/550/watch/providers": {
        results: {
          BR: {
            link: "https://tmdb.org/watch",
            flatrate: [{ provider_name: "Netflix" }],
            rent: [{ provider_name: "Apple TV" }]
          }
        }
      },
      "/movie/550": {
        id: 550,
        title: "Clube da Luta",
        imdb_id: "tt0137523",
        vote_average: 8.4,
        genres: [{ id: 18, name: "Drama" }]
      },
      "omdbapi.com": {
        imdbRating: "8.8",
        Metascore: "67",
        Ratings: [
          { Source: "Rotten Tomatoes", Value: "79%" },
          { Source: "Metacritic", Value: "67/100" }
        ]
      }
    });

    const supabase = criarSupabaseServiceMock(() => ({
      data: [{ personalRating: 5 }, { personalRating: 4 }]
    }));
    const servico = new CatalogoService(
      supabase.service as unknown as SupabaseService,
      new GoogleBooksService(),
      new HardcoverService()
    );

    const extras = await servico.extras("tmdb_movie_550");

    expect(extras.genres).toEqual(["Drama"]);
    expect(extras.trakRating).toEqual({ average: 4.5, count: 2 });
    expect(extras.watchProviders).toEqual([
      { name: "Netflix", category: "STREAMING", url: "https://www.netflix.com/search?q=Clube%20da%20Luta" },
      { name: "Apple TV", category: "RENT", url: "https://tv.apple.com/br/search?term=Clube%20da%20Luta" }
    ]);
    expect(extras.externalRatings).toEqual([
      { source: "IMDb", value: "8.8/10" },
      { source: "Rotten Tomatoes", value: "79%" },
      { source: "Metacritic", value: "67/100" },
      { source: "TMDB", value: "8.4/10" }
    ]);
  });

  describe("Hardcover integration", () => {
    it("carrega livro da Hardcover pelo id media_hardcover_", async () => {
      const mockHc = new HardcoverService();
      jest.spyOn(mockHc, "getBookById").mockResolvedValueOnce({
        id: "media_hardcover_1803823",
        externalId: "1803823",
        source: "hardcover",
        type: "BOOK",
        title: "As 48 Leis do Poder",
        coverUrl: "https://assets.hardcover.app/edition/power.jpg",
        synopsis: "Sinopse em portugues do livro de estrategia.",
        releaseYear: 1998
      });

      const servico = criarServico(new GoogleBooksService(), mockHc);
      const item = await servico.buscarPorId("media_hardcover_1803823");

      expect(item).toMatchObject({
        id: "media_hardcover_1803823",
        title: "As 48 Leis do Poder",
        source: "hardcover",
        coverUrl: "https://assets.hardcover.app/edition/power.jpg"
      });
    });

    it("retorna extras com nota da Hardcover e generos", async () => {
      const mockHc = new HardcoverService();
      jest.spyOn(mockHc, "getBookRaw").mockResolvedValueOnce({
        id: 1803823,
        title: "As 48 Leis do Poder",
        rating: 4.8,
        slug: "as-48-leis-do-poder",
        pages: 460,
        cached_tags: {
          Genre: [{ tag: "Classics" }, { tag: "Philosophy" }]
        }
      });

      const servico = criarServico(new GoogleBooksService(), mockHc);
      const extras = await servico.extras("media_hardcover_1803823");

      expect(extras.genres).toEqual(["Classics", "Philosophy"]);
      expect(extras.watchLink).toBe("https://hardcover.app/books/as-48-leis-do-poder");
      expect(extras.externalRatings).toEqual([{ source: "Hardcover", value: "4.8/5" }]);
      expect(extras.watchProviders.some((p) => p.name === "Hardcover")).toBe(true);
    });

    it("calcula duracao em minutos com base nas paginas da Hardcover", async () => {
      const mockHc = new HardcoverService();
      jest.spyOn(mockHc, "getBookRaw").mockResolvedValueOnce({
        id: 1803823,
        title: "As 48 Leis do Poder",
        pages: 400
      });

      const servico = criarServico(new GoogleBooksService(), mockHc);
      const minutos = await servico.duracaoMinutos("media_hardcover_1803823");

      // 400 paginas * 1.5 minutos/pagina = 600 minutos
      expect(minutos).toBe(600);
    });
  });
});
