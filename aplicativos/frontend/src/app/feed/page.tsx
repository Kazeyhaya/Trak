import type { Metadata } from "next";

import { AuthGuard } from "../../componentes/auth-guard";
import { FeedShell } from "../../componentes/feed-shell";

export const metadata: Metadata = {
  title: "Trak | Feed",
  description: "O que as pessoas que você segue estão assistindo, jogando e lendo"
};

export default function FeedPage() {
  return (
    <AuthGuard>
      <FeedShell />
    </AuthGuard>
  );
}
