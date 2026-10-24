"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SiteHeader } from "./site-header";
import { UiBadge } from "./ui-badge";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import { useAuth } from "../contextos/auth-context";
import {
  CatalogItem,
  errorMessage,
  getFavorites,
  getTrackingItems,
  Profile,
  ProfileTheme,
  saveMyProfile
} from "../lib/api";
import { problemaUsername } from "../lib/perfil";

const THEMES: Array<{ id: ProfileTheme; label: string; color: string }> = [
  { id: "emerald", label: "Esmeralda", color: "#7ce1c7" },
  { id: "ocean", label: "Oceano", color: "#6cb8ff" },
  { id: "cyberpunk", label: "Cyberpunk", color: "#c586ff" },
  { id: "amber", label: "Âmbar", color: "#ffbe5c" },
  { id: "crimson", label: "Carmesim", color: "#ff7a90" }
];

export function ProfileForm() {
  const { profile } = useAuth();
  const isEndOfYear = new Date().getMonth() === 11;

  return (
    <main className="content-shell">
      <SiteHeader />
      <section className="content-hero">
        <div>
          <h1>{profile ? "Editar perfil" : "Crie seu perfil"}</h1>
          <p>Personalize sua identidade visual, capa de fundo, bio e visibilidade pública no Trak.</p>
        </div>
        <div className="item-next-actions">
          {isEndOfYear && (
            <UiButton href="/recap" variant="secondary">
              Retrospectiva (Recap)
            </UiButton>
          )}
          {!profile?.hasImported && (
            <UiButton href="/importar" variant="secondary">
              Importar histórico
            </UiButton>
          )}
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
  const router = useRouter();
  const [username, setUsername] = useState(profile?.username ?? "");
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? true);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(profile?.bannerUrl ?? "");
  const [theme, setTheme] = useState<string>(profile?.theme ?? "emerald");
  const [mediaOptions, setMediaOptions] = useState<CatalogItem[]>([]);
  const [quickStats, setQuickStats] = useState({ games: 0, books: 0, movies: 0, series: 0, hours: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getFavorites().catch(() => []), getTrackingItems().catch(() => [])]).then(([favs, trackings]) => {
      if (!active) return;
      const seen = new Set<string>();
      const items: CatalogItem[] = [];
      for (const f of favs) {
        if (f.item?.coverUrl && !seen.has(f.item.id)) {
          seen.add(f.item.id);
          items.push(f.item);
        }
      }
      for (const t of trackings) {
        if (t.item?.coverUrl && !seen.has(t.item.id)) {
          seen.add(t.item.id);
          items.push(t.item);
        }
      }
      setMediaOptions(items.slice(0, 12));

      let games = 0;
      let books = 0;
      let movies = 0;
      let series = 0;
      let hours = 0;
      for (const t of trackings) {
        const tipo = t.item?.type;
        const prog = Math.max(0, Math.min(100, t.progress ?? (t.status === "COMPLETED" ? 100 : 25)));
        if (tipo === "GAME") {
          if (t.status === "COMPLETED") {
            games++;
            hours += 25;
          } else if (t.status === "WATCHING" || t.status === "PAUSED") {
            hours += Math.max(2, Math.round(25 * (prog / 100)));
          }
        } else if (tipo === "BOOK") {
          if (t.status === "COMPLETED") {
            books++;
            hours += 8;
          } else if (t.status === "WATCHING" || t.status === "PAUSED") {
            hours += Math.max(1, Math.round(8 * (prog / 100)));
          }
        } else if (tipo === "MOVIE" && t.status === "COMPLETED") {
          movies++;
          hours += 2;
        } else if (tipo === "SERIES") {
          if (t.status === "COMPLETED") {
            series++;
            hours += 12;
          } else if (t.status === "WATCHING" || t.status === "PAUSED") {
            hours += 5;
          }
        }
      }
      setQuickStats({ games, books, movies, series, hours });
    });
    return () => {
      active = false;
    };
  }, []);

  const normalized = username.trim().toLowerCase();
  const usernameValid = problemaUsername(normalized) === null;
  const activeBanner = bannerUrl.trim() || mediaOptions[0]?.coverUrl || null;
  const avatarInitial = (displayName.trim() || normalized || "T").charAt(0).toUpperCase();

  function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Escolha um arquivo de imagem válido (PNG, JPG ou WebP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return;
        }
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setAvatarUrl(dataUrl);
        setError(null);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(null);
    try {
      const result = await saveMyProfile({
        username: normalized,
        displayName,
        bio,
        isPublic,
        avatarUrl: avatarUrl.trim(),
        bannerUrl: bannerUrl.trim(),
        theme
      });
      await refreshProfile();
      setSaved(result.username);
      router.push(`/u/${result.username}`);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-editor-layout">
      {/* Pre-visualizacao em tempo real do perfil */}
      <section
        className={`profile-showcase-banner theme-${theme}`}
        aria-label="Pré-visualização do seu perfil"
      >
        {activeBanner && (
          <div
            className="profile-showcase-backdrop"
            style={{ backgroundImage: `url("${activeBanner}")` }}
            aria-hidden="true"
          />
        )}
        <div className="profile-showcase-content">
          <div className="profile-identity-row">
            <div className="profile-avatar-badge" aria-hidden="true">
              {avatarUrl.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl.trim()} alt="" />
              ) : (
                avatarInitial
              )}
            </div>
            <div className="profile-identity-copy">
              <div className="status-chips">
                <UiBadge tone="primary">Pré-visualização</UiBadge>
                <UiBadge tone="secondary">{isPublic ? "Perfil Público" : "Perfil Privado"}</UiBadge>
              </div>
              <h2>{displayName.trim() || `@${normalized || "seu_nome"}`}</h2>
              <p className="profile-handle">@{normalized || "seu_nome"}</p>
              <p className="profile-bio-text">
                {bio.trim() || "Sua bio cultural aparecerá aqui para os visitantes do seu perfil."}
              </p>
            </div>
          </div>

          <div className="profile-cultural-badges">
            <div className="cultural-badge">
              <strong>{quickStats.games}</strong>
              <span>Jogos zerados</span>
            </div>
            <div className="cultural-badge">
              <strong>{quickStats.books}</strong>
              <span>Livros lidos</span>
            </div>
            <div className="cultural-badge">
              <strong>{quickStats.movies + quickStats.series}</strong>
              <span>Filmes & Séries</span>
            </div>
            <div className="cultural-badge">
              <strong>~{quickStats.hours}h</strong>
              <span>Horas totais</span>
            </div>
          </div>
        </div>
      </section>

      <UiCard className="import-card profile-editor-card">
        <form className="field-stack profile-form" onSubmit={handleSubmit}>
          <div className="profile-form-grid">
            <label>
              Nome de usuário
              <input
                value={username}
                maxLength={20}
                autoCapitalize="none"
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
              <input
                value={displayName}
                maxLength={50}
                placeholder="Como você quer ser chamado"
                onChange={(event) => setDisplayName(event.target.value)}
              />
              <small>Nome exibido em destaque no topo do seu perfil.</small>
            </label>
          </div>

          <label>
            <span className="label-row">
              <span>Bio</span>
              <small>{bio.length}/280</small>
            </span>
            <textarea
              value={bio}
              maxLength={280}
              rows={3}
              placeholder="Conte um pouco sobre seus gêneros favoritos, o que está jogando, lendo ou assistindo..."
              onChange={(event) => setBio(event.target.value)}
            />
          </label>

          <div className="profile-visual-section">
            <h3>Foto de Perfil, Tema e Capa</h3>
            <p className="panel-note">
              Envie sua foto de perfil, escolha a paleta de destaque e personalize a capa de fundo com uma das suas obras favoritas.
            </p>

            <div className="avatar-picker-row">
              <div className="avatar-picker-preview" aria-hidden="true">
                {avatarUrl.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl.trim()} alt="" />
                ) : (
                  avatarInitial
                )}
              </div>
              <div className="avatar-picker-actions">
                <label className="secondary-button" style={{ cursor: "pointer", minHeight: "40px" }}>
                  Escolher foto do dispositivo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleAvatarUpload(e)}
                    style={{ display: "none" }}
                  />
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    className="filter-chip"
                    onClick={() => setAvatarUrl("")}
                  >
                    Remover foto
                  </button>
                )}
              </div>
            </div>

            <label>
              Ou cole o link de uma foto de perfil (opcional)
              <input
                type="url"
                value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
                maxLength={500}
                placeholder="https://exemplo.com/minha-foto.jpg"
                onChange={(event) => setAvatarUrl(event.target.value)}
              />
            </label>

            <div className="theme-selector" role="radiogroup" aria-label="Tema do perfil">
              {THEMES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={theme === item.id}
                  className={`theme-pill${theme === item.id ? " is-active" : ""}`}
                  onClick={() => setTheme(item.id)}
                >
                  <span className="theme-swatch" style={{ background: item.color }} aria-hidden="true" />
                  {item.label}
                </button>
              ))}
            </div>

            {mediaOptions.length > 0 && (
              <div className="banner-picker-block">
                <div className="label-row">
                  <span className="banner-picker-title">Escolher capa de fundo a partir das suas obras</span>
                  {bannerUrl && (
                    <button type="button" className="synopsis-toggle" onClick={() => setBannerUrl("")}>
                      Usar fundo automático
                    </button>
                  )}
                </div>
                <div className="banner-picker-grid">
                  {mediaOptions.map((item) => {
                    const cover = item.coverUrl!;
                    const selected = bannerUrl === cover;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`banner-thumb${selected ? " is-selected" : ""}`}
                        onClick={() => setBannerUrl(cover)}
                        title={`Usar "${item.title}" como fundo do perfil`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cover} alt={item.title} />
                        <span>{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <label>
              URL de capa personalizada (opcional)
              <input
                type="url"
                value={bannerUrl}
                maxLength={500}
                placeholder="https://exemplo.com/minha-capa.jpg (ou selecione uma obra acima)"
                onChange={(event) => setBannerUrl(event.target.value)}
              />
              <small>Deixe em branco para usar automaticamente a arte da sua obra favorita.</small>
            </label>
          </div>

          <div className="profile-privacy-card">
            <div className="profile-privacy-copy">
              <strong>Visibilidade do perfil ({isPublic ? "Público" : "Privado"})</strong>
              <p>
                {isPublic
                  ? "Qualquer pessoa pode visitar seu perfil público e ver seus favoritos, contadores e atividade recente."
                  : "Seu perfil está fechado. Outras pessoas não poderão ver sua lista, favoritos ou atividades."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              aria-label="Perfil público (outras pessoas veem sua lista e atividade)"
              className={`profile-switch${isPublic ? " is-on" : ""}`}
              onClick={() => setIsPublic((current) => !current)}
            >
              <span className="profile-switch-thumb" />
            </button>
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          {saved && (
            <p className="auth-notice" role="status">
              Perfil salvo com sucesso! <Link href={`/u/${saved}`}>Ver meu perfil público</Link>
            </p>
          )}

          <div className="auth-actions">
            <UiButton type="submit" disabled={saving || !usernameValid}>
              {saving ? "Salvando…" : "Salvar alterações do perfil"}
            </UiButton>
          </div>
        </form>
      </UiCard>
    </div>
  );
}
