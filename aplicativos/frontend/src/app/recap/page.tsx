import type { Metadata } from "next";

import { AuthGuard } from "../../componentes/auth-guard";
import { RecapShell } from "../../componentes/recap-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trak | Retrospectiva (Recap)",
  description: "Sua retrospectiva do ano e escolha do seu Obra/Jogo do Ano no Trak"
};

export default function RecapPage() {
  return (
    <AuthGuard>
      <RecapShell />
    </AuthGuard>
  );
}
