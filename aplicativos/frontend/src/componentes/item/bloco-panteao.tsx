import { useState } from "react";
import { Crown, Lock, User } from "lucide-react";
import { PantheonModal } from "../pantheon-modal";

type BlocoPanteaoProps = {
  mediaItemId: string;
  itemTitle: string;
  isCompleted: boolean;
  favoriteCharacterName: string | null;
  favoriteCharacterAvatar: string | null;
  onSaveCrown: (name: string | null, avatarUrl: string | null) => Promise<void>;
};

export function BlocoPanteao({
  mediaItemId,
  itemTitle,
  isCompleted,
  favoriteCharacterName,
  favoriteCharacterAvatar,
  onSaveCrown
}: BlocoPanteaoProps) {
  const [showPantheonModal, setShowPantheonModal] = useState(false);

  return (
    <>
      {isCompleted ? (
        <div className="pantheon-block is-unlocked">
          <div className="pantheon-info">
            <span className="pantheon-title">
              <Crown size={15} aria-hidden="true" />
              Panteão da Obra
            </span>
            <span className="pantheon-desc">
              {favoriteCharacterName
                ? "Seu personagem favorito coroado para esta obra:"
                : "Obra concluída! Escolha seu personagem favorito para o Panteão:"}
            </span>
          </div>

          {favoriteCharacterName ? (
            <div className="pantheon-crowned">
              <div className="pantheon-avatar">
                {favoriteCharacterAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" decoding="async" src={favoriteCharacterAvatar} alt={favoriteCharacterName} />
                ) : (
                  <User size={16} aria-hidden="true" />
                )}
              </div>
              <strong className="pantheon-name">{favoriteCharacterName}</strong>
              <button
                type="button"
                className="secondary-button pantheon-btn-sm"
                onClick={() => setShowPantheonModal(true)}
              >
                Alterar
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="primary-button pantheon-btn-md"
              onClick={() => setShowPantheonModal(true)}
            >
              <Crown size={14} aria-hidden="true" />
              Coroar personagem
            </button>
          )}
        </div>
      ) : (
        <div className="pantheon-block is-locked" title="Marque a obra como Concluída / Zerada para desbloquear o Panteão">
          <div className="pantheon-info">
            <span className="pantheon-title is-muted">
              <Lock size={14} aria-hidden="true" />
              Panteão da Obra
            </span>
            <span className="pantheon-desc">
              Complete esta obra para coroar o seu personagem favorito no seu perfil e críticas.
            </span>
          </div>
        </div>
      )}

      <PantheonModal
        key={showPantheonModal ? `${mediaItemId}-open` : "closed"}
        isOpen={showPantheonModal}
        onClose={() => setShowPantheonModal(false)}
        mediaItemId={mediaItemId}
        itemTitle={itemTitle}
        currentFavoriteName={favoriteCharacterName}
        currentFavoriteAvatar={favoriteCharacterAvatar}
        onSave={onSaveCrown}
      />
    </>
  );
}
