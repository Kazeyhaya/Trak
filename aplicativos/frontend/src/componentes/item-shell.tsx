"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Check, Crown, Lock, Star, User } from "lucide-react";

import { RewatchCounter } from "./rewatch-counter";
import { CommentsSection } from "./comments-section";
import { CustomCoverModal } from "./custom-cover-modal";
import { PantheonModal } from "./pantheon-modal";
import type { MediaType } from "../lib/catalogo-api";

// Dynamic status label dictionary per MediaType
const STATUS_LABELS: Record<MediaType | "ALL", { WANT: string; WATCHING: string; COMPLETED: string }> = {
  MOVIE: { WANT: "Quero ver", WATCHING: "Assistindo", COMPLETED: "Concluído" },
  SERIES: { WANT: "Quero ver", WATCHING: "Assistindo", COMPLETED: "Concluído" },
  GAME: { WANT: "Quero jogar", WATCHING: "Jogando", COMPLETED: "Zerado" },
  BOOK: { WANT: "Quero ler", WATCHING: "Lendo", COMPLETED: "Lido" },
  ALL: { WANT: "Quero ver", WATCHING: "Assistindo", COMPLETED: "Concluído" },
};

const STATUS_LABELS_EN: Record<MediaType | "ALL", { WANT: string; WATCHING: string; COMPLETED: string }> = {
  MOVIE: { WANT: "Want to watch", WATCHING: "Watching", COMPLETED: "Completed" },
  SERIES: { WANT: "Want to watch", WATCHING: "Watching", COMPLETED: "Completed" },
  GAME: { WANT: "Want to play", WATCHING: "Playing", COMPLETED: "Completed" },
  BOOK: { WANT: "Want to read", WATCHING: "Reading", COMPLETED: "Read" },
  ALL: { WANT: "Want to watch", WATCHING: "Watching", COMPLETED: "Completed" },
};

function getDynamicStatusLabel(status: string, type?: MediaType, lang = "pt-BR") {
  const key = type ?? "ALL";
  const dict = lang === "en-US" ? STATUS_LABELS_EN : STATUS_LABELS;
  const map = dict[key as MediaType | "ALL"] ?? dict["ALL"];
  switch (status) {
    case "WANT":
      return map.WANT;
    case "WATCHING":
      return map.WATCHING;
    case "COMPLETED":
      return map.COMPLETED;
    case "PAUSED":
      return lang === "en-US" ? "Paused" : "Pausado";
    case "DROPPED":
      return lang === "en-US" ? "Dropped" : "Abandonado";
    default:
      return "";
  }
}
import { EpisodesPanel } from "./episodes-panel";
import { RatingStars } from "./rating-stars";
import { RelatedItems } from "./related-items";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import { useAuth } from "../contextos/auth-context";
import { useI18n } from "../contextos/i18n-context";
import { CatalogItem, getMediaTypeLabel } from "../lib/catalogo-api";
import {
  addFavorite,
  CatalogExtras,
  checkFavorite,
  errorMessage,
  getCatalogExtras,
  getTrackingItem,
  removeFavorite,
  removeTrackingItem,
  saveTrackingItem,
  SeriesInfo,
  TRACKING_PAGES_MAX,
  TRACKING_STATUSES,
  TrackingEntry,
  TrackingPayload,
  TrackingStatus
} from "../lib/api";

type ItemShellProps = {
  item: CatalogItem;
};

