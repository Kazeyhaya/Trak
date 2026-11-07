import type { MediaType } from "../../lib/catalogo-api";
import { getStatusLabel, TRACKING_STATUSES, type TrackingStatus } from "../../lib/api";
import { UiButton } from "../ui-button";

type StatusTrackingProps = {
  status: TrackingStatus | null;
  mediaType: MediaType;
  isSeries: boolean;
  isOngoing?: boolean;
  disabled?: boolean;
  saving?: boolean;
  confirmRemove: boolean;
  onSelectStatus: (status: TrackingStatus) => void;
  onConfirmRemove: () => void;
  onCancelRemove: () => void;
};

export function StatusTracking({
  status,
  mediaType,
  isSeries,
  isOngoing,
  disabled,
  saving,
  confirmRemove,
  onSelectStatus,
  onConfirmRemove,
  onCancelRemove
}: StatusTrackingProps) {
  return (
    <>
      <div className="status-chips" role="group" aria-label="Status de tracking">
        {TRACKING_STATUSES.map((option: TrackingStatus) => {
          const isActive = status === option;
          const isCompletedBlocked = option === "COMPLETED" && isSeries && isOngoing;
          return (
            <button
              key={option}
              type="button"
              className={`filter-chip${isActive ? " is-active" : ""}${isCompletedBlocked ? " is-blocked" : ""}`}
              aria-pressed={isActive}
              disabled={disabled || saving}
              onClick={() => onSelectStatus(option)}
              title={
                isCompletedBlocked
                  ? "Esta série ainda está em lançamento (faltam episódios a serem exibidos)"
                  : isActive
                    ? "Clique novamente para remover do tracking"
                    : getStatusLabel(option, mediaType)
              }
            >
              {getStatusLabel(option, mediaType)}
            </button>
          );
        })}
      </div>

      {confirmRemove && (
        <div className="tracking-remove-confirm" role="alert">
          <p>
            Tirar esta obra do seu tracking? Status, nota, anotações e episódios marcados serão apagados.
          </p>
          <div className="tracking-remove-confirm-actions">
            <UiButton onClick={onConfirmRemove} disabled={saving}>
              Remover do tracking
            </UiButton>
            <UiButton variant="secondary" onClick={onCancelRemove}>
              Manter
            </UiButton>
          </div>
        </div>
      )}
    </>
  );
}
