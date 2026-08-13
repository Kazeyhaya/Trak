import { SectionHeading } from "./section-heading";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiButton } from "./ui-button";

const roadmapItems = [
  {
    period: "Semana 1-2",
    title: "Base do produto",
    description:
      "Auth, layout base, design system inicial e estados visuais principais."
  },
  {
    period: "Semana 3-4",
    title: "Integração de dados",
    description: "Busca, página de item e favoritos com a API conectada."
  },
  {
    period: "Semana 5-8",
    title: "Experiência completa",
    description: "Tracking, comentários, radar pessoal, performance e beta."
  }
];

const pillars = [
  {
    label: "Base",
    value: "Auth + layout"
  },
  {
    label: "Pronto para",
    value: "APIs e feeds"
  },
  {
    label: "Foco",
    value: "Clareza e ritmo"
  }
];

export function HomeBase() {
  return (
    <main className="home-shell" id="top">
      <SiteHeader />

      <section className="hero-card">
        <div className="hero-copy">
          <UiBadge tone="primary">Week 1-2 base</UiBadge>
          <h1>Trak organiza sua jornada cultural em um unico fluxo.</h1>
          <p>
            Um ponto de entrada limpo para autenticar, navegar e preparar o sistema
            que vai sustentar busca, favoritos, tracking e comunidade.
          </p>

          <div className="cta-row">
            <UiButton href="/entrar">Entrar no projeto</UiButton>
            <UiButton href="#roadmap" variant="secondary">
              Ver a base da semana
            </UiButton>
          </div>

          <dl className="stats-grid" aria-label="Resumo da base do produto">
            {pillars.map((pillar) => (
              <div key={pillar.label}>
                <dt>{pillar.label}</dt>
                <dd>{pillar.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="auth-panel" id="auth">
          <div className="panel-header">
            <span className="panel-title">Acesso</span>
            <UiBadge tone="secondary">Supabase ready</UiBadge>
          </div>

          <div className="field-stack">
            <label>
              Email
              <input type="email" placeholder="voce@exemplo.com" />
            </label>
            <label>
              Senha
              <input type="password" placeholder="••••••••" />
            </label>
          </div>

          <UiButton>Continuar</UiButton>

          <p className="panel-note">
            Nesta fase o painel ainda é visual. A integracao real entra quando a
            autenticacao do Supabase for conectada ao fluxo do app.
          </p>
        </aside>
      </section>

      <section className="roadmap-block" id="roadmap">
        <SectionHeading
          eyebrow="Roadmap"
          title="Fases do produto"
          description="Cada etapa foi organizada para reduzir retrabalho e manter o ritmo de entrega."
        />

        <div className="roadmap-grid">
          {roadmapItems.map((item) => (
            <article key={item.period}>
              <span>{item.period}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}