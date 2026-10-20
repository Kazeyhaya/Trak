import { API_BASE_URL } from "./api-base";

export type MediaType = "MOVIE" | "SERIES" | "GAME" | "BOOK";

export type CatalogItem = {
  id: string;
  externalId: string;
  source: string;
  type: MediaType;
  title: string;
  coverUrl: string | null;
  synopsis: string | null;
  releaseYear: number | null;
};

// Exibidos apenas quando a API esta fora do ar. Os ids seguem o formato do
// backend (fonte_tipo_id) para que tracking e detalhe continuem funcionando.
const fallbackItems: CatalogItem[] = [
  {
    id: "tmdb_movie_550",
    externalId: "550",
    source: "tmdb",
    type: "MOVIE",
    title: "Clube da Luta",
    coverUrl: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    synopsis:
      "Um homem desiludido encontra um vendedor carismático e inicia um clube secreto de luta.",
    releaseYear: 1999
  },
  {
    id: "tmdb_series_1399",
    externalId: "1399",
    source: "tmdb",
    type: "SERIES",
    title: "Game of Thrones",
    coverUrl: "https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    synopsis: "Famílias nobres disputam o controle dos Sete Reinos de Westeros.",
    releaseYear: 2011
  },
  {
    id: "rawg_game_3498",
    externalId: "3498",
    source: "rawg",
    type: "GAME",
    title: "Grand Theft Auto V",
    coverUrl: "https://media.rawg.io/media/games/456/456dea5e1c7e3cd07060c14e96612001.jpg",
    synopsis: "Jogo de mundo aberto com narrativa criminal e multiplayer massivo.",
    releaseYear: 2013
  },
  {
    id: "openlibrary_book_OL27448W",
    externalId: "OL27448W",
    source: "openlibrary",
    type: "BOOK",
    title: "O Senhor dos Anéis",
    coverUrl: null,
    synopsis: "Clássico da fantasia épica de J. R. R. Tolkien.",
    releaseYear: 1954
  }
];


// Busca publica (sem login), usada pelos Server Components.
export async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getCatalogItems(query = "", type = "") {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("q", query.trim());
  }
  if (type) {
    params.set("type", type);
  }

  const suffix = params.size > 0 ? `?${params}` : "";
  const items = await fetchJson<CatalogItem[]>(`/catalogo${suffix}`);

  return items ? { items, offline: false } : { items: fallbackItems, offline: true };
}

export async function getCatalogItemById(id: string) {
  const item = await fetchJson<CatalogItem>(`/catalogo/${encodeURIComponent(id)}`);

  return item ?? fallbackItems.find((entry) => entry.id === id) ?? null;
}

export function getMediaTypeLabel(type: MediaType) {
  switch (type) {
    case "MOVIE":
      return "Filme";
    case "SERIES":
      return "Série";
    case "GAME":
      return "Jogo";
    case "BOOK":
      return "Livro";
  }
}
