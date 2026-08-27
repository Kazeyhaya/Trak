export type TipoMidia = "MOVIE" | "SERIES" | "GAME" | "BOOK";

export type FonteCatalogo = "tmdb" | "rawg" | "openlibrary";

export interface ItemCatalogo {
  id: string;
  externalId: string;
  source: FonteCatalogo;
  type: TipoMidia;
  title: string;
  coverUrl: string | null;
  synopsis: string | null;
  releaseYear: number | null;
}
