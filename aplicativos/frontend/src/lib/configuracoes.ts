// Regras da pagina de configuracoes que nao dependem de React (testadas em configuracoes.test.ts).

export const SECOES = [
  { id: "perfil", rotulo: "Perfil" },
  { id: "aparencia", rotulo: "Aparência" },
  { id: "privacidade", rotulo: "Privacidade e conteúdo" },
  { id: "conta", rotulo: "Conta" }
] as const;

export type Secao = (typeof SECOES)[number]["id"];

export function secaoValida(valor: string | undefined | null): Secao {
  return SECOES.find((secao) => secao.id === valor)?.id ?? "perfil";
}

// So os campos que mudaram em relacao ao que esta salvo: e o que a secao envia.
export function camposAlterados<T extends Record<string, unknown>>(salvo: T, rascunho: T): Partial<T> {
  const alterados: Partial<T> = {};
  for (const chave of Object.keys(rascunho) as Array<keyof T>) {
    if (rascunho[chave] !== salvo[chave]) {
      alterados[chave] = rascunho[chave];
    }
  }
  return alterados;
}

// Idade completa em anos a partir de "AAAA-MM-DD" (a API confere de novo ao salvar).
export function idadeEm(nascimento: string, hoje = new Date()) {
  const [ano, mes, dia] = nascimento.split("-").map(Number);
  if (!ano || !mes || !dia) {
    return 0;
  }
  const fezAniversario = hoje.getMonth() + 1 > mes || (hoje.getMonth() + 1 === mes && hoje.getDate() >= dia);
  return hoje.getFullYear() - ano - (fezAniversario ? 0 : 1);
}
