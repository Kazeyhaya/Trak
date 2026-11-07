import { useCallback, useEffect, useRef, useState } from "react";
import {
  errorMessage,
  saveTrackingItem,
  type TrackingEntry,
  type TrackingPayload,
  type TrackingStatus
} from "../../lib/api";
import { salvarCheckpoint, type CheckpointMeta } from "./checkpoint";

export type TrackingDraft = {
  status: TrackingStatus | null;
  progress: number;
  rating: number | null;
  notes: string;
  pagesRead: number | null;
  totalPages: number | null;
  favoriteCharacterName: string | null;
  favoriteCharacterAvatar: string | null;
};

export function draftFromEntry(entry: TrackingEntry | null): TrackingDraft {
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

export type UseRascunhoTrackingParams = {
  itemId: string;
  initialTracking?: TrackingEntry | null;
  onTrackingLoaded?: (entry: TrackingEntry | null) => void;
};

export function useRascunhoTracking({
  itemId,
  initialTracking = null,
  onTrackingLoaded
}: UseRascunhoTrackingParams) {
  const [tracking, setTracking] = useState<TrackingEntry | null>(initialTracking);
  const [draft, setDraft] = useState<TrackingDraft>(() => draftFromEntry(initialTracking));
  const [metaDirty, setMetaDirty] = useState(false);
  const [trackerResetKey, setTrackerResetKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pendingMetaRef = useRef<CheckpointMeta | null>(null);
  const onTrackingLoadedRef = useRef(onTrackingLoaded);

  useEffect(() => {
    onTrackingLoadedRef.current = onTrackingLoaded;
  });

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

  const carregarTracking = useCallback((entry: TrackingEntry | null) => {
    setTracking(entry);
    setDraft(draftFromEntry(entry));
    pendingMetaRef.current = null;
    setMetaDirty(false);
  }, []);

  // Usado quando o servidor ja persistiu algo (ex.: episodios marcados): atualiza a base
  // e o progresso, sem apagar o que o usuario ainda nao salvou nos outros campos.
  function applyServerProgress(entry: TrackingEntry | null) {
    setTracking(entry);
    setDraft((prev) => ({
      ...prev,
      progress: entry?.progress ?? 0,
      status: prev.status ?? entry?.status ?? null
    }));
    onTrackingLoadedRef.current?.(entry);
  }

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
    salvarCheckpoint(itemId, pendingMetaRef.current);
    pendingMetaRef.current = null;
    setMetaDirty(false);
  }

  function handleDiscard() {
    setDraft(draftFromEntry(tracking));
    pendingMetaRef.current = null;
    setMetaDirty(false);
    setTrackerResetKey((key) => key + 1);
    setError(null);
    setNotice(null);
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
      const entry = await saveTrackingItem(itemId, payload);
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

  return {
    tracking,
    setTracking,
    carregarTracking,
    draft,
    rascunho: draft,
    updateDraft,
    atualizarRascunho: updateDraft,
    hasUnsavedChanges,
    alterado: hasUnsavedChanges,
    metaDirty,
    saving,
    error,
    setError,
    notice,
    setNotice,
    trackerResetKey,
    handleSave,
    salvar: handleSave,
    handleDiscard,
    descartar: handleDiscard,
    handleMetaChange,
    applyServerProgress,
    persistPendingMeta
  };
}
