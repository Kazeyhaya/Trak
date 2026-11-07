"use client";

import { useEffect, useId, useState } from "react";
import { Crown, User, X } from "lucide-react";
import { UiModal } from "./ui-modal";
import { EpisodeCharacter, errorMessage, getEpisodeCredits, getMediaCredits } from "../lib/api";

type PantheonModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mediaItemId: string;
  itemTitle: string;
  currentFavoriteName: string | null;
  currentFavoriteAvatar: string | null;
  onSave: (name: string | null, avatarUrl: string | null) => Promise<void>;
};

export function PantheonModal({
  isOpen,
  onClose,
  mediaItemId,
  itemTitle,
  currentFavoriteName,
  currentFavoriteAvatar,
  onSave
}: PantheonModalProps) {
  const [characters, setCharacters] = useState<EpisodeCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedName, setSelectedName] = useState<string | null>(currentFavoriteName);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(currentFavoriteAvatar);
  const [customNameInput, setCustomNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tituloId = useId();

  useEffect(() => {
    if (!isOpen) return;
    let active = true;

    getMediaCredits(mediaItemId)
      .then((chars) => {
        if (!active) return;
        if (chars && chars.length > 0) {
          setCharacters(chars);
        } else {
          return getEpisodeCredits(mediaItemId, 1, 1).then((c) => {
            if (active) setCharacters(c);
          });
        }
      })
      .catch(() => {
        if (active) setCharacters([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, mediaItemId]);

  if (!isOpen) return null;

  // Se salvar falhar, o modal continua aberto com a escolha feita e o motivo do erro.
  async function salvar(name: string | null, avatarUrl: string | null) {
    setSaving(true);
    setError(null);
    try {
      await onSave(name, avatarUrl);
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Não foi possível salvar no Panteão."));
    } finally {
      setSaving(false);
    }
  }

  function handleConfirm() {
    const nomeDigitado = customNameInput.trim();
    void salvar(nomeDigitado || selectedName, nomeDigitado ? null : selectedAvatar);
  }

  return (
    <UiModal onClose={onClose} tituloId={tituloId} className="cover-modal-card pantheon-modal">
      <div className="cover-modal-header">
        <div>
          <h3 id={tituloId} className="modal-title-with-icon">
            <Crown size={18} className="pantheon-crown-icon" aria-hidden="true" />
            Panteão da Obra: {itemTitle}
          </h3>
          <p>
            Escolha o personagem que mais marcou a sua experiência para coroá-lo no seu perfil
          </p>
        </div>
        <button type="button" className="cover-modal-close" onClick={onClose} aria-label="Fechar">
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      {error && (
        <div className="cover-modal-error" role="alert">
          {error}
        </div>
      )}

      <div className="cover-modal-body modal-section-stack">
        {(selectedName || customNameInput) && (
          <div className="pantheon-selected-banner">
            <div className="pantheon-selected-avatar">
              {selectedAvatar && !customNameInput ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img loading="lazy" decoding="async" src={selectedAvatar} alt="" />
              ) : (
                <Crown size={18} aria-hidden="true" />
              )}
            </div>
            <div className="pantheon-selected-copy">
              <span className="pantheon-selected-eyebrow">Escolhido para o Panteão</span>
              <p className="pantheon-selected-name">
                {customNameInput.trim() || selectedName}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="panel-note">Carregando personagens da obra…</p>
        ) : characters.length > 0 ? (
          <div className="modal-field-block">
            <span className="modal-field-label">Personagens principais</span>
            <div className="episode-characters-carousel episode-characters-carousel--modal">
              {characters.map((char) => {
                const isSelected = selectedName?.toLowerCase() === char.character?.toLowerCase();
                return (
                  <button
                    key={char.id}
                    type="button"
                    className={`episode-char-card${isSelected ? " is-selected" : ""}`}
                    onClick={() => {
                      setSelectedName(char.character);
                      setSelectedAvatar(char.avatarUrl);
                      setCustomNameInput("");
                    }}
                    title={char.character}
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
          </div>
        ) : null}

        <div className="modal-field-block">
          <label htmlFor="pantheon-custom-input" className="modal-field-label">
            Ou digite o nome de outro personagem
          </label>
          <input
            id="pantheon-custom-input"
            type="text"
            className="episode-search-input pantheon-custom-input"
            placeholder="Ex: Jesse, Céline, Joel, Ellie, Goku…"
            value={customNameInput}
            onChange={(e) => {
              setCustomNameInput(e.target.value);
              if (e.target.value) {
                setSelectedName(null);
                setSelectedAvatar(null);
              }
            }}
          />
        </div>
      </div>

      <div className="cover-modal-footer">
        {currentFavoriteName && (
          <button
            type="button"
            className="cover-btn-reset"
            disabled={saving}
            onClick={() => void salvar(null, null)}
          >
            Remover do Panteão
          </button>
        )}
        <div className="cover-modal-footer-actions">
          <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={saving || (!selectedName && !customNameInput.trim())}
            onClick={handleConfirm}
          >
            {saving ? "Salvando…" : "Confirmar coroação"}
          </button>
        </div>
      </div>
    </UiModal>
  );
}
