"use client";

import { useEffect, useState } from "react";

import { SectionHeading } from "./section-heading";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import { getTrackingItems } from "../lib/tracking-api";

type TrackingEntry = {
  id: string;
  mediaItemId: string;
  status: string;
  progress: number;
  favorite: boolean;
};

function deriveStats(items: TrackingEntry[]) {
  const ativos = items.filter((i) => i.status !== "COMPLETED").length;
  const emProgresso = items.filter((i) => i.status === "WATCHING" || i.status === "READING").length;
  const favoritos = items.filter((i) => i.favorite).length;
  const avgProgress =
    items.length > 0
      ? Math.round(items.reduce((sum, i) => sum + (i.progress ?? 0), 0) / items.length)
      : 0;

  return [
    { label: "Itens ativos", value: String(ativos).padStart(2, "0") },
    { label: "Em progresso", value: String(emProgresso).padStart(2, "0") },
    { label: "Favoritos", value: String(favoritos).padStart(2, "0") },
    { label: "Progresso médio", value: `${avgProgress}%` }
  ];
}

const emptyStats = [
  { label: "Itens ativos", value: "—" },
  { label: "Em progresso", value: "—" },
  { label: "Favoritos", value: "—" },
  { label: "Progresso médio", value: "—" }
];

export function TrackingShell() {
  const [items, setItems] = useState<TrackingEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getTrackingItems().then((data) => {
      if (data) {
        setItems(data);
      }
      setLoaded(true);
    });
  }, []);

  const stats = loaded ? deriveStats(items) : emptyStats;

  const timeline = items
    .filter((i) => i.status !== "COMPLETED")
    .slice(0, 5)
    .map((entry) => ({
      mediaItemId: entry.mediaItemId,
      status: entry.status,
      progress: entry.progress
    }));

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="content-hero">
        <div>
          <UiBadge tone="primary">Painel pessoal</UiBadge>
          <h1>Seu radar de tracking para acompanhar progresso, status e ritmo.</h1>
          <p>
            Uma visão central do que está em andamento, do que precisa de atenção e do
            que já foi concluído.
          </p>
        </div>

        <div className="content-summary">
          <UiBadge tone="secondary">{loaded ? `${items.length} registros` : "Carregando..."}</UiBadge>
          <strong>Tracking + timeline + prioridades</strong>
          <p>
            Métricas calculadas a partir dos itens registrados na sua conta.
          </p>
        </div>
      </section>

      <section className="tracking-grid">
        {stats.map((stat) => (
          <UiCard key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </UiCard>
        ))}
      </section>

      <section className="content-panel">
        <SectionHeading
          eyebrow="Timeline"
          title="Em andamento"
          description="Itens ativos no seu tracking, ordenados pela atualização mais recente."
        />

        <div className="timeline-list">
          {!loaded && (
            <UiCard className="timeline-item">
              <UiBadge tone="secondary">Aguardando</UiBadge>
              <div>
                <span>Verificando dados</span>
                <h3>Carregando registros...</h3>
                <p>Os seus itens em andamento aparecem aqui após o login.</p>
              </div>
            </UiCard>
          )}

          {loaded && timeline.length === 0 && (
            <UiCard className="timeline-item">
              <UiBadge tone="secondary">Vazio</UiBadge>
              <div>
                <span>Sem itens ativos</span>
                <h3>Nenhum item em andamento</h3>
                <p>Adicione itens do catálogo e marque o status para ver a timeline.</p>
              </div>
            </UiCard>
          )}

          {timeline.map((entry) => (
            <UiCard key={entry.mediaItemId} className="timeline-item">
              <UiBadge tone="secondary">{entry.status}</UiBadge>
              <div>
                <span>{entry.progress}% concluído</span>
                <h3>
                  <a href={`/itens/${entry.mediaItemId}`}>{entry.mediaItemId}</a>
                </h3>
                <p>Abrir o item para atualizar status ou ajustar progresso.</p>
              </div>
            </UiCard>
          ))}
        </div>

        <div className="item-next-actions">
          <UiButton href="/catalogo">Ir para catálogo</UiButton>
          <UiButton href="/entrar" variant="secondary">
            Revisar acesso
          </UiButton>
        </div>
      </section>
    </main>
  );
}