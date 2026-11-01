import { API_BASE_URL } from "./api-base";

export type MediaType = "MOVIE" | "SERIES" | "GAME" | "BOOK";

export type SubtipoMidia = "ANIME" | "ANIMACAO" | "NOVELA" | "DORAMA" | "MANGA" | "HQ";

export type CatalogItem = {
  id: string;
  externalId: string;
  source: string;
  type: MediaType;
  subtype?: SubtipoMidia | null;
  title: string;
  coverUrl: string | null;
  synopsis: string | null;
  releaseYear: number | null;
  pageCount?: number | null;
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
    id: "media_gbooks_OL27448W",
    externalId: "OL27448W",
    source: "gbooks",
    type: "BOOK",
    title: "O Senhor dos Anéis",
    coverUrl: null,
    synopsis: "Clássico da fantasia épica de J. R. R. Tolkien.",
    releaseYear: 1954
  },
  {
    id: "tmdb_movie_129",
    externalId: "129",
    source: "tmdb",
    type: "MOVIE",
    title: "A Viagem de Chihiro",
    coverUrl: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
    synopsis: "Uma garota entra em um mundo mágico governado por deuses, bruxas e espíritos.",
    releaseYear: 2001
  }
];


// Busca usada pelos Server Components (opcionalmente autenticada via token).
export async function fetchJson<T>(path: string, token?: string | null): Promise<T | null> {
  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      headers,
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

export function obterIdiomaUsuario(): string {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem("trak:language");
      if (stored === "en-US" || stored === "pt-BR") return stored;
    } catch {
      // ignora
    }
  }
  return "pt-BR";
}

export async function getCatalogItems(query = "", type = "", genre = "", lang = "") {
  const params = new URLSearchParams();
  const cleanQuery = query.trim().slice(0, 50);
  if (cleanQuery) {
    params.set("q", cleanQuery);
  }
  if (type) {
    params.set("type", type);
  }
  if (genre) {
    params.set("genre", genre);
  }
  const idioma = lang || obterIdiomaUsuario();
  if (idioma) {
    params.set("lang", idioma);
  }

  const suffix = params.size > 0 ? `?${params}` : "";
  const items = await fetchJson<CatalogItem[]>(`/catalogo${suffix}`);

  return items ? { items, offline: false } : { items: fallbackItems, offline: true };
}

export async function getCatalogItemById(id: string, lang = "") {
  const idioma = lang || obterIdiomaUsuario();
  const query = idioma ? `?lang=${encodeURIComponent(idioma)}` : "";
  const item = await fetchJson<CatalogItem>(`/catalogo/${encodeURIComponent(id)}${query}`);

  return item ?? fallbackItems.find((entry) => entry.id === id) ?? null;
}

export function getMediaTypeLabel(type: MediaType, subtype?: string | null, lang = "pt-BR") {
  const isEn = lang === "en-US";
  if (subtype === "NOVELA") {
    return isEn ? "Telenovela" : "Novela";
  }
  if (subtype === "DORAMA") {
    return isEn ? "K-Drama" : "Dorama";
  }
  if (subtype === "ANIME") {
    return "Anime";
  }
  if (subtype === "ANIMACAO") {
    return isEn ? "Animation" : "Animação";
  }
  if (subtype === "MANGA") {
    return "Mangá";
  }
  if (subtype === "HQ") {
    return isEn ? "Comic" : "HQ";
  }
  switch (type) {
    case "MOVIE":
      return isEn ? "Movie" : "Filme";
    case "SERIES":
      return isEn ? "Series" : "Série";
    case "GAME":
      return isEn ? "Game" : "Jogo";
    case "BOOK":
      return isEn ? "Book" : "Livro";
  }
}
