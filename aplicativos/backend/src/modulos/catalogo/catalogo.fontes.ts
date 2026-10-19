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
};

export type RawgItem = {
  id: number;
  name: string;
  background_image: string | null;
  released: string | null;
  description_raw?: string;
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
    // O RAWG entrega a imagem em resolucao original; a versao redimensionada e bem mais leve.
    coverUrl: item.background_image?.replace("/media/games/", "/media/resize/640/-/games/") ?? null,
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
