import {
  converterNota,
  interpretarPerfilSteam,
  itensTrakt,
  jogosSteam,
  linhasLetterboxd,
  parseCsv
} from "./importacao.parsers";

describe("parseCsv", () => {
  it("lida com aspas, virgulas e quebras de linha dentro de campos", () => {
    const csv = '﻿Name,Year\r\n"Crimes, Lies","1999"\r\n"Um ""filme""\nnovo",2001\r\n\r\n';
    expect(parseCsv(csv)).toEqual([
      ["Name", "Year"],
      ["Crimes, Lies", "1999"],
      ['Um "filme"\nnovo', "2001"]
    ]);
  });

  it("aceita arquivo sem quebra de linha final", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"]
    ]);
  });
});

describe("converterNota", () => {
  it("converte escalas para 1..5", () => {
    expect(converterNota(0.5, 5)).toBe(1);
    expect(converterNota(3.5, 5)).toBe(4);
    expect(converterNota(5, 5)).toBe(5);
    expect(converterNota(10, 10)).toBe(5);
    expect(converterNota(7, 10)).toBe(4);
    expect(converterNota(1, 10)).toBe(1);
  });

  it("retorna null para nota ausente ou invalida", () => {
    expect(converterNota(0, 5)).toBeNull();
    expect(converterNota(Number.NaN, 5)).toBeNull();
  });
});

describe("linhasLetterboxd", () => {
  const ratings = [
    "Date,Name,Year,Letterboxd URI,Rating",
    "2024-01-01,Parasite,2019,https://boxd.it/a,4.5",
    "2024-01-02,Clube da Luta,1999,https://boxd.it/b,",
    "2024-01-03,Parasite,2019,https://boxd.it/a,4.5"
  ].join("\n");

  it("le titulo, ano e nota, sem duplicar filmes", () => {
    expect(linhasLetterboxd(ratings, "ratings")).toEqual([
      { titulo: "Parasite", ano: 2019, rating: 5, status: "COMPLETED" },
      { titulo: "Clube da Luta", ano: 1999, rating: null, status: "COMPLETED" }
    ]);
  });

  it("watchlist vira 'Quero ver'", () => {
    const csv = "Date,Name,Year,Letterboxd URI\n2024-01-01,Dune,2021,x";
    expect(linhasLetterboxd(csv, "watchlist")).toEqual([{ titulo: "Dune", ano: 2021, rating: null, status: "WANT" }]);
  });

  it("recusa arquivos que nao sao do Letterboxd", () => {
    expect(() => linhasLetterboxd("foo,bar\n1,2", "watched")).toThrow(/Letterboxd/);
  });

  it("arquivo vazio nao gera linhas", () => {
    expect(linhasLetterboxd("", "watched")).toEqual([]);
  });
});

describe("itensTrakt", () => {
  it("interpreta historico, avaliacoes e watchlist", () => {
    const itens = itensTrakt([
      { plays: 2, last_watched_at: "2024", movie: { title: "Matrix", ids: { tmdb: 603 } } },
      { rating: 8, type: "movie", movie: { title: "Up", ids: { tmdb: 14160 } } },
      { listed_at: "2024", type: "show", show: { title: "Dark", ids: { tmdb: 70523 } } },
      {
        last_watched_at: "2024",
        show: { title: "Lost", ids: { tmdb: 4607 } },
        seasons: [{ number: 1, episodes: [{ number: 1 }, { number: 2 }] }]
      }
    ]);

    expect(itens).toEqual([
      { tmdbId: 603, tipo: "MOVIE", titulo: "Matrix", status: "COMPLETED", rating: null, episodios: [] },
      { tmdbId: 14160, tipo: "MOVIE", titulo: "Up", status: "COMPLETED", rating: 4, episodios: [] },
      { tmdbId: 70523, tipo: "SERIES", titulo: "Dark", status: "WANT", rating: null, episodios: [] },
      {
        tmdbId: 4607,
        tipo: "SERIES",
        titulo: "Lost",
        status: "WATCHING",
        rating: null,
        episodios: [
          { season: 1, episode: 1 },
          { season: 1, episode: 2 }
        ]
      }
    ]);
  });

  it("ignora episodios avulsos e itens sem id do TMDB", () => {
    expect(
      itensTrakt([
        { type: "episode", rating: 9, show: { ids: { tmdb: 1 } } },
        { movie: { title: "Sem id", ids: { tmdb: null } } }
      ])
    ).toEqual([]);
  });

  it("recusa JSON que nao e lista", () => {
    expect(() => itensTrakt({ movies: [] })).toThrow(/lista/);
  });
});

describe("Steam", () => {
  it.each([
    ["76561197960287930", { tipo: "id", valor: "76561197960287930" }],
    ["https://steamcommunity.com/profiles/76561197960287930/", { tipo: "id", valor: "76561197960287930" }],
    ["https://steamcommunity.com/id/gabelogannewell", { tipo: "vanity", valor: "gabelogannewell" }],
    ["gabe_n", { tipo: "vanity", valor: "gabe_n" }]
  ])("interpreta %s", (entrada, esperado) => {
    expect(interpretarPerfilSteam(entrada)).toEqual(esperado);
  });

  it("recusa entradas invalidas", () => {
    expect(interpretarPerfilSteam("https://exemplo.com/a b")).toBeNull();
    expect(interpretarPerfilSteam("")).toBeNull();
  });

  it("ordena jogos por tempo jogado e respeita o limite", () => {
    const resposta = {
      response: {
        games: [
          { name: "A", playtime_forever: 10 },
          { name: "B", playtime_forever: 500 },
          { playtime_forever: 900 },
          { name: "C" }
        ]
      }
    };
    expect(jogosSteam(resposta, 2)).toEqual([
      { nome: "B", minutos: 500 },
      { nome: "A", minutos: 10 }
    ]);
    expect(jogosSteam({})).toEqual([]);
  });
});
