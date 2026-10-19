import Link from "next/link";

import { MediaCard } from "./media-card";
import { CatalogItem, getMediaTypeLabel } from "../lib/catalogo-api";

type MediaGridProps = {
  items: Array<CatalogItem & { reason?: string }>;
  label?: string;
};

// Grade de cards usada no catalogo, recomendacoes, perfis e landing.
export function MediaGrid({ items, label = "Itens" }: MediaGridProps) {
  return (
    <section className="catalog-grid" aria-label={label}>
      {items.map((item) => (
        <Link key={item.id} href={`/itens/${item.id}`}>
          <MediaCard
            type={getMediaTypeLabel(item.type)}
            title={item.title}
            meta={`${item.releaseYear ?? "Sem ano"} · ${item.source.toUpperCase()}`}
            coverUrl={item.coverUrl}
            progress={item.reason ?? item.synopsis ?? undefined}
            accent="Detalhe"
          />
        </Link>
      ))}
    </section>
  );
}
