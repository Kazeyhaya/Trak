"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";

type RewatchCounterProps = {
  // Vezes registradas; 1 = so a primeira.
  count: number;
  onChange: (next: number) => void;
  // "Vi de novo", "Joguei de novo", "Li de novo".
  againLabel: string;
  disabled?: boolean;
  compact?: boolean;
};

const MAXIMO = 99;

// Contador de rever. Na primeira vez e so um botao discreto; a partir da segunda vira um
// selo "2x" que pulsa a cada mudanca, com botoes para somar e tirar uma vez.
export function RewatchCounter({ count, onChange, againLabel, disabled, compact }: RewatchCounterProps) {
  const vezes = Math.max(1, count);
  const classe = `rewatch${compact ? " is-compact" : ""}`;
  const tamanho = compact ? 12 : 14;

  if (vezes === 1) {
    return (
      <div className={classe}>
        <button type="button" className="rewatch-again" disabled={disabled} onClick={() => onChange(2)}>
          <RotateCcw size={tamanho} aria-hidden="true" />
          <span>{againLabel}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`${classe} is-repeated`} role="group" aria-label={`${vezes} vezes`}>
      {/* key muda a cada contagem para reiniciar a animacao do selo */}
      <span key={vezes} className="rewatch-count" title={`${vezes} vezes`}>
        <RotateCcw size={tamanho} aria-hidden="true" />
        {vezes}x
      </span>
      <button
        type="button"
        className="rewatch-step"
        disabled={disabled}
        onClick={() => onChange(vezes - 1)}
        aria-label={`Tirar uma vez (fica ${vezes - 1}x)`}
        title="Tirar uma vez"
      >
        <Minus size={12} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="rewatch-step"
        disabled={disabled || vezes >= MAXIMO}
        onClick={() => onChange(vezes + 1)}
        aria-label={`${againLabel} (fica ${vezes + 1}x)`}
        title={againLabel}
      >
        <Plus size={12} aria-hidden="true" />
      </button>
      <span className="sr-only" aria-live="polite">
        {vezes} vezes
      </span>
    </div>
  );
}
