import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";
import { SupabaseService } from "../../comum/supabase/supabase.service";
import { ItemCatalogo, TipoMidia } from "./catalogo.types";

type TmdbItem = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
};

type RawgItem = {
  id: number;
  name: string;
  background_image: string | null;
  released: string | null;
  description_raw?: string;
};

type FiltroTipo = "movie" | "series" | "game" | undefined;

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const FETCH_TIMEOUT_MS = 8000;
const ID_PATTERN = /^(tmdb_(movie|series)|rawg_game)_\d+$/;

@Injectable()
export class CatalogoService {
  private readonly logger = new Logger(CatalogoService.name);
  private readonly cache = new Map<string, { expiresAt: number; value: unknown }>();

  constructor(private readonly supabaseService: SupabaseService) {}

  private async comCache<T>(chave: string, carregar: () => Promise<T>): Promise<T> {
    const atual = this.cache.get(chave);
    if (atual && atual.expiresAt > Date.now()) {
      return atual.value as T;
    }

    const value = await carregar();
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      this.cache.delete(this.cache.keys().next().value as string);
    }
    this.cache.set(chave, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    return value;
  }

  private getReleaseYear(date?: string | null) {
    const year = date?.slice(0, 4);
    return year && /^\d{4}$/.test(year) ? Number(year) : null;
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      return response.ok ? ((await response.json()) as T) : null;
    } catch {
      return null;
    }
  }

  private mapearTmdb(item: TmdbItem, type: "MOVIE" | "SERIES"): ItemCatalogo {
    return {
      id: `tmdb_${type === "MOVIE" ? "movie" : "series"}_${item.id}`,
      externalId: String(item.id),
      source: "tmdb",
      type,
      title: item.title ?? item.name ?? "Sem titulo",
      coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      synopsis: item.overview || null,
      releaseYear: this.getReleaseYear(item.release_date ?? item.first_air_date)
    };
  }

  private mapearRawg(item: RawgItem): ItemCatalogo {
    return {
      id: `rawg_game_${item.id}`,
      externalId: String(item.id),
      source: "rawg",
      type: "GAME",
      title: item.name,
      // O RAWG entrega a imagem em resolucao original; a versao redimensionada e bem mais leve.
      coverUrl: item.background_image?.replace("/media/games/", "/media/resize/640/-/games/") ?? null,
      synopsis: item.description_raw || null,
      releaseYear: this.getReleaseYear(item.released)
    };
  }

  private async listarTmdb(
    mediaType: "movie" | "tv",
    type: "MOVIE" | "SERIES",
    apiKey: string,
    query?: string
  ): Promise<ItemCatalogo[]> {
    const url = query
      ? `https://api.themoviedb.org/3/search/${mediaType}?api_key=${encodeURIComponent(apiKey)}&language=pt-BR&query=${encodeURIComponent(query)}`
      : `https://api.themoviedb.org/3/trending/${mediaType}/week?api_key=${encodeURIComponent(apiKey)}&language=pt-BR`;
    const data = await this.fetchJson<{ results: TmdbItem[] }>(url);

    return (data?.results ?? []).slice(0, query ? 12 : 8).map((item) => this.mapearTmdb(item, type));
  }

  private async listarRawg(apiKey: string, query?: string): Promise<ItemCatalogo[]> {
    const url = query
      ? `https://api.rawg.io/api/games?key=${encodeURIComponent(apiKey)}&page_size=12&search=${encodeURIComponent(query)}`
      : `https://api.rawg.io/api/games?key=${encodeURIComponent(apiKey)}&page_size=8&ordering=-added`;
    const data = await this.fetchJson<{ results: RawgItem[] }>(url);

    // A listagem do RAWG nao traz descricao.
    return (data?.results ?? []).map((item) => ({ ...this.mapearRawg(item), synopsis: null }));
  }

  async listar(query?: string, tipo?: string) {
    const tmdbApiKey = process.env.TMDB_API_KEY;
    const rawgApiKey = process.env.RAWG_API_KEY;

    if (!tmdbApiKey && !rawgApiKey) {
      throw new ServiceUnavailableException("Configure TMDB_API_KEY ou RAWG_API_KEY no ambiente.");
    }

    const busca = query?.trim() || undefined;
    const filtro = (["movie", "series", "game"].includes(tipo ?? "") ? tipo : undefined) as FiltroTipo;
    const incluir = (t: Exclude<FiltroTipo, undefined>) => !filtro || filtro === t;

    return this.comCache(`listar:${busca ?? ""}:${filtro ?? ""}`, async () => {
      const [movies, series, games] = await Promise.all([
        tmdbApiKey && incluir("movie") ? this.listarTmdb("movie", "MOVIE", tmdbApiKey, busca) : [],
        tmdbApiKey && incluir("series") ? this.listarTmdb("tv", "SERIES", tmdbApiKey, busca) : [],
        rawgApiKey && incluir("game") ? this.listarRawg(rawgApiKey, busca) : []
      ]);

      return [...movies, ...series, ...games];
    });
  }

  async buscarPorId(id: string): Promise<ItemCatalogo> {
    if (!ID_PATTERN.test(id)) {
      throw new NotFoundException("Item nao encontrado.");
    }

    const item = await this.comCache(`item:${id}`, () => this.carregarItem(id));

    if (!item) {
      this.cache.delete(`item:${id}`);
      throw new NotFoundException("Item nao encontrado.");
    }

    return item;
  }

  private async carregarItem(id: string): Promise<ItemCatalogo | null> {
    const [source, type, externalId] = id.split("_");

    if (source === "tmdb") {
      const apiKey = process.env.TMDB_API_KEY;
      const mediaType = type === "movie" ? "movie" : "tv";
      const tipo: TipoMidia = type === "movie" ? "MOVIE" : "SERIES";
      const item = apiKey
        ? await this.fetchJson<TmdbItem>(
            `https://api.themoviedb.org/3/${mediaType}/${externalId}?api_key=${encodeURIComponent(apiKey)}&language=pt-BR`
          )
        : null;

      return item ? this.mapearTmdb(item, tipo as "MOVIE" | "SERIES") : null;
    }

    const apiKey = process.env.RAWG_API_KEY;
    const item = apiKey
      ? await this.fetchJson<RawgItem>(
          `https://api.rawg.io/api/games/${externalId}?key=${encodeURIComponent(apiKey)}`
        )
      : null;

    return item ? this.mapearRawg(item) : null;
  }

  // Garante que o item exista em "MediaItem" antes de ser referenciado por
  // tracking, favoritos ou comentarios. Falhas sao registradas, nao propagadas.
  async garantirNoBanco(id: string) {
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

      const item = await this.buscarPorId(id);
      const { error: insertError } = await supabase
        .from("MediaItem")
        .upsert(item, { onConflict: "id", ignoreDuplicates: true });

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
    if (ids.length === 0) {
      return new Map<string, ItemCatalogo>();
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from("MediaItem")
      .select("id,externalId,source,type,title,coverUrl,synopsis,releaseYear")
      .in("id", ids);

    if (error) {
      this.logger.warn(`Nao foi possivel ler MediaItem: ${error.message}`);
    }

    return new Map((data ?? []).map((item) => [item.id as string, item as ItemCatalogo]));
  }
}
