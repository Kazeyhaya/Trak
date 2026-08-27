import {
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ItemCatalogo } from "./catalogo.types";

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

type OpenLibraryWork = {
  key: string;
  title: string;
  cover_id?: number;
  first_publish_year?: number;
};

type OpenLibraryWorkDetail = {
  title: string;
  description?: string | { value?: string };
  covers?: number[];
  first_publish_date?: string;
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
  ): Promise<ItemCatalogo[]> {
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

  private async listarRawg(apiKey: string): Promise<ItemCatalogo[]> {
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

  private async listarLivros(): Promise<ItemCatalogo[]> {
    const data = await this.fetchJson<{ works: OpenLibraryWork[] }>(
      "https://openlibrary.org/subjects/fantasy.json?limit=8"
    );

    return (data?.works ?? []).map((work) => {
      const externalId = work.key.split("/").pop() ?? work.key;

      return {
        id: `openlibrary_book_${externalId}`,
        externalId,
        source: "openlibrary",
        type: "BOOK",
        title: work.title,
        coverUrl: work.cover_id
          ? `https://covers.openlibrary.org/b/id/${work.cover_id}-L.jpg`
          : null,
        synopsis: null,
        releaseYear: work.first_publish_year ?? null
      };
    });
  }

  async listar() {
    const tmdbApiKey = process.env.TMDB_API_KEY;
    const rawgApiKey = process.env.RAWG_API_KEY;

    const [movies, series, games, books] = await Promise.all([
      tmdbApiKey ? this.listarTmdb("movie", "MOVIE", tmdbApiKey) : [],
      tmdbApiKey ? this.listarTmdb("tv", "SERIES", tmdbApiKey) : [],
      rawgApiKey ? this.listarRawg(rawgApiKey) : [],
      this.listarLivros()
    ]);

    return [...movies, ...series, ...games, ...books];
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
        } satisfies ItemCatalogo;
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
        } satisfies ItemCatalogo;
      }
    }

    if (source === "openlibrary" && type === "book") {
      const item = await this.fetchJson<OpenLibraryWorkDetail>(
        `https://openlibrary.org/works/${encodeURIComponent(externalId)}.json`
      );

      if (item) {
        const synopsis =
          typeof item.description === "string"
            ? item.description
            : item.description?.value ?? null;

        return {
          id,
          externalId,
          source: "openlibrary",
          type: "BOOK",
          title: item.title,
          coverUrl: item.covers?.[0]
            ? `https://covers.openlibrary.org/b/id/${item.covers[0]}-L.jpg`
            : null,
          synopsis,
          releaseYear: this.getReleaseYear(item.first_publish_date)
        } satisfies ItemCatalogo;
      }
    }

    throw new NotFoundException("Item nao encontrado.");
  }
}
