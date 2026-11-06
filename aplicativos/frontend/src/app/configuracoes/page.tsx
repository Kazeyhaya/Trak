import type { Metadata } from "next";

import { AuthGuard } from "../../componentes/auth-guard";
import { ConfiguracoesShell } from "../../componentes/configuracoes/configuracoes-shell";
import { secaoValida } from "../../lib/configuracoes";

export const metadata: Metadata = { title: "Trak | Configurações" };

export default async function ConfiguracoesPage({ searchParams }: { searchParams: Promise<{ secao?: string }> }) {
  const { secao } = await searchParams;
  return (
    <AuthGuard>
      <ConfiguracoesShell secaoInicial={secaoValida(secao)} />
    </AuthGuard>
  );
}
