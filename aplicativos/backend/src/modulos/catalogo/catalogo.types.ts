export type TipoMidia = "MOVIE" | "SERIES" | "GAME" | "BOOK";

export type SubtipoMidia = "ANIME" | "ANIMACAO" | "NOVELA" | "DORAMA" | "MANGA" | "HQ";

export type FonteCatalogo = "tmdb" | "rawg" | "openlibrary" | "gbooks" | "hardcover";

export interface ItemCatalogo {
  id: string;
  externalId: string;
  source: FonteCatalogo;
  type: TipoMidia;
  subtype?: SubtipoMidia | null;
  title: string;
  coverUrl: string | null;
  synopsis: string | null;
  releaseYear: number | null;
}

export type CatalogItem = ItemCatalogo;
export type MediaType = TipoMidia;

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

export interface ProvedorOndeAssistir {
  name: string;
  category: "STREAMING" | "RENT" | "BUY" | "STORE" | "READ";
  url?: string | null;
}

export interface NotaExterna {
  source: string;
  value: string;
}

export interface ExtrasCatalogo {
  genres: string[];
  watchProviders: ProvedorOndeAssistir[];
  watchLink: string | null;
  trakRating: {
    average: number | null;
    count: number;
  };
  externalRatings: NotaExterna[];
}
