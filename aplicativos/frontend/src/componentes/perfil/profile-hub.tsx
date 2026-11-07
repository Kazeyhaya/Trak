"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contextos/auth-context";
import {
  errorMessage,
  getPublicProfile,
  type PublicProfile,
  removeFavorite,
  reorderFavorites,
  type TrackingStatus
} from "../../lib/api";
import type { CatalogItem, MediaType } from "../../lib/catalogo-api";
import {
  filtrarConcluidosNoAno,
  filtrarEstante,
  filtrarFavoritos
} from "../../lib/perfil";
import { FollowListModal } from "../follow-list-modal";
import { ProfileActions } from "../profile-actions";
import { SiteHeader } from "../site-header";
import { UiCard } from "../ui-card";
import { AbaAtividade } from "./aba-atividade";
import { AbaConquistas } from "./aba-conquistas";
import { AbaEstante, ITENS_POR_PAGINA } from "./aba-estante";
import { AbaFavoritos } from "./aba-favoritos";
import { AbaVisaoGeral } from "./aba-visao-geral";

type ProfileTab = "overview" | "library" | "favorites" | "achievements" | "activity";

export function ProfileHub({ initialData }: { initialData: PublicProfile }) {
  const { user, profile: authProfile } = useAuth();
  const [data, setData] = useState<PublicProfile>(initialData);
  const [favorites, setFavorites] = useState<CatalogItem[]>(initialData.favorites ?? []);
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [statusFilter, setStatusFilter] = useState<TrackingStatus | "">("");
  const [typeFilter, setTypeFilter] = useState<MediaType | "">("");
  const [favTypeFilter, setFavTypeFilter] = useState<MediaType | "">("");
  const libraryFilterKey = `${statusFilter}:${typeFilter}`;
  const [prevLibraryFilterKey, setPrevLibraryFilterKey] = useState(libraryFilterKey);
  const [libraryDisplayCount, setLibraryDisplayCount] = useState(ITENS_POR_PAGINA);
  const [busyFav, setBusyFav] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followModalTab, setFollowModalTab] = useState<"followers" | "following" | null>(null);

  if (libraryFilterKey !== prevLibraryFilterKey) {
    setPrevLibraryFilterKey(libraryFilterKey);
    setLibraryDisplayCount(ITENS_POR_PAGINA);
  }

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

  const completedThisYear = useMemo(
    () => filtrarConcluidosNoAno(library, currentYear),
    [library, currentYear]
  );

  const goalPct = Math.min(100, Math.round((completedThisYear.length / Math.max(1, annualGoal)) * 100));

  const filteredLibrary = useMemo(
    () => filtrarEstante(library, statusFilter, typeFilter),
    [library, statusFilter, typeFilter]
  );

  const filteredFavorites = useMemo(
    () => filtrarFavoritos(favorites, favTypeFilter),
    [favorites, favTypeFilter]
  );

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
                  <img loading="lazy" decoding="async" src={profile.avatarUrl} alt="" />
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
              initialFollowsYou={data.followsYou}
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
            {!isOwner && (
              <button
                type="button"
                className={`profile-hub-tab${activeTab === "activity" ? " is-active" : ""}`}
                onClick={() => setActiveTab("activity")}
              >
                Atividade
              </button>
            )}
          </nav>

          {activeTab === "overview" && (
            <AbaVisaoGeral
              isOwner={isOwner}
              currentYear={currentYear}
              completedThisYear={completedThisYear}
              annualGoal={annualGoal}
              goalPct={goalPct}
              onGoalChange={handleGoalChange}
              topFavorites={topFavorites}
              totalFavorites={favorites.length}
              onSelectTab={setActiveTab}
              achievements={achievements}
              unlockedBadges={unlockedBadges}
              activity={data.activity}
            />
          )}

          {activeTab === "library" && (
            <AbaEstante
              isOwner={isOwner}
              profile={profile}
              library={library}
              filteredLibrary={filteredLibrary}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              libraryDisplayCount={libraryDisplayCount}
              setLibraryDisplayCount={setLibraryDisplayCount}
            />
          )}

          {activeTab === "favorites" && (
            <AbaFavoritos
              isOwner={isOwner}
              favorites={favorites}
              filteredFavorites={filteredFavorites}
              favTypeFilter={favTypeFilter}
              setFavTypeFilter={setFavTypeFilter}
              busyFav={busyFav}
              onMoveFavorite={handleMoveFavorite}
              onRemoveFavorite={handleRemoveFavorite}
            />
          )}

          {activeTab === "achievements" && (
            <AbaConquistas
              achievements={achievements}
              unlockedBadges={unlockedBadges}
            />
          )}

          {!isOwner && activeTab === "activity" && (
            <AbaAtividade activity={data.activity} />
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
