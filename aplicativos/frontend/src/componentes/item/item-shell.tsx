"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "../../contextos/auth-context";
import { CatalogExtras, getCatalogExtras, saveTrackingItem } from "../../lib/api";
import { CatalogItem, getMediaTypeLabel } from "../../lib/catalogo-api";
import { CommentsSection } from "../comments-section";
import { CustomCoverModal } from "../custom-cover-modal";
import { RelatedItems } from "../related-items";
import { SiteHeader } from "../site-header";
import { UiBadge } from "../ui-badge";
import { UiButton } from "../ui-button";
import { UiCard } from "../ui-card";
import { ItemExtras } from "./item-extras";
import { PersonalTracking } from "./tracking-pessoal";

type ItemShellProps = {
  item: CatalogItem;
};

const SYNOPSIS_PREVIEW_LENGTH = 360;

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

      <ItemExtras type={item.type} title={item.title} extras={extras} />

      <RelatedItems mediaItemId={item.id} />
      <CommentsSection mediaItemId={item.id} />
    </main>
  );
}
