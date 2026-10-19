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

export interface Temporada {
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
}

export interface Episodio {
  episodeNumber: number;
  name: string;
  airDate: string | null;
  overview: string | null;
  runtime: number | null;
}

export interface Novidade {
  kind: "NEW_EPISODE" | "UPCOMING_EPISODE" | "UPCOMING_RELEASE";
  date: string;
  label: string;
}
