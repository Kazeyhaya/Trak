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
  return items ?? [];
}

export async function getCatalogItemById(id: string) {
  const item = await fetchJson<CatalogItem>(`/catalogo/${encodeURIComponent(id)}`);

  if (item) {
    return item;
  }

  return null;
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