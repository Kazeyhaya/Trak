"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../contextos/auth-context";
import { useI18n } from "../contextos/i18n-context";

export function SiteHeader() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/entrar");
    router.refresh();
  }

  const navItems = [
    { label: t("nav.catalog", "Catálogo"), href: "/catalogo" },
    ...(user
      ? [
          { label: t("nav.feed", "Feed"), href: "/feed" },
          { label: t("nav.forYou", "Para você"), href: "/recomendacoes" },
          ...(isAdmin ? [{ label: t("nav.moderation", "Moderação"), href: "/moderacao" }] : [])
        ]
      : [])
  ];

  const avatarInitial = (
    profile?.displayName ||
    profile?.username ||
    user?.email ||
    "U"
  )
    .charAt(0)
    .toUpperCase();
  const isProfilePage = pathname.startsWith("/u/") || pathname.startsWith("/perfil");

  return (
    <header className="site-header">
      <Link className="brand-mark" href="/" aria-label="Trak, voltar ao início">
        <span className="brand-copy">
          <strong>Trak</strong>
        </span>
      </Link>

      <nav className="site-nav" aria-label="Navegação principal">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} aria-current={pathname.startsWith(item.href) ? "page" : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>

      {user ? (
        <div className="header-user">
          <Link
            className={`header-avatar-link${isProfilePage ? " is-active" : ""}`}
            href={profile ? `/u/${profile.username}` : "/perfil"}
            aria-current={isProfilePage ? "page" : undefined}
            aria-label={profile ? `Meu perfil (@${profile.username})` : "Criar perfil"}
            title={profile ? `${profile.displayName || `@${profile.username}`} (@${profile.username})` : "Criar perfil"}
          >
            {profile?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" />
            ) : (
              <span>{avatarInitial}</span>
            )}
          </Link>

          <button
            type="button"
            className="header-logout-btn"
            onClick={() => void handleSignOut()}
            aria-label="Sair da conta"
            title="Sair da conta"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      ) : (
        <Link className="header-cta" href="/entrar">
          {t("nav.signIn", "Entrar")}
        </Link>
      )}
    </header>
  );
}
