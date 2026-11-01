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

const TITULOS_ANIME_CONHECIDOS = new Set([
  "bleach",
  "monster",
  "naruto",
  "naruto shippuden",
  "boruto",
  "one piece",
  "dragon ball",
  "dragon ball z",
  "dragon ball super",
  "dragon ball gt",
  "dragon ball daima",
  "jujutsu kaisen",
  "demon slayer",
  "kimetsu no yaiba",
  "attack on titan",
  "shingeki no kyojin",
  "death note",
  "fullmetal alchemist",
  "fullmetal alchemist brotherhood",
  "hunter x hunter",
  "chainsaw man",
  "one punch man",
  "my hero academia",
  "boku no hero academia",
  "frieren",
  "solo leveling",
  "neon genesis evangelion",
  "evangelion",
  "cowboy bebop",
  "code geass",
  "steins gate",
  "vinland saga",
  "berserk",
  "haikyu",
  "blue lock",
  "black clover",
  "fairy tail",
  "gintama",
  "yu yu hakusho",
  "inuyasha",
  "sailor moon",
  "saint seiya",
  "os cavaleiros do zodiaco",
  "tokyo ghoul",
  "mob psycho 100",
  "spy x family",
  "dandadan",
  "sakamoto days",
  "kaiju no 8",
  "cyberpunk edgerunners",
  "akira",
  "a viagem de chihiro",
  "spirited away",
  "your name",
  "kimi no na wa",
  "suzume",
  "princesa mononoke",
  "meu amigo totoro",
  "o castelo animado"
]);

const PREFIXOS_ANIME_CONHECIDOS = [
  "bleach",
  "dragon ball",
  "naruto",
  "one piece",
  "jujutsu kaisen",
  "demon slayer",
  "kimetsu no yaiba",
  "attack on titan",
  "shingeki no kyojin",
  "hunter x hunter",
  "fullmetal alchemist",
  "my hero academia",
  "boku no hero",
  "jojo s bizarre adventure",
  "jojo no kimyou na bouken",
  "neon genesis evangelion",
  "evangelion",
  "fate stay night",
  "fate zero",
  "sword art online",
  "tokyo revengers",
  "baki",
  "hajime no ippo",
  "slam dunk",
  "yugioh",
  "yu gi oh",
  "pokemon",
  "digimon",
  "inazuma eleven",
  "saint seiya",
  "cavaleiros do zodiaco",
  "frieren",
  "kusuriya no hitorigoto",
  "the apothecary diaries",
  "diarios de uma apotecaria"
];

const PADROES_SINOPSE_ANIME =
  /\b(anime|mang[aá]|shinigami|saiyajin|super saiyan|soul society|ichigo kurosaki|goku|vegeta|beerus|luffy|zoro|uzumaki naruto|konoha|hokage|uchiha|alquimista federal|elric|kenzo tenma|naoki urasawa|johan liebert|shonen|shounen|seinen|isekai|toei animation|studio pierrot|mappa|ufotable|madhouse|kyoto animation|wit studio|studio ghibli|hayao miyazaki)\b/i;

function normalizarTextoSimples(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function inferirSubtipoMidia(
  type: MediaType,
  subtype?: string | null,
  title?: string | null,
  synopsis?: string | null
): string | null {
  if (subtype) {
    return subtype;
  }

  const titulo = title ?? "";
  const sinopse = synopsis ?? "";

  if (type === "BOOK") {
    const texto = `${titulo} ${sinopse}`.toLowerCase();
    if (
      texto.includes("manga") ||
      texto.includes("mangá") ||
      texto.includes("manhwa") ||
      texto.includes("manhua")
    ) {
      return "MANGA";
    }
    if (
      texto.includes("comic") ||
      texto.includes("graphic novel") ||
      texto.includes("quadrinho") ||
      texto.includes("hq")
    ) {
      return "HQ";
    }
    return null;
  }

  if (type === "SERIES" || type === "MOVIE") {
    const tituloNorm = normalizarTextoSimples(titulo);
    if (
      TITULOS_ANIME_CONHECIDOS.has(tituloNorm) ||
      PREFIXOS_ANIME_CONHECIDOS.some(
        (pref) => tituloNorm === pref || tituloNorm.startsWith(`${pref} `)
      ) ||
      PADROES_SINOPSE_ANIME.test(`${titulo} ${sinopse}`)
    ) {
      return "ANIME";
    }
  }

  return null;
}

export function getMediaTypeLabel(
  type: MediaType,
  subtype?: string | null,
  lang = "pt-BR",
  title?: string | null,
  synopsis?: string | null
) {
  const isEn = lang === "en-US";
  const resolvedSubtype = inferirSubtipoMidia(type, subtype, title, synopsis);
  if (resolvedSubtype === "NOVELA") {
    return isEn ? "Telenovela" : "Novela";
  }
  if (resolvedSubtype === "DORAMA") {
    return isEn ? "K-Drama" : "Dorama";
  }
  if (resolvedSubtype === "ANIME") {
    return "Anime";
  }
  if (resolvedSubtype === "ANIMACAO") {
    return isEn ? "Animation" : "Animação";
  }
  if (resolvedSubtype === "MANGA") {
    return "Mangá";
  }
  if (resolvedSubtype === "HQ") {
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
