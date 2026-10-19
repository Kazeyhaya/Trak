"use client";

import { useEffect, useState } from "react";

import { MediaGrid } from "./media-grid";
import { SectionHeading } from "./section-heading";
import { request } from "../lib/api";
import { CatalogItem } from "../lib/catalogo-api";

// Itens parecidos (recomendacoes do TMDB, mesmo genero no RAWG, mesmo assunto no Open Library).
export function RelatedItems({ mediaItemId }: { mediaItemId: string }) {
  const [items, setItems] = useState<CatalogItem[]>([]);

  useEffect(() => {
    let active = true;
    request<CatalogItem[]>(`/catalogo/${encodeURIComponent(mediaItemId)}/relacionados`)
      .then((data) => active && setItems(data.slice(0, 8)))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [mediaItemId]);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="content-panel">
      <SectionHeading eyebrow="Descubra" title="Parecidos com este" description="Sugestões com base neste item." />
      <MediaGrid items={items} />
    </section>
  );
}
