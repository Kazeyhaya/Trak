"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { CommentsSection } from "./comments-section";
import { SectionHeading } from "./section-heading";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import { CatalogItem, getMediaTypeLabel } from "../lib/catalogo-api";
import {
  addFavorite,
  ApiError,
  getFavorites,
  getStatusLabel,
  getTrackingItem,
  removeFavorite,
  removeTrackingItem,
  saveTrackingItem,
  TRACKING_STATUSES,
  TrackingEntry,
  TrackingPayload,
  TrackingStatus
} from "../lib/api";

type ItemShellProps = {
  item: CatalogItem;
};

const PROGRESS_SAVE_DELAY_MS = 600;

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Algo deu errado. Tente novamente.";
}

export function ItemShell({ item }: ItemShellProps) {
  const [tracking, setTracking] = useState<TrackingEntry | null>(null);
  const [progress, setProgress] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([getTrackingItem(item.id), getFavorites()])
      .then(([entry, favorites]) => {
        if (!active) {
          return;
        }
        setTracking(entry);
        setProgress(entry?.progress ?? 0);
        setIsFavorite(favorites.some((favorite) => favorite.mediaItemId === item.id));
      })
      .catch((err) => active && setError(errorMessage(err)))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
      if (progressTimer.current) {
        clearTimeout(progressTimer.current);
      }
    };
  }, [item.id]);

  async function save(payload: TrackingPayload) {
    setSaving(true);
    setError(null);
    try {
      const saved = await saveTrackingItem(item.id, payload);
      setTracking(saved);
      setProgress(saved.progress);
    } catch (err) {
      setError(errorMessage(err));
      setProgress(tracking?.progress ?? 0);
    } finally {
      setSaving(false);
    }
  }

  function handleStatus(status: TrackingStatus) {
    // Concluir um item leva o progresso a 100%.
    void save(status === "COMPLETED" ? { status, progress: 100 } : { status });
  }

  function handleProgress(value: number) {
    setProgress(value);
    if (progressTimer.current) {
      clearTimeout(progressTimer.current);
    }
    progressTimer.current = setTimeout(() => {
      void save({ progress: value, ...(tracking ? {} : { status: "WATCHING" as const }) });
    }, PROGRESS_SAVE_DELAY_MS);
  }

  async function handleRemoveTracking() {
    setSaving(true);
    setError(null);
    try {
      await removeTrackingItem(item.id);
      setTracking(null);
      setProgress(0);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleFavorite() {
    const next = !isFavorite;
    setIsFavorite(next);
    setError(null);
    try {
      await (next ? addFavorite(item.id) : removeFavorite(item.id));
    } catch (err) {
      setIsFavorite(!next);
      setError(errorMessage(err));
    }
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareNotice("Link copiado.");
    } catch {
      // Compartilhamento cancelado pelo usuario.
    }
  }

  const statusLabel = tracking ? getStatusLabel(tracking.status, item.type) : "Fora do tracking";
  const details = [
    { label: "Fonte", value: item.source.toUpperCase() },
    { label: "Ano", value: item.releaseYear ? String(item.releaseYear) : "—" },
    { label: "Tipo", value: getMediaTypeLabel(item.type) },
    { label: "Status", value: loading ? "…" : statusLabel }
  ];

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="item-hero">
        <div className="item-poster" aria-hidden="true">
          {item.coverUrl ? (
            <Image src={item.coverUrl} alt="" width={500} height={750} priority />
          ) : (
            <span />
          )}
        </div>

        <div className="item-copy">
          <h1>{item.title}</h1>
          <p>{item.synopsis ?? "Sinopse indisponível."}</p>

          <div className="item-actions" aria-label="Ações do item">
            <UiButton variant="secondary" pressed={isFavorite} disabled={loading} onClick={handleFavorite}>
              {isFavorite ? "★ Favorito" : "☆ Favoritar"}
            </UiButton>
            <UiButton variant="secondary" onClick={handleShare}>
              Compartilhar
            </UiButton>
            {tracking && (
              <UiButton variant="secondary" disabled={saving} onClick={handleRemoveTracking}>
                Remover do tracking
              </UiButton>
            )}
          </div>
          {shareNotice && (
            <p className="auth-notice" role="status">
              {shareNotice}
            </p>
          )}

          <div className="item-status-block">
            <div className="status-chips" role="group" aria-label="Status de tracking">
              {TRACKING_STATUSES.map((option) => {
                const isActive = tracking?.status === option;
                return (
                  <button
                    key={option}
                    type="button"
                    className={`filter-chip${isActive ? " is-active" : ""}`}
                    aria-pressed={isActive}
                    disabled={loading || saving}
                    onClick={() => handleStatus(option)}
                  >
                    {getStatusLabel(option, item.type)}
                  </button>
                );
              })}
            </div>

            <label className="progress-control">
              <span>Progresso pessoal: {progress}%</span>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                disabled={loading}
                onChange={(event) => handleProgress(Number(event.target.value))}
              />
            </label>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="item-details-grid">
        {details.map((detail) => (
          <UiCard key={detail.label}>
            <span>{detail.label}</span>
            <strong>{detail.value}</strong>
          </UiCard>
        ))}
      </section>

      <section className="content-panel">
        <SectionHeading
          eyebrow="Seu tracking"
          title={tracking ? statusLabel : "Ainda não está no seu tracking"}
          description={
            tracking
              ? `Progresso em ${tracking.progress}%. Ajuste o status ou o progresso acima quando quiser.`
              : "Escolha um status acima para começar a acompanhar este item."
          }
        />

        <UiCard className="tracking-summary">
          <div>
            <UiBadge tone="secondary">{saving ? "Salvando…" : tracking ? "Salvo" : "Não iniciado"}</UiBadge>
            <strong>{item.title}</strong>
          </div>
          <div className="item-next-actions">
            <UiButton href="/catalogo">Voltar ao catálogo</UiButton>
            <UiButton href="/painel" variant="secondary">
              Abrir painel
            </UiButton>
          </div>
        </UiCard>
      </section>

      <CommentsSection mediaItemId={item.id} />
    </main>
  );
}
