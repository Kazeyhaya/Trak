"use client";

import { useEffect, useState } from "react";

import { FollowButton } from "./follow-button";
import { UiButton } from "./ui-button";
import { useAuth } from "../contextos/auth-context";
import { getPublicProfile } from "../lib/api";

type ProfileActionsProps = {
  username: string;
  initialIsMe?: boolean;
  initialFollowing?: boolean;
};

// O servidor ja envia isMe e isFollowing quando ha cookie de sessao;
// fazemos fallback no cliente apenas se o usuario logou sem cookie no SSR.
export function ProfileActions({ username, initialIsMe, initialFollowing }: ProfileActionsProps) {
  const { user, profile, loading } = useAuth();
  const temEstadoInicial = initialIsMe !== undefined && initialFollowing !== undefined;
  const [state, setState] = useState<{ isMe: boolean; isFollowing: boolean } | null>(
    temEstadoInicial ? { isMe: initialIsMe, isFollowing: initialFollowing } : null
  );

  const isMeByAuth = Boolean(user && profile?.username.toLowerCase() === username.toLowerCase());
  const isMe = Boolean(initialIsMe || isMeByAuth || state?.isMe);
  const isRecapSeason = new Date().getMonth() === 11;
  const canImport = !profile?.hasImported;

  useEffect(() => {
    if (!user || temEstadoInicial) {
      return;
    }
    let active = true;
    getPublicProfile(username)
      .then((data) => active && setState({ isMe: data.isMe, isFollowing: data.isFollowing }))
      .catch(() => active && setState({ isMe: false, isFollowing: false }));
    return () => {
      active = false;
    };
  }, [user, username, temEstadoInicial]);

  if (loading && !temEstadoInicial) {
    return null;
  }

  if (user && !state && !temEstadoInicial && !isMeByAuth) {
    return null;
  }

  if (user && isMe) {
    return (
      <div className="item-next-actions">
        {isRecapSeason && <UiButton href="/recap">Retrospectiva (Recap)</UiButton>}
        {canImport && (
          <UiButton href="/importar" variant="secondary">
            Importar histórico
          </UiButton>
        )}
        <UiButton href="/perfil" variant="secondary">
          Editar perfil
        </UiButton>
      </div>
    );
  }

  return <FollowButton username={username} initialFollowing={user ? (state?.isFollowing ?? initialFollowing ?? false) : false} />;
}
