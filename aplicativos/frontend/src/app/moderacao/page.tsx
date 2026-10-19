import type { Metadata } from "next";

import { AuthGuard } from "../../componentes/auth-guard";
import { ModerationShell } from "../../componentes/moderation-shell";

export const metadata: Metadata = { title: "Trak | Moderação", robots: { index: false } };

export default function ModeracaoPage() {
  return (
    <AuthGuard>
      <ModerationShell />
    </AuthGuard>
  );
}
