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
  const { user, loading } = useAuth();
  const temEstadoInicial = initialIsMe !== undefined && initialFollowing !== undefined;
  const [state, setState] = useState<{ isMe: boolean; isFollowing: boolean } | null>(
    temEstadoInicial ? { isMe: initialIsMe, isFollowing: initialFollowing } : null
  );

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

  if (user && !state) {
    return null;
  }

  if (user && state?.isMe) {
    return (
      <UiButton href="/perfil" variant="secondary">
        Editar perfil
      </UiButton>
    );
  }

  return <FollowButton username={username} initialFollowing={user ? (state?.isFollowing ?? false) : false} />;
}
