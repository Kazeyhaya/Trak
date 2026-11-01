"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { HomeHeroCta } from "./home-hero-cta";
import { MediaGrid } from "./media-grid";
import { SectionHeading } from "./section-heading";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiButton } from "./ui-button";
import { useAuth } from "../contextos/auth-context";
import { ehUsernameProvisorio, getPublicProfile, getStatusLabel, PublicProfile } from "../lib/api";
import { CatalogItem, getMediaTypeLabel } from "../lib/catalogo-api";

type HomeShellProps = {
  destaques: CatalogItem[];
  initialLoggedIn: boolean;
};

const pilares = [
  {
    title: "Filmes, séries, jogos e livros",
    description: "Uma estante única para organizar o que você quer ver, está acompanhando ou já concluiu."
  },
  {
    title: "Progresso real",
    description: "Marque episódio por episódio em séries, páginas lidas em livros e horas jogadas."
  },
  {
    title: "Social e sem ruído",
    description: "Acompanhe o que seus amigos estão achando, dê notas de 1 a 5 estrelas e importe seu histórico."
  }
];

export function HomeShell({ destaques, initialLoggedIn }: HomeShellProps) {
  const { user, profile, loading } = useAuth();
  const isLoggedIn = loading ? initialLoggedIn : Boolean(user);
  const [myPublicProfile, setMyPublicProfile] = useState<PublicProfile | null>(null);

  useEffect(() => {
    if (profile?.username && !ehUsernameProvisorio(profile.username)) {
      getPublicProfile(profile.username)
        .then(setMyPublicProfile)
        .catch(() => {});
    }
  }, [profile?.username]);

  const inProgress = myPublicProfile?.inProgress ?? [];
  const greetingName = profile?.displayName || (profile?.username && !ehUsernameProvisorio(profile.username) ? `@${profile.username}` : null);

  if (isLoggedIn) {
    return (
      <main className="home-shell">
        <SiteHeader />

        <section className="home-app-bar">
          <div>
            <h1>{greetingName ? `Olá, ${greetingName}` : "Início"}</h1>
            <p>Continue de onde parou ou descubra o que assistir, jogar e ler a seguir.</p>
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
              {inProgress.map(({ item, status, progress }) => (
                <Link key={item.id} href={`/itens/${item.id}`} className="feed-in-progress-card">
                  <div className="feed-in-progress-art">
                    {item.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.coverUrl} alt={item.title} />
                    ) : (
                      <span className="media-card-orb" />
                    )}
                    <div className="feed-in-progress-badge">
                      <UiBadge tone="primary">{getStatusLabel(status, item.type)}</UiBadge>
                    </div>
                  </div>

                  <div className="feed-in-progress-body">
                    <span className="feed-in-progress-type">
                      {getMediaTypeLabel(item.type, item.subtype, "pt-BR", item.title, item.synopsis)}
                    </span>
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
              ))}
            </div>
          </section>
        )}

        {destaques.length > 0 && (
          <section className="roadmap-block">
            <SectionHeading
              title="Em alta na semana"
              description="Obras populares no catálogo para adicionar à sua fila."
            />
            <MediaGrid items={destaques} label="Em alta na semana" />
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
          <h1>Tudo o que você assiste, joga e lê.</h1>
          <p>
            Organize filmes, séries, jogos e livros num só lugar: marque onde parou, dê notas, siga amigos e descubra o
            próximo favorito.
          </p>

          <HomeHeroCta initialLoggedIn={false} />
        </div>
      </section>

      {destaques.length > 0 && (
        <section className="roadmap-block">
          <SectionHeading
            title="Em alta na semana"
            description="Abra qualquer obra para ver detalhes, avaliações e onde assistir, jogar ou ler."
          />
          <MediaGrid items={destaques} label="Em alta na semana" />
        </section>
      )}

      <section className="roadmap-block">
        <SectionHeading title="Uma estante para tudo" />
        <div className="landing-pillars">
          {pilares.map((pilar) => (
            <article key={pilar.title} className="landing-pillar">
              <h3>{pilar.title}</h3>
              <p>{pilar.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
