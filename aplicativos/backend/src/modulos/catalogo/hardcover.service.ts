import { Injectable, Logger } from "@nestjs/common";
import { CatalogItem } from "./catalogo.types";
import { detectarSubtipoLivro } from "./catalogo.fontes";

export interface HardcoverImage {
  id?: number;
  url?: string;
  width?: number;
  height?: number;
  color?: string;
  color_name?: string;
}

export interface HardcoverAuthor {
  id?: number;
  name?: string;
  slug?: string;
  image?: HardcoverImage | null;
}

export interface HardcoverContributor {
  author?: HardcoverAuthor;
  contribution?: string;
  contributor_role_name?: string;
  primary?: boolean;
}

export interface HardcoverTag {
  tag?: string;
  tagSlug?: string;
  category?: string;
}

export interface HardcoverBook {
  id: number;
  title: string;
  description?: string | null;
  release_year?: number | null;
  pages?: number | null;
  rating?: number | null;
  cached_image?: HardcoverImage | null;
  cached_contributors?: HardcoverContributor[] | null;
  cached_tags?: {
    Genre?: HardcoverTag[];
    Mood?: HardcoverTag[];
    Tag?: HardcoverTag[];
    [key: string]: unknown;
  } | null;
  slug?: string | null;
}

export interface HardcoverSearchHitDocument {
  id: string | number;
  title: string;
  description?: string | null;
  release_year?: number | null;
  image?: HardcoverImage | { url?: string } | null;
  cached_image?: HardcoverImage | null;
  rating?: number | null;
  pages?: number | null;
  genres?: string[] | null;
  author_names?: string[] | null;
  slug?: string | null;
}

export interface HardcoverSearchResponse {
  search?: {
    results?: {
      hits?: Array<{
        document?: HardcoverSearchHitDocument;
      }>;
    };
  };
}

export interface HardcoverPopularResponse {
  books?: HardcoverBook[];
}

export interface HardcoverBookDetailResponse {
  books_by_pk?: HardcoverBook | null;
}

export function mapHardcoverBook(book: HardcoverBook | HardcoverSearchHitDocument): CatalogItem {
  const numericId = typeof book.id === "number" ? book.id : parseInt(String(book.id), 10);
  const coverUrl =
    ("cached_image" in book && book.cached_image?.url) ||
    ("image" in book && book.image?.url) ||
    null;

  const rawDescription = book.description ? book.description.replace(/<[^>]+>/g, "").trim() : null;

  const genresList: string[] = [
    ...("genres" in book && Array.isArray(book.genres) ? (book.genres as string[]) : []),
    ...("cached_tags" in book && book.cached_tags?.Genre
      ? book.cached_tags.Genre.flatMap((g) => (g.tag ? [g.tag] : []))
      : [])
  ];
  const subtype = detectarSubtipoLivro(book.title ?? "", genresList);

  return {
    id: `media_hardcover_${numericId}`,
    externalId: String(numericId),
    source: "hardcover",
    type: "BOOK",
    subtype: subtype ?? undefined,
    title: book.title?.trim() || "Sem título",
    coverUrl: coverUrl?.trim() || null,
    synopsis: rawDescription || null,
    releaseYear: book.release_year ?? null
  };
}

@Injectable()
export class HardcoverService {
  private readonly logger = new Logger(HardcoverService.name);
  private readonly graphqlUrl = "https://api.hardcover.app/v1/graphql";

  private getApiKey(): string | undefined {
    return process.env.HARDCOVER_API_KEY?.trim() || undefined;
  }

  async executeQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return null;
    }

    try {
      const response = await fetch(this.graphqlUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "Trak (https://github.com/Kazeyhaya/Trak)"
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        if (response.status !== 404) {
          this.logger.warn(`Hardcover API respondeu com status HTTP ${response.status}`);
        }
        return null;
      }

      const json = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
      if (json.errors?.length) {
        this.logger.warn(`Hardcover GraphQL erros: ${json.errors.map((e) => e.message).join(", ")}`);
        return json.data ?? null;
      }

      return json.data ?? null;
    } catch (err) {
      this.logger.warn(`Falha na requisição para Hardcover GraphQL: ${(err as Error).message}`);
      return null;
    }
  }

  async searchBooks(query: string, limit = 20): Promise<CatalogItem[]> {
    const cleanQuery = query?.trim();
    if (!cleanQuery) {
      return this.getPopularBooks(limit);
    }

    const maxResults = Math.min(Math.max(1, limit), 50);
    const gql = `
      query SearchBooks($query: String!, $per_page: Int) {
        search(query: $query, query_type: "Book", per_page: $per_page, page: 1) {
          results
        }
      }
    `;

    const data = await this.executeQuery<HardcoverSearchResponse>(gql, {
      query: cleanQuery,
      per_page: maxResults
    });

    const hits = data?.search?.results?.hits;
    if (!Array.isArray(hits) || hits.length === 0) {
      return [];
    }

    return hits
      .flatMap((hit) => (hit.document ? [mapHardcoverBook(hit.document)] : []))
      .filter((item) => Boolean(item.id && item.title));
  }

  async getPopularBooks(limit = 20): Promise<CatalogItem[]> {
    const maxResults = Math.min(Math.max(1, limit), 50);
    const gql = `
      query GetPopularBooks($limit: Int!) {
        books(order_by: { users_read_count: desc }, limit: $limit) {
          id
          title
          description
          release_year
          pages
          rating
          cached_image
          cached_contributors
          cached_tags
          slug
        }
      }
    `;

    const data = await this.executeQuery<HardcoverPopularResponse>(gql, { limit: maxResults });
    const books = data?.books;
    if (!Array.isArray(books) || books.length === 0) {
      return [];
    }

    return books.map(mapHardcoverBook).filter((item) => Boolean(item.id && item.title));
  }

  async getBookById(id: string | number): Promise<CatalogItem | null> {
    const raw = await this.getBookRaw(id);
    if (!raw) {
      return null;
    }
    return mapHardcoverBook(raw);
  }

  async getBookRaw(id: string | number): Promise<HardcoverBook | null> {
    const cleanId = String(id).trim().replace(/^(?:media_hardcover_|hardcover_book_)/, "");
    const numericId = parseInt(cleanId, 10);
    if (Number.isNaN(numericId) || numericId <= 0) {
      return null;
    }

    const gql = `
      query GetBookById($id: Int!) {
        books_by_pk(id: $id) {
          id
          title
          description
          release_year
          pages
          rating
          cached_image
          cached_contributors
          cached_tags
          slug
        }
      }
    `;

    const data = await this.executeQuery<HardcoverBookDetailResponse>(gql, { id: numericId });
    return data?.books_by_pk ?? null;
  }
}
