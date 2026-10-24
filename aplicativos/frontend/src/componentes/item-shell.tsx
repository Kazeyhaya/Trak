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

function resolveProviderUrl(providerName: string, title: string, rawUrl?: string | null): string {
  const n = providerName.toLowerCase();
  const q = encodeURIComponent(title.trim());

  // Se ja for um link profundo de loja (ex.: pagina especifica do jogo na Steam/GOG/OpenLibrary), preserva.
  if (
    rawUrl &&
    !rawUrl.includes("themoviedb.org") &&
    !/^https?:\/\/[^/]+\/?$/.test(rawUrl.trim())
  ) {
    return rawUrl;
  }

  if (n.includes("netflix")) return `https://www.netflix.com/search?q=${q}`;
  if (n.includes("amazon") || n.includes("prime video")) return `https://www.primevideo.com/search?phrase=${q}`;
  if (n.includes("apple tv") || n.includes("itunes")) return `https://tv.apple.com/br/search?term=${q}`;
  if (n.includes("disney")) return `https://www.disneyplus.com/pt-br`;
  if (n === "max" || n.includes("hbo max") || n.includes("max amazon")) return `https://play.max.com/search?q=${q}`;
  if (n.includes("globoplay") || n.includes("telecine")) return `https://globoplay.globo.com/busca/?q=${q}`;
  if (n.includes("crunchyroll")) return `https://www.crunchyroll.com/pt-br/search?q=${q}`;
  if (n.includes("paramount")) return `https://www.paramountplus.com/br/`;
  if (n.includes("claro")) return `https://www.clarotvmais.com.br/`;
  if (n.includes("google play") && !n.includes("game")) return `https://tv.google/search?q=${q}`;
  if (n.includes("google tv")) return `https://tv.google/search?q=${q}`;
  if (n.includes("youtube")) return `https://www.youtube.com/results?search_query=${q}`;
  if (n.includes("plex")) return `https://watch.plex.tv/search?q=${q}`;
  if (n.includes("fandango") || n.includes("vudu")) {
    return `https://athome.fandango.com/content/browse/search?searchString=${q}`;
  }
  if (n.includes("mubi")) return `https://mubi.com/pt/search/films?query=${q}`;
  if (n.includes("looke")) return `https://www.looke.com.br/search/${q}`;
  if (n.includes("pluto")) return `https://pluto.tv/br/search`;
  if (n.includes("mercado play") || n.includes("mercado livre")) return `https://play.mercadolivre.com.br/`;
  if (n.includes("steam")) return `https://store.steampowered.com/search/?term=${q}`;
  if (n.includes("playstation")) return `https://store.playstation.com/pt-br/search/${q}`;
  if (n.includes("xbox")) return `https://www.xbox.com/pt-br/Search/Results?q=${q}`;
  if (n.includes("nintendo")) return `https://www.nintendo.com/pt-br/search/#q=${q}`;
  if (n.includes("epic")) return `https://store.epicgames.com/pt-BR/browse?q=${q}`;
  if (n.includes("gog")) return `https://www.gog.com/en/games?query=${q}`;
  if (n.includes("itch")) return `https://itch.io/search?q=${q}`;
  if (n.includes("microsoft")) return `https://www.microsoft.com/pt-br/search/explore?q=${q}`;

  return rawUrl || `https://www.google.com/search?q=${encodeURIComponent(`${title} ${providerName}`)}`;
}

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
                  const targetUrl = resolveProviderUrl(provider.name, item.title, provider.url);
                  return (
                    <a
                      key={`${provider.name}-${provider.category}`}
                      href={targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="filter-chip"
                    >
                      {label} ↗
                    </a>
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

        {isSeries && (
          <p className="panel-note">
            Progresso: {progress}% · marque os episódios na seção abaixo.
          </p>
        )}

        {(item.type === "GAME" || item.type === "BOOK") && (
          <MediaProgressTracker
            item={item}
            progress={progress}
            status={tracking?.status ?? null}
            disabled={loading || saving}
            onProgressChange={handleProgress}
            onMilestoneSelect={(nextProgress, nextStatus) => {
              setProgress(nextProgress);
              if (progressTimer.current) {
                clearTimeout(progressTimer.current);
              }
              void save({ progress: nextProgress, status: nextStatus });
            }}
          />
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

type CheckpointMeta = {
  hoursPlayed?: number;
  platform?: string;
  platinum?: boolean;
  currentPage?: number;
  totalPages?: number;
};

const GAME_PLATFORMS = ["PC / Steam", "PlayStation", "Xbox", "Nintendo Switch", "Portátil / Mobile"];

function MediaProgressTracker({
  item,
  progress,
  status,
  disabled,
  onProgressChange,
  onMilestoneSelect
}: {
  item: CatalogItem;
  progress: number;
  status: TrackingStatus | null;
  disabled: boolean;
  onProgressChange: (value: number) => void;
  onMilestoneSelect: (progress: number, status: TrackingStatus) => void;
}) {
  const isGame = item.type === "GAME";
  const storageKey = `trak:checkpoint:${item.id}`;
  const [meta, setMeta] = useState<CheckpointMeta>({
    hoursPlayed: 0,
    platform: "PC / Steam",
    platinum: false,
    currentPage: 0,
    totalPages: 320
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as CheckpointMeta;
        setMeta((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignora
    }
  }, [storageKey]);

  function updateMeta(patch: Partial<CheckpointMeta>) {
    setMeta((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignora
      }
      return next;
    });
  }

  if (isGame) {
    const hours = meta.hoursPlayed ?? 0;
    const isCompleted = status === "COMPLETED" || progress >= 100;

    return (
      <div className="trak-progress-panel">
        <div className="trak-progress-header">
          <div>
            <span className="eyebrow">Checkpoint Gamer</span>
            <strong>
              {meta.platinum
                ? "💎 Platina / 100% Completo"
                : isCompleted
                  ? "🏆 Campanha Zerada"
                  : `Progresso da jornada: ${progress}%`}
            </strong>
          </div>
          <div className="trak-progress-step-btns">
            <button
              type="button"
              className="filter-chip"
              disabled={disabled || progress <= 0}
              onClick={() => onProgressChange(Math.max(0, progress - 5))}
            >
              −5%
            </button>
            <button
              type="button"
              className="filter-chip"
              disabled={disabled || progress >= 100}
              onClick={() => onProgressChange(Math.min(100, progress + 5))}
            >
              +5%
            </button>
          </div>
        </div>

        <div className="trak-progress-bar-wrap">
          <div className="trak-progress-bar-fill" style={{ width: `${Math.min(100, progress)}%` }} />
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={progress}
            disabled={disabled}
            aria-label="Porcentagem do jogo"
            onChange={(event) => {
              const val = Number(event.target.value);
              if (val < 100 && meta.platinum) {
                updateMeta({ platinum: false });
              }
              onProgressChange(val);
            }}
          />
        </div>

        <div className="trak-milestones-row" role="group" aria-label="Marcos de progresso do jogo">
          <button
            type="button"
            className={`filter-chip${progress === 15 && !meta.platinum ? " is-active" : ""}`}
            disabled={disabled}
            onClick={() => {
              updateMeta({ platinum: false });
              onMilestoneSelect(15, "WATCHING");
            }}
          >
            🌱 Início (15%)
          </button>
          <button
            type="button"
            className={`filter-chip${progress === 50 && !meta.platinum ? " is-active" : ""}`}
            disabled={disabled}
            onClick={() => {
              updateMeta({ platinum: false });
              onMilestoneSelect(50, "WATCHING");
            }}
          >
            ⚔️ Metade (50%)
          </button>
          <button
            type="button"
            className={`filter-chip${progress === 85 && !meta.platinum ? " is-active" : ""}`}
            disabled={disabled}
            onClick={() => {
              updateMeta({ platinum: false });
              onMilestoneSelect(85, "WATCHING");
            }}
          >
            🔥 Reta Final (85%)
          </button>
          <button
            type="button"
            className={`filter-chip${progress === 100 && !meta.platinum && status === "COMPLETED" ? " is-active" : ""}`}
            disabled={disabled}
            onClick={() => {
              updateMeta({ platinum: false });
              onMilestoneSelect(100, "COMPLETED");
            }}
          >
            🏆 História Zerada
          </button>
          <button
            type="button"
            className={`filter-chip${meta.platinum ? " is-active" : ""}`}
            disabled={disabled}
            onClick={() => {
              updateMeta({ platinum: true });
              onMilestoneSelect(100, "COMPLETED");
            }}
          >
            💎 Platina / 100%
          </button>
        </div>

        <div className="trak-session-grid">
          <div className="trak-session-box">
            <span className="trak-session-label">Horas jogadas ({hours}h)</span>
            <div className="trak-session-controls">
              <button
                type="button"
                className="filter-chip"
                onClick={() => updateMeta({ hoursPlayed: Math.max(0, hours - 1) })}
              >
                −1h
              </button>
              <button
                type="button"
                className="filter-chip"
                onClick={() => updateMeta({ hoursPlayed: hours + 1 })}
              >
                +1h
              </button>
              <button
                type="button"
                className="filter-chip"
                onClick={() => updateMeta({ hoursPlayed: hours + 2 })}
              >
                +2h
              </button>
              <button
                type="button"
                className="filter-chip"
                onClick={() => updateMeta({ hoursPlayed: hours + 5 })}
              >
                +5h
              </button>
            </div>
          </div>

          <label className="trak-session-box">
            <span className="trak-session-label">Plataforma</span>
            <select
              value={meta.platform ?? "PC / Steam"}
              onChange={(e) => updateMeta({ platform: e.target.value })}
            >
              {GAME_PLATFORMS.map((plat) => (
                <option key={plat} value={plat}>
                  {plat}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    );
  }

  // Livro: Marcador de Leitura por Paginas + Ritmo + Marcos
  const totalPages = Math.max(1, meta.totalPages ?? 320);
  const currentPage = Math.min(totalPages, Math.max(0, meta.currentPage ?? Math.round((progress / 100) * totalPages)));
  const remainingPages = Math.max(0, totalPages - currentPage);
  const remainingMinutes = Math.round(remainingPages * 1.5);
  const remainingHoursText =
    remainingPages === 0
      ? "Leitura concluída!"
      : remainingMinutes < 60
        ? `~${remainingMinutes} min restantes`
        : `~${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}min restantes`;

  function applyPageChange(nextPage: number, nextTotal = totalPages) {
    const safeTotal = Math.max(1, nextTotal);
    const clampedPage = Math.max(0, Math.min(safeTotal, nextPage));
    const pct = Math.min(100, Math.round((clampedPage / safeTotal) * 100));
    updateMeta({ currentPage: clampedPage, totalPages: safeTotal });
    if (pct >= 100) {
      onMilestoneSelect(100, "COMPLETED");
    } else {
      onProgressChange(pct);
    }
  }

  return (
    <div className="trak-progress-panel">
      <div className="trak-progress-header">
        <div>
          <span className="eyebrow">Marcador de Leitura</span>
          <strong>
            Página {currentPage} de {totalPages} ({progress}%)
          </strong>
        </div>
        <span className="trak-reading-pace">📖 Faltam {remainingPages} págs · {remainingHoursText}</span>
      </div>

      <div className="trak-progress-bar-wrap">
        <div className="trak-progress-bar-fill" style={{ width: `${Math.min(100, progress)}%` }} />
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={progress}
          disabled={disabled}
          aria-label="Porcentagem de leitura"
          onChange={(event) => {
            const pct = Number(event.target.value);
            updateMeta({ currentPage: Math.round((pct / 100) * totalPages) });
            onProgressChange(pct);
          }}
        />
      </div>

      <div className="trak-session-grid">
        <div className="trak-session-box">
          <span className="trak-session-label">Páginas lidas / Total da edição</span>
          <div className="trak-book-pages-inputs">
            <input
              type="number"
              min={0}
              max={totalPages}
              value={currentPage}
              disabled={disabled}
              aria-label="Página atual"
              onChange={(e) => applyPageChange(Number(e.target.value), totalPages)}
            />
            <span>de</span>
            <input
              type="number"
              min={1}
              max={10000}
              value={totalPages}
              disabled={disabled}
              aria-label="Total de páginas do livro"
              onChange={(e) => applyPageChange(currentPage, Number(e.target.value))}
            />
            <span>págs</span>
          </div>
        </div>

        <div className="trak-session-box">
          <span className="trak-session-label">Registrar sessão de leitura</span>
          <div className="trak-session-controls">
            <button
              type="button"
              className="filter-chip"
              disabled={disabled}
              onClick={() => applyPageChange(currentPage + 10)}
            >
              +10 págs
            </button>
            <button
              type="button"
              className="filter-chip"
              disabled={disabled}
              onClick={() => applyPageChange(currentPage + 25)}
            >
              +25 págs
            </button>
            <button
              type="button"
              className="filter-chip"
              disabled={disabled}
              onClick={() => applyPageChange(currentPage + 50)}
            >
              +50 págs
            </button>
          </div>
        </div>
      </div>

      <div className="trak-milestones-row" role="group" aria-label="Marcos de leitura">
        <button
          type="button"
          className={`filter-chip${progress === 15 ? " is-active" : ""}`}
          disabled={disabled}
          onClick={() => {
            updateMeta({ currentPage: Math.round(totalPages * 0.15) });
            onMilestoneSelect(15, "WATCHING");
          }}
        >
          📖 Início (15%)
        </button>
        <button
          type="button"
          className={`filter-chip${progress === 50 ? " is-active" : ""}`}
          disabled={disabled}
          onClick={() => {
            updateMeta({ currentPage: Math.round(totalPages * 0.5) });
            onMilestoneSelect(50, "WATCHING");
          }}
        >
          🔖 Metade (50%)
        </button>
        <button
          type="button"
          className={`filter-chip${progress === 80 ? " is-active" : ""}`}
          disabled={disabled}
          onClick={() => {
            updateMeta({ currentPage: Math.round(totalPages * 0.8) });
            onMilestoneSelect(80, "WATCHING");
          }}
        >
          ⚡ Clímax (80%)
        </button>
        <button
          type="button"
          className={`filter-chip${progress === 100 && status === "COMPLETED" ? " is-active" : ""}`}
          disabled={disabled}
          onClick={() => {
            updateMeta({ currentPage: totalPages });
            onMilestoneSelect(100, "COMPLETED");
          }}
        >
          ✨ Livro Lido (100%)
        </button>
      </div>
    </div>
  );
}
