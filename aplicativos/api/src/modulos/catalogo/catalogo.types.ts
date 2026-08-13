export type TipoMidia = "MOVIE" | "SERIES" | "GAME" | "BOOK";

export interface ItemCatalogo {
  id: string;
  externalId: string;
  source: string;
  type: TipoMidia;
  title: string;
  coverUrl?: string;
  synopsis?: string;
  releaseYear?: number;
}
