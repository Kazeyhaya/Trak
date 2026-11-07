import { useEffect, useRef, useState } from "react";
import { Check, Star } from "lucide-react";
import {
  addFavorite,
  checkFavorite,
  errorMessage,
  getStatusLabel,
  getTrackingItem,
  removeFavorite,
  removeTrackingItem,
  saveTrackingItem,
  type SeriesInfo,
  type TrackingEntry,
  type TrackingStatus
} from "../../lib/api";
import type { CatalogItem } from "../../lib/catalogo-api";
import { EpisodesPanel } from "../episodes-panel";
import { RatingStars } from "../rating-stars";
import { RewatchCounter } from "../rewatch-counter";
import { UiBadge } from "../ui-badge";
import { UiButton } from "../ui-button";
import { BlocoPanteao } from "./bloco-panteao";
import { ProgressoJogo } from "./progresso-jogo";
import { ProgressoLivro } from "./progresso-livro";
import { StatusTracking } from "./status-tracking";
import { useRascunhoTracking } from "./use-rascunho-tracking";

const NOTES_MAX_LENGTH = 1000;

export function PersonalTracking({
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
  const {
    tracking,
    setTracking,
    carregarTracking,
    draft,
    updateDraft,
    hasUnsavedChanges,
    saving,
    error,
    setError,
    notice,
    setNotice,
    trackerResetKey,
    handleSave,
    handleDiscard,
    handleMetaChange,
    applyServerProgress
  } = useRascunhoTracking({ itemId: item.id, onTrackingLoaded });

  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmRemove, setConfirmRemove] = useState(false);
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

  useEffect(() => {
    let active = true;

    Promise.all([getTrackingItem(item.id), checkFavorite(item.id)])
      .then(([entry, fav]) => {
        if (!active) {
          return;
        }
        carregarTracking(entry);
        setIsFavorite(fav.isFavorite);
        onTrackingLoadedRef.current?.(entry);
      })
      .catch((err) => active && setError(errorMessage(err)))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [item.id, carregarTracking, setError]);

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
      carregarTracking(entry);
      setNotice("Status salvo!");
    } catch (err) {
      setTracking(previousTracking);
      carregarTracking(previousTracking);
      updateDraft(previousDraft);
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
      carregarTracking(entry);
      setNotice("Progresso salvo!");
    } catch (err) {
      setTracking(previousTracking);
      carregarTracking(previousTracking);
      updateDraft(previousDraft);
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
      carregarTracking(entry);
      setNotice(nextRating ? `Nota ${nextRating} salva!` : "Nota removida.");
    } catch (err) {
      setTracking(previousTracking);
      carregarTracking(previousTracking);
      updateDraft(previousDraft);
      setError(errorMessage(err, "Falha ao salvar nota. Ação desfeita."));
    }
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
      carregarTracking(entry);
      setNotice(nextName ? `${nextName} coroado como favorito da obra!` : "Coroação removida.");
    } catch (err) {
      setTracking(previousTracking);
      carregarTracking(previousTracking);
      updateDraft(previousDraft);
      setError(errorMessage(err, "Falha ao salvar personagem favorito da obra."));
    }
  }

  async function handleRemoveTracking() {
    const previousDraft = draft;
    const previousTracking = tracking;

    setConfirmRemove(false);
    carregarTracking(null);
    setError(null);

    try {
      await removeTrackingItem(item.id);
      setNotice("Removido do tracking");
      onTrackingLoaded?.(null);
    } catch (err) {
      setTracking(previousTracking);
      carregarTracking(previousTracking);
      updateDraft(previousDraft);
      setError(errorMessage(err, "Falha ao remover do tracking. Ação desfeita."));
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
      carregarTracking(entry);
      onTrackingLoaded?.(entry);
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

  const statusLabel = tracking ? getStatusLabel(tracking.status, item.type) : "Fora do tracking";

  return (
    <>
      <div className="item-actions" aria-label="Ações do item">
        <UiButton variant="secondary" pressed={isFavorite} disabled={loading} onClick={handleFavorite}>
          <Star size={15} fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" />
          <span>{isFavorite ? "Favorito" : "Favoritar"}</span>
        </UiButton>
        <UiButton variant="secondary" onClick={handleShare}>
          Compartilhar
        </UiButton>
      </div>

      <div className="item-status-block">
        <StatusTracking
          status={draft.status}
          mediaType={item.type}
          isSeries={isSeries}
          isOngoing={seriesInfo?.isOngoing}
          disabled={loading}
          saving={saving}
          confirmRemove={confirmRemove}
          onSelectStatus={handleStatusSelect}
          onConfirmRemove={() => void handleRemoveTracking()}
          onCancelRemove={() => setConfirmRemove(false)}
        />

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

        {item.type === "GAME" && (
          <ProgressoJogo
            key={`${item.id}-${trackerResetKey}`}
            itemId={item.id}
            progress={progress}
            status={draft.status}
            disabled={loading}
            onProgressChange={(nextProgress) => updateDraft({ progress: nextProgress })}
            onMilestoneSelect={(nextProgress, nextStatus) => void handleMilestoneSelect(nextProgress, nextStatus)}
            onMetaChange={handleMetaChange}
          />
        )}

        {item.type === "BOOK" && (
          <ProgressoLivro
            key={`${item.id}-${trackerResetKey}`}
            itemId={item.id}
            progress={progress}
            status={draft.status}
            disabled={loading}
            catalogPageCount={catalogPageCount ?? item.pageCount ?? null}
            pagesRead={draft.pagesRead}
            totalPages={draft.totalPages}
            onProgressChange={(nextProgress) => updateDraft({ progress: nextProgress })}
            onMilestoneSelect={(nextProgress, nextStatus) => void handleMilestoneSelect(nextProgress, nextStatus)}
            onPagesChange={(pagesRead, totalPages) => updateDraft({ pagesRead, totalPages })}
          />
        )}

        <div className="rating-row">
          <span>Sua nota</span>
          <RatingStars
            value={draft.rating}
            disabled={loading}
            onChange={(rating) => void handleRatingChange(rating)}
          />
        </div>

        <BlocoPanteao
          mediaItemId={item.id}
          itemTitle={item.title}
          isCompleted={draft.status === "COMPLETED"}
          favoriteCharacterName={draft.favoriteCharacterName}
          favoriteCharacterAvatar={draft.favoriteCharacterAvatar}
          onSaveCrown={handlePantheonCrown}
        />

        <form
          className="field-stack notes-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <label>
            Suas anotações (só você vê)
            <textarea
              value={draft.notes}
              rows={3}
              maxLength={NOTES_MAX_LENGTH}
              placeholder="O que você achou? Onde parou?"
              disabled={loading}
              onChange={(event) => updateDraft({ notes: event.target.value })}
            />
          </label>
          <div className="comment-form-footer">
            <span>
              <UiBadge tone="secondary">
                {saving
                  ? "Salvando…"
                  : hasUnsavedChanges
                    ? "Alterações não salvas"
                    : tracking
                      ? statusLabel
                      : "Não iniciado"}
              </UiBadge>
            </span>
            <span className="item-save-actions">
              {hasUnsavedChanges && (
                <UiButton type="button" variant="secondary" disabled={saving} onClick={handleDiscard}>
                  Descartar
                </UiButton>
              )}
              <UiButton type="submit" disabled={loading || saving || !hasUnsavedChanges}>
                {saving ? "Salvando…" : "Salvar alterações"}
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

      {isSeries && !loading && <EpisodesPanel mediaItemId={item.id} onTrackingChange={applyServerProgress} />}
    </>
  );
}
