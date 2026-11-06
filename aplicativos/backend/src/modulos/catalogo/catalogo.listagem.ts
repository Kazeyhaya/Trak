import {
  chaveDeduplicacaoLivro,
  GeneroCatalogo,
  GENEROS_CATALOGO,
  IDIOMAS_DORAMA,
  MAPA_GENEROS,
  mapearOpenLibrary,
  mapearRawg,
  mapearTmdb,
  OpenLibraryDoc,
  PAISES_DORAMA,
  PAISES_NOVELA,
  RawgItem,
  TMDB_GENERO_ANIMACAO,
  TMDB_GENERO_NOVELA,
  TMDB_GENERO_REALITY,
  TMDB_GENERO_TALK,
  TmdbItem
} from "./catalogo.fontes";
import { ClienteCatalogo } from "./catalogo.http";
import { ItemCatalogo } from "./catalogo.types";
import { GoogleBooksService } from "./google-books.service";
import { HardcoverService } from "./hardcover.service";
import { IgdbService } from "./igdb.service";

type FiltroTipo = "movie" | "series" | "game" | "book" | "anime" | "novela" | "dorama" | "manga" | "hq" | "quadrinhos";

const LIMITE_POR_FONTE = 20;

// "AAAA-MM-DD,AAAA-MM-DD" do ultimo ano, no formato do filtro `dates` do RAWG.
function ultimos12Meses(hoje = new Date()) {
  const dia = (d: Date) => d.toISOString().slice(0, 10);
  const inicio = new Date(hoje);
  inicio.setUTCFullYear(hoje.getUTCFullYear() - 1);
  return `${dia(inicio)},${dia(hoje)}`;
}

// Busca e vitrine do catalogo: junta resultados de todas as fontes por tipo e genero.
export class ListagemCatalogo {
  constructor(
    private readonly http: ClienteCatalogo,
    private readonly googleBooksService: GoogleBooksService,
    private readonly hardcoverService: HardcoverService,
    private readonly igdbService: IgdbService
  ) {}

  async listar(query?: string, tipo?: string, genero?: string, lang?: string) {
    const idioma = lang === "en-US" ? "en-US" : "pt-BR";
    // Fontes sem chave configurada simplesmente nao retornam itens.
    const busca = query?.trim().slice(0, 50) || undefined;
    const filtro = (
      ["movie", "series", "game", "book", "anime", "novela", "dorama", "manga", "hq", "quadrinhos"] as const
    ).find((t) => t === tipo);
    const generoValido = GENEROS_CATALOGO.find((g) => g === genero?.toLowerCase());

    // Animes e animacoes: series e filmes do genero Animacao, mais populares primeiro.
    if (filtro === "anime") {
      const [series, movies] = await Promise.all([
        this.listarAnimacoes("tv", busca, generoValido, idioma),
        this.listarAnimacoes("movie", busca, generoValido, idioma)
      ]);
      return [...series, ...movies];
    }

    if (filtro === "novela") {
      return this.listarNovelas(busca, generoValido, idioma);
    }

    if (filtro === "dorama") {
      return this.listarDoramas(busca, generoValido, idioma);
    }

    if (filtro === "manga") {
      return this.listarLivros(busca, "manga");
    }

    if (filtro === "hq" || filtro === "quadrinhos") {
      return this.listarLivros(busca, "quadrinhos");
    }

    const incluir = (t: FiltroTipo) => !filtro || filtro === t;

    const [movies, series, games, books] = await Promise.all([
      incluir("movie") ? this.listarTmdb("movie", busca, generoValido, filtro === "movie", false, idioma) : [],
      incluir("series") ? this.listarTmdb("tv", busca, generoValido, true, filtro === "series", idioma) : [],
      incluir("game") ? this.listarJogos(busca, generoValido) : [],
      incluir("book") ? this.listarLivros(busca, generoValido) : []
    ]);

    return [...movies, ...series, ...games, ...books];
  }

