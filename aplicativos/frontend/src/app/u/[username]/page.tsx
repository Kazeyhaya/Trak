import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { ActivityList } from "../../../componentes/activity-list";
import { MediaGrid } from "../../../componentes/media-grid";
import { ProfileActions } from "../../../componentes/profile-actions";
import { SectionHeading } from "../../../componentes/section-heading";
import { SiteHeader } from "../../../componentes/site-header";
import { UiCard } from "../../../componentes/ui-card";
import { getStatusLabel, PublicProfile, TRACKING_STATUSES } from "../../../lib/api";
import { fetchJson } from "../../../lib/catalogo-api";

type ProfilePageProps = { params: Promise<{ username: string }> };

export const dynamic = "force-dynamic";

const getProfile = cache((username: string) =>
  fetchJson<PublicProfile>(`/perfis/${encodeURIComponent(username.toLowerCase())}`)
);

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

  const { profile, stats } = data;

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="profile-hero">
        <div>
          <h1>{profile.displayName || `@${profile.username}`}</h1>
          {profile.displayName && <p>@{profile.username}</p>}
          {profile.bio && <p>{profile.bio}</p>}
          <div className="profile-counts">
            <span>
              <strong>{data.followers}</strong> seguidores
            </span>
            <span>
              <strong>{data.following}</strong> seguindo
            </span>
          </div>
        </div>
        <ProfileActions username={profile.username} />
      </section>

      {data.isPrivate ? (
        <UiCard className="empty-state">
          <h3>Este perfil é privado.</h3>
          <p>Só a própria pessoa vê a lista dela.</p>
        </UiCard>
      ) : (
        <>
          {stats && (
            <section className="tracking-grid">
              <UiCard>
                <span>No tracking</span>
                <strong>{stats.total}</strong>
              </UiCard>
              {TRACKING_STATUSES.filter((status) => status === "WATCHING" || status === "COMPLETED").map((status) => (
                <UiCard key={status}>
                  <span>{getStatusLabel(status)}</span>
                  <strong>{stats.byStatus[status] ?? 0}</strong>
                </UiCard>
              ))}
              <UiCard>
                <span>Nota média</span>
                <strong>{stats.averageRating ? `${stats.averageRating.toLocaleString("pt-BR")} ★` : "—"}</strong>
              </UiCard>
            </section>
          )}

          {data.favorites.length > 0 && (
            <section className="content-panel">
              <SectionHeading eyebrow="Favoritos" title="Favoritos" description="Os itens marcados com estrela." />
              <MediaGrid items={data.favorites} label="Favoritos" />
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
