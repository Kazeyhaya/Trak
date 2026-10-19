export type TipoMidia = "MOVIE" | "SERIES" | "GAME";

export type FonteCatalogo = "tmdb" | "rawg";

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
