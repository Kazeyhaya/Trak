// Funcoes puras de formato de id e mapeamento das APIs externas.
import { FonteCatalogo, ItemCatalogo, TipoMidia } from "./catalogo.types";

export type TmdbItem = {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  genres?: Array<{ id: number; name: string }>;
  vote_average?: number;
  vote_count?: number;
  imdb_id?: string | null;
  external_ids?: { imdb_id?: string | null };
};

// Genero "Animacao" no TMDB (o mesmo id para filmes e series).
export const TMDB_GENERO_ANIMACAO = 16;

export const GENEROS_CATALOGO = [
  "acao",
  "aventura",
  "comedia",
  "drama",
  "ficcao",
  "fantasia",
  "terror",
  "romance",
  "misterio",
  "documentario",
  "suspense",
  "crime",
  "familia",
  "guerra",
  "historia",
  "musica",
  "faroeste",
  "rpg",
  "estrategia",
  "tiro",
  "plataforma",
  "corrida",
  "esportes",
  "luta",
  "simulacao",
  "puzzle",
  "indie",
  "biografia",
  "poesia",
  "autoajuda"
] as const;

export type GeneroCatalogo = (typeof GENEROS_CATALOGO)[number];

export const MAPA_GENEROS: Record<
  GeneroCatalogo,
  { tmdbMovie?: number; tmdbTv?: number; rawg?: string; openLibrary?: string }
> = {
  acao: { tmdbMovie: 28, tmdbTv: 10759, rawg: "action", openLibrary: "action_and_adventure" },
  aventura: { tmdbMovie: 12, tmdbTv: 10759, rawg: "adventure", openLibrary: "adventure" },
  comedia: { tmdbMovie: 35, tmdbTv: 35, openLibrary: "humor" },
  drama: { tmdbMovie: 18, tmdbTv: 18, openLibrary: "drama" },
  ficcao: { tmdbMovie: 878, tmdbTv: 10765, rawg: "shooter", openLibrary: "science_fiction" },
  fantasia: { tmdbMovie: 14, tmdbTv: 10765, rawg: "role-playing-games-rpg", openLibrary: "fantasy" },
  terror: { tmdbMovie: 27, tmdbTv: 9648, rawg: "action", openLibrary: "horror" },
  romance: { tmdbMovie: 10749, tmdbTv: 18, openLibrary: "romance" },
  misterio: { tmdbMovie: 9648, tmdbTv: 9648, rawg: "puzzle", openLibrary: "mystery_and_detective_stories" },
  documentario: { tmdbMovie: 99, tmdbTv: 99, openLibrary: "history" },
  suspense: { tmdbMovie: 53, tmdbTv: 9648, openLibrary: "thriller" },
  crime: { tmdbMovie: 80, tmdbTv: 80, openLibrary: "crime" },
  familia: { tmdbMovie: 10751, tmdbTv: 10751, rawg: "family", openLibrary: "juvenile_fiction" },
  guerra: { tmdbMovie: 10752, tmdbTv: 10768 },
  historia: { tmdbMovie: 36, openLibrary: "history" },
  musica: { tmdbMovie: 10402 },
  faroeste: { tmdbMovie: 37, tmdbTv: 37 },
  rpg: { rawg: "role-playing-games-rpg" },
  estrategia: { rawg: "strategy" },
  tiro: { rawg: "shooter" },
  plataforma: { rawg: "platformer" },
  corrida: { rawg: "racing" },
  esportes: { rawg: "sports" },
  luta: { rawg: "fighting" },
  simulacao: { rawg: "simulation" },
  puzzle: { rawg: "puzzle" },
  indie: { rawg: "indie" },
  biografia: { openLibrary: "biography" },
  poesia: { openLibrary: "poetry" },
  autoajuda: { openLibrary: "self-help" }
};

export type RawgItem = {
  id: number;
  name: string;
  background_image: string | null;
  released: string | null;
  description_raw?: string;
  rating?: number;
  metacritic?: number | null;
  genres?: Array<{ name: string; slug: string }>;
  stores?: Array<{ url?: string; store?: { name: string; domain?: string } }>;
};

export type OpenLibraryDoc = {
  key: string;
  title: string;
  cover_i?: number;
  // A API de assuntos (/subjects) usa cover_id em vez de cover_i.
  cover_id?: number | null;
  covers?: number[];
  first_publish_year?: number;
  first_publish_date?: string;
  description?: string | { value: string };
  subjects?: string[];
  ratings_average?: number;
};

export type IdParseado =
  | { source: "tmdb"; type: "MOVIE" | "SERIES"; externalId: string }
  | { source: "rawg"; type: "GAME"; externalId: string }
  | { source: "openlibrary"; type: "BOOK"; externalId: string };

const ID_PATTERN = /^(?:tmdb_(movie|series)_(\d+)|rawg_game_(\d+)|openlibrary_book_(OL\d+W))$/;

export function parsearId(id: string): IdParseado | null {
  const match = ID_PATTERN.exec(id);
  if (!match) {
    return null;
  }

  if (match[1]) {
    return { source: "tmdb", type: match[1] === "movie" ? "MOVIE" : "SERIES", externalId: match[2] };
  }
  if (match[3]) {
    return { source: "rawg", type: "GAME", externalId: match[3] };
  }
  return { source: "openlibrary", type: "BOOK", externalId: match[4] };
}

export function montarId(source: FonteCatalogo, type: TipoMidia, externalId: string | number) {
  if (source === "tmdb") {
    return `tmdb_${type === "MOVIE" ? "movie" : "series"}_${externalId}`;
  }
  return source === "rawg" ? `rawg_game_${externalId}` : `openlibrary_book_${externalId}`;
}

export function anoDe(date?: string | null) {
  const year = date?.match(/\d{4}/)?.[0];
  return year ? Number(year) : null;
}

export function mapearTmdb(item: TmdbItem, type: "MOVIE" | "SERIES"): ItemCatalogo {
  return {
    id: montarId("tmdb", type, item.id),
    externalId: String(item.id),
    source: "tmdb",
    type,
    title: item.title ?? item.name ?? "Sem titulo",
    coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    synopsis: item.overview || null,
    releaseYear: anoDe(item.release_date ?? item.first_air_date)
  };
}

export function mapearRawg(item: RawgItem): ItemCatalogo {
  return {
    id: montarId("rawg", "GAME", item.id),
    externalId: String(item.id),
    source: "rawg",
    type: "GAME",
    title: item.name,
    // Mantem a resolucao alta do RAWG para o otimizador do Next.js nao pixelar no recorte vertical (2:3).
    coverUrl: item.background_image ?? null,
    synopsis: item.description_raw || null,
    releaseYear: anoDe(item.released)
  };
}

export function mapearOpenLibrary(doc: OpenLibraryDoc): ItemCatalogo {
  const externalId = doc.key.replace("/works/", "");
  const coverId = doc.cover_i ?? doc.cover_id ?? doc.covers?.find((cover) => cover > 0);
  const descricao = typeof doc.description === "string" ? doc.description : doc.description?.value;

  return {
    id: montarId("openlibrary", "BOOK", externalId),
    externalId,
    source: "openlibrary",
    type: "BOOK",
    title: doc.title,
    coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
    synopsis: descricao?.trim() || null,
    releaseYear: doc.first_publish_year ?? anoDe(doc.first_publish_date)
  };
}

// Normaliza titulos para comparar resultados de busca (acentos, caixa, pontuacao).
export function normalizarTitulo(titulo: string) {
  return titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
