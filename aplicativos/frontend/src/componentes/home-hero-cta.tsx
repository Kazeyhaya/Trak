"use client";

import { UiButton } from "./ui-button";
import { useAuth } from "../contextos/auth-context";

export function HomeHeroCta({ initialLoggedIn = false }: { initialLoggedIn?: boolean }) {
  const { user, profile, loading } = useAuth();
  const isLoggedIn = loading ? initialLoggedIn : Boolean(user);

  if (isLoggedIn) {
    return (
      <div className="cta-row">
        <UiButton href="/catalogo">Explorar o catálogo</UiButton>
        <UiButton href={profile ? `/u/${profile.username}` : "/painel"} variant="secondary">
          Minha estante
        </UiButton>
      </div>
    );
  }

  return (
    <div className="cta-row">
      <UiButton href="/entrar">Criar conta grátis</UiButton>
      <UiButton href="/catalogo" variant="secondary">
        Explorar o catálogo
      </UiButton>
    </div>
  );
}
