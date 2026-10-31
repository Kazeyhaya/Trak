"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { UiBadge } from "./ui-badge";
import { RatingStars } from "./rating-stars";
import { Activity, getStatusLabel, saveTrackingItem } from "../lib/api";
import { getMediaTypeLabel } from "../lib/catalogo-api";
import { descreverAtividade, tempoRelativo } from "../lib/atividades";
import { useAuth } from "../contextos/auth-context";

type ActivityListProps = {
  items: Activity[];
  // No perfil o autor e sempre o mesmo, entao o nome e omitido.
  showAuthor?: boolean;
};

export function ActivityList({ items, showAuthor = true }: ActivityListProps) {
  const { user } = useAuth();
  const [trackedMap, setTrackedMap] = useState<Record<string, boolean>>({});
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  async function handleQuickTrack(mediaItemId: string) {
    if (!user || trackedMap[mediaItemId]) return;
    // Atualização otimista: acende o botão instantaneamente
    setTrackedMap((prev) => ({ ...prev, [mediaItemId]: true }));
    try {
      await saveTrackingItem(mediaItemId, { status: "WANT" });
    } catch {
      // Desfaz silenciosamente se falhar
      setTrackedMap((prev) => ({ ...prev, [mediaItemId]: false }));
    }
  }

  return (
    <ol className="activity-list">
      {items.map((atividade) => {
        const item = atividade.item;
        const author = atividade.user;
        const authorInitial = (author?.displayName || author?.username || "V")[0]?.toUpperCase() ?? "?";

        const hasValidCover = Boolean(
          item?.coverUrl &&
          !brokenImages[atividade.id] &&
          !item.coverUrl.includes("/id/-1-") &&
          !item.coverUrl.includes("/id/0-")
        );

        const typeLabel = item ? getMediaTypeLabel(item.type, item.subtype) : null;
        const isTracked = Boolean(
          atividade.mediaItemId && (trackedMap[atividade.mediaItemId] || atividade.inMyLibrary)
        );

        return (
          <li key={atividade.id}>
            <article className="activity-card">
              <header className="activity-header">
                <div className="activity-author-group">
                  {showAuthor && (
                    <div className="activity-author-avatar">
                      {author?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={author.avatarUrl} alt="" />
                      ) : (
                        <span>{authorInitial}</span>
                      )}
                    </div>
                  )}

                  <div className="activity-author-meta">
                    <div className="activity-author-name-row">
                      {showAuthor ? (
                        author ? (
                          <>
                            <Link href={`/u/${encodeURIComponent(author.username)}`} className="activity-author-name">
                              {author.displayName || `@${author.username}`}
                            </Link>
                            {author.displayName && (
                              <Link href={`/u/${encodeURIComponent(author.username)}`} className="activity-author-handle">
                                @{author.username}
                              </Link>
                            )}
                          </>
                        ) : (
                          <span className="activity-author-name">Você</span>
                        )
                      ) : null}
                    </div>

                    <div className="activity-action-text">
                      <span>{descreverAtividade(atividade)}</span>
                      {atividade.type === "RATING" && typeof atividade.data.rating === "number" && (
                        <RatingStars value={atividade.data.rating} size="sm" />
                      )}
                      {atividade.type === "STATUS" && atividade.data.status && (
                        <UiBadge tone="secondary">
                          {getStatusLabel(atividade.data.status, item?.type)}
                        </UiBadge>
                      )}
                    </div>
                  </div>
                </div>

                <time className="activity-time" dateTime={atividade.createdAt}>
                  {tempoRelativo(atividade.createdAt)}
                </time>
              </header>

              {item && atividade.mediaItemId && (
                <div className="activity-media-box">
                  <div className="activity-media-cover">
                    {hasValidCover ? (
                      <Image
                        src={
                          item.coverUrl!.includes("media.rawg.io/media/games/")
                            ? item.coverUrl!.replace("media.rawg.io/media/games/", "media.rawg.io/media/resize/640/-/games/")
                            : item.coverUrl!
                        }
                        alt=""
                        fill
                        sizes="72px"
                        quality={70}
                        loading="lazy"
                        onError={() => setBrokenImages((prev) => ({ ...prev, [atividade.id]: true }))}
                      />
                    ) : (
                      <div className="media-card-orb" />
                    )}
                  </div>

                  <div className="activity-media-details">
                    <div className="activity-media-badges">
                      {typeLabel && <UiBadge tone="secondary">{typeLabel}</UiBadge>}
                      {item.releaseYear && <span className="feed-filter-badge">{item.releaseYear}</span>}
                    </div>

                    <h3 className="activity-media-title">
                      <Link href={`/itens/${encodeURIComponent(atividade.mediaItemId)}`}>
                        {item.title}
                      </Link>
                    </h3>

                    {item.synopsis && (
                      <p className="activity-media-synopsis">{item.synopsis}</p>
                    )}

                    <div className="activity-media-footer">
                      {user && (
                        <button
                          type="button"
                          className={`activity-quick-track-btn ${isTracked ? "is-saved" : ""}`}
                          disabled={isTracked}
                          onClick={() => handleQuickTrack(atividade.mediaItemId!)}
                        >
                          {isTracked
                            ? "✓ Na sua estante"
                            : `+ Quero ${item.type === "GAME" ? "jogar" : item.type === "BOOK" ? "ler" : "ver"}`}
                        </button>
                      )}
                      <Link href={`/itens/${encodeURIComponent(atividade.mediaItemId)}`} className="activity-details-link">
                        Ver detalhes →
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}
