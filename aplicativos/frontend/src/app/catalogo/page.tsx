import type { Metadata } from "next";

import { CatalogShell } from "../../componentes/catalog-shell";
import { getCatalogItems } from "../../lib/catalogo-api";
import { tokenDoServidor } from "../../lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trak | Catálogo",
  description: "Catálogo completo de filmes, séries, jogos e livros para acompanhar no Trak."
};

export default async function CatalogoPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; type?: string; genre?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawQuery = resolvedSearchParams?.q ?? "";
  const query = rawQuery.slice(0, 50);
  const typeFilter = resolvedSearchParams?.type ?? "";
  const genreFilter = resolvedSearchParams?.genre ?? "";
  const token = await tokenDoServidor();
  const { items, offline } = await getCatalogItems(query, typeFilter, genreFilter, "", token);

  return (
    <CatalogShell
      items={items}
      offline={offline}
      query={query}
      typeFilter={typeFilter}
      genreFilter={genreFilter}
    />
  );
}
