"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ActivityList } from "./activity-list";
import { AlertsSection } from "./alerts-section";
import { FollowListModal } from "./follow-list-modal";
import { MediaCard } from "./media-card";
import { MediaGrid } from "./media-grid";
import { ProfileActions } from "./profile-actions";
import { SectionHeading } from "./section-heading";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import { useAuth } from "../contextos/auth-context";
import {
  errorMessage,
  getPublicProfile,
  getStatusLabel,
  PublicProfile,
  removeFavorite,
  reorderFavorites,
  TRACKING_STATUSES,
  TrackingStatus
} from "../lib/api";
import { CatalogItem, getMediaTypeLabel, MediaType } from "../lib/catalogo-api";

type ProfileTab = "overview" | "library" | "favorites" | "achievements" | "activity";

const MEDIA_FILTERS: Array<{ label: string; value: MediaType | "" }> = [
  { label: "Todos", value: "" },
  { label: "Filmes", value: "MOVIE" },
  { label: "Séries", value: "SERIES" },
  { label: "Jogos", value: "GAME" },
  { label: "Livros", value: "BOOK" }
];

export function ProfileHub({ initialData }: { initialData: PublicProfile }) {
  const { user, profile: authProfile } = useAuth();
  const [data, setData] = useState<PublicProfile>(initialData);
  const [favorites, setFavorites] = useState<CatalogItem[]>(initialData.favorites ?? []);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [statusFilter, setStatusFilter] = useState<TrackingStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<MediaType | "">("");
  const [favTypeFilter, setFavTypeFilter] = useState<MediaType | "">("");
  const [busyFav, setBusyFav] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followModalTab, setFollowModalTab] = useState<"followers" | "following" | null>(null);

  const currentYear = new Date().getFullYear();
  const [annualGoal, setAnnualGoal] = useState<number>(24);

  const isOwner = Boolean(
    data.isMe ||
      (user && authProfile?.username.toLowerCase() === data.profile.username.toLowerCase())
  );

  // Quando o dono acessa o proprio perfil (ou se o perfil estiver privado no SSR),
  // recarrega com o token autenticado do navegador para trazer todos os dados atualizados.
  useEffect(() => {
    if (!user) {
      return;
    }
    if (data.isPrivate || authProfile?.username.toLowerCase() === data.profile.username.toLowerCase()) {
      getPublicProfile(data.profile.username)
        .then((fresh) => {
          setData(fresh);
          setFavorites(fresh.favorites ?? []);
        })
        .catch(() => {});
    }
  }, [user, authProfile?.username, data.profile.username, data.isPrivate]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`trak:goal:${currentYear}`);
      if (saved) {
        const parsed = Number(saved);
        if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 500) {
          queueMicrotask(() => setAnnualGoal(parsed));
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

  const { profile, stats, summary, achievements = [], inProgress = [], library = [] } = data;
  const theme = profile.theme || "emerald";
  const bannerUrl =
    profile.bannerUrl ||
    favorites[0]?.coverUrl ||
    inProgress[0]?.item.coverUrl ||
    null;
  const avatarInitial = (profile.displayName || profile.username || "T").charAt(0).toUpperCase();
  const topFavorites = favorites.slice(0, 4);
  const unlockedBadges = achievements.filter((a) => a.unlocked);

  const completedThisYear = useMemo(() => {
    return library.filter((entry) => {
      if (entry.status !== "COMPLETED") {
        return false;
      }
      if (!entry.updatedAt) {
        return true;
      }
      return new Date(entry.updatedAt).getFullYear() === currentYear;
    });
  }, [library, currentYear]);

  const goalPct = Math.min(100, Math.round((completedThisYear.length / Math.max(1, annualGoal)) * 100));

  const filteredLibrary = useMemo(() => {
    return library.filter((entry) => {
      if (statusFilter && entry.status !== statusFilter) {
        return false;
      }
      if (typeFilter && entry.item.type !== typeFilter) {
        return false;
      }
      return true;
    });
  }, [library, statusFilter, typeFilter]);

  const filteredFavorites = useMemo(() => {
    if (!favTypeFilter) {
      return favorites;
    }
    return favorites.filter((fav) => fav.type === favTypeFilter);
  }, [favorites, favTypeFilter]);

  async function handleRemoveFavorite(mediaItemId: string) {
    setBusyFav(true);
    setError(null);
    try {
      await removeFavorite(mediaItemId);
      setFavorites((prev) => prev.filter((f) => f.id !== mediaItemId));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyFav(false);
    }
  }

  async function handleMoveFavorite(mediaItemId: string, direction: -1 | 1 | "top") {
    const index = favorites.findIndex((f) => f.id === mediaItemId);
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
    setError(null);

    try {
      await reorderFavorites(next.map((f) => f.id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyFav(false);
    }
  }

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className={`profile-showcase-banner theme-${theme}`}>
        {bannerUrl && (
          <div
            className="profile-showcase-backdrop"
            style={{ backgroundImage: `url("${bannerUrl}")` }}
            aria-hidden="true"
          />
        )}
        <div className="profile-showcase-content">
          <div className="profile-showcase-top">
            <div className="profile-identity-row">
              <div className="profile-avatar-badge" aria-hidden="true">
                {profile.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt="" />
                ) : (
                  avatarInitial
                )}
              </div>
              <div className="profile-identity-copy">
                <h1>{profile.displayName || `@${profile.username}`}</h1>
                {profile.displayName && <p className="profile-handle">@{profile.username}</p>}
                {profile.bio && <p className="profile-bio-text">{profile.bio}</p>}
                <div className="profile-counts">
                  <button
                    type="button"
                    className="profile-count-button"
                    onClick={() => setFollowModalTab("followers")}
                    aria-label={`Ver ${data.followers} seguidores`}
                  >
                    <strong>{data.followers}</strong> seguidores
                  </button>
                  <button
                    type="button"
                    className="profile-count-button"
                    onClick={() => setFollowModalTab("following")}
                    aria-label={`Ver ${data.following} seguindo`}
                  >
                    <strong>{data.following}</strong> seguindo
                  </button>
                  {stats && (
                    <span>
                      <strong>{stats.total}</strong> obras na estante
                    </span>
                  )}
                </div>
              </div>
            </div>

            <ProfileActions
              username={profile.username}
              initialIsMe={isOwner}
              initialFollowing={data.isFollowing}
            />
          </div>

          {!data.isPrivate && (summary || stats) && (
            <div className="profile-cultural-badges" aria-label="Estatísticas culturais">
              <div className="cultural-badge">
                <strong>{summary?.gamesCompleted ?? 0}</strong>
                <span>Jogos zerados</span>
              </div>
              <div className="cultural-badge">
                <strong>{summary?.booksRead ?? 0}</strong>
                <span>Livros lidos</span>
              </div>
              <div className="cultural-badge">
                <strong>{(summary?.moviesWatched ?? 0) + (summary?.seriesCompleted ?? 0)}</strong>
                <span>Filmes & Séries</span>
              </div>
              <div className="cultural-badge">
                <strong>~{summary?.estimatedHours ?? 0}h</strong>
                <span>Horas totais</span>
              </div>
              <div className="cultural-badge">
                <strong>{stats?.averageRating ? `${stats.averageRating.toLocaleString("pt-BR")} ★` : "—"}</strong>
                <span>Nota média</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      {data.isPrivate && !isOwner ? (
        <UiCard className="empty-state">
          <h3>Este perfil é privado.</h3>
          <p>Só a própria pessoa vê a estante e as atividades dela.</p>
        </UiCard>
      ) : (
        <>
          <nav className="profile-hub-tabs" aria-label="Seções do perfil">
            <button
              type="button"
              className={`profile-hub-tab${activeTab === "overview" ? " is-active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              Visão Geral
            </button>
            <button
              type="button"
              className={`profile-hub-tab${activeTab === "library" ? " is-active" : ""}`}
              onClick={() => setActiveTab("library")}
            >
              Estante <span className="profile-hub-tab-count">{library.length}</span>
            </button>
            <button
              type="button"
              className={`profile-hub-tab${activeTab === "favorites" ? " is-active" : ""}`}
              onClick={() => setActiveTab("favorites")}
            >
              Favoritos <span className="profile-hub-tab-count">{favorites.length}</span>
            </button>
            <button
              type="button"
              className={`profile-hub-tab${activeTab === "achievements" ? " is-active" : ""}`}
              onClick={() => setActiveTab("achievements")}
            >
              Conquistas{" "}
              <span className="profile-hub-tab-count">
                {unlockedBadges.length}/{achievements.length}
              </span>
            </button>
            <button
              type="button"
              className={`profile-hub-tab${activeTab === "activity" ? " is-active" : ""}`}
              onClick={() => setActiveTab("activity")}
            >
              Atividade
            </button>
          </nav>

          {activeTab === "overview" && (
            <>
              {isOwner && (
                <>
                  <section className="content-panel annual-goal-panel">
                    <div className="annual-goal-header">
                      <div>
                        <span className="eyebrow">Desafio {currentYear}</span>
                        <h2>Meta anual de cultura</h2>
                        <p className="panel-note">
                          Você já concluiu <strong>{completedThisYear.length}</strong> de{" "}
                          <strong>{annualGoal}</strong> obras em {currentYear} ({goalPct}%).
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
                    <div
                      className="annual-goal-bar"
                      role="progressbar"
                      aria-valuenow={goalPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <span style={{ width: `${goalPct}%` }} />
                    </div>
                    <div className="annual-goal-breakdown">
                      <span>🎬 {completedThisYear.filter((i) => i.item.type === "MOVIE").length} filmes</span>
                      <span>📺 {completedThisYear.filter((i) => i.item.type === "SERIES").length} séries</span>
                      <span>🎮 {completedThisYear.filter((i) => i.item.type === "GAME").length} jogos</span>
                      <span>📚 {completedThisYear.filter((i) => i.item.type === "BOOK").length} livros</span>
                    </div>
                  </section>

                  <AlertsSection />
                </>
              )}

              {inProgress.length > 0 && (
                <section className="content-panel">
                  <div className="panel-header">
                    <SectionHeading
                      eyebrow="Em foco agora"
                      title="Obras do momento"
                      description="O que está sendo jogado, lido ou assistido atualmente."
                    />
                    <button
                      type="button"
                      className="filter-chip"
                      onClick={() => {
                        setStatusFilter("WATCHING");
                        setActiveTab("library");
                      }}
                    >
                      Ver estante completa →
                    </button>
                  </div>
                  <div className="featured-showcase-grid">
                    {inProgress.map(({ item, status, progress }) => (
                      <Link key={item.id} href={`/itens/${item.id}`} className="featured-showcase-card">
                        <div className="featured-showcase-art">
                          {item.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.coverUrl} alt={item.title} />
                          ) : (
                            <span className="media-card-orb" />
                          )}
                          <div className="featured-showcase-overlay">
                            <UiBadge tone="primary">{getStatusLabel(status, item.type)}</UiBadge>
                          </div>
                        </div>
                        <div className="featured-showcase-body">
                          <span className="featured-showcase-type">{getMediaTypeLabel(item.type, item.subtype)}</span>
                          <h3>{item.title}</h3>
                          {(item.type === "GAME" || item.type === "BOOK") && progress > 0 && (
                            <div className="featured-progress-wrap">
                              <div className="featured-progress-bar">
                                <span style={{ width: `${Math.min(100, progress)}%` }} />
                              </div>
                              <small>{progress}% concluído</small>
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {topFavorites.length > 0 && (
                <section className="content-panel">
                  <div className="panel-header">
                    <SectionHeading
                      eyebrow="Vitrine"
                      title="Favoritos em destaque"
                      description="As principais obras marcadas como favoritas."
                    />
                    <button
                      type="button"
                      className="filter-chip"
                      onClick={() => setActiveTab("favorites")}
                    >
                      {isOwner
                        ? `Organizar favoritos (${favorites.length}) →`
                        : `Ver todos (${favorites.length}) →`}
                    </button>
                  </div>
                  <div className="featured-showcase-grid">
                    {topFavorites.map((item, index) => (
                      <Link key={item.id} href={`/itens/${item.id}`} className="featured-showcase-card">
                        <div className="featured-showcase-art">
                          {item.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.coverUrl} alt={item.title} />
                          ) : (
                            <span className="media-card-orb" />
                          )}
                          <div className="featured-showcase-overlay">
                            <UiBadge tone="secondary">#{index + 1} Favorito</UiBadge>
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
                </section>
              )}

              {achievements.length > 0 && (
                <section className="content-panel">
                  <div className="panel-header">
                    <SectionHeading
                      eyebrow="Conquistas"
                      title={`Insígnias culturais (${unlockedBadges.length}/${achievements.length})`}
                      description="Marcos desbloqueados automaticamente conforme obras são concluídas e avaliadas."
                    />
                    <button
                      type="button"
                      className="filter-chip"
                      onClick={() => setActiveTab("achievements")}
                    >
                      Ver todas →
                    </button>
                  </div>
                  <div className="achievements-grid">
                    {achievements.slice(0, 6).map((badge) => {
                      const pct = Math.min(100, Math.round((badge.current / Math.max(1, badge.target)) * 100));
                      return (
                        <div
                          key={badge.id}
                          className={`achievement-card${badge.unlocked ? " is-unlocked" : " is-locked"}`}
                        >
                          <div className="achievement-icon" aria-hidden="true">
                            {badge.icon}
                          </div>
                          <div className="achievement-body">
                            <div className="achievement-header">
                              <strong>{badge.title}</strong>
                              <span className="achievement-counter">
                                {badge.current}/{badge.target}
                              </span>
                            </div>
                            <p>{badge.description}</p>
                            <div className="achievement-progress-bar">
                              <span style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section className="content-panel">
                <div className="panel-header">
                  <SectionHeading
                    eyebrow="Atividade"
                    title="Atividade recente"
                    description="O que mudou na estante."
                  />
                  {data.activity.length > 5 && (
                    <button
                      type="button"
                      className="filter-chip"
                      onClick={() => setActiveTab("activity")}
                    >
                      Ver tudo ({data.activity.length}) →
                    </button>
                  )}
                </div>
                {data.activity.length > 0 ? (
                  <ActivityList items={data.activity.slice(0, 5)} showAuthor={false} />
                ) : (
                  <p className="panel-note">Nenhuma atividade ainda.</p>
                )}
              </section>
            </>
          )}

          {activeTab === "library" && (
            <section className="content-panel">
              <SectionHeading
                eyebrow="Estante"
                title={isOwner ? "Sua biblioteca" : `Estante de ${profile.displayName || `@${profile.username}`}`}
                description="Filtre por status ou categoria e clique em qualquer obra para ver os detalhes."
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
                    return (
                      <button
                        key={st}
                        type="button"
                        className={`filter-chip${statusFilter === st ? " is-active" : ""}`}
                        aria-pressed={statusFilter === st}
                        onClick={() => setStatusFilter(st)}
                      >
                        {getStatusLabel(st, typeFilter || undefined)} ({count})
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
                  <UiBadge tone="secondary">Vazio</UiBadge>
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
                <div className="catalog-grid">
                  {filteredLibrary.map((entry) => {
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
                          title={item.title}
                          meta={item.releaseYear ? String(item.releaseYear) : "Sem ano"}
                          coverUrl={item.coverUrl}
                          progress={`${progressText}${ratingText}`}
                        />
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === "favorites" && (
            <section className="content-panel">
              <SectionHeading
                eyebrow="Favoritos"
                title={isOwner ? "Monte e ordene sua pasta de favoritos" : "Favoritos"}
                description={
                  isOwner
                    ? "Ordene seus favoritos como preferir — os 4 primeiros ficam em destaque na sua vitrine e o #1 ilustra sua capa automática."
                    : "Obras escolhidas como favoritas por este perfil."
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
                  <UiBadge tone="secondary">Sem favoritos</UiBadge>
                  <h3>Nenhuma obra favoritada ainda</h3>
                  <p>
                    {isOwner
                      ? "Abra qualquer filme, série, jogo ou livro e clique em \"Favoritar\" para montar sua pasta."
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
                            title={item.title}
                            meta={item.releaseYear ? String(item.releaseYear) : "Sem ano"}
                            coverUrl={item.coverUrl}
                          />
                        </Link>
                        <div className="favorite-manage-actions">
                          <button
                            type="button"
                            className="filter-chip"
                            disabled={busyFav || globalIndex === 0}
                            onClick={() => void handleMoveFavorite(item.id, "top")}
                            title="Colocar no topo dos favoritos"
                          >
                            Topo
                          </button>
                          <button
                            type="button"
                            className="filter-chip"
                            disabled={busyFav || globalIndex === 0}
                            onClick={() => void handleMoveFavorite(item.id, -1)}
                            title="Mover para trás"
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            className="filter-chip"
                            disabled={busyFav || globalIndex === favorites.length - 1}
                            onClick={() => void handleMoveFavorite(item.id, 1)}
                            title="Mover para frente"
                          >
                            →
                          </button>
                          <button
                            type="button"
                            className="filter-chip"
                            disabled={busyFav}
                            onClick={() => void handleRemoveFavorite(item.id)}
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
                            <img src={item.coverUrl} alt={item.title} />
                          ) : (
                            <span className="media-card-orb" />
                          )}
                          <div className="featured-showcase-overlay">
                            <UiBadge tone="secondary">#{index + 1} Favorito</UiBadge>
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
          )}

          {activeTab === "achievements" && (
            <section className="content-panel">
              <SectionHeading
                eyebrow="Conquistas"
                title={`Insígnias culturais (${unlockedBadges.length}/${achievements.length})`}
                description="Marcos desbloqueados automaticamente conforme obras são concluídas e avaliadas."
              />
              <div className="achievements-grid">
                {achievements.map((badge) => {
                  const pct = Math.min(100, Math.round((badge.current / Math.max(1, badge.target)) * 100));
                  return (
                    <div
                      key={badge.id}
                      className={`achievement-card${badge.unlocked ? " is-unlocked" : " is-locked"}`}
                    >
                      <div className="achievement-icon" aria-hidden="true">
                        {badge.icon}
                      </div>
                      <div className="achievement-body">
                        <div className="achievement-header">
                          <strong>{badge.title}</strong>
                          <span className="achievement-counter">
                            {badge.current}/{badge.target}
                          </span>
                        </div>
                        <p>{badge.description}</p>
                        <div className="achievement-progress-bar">
                          <span style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {activeTab === "activity" && (
            <section className="content-panel">
              <SectionHeading
                eyebrow="Atividade"
                title="Histórico de atividades"
                description="O que mudou recentemente na estante."
              />
              {data.activity.length > 0 ? (
                <ActivityList items={data.activity} showAuthor={false} />
              ) : (
                <p className="panel-note">Nenhuma atividade ainda.</p>
              )}
            </section>
          )}
        </>
      )}

      {followModalTab !== null && (
        <FollowListModal
          isOpen={true}
          onClose={() => setFollowModalTab(null)}
          username={profile.username}
          initialTab={followModalTab}
          followersCount={data.followers}
          followingCount={data.following}
        />
      )}
    </main>
  );
}
