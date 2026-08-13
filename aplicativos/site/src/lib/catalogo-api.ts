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

const fallbackItems: CatalogItem[] = [
  {
    id: "media_tmdb_550",
    externalId: "550",
    source: "tmdb",
    type: "MOVIE",
    title: "Fight Club",
    coverUrl: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    synopsis:
      "Um homem desiludido encontra um vendedor carismatico e inicia um clube secreto de luta.",
    releaseYear: 1999
  },
  {
    id: "media_tmdb_1399",
    externalId: "1399",
    source: "tmdb",
    type: "SERIES",
    title: "Game of Thrones",
    coverUrl: "https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg",
    synopsis: "Familias nobres disputam o controle dos Sete Reinos de Westeros.",
    releaseYear: 2011
  },
  {
    id: "media_rawg_3498",
    externalId: "3498",
    source: "rawg",
    type: "GAME",
    title: "Grand Theft Auto V",
    coverUrl: "https://media.rawg.io/media/games/456/456dea5e1c7e3cd07060c14e96612001.jpg",
    synopsis: "Jogo de mundo aberto com narrativa criminal e multiplayer massivo.",
    releaseYear: 2013
  },
  {
    id: "media_openlibrary_OL82563W",
    externalId: "OL82563W",
    source: "openlibrary",
    type: "BOOK",
    title: "The Lord of the Rings",
    coverUrl: null,
    synopsis: "Classico da fantasia epica de J. R. R. Tolkien.",
    releaseYear: 1954
  }
];

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getCatalogItems() {
  const items = await fetchJson<CatalogItem[]>("/catalogo");
  return items ?? fallbackItems;
}

export async function getCatalogItemById(id: string) {
  const item = await fetchJson<CatalogItem>(`/catalogo/${encodeURIComponent(id)}`);

  if (item) {
    return item;
  }

  return fallbackItems.find((entry) => entry.id === id) ?? null;
}

export function getMediaTypeLabel(type: MediaType) {
  switch (type) {
    case "MOVIE":
      return "Movie";
    case "SERIES":
      return "Series";
    case "GAME":
      return "Game";
    case "BOOK":
      return "Book";
  }
}