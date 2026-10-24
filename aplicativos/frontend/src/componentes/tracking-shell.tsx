"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SiteHeader } from "./site-header";
import { useAuth } from "../contextos/auth-context";
import { ehUsernameProvisorio } from "../lib/api";

export function TrackingShell() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }
    if (profile?.username && !ehUsernameProvisorio(profile.username)) {
      router.replace(`/u/${profile.username}`);
    } else {
      router.replace("/perfil");
    }
  }, [loading, profile, router]);

  return (
    <main className="content-shell">
      <SiteHeader />
      <p className="panel-note">Abrindo seu perfil e estante…</p>
    </main>
  );
}
