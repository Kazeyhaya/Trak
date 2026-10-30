"use client";

import { useId, useState } from "react";

export type RatingStarsProps = {
  value: number | null;
  onChange?: (value: number | null) => void;
  disabled?: boolean;
  size?: "md" | "sm" | "lg";
  step?: number;
  showBadge?: boolean;
};

// Avaliação fluida de 0.5 a 5 estrelas com slider/scrubbing contínuo.
export function RatingStars({
  value,
  onChange,
  disabled = false,
  size = "md",
  step = 0.5,
  showBadge = true
}: RatingStarsProps) {
  const sliderId = useId();
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue ?? value;
  const fillValue =
    displayValue !== null && displayValue !== undefined ? Math.max(0, Math.min(5, displayValue)) : 0;
  const fillPercentage = (fillValue / 5) * 100;

  const formattedValue =
    fillValue > 0
      ? fillValue % 1 === 0
        ? String(fillValue)
        : fillValue.toFixed(1)
      : null;

  if (!onChange) {
    return (
      <span
        className={`rating-stars rating-stars-wrapper rating-stars--${size}`}
        aria-label={value ? `Nota ${value} de 5 estrelas` : "Sem nota"}
      >
        <span className="rating-stars-track" aria-hidden="true">
          <span className="rating-stars-layer rating-stars-empty">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className="rating-star-char">
                ★
              </span>
            ))}
          </span>
          <span
            className="rating-stars-layer rating-stars-filled"
            style={{ width: `${fillPercentage}%` }}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className="rating-star-char">
                ★
              </span>
            ))}
          </span>
        </span>
        {showBadge && formattedValue && (
          <strong className="rating-value-badge" aria-hidden="true">
            {formattedValue} ★
          </strong>
        )}
      </span>
    );
  }

  function handlePointerMove(e: React.PointerEvent<HTMLInputElement>) {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const raw = ratio * 5;
    const snapped = Math.round(raw / step) * step;
    const clamped = Math.max(step, Math.min(5, snapped));
    setHoverValue(clamped);
  }

  function handlePointerLeave() {
    setHoverValue(null);
  }

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value);
    if (!Number.isFinite(val) || val <= 0) {
      onChange?.(null);
    } else {
      onChange?.(val);
    }
  }

  return (
    <div
      className={`rating-stars rating-stars-wrapper rating-stars--${size}${disabled ? " is-disabled" : ""}`}
      role="group"
      aria-label="Sua avaliação"
    >
      <div className="rating-stars-track">
        <div className="rating-stars-layer rating-stars-empty" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className="rating-star-char">
              ★
            </span>
          ))}
        </div>
        <div
          className="rating-stars-layer rating-stars-filled"
          style={{ width: `${fillPercentage}%` }}
          aria-hidden="true"
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className="rating-star-char">
              ★
            </span>
          ))}
        </div>

        <input
          id={sliderId}
          type="range"
          min={step}
          max={5}
          step={step}
          value={fillValue || 0}
          disabled={disabled}
          aria-label={`Avaliação: ${formattedValue ? `${formattedValue} de 5 estrelas` : "Nenhuma nota"}`}
          className="rating-stars-slider"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onChange={handleSliderChange}
        />
      </div>

      {showBadge && (
        <span className="rating-value-badge" aria-live="polite">
          {formattedValue ? `${formattedValue} ★` : "Sem nota"}
        </span>
      )}

      {value !== null && !disabled && (
        <button
          type="button"
          className="rating-clear-btn"
          onClick={() => onChange(null)}
          title="Limpar nota"
          aria-label="Limpar nota"
        >
          ✕
        </button>
      )}
    </div>
  );
}
