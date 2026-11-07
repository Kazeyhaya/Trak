import Link from "next/link";
import {
  getStatusLabel,
  TRACKING_STATUSES,
  type Profile,
  type ProfileLibraryItem,
  type TrackingStatus
} from "../../lib/api";
import { getMediaTypeLabel, type MediaType } from "../../lib/catalogo-api";
import { MediaCard } from "../media-card";
import { SectionHeading } from "../section-heading";
import { UiButton } from "../ui-button";
import { UiCard } from "../ui-card";

export const MEDIA_FILTERS: Array<{ label: string; value: MediaType | "" }> = [
  { label: "Todos", value: "" },
  { label: "Filmes", value: "MOVIE" },
  { label: "Séries", value: "SERIES" },
  { label: "Jogos", value: "GAME" },
  { label: "Livros", value: "BOOK" }
];

export const ITENS_POR_PAGINA = 24;

type AbaEstanteProps = {
  isOwner: boolean;
  profile: Profile;
  library: ProfileLibraryItem[];
  filteredLibrary: ProfileLibraryItem[];
  statusFilter: TrackingStatus | "";
  setStatusFilter: (st: TrackingStatus | "") => void;
  typeFilter: MediaType | "";
  setTypeFilter: (mt: MediaType | "") => void;
  libraryDisplayCount: number;
  setLibraryDisplayCount: React.Dispatch<React.SetStateAction<number>>;
};

export function AbaEstante({
  isOwner,
  profile,
  library,
  filteredLibrary,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  libraryDisplayCount,
  setLibraryDisplayCount
}: AbaEstanteProps) {
  return (
    <section className="content-panel">
      <SectionHeading
        title={isOwner ? "Sua estante" : `Estante de ${profile.displayName || `@${profile.username}`}`}
      />

      <div className="library-filters">
        <div className="filter-chips" role="group" aria-label="Filtrar por status">
          <button
            type="button"
            className={`filter-chip${statusFilter === "" ? " is-active" : ""}`}
            aria-pressed={statusFilter === ""}
            onClick={() => setStatusFilter("")}
          >
            Todos os status ({library.filter((i) => !typeFilter || i.item.type === typeFilter).length})
          </button>
          {TRACKING_STATUSES.map((st) => {
            const count = library.filter((i) => (!typeFilter || i.item.type === typeFilter) && i.status === st).length;
            const label =
              st === "WANT" && !typeFilter
                ? "Na fila"
                : st === "WATCHING" && !typeFilter
                  ? "Em andamento"
                  : getStatusLabel(st, typeFilter || undefined);
            return (
              <button
                key={st}
                type="button"
                className={`filter-chip${statusFilter === st ? " is-active" : ""}`}
                aria-pressed={statusFilter === st}
                onClick={() => setStatusFilter(st)}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        <div className="filter-chips" role="group" aria-label="Filtrar estante por categoria">
          {MEDIA_FILTERS.map((mf) => (
            <button
              key={mf.value || "all"}
              type="button"
              className={`filter-chip${typeFilter === mf.value ? " is-active" : ""}`}
              aria-pressed={typeFilter === mf.value}
              onClick={() => setTypeFilter(mf.value)}
            >
              {mf.label}
            </button>
          ))}
        </div>
      </div>

      {filteredLibrary.length === 0 ? (
        <UiCard className="empty-state">
          <h3>Nenhuma obra encontrada neste filtro</h3>
          <p>
            {isOwner
              ? "Explore o catálogo para adicionar filmes, séries, jogos e livros à sua estante."
              : "Nenhuma obra corresponde aos filtros selecionados."}
          </p>
          {isOwner && (
            <div className="item-next-actions">
              <UiButton href="/catalogo">Ir para o catálogo</UiButton>
            </div>
          )}
        </UiCard>
      ) : (
        <>
          <div className="catalog-grid">
            {filteredLibrary.slice(0, libraryDisplayCount).map((entry) => {
              const item = entry.item;
              const statusLabel = getStatusLabel(entry.status, item.type);
              const supportsPercent = item.type === "GAME" || item.type === "BOOK";
              const progressText =
                supportsPercent && entry.progress > 0 && entry.status !== "COMPLETED"
                  ? `${statusLabel} · ${entry.progress}%`
                  : statusLabel;
              const ratingText = entry.rating ? ` · ${entry.rating} ★` : "";

              return (
                <Link key={entry.mediaItemId} href={`/itens/${entry.mediaItemId}`}>
                  <MediaCard
                    type={getMediaTypeLabel(item.type, item.subtype)}
                    mediaType={item.type}
                    title={item.title}
                    meta={item.releaseYear ? String(item.releaseYear) : ""}
                    coverUrl={item.coverUrl}
                    progress={`${progressText}${ratingText}`}
                  />
                </Link>
              );
            })}
          </div>
          {libraryDisplayCount < filteredLibrary.length && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "1.5rem" }}>
              <UiButton
                variant="secondary"
                onClick={() => setLibraryDisplayCount((prev) => prev + ITENS_POR_PAGINA)}
              >
                Carregar mais obras ({filteredLibrary.length - libraryDisplayCount} restantes)
              </UiButton>
            </div>
          )}
        </>
      )}
    </section>
  );
}
