"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../contextos/auth-context";
import { useI18n } from "../contextos/i18n-context";

export function BottomNav() {
  const { user, profile, loading } = useAuth();
  const { t } = useI18n();
  const pathname = usePathname();

  // Em telas de login/cadastro não exibe a barra inferior
  if (pathname === "/entrar") {
    return null;
  }

  const isHome = pathname === "/";
  const isCatalogo = pathname.startsWith("/catalogo") || pathname.startsWith("/itens/");
  const isFeed = pathname.startsWith("/feed");
  const isRecomendacoes = pathname.startsWith("/recomendacoes");
  const isProfile = pathname.startsWith("/u/") || pathname.startsWith("/perfil");

  const avatarInitial = (
    profile?.displayName ||
    profile?.username ||
    user?.email ||
    "U"
  )
    .charAt(0)
    .toUpperCase();

  return (
    <nav className="bottom-nav" aria-label="Navegação móvel">
      <div className="bottom-nav-inner">
        <Link
          href="/"
          className={`bottom-nav-item${isHome ? " is-active" : ""}`}
          aria-current={isHome ? "page" : undefined}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Início</span>
        </Link>

        <Link
          href="/catalogo"
          className={`bottom-nav-item${isCatalogo ? " is-active" : ""}`}
          aria-current={isCatalogo ? "page" : undefined}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>{t("nav.catalog", "Catálogo")}</span>
        </Link>

        {loading ? null : user ? (
          <>
            <Link
              href="/feed"
              className={`bottom-nav-item${isFeed ? " is-active" : ""}`}
              aria-current={isFeed ? "page" : undefined}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>{t("nav.feed", "Feed")}</span>
            </Link>

            <Link
              href="/recomendacoes"
              className={`bottom-nav-item${isRecomendacoes ? " is-active" : ""}`}
              aria-current={isRecomendacoes ? "page" : undefined}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span>{t("nav.forYou", "Para você")}</span>
            </Link>

            <Link
              href={profile ? `/u/${profile.username}` : "/perfil"}
              className={`bottom-nav-item${isProfile ? " is-active" : ""}`}
              aria-current={isProfile ? "page" : undefined}
            >
              <div className="bottom-nav-avatar">
                {profile?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatarUrl} alt="" />
                ) : (
                  <span>{avatarInitial}</span>
                )}
              </div>
              <span>Estante</span>
            </Link>
          </>
        ) : (
          <Link
            href="/entrar"
            className="bottom-nav-item"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>{t("nav.signIn", "Entrar")}</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
