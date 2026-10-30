"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MediaCard } from "./media-card";
import { SectionHeading } from "./section-heading";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import {
  errorMessage,
  FavoriteEntry,
  getFavorites,
  getTrackingItems,
  TrackingEntry
} from "../lib/api";
import { getMediaTypeLabel, MediaType } from "../lib/catalogo-api";

const CATEGORIES: Array<{ type: MediaType; title: string; award: string }> = [
  { type: "GAME", title: "Jogos", award: "Game of the Year (GOTY)" },
  { type: "MOVIE", title: "Filmes", award: "Filme do Ano" },
  { type: "SERIES", title: "Séries", award: "Série do Ano" },
  { type: "BOOK", title: "Livros", award: "Livro do Ano" }
];

export function RecapShell() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | "all">(currentYear);
  const [items, setItems] = useState<TrackingEntry[]>([]);
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customPicks, setCustomPicks] = useState<Partial<Record<MediaType, string>>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([getTrackingItems(), getFavorites()])
      .then(([trackingData, favData]) => {
        setItems(trackingData);
        setFavorites(favData);
      })
      .catch((err) => setError(errorMessage(err, "Não foi possível carregar sua retrospectiva.")))
      .finally(() => setLoaded(true));
  }, []);

  const favIds = useMemo(() => new Set(favorites.map((f) => f.mediaItemId)), [favorites]);

  const yearItems = useMemo(() => {
    if (selectedYear === "all") {
      return items;
    }
    return items.filter((entry) => {
      const dateStr = entry.finishedAt ?? entry.updatedAt;
      return new Date(dateStr).getFullYear() === selectedYear;
    });
  }, [items, selectedYear]);

  const completedInPeriod = useMemo(
    () => yearItems.filter((i) => i.status === "COMPLETED"),
    [yearItems]
  );

  const stats = useMemo(() => {
    const movies = completedInPeriod.filter((i) => i.item?.type === "MOVIE").length;
    const series = completedInPeriod.filter((i) => i.item?.type === "SERIES").length;
    const games = completedInPeriod.filter((i) => i.item?.type === "GAME").length;
    const books = completedInPeriod.filter((i) => i.item?.type === "BOOK").length;
    const ratings = yearItems.flatMap((i) => (i.rating ? [i.rating] : []));
    const avgRating = ratings.length
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : "—";

    return {
      totalCompleted: completedInPeriod.length,
      movies,
      series,
      games,
      books,
      avgRating
    };
  }, [completedInPeriod, yearItems]);

  const winnersByCategory = useMemo(() => {
    const result: Partial<Record<MediaType, TrackingEntry>> = {};
    for (const cat of CATEGORIES) {
      const candidates = yearItems
        .filter((i) => i.item?.type === cat.type && i.status !== "DROPPED")
        .sort((a, b) => {
          const score = (e: TrackingEntry) =>
            (e.rating ?? 0) * 10 + (favIds.has(e.mediaItemId) ? 5 : 0) + (e.status === "COMPLETED" ? 3 : 0);
          return score(b) - score(a);
        });

      const customId = customPicks[cat.type];
      const chosen = customId ? candidates.find((c) => c.mediaItemId === customId) ?? candidates[0] : candidates[0];
      if (chosen) {
        result[cat.type] = chosen;
      }
    }
    return result;
  }, [yearItems, favIds, customPicks]);

  const topRated = useMemo(() => {
    return [...yearItems]
      .filter((i) => (i.rating ?? 0) >= 4 || favIds.has(i.mediaItemId))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 8);
  }, [yearItems, favIds]);

  async function handleShareRecap() {
    const periodLabel = selectedYear === "all" ? "Geral" : String(selectedYear);
    const lines = [
      `🎬 Meu Trak Recap (${periodLabel})`,
      `Concluídos: ${stats.totalCompleted} (${stats.movies} filmes, ${stats.series} séries, ${stats.games} jogos, ${stats.books} livros)`,
      `Nota média: ${stats.avgRating} ★`
    ];
    for (const cat of CATEGORIES) {
      const w = winnersByCategory[cat.type];
      if (w?.item) {
        lines.push(`🏆 ${cat.award}: ${w.item.title}`);
      }
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // ignora se clipboard indisponivel
    }
  }

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="content-hero">
        <div>
          <UiBadge tone="primary">Wrapped & GOTY</UiBadge>
          <h1>Sua Retrospectiva no Trak.</h1>
          <p>
            Relembre tudo o que você assistiu, jogou e leu, descubra seu ritmo e eleja os seus favoritos do ano em cada
            categoria (estilo Spotify Wrapped e Backloggd GOTY).
          </p>
        </div>

        <div className="content-summary">
          <div className="filter-chips" role="group" aria-label="Período da retrospectiva">
            <button
              type="button"
              className={`filter-chip${selectedYear === currentYear ? " is-active" : ""}`}
              onClick={() => setSelectedYear(currentYear)}
            >
              {currentYear}
            </button>
            <button
              type="button"
              className={`filter-chip${selectedYear === currentYear - 1 ? " is-active" : ""}`}
              onClick={() => setSelectedYear(currentYear - 1)}
            >
              {currentYear - 1}
            </button>
            <button
              type="button"
              className={`filter-chip${selectedYear === "all" ? " is-active" : ""}`}
              onClick={() => setSelectedYear("all")}
            >
              Todo o histórico
            </button>
          </div>
          <div className="item-next-actions" style={{ marginTop: "14px" }}>
            <UiButton variant="secondary" onClick={() => void handleShareRecap()}>
              {copied ? "Resumo copiado!" : "Copiar resumo para compartilhar"}
            </UiButton>
          </div>
        </div>
      </section>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <section className="tracking-grid">
        <UiCard>
          <span>Concluídos</span>
          <strong>{loaded ? String(stats.totalCompleted).padStart(2, "0") : "—"}</strong>
        </UiCard>
        <UiCard>
          <span>Filmes & Séries</span>
          <strong>{loaded ? `${stats.movies + stats.series}` : "—"}</strong>
        </UiCard>
        <UiCard>
          <span>Jogos & Livros</span>
          <strong>{loaded ? `${stats.games + stats.books}` : "—"}</strong>
        </UiCard>
        <UiCard>
          <span>Nota Média</span>
          <strong>{loaded ? `${stats.avgRating} ★` : "—"}</strong>
        </UiCard>
      </section>

      <section className="content-panel">
        <SectionHeading
          eyebrow="Melhores do Ano"
          title="Seus Eleitos (GOTY & Favoritos)"
          description="Escolha sua obra número 1 em cada categoria a partir do que você acompanhou."
        />

        {!loaded && <p className="panel-note">Calculando seus destaques…</p>}

        {loaded && yearItems.length === 0 && (
          <UiCard className="empty-state">
            <UiBadge tone="secondary">Sem registros neste período</UiBadge>
            <h3>Você ainda não tem itens registrados neste período.</h3>
            <p>Marque filmes, séries, jogos ou livros como concluídos ou avalie com estrelas para montar seu Recap.</p>
            <div className="item-next-actions">
              <UiButton href="/catalogo">Explorar catálogo</UiButton>
            </div>
          </UiCard>
        )}

        {loaded && yearItems.length > 0 && (
          <div className="recap-awards-grid">
            {CATEGORIES.map((cat) => {
              const winner = winnersByCategory[cat.type];
              const options = yearItems.filter((i) => i.item?.type === cat.type && i.status !== "DROPPED");

              if (!winner?.item) {
                return (
                  <UiCard key={cat.type} className="favorite-manage-card">
                    <div>
                      <UiBadge tone="secondary">{cat.award}</UiBadge>
                      <h3 style={{ marginTop: "12px" }}>Sem {cat.title.toLowerCase()}</h3>
                      <p style={{ color: "var(--muted)", marginTop: "6px" }}>
                        Adicione {cat.title.toLowerCase()} ao seu tracking para escolher seu vencedor.
                      </p>
                    </div>
                  </UiCard>
                );
              }

              return (
                <div key={cat.type} className="recap-award-slot">
                  <Link href={`/itens/${winner.mediaItemId}`} className="recap-award-card-link">
                    <MediaCard
                      type={`🏆 ${cat.award}`}
                      mediaType={winner.item.type}
                      title={winner.item.title}
                      meta={winner.item.releaseYear ? String(winner.item.releaseYear) : "Sem ano"}
                      coverUrl={winner.item.coverUrl}
                      progress={winner.rating ? `Sua nota: ${winner.rating} ★` : "Destaque da categoria"}
                    />
                  </Link>
                  {options.length > 1 && (
                    <label className="recap-award-picker">
                      <span>Trocar vencedor ({cat.title}):</span>
                      <select
                        value={winner.mediaItemId}
                        onChange={(e) => setCustomPicks((prev) => ({ ...prev, [cat.type]: e.target.value }))}
                      >
                        {options.map((opt) => (
                          <option key={opt.mediaItemId} value={opt.mediaItemId}>
                            {opt.item?.title ?? opt.mediaItemId} {opt.rating ? `(${opt.rating}★)` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {topRated.length > 0 && (
        <section className="content-panel">
          <SectionHeading
            eyebrow="Hall da Fama"
            title="Mais bem avaliados por você"
            description="As obras que receberam suas maiores notas ou entraram nos favoritos."
          />
          <div className="catalog-grid" style={{ marginTop: "18px" }}>
            {topRated.map((entry) => (
              <Link key={entry.id} href={`/itens/${entry.mediaItemId}`}>
                <MediaCard
                  type={entry.item ? getMediaTypeLabel(entry.item.type, entry.item.subtype) : "Item"}
                  mediaType={entry.item?.type}
                  title={entry.item?.title ?? entry.mediaItemId}
                  meta={entry.item?.releaseYear ? String(entry.item.releaseYear) : "Sem ano"}
                  coverUrl={entry.item?.coverUrl}
                  accent={entry.rating ? `${entry.rating} ★` : "Favorito"}
                />
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
