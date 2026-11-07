import Link from "next/link";
import { getMediaTypeLabel, type CatalogItem, type MediaType } from "../../lib/catalogo-api";
import { miniaturaCapa } from "../../lib/imagens";
import { MediaCard } from "../media-card";
import { MediaGrid } from "../media-grid";
import { SectionHeading } from "../section-heading";
import { UiBadge } from "../ui-badge";
import { UiCard } from "../ui-card";
import { MEDIA_FILTERS } from "./aba-estante";

type AbaFavoritosProps = {
  isOwner: boolean;
  favorites: CatalogItem[];
  filteredFavorites: CatalogItem[];
  favTypeFilter: MediaType | "";
  setFavTypeFilter: (mt: MediaType | "") => void;
  busyFav: boolean;
  onMoveFavorite: (mediaItemId: string, direction: -1 | 1 | "top") => void;
  onRemoveFavorite: (mediaItemId: string) => void;
};

export function AbaFavoritos({
  isOwner,
  favorites,
  filteredFavorites,
  favTypeFilter,
  setFavTypeFilter,
  busyFav,
  onMoveFavorite,
  onRemoveFavorite
}: AbaFavoritosProps) {
  return (
    <section className="content-panel">
      <SectionHeading
        title={isOwner ? "Seus favoritos" : "Favoritos"}
        description={
          isOwner
            ? "Ordene como preferir — os 4 primeiros ficam em destaque na visão geral."
            : undefined
        }
      />

      {favorites.length > 0 && (
        <div className="filter-chips" role="group" aria-label="Filtrar favoritos por categoria">
          {MEDIA_FILTERS.map((mf) => (
            <button
              key={mf.value || "all"}
              type="button"
              className={`filter-chip${favTypeFilter === mf.value ? " is-active" : ""}`}
              aria-pressed={favTypeFilter === mf.value}
              onClick={() => setFavTypeFilter(mf.value)}
            >
              {mf.label}
            </button>
          ))}
        </div>
      )}

      {favorites.length === 0 ? (
        <UiCard className="empty-state">
          <h3>Nenhuma obra favoritada ainda</h3>
          <p>
            {isOwner
              ? 'Abra qualquer filme, série, jogo ou livro e clique em "Favoritar" para montar sua pasta.'
              : "Este perfil ainda não adicionou obras aos favoritos."}
          </p>
        </UiCard>
      ) : isOwner ? (
        <div className="favorites-manage-grid">
          {filteredFavorites.map((item) => {
            const globalIndex = favorites.findIndex((f) => f.id === item.id);
            return (
              <div key={item.id} className="favorite-manage-slot">
                <Link href={`/itens/${item.id}`} className="favorite-manage-card-link">
                  <MediaCard
                    type={`#${globalIndex + 1} · ${getMediaTypeLabel(item.type, item.subtype)}`}
                    mediaType={item.type}
                    title={item.title}
                    meta={item.releaseYear ? String(item.releaseYear) : ""}
                    coverUrl={item.coverUrl}
                  />
                </Link>
                <div className="favorite-manage-actions">
                  <button
                    type="button"
                    className="filter-chip"
                    disabled={busyFav || globalIndex === 0}
                    onClick={() => void onMoveFavorite(item.id, "top")}
                    title="Colocar no topo dos favoritos"
                  >
                    Topo
                  </button>
                  <button
                    type="button"
                    className="filter-chip"
                    disabled={busyFav || globalIndex === 0}
                    onClick={() => void onMoveFavorite(item.id, -1)}
                    title="Mover para trás"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="filter-chip"
                    disabled={busyFav || globalIndex === favorites.length - 1}
                    onClick={() => void onMoveFavorite(item.id, 1)}
                    title="Mover para frente"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    className="filter-chip"
                    disabled={busyFav}
                    onClick={() => void onRemoveFavorite(item.id)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="featured-showcase-grid">
            {filteredFavorites.slice(0, 4).map((item, index) => (
              <Link key={item.id} href={`/itens/${item.id}`} className="featured-showcase-card">
                <div className="featured-showcase-art">
                  {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" decoding="async" src={miniaturaCapa(item.coverUrl, 180) ?? item.coverUrl} alt={item.title} />
                  ) : (
                    <div className="media-card-fallback" aria-hidden="true">
                      <span>{item.title}</span>
                    </div>
                  )}
                  <div className="featured-showcase-overlay">
                    <UiBadge tone="secondary">#{index + 1}</UiBadge>
                  </div>
                </div>
                <div className="featured-showcase-body">
                  <span className="featured-showcase-type">{getMediaTypeLabel(item.type, item.subtype)}</span>
                  <h3>{item.title}</h3>
                  {item.releaseYear && <small>{item.releaseYear}</small>}
                </div>
              </Link>
            ))}
          </div>
          {filteredFavorites.length > 4 && (
            <div style={{ marginTop: "20px" }}>
              <MediaGrid items={filteredFavorites.slice(4)} label="Outros favoritos" />
            </div>
          )}
        </>
      )}
    </section>
  );
}
