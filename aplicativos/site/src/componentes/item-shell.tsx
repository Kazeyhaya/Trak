"use client";

import { useEffect, useState } from "react";

import { SectionHeading } from "./section-heading";
import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import { CatalogItem, getMediaTypeLabel } from "../lib/catalogo-api";
import { saveTrackingItem } from "../lib/tracking-api";

const actions = ["Favoritar", "Iniciar tracking", "Compartilhar", "Adicionar nota"];
const statusOptions = ["WANT", "WATCHING", "COMPLETED", "PAUSED"];

type ItemShellProps = {
  item: CatalogItem | null;
};

function buildDetails(item: CatalogItem | null) {
  return [
    { label: "Fonte", value: item?.source.toUpperCase() ?? "TMDB" },
    { label: "Ano", value: `${item?.releaseYear ?? "1999"}` },
    { label: "Tipo", value: item ? getMediaTypeLabel(item.type) : "Movie" },
    { label: "Status", value: "WANT" }
  ];
}

export function ItemShell({ item }: ItemShellProps) {
  const [status, setStatus] = useState("WANT");
  const [progress, setProgress] = useState(25);
  const [isSaving, setIsSaving] = useState(false);
  const details = buildDetails(item);
  const title = item?.title ?? "Fight Club";
  const synopsis =
    item?.synopsis ??
    "Estrutura base para o detalhe do item, com espaco para tracking, favoritos, progresso e dados pessoais.";

  useEffect(() => {
    if (!item?.id) {
      return;
    }

    const saveState = async () => {
      setIsSaving(true);
      await saveTrackingItem(item.id, { status, progress, favorite: false });
      setIsSaving(false);
    };

    void saveState();
  }, [item?.id, progress, status]);

  return (
    <main className="content-shell">
      <SiteHeader />

      <section className="item-hero">
        <div className="item-poster" aria-hidden="true">
          <span />
        </div>

        <div className="item-copy">
          <UiBadge tone="primary">Pagina de item</UiBadge>
          <h1>{title}</h1>
          <p>{synopsis}</p>

          <div className="item-actions" aria-label="Acoes do item">
            {actions.map((action) => (
              <UiButton key={action} variant="secondary">
                {action}
              </UiButton>
            ))}
          </div>

          <div className="item-status-block">
            <div className="status-chips" role="list" aria-label="Status de tracking">
              {statusOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`filter-chip${status === option ? " is-active" : ""}`}
                  onClick={() => setStatus(option)}
                >
                  {option}
                </button>
              ))}
            </div>

            <label className="progress-control">
              <span>Progresso pessoal: {progress}%</span>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={(event) => setProgress(Number(event.target.value))}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="item-details-grid">
        {details.map((detail) => (
          <UiCard key={detail.label}>
            <span>{detail.label}</span>
            <strong>{detail.value}</strong>
          </UiCard>
        ))}
      </section>

      <section className="content-panel">
        <SectionHeading
          eyebrow="Próximo passo"
          title="Tracking completo por item"
          description="Aqui o item vira o centro para status, progresso, notas e ações pessoais."
        />

        <UiCard className="tracking-summary">
          <div>
            <UiBadge tone="secondary">Resumo</UiBadge>
            <strong>{title}</strong>
            <p>
              Seu status atual é {status.toLowerCase()} e o progresso está em {progress}%.
              {isSaving ? " Salvando..." : " Sincronizado com o rastreio."}
            </p>
          </div>
          <div className="item-next-actions">
            <UiButton href="/catalogo">Voltar ao catálogo</UiButton>
            <UiButton href="/painel" variant="secondary">
              Abrir painel
            </UiButton>
          </div>
        </UiCard>
      </section>
    </main>
  );
}