  private async listarTmdb(
    mediaType: "movie" | "tv",
    query?: string,
    genero?: GeneroCatalogo,
    excluirAnimacao = false,
    forcarDiscover = false,
    idioma = "pt-BR"
  ): Promise<ItemCatalogo[]> {
    const type = mediaType === "movie" ? "MOVIE" : "SERIES";
    const tmdbGenre = genero ? (mediaType === "movie" ? MAPA_GENEROS[genero].tmdbMovie : MAPA_GENEROS[genero].tmdbTv) : undefined;
    if (genero && !tmdbGenre) {
      return [];
    }

    const discoverParams: Record<string, string> = {
      sort_by: "popularity.desc"
    };
    if (tmdbGenre) {
      discoverParams.with_genres = String(tmdbGenre);
    }
    if (excluirAnimacao) {
      discoverParams.without_genres = String(TMDB_GENERO_ANIMACAO);
    }

    const data = query
      ? await this.http.tmdb<{ results: TmdbItem[] }>(`/search/${mediaType}`, { query, language: idioma })
      : tmdbGenre || forcarDiscover
        ? await this.http.tmdb<{ results: TmdbItem[] }>(`/discover/${mediaType}`, { ...discoverParams, language: idioma })
        : await this.http.tmdb<{ results: TmdbItem[] }>(`/trending/${mediaType}/week`, { language: idioma });

    return (data?.results ?? [])
      .filter((item) => {
        if (excluirAnimacao && item.genre_ids?.includes(TMDB_GENERO_ANIMACAO)) {
          return false;
        }
        return !query || !tmdbGenre || item.genre_ids?.includes(tmdbGenre);
      })
      .slice(0, LIMITE_POR_FONTE)
      .map((item) => mapearTmdb(item, type));
  }

  private async listarAnimacoes(
    mediaType: "movie" | "tv",
    query?: string,
    genero?: GeneroCatalogo,
    idioma = "pt-BR"
  ): Promise<ItemCatalogo[]> {
    const type = mediaType === "movie" ? "MOVIE" : "SERIES";
    const tmdbGenre = genero ? (mediaType === "movie" ? MAPA_GENEROS[genero].tmdbMovie : MAPA_GENEROS[genero].tmdbTv) : undefined;
    if (genero && !tmdbGenre) {
      return [];
    }
    const genresParam = tmdbGenre ? `${TMDB_GENERO_ANIMACAO},${tmdbGenre}` : String(TMDB_GENERO_ANIMACAO);
    // A busca por texto do TMDB nao filtra genero, entao o filtro e feito nos resultados.
    const data = query
      ? await this.http.tmdb<{ results: TmdbItem[] }>(`/search/${mediaType}`, { query, language: idioma })
      : await this.http.tmdb<{ results: TmdbItem[] }>(`/discover/${mediaType}`, {
          with_genres: genresParam,
          sort_by: "popularity.desc",
          language: idioma
        });

    return (data?.results ?? [])
      .filter(
        (item) =>
          !query ||
          (item.genre_ids?.includes(TMDB_GENERO_ANIMACAO) && (!tmdbGenre || item.genre_ids?.includes(tmdbGenre)))
      )
      .slice(0, LIMITE_POR_FONTE)
      .map((item) => mapearTmdb(item, type));
  }

