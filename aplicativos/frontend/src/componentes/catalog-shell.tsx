"use client";

import { useState } from "react";
import Link from "next/link";
import { FilterBar } from "./filter-bar";
import { MediaGrid } from "./media-grid";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiCard } from "./ui-card";
import { CatalogItem } from "../lib/catalogo-api";
import { useI18n } from "../contextos/i18n-context";

type CatalogShellProps = {
  items: CatalogItem[];
  offline?: boolean;
  query?: string;
  typeFilter?: string;
  genreFilter?: string;
};

const ITENS_POR_PAGINA = 24;

function CatalogEmptyState({ query }: { query: string }) {
  const { t } = useI18n();
  const trimmed = query.trim();
  const displayQuery = trimmed.length > 50 ? `${trimmed.slice(0, 50)}…` : trimmed;
  return (
    <UiCard className="empty-state">
      <UiBadge tone="secondary">{t("catalog.noResults", "Sem resultados")}</UiBadge>
      <h3 className="empty-state-title">
        {displayQuery ? `${t("catalog.noResultsFor", "Nada encontrado para")} "${displayQuery}".` : "Nenhum item disponível."}
      </h3>
      <p>Tente outro termo ou remova o filtro de categoria.</p>
      <Link className="secondary-button" href="/catalogo">
        {t("catalog.clearSearch", "Limpar busca")}
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
  void genreFilter;
  const filterKey = `${query}:${typeFilter}:${genreFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  const [displayCount, setDisplayCount] = useState(ITENS_POR_PAGINA);
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedType = typeFilter.toLowerCase();

  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setDisplayCount(ITENS_POR_PAGINA);
  }

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

  const paginatedItems = visibleItems.slice(0, displayCount);
  const hasMore = visibleItems.length > displayCount;

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="content-hero">
        <div>
          <h1>Descubra filmes, séries, jogos e livros para acompanhar.</h1>
        </div>
      </section>

      <FilterBar />

      {offline && (
        <p className="auth-notice" role="status">
          Não foi possível conectar ao catálogo. Mostrando alguns exemplos enquanto isso.
        </p>
      )}

      {visibleItems.length === 0 ? (
        <CatalogEmptyState query={query} />
      ) : (
        <>
          <MediaGrid items={paginatedItems} label={query ? "Resultados da busca" : "Itens em destaque"} />
          {hasMore && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDisplayCount((prev) => prev + ITENS_POR_PAGINA)}
              >
                Carregar mais obras ({paginatedItems.length} de {visibleItems.length})
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
