"use client";

import Link from "next/link";
import { useState } from "react";

import { SiteHeader } from "./site-header";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import { useAuth } from "../contextos/auth-context";
import { errorMessage, Profile, saveMyProfile } from "../lib/api";
import { problemaUsername } from "../lib/perfil";

export function ProfileForm() {
  const { profile } = useAuth();

  return (
    <main className="content-shell">
      <SiteHeader />
      <section className="content-hero">
        <div>
          <h1>{profile ? "Seu perfil" : "Crie seu perfil"}</h1>
          <p>Seu perfil público mostra seus favoritos, estatísticas e atividade recente.</p>
        </div>
        <div className="item-next-actions">
          <UiButton href="/recap" variant="secondary">
            Retrospectiva (Recap)
          </UiButton>
          <UiButton href="/importar" variant="secondary">
            Importar histórico
          </UiButton>
          {profile && (
            <UiButton href={`/u/${profile.username}`} variant="secondary">
              Ver perfil público
            </UiButton>
          )}
        </div>
      </section>
      {/* key: remonta o formulario quando o perfil termina de carregar. */}
      <ProfileFields key={profile?.username ?? "novo"} profile={profile} />
    </main>
  );
}

function ProfileFields({ profile }: { profile: Profile | null }) {
  const { refreshProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const normalized = username.trim().toLowerCase();
  const usernameValid = problemaUsername(normalized) === null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const result = await saveMyProfile({ username: normalized, displayName, bio, isPublic });
      await refreshProfile();
      setSaved(result.username);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <UiCard className="import-card">
      <form className="field-stack profile-form" onSubmit={handleSubmit}>
        <label>
          Nome de usuário
          <input
            value={username}
            maxLength={20}
            autoCapitalize="none"
            // "username" faria o navegador preencher com o e-mail salvo do login.
            autoComplete="off"
            name="trak-handle"
            spellCheck={false}
            placeholder="seu_nome"
            onChange={(event) => setUsername(event.target.value)}
            aria-invalid={username !== "" && !usernameValid}
            aria-describedby="username-help"
            required
          />
          <small id="username-help">3 a 20 caracteres: letras minúsculas, números ou _.</small>
          {username !== "" && !usernameValid && (
            <span className="field-error" role="alert">
              {problemaUsername(username)}
            </span>
          )}
        </label>
        <label>
          Nome de exibição
          <input value={displayName} maxLength={50} onChange={(event) => setDisplayName(event.target.value)} />
        </label>
        <label>
          Bio
          <textarea value={bio} maxLength={280} rows={3} onChange={(event) => setBio(event.target.value)} />
        </label>
        <label className="rating-row">
          <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} />
          Perfil público (outras pessoas veem sua lista e atividade)
        </label>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="auth-notice" role="status">
            Perfil salvo. <Link href={`/u/${saved}`}>Ver meu perfil público</Link>
          </p>
        )}

        <div className="auth-actions">
          <UiButton type="submit" disabled={saving || !usernameValid}>
            {saving ? "Salvando…" : "Salvar perfil"}
          </UiButton>
        </div>
      </form>
    </UiCard>
  );
}