  private async listarNovelas(query?: string, genero?: GeneroCatalogo, idioma = "pt-BR"): Promise<ItemCatalogo[]> {
    const tmdbGenre = genero ? MAPA_GENEROS[genero].tmdbTv : undefined;
    if (genero && !tmdbGenre) {
      return [];
    }

    if (query) {
      const data = await this.http.tmdb<{ results: TmdbItem[] }>("/search/tv", { query, language: idioma });
      const paisesSet = new Set<string>(PAISES_NOVELA);
      return (data?.results ?? [])
        .filter((item) => {
          if (item.genre_ids?.includes(TMDB_GENERO_ANIMACAO)) {
            return false;
          }
          if (tmdbGenre && !item.genre_ids?.includes(tmdbGenre)) {
            return false;
          }
          const ehSoap = item.genre_ids?.includes(TMDB_GENERO_NOVELA);
          const ehPaisNovela =
            item.origin_country?.some((c) => paisesSet.has(c)) && item.genre_ids?.includes(18);
          return Boolean(ehSoap || ehPaisNovela);
        })
        .slice(0, LIMITE_POR_FONTE)
        .map((item) => mapearTmdb(item, "SERIES", "NOVELA"));
    }

    const soapGenres = tmdbGenre
      ? `${TMDB_GENERO_NOVELA},${tmdbGenre}`
      : String(TMDB_GENERO_NOVELA);
    const dramaGenres = tmdbGenre ? `18,${tmdbGenre}` : "18";
    const without = `${TMDB_GENERO_ANIMACAO},${TMDB_GENERO_REALITY},${TMDB_GENERO_TALK}`;

    const [porGeneroNovela, porPaises] = await Promise.all([
      this.http.tmdb<{ results: TmdbItem[] }>("/discover/tv", {
        with_genres: soapGenres,
        without_genres: without,
        sort_by: "popularity.desc",
        language: idioma
      }),
      this.http.tmdb<{ results: TmdbItem[] }>("/discover/tv", {
        with_origin_country: PAISES_NOVELA.join("|"),
        with_genres: dramaGenres,
        without_genres: without,
        sort_by: "popularity.desc",
        language: idioma
      })
    ]);

    const vistos = new Set<number>();
    const combinados: TmdbItem[] = [];
    for (const item of [...(porGeneroNovela?.results ?? []), ...(porPaises?.results ?? [])]) {
      if (!vistos.has(item.id) && !item.genre_ids?.includes(TMDB_GENERO_ANIMACAO)) {
        vistos.add(item.id);
        combinados.push(item);
      }
    }

    return combinados.slice(0, LIMITE_POR_FONTE).map((item) => mapearTmdb(item, "SERIES", "NOVELA"));
  }

  private async listarDoramas(query?: string, genero?: GeneroCatalogo, idioma = "pt-BR"): Promise<ItemCatalogo[]> {
    const tmdbGenre = genero ? MAPA_GENEROS[genero].tmdbTv : undefined;
    if (genero && !tmdbGenre) {
      return [];
    }

    if (query) {
      const data = await this.http.tmdb<{ results: TmdbItem[] }>("/search/tv", { query, language: idioma });
      const paisesSet = new Set<string>(PAISES_DORAMA);
      const idiomasSet = new Set<string>(IDIOMAS_DORAMA);
      return (data?.results ?? [])
        .filter((item) => {
          if (item.genre_ids?.includes(TMDB_GENERO_ANIMACAO)) {
            return false;
          }
          if (tmdbGenre && !item.genre_ids?.includes(tmdbGenre)) {
            return false;
          }
          const ehPaisAsiatico = item.origin_country?.some((c) => paisesSet.has(c));
          const ehIdiomaAsiatico = item.original_language ? idiomasSet.has(item.original_language) : false;
          return Boolean(ehPaisAsiatico || ehIdiomaAsiatico);
        })
        .slice(0, LIMITE_POR_FONTE)
        .map((item) => mapearTmdb(item, "SERIES", "DORAMA"));
    }

    const withGenres = tmdbGenre ? String(tmdbGenre) : "18";
    const without = `${TMDB_GENERO_ANIMACAO},${TMDB_GENERO_REALITY},${TMDB_GENERO_TALK}`;

    const data = await this.http.tmdb<{ results: TmdbItem[] }>("/discover/tv", {
      with_origin_country: PAISES_DORAMA.join("|"),
      with_genres: withGenres,
      without_genres: without,
      sort_by: "popularity.desc",
      language: idioma
    });

    return (data?.results ?? [])
      .filter((item) => !item.genre_ids?.includes(TMDB_GENERO_ANIMACAO))
      .slice(0, LIMITE_POR_FONTE)
      .map((item) => mapearTmdb(item, "SERIES", "DORAMA"));
  }

