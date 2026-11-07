"use client";

import { useId, useState } from "react";
import { Crown, MessageCircle, User, X } from "lucide-react";
import { RatingStars } from "./rating-stars";
import { UiModal } from "./ui-modal";
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
  const tituloId = useId();

  if (!isOpen) return null;

  const friendsThisEp = friendHighlights.filter((h) => h.episode === episode.episodeNumber);

  return (
    <UiModal onClose={onClose} tituloId={tituloId} className="cover-modal-card episode-review-modal">
      <div className="cover-modal-header">
        <div>
          <h3 id={tituloId}>Episódio {episode.episodeNumber}: {episode.name}</h3>
          <p>Avalie o episódio e escolha quem roubou a cena</p>
        </div>
        <button type="button" className="cover-modal-close" onClick={onClose} aria-label="Fechar">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="cover-modal-body modal-section-stack">
        <div className="modal-field-block">
          <span className="modal-field-label">Sua nota no episódio</span>
          <div className="modal-rating-row">
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

        <div className="modal-field-block">
          <div className="modal-field-header">
            <span className="modal-highlight-label">
              <Crown size={15} aria-hidden="true" />
              Quem roubou a cena neste episódio?
            </span>
            {selectedCharName && (
              <button
                type="button"
                className="modal-link-action"
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
            <div className="episode-characters-carousel episode-characters-carousel--modal">
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
                    <div className="episode-char-avatar-wrap episode-char-avatar-wrap--lg">
                      {char.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img loading="lazy" decoding="async" src={char.avatarUrl} alt={char.character} />
                      ) : (
                        <User size={22} aria-hidden="true" />
                      )}
                    </div>
                    <span className="episode-char-name">{char.character}</span>
                    <span className="episode-char-actor">{char.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {friendsThisEp.length > 0 && (
          <div className="episode-social-insight">
            <MessageCircle size={15} aria-hidden="true" />
            <span>
              {friendsThisEp.map((f) => `@${f.user.username}`).join(", ")} também destacou{" "}
              <strong>{friendsThisEp[0].characterName}</strong> neste episódio.
            </span>
          </div>
        )}
      </div>

      <div className="cover-modal-footer">
        <div className="cover-modal-footer-actions">
          <button type="button" className="primary-button" onClick={onClose}>
            Concluído
          </button>
        </div>
      </div>
    </UiModal>
  );
}
