import Link from "next/link";

import { FilterBar } from "./filter-bar";
import { MediaCard } from "./media-card";
import { SectionHeading } from "./section-heading";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiCard } from "./ui-card";
import { CatalogItem, getMediaTypeLabel } from "../lib/catalogo-api";

type CatalogShellProps = {
  items: CatalogItem[];
  query?: string;
  typeFilter?: string;
};

function buildMeta(item: CatalogItem) {
  const year = item.releaseYear ? `${item.releaseYear}` : "Sem ano";
  const synopsis = item.synopsis ?? "Sem sinopse";

  return `${year} · ${item.source.toUpperCase()} · ${synopsis}`;
}

function CatalogEmptyState() {
  return (
    <UiCard className="empty-state">
      <UiBadge tone="secondary">Sem resultados</UiBadge>
      <h3>Nenhum item encontrou correspondencia.</h3>
      <p>
        Ajuste a busca ou aguarde o catálogo ser populado pela integração com a API.
      </p>
      <Link className="secondary-button" href="/painel">
        Ver radar pessoal
      </Link>
    </UiCard>
  );
}

export function CatalogShell({ items, query = "", typeFilter = "" }: CatalogShellProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const normalizedType = typeFilter.toLowerCase();

  const visibleItems = items.filter((item) => {
    const matchesQuery =
      !normalizedQuery ||
      `${item.title} ${item.source} ${item.releaseYear ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery);

    const matchesType =
      !normalizedType ||
      (normalizedType === "movie" && item.type === "MOVIE") ||
      (normalizedType === "series" && item.type === "SERIES") ||
      (normalizedType === "game" && item.type === "GAME") ||
      (normalizedType === "book" && item.type === "BOOK");

    return matchesQuery && matchesType;
  });

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="content-hero">
        <div>
          <UiBadge tone="primary">Catalogo</UiBadge>
          <h1>Descubra, filtre e organize os itens que vao entrar no tracking.</h1>
          <p>
            Esta pagina já prepara a experiência de busca e descoberta para quando a
            API estiver totalmente conectada.
          </p>
        </div>

        <div className="content-summary">
          <UiBadge tone="secondary">Pronto para integração</UiBadge>
          <strong>Busca + favoritos + pagina de item</strong>
          <p>
            A estrutura visual já está pensada para encaixar a consulta da API sem
            refazer a navegação principal.
          </p>
        </div>
      </section>

      <FilterBar />

      {visibleItems.length === 0 ? (
        <CatalogEmptyState />
      ) : (
        <section className="catalog-grid" aria-label="Itens em destaque">
          {visibleItems.map((item) => (
            <Link key={item.id} href={`/itens/${item.id}`}>
              <MediaCard
                type={getMediaTypeLabel(item.type)}
                title={item.title}
                meta={buildMeta(item)}
                progress={item.synopsis ?? undefined}
                accent="Ver detalhe"
              />
            </Link>
          ))}
        </section>
      )}

      <section className="content-panel">
        <SectionHeading
          eyebrow="Fluxo base"
          title="O que vem depois"
          description="Aqui entram a busca real, a pagina de item e as interacoes de favorito e tracking."
        />

        <div className="panel-points">
          <article>
            <span>Busca</span>
            <p>Listagem, pesquisa e filtros prontos para puxar dados reais.</p>
          </article>
          <article>
            <span>Item</span>
            <p>Hero, detalhes, ações e início de tracking por item.</p>
          </article>
          <article>
            <span>Favoritos</span>
            <p>Entrada preparada para salvar e remover itens com um clique.</p>
          </article>
        </div>
      </section>
    </main>
  );
}