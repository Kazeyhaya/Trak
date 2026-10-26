import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit
} from "@nestjs/common";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import {
  GeneroCatalogo,
  GENEROS_CATALOGO,
  IDIOMAS_DORAMA,
  MAPA_GENEROS,
  mapearOpenLibrary,
  mapearRawg,
  mapearTmdb,
  MINUTOS_POR_PAGINA,
  normalizarTitulo,
  OpenLibraryDoc,
  PAISES_DORAMA,
  PAISES_NOVELA,
  parsearId,
  RawgItem,
  TMDB_GENERO_ANIMACAO,
  TMDB_GENERO_NOVELA,
  TMDB_GENERO_REALITY,
  TMDB_GENERO_TALK,
  TmdbItem,
  urlLojaJogo,
  urlProvedorStreaming
} from "./catalogo.fontes";
import { Episodio, ExtrasCatalogo, ItemCatalogo, NotaExterna, Novidade, ProvedorOndeAssistir, Temporada } from "./catalogo.types";

type TmdbTv = TmdbItem & {
  number_of_episodes?: number;
  seasons?: Array<{ season_number: number; name: string; episode_count: number; air_date: string | null }>;
  next_episode_to_air?: TmdbEpisodio | null;
  last_episode_to_air?: TmdbEpisodio | null;
};

type TmdbEpisodio = {
  episode_number: number;
  season_number: number;
  name: string;
  air_date: string | null;
  overview?: string;
  runtime?: number | null;
};

type FiltroTipo = "movie" | "series" | "game" | "book" | "anime" | "novela" | "dorama";

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 1000;
const FETCH_TIMEOUT_MS = 8000;
const TMDB = "https://api.themoviedb.org/3";
const RAWG = "https://api.rawg.io/api";
const OPEN_LIBRARY = "https://openlibrary.org";
const OMDB = "https://www.omdbapi.com";
const STEAMGRIDDB = "https://www.steamgriddb.com/api/v2";
const DIA_MS = 24 * 60 * 60 * 1000;
const LIMITE_POR_FONTE = 20;

function dicaDeErro(status: number) {
  if (status === 401 || status === 403) {
    return " (chave de API invalida; no TMDB use a \"API Key\" v3, nao o token de leitura v4)";
  }
  return status === 429 ? " (limite de requisicoes da API atingido)" : "";
}

@Injectable()
export class CatalogoService implements OnModuleInit {
  private readonly logger = new Logger(CatalogoService.name);
  private readonly cache = new Map<string, { expiresAt: number; value: unknown }>();

  constructor(private readonly supabaseService: SupabaseService) {}

