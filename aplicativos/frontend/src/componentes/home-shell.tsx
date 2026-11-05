"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clapperboard } from "lucide-react";

import { HomeHeroCta } from "./home-hero-cta";
import { LandingDemo } from "./landing-demo";
import { MediaGrid } from "./media-grid";
import { SectionHeading } from "./section-heading";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiButton } from "./ui-button";
import { useAuth } from "../contextos/auth-context";
import { ehUsernameProvisorio, getStatusLabel, getTrackingItems, TrackingEntry } from "../lib/api";
import { CatalogItem, getMediaTypeLabel } from "../lib/catalogo-api";
import { miniaturaCapa } from "../lib/imagens";

type HomeShellProps = {
  destaques: CatalogItem[];
  initialLoggedIn: boolean;
};

export function HomeShell({ destaques, initialLoggedIn }: HomeShellProps) {
  const { user, profile, loading } = useAuth();
  const isLoggedIn = loading ? initialLoggedIn : Boolean(user);
  const [library, setLibrary] = useState<TrackingEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getTrackingItems()
      .then((items) => {
        if (active) setLibrary(items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  const inProgress = library.filter(
    (entry): entry is TrackingEntry & { item: CatalogItem } =>
      entry.status === "WATCHING" && Boolean(entry.item)
  );
  const greetingName =
    profile?.displayName ||
    (profile?.username && !ehUsernameProvisorio(profile.username) ? `@${profile.username}` : null);

  const customCoverById = new Map<string, string>();
  for (const entry of library) {
    const cover = entry.customCoverUrl || entry.item?.coverUrl;
    if (entry.mediaItemId && cover) {
      customCoverById.set(entry.mediaItemId, cover);
    }
  }
  const destaquesPersonalizados = destaques.map((item) => {
    const customCover = customCoverById.get(item.id);
    return customCover ? { ...item, coverUrl: customCover } : item;
  });

  if (isLoggedIn) {
    return (
      <main className="home-shell">
        <SiteHeader />

        <section className="home-app-bar">
          <div>
            <h1>{greetingName ? `Olá, ${greetingName}` : "Sua estante"}</h1>
            <p>Retome de onde parou ou registre o que acabou de assistir, jogar ou ler.</p>
          </div>
          <div className="home-app-actions">
            <UiButton href="/catalogo">Explorar catálogo</UiButton>
            <UiButton href={profile ? `/u/${profile.username}` : "/painel"} variant="secondary">
              Minha estante
            </UiButton>
          </div>
        </section>

        {inProgress.length > 0 && (
          <section className="feed-in-progress-panel">
            <div className="feed-in-progress-header">
              <div className="feed-in-progress-title">
                <span className="feed-in-progress-dot" aria-hidden="true" />
                <strong>Continuando agora</strong>
                <span className="feed-in-progress-count">{inProgress.length}</span>
              </div>
            </div>

            <div className="feed-in-progress-grid">
              {inProgress.map(({ item, status, progress, customCoverUrl }) => {
                const cover = customCoverUrl || item.coverUrl;
                return (
                  <Link key={item.id} href={`/itens/${item.id}`} className="feed-in-progress-card">
                    <div className="feed-in-progress-art">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          loading="lazy"
                          decoding="async"
                          src={miniaturaCapa(cover, 140) ?? cover}
                          alt={item.title}
                        />
                      ) : (
                        <div className="media-card-fallback">
                          <Clapperboard size={16} aria-hidden="true" />
                          <span>{item.title}</span>
                        </div>
                      )}
                      <div className="feed-in-progress-badge">
                        <UiBadge tone="primary">{getStatusLabel(status, item.type)}</UiBadge>
                      </div>
                    </div>

                    <div className="feed-in-progress-body">
                      <span className="feed-in-progress-type">{getMediaTypeLabel(item.type, item.subtype)}</span>
                      <h3>{item.title}</h3>

                      {(item.type === "GAME" || item.type === "BOOK") && progress > 0 && (
                        <div className="feed-in-progress-bar-wrap">
                          <div className="feed-in-progress-bar">
                            <span style={{ width: `${Math.min(100, progress)}%` }} />
                          </div>
                          <small>{progress}%</small>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {destaquesPersonalizados.length > 0 && (
          <section className="roadmap-block">
            <SectionHeading
              title="Em alta na semana"
              description="Obras populares no catálogo para adicionar à sua fila."
            />
            <MediaGrid items={destaquesPersonalizados} label="Em alta na semana" />
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="home-shell">
      <SiteHeader />

      <section className="hero-card">
        <div className="hero-copy">
          <span className="hero-eyebrow">Diário cultural sem ruído</span>
          <h1>Seu caderno de filmes, séries, jogos e livros.</h1>
          <p>
            Registre cada episódio, página ou hora jogada. Dê notas fracionadas, coroe seus personagens favoritos no
            Panteão e veja apenas o que seus amigos destacaram — sem algoritmo nem efeito manada.
          </p>

          <HomeHeroCta initialLoggedIn={false} />
        </div>
      </section>

      <LandingDemo destaques={destaques} />

      {destaques.length > 0 && (
        <section className="roadmap-block">
          <SectionHeading
            title="Em alta na semana"
            description="Abra qualquer ficha para ver elenco, avaliações e onde assistir, jogar ou ler."
          />
          <MediaGrid items={destaques} label="Em alta na semana" />
        </section>
      )}
    </main>
  );
}
