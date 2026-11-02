"use client";

import { useEffect, useState } from "react";
import { EpisodeCharacter, getEpisodeCredits, getMediaCredits } from "../lib/api";

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

  async function handleConfirm() {
    setSaving(true);
    try {
      const finalName = customNameInput.trim() || selectedName;
      const finalAvatar = customNameInput.trim() ? null : selectedAvatar;
      await onSave(finalName, finalAvatar);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setSaving(true);
    try {
      await onSave(null, null);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="cover-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cover-modal-card pantheon-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cover-modal-header">
          <div>
            <h3 style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>👑</span> Panteão da Obra: {itemTitle}
            </h3>
            <p>
              Escolha o personagem que mais marcou a sua experiência para coroá-lo no seu perfil
            </p>
          </div>
          <button type="button" className="cover-modal-close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="cover-modal-body" style={{ gap: "18px" }}>
          {/* Personagem Coroado Atual */}
          {(selectedName || customNameInput) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 14px",
                borderRadius: "10px",
                background: "rgba(250, 204, 21, 0.08)",
                border: "1px solid rgba(250, 204, 21, 0.3)"
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "9999px",
                  border: "2px solid #facc15",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255, 255, 255, 0.05)"
                }}
              >
                {selectedAvatar && !customNameInput ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "1.2rem" }}>👑</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: "0.75rem", color: "#facc15", fontWeight: 700 }}>ESCOLHIDO PARA O PANTEÃO:</span>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>
                  {customNameInput.trim() || selectedName}
                </p>
              </div>
            </div>
          )}

          {/* Elenco / Personagens oficiais disponíveis */}
          {loading ? (
            <p className="panel-note">Carregando personagens da obra…</p>
          ) : characters.length > 0 ? (
            <div>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
                Personagens Principais
              </span>
              <div className="episode-characters-carousel" style={{ maxHeight: "170px", marginTop: "8px" }}>
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
                      <div className="episode-char-avatar-wrap" style={{ width: "64px", height: "64px" }}>
                        {char.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={char.avatarUrl} alt={char.character} />
                        ) : (
                          <span>👤</span>
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

          {/* Opção de digitar nome caso seja outro personagem secundário */}
          <div>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
              Ou digite o nome de outro personagem:
            </label>
            <input
              type="text"
              className="episode-search-input"
              style={{ width: "100%", height: "40px" }}
              placeholder="Ex: Jesse, Céline, Joel, Ellie, Goku, etc…"
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
              onClick={handleRemove}
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
      </div>
    </div>
  );
}
