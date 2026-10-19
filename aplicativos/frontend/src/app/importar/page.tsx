import type { Metadata } from "next";

import { AuthGuard } from "../../componentes/auth-guard";
import { ImportShell } from "../../componentes/import-shell";

export const metadata: Metadata = { title: "Trak | Importar histórico" };

export default function ImportarPage() {
  return (
    <AuthGuard>
      <ImportShell />
    </AuthGuard>
  );
}
