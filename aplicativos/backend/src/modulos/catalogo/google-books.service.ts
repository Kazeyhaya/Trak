import { Injectable, Logger } from "@nestjs/common";
import { CatalogItem } from "./catalogo.types";
import { detectarSubtipoLivro } from "./catalogo.fontes";

export interface GoogleBooksVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    description?: string;
    publishedDate?: string;
    pageCount?: number;
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    infoLink?: string;
    previewLink?: string;
  };
}

export interface GoogleBooksSearchResponse {
  totalItems?: number;
  items?: GoogleBooksVolume[];
}

export function sanitizeGoogleBooksCoverUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl?.trim()) {
    return null;
  }
  try {
    const url = new URL(rawUrl.trim().replace(/^http:\/\//i, "https://"));
    url.searchParams.delete("edge");
    const zoom = url.searchParams.get("zoom");
    if (zoom === "1" || zoom === "5") {
      url.searchParams.set("zoom", "2");
    }
    return url.toString();
  } catch {
    return rawUrl.trim().replace(/^http:\/\//i, "https://").replace(/([?&])edge=[^&]+/i, "");
  }
}

export function mapGoogleBooksVolume(volume: GoogleBooksVolume): CatalogItem {
  const info = volume.volumeInfo;
  const rawCover =
    info?.imageLinks?.extraLarge ??
    info?.imageLinks?.large ??
    info?.imageLinks?.medium ??
    info?.imageLinks?.small ??
    info?.imageLinks?.thumbnail ??
    info?.imageLinks?.smallThumbnail ??
    null;

  let coverUrl = sanitizeGoogleBooksCoverUrl(rawCover);
  if (!coverUrl && info?.industryIdentifiers?.length) {
    const isbnObj =
      info.industryIdentifiers.find((id) => id.type === "ISBN_13" || id.type === "ISBN_10") ??
      info.industryIdentifiers[0];
    if (isbnObj?.identifier) {
      coverUrl = `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbnObj.identifier)}-L.jpg`;
    }
  }

  let releaseYear: number | null = null;
  if (info?.publishedDate) {
    const match = info.publishedDate.match(/\b\d{4}\b/);
    if (match) {
      const year = parseInt(match[0], 10);
      if (Number.isFinite(year) && year > 0) {
        releaseYear = year;
      }
    }
  }

  const synopsis = info?.description ? info.description.replace(/<[^>]+>/g, "").trim() || null : null;
  const subtype = detectarSubtipoLivro(info?.title ?? "", info?.categories ?? []);

  return {
    id: `media_gbooks_${volume.id}`,
    externalId: volume.id,
    source: "gbooks",
    type: "BOOK",
    ...(subtype ? { subtype } : {}),
    title: info?.title ?? "Sem título",
    coverUrl,
    synopsis,
    releaseYear,
    ...(typeof info?.pageCount === "number" && info.pageCount > 0 ? { pageCount: info.pageCount } : {})
  };
}

@Injectable()
export class GoogleBooksService {
  private readonly logger = new Logger(GoogleBooksService.name);
  private readonly baseUrl = "https://www.googleapis.com/books/v1/volumes";

  private getApiKey(): string | undefined {
    return process.env.GOOGLE_BOOKS_API_KEY?.trim() || undefined;
  }

  async searchBooks(query: string, maxResults = 20): Promise<CatalogItem[]> {
    const cleanQuery = query?.trim() || "ficcao";
    try {
      const params = new URLSearchParams({
        q: cleanQuery,
        langRestrict: "pt",
        projection: "lite",
        maxResults: String(Math.min(Math.max(1, maxResults), 40))
      });

      const apiKey = this.getApiKey();
      if (apiKey) {
        params.set("key", apiKey);
      }

      const url = `${this.baseUrl}?${params.toString()}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        this.logger.warn(`Google Books search respondeu com status HTTP ${response.status}`);
        return [];
      }

      const data = (await response.json()) as GoogleBooksSearchResponse;
      if (!Array.isArray(data.items)) {
        return [];
      }

      return data.items.map(mapGoogleBooksVolume);
    } catch (err) {
      this.logger.error(`Erro ao buscar livros na Google Books API para termo "${query}":`, err);
      return [];
    }
  }

  async getBookById(id: string): Promise<CatalogItem | null> {
    if (!id?.trim()) {
      return null;
    }
    const volumeId = id.trim().replace(/^media_gbooks_/, "");
    try {
      const params = new URLSearchParams();
      const apiKey = this.getApiKey();
      if (apiKey) {
        params.set("key", apiKey);
      }

      const querySuffix = params.size > 0 ? `?${params.toString()}` : "";
      const url = `${this.baseUrl}/${encodeURIComponent(volumeId)}${querySuffix}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        if (response.status !== 404) {
          this.logger.warn(`Google Books getBookById respondeu com status HTTP ${response.status} para ID "${volumeId}"`);
        }
        return null;
      }

      const volume = (await response.json()) as GoogleBooksVolume;
      if (!volume?.id) {
        return null;
      }

      return mapGoogleBooksVolume(volume);
    } catch (err) {
      this.logger.error(`Erro ao buscar livro por ID "${volumeId}" na Google Books API:`, err);
      return null;
    }
  }

  async getVolumeRaw(id: string): Promise<GoogleBooksVolume | null> {
    if (!id?.trim()) {
      return null;
    }
    const volumeId = id.trim().replace(/^media_gbooks_/, "");
    try {
      const params = new URLSearchParams();
      const apiKey = this.getApiKey();
      if (apiKey) {
        params.set("key", apiKey);
      }

      const querySuffix = params.size > 0 ? `?${params.toString()}` : "";
      const url = `${this.baseUrl}/${encodeURIComponent(volumeId)}${querySuffix}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        return null;
      }

      const volume = (await response.json()) as GoogleBooksVolume;
      return volume?.id ? volume : null;
    } catch {
      return null;
    }
  }
}
