"use client";

import { useEffect, useState } from "react";

import { MediaGrid } from "./media-grid";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import { errorMessage, getRecommendations, Recommendation } from "../lib/api";

export function RecommendationsShell() {
  const [data, setData] = useState<{ seeds: string[]; items: Recommendation[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRecommendations()
      .then(setData)
      .catch((err) => setError(errorMessage(err, "Não foi possível carregar recomendações.")));
  }, []);

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="content-hero">
        <div>
          <h1>Para você</h1>
          <p>Sugestões a partir do que você deu nota alta, favoritou ou concluiu.</p>
        </div>
        {data && data.seeds.length > 0 && (
          <div className="content-summary">
            <UiBadge tone="secondary">Baseado em</UiBadge>
            <p>{data.seeds.join(", ")}</p>
          </div>
        )}
      </section>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p className="panel-note">Montando suas recomendações…</p>}

      {data && data.items.length === 0 && (
        <UiCard className="empty-state">
          <UiBadge tone="secondary">Ainda sem base</UiBadge>
          <h3>Avalie alguns itens para receber recomendações.</h3>
          <p>Dê 4 ou 5 estrelas, favorite ou conclua o que você curtiu. Também dá para importar seu histórico.</p>
          <div className="item-next-actions">
            <UiButton href="/catalogo">Ir ao catálogo</UiButton>
            <UiButton href="/importar" variant="secondary">
              Importar histórico
            </UiButton>
          </div>
        </UiCard>
      )}

      {data && data.items.length > 0 && <MediaGrid items={data.items} label="Recomendações" />}
    </main>
  );
}
