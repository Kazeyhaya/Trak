import { CatalogItem } from "./catalogo.types";

/**
 * Contrato unificado (Strategy / Adapter) para provedores externos de mídia no Catálogo.
 * Qualquer integração externa (Google Books, Hardcover, IGDB, etc.) que assine este contrato
 * deve retornar itens já normalizados no formato `CatalogItem`.
 */
export interface ProvedorCatalogo {
  buscar(query: string, limit?: number): Promise<CatalogItem[]>;
  buscarPorId(id: string): Promise<CatalogItem | null>;
}

export type IProvedorCatalogo = ProvedorCatalogo;
