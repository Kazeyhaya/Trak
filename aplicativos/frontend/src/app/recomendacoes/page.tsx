import type { Metadata } from "next";

import { AuthGuard } from "../../componentes/auth-guard";
import { RecommendationsShell } from "../../componentes/recommendations-shell";

export const metadata: Metadata = { title: "Trak | Para você" };

export default function RecomendacoesPage() {
  return (
    <AuthGuard>
      <RecommendationsShell />
    </AuthGuard>
  );
}
