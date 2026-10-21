import { NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { criarSupabaseServiceMock } from "../../testes/supabase.mock";
import { CatalogoService } from "./catalogo.service";

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

function criarServico() {
  const supabase = criarSupabaseServiceMock();
  return new CatalogoService(supabase.service as unknown as SupabaseService);
}

const envOriginal = { ...process.env };

afterEach(() => {
  jest.restoreAllMocks();
  process.env = { ...envOriginal };
});

describe("CatalogoService.listar", () => {
  it("sem chaves de API ainda lista livros do Open Library", async () => {
    delete process.env.TMDB_API_KEY;
    delete process.env.RAWG_API_KEY;
    mockFetch({ "/trending/weekly.json": { works: [{ key: "/works/OL1W", title: "Duna", cover_i: 5 }] } });

    const itens = await criarServico().listar();

    expect(itens).toEqual([expect.objectContaining({ id: "openlibrary_book_OL1W", type: "BOOK", title: "Duna" })]);
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
});
