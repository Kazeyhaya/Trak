"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getCatalogCovers } from "../lib/api";

type CustomCoverModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mediaItemId: string;
  itemTitle: string;
  defaultCoverUrl: string | null;
  currentCoverUrl: string | null;
  onSave: (coverUrl: string | null) => Promise<void>;
};

export function CustomCoverModal({
  isOpen,
  onClose,
  mediaItemId,
  itemTitle,
  defaultCoverUrl,
  currentCoverUrl,
  onSave
}: CustomCoverModalProps) {
  const [covers, setCovers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(currentCoverUrl);
  const [customInput, setCustomInput] = useState(
    currentCoverUrl && currentCoverUrl !== defaultCoverUrl ? currentCoverUrl : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    getCatalogCovers(mediaItemId)
      .then((res) => {
        if (!active) return;
        const list = res.capas || [];
        // Garante que a capa padrao tambem esteja na lista de opcoes
        const combined = defaultCoverUrl && !list.includes(defaultCoverUrl)
          ? [defaultCoverUrl, ...list]
          : list;
        setCovers(combined);
      })
      .catch(() => {
        if (active && defaultCoverUrl) {
          setCovers([defaultCoverUrl]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      active = false;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, mediaItemId, defaultCoverUrl, onClose]);

  if (!isOpen) return null;

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      const urlToSave = selected?.trim() || null;
      // Se for a mesma que a original, grava null para economizar espaço
      const finalUrl = urlToSave === defaultCoverUrl ? null : urlToSave;
      await onSave(finalUrl);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar capa");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetDefault() {
    setSaving(true);
    setError(null);
    try {
      await onSave(null);
      setSelected(defaultCoverUrl);
      setCustomInput("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao restaurar capa original");
    } finally {
      setSaving(false);
    }
  }

  const hasCustom = Boolean(currentCoverUrl && currentCoverUrl !== defaultCoverUrl);

  return (
    <div
      className="cover-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Escolher capa personalizada"
    >
      <div className="cover-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="cover-modal-header">
          <div>
            <h3>Capa personalizada</h3>
            <p>Escolha a edição que mais gosta de <em>{itemTitle}</em> para a sua estante e perfil.</p>
          </div>
          <button
            type="button"
            className="cover-modal-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="cover-modal-error" role="alert">
            {error}
          </div>
        )}

        <div className="cover-modal-body">
          <div className="cover-modal-section-title">
            <span>Pôsteres e capas oficiais disponíveis</span>
          </div>

          {loading ? (
            <div className="cover-modal-loading">
              <div className="cover-skeleton" />
              <div className="cover-skeleton" />
              <div className="cover-skeleton" />
              <div className="cover-skeleton" />
            </div>
          ) : covers.length === 0 ? (
            <p className="cover-modal-empty">Nenhum pôster alternativo encontrado para esta obra.</p>
          ) : (
            <div className="cover-grid-scroll">
              <div className="cover-grid">
                {covers.map((url) => {
                  const isSelected = selected === url || (!selected && url === defaultCoverUrl);
                  return (
                    <button
                      key={url}
                      type="button"
                      className={`cover-thumb-btn ${isSelected ? "is-selected" : ""}`}
                      onClick={() => {
                        setSelected(url);
                        setCustomInput(url);
                      }}
                      title="Selecionar esta capa"
                    >
                      <Image
                        src={url}
                        alt="Opção de capa"
                        width={140}
                        height={210}
                        unoptimized
                        className="cover-thumb-img"
                      />
                      {isSelected && (
                        <div className="cover-thumb-check">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                      {url === defaultCoverUrl && (
                        <span className="cover-thumb-tag">Padrão</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="cover-modal-section-title">
            <span>Ou insira o link de uma imagem externa</span>
          </div>
          <div className="cover-custom-url-box">
            <input
              type="url"
              placeholder="https://exemplo.com/poster.jpg"
              value={customInput}
              onChange={(e) => {
                const val = e.target.value;
                setCustomInput(val);
                setSelected(val.trim() || defaultCoverUrl);
              }}
              className="cover-url-input"
            />
          </div>
        </div>

        <div className="cover-modal-footer">
          {hasCustom && (
            <button
              type="button"
              className="cover-btn-reset"
              onClick={handleResetDefault}
              disabled={saving}
            >
              Restaurar padrão
            </button>
          )}
          <div className="cover-modal-footer-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={handleConfirm}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar capa"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
