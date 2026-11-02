"use client";

import { useState } from "react";
import { RatingStars } from "./rating-stars";
import { Episode, EpisodeCharacter, FriendEpisodeHighlight, WatchedEpisode } from "../lib/api";

type EpisodeReviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mediaItemId: string;
  seasonNumber: number;
  episode: Episode;
  watchedEntry?: WatchedEpisode;
  credits: EpisodeCharacter[];
  isLoadingCredits: boolean;
  friendHighlights: FriendEpisodeHighlight[];
  onRate: (rating: number | null) => Promise<void>;
  onSelectHighlight: (character: EpisodeCharacter) => Promise<void>;
};

export function EpisodeReviewModal({
  isOpen,
  onClose,
  episode,
  watchedEntry,
  credits,
  isLoadingCredits,
  friendHighlights,
  onRate,
  onSelectHighlight
}: EpisodeReviewModalProps) {
  const [activeRating, setActiveRating] = useState<number | null>(watchedEntry?.rating ?? null);
  const [selectedCharName, setSelectedCharName] = useState<string | null>(
    watchedEntry?.highlightCharacterName ?? null
  );

  if (!isOpen) return null;

  const friendsThisEp = friendHighlights.filter((h) => h.episode === episode.episodeNumber);

  return (
    <div className="cover-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cover-modal-card episode-review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cover-modal-header">
          <div>
            <h3>Episódio {episode.episodeNumber}: {episode.name}</h3>
            <p>Avalie o episódio e escolha quem roubou a cena</p>
          </div>
          <button type="button" className="cover-modal-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="cover-modal-body" style={{ gap: "20px" }}>
          {/* Seção da Nota */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Sua nota no episódio:</span>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <RatingStars
                value={activeRating}
                size="md"
                onChange={(rating) => {
                  setActiveRating(rating);
                  void onRate(rating);
                }}
              />
            </div>
          </div>

          {/* Quem roubou a cena */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#facc15", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>👑</span> Quem roubou a cena neste episódio?
              </span>
              {selectedCharName && (
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--muted)",
                    fontSize: "0.75rem",
                    cursor: "pointer"
                  }}
                  onClick={() => {
                    setSelectedCharName(null);
                    const dummy = { id: "", name: "", character: selectedCharName, avatarUrl: null };
                    void onSelectHighlight(dummy);
                  }}
                >
                  Limpar destaque
                </button>
              )}
            </div>

            {isLoadingCredits ? (
              <p className="panel-note">Carregando personagens do episódio…</p>
            ) : credits.length === 0 ? (
              <p className="panel-note">Nenhum personagem registrado para este episódio.</p>
            ) : (
              <div className="episode-characters-carousel" style={{ maxHeight: "170px" }}>
                {credits.map((char) => {
                  const isSelected = selectedCharName?.toLowerCase() === char.character?.toLowerCase();
                  return (
                    <button
                      key={char.id}
                      type="button"
                      className={`episode-char-card${isSelected ? " is-selected" : ""}`}
                      onClick={() => {
                        setSelectedCharName(isSelected ? null : char.character);
                        void onSelectHighlight(char);
                      }}
                      title={`${char.character} (${char.name})`}
                    >
                      <div className="episode-char-avatar-wrap" style={{ width: "64px", height: "64px" }}>
                        {char.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={char.avatarUrl} alt={char.character} />
                        ) : (
                          <span style={{ fontSize: "1.4rem" }}>👤</span>
                        )}
                      </div>
                      <span className="episode-char-name" style={{ maxWidth: "75px" }}>{char.character}</span>
                      <span className="episode-char-actor" style={{ maxWidth: "75px" }}>{char.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Social Íntimo */}
          {friendsThisEp.length > 0 && (
            <div className="episode-social-insight">
              <span>💬</span>
              <span>
                {friendsThisEp.map((f) => `@${f.user.username}`).join(", ")} também destacou{" "}
                <strong>{friendsThisEp[0].characterName}</strong> neste episódio.
              </span>
            </div>
          )}
        </div>

        <div className="cover-modal-footer">
          <div style={{ marginLeft: "auto" }}>
            <button type="button" className="primary-button" onClick={onClose} style={{ minWidth: "100px" }}>
              Concluído
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
