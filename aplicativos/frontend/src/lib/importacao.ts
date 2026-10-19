import type { LetterboxdList } from "./api";

export const LIMITE_ARQUIVO_BYTES = 5_000_000;

// Deduz a lista do Letterboxd pelo nome do arquivo exportado (watchlist.csv etc.).
export function listaPeloNome(nomeArquivo: string): LetterboxdList {
  const nome = nomeArquivo.toLowerCase();
  if (nome.includes("watchlist")) {
    return "watchlist";
  }
  if (nome.includes("rating")) {
    return "ratings";
  }
  if (nome.includes("diary")) {
    return "diary";
  }
  return "watched";
}

export function validarArquivo(arquivo: File, extensoes: string[]) {
  if (!extensoes.some((ext) => arquivo.name.toLowerCase().endsWith(ext))) {
    return `Envie um arquivo ${extensoes.join(" ou ")}.`;
  }
  if (arquivo.size > LIMITE_ARQUIVO_BYTES) {
    return "Arquivo muito grande (máximo de 5 MB).";
  }
  return null;
}
