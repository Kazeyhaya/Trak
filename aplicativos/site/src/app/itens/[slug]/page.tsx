import type { Metadata } from "next";

import { ItemShell } from "../../../componentes/item-shell";
import { getCatalogItemById } from "../../../lib/catalogo-api";

type ItemPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const item = await getCatalogItemById(resolvedParams.slug);

  return {
    title: `Trak | ${item?.title ?? decodeURIComponent(resolvedParams.slug)}`,
    description: "Detalhe base do item no site Trak"
  };
}

export default async function ItemPage({ params }: ItemPageProps) {
  const resolvedParams = await params;
  const item = await getCatalogItemById(resolvedParams.slug);

  return <ItemShell item={item} />;
}