// Uma pagina de uma lista longa (feed, comentarios, seguidores): os itens e o cursor da
// proxima, ou null quando acabou.
export type Pagina<T> = { items: T[]; proximo: string | null };

// Tambem aceita a resposta antiga (lista simples), para o site nao quebrar se for publicado
// antes da API.
export function comoPagina<T>(resposta: T[] | Pagina<T>): Pagina<T> {
  return Array.isArray(resposta)
    ? { items: resposta, proximo: null }
    : { items: resposta.items ?? [], proximo: resposta.proximo ?? null };
}

export function comCursor(caminho: string, cursor?: string | null) {
  return cursor
    ? `${caminho}${caminho.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(cursor)}`
    : caminho;
}
