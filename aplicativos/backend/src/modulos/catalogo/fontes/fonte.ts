import { IdParseado } from "../catalogo.fontes";
import { ExtrasCatalogo, ItemCatalogo, Novidade, ProvedorOndeAssistir } from "../catalogo.types";

export type Idioma = "pt-BR" | "en-US";
export type NotaTrak = ExtrasCatalogo["trakRating"];
export type ParseadoDe<S extends IdParseado["source"]> = Extract<IdParseado, { source: S }>;

// O que cada fonte (TMDB, RAWG, IGDB, Open Library, Google Books, Hardcover) sabe fazer
// com um item seu. O CatalogoService escolhe a fonte pelo prefixo do id e delega.
export interface Fonte<P extends IdParseado = IdParseado> {
  item(p: P, id: string, idioma: Idioma): Promise<ItemCatalogo | null>;
  // notaTrak ja vem em andamento, para correr junto com as chamadas da fonte.
  extras(p: P, id: string, notaTrak: Promise<NotaTrak>): Promise<ExtrasCatalogo>;
  relacionados(p: P, id: string): Promise<ItemCatalogo[]>;
  // Capas alternativas alem da atual.
  capas(p: P, item: ItemCatalogo): Promise<string[]>;
  // Duracao estimada da obra inteira, em minutos.
  duracao(p: P, id: string): Promise<number | null>;
  novidade(p: P, agora: Date): Promise<Novidade | null>;
}

const DIA_MS = 24 * 60 * 60 * 1000;

// A data (AAAA-MM-DD) cai entre `antes` dias atras e `depois` dias a frente?
export function dentroDe(data: string | null | undefined, agora: Date, antes: number, depois: number) {
  if (!data) {
    return false;
  }
  const dias = (new Date(`${data}T00:00:00Z`).getTime() - agora.getTime()) / DIA_MS;
  return dias >= -antes && dias <= depois;
}

// Onde comprar ou procurar um livro pelo titulo.
export function lojasDeLivro(titulo: string, incluirGoogle = true): ProvedorOndeAssistir[] {
  if (!titulo) {
    return [];
  }
  const q = encodeURIComponent(titulo);
  const lojas: ProvedorOndeAssistir[] = [
    { name: "Amazon Livros", category: "STORE", url: `https://www.amazon.com.br/s?k=${q}&i=stripbooks` }
  ];
  if (incluirGoogle) {
    lojas.push({ name: "Google Livros", category: "READ", url: `https://www.google.com.br/search?tbm=bks&q=${q}` });
  }
  return lojas;
}

// Mediana das paginas das edicoes (ignora edicoes sem contagem).
export function medianaDePaginas(edicoes: Array<{ number_of_pages?: number }> | undefined) {
  const paginas = (edicoes ?? [])
    .map((e) => e.number_of_pages ?? 0)
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  return paginas.length ? paginas[Math.floor(paginas.length / 2)] : null;
}
