import { CatalogItem } from "./catalogo.types";

/**
 * Contrato unificado (Strategy / Adapter) para provedores externos de mídia no Catálogo.
 * Qualquer integração externa (Google Books, Hardcover, IGDB, etc.) que assine este contrato
 * deve retornar itens já normalizados no formato `CatalogItem`.
 */
export interface IProvedorCatalogo {
  buscar(query: string, limit?: number): Promise<CatalogItem[]>;
  buscarPorId(id: string): Promise<CatalogItem | null>;
}