  // Jogos. Sem busca, o que esta em alta agora: a popularidade atual da IGDB; sem ela, os
  // lancamentos dos ultimos 12 meses mais adicionados no RAWG (tambem com genero).
  private async listarJogos(query?: string, genero?: GeneroCatalogo): Promise<ItemCatalogo[]> {
    if (!query && !genero && this.igdbService.isConfigurado()) {
      const emAlta = await this.igdbService.emAlta(LIMITE_POR_FONTE);
      if (emAlta.length > 0) {
        return emAlta;
      }
    }

    const rawgGenre = genero ? MAPA_GENEROS[genero].rawg : undefined;
    if (genero && !rawgGenre) {
      return [];
    }
    const params: Record<string, string> = query
      ? { page_size: String(LIMITE_POR_FONTE), search: query }
      : { page_size: String(LIMITE_POR_FONTE), ordering: "-added", dates: ultimos12Meses() };
    if (rawgGenre) {
      params.genres = rawgGenre;
    }

    const data = await this.http.rawg<{ results: RawgItem[] }>("/games", params);

    // RAWG fora do ar ou sem chave (null, diferente de lista vazia): a IGDB cobre a busca e a
    // vitrine. Filtro por genero fica de fora, porque a IGDB nao usa os mesmos generos.
    if (data === null) {
      if (genero || !this.igdbService.isConfigurado()) {
        return [];
      }
      return query ? this.igdbService.buscar(query, LIMITE_POR_FONTE) : this.igdbService.emAlta(LIMITE_POR_FONTE);
    }

    // A listagem do RAWG nao traz descricao. Se IGDB ou SteamGridDB estiverem ativas, busca capas verticais 2:3 nítidas.
    const brutos = (data?.results ?? []).slice(0, LIMITE_POR_FONTE).map((item) => ({ ...mapearRawg(item), synopsis: null }));
    if (!this.igdbService.isConfigurado() && !process.env.STEAMGRIDDB_API_KEY?.trim()) {
      return brutos;
    }
    return Promise.all(
      brutos.map(async (jogo) => ({
        ...jogo,
        coverUrl: (await this.http.capaJogoVertical(jogo.title)) ?? jogo.coverUrl
      }))
    );
  }

  private mesclarLivros(
    hardcover: ItemCatalogo[],
    gbooks: ItemCatalogo[],
    openLibrary: ItemCatalogo[],
    limite = LIMITE_POR_FONTE
  ): ItemCatalogo[] {
    const mapaTitulos = new Map<string, ItemCatalogo>();
    const ordem: ItemCatalogo[] = [];

    const registrarOuFundir = (item: ItemCatalogo) => {
      const chave = chaveDeduplicacaoLivro(item.title);
      if (!chave) {
        return;
      }
      const existente = mapaTitulos.get(chave);
      if (!existente) {
        const clone = { ...item };
        mapaTitulos.set(chave, clone);
        ordem.push(clone);
        return;
      }

      // Funde dados: prioriza sinopse em PT-BR do Google Books ou a mais completa disponivel
      if (!existente.synopsis && item.synopsis) {
        existente.synopsis = item.synopsis;
      } else if (item.source === "gbooks" && item.synopsis && item.synopsis.length >= 40 && existente.source !== "gbooks") {
        existente.synopsis = item.synopsis;
      } else if (existente.synopsis && item.synopsis && existente.synopsis.length < 50 && item.synopsis.length > 50) {
        existente.synopsis = item.synopsis;
      }

      // Preserva melhor capa: prioriza capas oficiais da Hardcover (arte de editora em alta resolução)
      // e depois Google Books sobre capas da Open Library
      if (!existente.coverUrl && item.coverUrl) {
        existente.coverUrl = item.coverUrl;
      } else if (
        item.source === "hardcover" &&
        item.coverUrl &&
        !existente.coverUrl?.includes("assets.hardcover.app")
      ) {
        existente.coverUrl = item.coverUrl;
      } else if (
        item.source === "gbooks" &&
        item.coverUrl &&
        existente.coverUrl?.includes("covers.openlibrary.org")
      ) {
        existente.coverUrl = item.coverUrl;
      }

      if (!existente.releaseYear && item.releaseYear) {
        existente.releaseYear = item.releaseYear;
      }
      if (!existente.pageCount && item.pageCount) {
        existente.pageCount = item.pageCount;
      }
    };

    // Intercala as tres fontes para equilibrar o catálogo entre titulos enriquecidos, nacionais e internacionais
    const maxLen = Math.max(hardcover.length, gbooks.length, openLibrary.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < hardcover.length) {
        registrarOuFundir(hardcover[i]);
      }
      if (i < gbooks.length) {
        registrarOuFundir(gbooks[i]);
      }
      if (i < openLibrary.length) {
        registrarOuFundir(openLibrary[i]);
      }
    }

