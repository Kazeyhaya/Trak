import type { Metadata } from "next";

import { AuthGuard } from "../../componentes/auth-guard";
import { CatalogShell } from "../../componentes/catalog-shell";
import { getCatalogItems } from "../../lib/catalogo-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trak | Catálogo",
  description: "Descubra filmes, séries e jogos para acompanhar no Trak"
};

export default async function CatalogoPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; type?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = resolvedSearchParams?.q ?? "";
  const typeFilter = resolvedSearchParams?.type ?? "";
  const { items, offline } = await getCatalogItems(query, typeFilter);

  return (
    <AuthGuard>
      <CatalogShell items={items} offline={offline} query={query} typeFilter={typeFilter} />
    </AuthGuard>
  );
}
