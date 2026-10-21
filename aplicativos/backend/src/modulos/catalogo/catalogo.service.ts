import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit
} from "@nestjs/common";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import {
  mapearOpenLibrary,
  mapearRawg,
  mapearTmdb,
  normalizarTitulo,
  OpenLibraryDoc,
  parsearId,
  RawgItem,
  TMDB_GENERO_ANIMACAO,
  TmdbItem
} from "./catalogo.fontes";
import { Episodio, ItemCatalogo, Novidade, Temporada } from "./catalogo.types";

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

type FiltroTipo = "movie" | "series" | "game" | "book" | "anime";

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 1000;
const FETCH_TIMEOUT_MS = 8000;
const TMDB = "https://api.themoviedb.org/3";
const RAWG = "https://api.rawg.io/api";
const OPEN_LIBRARY = "https://openlibrary.org";
const DIA_MS = 24 * 60 * 60 * 1000;

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
    const query = new URLSearchParams({ api_key: apiKey, language: "pt-BR", ...params });
    return this.comCache(`tmdb:${path}?${new URLSearchParams(params)}`, () =>
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

  // Listagem e busca

  async listar(query?: string, tipo?: string) {
    // Fontes sem chave configurada simplesmente nao retornam itens.
    const busca = query?.trim() || undefined;
    const filtro = (["movie", "series", "game", "book", "anime"] as const).find((t) => t === tipo);

    // Animes e animacoes: series e filmes do genero Animacao, mais populares primeiro.
    if (filtro === "anime") {
      const [series, movies] = await Promise.all([
        this.listarAnimacoes("tv", busca),
        this.listarAnimacoes("movie", busca)
      ]);
      return [...series, ...movies];
    }

    const incluir = (t: FiltroTipo) => !filtro || filtro === t;

    const [movies, series, games, books] = await Promise.all([
      incluir("movie") ? this.listarTmdb("movie", busca) : [],
      incluir("series") ? this.listarTmdb("tv", busca) : [],
      incluir("game") ? this.listarRawg(busca) : [],
      incluir("book") ? this.listarLivros(busca) : []
    ]);

    return [...movies, ...series, ...games, ...books];
  }

  private async listarTmdb(mediaType: "movie" | "tv", query?: string): Promise<ItemCatalogo[]> {
    const type = mediaType === "movie" ? "MOVIE" : "SERIES";
    const data = query
      ? await this.tmdb<{ results: TmdbItem[] }>(`/search/${mediaType}`, { query })
      : await this.tmdb<{ results: TmdbItem[] }>(`/trending/${mediaType}/week`);

    return (data?.results ?? []).slice(0, query ? 12 : 8).map((item) => mapearTmdb(item, type));
  }

  private async listarAnimacoes(mediaType: "movie" | "tv", query?: string): Promise<ItemCatalogo[]> {
    const type = mediaType === "movie" ? "MOVIE" : "SERIES";
    // A busca por texto do TMDB nao filtra genero, entao o filtro e feito nos resultados.
    const data = query
      ? await this.tmdb<{ results: TmdbItem[] }>(`/search/${mediaType}`, { query })
      : await this.tmdb<{ results: TmdbItem[] }>(`/discover/${mediaType}`, {
          with_genres: String(TMDB_GENERO_ANIMACAO),
          sort_by: "popularity.desc"
        });

    return (data?.results ?? [])
      .filter((item) => !query || item.genre_ids?.includes(TMDB_GENERO_ANIMACAO))
      .slice(0, 12)
      .map((item) => mapearTmdb(item, type));
  }

  private async listarRawg(query?: string): Promise<ItemCatalogo[]> {
    const data = await this.rawg<{ results: RawgItem[] }>(
      "/games",
      query ? { page_size: "12", search: query } : { page_size: "8", ordering: "-added" }
    );

    // A listagem do RAWG nao traz descricao.
    return (data?.results ?? []).map((item) => ({ ...mapearRawg(item), synopsis: null }));
  }

  private async listarLivros(query?: string): Promise<ItemCatalogo[]> {
    if (query) {
      const data = await this.openLibrary<{ docs: OpenLibraryDoc[] }>("/search.json", {
        q: query,
        limit: "12",
        fields: "key,title,cover_i,first_publish_year"
      });
      return (data?.docs ?? []).map(mapearOpenLibrary);
    }

    const data = await this.openLibrary<{ works: OpenLibraryDoc[] }>("/trending/weekly.json", { limit: "8" });
    return (data?.works ?? []).slice(0, 8).map(mapearOpenLibrary);
  }

  async buscarPorId(id: string): Promise<ItemCatalogo> {
    const item = await this.carregarItem(id);

    if (!item) {
      throw new NotFoundException("Item nao encontrado.");
    }

    return item;
  }

  private async carregarItem(id: string): Promise<ItemCatalogo | null> {
    const parsed = parsearId(id);

    if (parsed?.source === "tmdb") {
      const item = await this.tmdb<TmdbItem>(`/${parsed.type === "MOVIE" ? "movie" : "tv"}/${parsed.externalId}`);
      return item ? mapearTmdb(item, parsed.type) : null;
    }

    if (parsed?.source === "rawg") {
      const item = await this.rawg<RawgItem>(`/games/${parsed.externalId}`);
      return item ? mapearRawg(item) : null;
    }

    if (parsed?.source === "openlibrary") {
      const item = await this.openLibrary<OpenLibraryDoc>(`/works/${parsed.externalId}.json`);
      return item ? mapearOpenLibrary(item) : null;
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

  // Garante que o item exista em "MediaItem" antes de ser referenciado por
  // tracking, favoritos ou comentarios. Falhas sao registradas, nao propagadas.
  async garantirNoBanco(id: string, itemConhecido?: ItemCatalogo) {
    const supabase = this.supabaseService.getClient();

    try {
      const { data: existente, error } = await supabase
        .from("MediaItem")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (existente) {
        return;
      }

      const item = itemConhecido ?? (await this.buscarPorId(id));
      const agora = new Date().toISOString();
      const { error: insertError } = await supabase
        .from("MediaItem")
        .upsert({ ...item, createdAt: agora, updatedAt: agora }, { onConflict: "id", ignoreDuplicates: true });

      if (insertError) {
        throw insertError;
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.warn(`Nao foi possivel salvar MediaItem ${id}: ${(error as Error).message}`);
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

    return new Map((data ?? []).map((item) => [item.id as string, item as ItemCatalogo]));
  }
}
