import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException
} from "@nestjs/common";

type MediaType = "MOVIE" | "SERIES" | "GAME";

type CatalogItem = {
  id: string;
  externalId: string;
  source: "tmdb" | "rawg";
  type: MediaType;
  title: string;
  coverUrl: string | null;
  synopsis: string | null;
  releaseYear: number | null;
};

type TmdbItem = {
  id: number;
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

@Injectable()
export class CatalogoService {
  private getReleaseYear(date?: string | null) {
    const year = date?.slice(0, 4);
    return year && /^\d{4}$/.test(year) ? Number(year) : null;
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    try {
      const response = await fetch(url);
      return response.ok ? ((await response.json()) as T) : null;
    } catch {
      return null;
    }
  }

  private async listarTmdb(
    mediaType: "movie" | "tv",
    type: "MOVIE" | "SERIES",
    apiKey: string
  ): Promise<CatalogItem[]> {
    const data = await this.fetchJson<{ results: TmdbItem[] }>(
      `https://api.themoviedb.org/3/trending/${mediaType}/week?api_key=${encodeURIComponent(apiKey)}&language=pt-BR`
    );

    return (data?.results ?? []).slice(0, 8).map((item) => ({
      id: `tmdb_${type.toLowerCase()}_${item.id}`,
      externalId: String(item.id),
      source: "tmdb",
      type,
      title: item.title ?? item.name ?? "Sem titulo",
      coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      synopsis: item.overview || null,
      releaseYear: this.getReleaseYear(item.release_date ?? item.first_air_date)
    }));
  }

  private async listarRawg(apiKey: string): Promise<CatalogItem[]> {
    const data = await this.fetchJson<{ results: RawgItem[] }>(
      `https://api.rawg.io/api/games?key=${encodeURIComponent(apiKey)}&page_size=8&ordering=-added`
    );

    return (data?.results ?? []).map((item) => ({
      id: `rawg_game_${item.id}`,
      externalId: String(item.id),
      source: "rawg",
      type: "GAME",
      title: item.name,
      coverUrl: item.background_image,
      synopsis: null,
      releaseYear: this.getReleaseYear(item.released)
    }));
  }

  async listar() {
    const tmdbApiKey = process.env.TMDB_API_KEY;
    const rawgApiKey = process.env.RAWG_API_KEY;

    if (!tmdbApiKey && !rawgApiKey) {
      throw new ServiceUnavailableException("Configure TMDB_API_KEY ou RAWG_API_KEY no ambiente.");
    }

    const [movies, series, games] = await Promise.all([
      tmdbApiKey ? this.listarTmdb("movie", "MOVIE", tmdbApiKey) : [],
      tmdbApiKey ? this.listarTmdb("tv", "SERIES", tmdbApiKey) : [],
      rawgApiKey ? this.listarRawg(rawgApiKey) : []
    ]);

    return [...movies, ...series, ...games];
  }

  async buscarPorId(id: string) {
    const [source, type, externalId] = id.split("_");

    if (source === "tmdb" && (type === "movie" || type === "series")) {
      const apiKey = process.env.TMDB_API_KEY;
      const mediaType = type === "movie" ? "movie" : "tv";
      const item = apiKey
        ? await this.fetchJson<TmdbItem>(
            `https://api.themoviedb.org/3/${mediaType}/${encodeURIComponent(externalId)}?api_key=${encodeURIComponent(apiKey)}&language=pt-BR`
          )
        : null;

      if (item) {
        return {
          id,
          externalId,
          source: "tmdb",
          type: type === "movie" ? "MOVIE" : "SERIES",
          title: item.title ?? item.name ?? "Sem titulo",
          coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          synopsis: item.overview || null,
          releaseYear: this.getReleaseYear(item.release_date ?? item.first_air_date)
        } satisfies CatalogItem;
      }
    }

    if (source === "rawg" && type === "game") {
      const apiKey = process.env.RAWG_API_KEY;
      const item = apiKey
        ? await this.fetchJson<RawgItem>(
            `https://api.rawg.io/api/games/${encodeURIComponent(externalId)}?key=${encodeURIComponent(apiKey)}`
          )
        : null;

      if (item) {
        return {
          id,
          externalId,
          source: "rawg",
          type: "GAME",
          title: item.name,
          coverUrl: item.background_image,
          synopsis: item.description_raw || null,
          releaseYear: this.getReleaseYear(item.released)
        } satisfies CatalogItem;
      }
    }

    throw new NotFoundException("Item nao encontrado.");
  }
}
