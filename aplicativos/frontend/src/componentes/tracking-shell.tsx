"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AlertsSection } from "./alerts-section";
import { MediaCard } from "./media-card";
import { SectionHeading } from "./section-heading";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import {
  errorMessage,
  FavoriteEntry,
  getFavorites,
  getStatusLabel,
  getTrackingItems,
  removeFavorite,
  reorderFavorites,
  TRACKING_STATUSES,
  TrackingEntry,
  TrackingStatus
} from "../lib/api";
import { getMediaTypeLabel, MediaType } from "../lib/catalogo-api";

const MEDIA_FILTERS: Array<{ label: string; value: MediaType | "" }> = [
  { label: "Todos", value: "" },
  { label: "Filmes", value: "MOVIE" },
  { label: "Séries", value: "SERIES" },
  { label: "Jogos", value: "GAME" },
  { label: "Livros", value: "BOOK" }
];

function deriveStats(items: TrackingEntry[], favorites: FavoriteEntry[]) {
  const ativos = items.filter((i) => i.status !== "COMPLETED" && i.status !== "DROPPED").length;
  const emProgresso = items.filter((i) => i.status === "WATCHING").length;
  const concluidos = items.filter((i) => i.status === "COMPLETED").length;

  return [
    { label: "Itens ativos", value: String(ativos).padStart(2, "0") },
    { label: "Em progresso", value: String(emProgresso).padStart(2, "0") },
    { label: "Concluídos", value: String(concluidos).padStart(2, "0") },
    { label: "Favoritos", value: String(favorites.length).padStart(2, "0") }
  ];
}

const emptyStats = [
  { label: "Itens ativos", value: "—" },
  { label: "Em progresso", value: "—" },
  { label: "Concluídos", value: "—" },
  { label: "Favoritos", value: "—" }
];

