"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { FollowButton } from "./follow-button";
import { FollowUser, getFollowers, getFollowing, errorMessage } from "../lib/api";
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
  const [followers, setFollowers] = useState<FollowUser[] | null>(null);
  const [following, setFollowing] = useState<FollowUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const isCurrentNull = activeTab === "followers" ? followers === null : following === null;
  const loading = isCurrentNull && !error;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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

  const currentList = activeTab === "followers" ? followers : following;

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
    <div
      className="follow-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Seguidores e Seguindo"
    >
      <div className="follow-modal-card" onClick={(e) => e.stopPropagation()}>
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
            aria-label="Fechar modal"
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
                          <img src={item.avatarUrl} alt="" />
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
        </div>
      </div>
    </div>
  );
}
