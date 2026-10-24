import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ActivityList } from "../../../componentes/activity-list";
import { MediaGrid } from "../../../componentes/media-grid";
import { ProfileActions } from "../../../componentes/profile-actions";
import { SectionHeading } from "../../../componentes/section-heading";
import { SiteHeader } from "../../../componentes/site-header";
import { UiBadge } from "../../../componentes/ui-badge";
import { UiCard } from "../../../componentes/ui-card";
import { getMediaTypeLabel, getStatusLabel, PublicProfile } from "../../../lib/api";
import { fetchJson } from "../../../lib/catalogo-api";
import { tokenDoServidor } from "../../../lib/supabase-server";

type ProfilePageProps = { params: Promise<{ username: string }> };

export const dynamic = "force-dynamic";

const getProfile = cache(async (username: string) => {
  const token = await tokenDoServidor();
  return fetchJson<PublicProfile>(`/perfis/${encodeURIComponent(username.toLowerCase())}`, token);
});

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const data = await getProfile(username);

  if (!data) {
    return { title: "Trak | Perfil não encontrado" };
  }

  const nome = data.profile.displayName || `@${data.profile.username}`;
  return {
    title: `${nome} | Trak`,
    description: data.profile.bio ?? `Veja o que ${nome} está assistindo, jogando e lendo no Trak.`,
    robots: data.isPrivate ? { index: false } : undefined
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const data = await getProfile(username);

  if (!data) {
    notFound();
  }

  const { profile, stats, summary, inProgress = [] } = data;
  const theme = profile.theme || "emerald";
  const bannerUrl =
    profile.bannerUrl ||
    data.favorites[0]?.coverUrl ||
    inProgress[0]?.item.coverUrl ||
    null;
  const avatarInitial = (profile.displayName || profile.username || "T").charAt(0).toUpperCase();
  const topFavorites = data.favorites.slice(0, 4);
  const moreFavorites = data.favorites.slice(4);

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
                {avatarInitial}
              </div>
              <div className="profile-identity-copy">
                <h1>{profile.displayName || `@${profile.username}`}</h1>
                {profile.displayName && <p className="profile-handle">@{profile.username}</p>}
                {profile.bio && <p className="profile-bio-text">{profile.bio}</p>}
                <div className="profile-counts">
                  <span>
                    <strong>{data.followers}</strong> seguidores
                  </span>
                  <span>
                    <strong>{data.following}</strong> seguindo
                  </span>
                  {stats && (
                    <span>
                      <strong>{stats.total}</strong> obras no catálogo
                    </span>
                  )}
                </div>
              </div>
            </div>

            <ProfileActions
              username={profile.username}
              initialIsMe={data.isMe}
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

      {data.isPrivate ? (
        <UiCard className="empty-state">
          <h3>Este perfil é privado.</h3>
          <p>Só a própria pessoa vê a lista dela.</p>
        </UiCard>
      ) : (
        <>
          {inProgress.length > 0 && (
            <section className="content-panel">
              <SectionHeading
                eyebrow="Em foco agora"
                title="Obras do momento"
                description="O que está sendo jogado, lido ou assistido atualmente."
              />
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
                      <span className="featured-showcase-type">{getMediaTypeLabel(item.type)}</span>
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
              <SectionHeading
                eyebrow="Vitrine"
                title="Favoritos em destaque"
                description="As principais obras marcadas como favoritas."
              />
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
                      <span className="featured-showcase-type">{getMediaTypeLabel(item.type)}</span>
                      <h3>{item.title}</h3>
                      {item.releaseYear && <small>{item.releaseYear}</small>}
                    </div>
                  </Link>
                ))}
              </div>

              {moreFavorites.length > 0 && (
                <div style={{ marginTop: "20px" }}>
                  <MediaGrid items={moreFavorites} label="Outros favoritos" />
                </div>
              )}
            </section>
          )}

          <section className="content-panel">
            <SectionHeading eyebrow="Atividade" title="Atividade recente" description="O que mudou na lista." />
            {data.activity.length > 0 ? (
              <ActivityList items={data.activity} showAuthor={false} />
            ) : (
              <p className="panel-note">Nenhuma atividade ainda.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
