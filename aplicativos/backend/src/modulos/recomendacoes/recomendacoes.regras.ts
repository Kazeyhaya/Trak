import { ItemCatalogo } from "../catalogo/catalogo.types";

type RegistroBase = {
  mediaItemId: string;
  status: string;
  rating: number | null;
  favorite?: boolean;
};

export type Recomendacao = ItemCatalogo & { reason: string; score: number };

// Escolhe os itens que melhor representam o gosto do usuario: bem avaliados,
// favoritos ou concluidos. Abandonados e notas baixas nao entram.
export function escolherSementes<T extends RegistroBase>(registros: T[], favoritos: Set<string>, limite = 6) {
  const peso = (r: T) =>
    (r.rating ?? 0) * 2 + (favoritos.has(r.mediaItemId) ? 4 : 0) + (r.status === "COMPLETED" ? 2 : 0);

  return registros
    .filter((r) => r.status !== "DROPPED" && (r.rating === null || r.rating >= 4))
    .filter((r) => peso(r) > 0)
    .sort((a, b) => peso(b) - peso(a))
    .slice(0, limite);
}

// Junta as listas de relacionados, soma pontos por aparicao e remove o que o
// usuario ja acompanha.
export function ranquear(
  relacionados: Array<{ semente: string; itens: ItemCatalogo[] }>,
  jaAcompanhados: Set<string>,
  limite = 24
): Recomendacao[] {
  const mapa = new Map<string, Recomendacao>();

  for (const { semente, itens } of relacionados) {
    itens.forEach((item, posicao) => {
      if (jaAcompanhados.has(item.id)) {
        return;
      }
      // Itens no topo da lista de relacionados valem mais.
      const pontos = 1 + (itens.length - posicao) / itens.length;
      const atual = mapa.get(item.id);
      if (atual) {
        atual.score += pontos;
      } else {
        mapa.set(item.id, { ...item, reason: `Porque você curtiu ${semente}`, score: pontos });
      }
    });
  }

  return [...mapa.values()].sort((a, b) => b.score - a.score).slice(0, limite);
}
