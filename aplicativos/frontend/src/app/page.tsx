import type { Metadata } from "next";

import { MediaGrid } from "../componentes/media-grid";
import { SectionHeading } from "../componentes/section-heading";
import { SiteHeader } from "../componentes/site-header";
import { UiBadge } from "../componentes/ui-badge";
import { UiButton } from "../componentes/ui-button";
import { UiCard } from "../componentes/ui-card";
import { getCatalogItems } from "../lib/catalogo-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trak | Acompanhe filmes, séries, jogos e livros",
  description:
    "Organize o que você assiste, joga e lê. Marque episódios, dê notas, siga amigos e receba alertas de estreias. Grátis.",
  openGraph: {
    title: "Trak | Acompanhe filmes, séries, jogos e livros",
    description: "Organize o que você assiste, joga e lê, em um só lugar.",
    type: "website"
  }
};

const features = [
  {
    badge: "Tudo junto",
    title: "Filmes, séries, jogos e livros",
    description: "Um só lugar para o que você quer ver, está vendo e já terminou. Dados do TMDB, RAWG e Open Library."
  },
  {
    badge: "Séries",
    title: "Progresso por episódio",
    description: "Marque episódio a episódio ou a temporada inteira. O Trak calcula onde você parou."
  },
  {
    badge: "Sua opinião",
    title: "Notas e anotações",
    description: "Dê de 1 a 5 estrelas, anote o que achou e marque como abandonado sem culpa."
  },
  {
    badge: "Social",
    title: "Siga amigos",
    description: "Perfil público, feed com o que seus amigos estão assistindo e comentários em cada item."
  },
  {
    badge: "Para você",
    title: "Recomendações e alertas",
    description: "Sugestões a partir do que você curtiu e avisos de novos episódios e estreias."
  },
  {
    badge: "Sem recomeçar",
    title: "Importe seu histórico",
    description: "Traga sua lista do Letterboxd, Trakt e Steam. Instale no celular como um app."
  }
];

export default async function Home() {
  const { items, offline } = await getCatalogItems();
  const destaques = offline ? [] : items.filter((item) => item.coverUrl).slice(0, 8);

  return (
    <main className="home-shell">
      <SiteHeader />

      <section className="hero-card">
        <div className="hero-copy">
          <UiBadge tone="primary">Grátis</UiBadge>
          <h1>Tudo o que você assiste, joga e lê.</h1>
          <p>
            O Trak organiza filmes, séries, jogos e livros num só lugar: marque onde parou, dê notas, siga amigos e
            descubra o próximo favorito.
          </p>

          <div className="cta-row">
            <UiButton href="/entrar">Criar conta grátis</UiButton>
            <UiButton href="/catalogo" variant="secondary">
              Explorar o catálogo
            </UiButton>
          </div>
        </div>
      </section>

      <section className="roadmap-block">
        <SectionHeading
          eyebrow="Por que o Trak"
          title="Feito para quem consome de tudo"
          description="Sem planilhas, sem cinco apps diferentes."
        />
        <div className="landing-features">
          {features.map((feature) => (
            <UiCard key={feature.title}>
              <UiBadge tone="secondary">{feature.badge}</UiBadge>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </UiCard>
          ))}
        </div>
      </section>

      {destaques.length > 0 && (
        <section className="roadmap-block">
          <SectionHeading
            eyebrow="Em alta"
            title="O que está bombando esta semana"
            description="Abra qualquer item para ver detalhes, comentários e parecidos."
          />
          <MediaGrid items={destaques} label="Em alta" />
        </section>
      )}
    </main>
  );
}
