"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { FollowButton } from "./follow-button";
import { UiModal } from "./ui-modal";
import { FollowUser, getFollowers, getFollowing, errorMessage, Pagina } from "../lib/api";
import { useAuth } from "../contextos/auth-context";

type FollowListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  initialTab?: "followers" | "following";
  followersCount: number;
  followingCount: number;
};

export function FollowListModal({
  isOpen,
  onClose,
  username,
  initialTab = "followers",
  followersCount,
  followingCount
}: FollowListModalProps) {
  const { profile: myProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<"followers" | "following">(initialTab);
  // Cada aba guarda as pessoas ja carregadas e o cursor da proxima pagina.
  const [followers, setFollowers] = useState<Pagina<FollowUser> | null>(null);
  const [following, setFollowing] = useState<Pagina<FollowUser> | null>(null);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const isCurrentNull = activeTab === "followers" ? followers === null : following === null;
  const loading = isCurrentNull && !error;

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    if (activeTab === "followers" && followers === null) {
      getFollowers(username)
        .then((data) => {
          if (active) {
            setFollowers(data);
          }
        })
        .catch((err) => {
          if (active) {
            setError(errorMessage(err));
          }
        });
    } else if (activeTab === "following" && following === null) {
      getFollowing(username)
        .then((data) => {
          if (active) {
            setFollowing(data);
          }
        })
        .catch((err) => {
          if (active) {
            setError(errorMessage(err));
          }
        });
    }

    return () => {
      active = false;
    };
  }, [isOpen, activeTab, username, followers, following]);

  const paginaAtual = activeTab === "followers" ? followers : following;
  const currentList = paginaAtual?.items ?? null;

  async function carregarMais() {
    if (!paginaAtual?.proximo) {
      return;
    }
    const aba = activeTab;
    setCarregandoMais(true);
    try {
      const buscar = aba === "followers" ? getFollowers : getFollowing;
      const proxima = await buscar(username, paginaAtual.proximo);
      const juntar = (atual: Pagina<FollowUser> | null) => {
        const vistos = new Set((atual?.items ?? []).map((u) => u.userId));
        return { items: [...(atual?.items ?? []), ...proxima.items.filter((u) => !vistos.has(u.userId))], proximo: proxima.proximo };
      };
      if (aba === "followers") {
        setFollowers(juntar);
      } else {
        setFollowing(juntar);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCarregandoMais(false);
    }
  }

  const filteredList = useMemo(() => {
    if (!currentList) return [];
    if (!search.trim()) return currentList;
    const q = search.trim().toLowerCase();
    return currentList.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        Boolean(u.displayName && u.displayName.toLowerCase().includes(q)) ||
        Boolean(u.bio && u.bio.toLowerCase().includes(q))
    );
  }, [currentList, search]);

  if (!isOpen) return null;

  return (
    <UiModal
      onClose={onClose}
      rotulo="Seguidores e seguindo"
      overlayClassName="follow-modal-overlay"
      className="follow-modal-card"
    >
      <div className="follow-modal-header">
        <div className="follow-modal-tabs">
          <button
            type="button"
            className={`follow-modal-tab ${activeTab === "followers" ? "is-active" : ""}`}
            onClick={() => {
              setActiveTab("followers");
              setError(null);
            }}
          >
            Seguidores
            <span className="follow-modal-tab-badge">{followersCount}</span>
          </button>
          <button
            type="button"
            className={`follow-modal-tab ${activeTab === "following" ? "is-active" : ""}`}
            onClick={() => {
              setActiveTab("following");
              setError(null);
            }}
          >
            Seguindo
            <span className="follow-modal-tab-badge">{followingCount}</span>
          </button>
        </div>
        <button
          type="button"
          className="follow-modal-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>

      <div className="follow-modal-search">
        <input
          type="text"
          placeholder="Filtrar por nome ou @usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="follow-search-input"
        />
      </div>

      <div className="follow-modal-body">
        {loading && (
          <div className="follow-modal-empty">
            <p>Carregando {activeTab === "followers" ? "seguidores" : "seguindo"}...</p>
          </div>
        )}

        {error && (
          <div className="follow-modal-error" role="alert">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && filteredList.length === 0 && (
          <div className="follow-modal-empty">
            <p>
              {search.trim()
                ? "Nenhum usuário encontrado na busca."
                : activeTab === "followers"
                  ? "Nenhum seguidor ainda."
                  : "Não está seguindo ninguém ainda."}
            </p>
          </div>
        )}

        {!loading && !error && filteredList.length > 0 && (
          <ul className="follow-user-list">
            {filteredList.map((item) => {
              const isMe =
                Boolean(item.isMe) ||
                Boolean(myProfile && item.username.toLowerCase() === myProfile.username.toLowerCase());
              const initial = (item.displayName || item.username)[0]?.toUpperCase() ?? "?";

              return (
                <li key={item.userId} className="follow-user-item">
                  <Link
                    href={`/u/${encodeURIComponent(item.username)}`}
                    className="follow-user-info"
                    onClick={onClose}
                  >
                    <div className="follow-user-avatar">
                      {item.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img loading="lazy" decoding="async" src={item.avatarUrl} alt="" />
                      ) : (
                        <span>{initial}</span>
                      )}
                    </div>
                    <div className="follow-user-text">
                      <div className="follow-user-title-row">
                        <span className="follow-user-name">
                          {item.displayName || `@${item.username}`}
                        </span>
                        {item.followsYou && !isMe && (
                          <span className="follow-user-pill">Segue você</span>
                        )}
                      </div>
                      {item.displayName && (
                        <span className="follow-user-handle">@{item.username}</span>
                      )}
                      {item.bio && <p className="follow-user-bio">{item.bio}</p>}
                    </div>
                  </Link>

                  {!isMe && (
                    <div className="follow-user-action">
                      <FollowButton
                        username={item.username}
                        initialFollowing={Boolean(item.isFollowing)}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!loading && !error && paginaAtual?.proximo && (
          <div className="follow-modal-mais">
            <button type="button" className="secondary-button" disabled={carregandoMais} onClick={() => void carregarMais()}>
              {carregandoMais ? "Carregando…" : "Carregar mais"}
            </button>
          </div>
        )}
      </div>
    </UiModal>
  );
}
