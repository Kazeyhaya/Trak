// Rotas que exigem login. Catalogo, itens, perfis publicos e a landing sao abertos.
export const ROTAS_PRIVADAS = ["/painel", "/feed", "/recomendacoes", "/recap", "/importar", "/perfil", "/moderacao"];

export function ehRotaPrivada(pathname: string) {
  return ROTAS_PRIVADAS.some((rota) => pathname === rota || pathname.startsWith(`${rota}/`));
}

// So aceita caminhos internos, para o ?next= nao virar um redirecionamento aberto.
export function destinoSeguro(next: string | null | undefined, padrao = "/painel") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return padrao;
  }
  return next;
}
