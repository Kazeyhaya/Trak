// Reescreve URLs de capa dos provedores para uma versão menor quando a imagem
// é exibida como miniatura (listas, carrosséis, vitrines). Evita baixar o
// pôster em resolução cheia para um card de 120px.

const LARGURAS_TMDB = [92, 154, 185, 342, 500, 780] as const;

const DOMINIOS_OTIMIZADOS = [
  "tmdb.org",
  "rawg.io",
  "openlibrary.org",
  "steamgriddb.com",
  "books.google.com",
  "hardcover.app",
  "images.igdb.com",
  "s4.anilist.co"
] as const;

export function ehDominioOtimizado(url: string | null | undefined): boolean {
  if (!url) return false;
  return DOMINIOS_OTIMIZADOS.some((d) => url.includes(d));
}

export function miniaturaCapa(url: string | null | undefined, larguraCss: number): string | null {
  if (!url) return null;

  // Considera telas de alta densidade (2x).
  const alvo = larguraCss * 2;

  if (url.includes("image.tmdb.org/t/p/")) {
    const largura = LARGURAS_TMDB.find((w) => w >= alvo) ?? 780;
    return url.replace(/\/t\/p\/(w\d+|original)\//, `/t/p/w${largura}/`);
  }

  if (url.includes("media.rawg.io/media/games/")) {
    const largura = alvo <= 420 ? 420 : 640;
    return url.replace("media.rawg.io/media/games/", `media.rawg.io/media/resize/${largura}/-/games/`);
  }

  if (url.includes("images.igdb.com/igdb/image/upload/")) {
    const tamanho = alvo <= 180 ? "t_cover_small" : "t_cover_big";
    return url.replace(/\/t_[a-z0-9_]+\//, `/${tamanho}/`);
  }

  return url;
}
