"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AlertsSection } from "./alerts-section";
import { SectionHeading } from "./section-heading";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import {
  errorMessage,
  FavoriteEntry,
  getFavorites,
  getStatusLabel,
  getTrackingItems,
  TrackingEntry
} from "../lib/api";

function deriveStats(items: TrackingEntry[], favorites: FavoriteEntry[]) {
  const ativos = items.filter((i) => i.status !== "COMPLETED" && i.status !== "DROPPED").length;
  const emProgresso = items.filter((i) => i.status === "WATCHING").length;
  const concluidos = items.filter((i) => i.status === "COMPLETED").length;

  return [
    { label: "Itens ativos", value: String(ativos).padStart(2, "0") },
    { label: "Em progresso", value: String(emProgresso).padStart(2, "0") },
    { label: "Concluídos", value: String(concluidos).padStart(2, "0") },
    { label: "Favoritos", value: String(favorites.length).padStart(2, "0") }
  ];
}

const emptyStats = [
  { label: "Itens ativos", value: "—" },
  { label: "Em progresso", value: "—" },
  { label: "Concluídos", value: "—" },
  { label: "Favoritos", value: "—" }
];

export function TrackingShell() {
  const [items, setItems] = useState<TrackingEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getTrackingItems(), getFavorites()])
      .then(([trackingData, favoritesData]) => {
        setItems(trackingData);
        setFavorites(favoritesData);
      })
      .catch((err) => setError(errorMessage(err, "Não foi possível carregar seu tracking.")))
      .finally(() => setLoaded(true));
  }, []);

  const stats = loaded && !error ? deriveStats(items, favorites) : emptyStats;
  const timeline = items.filter((i) => i.status !== "COMPLETED" && i.status !== "DROPPED").slice(0, 8);

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="content-hero">
        <div>
          <h1>Seu radar de tracking para acompanhar progresso, status e ritmo.</h1>
          <p>
            Uma visão central do que está em andamento, do que precisa de atenção e do
            que já foi concluído.
          </p>
        </div>

        <div className="content-summary">
          <UiBadge tone="secondary">{loaded ? `${items.length} registros` : "Carregando…"}</UiBadge>
          <strong>Tracking + timeline + favoritos</strong>
          <p>Métricas calculadas a partir dos itens registrados na sua conta.</p>
        </div>
      </section>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <section className="tracking-grid">
        {stats.map((stat) => (
          <UiCard key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </UiCard>
        ))}
      </section>

      <AlertsSection />

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
                <h3>Carregando registros…</h3>
              </div>
            </UiCard>
          )}

          {loaded && !error && timeline.length === 0 && (
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
            <UiCard key={entry.id} className="timeline-item">
              <UiBadge tone="secondary">{getStatusLabel(entry.status, entry.item?.type)}</UiBadge>
              <div>
                <span>{entry.progress}% concluído</span>
                <h3>
                  <Link href={`/itens/${entry.mediaItemId}`}>{entry.item?.title ?? entry.mediaItemId}</Link>
                </h3>
                <p>Abra o item para atualizar status ou ajustar progresso.</p>
              </div>
            </UiCard>
          ))}
        </div>

        <div className="item-next-actions">
          <UiButton href="/catalogo">Ir para catálogo</UiButton>
          <UiButton href="/recomendacoes" variant="secondary">
            Recomendações para você
          </UiButton>
          <UiButton href="/importar" variant="secondary">
            Importar histórico
          </UiButton>
        </div>
      </section>

      {favorites.length > 0 && (
        <section className="content-panel">
          <SectionHeading
            eyebrow="Favoritos"
            title="Seus favoritos"
            description="Os itens que você marcou com estrela."
          />

          <div className="timeline-list">
            {favorites.map((favorite) => (
              <UiCard key={favorite.mediaItemId} className="timeline-item">
                {favorite.item?.coverUrl && (
                  <Image className="timeline-cover" src={favorite.item.coverUrl} alt="" width={56} height={84} />
                )}
                <div>
                  <h3>
                    <Link href={`/itens/${favorite.mediaItemId}`}>
                      {favorite.item?.title ?? favorite.mediaItemId}
                    </Link>
                  </h3>
                </div>
              </UiCard>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
