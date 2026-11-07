// Resolve o link de streaming/loja para um provedor de catalogo.
export function resolveProviderUrl(providerName: string, title: string, rawUrl?: string | null): string {
  const n = providerName.toLowerCase();
  const q = encodeURIComponent(title.trim());

  // Se ja for um link profundo de loja (ex.: pagina especifica do jogo na Steam/GOG/OpenLibrary), preserva.
  if (
    rawUrl &&
    !rawUrl.includes("themoviedb.org") &&
    !/^https?:\/\/[^/]+\/?$/.test(rawUrl.trim())
  ) {
    return rawUrl;
  }

  if (n.includes("netflix")) return `https://www.netflix.com/search?q=${q}`;
  if (n.includes("amazon") || n.includes("prime video")) return `https://www.primevideo.com/search?phrase=${q}`;
  if (n.includes("apple tv") || n.includes("itunes")) return `https://tv.apple.com/br/search?term=${q}`;
  if (n.includes("disney")) return `https://www.disneyplus.com/pt-br`;
  if (n === "max" || n.includes("hbo max") || n.includes("max amazon")) return `https://play.max.com/search?q=${q}`;
  if (n.includes("globoplay") || n.includes("telecine")) return `https://globoplay.globo.com/busca/?q=${q}`;
  if (n.includes("crunchyroll")) return `https://www.crunchyroll.com/pt-br/search?q=${q}`;
  if (n.includes("paramount")) return `https://www.paramountplus.com/br/`;
  if (n.includes("claro")) return `https://www.clarotvmais.com.br/`;
  if (n.includes("google play") && !n.includes("game")) return `https://tv.google/search?q=${q}`;
  if (n.includes("google tv")) return `https://tv.google/search?q=${q}`;
  if (n.includes("youtube")) return `https://www.youtube.com/results?search_query=${q}`;
  if (n.includes("plex")) return `https://watch.plex.tv/search?q=${q}`;
  if (n.includes("fandango") || n.includes("vudu")) {
    return `https://athome.fandango.com/content/browse/search?searchString=${q}`;
  }
  if (n.includes("mubi")) return `https://mubi.com/pt/search/films?query=${q}`;
  if (n.includes("looke")) return `https://www.looke.com.br/search/${q}`;
  if (n.includes("pluto")) return `https://pluto.tv/br/search`;
  if (n.includes("mercado play") || n.includes("mercado livre")) return `https://play.mercadolivre.com.br/`;
  if (n.includes("steam")) return `https://store.steampowered.com/search/?term=${q}`;
  if (n.includes("playstation")) return `https://store.playstation.com/pt-br/search/${q}`;
  if (n.includes("xbox")) return `https://www.xbox.com/pt-br/Search/Results?q=${q}`;
  if (n.includes("nintendo")) return `https://www.nintendo.com/pt-br/search/#q=${q}`;
  if (n.includes("epic")) return `https://store.epicgames.com/pt-BR/browse?q=${q}`;
  if (n.includes("gog")) return `https://www.gog.com/en/games?query=${q}`;
  if (n.includes("itch")) return `https://itch.io/search?q=${q}`;
  if (n.includes("microsoft")) return `https://www.microsoft.com/pt-br/search/explore?q=${q}`;

  return rawUrl || `https://www.google.com/search?q=${encodeURIComponent(`${title} ${providerName}`)}`;
}
