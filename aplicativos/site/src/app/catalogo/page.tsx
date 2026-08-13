import type { Metadata } from "next";

import { CatalogShell } from "../../componentes/catalog-shell";
import { getCatalogItems } from "../../lib/catalogo-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trak | Catalogo",
  description: "Catalogo inicial do Trak com filtros e itens em destaque"
};

export default async function CatalogoPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; type?: string }>;
}) {
  const items = await getCatalogItems();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <CatalogShell
      items={items}
      query={resolvedSearchParams?.q ?? ""}
      typeFilter={resolvedSearchParams?.type ?? ""}
    />
  );
}