const NOTES_MAX_LENGTH = 1000;
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
  const [extras, setExtras] = useState<CatalogExtras | null>(null);
  const [expandSynopsis, setExpandSynopsis] = useState(false);
  const [customCoverUrl, setCustomCoverUrl] = useState<string | null>(null);
  const [showCoverModal, setShowCoverModal] = useState(false);

  async function handleSaveCustomCover(newUrl: string | null) {
    const updated = await saveTrackingItem(item.id, { customCoverUrl: newUrl });
    setCustomCoverUrl(updated.customCoverUrl ?? null);
  }

  const activeCoverUrl = customCoverUrl || item.coverUrl;

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
        <div className="item-poster">
          {customCoverUrl && <span className="item-poster-badge">Personalizada</span>}
          {activeCoverUrl ? (
            <Image
              src={activeCoverUrl.replace("/media/resize/640/-/games/", "/media/games/")}
              alt={item.title}
              width={640}
              height={960}
              quality={80}
              sizes="(max-width: 680px) 60vw, 320px"
              priority
              unoptimized={Boolean(customCoverUrl)}
            />
          ) : (
            <div className="item-poster-empty" aria-hidden="true" />
          )}
          {user && (
            <button
              type="button"
              className="item-poster-change-btn"
              onClick={() => setShowCoverModal(true)}
              aria-label="Escolher capa personalizada"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span>Trocar capa</span>
            </button>
          )}
        </div>

        <div className="item-copy">
          <div className="status-chips">
            <UiBadge tone="secondary">{getMediaTypeLabel(item.type, item.subtype)}</UiBadge>
            {extras?.genres.map((genre) => (
              <UiBadge key={genre} tone="neutral">
                {genre}
              </UiBadge>
            ))}
          </div>
          <h1>{item.title}</h1>
          <div className="item-meta-line">
            {item.releaseYear && <span>{item.releaseYear}</span>}
            {item.pageCount && item.type === "BOOK" && <span>{item.pageCount} páginas</span>}
            <span>
              {extras?.trakRating.average
                ? `${extras.trakRating.average.toLocaleString("pt-BR")} ★ no Trak (${extras.trakRating.count})`
                : "Sem avaliações no Trak"}
            </span>
          </div>
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
            <PersonalTracking
              item={item}
              isSeries={isSeries}
              catalogPageCount={item.pageCount ?? extras?.pageCount ?? null}
              seriesInfo={extras?.seriesInfo ?? null}
              onTrackingLoaded={(entry) => setCustomCoverUrl(entry?.customCoverUrl ?? null)}
            />
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

      {showCoverModal && (
        <CustomCoverModal
          isOpen={showCoverModal}
          onClose={() => setShowCoverModal(false)}
          mediaItemId={item.id}
          itemTitle={item.title}
          defaultCoverUrl={item.coverUrl}
          currentCoverUrl={customCoverUrl}
          onSave={handleSaveCustomCover}
        />
      )}

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

// Rascunho local do tracking: nada vai para a API ate o usuario clicar em "Salvar alteracoes".
type TrackingDraft = {
  status: TrackingStatus | null;
  progress: number;
  rating: number | null;
  notes: string;
  pagesRead: number | null;
  totalPages: number | null;
  favoriteCharacterName: string | null;
  favoriteCharacterAvatar: string | null;
};

function draftFromEntry(entry: TrackingEntry | null): TrackingDraft {
  return {
    status: entry?.status ?? null,
    progress: entry?.progress ?? 0,
    rating: entry?.rating ?? null,
    notes: entry?.notes ?? "",
    pagesRead: entry?.pagesRead ?? null,
    totalPages: entry?.totalPages ?? null,
    favoriteCharacterName: entry?.favoriteCharacterName ?? null,
    favoriteCharacterAvatar: entry?.favoriteCharacterAvatar ?? null
  };
}

const checkpointStorageKey = (mediaItemId: string) => `trak:checkpoint:${mediaItemId}`;

