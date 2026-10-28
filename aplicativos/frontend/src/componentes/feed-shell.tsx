"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

import { ActivityList } from "./activity-list";
import { FollowListModal } from "./follow-list-modal";
import { FollowButton } from "./follow-button";
import { SectionHeading } from "./section-heading";
import { SiteHeader } from "./site-header";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import { useAuth } from "../contextos/auth-context";
import {
  Activity,
  ehUsernameProvisorio,
  errorMessage,
  getFeed,
  getPublicProfile,
  PublicProfile,
  searchProfiles
} from "../lib/api";
import { MediaType } from "../lib/catalogo-api";

export function FeedShell() {
  const { profile } = useAuth();
  const [feed, setFeed] = useState<{ followingCount: number; items: Activity[] } | null>(null);
  const [myPublicProfile, setMyPublicProfile] = useState<PublicProfile | null>(null);
  const [followModalTab, setFollowModalTab] = useState<"followers" | "following" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ username: string; displayName: string | null }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filtros da Timeline
  const [mediaFilter, setMediaFilter] = useState<MediaType | "">("");
  const [authorFilter, setAuthorFilter] = useState<"ALL" | "FRIENDS" | "ME">("ALL");

  useEffect(() => {
    getFeed()
      .then(setFeed)
      .catch((err) => setError(errorMessage(err, "Não foi possível carregar o feed.")));
  }, []);

  useEffect(() => {
    if (profile?.username && !ehUsernameProvisorio(profile.username)) {
      getPublicProfile(profile.username)
        .then(setMyPublicProfile)
        .catch(() => {});
    }
  }, [profile?.username]);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setIsSearching(true);
    try {
      setResults(await searchProfiles(query));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSearching(false);
    }
  }

  const allItems = useMemo(() => feed?.items ?? [], [feed]);

  // Contagens para os filtros
  const counts = useMemo(() => {
    const byType: Record<string, number> = { MOVIE: 0, SERIES: 0, GAME: 0, BOOK: 0 };
    allItems.forEach((a) => {
      if (a.item?.type && byType[a.item.type] !== undefined) {
        byType[a.item.type]++;
      }
    });
    return {
      all: allItems.length,
      movie: byType.MOVIE,
      series: byType.SERIES,
      game: byType.GAME,
      book: byType.BOOK
    };
  }, [allItems]);

  // Aplicação dos filtros
  const filteredItems = useMemo(() => {
    return allItems.filter((activity) => {
      // Filtro por tipo de mídia
      if (mediaFilter !== "" && activity.item?.type !== mediaFilter) {
        return false;
      }

      // Filtro por autor
      const isMyActivity =
        !activity.user ||
        (profile && activity.user.username.toLowerCase() === profile.username.toLowerCase());

      if (authorFilter === "FRIENDS" && isMyActivity) {
        return false;
      }
      if (authorFilter === "ME" && !isMyActivity) {
        return false;
      }

      return true;
    });
  }, [allItems, mediaFilter, authorFilter, profile]);

  const userInitial = (profile?.displayName || profile?.username || "U")[0]?.toUpperCase() ?? "?";

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="content-hero">
        <div>
          <h1>Feed</h1>
          <p>Acompanhe em tempo real o que as pessoas que você segue estão assistindo, jogando e lendo.</p>
        </div>
      </section>

      {(!profile || ehUsernameProvisorio(profile.username)) && (
        <div style={{ marginBottom: "24px" }}>
          <UiCard className="tracking-summary">
            <div>
              <strong>Escolha seu nome de usuário</strong>
              <p>É por ele que seus amigos vão encontrar e seguir você.</p>
            </div>
            <UiButton href="/perfil">Editar perfil</UiButton>
          </UiCard>
        </div>
      )}

      <div className="feed-layout">
        {/* Coluna Principal: Timeline */}
        <div className="feed-main">
          {/* Barra de Filtros */}
          <div className="feed-filters-container">
            <div className="feed-filters-row" role="tablist" aria-label="Filtrar por tipo de mídia">
              <button
                type="button"
                className={`feed-filter-chip ${mediaFilter === "" ? "is-active" : ""}`}
                onClick={() => setMediaFilter("")}
              >
                Todos
                <span className="feed-filter-badge">{counts.all}</span>
              </button>
              <button
                type="button"
                className={`feed-filter-chip ${mediaFilter === "MOVIE" ? "is-active" : ""}`}
                onClick={() => setMediaFilter("MOVIE")}
              >
                🎬 Filmes
                <span className="feed-filter-badge">{counts.movie}</span>
              </button>
              <button
                type="button"
                className={`feed-filter-chip ${mediaFilter === "SERIES" ? "is-active" : ""}`}
                onClick={() => setMediaFilter("SERIES")}
              >
                📺 Séries
                <span className="feed-filter-badge">{counts.series}</span>
              </button>
              <button
                type="button"
                className={`feed-filter-chip ${mediaFilter === "GAME" ? "is-active" : ""}`}
                onClick={() => setMediaFilter("GAME")}
              >
                🎮 Jogos
                <span className="feed-filter-badge">{counts.game}</span>
              </button>
              <button
                type="button"
                className={`feed-filter-chip ${mediaFilter === "BOOK" ? "is-active" : ""}`}
                onClick={() => setMediaFilter("BOOK")}
              >
                📚 Livros
                <span className="feed-filter-badge">{counts.book}</span>
              </button>
            </div>

            <div className="feed-filters-row" aria-label="Filtrar por autor">
              <button
                type="button"
                className={`feed-filter-chip ${authorFilter === "ALL" ? "is-active" : ""}`}
                onClick={() => setAuthorFilter("ALL")}
              >
                Todos os autores
              </button>
              <button
                type="button"
                className={`feed-filter-chip ${authorFilter === "FRIENDS" ? "is-active" : ""}`}
                onClick={() => setAuthorFilter("FRIENDS")}
              >
                Apenas amigos
              </button>
              <button
                type="button"
                className={`feed-filter-chip ${authorFilter === "ME" ? "is-active" : ""}`}
                onClick={() => setAuthorFilter("ME")}
              >
                Minhas atividades
              </button>
            </div>
          </div>

          <section className="content-panel">
            <SectionHeading
              eyebrow="Timeline"
              title="Atividades recentes"
              description="Atualizações culturais dos seus círculos."
            />

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            {!feed && !error && <p className="panel-note">Carregando timeline…</p>}

            {feed && filteredItems.length === 0 && (
              <p className="panel-note">
                {mediaFilter !== "" || authorFilter !== "ALL"
                  ? "Nenhuma atividade encontrada para os filtros selecionados."
                  : feed.followingCount === 0
                    ? "Você ainda não segue ninguém. Busque amigos na lateral para ver o que eles estão acompanhando!"
                    : "Nenhuma novidade recente na sua rede."}
              </p>
            )}

            {filteredItems.length > 0 && <ActivityList items={filteredItems} showAuthor={true} />}
          </section>
        </div>

        {/* Coluna Lateral: Perfil, Busca de Amigos e Status */}
        <aside className="feed-sidebar">
          {/* Card do Usuário */}
          {profile && (
            <div className="feed-sidebar-card">
              <div className="feed-user-profile-header">
                <div className="feed-user-avatar">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarUrl} alt="" />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
                <div className="feed-user-names">
                  <span className="feed-user-display">
                    {profile.displayName || `@${profile.username}`}
                  </span>
                  <span className="feed-user-handle">@{profile.username}</span>
                </div>
              </div>

              {myPublicProfile && (
                <div className="feed-stats-row">
                  <button
                    type="button"
                    className="feed-stat-btn"
                    onClick={() => setFollowModalTab("followers")}
                    aria-label={`Ver ${myPublicProfile.followers} seguidores`}
                  >
                    <strong>{myPublicProfile.followers}</strong>
                    <span>seguidores</span>
                  </button>
                  <button
                    type="button"
                    className="feed-stat-btn"
                    onClick={() => setFollowModalTab("following")}
                    aria-label={`Ver ${myPublicProfile.following} seguindo`}
                  >
                    <strong>{myPublicProfile.following}</strong>
                    <span>seguindo</span>
                  </button>
                </div>
              )}

              <UiButton href={`/u/${encodeURIComponent(profile.username)}`} variant="secondary">
                Ver meu perfil
              </UiButton>
            </div>
          )}

          {/* Card Encontrar Amigos */}
          <div className="feed-sidebar-card">
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Encontrar amigos</h3>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
              Busque outros membros da comunidade pelo nome ou @usuário.
            </p>

            <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px" }}>
              <input
                type="search"
                maxLength={50}
                value={query}
                placeholder="@usuario"
                onChange={(e) => setQuery(e.target.value.slice(0, 50))}
                className="follow-search-input"
              />
              <UiButton type="submit" variant="secondary" disabled={query.trim().length < 2 || isSearching}>
                {isSearching ? "..." : "Buscar"}
              </UiButton>
            </form>

            {results.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                {results.map((person) => (
                  <div
                    key={person.username}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      padding: "6px 8px",
                      borderRadius: "10px",
                      background: "rgba(255, 255, 255, 0.03)"
                    }}
                  >
                    <Link
                      href={`/u/${encodeURIComponent(person.username)}`}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        fontSize: "0.85rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      <strong>{person.displayName || `@${person.username}`}</strong>
                      {person.displayName && (
                        <span style={{ color: "var(--muted)", marginLeft: "4px" }}>@{person.username}</span>
                      )}
                    </Link>
                    <FollowButton username={person.username} initialFollowing={false} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {profile && followModalTab !== null && (
        <FollowListModal
          isOpen={true}
          onClose={() => setFollowModalTab(null)}
          username={profile.username}
          initialTab={followModalTab}
          followersCount={myPublicProfile?.followers ?? 0}
          followingCount={myPublicProfile?.following ?? feed?.followingCount ?? 0}
        />
      )}
    </main>
  );
}