export function TrackingShell() {
  const [items, setItems] = useState<TrackingEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TrackingStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<MediaType | "">("");
  const [favTypeFilter, setFavTypeFilter] = useState<MediaType | "">("");
  const [busyFav, setBusyFav] = useState(false);
  const currentYear = new Date().getFullYear();
  const isRecapSeason = new Date().getMonth() === 11;
  const [annualGoal, setAnnualGoal] = useState<number>(24);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`trak:goal:${currentYear}`);
      if (saved) {
        const parsed = Number(saved);
        if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 500) {
          setAnnualGoal(parsed);
        }
      }
    } catch {
      // ignora indisponibilidade de localStorage
    }
  }, [currentYear]);

  function handleGoalChange(nextGoal: number) {
    const clamped = Math.max(1, Math.min(500, Math.round(nextGoal) || 1));
    setAnnualGoal(clamped);
    try {
      window.localStorage.setItem(`trak:goal:${currentYear}`, String(clamped));
    } catch {
      // ignora
    }
  }

  useEffect(() => {
    Promise.all([getTrackingItems(), getFavorites()])
      .then(([trackingData, favoritesData]) => {
        setItems(trackingData);
        setFavorites(favoritesData);
      })
      .catch((err) => setError(errorMessage(err, "Não foi possível carregar seu tracking.")))
      .finally(() => setLoaded(true));
  }, []);

  const stats = loaded && !error ? deriveStats(items, favorites) : emptyStats;

  const completedThisYear = useMemo(() => {
    return items.filter((entry) => {
      if (entry.status !== "COMPLETED") {
        return false;
      }
      if (!entry.updatedAt) {
        return true;
      }
      return new Date(entry.updatedAt).getFullYear() === currentYear;
    });
  }, [items, currentYear]);

  const goalPct = Math.min(100, Math.round((completedThisYear.length / Math.max(1, annualGoal)) * 100));

  const filteredItems = useMemo(() => {
    return items.filter((entry) => {
      if (statusFilter && entry.status !== statusFilter) {
        return false;
      }
      if (typeFilter && entry.item?.type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [items, statusFilter, typeFilter]);

  const filteredFavorites = useMemo(() => {
    if (!favTypeFilter) {
      return favorites;
    }
    return favorites.filter((fav) => fav.item?.type === favTypeFilter);
  }, [favorites, favTypeFilter]);

  async function handleRemoveFavorite(mediaItemId: string) {
    setBusyFav(true);
    try {
      await removeFavorite(mediaItemId);
      setFavorites((prev) => prev.filter((f) => f.mediaItemId !== mediaItemId));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyFav(false);
    }
  }

  async function handleMoveFavorite(mediaItemId: string, direction: -1 | 1 | "top") {
    const index = favorites.findIndex((f) => f.mediaItemId === mediaItemId);
    if (index < 0) {
      return;
    }
    const targetIndex = direction === "top" ? 0 : index + direction;
    if (targetIndex < 0 || targetIndex >= favorites.length || targetIndex === index) {
      return;
    }

    const next = [...favorites];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    setFavorites(next);
    setBusyFav(true);

    try {
      await reorderFavorites(next.map((f) => f.mediaItemId));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyFav(false);
    }
  }

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="content-hero">
        <div>
          <h1>Sua biblioteca pessoal de filmes, séries, jogos e livros.</h1>
          <p>
            Organize o que está em andamento, filtre sua estante por categoria e monte seus favoritos na ordem que
            preferir.
          </p>
        </div>

        <div className="content-summary">
          <UiBadge tone="secondary">{loaded ? `${items.length} na biblioteca` : "Carregando…"}</UiBadge>
          <strong>Biblioteca + Favoritos + Metas</strong>
          <p>Acompanhe suas estatísticas, organize sua estante e bata sua meta cultural do ano.</p>
          {isRecapSeason && (
            <div className="item-next-actions" style={{ marginTop: "12px" }}>
              <UiButton href="/recap" variant="secondary">
                Ver Retrospectiva (Recap)
              </UiButton>
            </div>
          )}
        </div>
      </section>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <section className="tracking-grid">
        {stats.map((stat) => (
          <UiCard key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </UiCard>
        ))}
      </section>

      <section className="content-panel annual-goal-panel">
        <div className="annual-goal-header">
          <div>
            <span className="eyebrow">Desafio {currentYear}</span>
            <h2>Meta anual de cultura</h2>
            <p className="panel-note">
              Você já concluiu <strong>{completedThisYear.length}</strong> de <strong>{annualGoal}</strong> obras em{" "}
              {currentYear} ({goalPct}%).
            </p>
          </div>
          <div className="annual-goal-controls" role="group" aria-label="Escolher meta anual">
            {[12, 24, 36, 50, 100].map((preset) => (
              <button
                key={preset}
                type="button"
                className={`filter-chip${annualGoal === preset ? " is-active" : ""}`}
                onClick={() => handleGoalChange(preset)}
              >
                {preset} obras
              </button>
            ))}
          </div>
        </div>
        <div className="annual-goal-bar" role="progressbar" aria-valuenow={goalPct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${goalPct}%` }} />
        </div>
        <div className="annual-goal-breakdown">
          <span>🎬 {completedThisYear.filter((i) => i.item?.type === "MOVIE").length} filmes</span>
          <span>📺 {completedThisYear.filter((i) => i.item?.type === "SERIES").length} séries</span>
          <span>🎮 {completedThisYear.filter((i) => i.item?.type === "GAME").length} jogos</span>
          <span>📚 {completedThisYear.filter((i) => i.item?.type === "BOOK").length} livros</span>
        </div>
      </section>

      <AlertsSection />

      <section className="content-panel">
        <SectionHeading
          eyebrow="Estante"
          title="Sua biblioteca"
          description="Filtre por status ou categoria e clique em qualquer obra para atualizar seu progresso ou nota."
        />

        <div className="library-filters">
          <div className="filter-chips" role="group" aria-label="Filtrar por status">
            <button
              type="button"
              className={`filter-chip${statusFilter === "" ? " is-active" : ""}`}
              aria-pressed={statusFilter === ""}
              onClick={() => setStatusFilter("")}
            >
              Todos os status ({items.length})
            </button>
            {TRACKING_STATUSES.map((st) => {
              const count = items.filter((i) => i.status === st).length;
              return (
                <button
                  key={st}
                  type="button"
                  className={`filter-chip${statusFilter === st ? " is-active" : ""}`}
                  aria-pressed={statusFilter === st}
                  onClick={() => setStatusFilter(st)}
                >
                  {getStatusLabel(st)} ({count})
                </button>
              );
            })}
          </div>

          <div className="filter-chips" role="group" aria-label="Filtrar biblioteca por categoria">
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

        {!loaded && <p className="panel-note">Carregando sua biblioteca…</p>}

        {loaded && !error && filteredItems.length === 0 && (
          <UiCard className="empty-state">
            <UiBadge tone="secondary">Vazio</UiBadge>
            <h3>Nenhuma obra encontrada neste filtro</h3>
            <p>Explore o catálogo para adicionar filmes, séries, jogos e livros à sua estante.</p>
          </UiCard>
        )}

        {filteredItems.length > 0 && (
          <div className="catalog-grid" style={{ marginTop: "18px" }}>
            {filteredItems.map((entry) => {
              const title = entry.item?.title ?? entry.mediaItemId;
              const typeLabel = entry.item ? getMediaTypeLabel(entry.item.type) : "Item";
              const year = entry.item?.releaseYear ? String(entry.item.releaseYear) : "Sem ano";
              const statusText = getStatusLabel(entry.status, entry.item?.type);
              const progressText =
                entry.status === "COMPLETED" || entry.item?.type === "MOVIE"
                  ? statusText
                  : `${statusText} · ${entry.progress}%`;
              const ratingText = entry.rating ? `${entry.rating} ★` : undefined;

              return (
                <Link key={entry.id} href={`/itens/${entry.mediaItemId}`}>
                  <MediaCard
                    type={typeLabel}
                    title={title}
                    meta={year}
                    coverUrl={entry.item?.coverUrl}
                    progress={progressText}
                    accent={ratingText}
                  />
                </Link>
              );
            })}
          </div>
        )}

        <div className="item-next-actions" style={{ marginTop: "22px" }}>
          <UiButton href="/catalogo">Ir para catálogo</UiButton>
          <UiButton href="/recomendacoes" variant="secondary">
            Recomendações para você
          </UiButton>
          <UiButton href="/importar" variant="secondary">
            Importar histórico
          </UiButton>
        </div>
      </section>

      <section className="content-panel">
        <SectionHeading
          eyebrow="Favoritos"
          title="Pasta de favoritos"
          description="Monte e ordene seus favoritos. Os primeiros da lista ficam no topo do seu perfil público."
        />

        {favorites.length > 0 && (
          <div className="library-filters">
            <div className="filter-chips" role="group" aria-label="Filtrar favoritos por categoria">
              {MEDIA_FILTERS.map((mf) => (
                <button
                  key={mf.value || "all-fav"}
                  type="button"
                  className={`filter-chip${favTypeFilter === mf.value ? " is-active" : ""}`}
                  aria-pressed={favTypeFilter === mf.value}
                  onClick={() => setFavTypeFilter(mf.value)}
                >
                  {mf.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loaded && favorites.length === 0 && (
          <p className="panel-note">Você ainda não marcou nenhum item como favorito.</p>
        )}

        {filteredFavorites.length > 0 && (
          <div className="catalog-grid" style={{ marginTop: "18px" }}>
            {filteredFavorites.map((favorite, idx) => {
              const globalIndex = favorites.findIndex((f) => f.mediaItemId === favorite.mediaItemId);
              return (
                <UiCard key={favorite.mediaItemId} className="favorite-manage-card">
                  <Link href={`/itens/${favorite.mediaItemId}`} className="favorite-manage-link">
                    <div className="media-card-art" aria-hidden="true">
                      {favorite.item?.coverUrl ? (
                        <Image
                          className="media-card-image"
                          src={favorite.item.coverUrl}
                          alt=""
                          fill
                          sizes="(max-width: 720px) 50vw, 240px"
                        />
                      ) : (
                        <span className="media-card-orb" />
                      )}
                    </div>
                    <div className="media-card-copy">
                      <UiBadge tone="primary">
                        #{globalIndex + 1} · {favorite.item ? getMediaTypeLabel(favorite.item.type) : "Favorito"}
                      </UiBadge>
                      <h3>{favorite.item?.title ?? favorite.mediaItemId}</h3>
                      <p>{favorite.item?.releaseYear ?? "Sem ano"}</p>
                    </div>
                  </Link>
                  <div className="favorite-manage-actions" role="group" aria-label={`Ações para ${favorite.item?.title ?? favorite.mediaItemId}`}>
                    <button
                      type="button"
                      className="filter-chip"
                      disabled={busyFav || globalIndex === 0}
                      title="Fixar no topo (#1)"
                      onClick={() => void handleMoveFavorite(favorite.mediaItemId, "top")}
                    >
                      Topo
                    </button>
                    <button
                      type="button"
                      className="filter-chip"
                      disabled={busyFav || globalIndex === 0}
                      aria-label="Mover para trás"
                      onClick={() => void handleMoveFavorite(favorite.mediaItemId, -1)}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="filter-chip"
                      disabled={busyFav || globalIndex === favorites.length - 1 || idx === filteredFavorites.length - 1}
                      aria-label="Mover para frente"
                      onClick={() => void handleMoveFavorite(favorite.mediaItemId, 1)}
                    >
                      →
                    </button>
                    <button
                      type="button"
                      className="filter-chip"
                      disabled={busyFav}
                      onClick={() => void handleRemoveFavorite(favorite.mediaItemId)}
                    >
                      Remover
                    </button>
                  </div>
                </UiCard>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
