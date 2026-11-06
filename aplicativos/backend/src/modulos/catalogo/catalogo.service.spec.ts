import { NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { criarSupabaseServiceMock } from "../../testes/supabase.mock";
import { CatalogoService } from "./catalogo.service";
import { GoogleBooksService } from "./google-books.service";
import { HardcoverService } from "./hardcover.service";
import { IgdbService } from "./igdb.service";

type Rotas = Record<string, unknown>;

// Responde ao fetch pela primeira rota cujo trecho aparece na URL.
function mockFetch(rotas: Rotas) {
  return jest.spyOn(global, "fetch").mockImplementation(async (entrada) => {
    const url = String(entrada);
    const chave = Object.keys(rotas)
      .sort((a, b) => b.length - a.length)
      .find((trecho) => url.includes(trecho));
    if (!chave) {
      return new Response("nao encontrado", { status: 404 });
    }
    return new Response(JSON.stringify(rotas[chave]), { status: 200 });
  });
}

function criarServico(
  googleBooksService = new GoogleBooksService(),
  hardcoverService = new HardcoverService(),
  igdbService = new IgdbService()
) {
  const supabase = criarSupabaseServiceMock();
  return new CatalogoService(
    supabase.service as unknown as SupabaseService,
    googleBooksService,
    hardcoverService,
    igdbService
  );
}

const envOriginal = { ...process.env };

afterEach(() => {
  jest.restoreAllMocks();
  process.env = { ...envOriginal };
});

describe("CatalogoService.listar", () => {
  it("vitrine de livros sem chaves mostra as tendencias da semana da Open Library", async () => {
    delete process.env.TMDB_API_KEY;
    delete process.env.RAWG_API_KEY;
    const fetch = mockFetch({
      "trending/weekly": {
        works: [{ key: "/works/OL1W", title: "O Senhor dos Anéis", cover_i: 12345 }]
      }
    });

    const itens = await criarServico().listar(undefined, "book");

    expect(itens).toEqual([expect.objectContaining({ id: "openlibrary_book_OL1W", type: "BOOK", title: "O Senhor dos Anéis" })]);
    // A busca fixa do Google Books ("bestseller") nao entra mais na vitrine.
    expect(fetch.mock.calls.some(([url]) => String(url).includes("googleapis.com/books"))).toBe(false);
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
      "/search.json": { docs: [{ key: "/works/OL9W", title: "Livro Acao", cover_i: 9 }] }
    });

    const itens = await criarServico().listar(undefined, undefined, "acao");

    expect(itens.map((i) => i.id)).toEqual([
      "tmdb_movie_10",
      "tmdb_series_20",
      "rawg_game_30",
      "openlibrary_book_OL9W"
    ]);
    expect(fetch).toHaveBeenCalledTimes(4);
    const urls = fetch.mock.calls.map(([url]) => String(url));
    // Jogos e livros por genero tambem seguem o momento: lancamentos do ultimo ano e tendencia.
    expect(urls.find((u) => u.includes("/games"))).toMatch(/dates=\d{4}-\d{2}-\d{2}%2C\d{4}-\d{2}-\d{2}/);
    expect(urls.find((u) => u.includes("/search.json"))).toContain("sort=trending");
  });

  it("filtra por manga com o que esta em alta no assunto", async () => {
    const fetch = mockFetch({
      "/search.json": { docs: [{ key: "/works/OL101W", title: "Chainsaw Man", cover_i: 101 }] }
    });

    const itens = await criarServico().listar(undefined, "book", "manga");

    expect(itens.map((i) => i.title)).toEqual(["Chainsaw Man"]);
    const url = String(fetch.mock.calls[0][0]);
    expect(url).toContain("subject=manga");
    expect(url).toContain("sort=trending");
  });

  it("filtra por quadrinhos/hqs com o que esta em alta no assunto", async () => {
    const fetch = mockFetch({
      "/search.json": { docs: [{ key: "/works/OL202W", title: "Watchmen", cover_i: 202 }] }
    });

    const itens = await criarServico().listar(undefined, "book", "quadrinhos");

    expect(itens.map((i) => i.title)).toEqual(["Watchmen"]);
    expect(String(fetch.mock.calls[0][0])).toContain("subject=comic_books");
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

    const supabase = criarSupabaseServiceMock((op) =>
      op.action === "rpc" && op.table === "trak_nota_media" ? { data: [{ average: "4.5", count: 2 }] } : { data: null }
    );
    const servico = new CatalogoService(
      supabase.service as unknown as SupabaseService,
      new GoogleBooksService(),
      new HardcoverService(),
      new IgdbService()
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

  describe("persistencia e backfill de subtype oficial (TMDB)", () => {
    it("garantirNoBanco grava subtype ANIME retornado pelo TMDB (genre 16 + JP)", async () => {
      mockFetch({
        "/tv/30984": {
          id: 30984,
          name: "Bleach",
          genres: [{ id: 16, name: "Animation" }],
          origin_country: ["JP"],
          original_language: "ja",
          first_air_date: "2004-10-05"
        }
      });

      const supabase = criarSupabaseServiceMock((op) => {
        if (op.action === "select") return { data: null };
        return { data: null };
      });
      const servico = new CatalogoService(
        supabase.service as unknown as SupabaseService,
        new GoogleBooksService(),
        new HardcoverService(),
        new IgdbService()
      );

      await servico.garantirNoBanco("tmdb_series_30984");

      const upsert = supabase.chamadas.find((c) => c.table === "MediaItem" && c.action === "upsert");
      expect(upsert?.payload).toMatchObject({
        id: "tmdb_series_30984",
        type: "SERIES",
        subtype: "ANIME",
        title: "Bleach"
      });
    });

    it("buscarSalvos faz backfill do subtype oficial no TMDB quando a linha antiga nao possui subtype", async () => {
      mockFetch({
        "/tv/30981": {
          id: 30981,
          name: "Monster",
          genres: [{ id: 16, name: "Animation" }, { id: 18, name: "Drama" }],
          origin_country: ["JP"],
          original_language: "ja",
          first_air_date: "2004-04-07"
        }
      });

      const supabase = criarSupabaseServiceMock((op) => {
        if (op.action === "select") {
          return {
            data: [
              {
                id: "tmdb_series_30981",
                externalId: "30981",
                source: "tmdb",
                type: "SERIES",
                subtype: null,
                title: "Monster",
                coverUrl: null,
                synopsis: "Dr. Kenzo Tenma...",
                releaseYear: 2004
              }
            ]
          };
        }
        return { data: null };
      });
      const servico = new CatalogoService(
        supabase.service as unknown as SupabaseService,
        new GoogleBooksService(),
        new HardcoverService(),
        new IgdbService()
      );

      const mapa = await servico.buscarSalvos(["tmdb_series_30981"]);
      expect(mapa.get("tmdb_series_30981")?.subtype).toBe("ANIME");

      const update = supabase.chamadas.find((c) => c.table === "MediaItem" && c.action === "update");
      expect(update?.payload).toMatchObject({ subtype: "ANIME" });
      expect(update?.payload).toHaveProperty("enrichedAt");
    });

    it("buscarSalvos marca filme comum como enriquecido e nao consulta o TMDB de novo", async () => {
      const fetchMock = mockFetch({ "/movie/603": { id: 603, title: "Matrix", genres: [{ id: 28, name: "Action" }] } });
      const linha = {
        id: "tmdb_movie_603",
        externalId: "603",
        source: "tmdb",
        type: "MOVIE",
        subtype: null,
        title: "Matrix",
        coverUrl: null,
        synopsis: null,
        releaseYear: 1999,
        enrichedAt: null as string | null
      };
      const supabase = criarSupabaseServiceMock((op) => {
        if (op.action === "update") {
          linha.enrichedAt = (op.payload as { enrichedAt: string }).enrichedAt;
        }
        return op.action === "select" ? { data: [{ ...linha }] } : { data: null };
      });
      const servico = new CatalogoService(
        supabase.service as unknown as SupabaseService,
        new GoogleBooksService(),
        new HardcoverService(),
        new IgdbService()
      );

      const mapa = await servico.buscarSalvos(["tmdb_movie_603"]);
      expect(mapa.get("tmdb_movie_603")).not.toHaveProperty("enrichedAt");
      expect(linha.enrichedAt).not.toBeNull();
      const consultasDepoisDaPrimeira = fetchMock.mock.calls.length;

      // Instancia nova: sem o cache em memoria, so o enrichedAt evita a consulta.
      const outraInstancia = new CatalogoService(
        supabase.service as unknown as SupabaseService,
        new GoogleBooksService(),
        new HardcoverService(),
        new IgdbService()
      );
      await outraInstancia.buscarSalvos(["tmdb_movie_603"]);
      expect(fetchMock.mock.calls.length).toBe(consultasDepoisDaPrimeira);
    });

    it("buscarSalvos tenta de novo quando o TMDB falhou", async () => {
      mockFetch({});
      const supabase = criarSupabaseServiceMock((op) =>
        op.action === "select"
          ? {
              data: [
                { id: "tmdb_movie_9", externalId: "9", source: "tmdb", type: "MOVIE", title: "X", enrichedAt: null }
              ]
            }
          : { data: null }
      );
      const servico = new CatalogoService(
        supabase.service as unknown as SupabaseService,
        new GoogleBooksService(),
        new HardcoverService(),
        new IgdbService()
      );

      await servico.buscarSalvos(["tmdb_movie_9"]);
      expect(supabase.chamadas.some((c) => c.action === "update")).toBe(false);
    });
  });

  describe("IGDB integration para capas verticais de jogos", () => {
    it("prioriza a capa em alta resolução da IGDB ao buscar jogo por id", async () => {
      process.env.RAWG_API_KEY = "mock_rawg_key";
      const mockIgdb = new IgdbService();
      jest.spyOn(mockIgdb, "isConfigurado").mockReturnValue(true);
      jest.spyOn(mockIgdb, "buscarCapaPorNome").mockResolvedValueOnce(
        "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co670h.jpg"
      );

      mockFetch({
        "/games/3498": {
          id: 3498,
          name: "Grand Theft Auto V",
          background_image: "https://media.rawg.io/media/games/456/gta5.jpg",
          description_raw: "Jogo de mundo aberto."
        }
      });

      const servico = criarServico(new GoogleBooksService(), new HardcoverService(), mockIgdb);
      const jogo = await servico.buscarPorId("rawg_game_3498");

      expect(jogo?.coverUrl).toBe("https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co670h.jpg");
      expect(mockIgdb.buscarCapaPorNome).toHaveBeenCalledWith("Grand Theft Auto V");
    });
  });

  describe("CatalogoService.capas (opções de capas alternativas)", () => {
    it("busca opções de posters alternativos para filmes/séries no TMDB", async () => {
      process.env.TMDB_API_KEY = "mock_key";
      mockFetch({
        "/movie/1283515": {
          id: 1283515,
          title: "Verity",
          poster_path: "/verity_default.jpg"
        },
        "/movie/1283515/images": {
          posters: [
            { file_path: "/poster1.jpg" },
            { file_path: "/poster2.jpg" }
          ]
        }
      });

      const servico = criarServico();
      const resultado = await servico.capas("tmdb_movie_1283515");

      expect(resultado.capas).toContain("https://image.tmdb.org/t/p/w500/verity_default.jpg");
      expect(resultado.capas).toContain("https://image.tmdb.org/t/p/w780/poster1.jpg");
      expect(resultado.capas).toContain("https://image.tmdb.org/t/p/w780/poster2.jpg");
    });

    it("busca opções de capas alternativas na IGDB para jogos sem misturar screenshots horizontais", async () => {
      process.env.RAWG_API_KEY = "mock_rawg_key";
      const mockIgdb = new IgdbService();
      jest.spyOn(mockIgdb, "isConfigurado").mockReturnValue(true);
      jest.spyOn(mockIgdb, "buscarCapasAlternativas").mockResolvedValueOnce([
        "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/cover_alt1.jpg",
        "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/cover_alt2.jpg"
      ]);

      mockFetch({
        "/games/3498": {
          id: 3498,
          name: "Grand Theft Auto V",
          background_image: "https://media.rawg.io/media/games/gta5.jpg"
        },
        "/games/3498/screenshots": {
          results: [{ image: "https://media.rawg.io/screenshot1.jpg" }]
        }
      });

      const servico = criarServico(new GoogleBooksService(), new HardcoverService(), mockIgdb);
      const resultado = await servico.capas("rawg_game_3498");

      expect(resultado.capas).toContain("https://images.igdb.com/igdb/image/upload/t_cover_big_2x/cover_alt1.jpg");
      expect(resultado.capas).toContain("https://images.igdb.com/igdb/image/upload/t_cover_big_2x/cover_alt2.jpg");
      expect(resultado.capas).not.toContain("https://media.rawg.io/screenshot1.jpg");
    });

    it("garantirNoBanco une o registro antigo no id canonico em vez de renomea-lo", async () => {
      const supabase = criarSupabaseServiceMock((op) => {
        if (op.table === "MediaItem" && op.action === "select") {
          const filtroId = op.filtros.find((f) => f[1] === "id");
          if (filtroId) return { data: null };
          return { data: { id: "media_legado_3498" } };
        }
        if (op.table === "MediaItem" && op.action === "upsert") {
          return {
            data: null,
            error: {
              code: "23505",
              message: 'duplicate key value violates unique constraint "MediaItem_externalId_source_type_key"'
            }
          };
        }
        return { data: null, error: null };
      });

      const servico = new CatalogoService(
        supabase.service as unknown as SupabaseService,
        new GoogleBooksService(),
        new HardcoverService(),
        new IgdbService()
      );

      await expect(
        servico.garantirNoBanco("rawg_game_3498", {
          id: "rawg_game_3498",
          externalId: "3498",
          source: "rawg",
          type: "GAME",
          title: "Grand Theft Auto V",
          coverUrl: null,
          synopsis: null,
          releaseYear: 2013
        })
      ).resolves.toBeUndefined();

      const uniao = supabase.chamadas.find((c) => c.action === "rpc");
      expect(uniao).toMatchObject({
        table: "trak_unir_media_item",
        payload: { legado: "media_legado_3498", canonico: "rawg_game_3498", external_id: "3498" }
      });
      expect(supabase.chamadas.some((c) => c.table === "MediaItem" && c.action === "update")).toBe(false);
    });
  });
});

describe("jogos com o RAWG fora do ar", () => {
  it("usa a IGDB na vitrine quando o RAWG nao responde", async () => {
    process.env.RAWG_API_KEY = "k";
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("error code: 522", { status: 522 }));
    const igdb = new IgdbService();
    jest.spyOn(igdb, "isConfigurado").mockReturnValue(true);
    const emAlta = jest.spyOn(igdb, "emAlta").mockResolvedValue([
      {
        id: "igdb_game_1",
        externalId: "1",
        source: "igdb",
        type: "GAME",
        title: "Hollow Knight",
        coverUrl: null,
        synopsis: null,
        releaseYear: 2017
      }
    ]);

    const itens = await criarServico(new GoogleBooksService(), new HardcoverService(), igdb).listar(undefined, "game");

    expect(emAlta).toHaveBeenCalledWith(20);
    expect(itens.map((i) => i.id)).toEqual(["igdb_game_1"]);
  });
});

describe("ficha com a fonte fora do ar", () => {
  it("abre com os dados salvos em MediaItem quando o RAWG nao responde", async () => {
    process.env.RAWG_API_KEY = "k";
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("error code: 522", { status: 522 }));
    const salvo = {
      id: "rawg_game_56184",
      externalId: "56184",
      source: "rawg",
      type: "GAME",
      subtype: null,
      title: "Resident Evil 4",
      coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/re4.jpg",
      synopsis: null,
      releaseYear: 2005,
      enrichedAt: "2026-11-01T00:00:00Z"
    };
    const supabase = criarSupabaseServiceMock((op) =>
      op.table === "MediaItem" && op.action === "select" ? { data: [salvo] } : { data: null }
    );
    const servico = new CatalogoService(
      supabase.service as unknown as SupabaseService,
      new GoogleBooksService(),
      new HardcoverService(),
      new IgdbService()
    );

    const item = await servico.buscarPorId("rawg_game_56184");

    expect(item).toMatchObject({ id: "rawg_game_56184", title: "Resident Evil 4", releaseYear: 2005 });
    expect(item).not.toHaveProperty("enrichedAt");
  });

  it("continua 404 para o que nao existe nem na fonte nem no banco", async () => {
    process.env.RAWG_API_KEY = "k";
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("", { status: 404 }));
    await expect(criarServico().buscarPorId("rawg_game_1")).rejects.toThrow("Item nao encontrado.");
  });
});
