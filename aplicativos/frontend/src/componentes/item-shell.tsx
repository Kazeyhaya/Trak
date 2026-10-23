"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { CommentsSection } from "./comments-section";
import { EpisodesPanel } from "./episodes-panel";
import { RatingStars } from "./rating-stars";
import { RelatedItems } from "./related-items";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import { useAuth } from "../contextos/auth-context";
import { CatalogItem, getMediaTypeLabel } from "../lib/catalogo-api";
import {
  addFavorite,
  CatalogExtras,
  checkFavorite,
  errorMessage,
  getCatalogExtras,
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
const NOTES_MAX_LENGTH = 2000;
const SYNOPSIS_PREVIEW_LENGTH = 360;

export function ItemShell({ item }: ItemShellProps) {
  const { user, loading: authLoading } = useAuth();
  const isSeries = item.type === "SERIES";
  const isGame = item.type === "GAME";
  const [extras, setExtras] = useState<CatalogExtras | null>(null);
  const [expandSynopsis, setExpandSynopsis] = useState(false);

  useEffect(() => {
    let active = true;
    getCatalogExtras(item.id)
      .then((data) => active && setExtras(data))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [item.id]);

  const verbWhere =
    item.type === "GAME" ? "Onde jogar" : item.type === "BOOK" ? "Onde ler" : "Onde assistir";

  const fullSynopsis = item.synopsis?.trim() ?? "";
  const isLongSynopsis = fullSynopsis.length > SYNOPSIS_PREVIEW_LENGTH;
  const displayedSynopsis =
    !fullSynopsis
      ? "Sinopse indisponível."
      : isLongSynopsis && !expandSynopsis
        ? `${fullSynopsis.slice(0, SYNOPSIS_PREVIEW_LENGTH).trimEnd()}…`
        : fullSynopsis;

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="item-hero">
        <div className={`item-poster${isGame ? " item-poster--landscape" : ""}`} aria-hidden="true">
          {item.coverUrl ? (
            <Image
              src={item.coverUrl.replace("/media/resize/640/-/games/", "/media/games/")}
              alt=""
              width={isGame ? 1280 : 640}
              height={isGame ? 720 : 960}
              quality={90}
              priority
            />
          ) : (
            <span />
          )}
        </div>

        <div className="item-copy">
          <div className="status-chips">
            <UiBadge tone="secondary">{getMediaTypeLabel(item.type)}</UiBadge>
            {extras?.genres.map((genre) => (
              <UiBadge key={genre} tone="secondary">
                {genre}
              </UiBadge>
            ))}
          </div>
          <h1>{item.title}</h1>
          <div className="item-synopsis">
            <p>{displayedSynopsis}</p>
            {isLongSynopsis && (
              <button
                type="button"
                className="synopsis-toggle"
                onClick={() => setExpandSynopsis((prev) => !prev)}
              >
                {expandSynopsis ? "Mostrar menos" : "Ler mais"}
              </button>
            )}
          </div>

          {authLoading ? null : user ? (
            <PersonalTracking item={item} isSeries={isSeries} />
          ) : (
            <UiCard className="tracking-summary">
              <div>
                <strong>Acompanhe {item.title} no Trak</strong>
                <p>Crie uma conta grátis para marcar status, dar nota, anotar e ver o que seus amigos acham.</p>
              </div>
              <div className="item-next-actions">
                <UiButton href={`/entrar?next=${encodeURIComponent(`/itens/${item.id}`)}`}>Entrar ou criar conta</UiButton>
              </div>
            </UiCard>
          )}
        </div>
      </section>

      <section className="item-details-grid">
        <UiCard>
          <span>Ano</span>
          <strong>{item.releaseYear ?? "—"}</strong>
        </UiCard>
        <UiCard>
          <span>Tipo</span>
          <strong>{getMediaTypeLabel(item.type)}</strong>
        </UiCard>
        <UiCard>
          <span>Nota no Trak</span>
          <strong>
            {extras?.trakRating.average
              ? `${extras.trakRating.average.toLocaleString("pt-BR")} ★ (${extras.trakRating.count})`
              : "Sem avaliações"}
          </strong>
        </UiCard>
      </section>

      {extras && (extras.externalRatings.length > 0 || extras.watchProviders.length > 0) && (
        <section className="content-panel item-extras-panel">
          {extras.externalRatings.length > 0 && (
            <div className="item-extras-block">
              <span className="eyebrow">Avaliações</span>
              <div className="status-chips">
                {extras.externalRatings.map((rating) => (
                  <UiBadge key={rating.source} tone="primary">
                    {rating.source}: {rating.value}
                  </UiBadge>
                ))}
              </div>
            </div>
          )}

          {extras.watchProviders.length > 0 && (
            <div className="item-extras-block">
              <span className="eyebrow">{verbWhere}</span>
              <div className="status-chips">
                {extras.watchProviders.map((provider) => {
                  const tag =
                    provider.category === "RENT"
                      ? " (Aluguel)"
                      : provider.category === "BUY"
                        ? " (Compra)"
                        : "";
                  const label = `${provider.name}${tag}`;
                  return provider.url ? (
                    <a
                      key={`${provider.name}-${provider.category}`}
                      href={provider.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="filter-chip"
                    >
                      {label} ↗
                    </a>
                  ) : (
                    <span key={`${provider.name}-${provider.category}`} className="filter-chip">
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      <RelatedItems mediaItemId={item.id} />
      <CommentsSection mediaItemId={item.id} />
    </main>
  );
}

function PersonalTracking({ item, isSeries }: { item: CatalogItem; isSeries: boolean }) {
  const [tracking, setTracking] = useState<TrackingEntry | null>(null);
  const [progress, setProgress] = useState(0);
  const [notes, setNotes] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackingRef = useRef<TrackingEntry | null>(null);

  function applyTracking(entry: TrackingEntry | null) {
    trackingRef.current = entry;
    setTracking(entry);
    setProgress(entry?.progress ?? 0);
  }

  useEffect(() => {
    let active = true;

    Promise.all([getTrackingItem(item.id), checkFavorite(item.id)])
      .then(([entry, fav]) => {
        if (!active) {
          return;
        }
        applyTracking(entry);
        setNotes(entry?.notes ?? "");
        setIsFavorite(fav.isFavorite);
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

  async function save(payload: TrackingPayload, successNotice?: string) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      applyTracking(await saveTrackingItem(item.id, payload));
      if (successNotice) {
        setNotice(successNotice);
      }
    } catch (err) {
      setError(errorMessage(err));
      setProgress(trackingRef.current?.progress ?? 0);
    } finally {
      setSaving(false);
    }
  }

  function handleProgress(value: number) {
    setProgress(value);
    if (progressTimer.current) {
      clearTimeout(progressTimer.current);
    }
    progressTimer.current = setTimeout(() => {
      // Usa o ref para nao depender do valor capturado quando o timer foi criado.
      void save({ progress: value, ...(trackingRef.current ? {} : { status: "WATCHING" as const }) });
    }, PROGRESS_SAVE_DELAY_MS);
  }

  async function handleRemoveTracking() {
    setSaving(true);
    setError(null);
    try {
      await removeTrackingItem(item.id);
      applyTracking(null);
      setNotes("");
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
      setNotice("Link copiado.");
    } catch {
      // Compartilhamento cancelado pelo usuario.
    }
  }

  const statusLabel = tracking ? getStatusLabel(tracking.status, item.type) : "Fora do tracking";

  return (
    <>
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

      <div className="item-status-block">
        <div className="status-chips" role="group" aria-label="Status de tracking">
          {TRACKING_STATUSES.map((option: TrackingStatus) => {
            const isActive = tracking?.status === option;
            return (
              <button
                key={option}
                type="button"
                className={`filter-chip${isActive ? " is-active" : ""}`}
                aria-pressed={isActive}
                disabled={loading || saving}
                onClick={() => save({ status: option })}
              >
                {getStatusLabel(option, item.type)}
              </button>
            );
          })}
        </div>

        {isSeries ? (
          <p className="panel-note">
            Progresso: {progress}% · marque os episódios na seção abaixo.
          </p>
        ) : (
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
        )}

        <div className="rating-row">
          <span>Sua nota</span>
          <RatingStars
            value={tracking?.rating ?? null}
            disabled={loading || saving}
            onChange={(rating) => save({ rating, ...(trackingRef.current ? {} : { status: "COMPLETED" as const }) })}
          />
        </div>

        <form
          className="field-stack notes-form"
          onSubmit={(event) => {
            event.preventDefault();
            void save({ notes: notes.trim() || null }, "Nota salva.");
          }}
        >
          <label>
            Suas anotações (só você vê)
            <textarea
              value={notes}
              rows={3}
              maxLength={NOTES_MAX_LENGTH}
              placeholder="O que você achou? Onde parou?"
              disabled={loading}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <div className="comment-form-footer">
            <span>
              <UiBadge tone="secondary">{saving ? "Salvando…" : tracking ? statusLabel : "Não iniciado"}</UiBadge>
            </span>
            <UiButton type="submit" variant="secondary" disabled={loading || saving || notes === (tracking?.notes ?? "")}>
              Salvar nota
            </UiButton>
          </div>
        </form>

        {notice && (
          <p className="auth-notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
      </div>

      {isSeries && !loading && <EpisodesPanel mediaItemId={item.id} onTrackingChange={applyTracking} />}
    </>
  );
}