  private async comCache<T>(chave: string, carregar: () => Promise<T>): Promise<T> {
    const atual = this.cache.get(chave);
    if (atual && atual.expiresAt > Date.now()) {
      return atual.value as T;
    }

    const value = await carregar();
    // Falhas (null) nao sao guardadas, para a proxima chamada tentar de novo.
    if (value !== null) {
      if (this.cache.size >= CACHE_MAX_ENTRIES) {
        this.cache.delete(this.cache.keys().next().value as string);
      }
      this.cache.set(chave, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    }
    return value;
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "User-Agent": "Trak (https://github.com/Kazeyhaya/Trak)" }
      });
      if (!response.ok) {
        // 404 e normal (item inexistente); os demais indicam chave invalida, limite ou queda.
        if (response.status !== 404) {
          this.logger.warn(`${new URL(url).host} respondeu ${response.status}${dicaDeErro(response.status)}`);
        }
        return null;
      }
      return (await response.json()) as T;
    } catch (error) {
      this.logger.warn(`Falha ao acessar ${new URL(url).host}: ${(error as Error).message}`);
      return null;
    }
  }

  // Avisa no log, ao subir a API, quais fontes ficarao sem resultados.
  onModuleInit() {
    for (const [variavel, fonte] of [
      ["TMDB_API_KEY", "filmes e series (TMDB)"],
      ["RAWG_API_KEY", "jogos (RAWG)"]
    ] as const) {
      if (!process.env[variavel]?.trim()) {
        this.logger.warn(`${variavel} nao configurada: o catalogo ficara sem ${fonte}.`);
      }
    }
  }

  private tmdb<T>(path: string, params: Record<string, string> = {}) {
    const apiKey = process.env.TMDB_API_KEY?.trim();
    if (!apiKey) {
      return Promise.resolve(null);
    }
    const language = params.language || "pt-BR";
    const query = new URLSearchParams({ api_key: apiKey, language, ...params });
    return this.comCache(`tmdb:${language}:${path}?${new URLSearchParams(params)}`, () =>
      this.fetchJson<T>(`${TMDB}${path}?${query}`)
    );
  }

  private rawg<T>(path: string, params: Record<string, string> = {}) {
    const apiKey = process.env.RAWG_API_KEY?.trim();
    if (!apiKey) {
      return Promise.resolve(null);
    }
    const query = new URLSearchParams({ key: apiKey, ...params });
    return this.comCache(`rawg:${path}?${new URLSearchParams(params)}`, () =>
      this.fetchJson<T>(`${RAWG}${path}?${query}`)
    );
  }

  private openLibrary<T>(path: string, params: Record<string, string> = {}) {
    const query = new URLSearchParams(params);
    return this.comCache(`ol:${path}?${query}`, () => this.fetchJson<T>(`${OPEN_LIBRARY}${path}?${query}`));
  }

  private omdb<T>(params: Record<string, string>) {
    const apiKey = process.env.OMDB_API_KEY?.trim();
    if (!apiKey) {
      return Promise.resolve(null);
    }
    const query = new URLSearchParams({ apikey: apiKey, ...params });
    return this.comCache(`omdb:${new URLSearchParams(params)}`, () => this.fetchJson<T>(`${OMDB}/?${query}`));
  }

  private async capaSteamGridDb(nomeJogo: string): Promise<string | null> {
    const apiKey = process.env.STEAMGRIDDB_API_KEY?.trim();
    if (!apiKey || !nomeJogo.trim()) {
      return null;
    }
    const chave = `sgdb:${normalizarTitulo(nomeJogo)}`;
    return this.comCache(chave, async () => {
      try {
        const headers = {
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "Trak (https://github.com/Kazeyhaya/Trak)"
        };
        const buscaRes = await fetch(
          `${STEAMGRIDDB}/search/autocomplete/${encodeURIComponent(nomeJogo.trim())}`,
          { signal: AbortSignal.timeout(3500), headers }
        );
        if (!buscaRes.ok) {
          return null;
        }
        const busca = (await buscaRes.json()) as { data?: Array<{ id: number; name: string }> };
        const alvo = normalizarTitulo(nomeJogo);
        const escolhido =
          busca.data?.find((g) => normalizarTitulo(g.name) === alvo) ?? busca.data?.[0];
        if (!escolhido?.id) {
          return null;
        }

        const gridsRes = await fetch(
          `${STEAMGRIDDB}/grids/game/${escolhido.id}?dimensions=600x900&types=static`,
          { signal: AbortSignal.timeout(3500), headers }
        );
        if (!gridsRes.ok) {
          return null;
        }
        const grids = (await gridsRes.json()) as { data?: Array<{ url?: string }> };
        return grids.data?.[0]?.url ?? null;
      } catch {
        return null;
      }
    });
  }

  // Consulta a Google Books API com langRestrict=pt para sinopses ricas em portugues.
  private async googleBooksBuscarSinopse(titulo: string, idioma = "pt-BR"): Promise<string | null> {
    const cleanTitle = titulo.trim();
    if (!cleanTitle) {
      return null;
    }
    const lang = idioma === "en-US" ? "en" : "pt";
    const chave = `gbooks:synopsis:${lang}:${normalizarTitulo(cleanTitle)}`;
    return this.comCache(chave, async () => {
      try {
        const query = new URLSearchParams({
          q: `intitle:${cleanTitle}`,
          langRestrict: lang,
          printType: "books",
          maxResults: "1"
        });
        const res = await this.fetchJson<{
          items?: Array<{
            volumeInfo?: {
              description?: string;
            };
          }>;
        }>(`https://www.googleapis.com/books/v1/volumes?${query}`);
        const desc = res?.items?.[0]?.volumeInfo?.description?.trim();
        if (!desc) {
          return null;
        }
        return desc.replace(/<[^>]+>/g, "").trim() || null;
      } catch {
        return null;
      }
    });
  }

  // Listagem e busca

  async listar(query?: string, tipo?: string, genero?: string, lang?: string) {
    const idioma = lang === "en-US" ? "en-US" : "pt-BR";
    // Fontes sem chave configurada simplesmente nao retornam itens.
    const busca = query?.trim().slice(0, 50) || undefined;
    const filtro = (["movie", "series", "game", "book", "anime", "novela", "dorama"] as const).find(
      (t) => t === tipo
    );
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

    const incluir = (t: FiltroTipo) => !filtro || filtro === t;

    const [movies, series, games, books] = await Promise.all([
      incluir("movie") ? this.listarTmdb("movie", busca, generoValido, filtro === "movie", false, idioma) : [],
      incluir("series") ? this.listarTmdb("tv", busca, generoValido, true, filtro === "series", idioma) : [],
      incluir("game") ? this.listarRawg(busca, generoValido) : [],
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
      ? await this.tmdb<{ results: TmdbItem[] }>(`/search/${mediaType}`, { query, language: idioma })
      : tmdbGenre || forcarDiscover
        ? await this.tmdb<{ results: TmdbItem[] }>(`/discover/${mediaType}`, { ...discoverParams, language: idioma })
        : await this.tmdb<{ results: TmdbItem[] }>(`/trending/${mediaType}/week`, { language: idioma });

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
      ? await this.tmdb<{ results: TmdbItem[] }>(`/search/${mediaType}`, { query, language: idioma })
      : await this.tmdb<{ results: TmdbItem[] }>(`/discover/${mediaType}`, {
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
      const data = await this.tmdb<{ results: TmdbItem[] }>("/search/tv", { query, language: idioma });
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
      this.tmdb<{ results: TmdbItem[] }>("/discover/tv", {
        with_genres: soapGenres,
        without_genres: without,
        sort_by: "popularity.desc",
        language: idioma
      }),
      this.tmdb<{ results: TmdbItem[] }>("/discover/tv", {
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
      const data = await this.tmdb<{ results: TmdbItem[] }>("/search/tv", { query, language: idioma });
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

    const data = await this.tmdb<{ results: TmdbItem[] }>("/discover/tv", {
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

  private async listarRawg(query?: string, genero?: GeneroCatalogo): Promise<ItemCatalogo[]> {
    const rawgGenre = genero ? MAPA_GENEROS[genero].rawg : undefined;
    if (genero && !rawgGenre) {
      return [];
    }
    const params: Record<string, string> = query
      ? { page_size: String(LIMITE_POR_FONTE), search: query }
      : { page_size: String(LIMITE_POR_FONTE), ordering: "-added" };
    if (rawgGenre) {
      params.genres = rawgGenre;
    }

    const data = await this.rawg<{ results: RawgItem[] }>("/games", params);

    // A listagem do RAWG nao traz descricao. Se STEAMGRIDDB_API_KEY estiver ativa, busca capas verticais 2:3.
    const brutos = (data?.results ?? []).slice(0, LIMITE_POR_FONTE).map((item) => ({ ...mapearRawg(item), synopsis: null }));
    if (!process.env.STEAMGRIDDB_API_KEY?.trim()) {
      return brutos;
    }
    return Promise.all(
      brutos.map(async (jogo) => ({
        ...jogo,
        coverUrl: (await this.capaSteamGridDb(jogo.title)) ?? jogo.coverUrl
      }))
    );
  }

  private async listarLivros(query?: string, genero?: GeneroCatalogo): Promise<ItemCatalogo[]> {
    const subject = genero ? MAPA_GENEROS[genero].openLibrary : undefined;
    if (genero && !subject) {
      return [];
    }

    if (query) {
      const q = subject ? `${query} subject:${subject}` : query;
      const data = await this.openLibrary<{ docs: OpenLibraryDoc[] }>("/search.json", {
        q,
        limit: String(LIMITE_POR_FONTE),
        fields: "key,title,cover_i,first_publish_year"
      });
      return (data?.docs ?? []).slice(0, LIMITE_POR_FONTE).map(mapearOpenLibrary);
    }

    if (subject) {
      const data = await this.openLibrary<{ works: OpenLibraryDoc[] }>(`/subjects/${subject}.json`, {
        limit: String(LIMITE_POR_FONTE)
      });
      return (data?.works ?? []).slice(0, LIMITE_POR_FONTE).map(mapearOpenLibrary);
    }

    const data = await this.openLibrary<{ works: OpenLibraryDoc[] }>("/trending/weekly.json", {
      limit: String(LIMITE_POR_FONTE)
    });
    return (data?.works ?? []).slice(0, LIMITE_POR_FONTE).map(mapearOpenLibrary);
  }

  async buscarPorId(id: string, lang?: string): Promise<ItemCatalogo> {
    const item = await this.carregarItem(id, lang);

    if (!item) {
      throw new NotFoundException("Item nao encontrado.");
    }

    return item;
  }

  private async mediaTrak(mediaItemId: string) {
    try {
      const { data } = await this.supabaseService
        .getClient()
        .from("UserMedia")
        .select("personalRating")
        .eq("mediaItemId", mediaItemId);

      const notas = (data ?? []).flatMap((r) =>
        typeof r.personalRating === "number" && r.personalRating > 0 ? [r.personalRating] : []
      );
      if (notas.length === 0) {
        return { average: null, count: 0 };
      }
      const media = Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10;
      return { average: media, count: notas.length };
    } catch {
      return { average: null, count: 0 };
    }
  }

  private async notasOmdb(imdbId: string): Promise<NotaExterna[]> {
    const data = await this.omdb<{
      imdbRating?: string;
      Metascore?: string;
      Ratings?: Array<{ Source: string; Value: string }>;
    }>({ i: imdbId });

    if (!data) {
      return [];
    }

    const notas: NotaExterna[] = [];
    if (data.imdbRating && data.imdbRating !== "N/A") {
      notas.push({ source: "IMDb", value: `${data.imdbRating}/10` });
    }
    const rt = data.Ratings?.find((r) => r.Source === "Rotten Tomatoes");
    if (rt?.Value && rt.Value !== "N/A") {
      notas.push({ source: "Rotten Tomatoes", value: rt.Value });
    }
    const mc = data.Ratings?.find((r) => r.Source === "Metacritic")?.Value;
    if (mc && mc !== "N/A") {
      notas.push({ source: "Metacritic", value: mc });
    } else if (data.Metascore && data.Metascore !== "N/A") {
      notas.push({ source: "Metacritic", value: `${data.Metascore}/100` });
    }
    return notas;
  }

  async extras(id: string): Promise<ExtrasCatalogo> {
    const parsed = parsearId(id);
    if (!parsed) {
      throw new NotFoundException("Item nao encontrado.");
    }

    const trakPromise = this.mediaTrak(id);

    if (parsed.source === "tmdb") {
      const mediaPath = parsed.type === "MOVIE" ? "movie" : "tv";
      const [item, providersData, externalIds] = await Promise.all([
        this.tmdb<TmdbItem>(`/${mediaPath}/${parsed.externalId}`),
        this.tmdb<{
          results?: Record<
            string,
            {
              link?: string;
              flatrate?: Array<{ provider_name: string }>;
              ads?: Array<{ provider_name: string }>;
              free?: Array<{ provider_name: string }>;
              rent?: Array<{ provider_name: string }>;
              buy?: Array<{ provider_name: string }>;
            }
          >;
        }>(`/${mediaPath}/${parsed.externalId}/watch/providers`),
        parsed.type === "SERIES"
          ? this.tmdb<{ imdb_id?: string | null }>(`/tv/${parsed.externalId}/external_ids`)
          : Promise.resolve(null)
      ]);

      const imdbId = item?.imdb_id ?? externalIds?.imdb_id ?? null;
      const [omdbRatings, trakRating] = await Promise.all([
        imdbId ? this.notasOmdb(imdbId) : Promise.resolve([]),
        trakPromise
      ]);

      const externalRatings: NotaExterna[] = [...omdbRatings];
      if (item?.vote_average && item.vote_average > 0) {
        externalRatings.push({
          source: "TMDB",
          value: `${item.vote_average.toFixed(1)}/10`
        });
      }

      const br = providersData?.results?.BR ?? providersData?.results?.US;
      const tituloMidia = item?.title ?? item?.name ?? "";
      const vistos = new Set<string>();
      const watchProviders: ProvedorOndeAssistir[] = [];
      const adicionar = (lista: Array<{ provider_name: string }> | undefined, category: ProvedorOndeAssistir["category"]) => {
        for (const p of lista ?? []) {
          if (!vistos.has(p.provider_name)) {
            vistos.add(p.provider_name);
            watchProviders.push({
              name: p.provider_name,
              category,
              url: urlProvedorStreaming(p.provider_name, tituloMidia, br?.link ?? null)
            });
          }
        }
      };
      adicionar(br?.flatrate, "STREAMING");
      adicionar(br?.free, "STREAMING");
      adicionar(br?.ads, "STREAMING");
      adicionar(br?.rent, "RENT");
      adicionar(br?.buy, "BUY");

      return {
        genres: (item?.genres ?? []).map((g) => g.name),
        watchProviders,
        watchLink: watchProviders[0]?.url ?? br?.link ?? null,
        trakRating,
        externalRatings
      };
    }

    if (parsed.source === "rawg") {
      const [jogo, lojasData, trakRating] = await Promise.all([
        this.rawg<RawgItem>(`/games/${parsed.externalId}`),
        this.rawg<{ results?: Array<{ url?: string; store_id?: number }> }>(`/games/${parsed.externalId}/stores`),
        trakPromise
      ]);

      const externalRatings: NotaExterna[] = [];
      if (jogo?.metacritic) {
        externalRatings.push({ source: "Metacritic", value: `${jogo.metacritic}/100` });
      }
      if (jogo?.rating && jogo.rating > 0) {
        externalRatings.push({ source: "RAWG", value: `${jogo.rating.toFixed(1)}/5` });
      }

      const urlPorStoreId = new Map<number, string>();
      for (const s of lojasData?.results ?? []) {
        if (s.store_id && s.url) {
          urlPorStoreId.set(s.store_id, s.url);
        }
      }

      const tituloJogo = jogo?.name ?? "";
      const watchProviders: ProvedorOndeAssistir[] = (jogo?.stores ?? [])
        .filter((s) => s.store?.name)
        .map((s) => {
          const directUrl = (s.store?.id ? urlPorStoreId.get(s.store.id) : undefined) || s.url || null;
          return {
            name: s.store!.name,
            category: "STORE" as const,
            url: urlLojaJogo(s.store!.name, tituloJogo, directUrl, s.store?.domain)
          };
        });

      return {
        genres: (jogo?.genres ?? []).map((g) => g.name),
        watchProviders,
        watchLink: watchProviders[0]?.url ?? null,
        trakRating,
        externalRatings
      };
    }

    const [livro, ratingsData, trakRating] = await Promise.all([
      this.openLibrary<OpenLibraryDoc>(`/works/${parsed.externalId}.json`),
      this.openLibrary<{ summary?: { average?: number; count?: number } }>(`/works/${parsed.externalId}/ratings.json`),
      trakPromise
    ]);

    const externalRatings: NotaExterna[] = [];
    const olMedia = ratingsData?.summary?.average ?? livro?.ratings_average;
    if (olMedia && olMedia > 0) {
      externalRatings.push({ source: "Open Library", value: `${olMedia.toFixed(1)}/5` });
    }

    const openLibraryUrl = `https://openlibrary.org/works/${parsed.externalId}`;
    const tituloLivro = livro?.title ?? "";
    const watchProviders: ProvedorOndeAssistir[] = [
      { name: "Open Library", category: "READ", url: openLibraryUrl },
      ...(tituloLivro
        ? [
            {
              name: "Amazon Livros",
              category: "STORE" as const,
              url: `https://www.amazon.com.br/s?k=${encodeURIComponent(tituloLivro)}&i=stripbooks`
            },
            {
              name: "Google Livros",
              category: "READ" as const,
              url: `https://www.google.com.br/search?tbm=bks&q=${encodeURIComponent(tituloLivro)}`
            }
          ]
        : [])
    ];
    return {
      genres: (livro?.subjects ?? []).slice(0, 5),
      watchProviders,
      watchLink: openLibraryUrl,
      trakRating,
      externalRatings
    };
  }

  private async traduzirParaPtBr(texto: string | null): Promise<string | null> {
    if (!texto) {
      return null;
    }
    return this.comCache(`tr:${texto.slice(0, 120)}`, async () => {
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt-BR&dt=t&q=${encodeURIComponent(texto)}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (!response.ok) {
          return texto;
        }
        const data = (await response.json()) as unknown[];
        const partes = Array.isArray(data?.[0]) ? (data[0] as Array<[string]>) : [];
        const traduzido = partes.map((p) => p?.[0] ?? "").join("").trim();
        return traduzido || texto;
      } catch {
        return texto;
      }
    });
  }

  private async carregarItem(id: string, lang?: string): Promise<ItemCatalogo | null> {
    const idioma = lang === "en-US" ? "en-US" : "pt-BR";
    const parsed = parsearId(id);

    if (parsed?.source === "tmdb") {
      const item = await this.tmdb<TmdbItem>(`/${parsed.type === "MOVIE" ? "movie" : "tv"}/${parsed.externalId}`, {
        language: idioma
      });
      return item ? mapearTmdb(item, parsed.type) : null;
    }

    if (parsed?.source === "rawg") {
      const item = await this.rawg<RawgItem>(`/games/${parsed.externalId}`);
      if (!item) {
        return null;
      }
      const mapeado = mapearRawg(item);
      const [synopsis, capaVertical] = await Promise.all([
        idioma === "pt-BR" ? this.traduzirParaPtBr(mapeado.synopsis) : mapeado.synopsis,
        this.capaSteamGridDb(mapeado.title)
      ]);
      return {
        ...mapeado,
        coverUrl: capaVertical ?? mapeado.coverUrl,
        synopsis
      };
    }

    if (parsed?.source === "openlibrary") {
      const item = await this.openLibrary<OpenLibraryDoc>(`/works/${parsed.externalId}.json`);
      if (!item) {
        return null;
      }
      const mapeado = mapearOpenLibrary(item);
      let sinopse = mapeado.synopsis;

      if (idioma === "pt-BR") {
        // Complementa com sinopse oficial da Google Books em portugues (langRestrict=pt)
        const sinopseGoogle = await this.googleBooksBuscarSinopse(mapeado.title, "pt-BR");
        if (sinopseGoogle) {
          sinopse = sinopseGoogle;
        } else if (sinopse) {
          sinopse = await this.traduzirParaPtBr(sinopse);
        }
      }

      return {
        ...mapeado,
        synopsis: sinopse
      };
    }

    return null;
  }

  // Temporadas e episodios (somente series do TMDB)

  private async tvDetalhe(id: string) {
    const parsed = parsearId(id);
    if (parsed?.source !== "tmdb" || parsed.type !== "SERIES") {
      throw new NotFoundException("Temporadas so existem para series.");
    }
    const tv = await this.tmdb<TmdbTv>(`/tv/${parsed.externalId}`);
    if (!tv) {
      throw new NotFoundException("Serie nao encontrada.");
    }
    return { tv, externalId: parsed.externalId };
  }

  async listarTemporadas(id: string): Promise<Temporada[]> {
    const { tv } = await this.tvDetalhe(id);

    return (tv.seasons ?? [])
      .filter((season) => season.episode_count > 0)
      .map((season) => ({
        seasonNumber: season.season_number,
        name: season.name,
        episodeCount: season.episode_count,
        airDate: season.air_date
      }))
      // Especiais (temporada 0) por ultimo.
      .sort((a, b) => (a.seasonNumber || 1000) - (b.seasonNumber || 1000));
  }

  async listarEpisodios(id: string, temporada: number): Promise<Episodio[]> {
    const { externalId } = await this.tvDetalhe(id);
    const data = await this.tmdb<{ episodes: TmdbEpisodio[] }>(`/tv/${externalId}/season/${temporada}`);

    if (!data) {
      throw new NotFoundException("Temporada nao encontrada.");
    }

    return data.episodes.map((episode) => ({
      episodeNumber: episode.episode_number,
      name: episode.name,
      airDate: episode.air_date,
      overview: episode.overview || null,
      runtime: episode.runtime ?? null
    }));
  }

  // Total de episodios ja exibidos, sem contar especiais.
  async totalEpisodiosExibidos(id: string) {
    const { tv } = await this.tvDetalhe(id);
    const ultimo = tv.last_episode_to_air;
    const temporadas = (tv.seasons ?? []).filter((season) => season.season_number > 0);

    if (!ultimo) {
      return 0;
    }

    return temporadas.reduce((total, season) => {
      if (season.season_number < ultimo.season_number) {
        return total + season.episode_count;
      }
      if (season.season_number === ultimo.season_number) {
        return total + ultimo.episode_number;
      }
      return total;
    }, 0);
  }

  // Recomendacoes e novidades

  async relacionados(id: string): Promise<ItemCatalogo[]> {
    const parsed = parsearId(id);

    if (parsed?.source === "tmdb") {
      const mediaType = parsed.type === "MOVIE" ? "movie" : "tv";
      const data = await this.tmdb<{ results: TmdbItem[] }>(`/${mediaType}/${parsed.externalId}/recommendations`);
      return (data?.results ?? []).slice(0, 8).map((item) => mapearTmdb(item, parsed.type));
    }

    if (parsed?.source === "rawg") {
      const jogo = await this.rawg<{ genres?: Array<{ slug: string }> }>(`/games/${parsed.externalId}`);
      const genero = jogo?.genres?.[0]?.slug;
      if (!genero) {
        return [];
      }
      const data = await this.rawg<{ results: RawgItem[] }>("/games", {
        genres: genero,
        ordering: "-rating",
        page_size: "8"
      });
      return (data?.results ?? []).map((item) => ({ ...mapearRawg(item), synopsis: null }));
    }

    if (parsed?.source === "openlibrary") {
      const livro = await this.openLibrary<{ subjects?: string[] }>(`/works/${parsed.externalId}.json`);
      const assunto = livro?.subjects?.[0];
      if (!assunto) {
        return [];
      }
      const slug = normalizarTitulo(assunto).replace(/ /g, "_");
      const data = await this.openLibrary<{ works: OpenLibraryDoc[] }>(`/subjects/${slug}.json`, { limit: "8" });
      return (data?.works ?? []).map(mapearOpenLibrary);
    }

    return [];
  }

  async novidades(id: string, agora = new Date()): Promise<Novidade | null> {
    const parsed = parsearId(id);
    const hoje = agora.getTime();
    const dentroDe = (data: string | null | undefined, antes: number, depois: number) => {
      if (!data) {
        return false;
      }
      const dias = (new Date(`${data}T00:00:00Z`).getTime() - hoje) / DIA_MS;
      return dias >= -antes && dias <= depois;
    };

    if (parsed?.source === "tmdb" && parsed.type === "SERIES") {
      const tv = await this.tmdb<TmdbTv>(`/tv/${parsed.externalId}`);
      const proximo = tv?.next_episode_to_air;
      const ultimo = tv?.last_episode_to_air;

      if (proximo?.air_date && dentroDe(proximo.air_date, 0, 30)) {
        return {
          kind: "UPCOMING_EPISODE",
          date: proximo.air_date,
          label: `T${proximo.season_number}E${proximo.episode_number} estreia em breve`
        };
      }
      if (ultimo?.air_date && dentroDe(ultimo.air_date, 7, 0)) {
        return {
          kind: "NEW_EPISODE",
          date: ultimo.air_date,
          label: `Novo episódio: T${ultimo.season_number}E${ultimo.episode_number}`
        };
      }
      return null;
    }

    if (parsed?.source === "tmdb" && parsed.type === "MOVIE") {
      const filme = await this.tmdb<TmdbItem>(`/movie/${parsed.externalId}`);
      return filme?.release_date && dentroDe(filme.release_date, 7, 60)
        ? { kind: "UPCOMING_RELEASE", date: filme.release_date, label: "Estreia nos cinemas" }
        : null;
    }

    if (parsed?.source === "rawg") {
      const jogo = await this.rawg<RawgItem>(`/games/${parsed.externalId}`);
      return jogo?.released && dentroDe(jogo.released, 7, 60)
        ? { kind: "UPCOMING_RELEASE", date: jogo.released, label: "Lançamento do jogo" }
        : null;
    }

    return null;
  }

  // Usado pela importacao

  async buscarFilmePorTitulo(titulo: string, ano?: number | null): Promise<ItemCatalogo | null> {
    const params: Record<string, string> = { query: titulo };
    if (ano) {
      params.year = String(ano);
    }
    const data = await this.tmdb<{ results: TmdbItem[] }>("/search/movie", params);
    const primeiro = data?.results?.[0];
    return primeiro ? mapearTmdb(primeiro, "MOVIE") : null;
  }

  async buscarJogoPorNome(nome: string): Promise<ItemCatalogo | null> {
    const data = await this.rawg<{ results: RawgItem[] }>("/games", {
      search: nome,
      search_precise: "true",
      page_size: "5"
    });
    const alvo = normalizarTitulo(nome);
    const resultados = data?.results ?? [];
    const melhor = resultados.find((jogo) => normalizarTitulo(jogo.name) === alvo) ?? resultados[0];
    return melhor ? { ...mapearRawg(melhor), synopsis: null } : null;
  }

  // Persistencia

  // Duracao estimada da obra inteira, em minutos (null quando a fonte nao informa).
  async duracaoMinutos(id: string): Promise<number | null> {
    const parsed = parsearId(id);

    if (parsed?.source === "tmdb" && parsed.type === "MOVIE") {
      const filme = await this.tmdb<TmdbItem>(`/movie/${parsed.externalId}`);
      return filme?.runtime && filme.runtime > 0 ? filme.runtime : null;
    }

    if (parsed?.source === "tmdb" && parsed.type === "SERIES") {
      const tv = await this.tmdb<TmdbTv>(`/tv/${parsed.externalId}`);
      if (!tv) {
        return null;
      }
      const porEpisodio = tv.episode_run_time?.find((m) => m > 0) ?? tv.last_episode_to_air?.runtime ?? null;
      const episodios = await this.totalEpisodiosExibidos(id).catch(() => tv.number_of_episodes ?? 0);
      return porEpisodio && episodios > 0 ? porEpisodio * episodios : null;
    }

    if (parsed?.source === "rawg") {
      const jogo = await this.rawg<RawgItem>(`/games/${parsed.externalId}`);
      return jogo?.playtime && jogo.playtime > 0 ? jogo.playtime * 60 : null;
    }

    if (parsed?.source === "openlibrary") {
      const edicoes = await this.openLibrary<{ entries?: Array<{ number_of_pages?: number }> }>(
        `/works/${parsed.externalId}/editions.json`,
        { limit: "20" }
      );
      const paginas = (edicoes?.entries ?? [])
        .map((e) => e.number_of_pages ?? 0)
        .filter((p) => p > 0)
        .sort((a, b) => a - b);
      if (paginas.length === 0) {
        return null;
      }
      const mediana = paginas[Math.floor(paginas.length / 2)];
      return Math.round(mediana * MINUTOS_POR_PAGINA);
    }

    return null;
  }

  // Duracao de varios itens salvos. Itens ainda sem duracao sao calculados
  // (no maximo `limiteNovos` por chamada) e gravados em MediaItem; quando a
  // fonte nao informa, grava 0 para nao consultar de novo.
  async duracoes(ids: string[], limiteNovos = 15): Promise<Map<string, number>> {
    const unicos = [...new Set(ids)];
    const resultado = new Map<string, number>();
    if (unicos.length === 0) {
      return resultado;
    }

    const db = this.supabaseService.getClient();
    const { data, error } = await db.from("MediaItem").select("id,durationMinutes").in("id", unicos);
    if (error) {
      await Promise.all(
        unicos.slice(0, limiteNovos).map(async (id) => {
          const minutos = (await this.comCache(`dur:${id}`, () => this.duracaoMinutos(id)).catch(() => null)) ?? 0;
          resultado.set(id, minutos);
        })
      );
      return resultado;
    }

    const pendentes: string[] = [];
    for (const linha of (data ?? []) as Array<{ id: string; durationMinutes: number | null }>) {
      if (typeof linha.durationMinutes === "number") {
        resultado.set(linha.id, linha.durationMinutes);
      } else {
        pendentes.push(linha.id);
      }
    }

    await Promise.all(
      pendentes.slice(0, limiteNovos).map(async (id) => {
        const minutos = (await this.duracaoMinutos(id).catch(() => null)) ?? 0;
        resultado.set(id, minutos);
        const { error: updateError } = await db.from("MediaItem").update({ durationMinutes: minutos }).eq("id", id);
        if (updateError) {
          this.logger.warn(`Nao foi possivel salvar a duracao de ${id}: ${updateError.message}`);
        }
      })
    );

    return resultado;
  }

  // Garante que o item exista em "MediaItem" antes de ser referenciado por
  // tracking, favoritos ou comentarios.
  async garantirNoBanco(id: string, itemConhecido?: ItemCatalogo) {
    const supabase = this.supabaseService.getClient();

    const { data: existente, error } = await supabase
      .from("MediaItem")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      this.logger.warn(`Nao foi possivel consultar MediaItem ${id}: ${error.message}`);
      throw new InternalServerErrorException(error.message);
    }

    if (existente) {
      return;
    }

    const item = itemConhecido ?? (await this.buscarPorId(id));
    const agora = new Date().toISOString();
    const { subtype: _subtype, ...itemParaSalvar } = item;
    void _subtype;
    const { error: insertError } = await supabase
      .from("MediaItem")
      .upsert({ ...itemParaSalvar, createdAt: agora, updatedAt: agora }, { onConflict: "id", ignoreDuplicates: true });

    if (insertError) {
      this.logger.warn(`Nao foi possivel salvar MediaItem ${id}: ${insertError.message}`);
      throw new InternalServerErrorException(insertError.message);
    }
  }

  async buscarSalvos(ids: string[]) {
    const unicos = [...new Set(ids)];
    if (unicos.length === 0) {
      return new Map<string, ItemCatalogo>();
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from("MediaItem")
      .select("id,externalId,source,type,title,coverUrl,synopsis,releaseYear")
      .in("id", unicos);

    if (error) {
      this.logger.warn(`Nao foi possivel ler MediaItem: ${error.message}`);
    }

    return new Map(
      (data ?? []).map((item) => {
        const coverUrl =
          typeof item.coverUrl === "string"
            ? item.coverUrl.replace("/media/resize/640/-/games/", "/media/games/")
            : null;
        return [item.id as string, { ...(item as ItemCatalogo), coverUrl }];
      })
    );
  }
}
