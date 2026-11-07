import { Injectable, Logger } from "@nestjs/common";
import { ItemCatalogo } from "./catalogo.types";
import { detectarSubtipoLivro } from "./catalogo.fontes";
import { ProvedorCatalogo } from "./provedor-catalogo.interface";

export interface GoogleBooksVolume {
  id: string;
  volumeInfo?: {
    maturityRating?: "MATURE" | "NOT_MATURE";
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
    language?: string;
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

export function mapGoogleBooksVolume(volume: GoogleBooksVolume): ItemCatalogo {
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
      coverUrl = `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbnObj.identifier)}-L.jpg?default=false`;
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
    ...(typeof info?.pageCount === "number" && info.pageCount > 0 ? { pageCount: info.pageCount } : {}),
    ...(info?.maturityRating === "MATURE" ? { adult: true } : {})
  };
}

@Injectable()
export class GoogleBooksService implements ProvedorCatalogo {
  private readonly logger = new Logger(GoogleBooksService.name);
  private readonly baseUrl = "https://www.googleapis.com/books/v1/volumes";

  // GET na API de volumes. Devolve null quando a resposta nao e 2xx ou a rede falha;
  // so registra no log o que nao for um 404 esperado.
  private async pedir<T>(caminho: string, params: URLSearchParams, contexto: string): Promise<T | null> {
    const chave = process.env.GOOGLE_BOOKS_API_KEY?.trim();
    if (chave) {
      params.set("key", chave);
    }
    const query = params.size > 0 ? `?${params.toString()}` : "";
    try {
      const response = await fetch(`${this.baseUrl}${caminho}${query}`, {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: "application/json" }
      });
      if (!response.ok) {
        if (response.status !== 404) {
          this.logger.warn(`Google Books (${contexto}) respondeu HTTP ${response.status}`);
        }
        return null;
      }
      return (await response.json()) as T;
    } catch (err) {
      this.logger.error(`Erro no Google Books (${contexto}):`, err);
      return null;
    }
  }

  async buscar(query: string, limite = 20): Promise<ItemCatalogo[]> {
    const termo = query?.trim() || "ficcao";
    const params = new URLSearchParams({
      q: termo,
      langRestrict: "pt",
      projection: "lite",
      maxResults: String(Math.min(Math.max(1, limite), 40))
    });
    const data = await this.pedir<GoogleBooksSearchResponse>("", params, `busca "${termo}"`);
    if (!Array.isArray(data?.items)) {
      return [];
    }
    return data.items
      .filter((vol) => {
        const lang = vol.volumeInfo?.language?.toLowerCase();
        // Volumes em espanhol vazam no filtro langRestrict=pt.
        if (lang && lang.startsWith("es")) {
          return false;
        }
        return Boolean(vol.volumeInfo?.title?.trim());
      })
      .map(mapGoogleBooksVolume);
  }

  async buscarPorId(id: string): Promise<ItemCatalogo | null> {
    const volume = await this.volume(id);
    return volume ? mapGoogleBooksVolume(volume) : null;
  }

  // Volume cru (sinopse, paginas, nota), usado pela fonte de livros em fontes/google-books.ts.
  async volume(id: string): Promise<GoogleBooksVolume | null> {
    const volumeId = id?.trim().replace(/^media_gbooks_/, "");
    if (!volumeId) {
      return null;
    }
    const volume = await this.pedir<GoogleBooksVolume>(
      `/${encodeURIComponent(volumeId)}`,
      new URLSearchParams(),
      `volume "${volumeId}"`
    );
    return volume?.id ? volume : null;
  }
}
