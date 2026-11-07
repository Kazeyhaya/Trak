import { BadRequestException } from "@nestjs/common";

import { falha } from "./erros";

// O PostgREST do Supabase devolve no maximo 1000 linhas por consulta e corta o resto
// sem avisar. Para leituras que precisam de tudo (a estante inteira, os favoritos),
// `lerTodas` pede de 1000 em 1000 ate acabar. A consulta precisa de uma ordem estavel
// (terminando numa coluna unica), senao uma linha pode repetir ou sumir entre paginas.
const TAMANHO_PAGINA = 1000;

// O tipo das linhas vem de quem chama: com select dinamico a biblioteca nao consegue inferi-lo.
type Pagina = PromiseLike<{ data: unknown; error: { message: string } | null }>;

export async function lerTodas<T>(pagina: (de: number, ate: number) => Pagina): Promise<T[]> {
  const todas: T[] = [];
  for (let de = 0; ; de += TAMANHO_PAGINA) {
    const { data, error } = await pagina(de, de + TAMANHO_PAGINA - 1);
    falha(error);
    const linhas = (data ?? []) as T[];
    todas.push(...linhas);
    if (linhas.length < TAMANHO_PAGINA) {
      return todas;
    }
  }
}

// Filtros .in() vao na URL; com milhares de ids (a estante inteira, todos os seguidos)
// ela passa do limite do PostgREST. `emBlocos` divide os valores em blocos e junta as
// respostas. Cada bloco deve devolver no maximo algumas centenas de linhas.
const TAMANHO_BLOCO = 150;

export async function emBlocos<T>(valores: string[], consulta: (bloco: string[]) => Pagina): Promise<T[]> {
  const unicos = [...new Set(valores)];
  const blocos: string[][] = [];
  for (let i = 0; i < unicos.length; i += TAMANHO_BLOCO) {
    blocos.push(unicos.slice(i, i + TAMANHO_BLOCO));
  }
  const respostas = await Promise.all(blocos.map((bloco) => consulta(bloco)));
  return respostas.flatMap(({ data, error }) => {
    falha(error);
    return (data ?? []) as T[];
  });
}

// Cursor das listas que crescem sem limite (feed, comentarios, seguidores): a data e o
// id da ultima linha recebida, que desempatam itens criados no mesmo instante. Vai para
// o site como texto opaco (base64url) e volta no parametro "cursor".
export type Cursor = { em: string; id: string };

export function criarCursor(em: string, id: string): string {
  return Buffer.from(JSON.stringify({ em, id })).toString("base64url");
}

export function lerCursor(texto?: string | null): Cursor | null {
  if (!texto) {
    return null;
  }
  // Um cursor legitimo tem menos de 200 caracteres; maior que isso nem tenta decodificar.
  if (texto.length > 300) {
    throw new BadRequestException("Cursor de paginação inválido.");
  }
  try {
    const cursor = JSON.parse(Buffer.from(texto, "base64url").toString("utf8")) as Partial<Cursor>;
    if (typeof cursor.em === "string" && !Number.isNaN(Date.parse(cursor.em)) && typeof cursor.id === "string") {
      return { em: cursor.em, id: cursor.id };
    }
  } catch {
    // cai no erro abaixo
  }
  throw new BadRequestException("Cursor de paginação inválido.");
}

// Filtro "depois do cursor" numa lista ordenada por data e id decrescentes, no formato
// do .or() do PostgREST. Os valores vao entre aspas porque a data tem ":" e ".".
export function filtroAntesDe(cursor: Cursor, colunaData: string, colunaId: string): string {
  const em = JSON.stringify(cursor.em);
  const id = JSON.stringify(cursor.id);
  return `${colunaData}.lt.${em},and(${colunaData}.eq.${em},${colunaId}.lt.${id})`;
}

// Recebe uma linha a mais que o pedido: se ela veio, ha proxima pagina.
export function fecharPagina<T>(linhas: T[], limite: number, chave: (linha: T) => Cursor) {
  const itens = linhas.slice(0, limite);
  const ultima = itens[itens.length - 1];
  const proximo = linhas.length > limite && ultima ? chave(ultima) : null;
  return { itens, proximo: proximo ? criarCursor(proximo.em, proximo.id) : null };
}