function PersonalTracking({
  item,
  isSeries,
  catalogPageCount,
  seriesInfo,
  onTrackingLoaded
}: {
  item: CatalogItem;
  isSeries: boolean;
  catalogPageCount?: number | null;
  seriesInfo?: SeriesInfo | null;
  onTrackingLoaded?: (entry: TrackingEntry | null) => void;
}) {
  const { t, language } = useI18n();
  const [tracking, setTracking] = useState<TrackingEntry | null>(null);
  const [draft, setDraft] = useState<TrackingDraft>(() => draftFromEntry(null));
  const [metaDirty, setMetaDirty] = useState(false);
  // Incrementado ao descartar, para o MediaProgressTracker remontar e reler o checkpoint salvo.
  const [trackerResetKey, setTrackerResetKey] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPantheonModal, setShowPantheonModal] = useState(false);
  // Remover apaga status, nota, anotacoes e episodios: pede confirmacao antes.
  const [confirmRemove, setConfirmRemove] = useState(false);
  const pendingMetaRef = useRef<CheckpointMeta | null>(null);
  const onTrackingLoadedRef = useRef(onTrackingLoaded);

  useEffect(() => {
    onTrackingLoadedRef.current = onTrackingLoaded;
  });

  const progress = draft.progress;
  const isEmDia = Boolean(
    isSeries &&
      seriesInfo?.isOngoing &&
      seriesInfo.airedEpisodes > 0 &&
      seriesInfo.totalEpisodes > 0 &&
      Math.round((progress / 100) * seriesInfo.totalEpisodes) >= seriesInfo.airedEpisodes
  );
  const savedDraft = draftFromEntry(tracking);
  const trackingDirty =
    draft.status !== savedDraft.status ||
    draft.progress !== savedDraft.progress ||
    draft.rating !== savedDraft.rating ||
    draft.notes.trim() !== savedDraft.notes.trim() ||
    draft.pagesRead !== savedDraft.pagesRead ||
    draft.totalPages !== savedDraft.totalPages ||
    draft.favoriteCharacterName !== savedDraft.favoriteCharacterName;
  const hasUnsavedChanges = trackingDirty || metaDirty;

  function updateDraft(patch: Partial<TrackingDraft>) {
    setNotice(null);
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  // Usado quando o servidor ja persistiu algo (ex.: episodios marcados): atualiza a base
  // e o progresso, sem apagar o que o usuario ainda nao salvou nos outros campos.
  function applyServerProgress(entry: TrackingEntry | null) {
    setTracking(entry);
    setDraft((prev) => ({ ...prev, progress: entry?.progress ?? 0, status: prev.status ?? entry?.status ?? null }));
    onTrackingLoadedRef.current?.(entry);
  }

  useEffect(() => {
    let active = true;

    Promise.all([getTrackingItem(item.id), checkFavorite(item.id)])
      .then(([entry, fav]) => {
        if (!active) {
          return;
        }
        setTracking(entry);
        setDraft(draftFromEntry(entry));
        setIsFavorite(fav.isFavorite);
        onTrackingLoadedRef.current?.(entry);
      })
      .catch((err) => active && setError(errorMessage(err)))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [item.id]);

  // Avisa antes de sair da pagina com alteracoes pendentes.
  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  function handleMetaChange(meta: CheckpointMeta) {
    pendingMetaRef.current = meta;
    setMetaDirty(true);
    setNotice(null);
  }

  function persistPendingMeta() {
    if (!pendingMetaRef.current) {
      return;
    }
    try {
      window.localStorage.setItem(checkpointStorageKey(item.id), JSON.stringify(pendingMetaRef.current));
    } catch {
      // ignora (modo privado / cota cheia)
    }
    pendingMetaRef.current = null;
    setMetaDirty(false);
  }

  async function handleSave() {
    if (!hasUnsavedChanges || saving) {
      return;
    }
    setError(null);
    setNotice(null);

    const payload: TrackingPayload = {};
    if (draft.status !== savedDraft.status && draft.status) payload.status = draft.status;
    if (draft.progress !== savedDraft.progress) payload.progress = draft.progress;
    if (draft.rating !== savedDraft.rating) payload.rating = draft.rating;
    if (draft.notes.trim() !== savedDraft.notes.trim()) payload.notes = draft.notes.trim() || null;
    if (draft.pagesRead !== savedDraft.pagesRead && draft.pagesRead !== null) payload.pagesRead = draft.pagesRead;
    if (draft.totalPages !== savedDraft.totalPages && draft.totalPages !== null) payload.totalPages = draft.totalPages;
    if (draft.favoriteCharacterName !== savedDraft.favoriteCharacterName) {
      payload.favoriteCharacterName = draft.favoriteCharacterName;
      payload.favoriteCharacterAvatar = draft.favoriteCharacterAvatar;
    }

    // Item ainda fora do tracking: mantem o status implicito que o fluxo antigo aplicava.
    if (!tracking && !payload.status) {
      if (payload.progress !== undefined && payload.progress > 0) {
        payload.status = payload.progress >= 100 ? "COMPLETED" : "WATCHING";
      } else if (payload.rating) {
        payload.status = "COMPLETED";
      }
    }

    if (Object.keys(payload).length === 0) {
      // So mudou dado local do checkpoint (horas, plataforma, total de paginas).
      persistPendingMeta();
      setNotice("Alterações salvas.");
      return;
    }

    setSaving(true);
    try {
      const entry = await saveTrackingItem(item.id, payload);
      setTracking(entry);
      setDraft(draftFromEntry(entry));
      persistPendingMeta();
      setNotice("Alterações salvas.");
      onTrackingLoadedRef.current?.(entry);
    } catch (err) {
      // Mantem o rascunho para o usuario poder tentar de novo.
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusSelect(option: TrackingStatus) {
    if (draft.status === option) {
      setConfirmRemove(true);
      return;
    }
    setConfirmRemove(false);

    if (option === "COMPLETED" && isSeries && seriesInfo?.isOngoing) {
      setError(
        "Esta série ainda está em lançamento (faltam episódios). Marque os episódios lançados para ficar Em dia."
      );
      return;
    }

    const previousDraft = draft;
    const previousTracking = tracking;

    const nextProgress =
      option === "COMPLETED"
        ? 100
        : option === "WANT" && draft.progress === 100
          ? 0
          : draft.progress;

    updateDraft({ status: option, progress: nextProgress });
    setError(null);

    try {
      const entry = await saveTrackingItem(item.id, {
        status: option,
        progress: nextProgress,
        rating: draft.rating,
        notes: draft.notes.trim() || null
      });
      setTracking(entry);
      setDraft(draftFromEntry(entry));
      setNotice(t("tracking.saved", "Status salvo!"));
    } catch (err) {
      setDraft(previousDraft);
      setTracking(previousTracking);
      setError(errorMessage(err, "Falha ao salvar status. Ação desfeita."));
    }
  }

  async function handleMilestoneSelect(nextProgress: number, nextStatus: TrackingStatus) {
    const previousDraft = draft;
    const previousTracking = tracking;


    updateDraft({ progress: nextProgress, status: nextStatus });
    setError(null);

    try {
      const entry = await saveTrackingItem(item.id, {
        status: nextStatus,
        progress: nextProgress,
        rating: draft.rating,
        notes: draft.notes.trim() || null
      });
      setTracking(entry);
      setDraft(draftFromEntry(entry));
      setNotice(t("tracking.saved", "Progresso salvo!"));
    } catch (err) {
      // Reverte e exibe alerta de erro
      setDraft(previousDraft);
      setTracking(previousTracking);
      setError(errorMessage(err, "Falha ao salvar progresso. Ação desfeita."));
    }
  }

  async function handleRatingChange(nextRating: number | null) {
    if (draft.rating === nextRating) return;

    const previousDraft = draft;
    const previousTracking = tracking;


    updateDraft({ rating: nextRating });
    setError(null);

    try {
      const entry = await saveTrackingItem(item.id, {
        rating: nextRating,
        status: draft.status ?? (nextRating ? "COMPLETED" : undefined),
        progress: draft.progress,
        notes: draft.notes.trim() || null
      });
      setTracking(entry);
      setDraft(draftFromEntry(entry));
      setNotice(nextRating ? `Nota ${nextRating} salva!` : "Nota removida.");
    } catch (err) {
      // Reverte em caso de falha de rede
      setDraft(previousDraft);
      setTracking(previousTracking);
      setError(errorMessage(err, "Falha ao salvar nota. Ação desfeita."));
    }
  }

  function handleDiscard() {
    setDraft(draftFromEntry(tracking));
    pendingMetaRef.current = null;
    setMetaDirty(false);
    setTrackerResetKey((key) => key + 1);
    setError(null);
    setNotice(null);
  }

  async function handlePantheonCrown(name: string | null, avatarUrl: string | null) {
    const nextName = name ? name.trim() : null;
    const nextAvatar = nextName ? avatarUrl : null;

    const previousDraft = draft;
    const previousTracking = tracking;

    updateDraft({
      favoriteCharacterName: nextName,
      favoriteCharacterAvatar: nextAvatar
    });
    setError(null);

    try {
      const entry = await saveTrackingItem(item.id, {
        favoriteCharacterName: nextName,
        favoriteCharacterAvatar: nextAvatar
      });
      setTracking(entry);
      setDraft(draftFromEntry(entry));
      setNotice(nextName ? `${nextName} coroado como favorito da obra!` : "Coroação removida.");
    } catch (err) {
      setDraft(previousDraft);
      setTracking(previousTracking);
      setError(errorMessage(err, "Falha ao salvar personagem favorito da obra."));
    }
  }

  async function handleRemoveTracking() {
    const previousDraft = draft;
    const previousTracking = tracking;

    setConfirmRemove(false);
    setDraft(draftFromEntry(null));
    setTracking(null);
    pendingMetaRef.current = null;
    setMetaDirty(false);
    setError(null);
    setSaving(true);

    try {
      await removeTrackingItem(item.id);
      setNotice(t("tracking.removed", "Removido do tracking."));
      onTrackingLoadedRef.current?.(null);
    } catch (err) {
      setDraft(previousDraft);
      setTracking(previousTracking);
      setError(errorMessage(err, "Falha ao remover do tracking. Ação desfeita."));
    } finally {
      setSaving(false);
    }
  }

  // "Vi de novo" da obra inteira: grava o total de vezes concluida.
  async function handleRewatchWork(times: number) {
    if (!tracking) {
      return;
    }
    const anterior = tracking;
    setTracking({ ...tracking, timesConsumed: times });
    setError(null);
    try {
      const entry = await saveTrackingItem(item.id, { timesConsumed: times });
      setTracking(entry);
      onTrackingLoadedRef.current?.(entry);
      setNotice(times > (anterior.timesConsumed ?? 1) ? `${times}ª vez registrada.` : `Agora são ${times} ${times === 1 ? "vez" : "vezes"}.`);
    } catch (err) {
      setTracking(anterior);
      setError(errorMessage(err));
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

  const statusLabel = tracking ? getDynamicStatusLabel(tracking.status, item.type, language) : t("tracking.outOfTracking", "Fora do tracking");

  return (
    <>
      <div className="item-actions" aria-label="Ações do item">
        <UiButton variant="secondary" pressed={isFavorite} disabled={loading} onClick={handleFavorite}>
          <Star size={15} fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" />
          <span>{isFavorite ? t("tracking.favorite", "Favorito") : t("tracking.addFavorite", "Favoritar")}</span>
        </UiButton>
        <UiButton variant="secondary" onClick={handleShare}>
          {t("tracking.share", "Compartilhar")}
        </UiButton>
      </div>

      <div className="item-status-block">
        <div className="status-chips" role="group" aria-label="Status de tracking">
          {TRACKING_STATUSES.map((option: TrackingStatus) => {
            const isActive = draft.status === option;
            const isCompletedBlocked = option === "COMPLETED" && isSeries && seriesInfo?.isOngoing;
            return (
              <button
                key={option}
                type="button"
                className={`filter-chip${isActive ? " is-active" : ""}${isCompletedBlocked ? " is-blocked" : ""}`}
                aria-pressed={isActive}
                disabled={loading || saving}
                onClick={() => void handleStatusSelect(option)}
                title={
                  isCompletedBlocked
                    ? "Esta série ainda está em lançamento (faltam episódios a serem exibidos)"
                    : isActive
                      ? t("tracking.clickToRemove", "Clique novamente para remover do tracking")
                      : getDynamicStatusLabel(option, item.type, language)
                }
              >
                {getDynamicStatusLabel(option, item.type, language)}
              </button>
            );
          })}
        </div>

        {confirmRemove && (
          <div className="tracking-remove-confirm" role="alert">
            <p>
              {t(
                "tracking.confirmRemove",
                "Tirar esta obra do seu tracking? Status, nota, anotações e episódios marcados serão apagados."
              )}
            </p>
            <div className="tracking-remove-confirm-actions">
              <UiButton onClick={() => void handleRemoveTracking()} disabled={saving}>
                {t("tracking.remove", "Remover do tracking")}
              </UiButton>
              <UiButton variant="secondary" onClick={() => setConfirmRemove(false)}>
                {t("tracking.keep", "Manter")}
              </UiButton>
            </div>
          </div>
        )}

        {tracking?.status === "COMPLETED" && draft.status === "COMPLETED" && (
          <div className="item-rewatch">
            <p className="panel-note">
              {item.type === "GAME" ? "Zerado" : item.type === "BOOK" ? "Lido" : "Visto"}{" "}
              {Math.max(1, tracking.timesConsumed ?? 1) === 1 ? "uma vez" : `${tracking.timesConsumed} vezes`}
            </p>
            <RewatchCounter
              count={tracking.timesConsumed ?? 1}
              againLabel={item.type === "GAME" ? "Joguei de novo" : item.type === "BOOK" ? "Li de novo" : "Vi de novo"}
              disabled={saving}
              onChange={(vezes) => void handleRewatchWork(vezes)}
            />
          </div>
        )}

        {isSeries && (
          <div className="series-progress-inline">
            <p className="panel-note">
              Progresso: <strong>{progress}%</strong>
              {seriesInfo?.totalEpisodes
                ? ` (${Math.round((progress / 100) * seriesInfo.totalEpisodes)} de ${seriesInfo.totalEpisodes} eps)`
                : ""}
            </p>
            {isEmDia ? (
              <span className="series-em-dia-pill">
                <Check size={13} aria-hidden="true" />
                Em dia com os lançamentos
              </span>
            ) : (
              <span className="series-progress-hint">
                · marque os episódios na seção abaixo
              </span>
            )}
          </div>
        )}

        {(item.type === "GAME" || item.type === "BOOK") && (
          <MediaProgressTracker
            key={`${item.id}-${trackerResetKey}`}
            item={item}
            progress={progress}
            status={draft.status}
            disabled={loading}
            onProgressChange={(nextProgress) => updateDraft({ progress: nextProgress })}
            onMilestoneSelect={(nextProgress, nextStatus) => void handleMilestoneSelect(nextProgress, nextStatus)}
            pagesRead={draft.pagesRead}
            totalPages={draft.totalPages}
            catalogPageCount={catalogPageCount ?? item.pageCount ?? null}
            onPagesChange={(pagesRead, totalPages) => updateDraft({ pagesRead, totalPages })}
            onMetaChange={handleMetaChange}
          />
        )}

        <div className="rating-row">
          <span>{t("tracking.rating", "Sua nota")}</span>
          <RatingStars
            value={draft.rating}
            disabled={loading}
            onChange={(rating) => void handleRatingChange(rating)}
          />
        </div>

        {/* Panteão: o personagem favorito, liberado quando a obra é concluída. */}
        {draft.status === "COMPLETED" ? (
          <div className="pantheon-block is-unlocked">
            <div className="pantheon-info">
              <span className="pantheon-title">
                <Crown size={15} aria-hidden="true" />
                Panteão da Obra
              </span>
              <span className="pantheon-desc">
                {draft.favoriteCharacterName
                  ? `Seu personagem favorito coroado para esta obra:`
                  : "Obra concluída! Escolha seu personagem favorito para o Panteão:"}
              </span>
            </div>

            {draft.favoriteCharacterName ? (
              <div className="pantheon-crowned">
                <div className="pantheon-avatar">
                  {draft.favoriteCharacterAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img loading="lazy" decoding="async" src={draft.favoriteCharacterAvatar} alt={draft.favoriteCharacterName} />
                  ) : (
                    <User size={16} aria-hidden="true" />
                  )}
                </div>
                <strong className="pantheon-name">{draft.favoriteCharacterName}</strong>
                <button
                  type="button"
                  className="secondary-button pantheon-btn-sm"
                  onClick={() => setShowPantheonModal(true)}
                >
                  Alterar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="primary-button pantheon-btn-md"
                onClick={() => setShowPantheonModal(true)}
              >
                <Crown size={14} aria-hidden="true" />
                Coroar personagem
              </button>
            )}
          </div>
        ) : (
          <div className="pantheon-block is-locked" title="Marque a obra como Concluída / Zerada para desbloquear o Panteão">
            <div className="pantheon-info">
              <span className="pantheon-title is-muted">
                <Lock size={14} aria-hidden="true" />
                Panteão da Obra
              </span>
              <span className="pantheon-desc">
                Complete esta obra para coroar o seu personagem favorito no seu perfil e críticas.
              </span>
            </div>
          </div>
        )}

        <form
          className="field-stack notes-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <label>
            {t("tracking.notes", "Suas anotações (só você vê)")}
            <textarea
              value={draft.notes}
              rows={3}
              maxLength={NOTES_MAX_LENGTH}
              placeholder={t("tracking.notesPlaceholder", "O que você achou? Onde parou?")}
              disabled={loading}
              onChange={(event) => updateDraft({ notes: event.target.value })}
            />
          </label>
          <div className="comment-form-footer">
            <span>
              <UiBadge tone="secondary">
                {saving
                  ? t("tracking.saving", "Salvando…")
                  : hasUnsavedChanges
                    ? t("tracking.unsavedChanges", "Alterações não salvas")
                    : tracking
                      ? statusLabel
                      : t("tracking.notStarted", "Não iniciado")}
              </UiBadge>
            </span>
            <span className="item-save-actions">
              {hasUnsavedChanges && (
                <UiButton type="button" variant="secondary" disabled={saving} onClick={handleDiscard}>
                  {t("tracking.discard", "Descartar")}
                </UiButton>
              )}
              <UiButton type="submit" disabled={loading || saving || !hasUnsavedChanges}>
                {saving ? t("tracking.saving", "Salvando…") : t("tracking.saveChanges", "Salvar alterações")}
              </UiButton>
            </span>
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

      <PantheonModal
        key={showPantheonModal ? `${item.id}-open` : "closed"}
        isOpen={showPantheonModal}
        onClose={() => setShowPantheonModal(false)}
        mediaItemId={item.id}
        itemTitle={item.title}
        currentFavoriteName={draft.favoriteCharacterName}
        currentFavoriteAvatar={draft.favoriteCharacterAvatar}
        onSave={handlePantheonCrown}
      />

      {isSeries && !loading && <EpisodesPanel mediaItemId={item.id} onTrackingChange={applyServerProgress} />}
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

const PAGE_INPUT_MAX_DIGITS = 5;

function parsePageInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  const parsed = parseInt(digits, 10);
  return isNaN(parsed) ? 0 : Math.min(TRACKING_PAGES_MAX, Math.max(0, parsed));
}

function MediaProgressTracker({
  item,
  progress,
  status,
  disabled,
  onProgressChange,
  onMilestoneSelect,
  pagesRead,
  totalPages: savedTotalPages,
  catalogPageCount,
  onPagesChange,
  onMetaChange
}: {
  item: CatalogItem;
  progress: number;
  status: TrackingStatus | null;
  disabled: boolean;
  onProgressChange: (value: number) => void;
  onMilestoneSelect: (progress: number, status: TrackingStatus) => void;
  pagesRead: number | null;
  totalPages: number | null;
  catalogPageCount?: number | null;
  onPagesChange: (pagesRead: number, totalPages: number) => void;
  onMetaChange: (meta: CheckpointMeta) => void;
}) {
  const isGame = item.type === "GAME";
  const [totalInput, setTotalInput] = useState<string | null>(null);
  const resolvedCatalogPages =
    typeof catalogPageCount === "number" && catalogPageCount > 0 ? catalogPageCount : null;
  // Le o checkpoint salvo na montagem. Este componente so renderiza no cliente, depois que a
  // sessao carrega, e remonta (via key) quando o item muda ou o usuario descarta alteracoes.
  const [meta, setMeta] = useState<CheckpointMeta>(() => {
    const defaults: CheckpointMeta = {
      hoursPlayed: 0,
      platform: "PC / Steam",
      platinum: false,
      currentPage: 0,
      totalPages: resolvedCatalogPages ?? 320
    };
    if (typeof window === "undefined") {
      return defaults;
    }
    try {
      const raw = window.localStorage.getItem(checkpointStorageKey(item.id));
      return raw ? { ...defaults, ...(JSON.parse(raw) as CheckpointMeta) } : defaults;
    } catch {
      return defaults;
    }
  });

  // So atualiza o estado local; o pai grava no localStorage quando o usuario salvar.
  function updateMeta(patch: Partial<CheckpointMeta>) {
    const next = { ...meta, ...patch };
    setMeta(next);
    onMetaChange(next);
  }

  if (isGame) {
    const hours = meta.hoursPlayed ?? 0;
    const isCompleted = status === "COMPLETED" || progress >= 100;

    return (
      <div className="trak-progress-panel">
        <div className="trak-progress-header">
          <div>
            <span className="eyebrow">Progresso no jogo</span>
            <strong>
              {meta.platinum
                ? "Platina / 100% Completo"
                : isCompleted
                  ? "Campanha Zerada"
                  : `Progresso: ${progress}%`}
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
            Início (15%)
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
            Metade (50%)
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
            Reta final (85%)
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
            História zerada
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
            Platina / 100%
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

  // Livro: Marcador de Leitura por Paginas + Ritmo + Marcos.
  // Paginas vem do tracking do usuario na API; o catalogo informa o total real; fallback somente se nada informado.
  const totalPages = Math.max(
    1,
    savedTotalPages ??
      resolvedCatalogPages ??
      (meta.totalPages && meta.totalPages !== 320 ? meta.totalPages : null) ??
      320
  );
  const currentPage = Math.min(
    totalPages,
    Math.max(0, pagesRead ?? meta.currentPage ?? Math.round((progress / 100) * totalPages))
  );
  const remainingPages = Math.max(0, totalPages - currentPage);
  const remainingMinutes = Math.round(remainingPages * 1.5);
  const remainingHoursText =
    remainingPages === 0
      ? "Leitura concluída!"
      : remainingMinutes < 60
        ? `~${remainingMinutes} min restantes`
        : `~${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}min restantes`;

  function applyPageChange(nextPage: number, nextTotal = totalPages) {
    const safeTotal = Math.max(1, Math.min(TRACKING_PAGES_MAX, nextTotal));
    const clampedPage = Math.max(0, Math.min(safeTotal, nextPage));
    const pct = Math.min(100, Math.round((clampedPage / safeTotal) * 100));
    onPagesChange(clampedPage, safeTotal);
    if (pct >= 100) {
      onMilestoneSelect(100, "COMPLETED");
    } else {
      onProgressChange(pct);
    }
  }

  function commitTotalInput() {
    if (totalInput === null) {
      return;
    }
    const parsed = parsePageInput(totalInput);
    setTotalInput(null);
    if (parsed > 0 && parsed !== totalPages) {
      applyPageChange(currentPage, parsed);
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
        <span className="trak-reading-pace">Faltam {remainingPages} págs · {remainingHoursText}</span>
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
            onPagesChange(Math.round((pct / 100) * totalPages), totalPages);
            onProgressChange(pct);
          }}
        />
      </div>

      <div className="trak-session-grid">
        <div className="trak-session-box">
          <span className="trak-session-label">Páginas lidas / Total da edição</span>
          <div className="trak-book-pages-inputs">
            {/* type="text" + inputMode numerico: so aceita digitos, sem notacao cientifica (1e5). */}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={PAGE_INPUT_MAX_DIGITS}
              value={String(currentPage)}
              disabled={disabled}
              aria-label="Página atual"
              onChange={(e) => applyPageChange(parsePageInput(e.target.value), totalPages)}
            />
            <span>de</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={PAGE_INPUT_MAX_DIGITS}
              value={totalInput ?? String(totalPages)}
              disabled={disabled}
              aria-label="Total de páginas do livro"
              onChange={(e) => setTotalInput(e.target.value.replace(/\D/g, ""))}
              onBlur={commitTotalInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitTotalInput();
                }
              }}
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
            onPagesChange(Math.round(totalPages * 0.15), totalPages);
            onMilestoneSelect(15, "WATCHING");
          }}
        >
          Início (15%)
        </button>
        <button
          type="button"
          className={`filter-chip${progress === 50 ? " is-active" : ""}`}
          disabled={disabled}
          onClick={() => {
            onPagesChange(Math.round(totalPages * 0.5), totalPages);
            onMilestoneSelect(50, "WATCHING");
          }}
        >
          Metade (50%)
        </button>
        <button
          type="button"
          className={`filter-chip${progress === 80 ? " is-active" : ""}`}
          disabled={disabled}
          onClick={() => {
            onPagesChange(Math.round(totalPages * 0.8), totalPages);
            onMilestoneSelect(80, "WATCHING");
          }}
        >
          Clímax (80%)
        </button>
        <button
          type="button"
          className={`filter-chip${progress === 100 && status === "COMPLETED" ? " is-active" : ""}`}
          disabled={disabled}
          onClick={() => {
            onPagesChange(totalPages, totalPages);
            onMilestoneSelect(100, "COMPLETED");
          }}
        >
          Livro lido (100%)
        </button>
      </div>
    </div>
  );
}
