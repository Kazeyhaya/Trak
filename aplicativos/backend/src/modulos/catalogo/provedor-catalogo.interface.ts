import { ItemCatalogo } from "./catalogo.types";

// O que um servico de fonte externa (Google Books, Hardcover, IGDB) precisa oferecer ao catalogo.
export interface ProvedorCatalogo {
  buscar(query: string, limit?: number): Promise<ItemCatalogo[]>;
  buscarPorId(id: string): Promise<ItemCatalogo | null>;
}
