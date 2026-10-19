import Link from "next/link";
import { FilterBar } from "./filter-bar";
import { MediaCard } from "./media-card";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiCard } from "./ui-card";
import { CatalogItem, getMediaTypeLabel } from "../lib/catalogo-api";

type CatalogShellProps = {
  items: CatalogItem[];
  offline?: boolean;
  query?: string;
  typeFilter?: string;
};

function buildMeta(item: CatalogItem) {
  const year = item.releaseYear ? `${item.releaseYear}` : "Sem ano";

  return `${year} · ${item.source.toUpperCase()}`;
}

function CatalogEmptyState({ query }: { query: string }) {
  return (
    <UiCard className="empty-state">
      <UiBadge tone="secondary">Sem resultados</UiBadge>
      <h3>{query ? `Nada encontrado para "${query}".` : "Nenhum item disponível."}</h3>
      <p>Tente outro termo ou remova o filtro de categoria.</p>
      <Link className="secondary-button" href="/catalogo">
        Limpar busca
      </Link>
    </UiCard>
  );
}

export function CatalogShell({ items, offline = false, query = "", typeFilter = "" }: CatalogShellProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedType = typeFilter.toLowerCase();

  // Com a API online a busca e o filtro ja vem aplicados; aqui so filtramos
  // os itens de exemplo usados quando a API esta indisponivel.
  const visibleItems = offline
    ? items.filter((item) => {
        const matchesQuery =
          !normalizedQuery ||
          `${item.title} ${item.source} ${item.releaseYear ?? ""}`.toLowerCase().includes(normalizedQuery);
        const matchesType = !normalizedType || item.type.toLowerCase() === normalizedType;

        return matchesQuery && matchesType;
      })
    : items;

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="content-hero">
        <div>
          <h1>Descubra, filtre e organize os itens que vão entrar no tracking.</h1>
        </div>
      </section>

      <FilterBar key={`${query}|${typeFilter}`} />

      {offline && (
        <p className="auth-notice" role="status">
          Não foi possível conectar ao catálogo. Mostrando alguns exemplos enquanto isso.
        </p>
      )}

      {visibleItems.length === 0 ? (
        <CatalogEmptyState query={query} />
      ) : (
        <section className="catalog-grid" aria-label={query ? "Resultados da busca" : "Itens em destaque"}>
          {visibleItems.map((item) => (
            <Link key={item.id} href={`/itens/${item.id}`}>
              <MediaCard
                type={getMediaTypeLabel(item.type)}
                title={item.title}
                meta={buildMeta(item)}
                coverUrl={item.coverUrl}
                progress={item.synopsis ?? undefined}
                accent="Detalhe"
              />
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
