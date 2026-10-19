"use client";

import { useEffect, useState } from "react";

import { FollowButton } from "./follow-button";
import { UiButton } from "./ui-button";
import { useAuth } from "../contextos/auth-context";
import { getPublicProfile } from "../lib/api";

// O servidor renderiza o perfil sem login; aqui descobrimos se o visitante
// e o dono do perfil ou se ja o segue.
export function ProfileActions({ username }: { username: string }) {
  const { user, loading } = useAuth();
  const [state, setState] = useState<{ isMe: boolean; isFollowing: boolean } | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    let active = true;
    getPublicProfile(username)
      .then((data) => active && setState({ isMe: data.isMe, isFollowing: data.isFollowing }))
      .catch(() => active && setState({ isMe: false, isFollowing: false }));
    return () => {
      active = false;
    };
  }, [user, username]);

  if (loading || (user && !state)) {
    return null;
  }

  if (state?.isMe) {
    return (
      <UiButton href="/perfil" variant="secondary">
        Editar perfil
      </UiButton>
    );
  }

  return <FollowButton username={username} initialFollowing={state?.isFollowing ?? false} />;
}
