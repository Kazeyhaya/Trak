"use client";

import { useState } from "react";

import { UiButton } from "./ui-button";
import { useAuth } from "../contextos/auth-context";
import { errorMessage, setFollowing } from "../lib/api";

type FollowButtonProps = {
  username: string;
  initialFollowing: boolean;
  onChange?: (following: boolean) => void;
};

export function FollowButton({ username, initialFollowing, onChange }: FollowButtonProps) {
  const { user } = useAuth();
  const [following, setFollowingState] = useState(initialFollowing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return <UiButton href={`/entrar?next=${encodeURIComponent(`/u/${username}`)}`}>Seguir</UiButton>;
  }

  async function toggle() {
    const next = !following;
    setSaving(true);
    setError(null);
    try {
      await setFollowing(username, next);
      setFollowingState(next);
      onChange?.(next);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <UiButton variant={following ? "secondary" : "primary"} pressed={following} disabled={saving} onClick={toggle}>
        {following ? "Seguindo" : "Seguir"}
      </UiButton>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
