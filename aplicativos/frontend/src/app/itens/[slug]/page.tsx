import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ItemShell } from "../../../componentes/item-shell";
import { getCatalogItemById, getMediaTypeLabel } from "../../../lib/catalogo-api";

type ItemPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

// Evita buscar o mesmo item duas vezes (metadata + pagina).
const getItem = cache(getCatalogItemById);

// Pagina publica: o servidor renderiza o conteudo para buscadores e para a
// previa de links compartilhados. Os dados pessoais carregam no cliente.
export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getItem(slug);

  if (!item) {
    return { title: "Trak | Item não encontrado" };
  }

  const title = `${item.title}${item.releaseYear ? ` (${item.releaseYear})` : ""} | Trak`;
  const description = item.synopsis?.slice(0, 200) ?? `${getMediaTypeLabel(item.type)} para acompanhar no Trak.`;

  return {
    title,
    description,
    alternates: { canonical: `/itens/${item.id}` },
    openGraph: {
      title,
      description,
      type: item.type === "MOVIE" ? "video.movie" : item.type === "SERIES" ? "video.tv_show" : item.type === "BOOK" ? "book" : "website",
      images: item.coverUrl ? [{ url: item.coverUrl }] : undefined
    },
    twitter: { card: item.coverUrl ? "summary_large_image" : "summary", title, description }
  };
}

export default async function ItemPage({ params }: ItemPageProps) {
  const { slug } = await params;
  const item = await getItem(slug);

  if (!item) {
    notFound();
  }

  return <ItemShell item={item} />;
}
