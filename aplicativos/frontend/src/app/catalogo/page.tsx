import type { Metadata } from "next";

import { CatalogShell } from "../../componentes/catalog-shell";
import { getCatalogItems } from "../../lib/catalogo-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trak | Catálogo",
  description: "Descubra filmes, séries, jogos e livros para acompanhar no Trak"
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
    <CatalogShell items={items} offline={offline} query={query} typeFilter={typeFilter} />
  );
}
