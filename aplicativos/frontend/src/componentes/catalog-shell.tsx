"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { FilterBar } from "./filter-bar";
import { MediaGrid } from "./media-grid";
import { SiteHeader } from "./site-header";
import { UiCard } from "./ui-card";
import { CatalogItem } from "../lib/catalogo-api";
import { getTrackingItems } from "../lib/api";
import { useAuth } from "../contextos/auth-context";
import { useI18n } from "../contextos/i18n-context";

type CatalogShellProps = {
  items: CatalogItem[];
  offline?: boolean;
  query?: string;
  typeFilter?: string;
  genreFilter?: string;
};

const ITENS_POR_PAGINA = 24;
const CHAVE_HERO_DISPENSADO = "trak:catalog:hero:dismissed";

// O servidor nao enxerga o localStorage. useSyncExternalStore renderiza a versao do
// servidor na hidratacao e so depois aplica a do navegador, sem erro de hidratacao.
const semAssinatura = () => () => {};
function heroDispensadoAntes() {
  try {
    return Boolean(window.localStorage.getItem(CHAVE_HERO_DISPENSADO));
  } catch {
    return false;
  }
}

function CatalogEmptyState({ query }: { query: string }) {
  const { t } = useI18n();
  const trimmed = query.trim();
  const displayQuery = trimmed.length > 50 ? `${trimmed.slice(0, 50)}…` : trimmed;
  return (
    <UiCard className="empty-state">
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
  const { user } = useAuth();
  const [customCovers, setCustomCovers] = useState<Record<string, string>>({});
  const filterKey = `${query}:${typeFilter}:${genreFilter}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  const [displayCount, setDisplayCount] = useState(ITENS_POR_PAGINA);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getTrackingItems()
      .then((records) => {
        if (!active) return;
        const map: Record<string, string> = {};
        for (const r of records) {
          if (r.mediaItemId && r.customCoverUrl) {
            map[r.mediaItemId] = r.customCoverUrl;
          }
        }
        setCustomCovers(map);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);
  const dispensadoAntes = useSyncExternalStore(semAssinatura, heroDispensadoAntes, () => false);
  const [dispensadoAgora, setDispensadoAgora] = useState(false);
  const showHero = !dispensadoAntes && !dispensadoAgora;
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedType = typeFilter.toLowerCase();

  function handleDismissHero() {
    setDispensadoAgora(true);
    try {
      window.localStorage.setItem(CHAVE_HERO_DISPENSADO, "true");
    } catch {
      // Sem localStorage (aba anonima, bloqueio): o hero volta na proxima visita.
    }
  }

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

  const paginatedItems = visibleItems.slice(0, displayCount).map((item) => {
    const customCover = customCovers[item.id];
    return customCover ? { ...item, coverUrl: customCover } : item;
  });
  const hasMore = visibleItems.length > displayCount;

  return (
    <main className="content-shell">
      <SiteHeader />

      {showHero && (
        <section className="content-hero catalog-hero">
          <div>
            <h1>Catálogo de filmes, séries, jogos e livros.</h1>
          </div>
          <button
            type="button"
            className="catalog-hero-dismiss"
            onClick={handleDismissHero}
            aria-label="Dispensar introdução"
            title="Dispensar introdução"
          >
            ✕
          </button>
        </section>
      )}

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
