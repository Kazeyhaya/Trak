import Link from "next/link";
import { FilterBar } from "./filter-bar";
import { MediaGrid } from "./media-grid";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiCard } from "./ui-card";
import { CatalogItem } from "../lib/catalogo-api";

type CatalogShellProps = {
  items: CatalogItem[];
  offline?: boolean;
  query?: string;
  typeFilter?: string;
  genreFilter?: string;
};

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

export function CatalogShell({
  items,
  offline = false,
  query = "",
  typeFilter = "",
  genreFilter = ""
}: CatalogShellProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedType = typeFilter.toLowerCase();

  // Com a API online a busca e o filtro ja vem aplicados; aqui so filtramos
  // os itens de exemplo usados quando a API esta indisponivel.
  const visibleItems = offline
    ? items.filter((item) => {
        const matchesQuery =
          !normalizedQuery ||
          `${item.title} ${item.source} ${item.releaseYear ?? ""}`.toLowerCase().includes(normalizedQuery);
        const matchesType =
          !normalizedType ||
          (normalizedType === "anime"
            ? item.id === "tmdb_movie_129"
            : item.type.toLowerCase() === normalizedType);

        return matchesQuery && matchesType;
      })
    : items;

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="content-hero">
        <div>
          <h1>Descubra filmes, séries, jogos e livros para acompanhar.</h1>
        </div>
      </section>

      <FilterBar key={`${query}|${typeFilter}|${genreFilter}`} />

      {offline && (
        <p className="auth-notice" role="status">
          Não foi possível conectar ao catálogo. Mostrando alguns exemplos enquanto isso.
        </p>
      )}

      {visibleItems.length === 0 ? (
        <CatalogEmptyState query={query} />
      ) : (
        <MediaGrid items={visibleItems} label={query ? "Resultados da busca" : "Itens em destaque"} />
      )}
    </main>
  );
}