    // Itens com capa primeiro.
    return ordem
      .sort((a, b) => (b.coverUrl ? 1 : 0) - (a.coverUrl ? 1 : 0))
      .slice(0, limite);
  }

  private async listarLivros(query?: string, genero?: GeneroCatalogo): Promise<ItemCatalogo[]> {
    const subject = genero ? MAPA_GENEROS[genero].openLibrary : undefined;
    if (genero && !subject) {
      return [];
    }

    const ehManga = genero === "manga";
    const ehHq = genero === "quadrinhos" || genero === "hq";

    // 1. Busca com termo digitado pelo usuário: consulta as 3 APIs em paralelo (Hardcover, Google Books, OpenLibrary)
    if (query) {
      const gbooksTerm = ehManga ? `${query} manga` : (ehHq ? `${query} comics` : (subject ? `${query} subject:${subject}` : query));
      const hcTerm = ehManga ? `${query} manga` : (ehHq ? `${query} graphic novel` : query);
      const olTerm = ehManga ? `${query} manga` : (ehHq ? `${query} comic books` : (subject ? `${query} subject:${subject}` : query));

      const [hardcoverResult, gbooksResult, openLibResult] = await Promise.allSettled([
        this.hardcoverService.buscar(hcTerm, LIMITE_POR_FONTE),
        this.googleBooksService.buscar(gbooksTerm, LIMITE_POR_FONTE),
        this.http.openLibrary<{ docs?: OpenLibraryDoc[] }>("/search.json", {
          q: olTerm,
          limit: String(LIMITE_POR_FONTE),
          fields: "key,title,cover_i,first_publish_year,description"
        })
      ]);

      const hardcoverItens = hardcoverResult.status === "fulfilled" ? hardcoverResult.value : [];
      const gbooksItens = gbooksResult.status === "fulfilled" ? gbooksResult.value : [];
      const openLibItens =
        openLibResult.status === "fulfilled"
          ? (openLibResult.value?.docs ?? []).slice(0, LIMITE_POR_FONTE).map(mapearOpenLibrary)
          : [];

      return this.mesclarLivros(hardcoverItens, gbooksItens, openLibItens, LIMITE_POR_FONTE);
    }

    // 2. Genero (inclui manga e HQ) sem termo: o que esta em alta nele na Open Library.
    if (subject) {
      const emAlta = await this.http.openLibrary<{ docs?: OpenLibraryDoc[] }>("/search.json", {
        subject,
        sort: "trending",
        limit: String(LIMITE_POR_FONTE),
        fields: "key,title,cover_i,first_publish_year"
      });
      return this.mesclarLivros([], [], (emAlta?.docs ?? []).map(mapearOpenLibrary), LIMITE_POR_FONTE);
    }

    // 3. Vitrine da aba Livros: em alta na Hardcover e tendencias da semana na Open Library.
    const [hardcoverEmAlta, openLibEmAlta] = await Promise.allSettled([
      this.hardcoverService.emAlta(LIMITE_POR_FONTE),
      this.http.openLibrary<{ works?: OpenLibraryDoc[] }>("/trending/weekly.json", {
        limit: String(LIMITE_POR_FONTE)
      })
    ]);

    const hardcoverItens = hardcoverEmAlta.status === "fulfilled" ? hardcoverEmAlta.value : [];
    const openLibItens =
      openLibEmAlta.status === "fulfilled"
        ? (openLibEmAlta.value?.works ?? []).slice(0, LIMITE_POR_FONTE).map(mapearOpenLibrary)
        : [];

    return this.mesclarLivros(hardcoverItens, [], openLibItens, LIMITE_POR_FONTE);
  }
}
