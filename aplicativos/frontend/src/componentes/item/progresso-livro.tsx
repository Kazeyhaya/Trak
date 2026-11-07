import { useState } from "react";
import { TRACKING_PAGES_MAX, type TrackingStatus } from "../../lib/api";
import { carregarCheckpoint, CheckpointMeta, PAGE_INPUT_MAX_DIGITS, parsePageInput } from "./checkpoint";

type ProgressoLivroProps = {
  itemId: string;
  progress: number;
  status: TrackingStatus | null;
  disabled: boolean;
  catalogPageCount?: number | null;
  pagesRead: number | null;
  totalPages: number | null;
  onProgressChange: (value: number) => void;
  onMilestoneSelect: (progress: number, status: TrackingStatus) => void;
  onPagesChange: (pagesRead: number, totalPages: number) => void;
};

export function ProgressoLivro({
  itemId,
  progress,
  status,
  disabled,
  catalogPageCount,
  pagesRead,
  totalPages: savedTotalPages,
  onProgressChange,
  onMilestoneSelect,
  onPagesChange
}: ProgressoLivroProps) {
  const [totalInput, setTotalInput] = useState<string | null>(null);
  const resolvedCatalogPages =
    typeof catalogPageCount === "number" && catalogPageCount > 0 ? catalogPageCount : null;
  const [meta] = useState<CheckpointMeta>(() => carregarCheckpoint(itemId, resolvedCatalogPages));

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
