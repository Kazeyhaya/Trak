"use client";

type RatingStarsProps = {
  value: number | null;
  onChange?: (value: number | null) => void;
  disabled?: boolean;
  size?: "md" | "sm";
};

// Avaliacao de 1 a 5. Clicar na nota atual remove a avaliacao.
export function RatingStars({ value, onChange, disabled = false, size = "md" }: RatingStarsProps) {
  if (!onChange) {
    return (
      <span className={`rating-stars rating-stars--${size}`} aria-label={value ? `Nota ${value} de 5` : "Sem nota"}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} aria-hidden="true" className={value && n <= value ? "is-on" : undefined}>
            ★
          </span>
        ))}
      </span>
    );
  }

  return (
    <div className={`rating-stars rating-stars--${size}`} role="radiogroup" aria-label="Sua avaliação">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? "estrela" : "estrelas"}`}
          className={value && n <= value ? "is-on" : undefined}
          disabled={disabled}
          onClick={() => onChange(value === n ? null : n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}
