import { useState } from "react";
import type { TrackingStatus } from "../../lib/api";
import { carregarCheckpoint, CheckpointMeta, GAME_PLATFORMS } from "./checkpoint";

type ProgressoJogoProps = {
  itemId: string;
  progress: number;
  status: TrackingStatus | null;
  disabled: boolean;
  onProgressChange: (value: number) => void;
  onMilestoneSelect: (progress: number, status: TrackingStatus) => void;
  onMetaChange: (meta: CheckpointMeta) => void;
};

export function ProgressoJogo({
  itemId,
  progress,
  status,
  disabled,
  onProgressChange,
  onMilestoneSelect,
  onMetaChange
}: ProgressoJogoProps) {
  const [meta, setMeta] = useState<CheckpointMeta>(() => carregarCheckpoint(itemId));

  function updateMeta(patch: Partial<CheckpointMeta>) {
    const next = { ...meta, ...patch };
    setMeta(next);
    onMetaChange(next);
  }

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
