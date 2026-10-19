import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { AuthGuard } from "../../../componentes/auth-guard";
import { ItemShell } from "../../../componentes/item-shell";
import { getCatalogItemById } from "../../../lib/catalogo-api";

type ItemPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

// Evita buscar o mesmo item duas vezes (metadata + pagina).
const getItem = cache(getCatalogItemById);

export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getItem(slug);

  return {
    title: item ? `Trak | ${item.title}` : "Trak | Item não encontrado",
    description: item?.synopsis ?? "Acompanhe este item no Trak"
  };
}

export default async function ItemPage({ params }: ItemPageProps) {
  const { slug } = await params;
  const item = await getItem(slug);

  if (!item) {
    notFound();
  }

  return (
    <AuthGuard>
      <ItemShell item={item} />
    </AuthGuard>
  );
}
