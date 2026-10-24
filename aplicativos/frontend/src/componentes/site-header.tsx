"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../contextos/auth-context";

export function SiteHeader() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/entrar");
    router.refresh();
  }
  const navItems = [
    { label: "Catálogo", href: "/catalogo" },
    ...(user
      ? [
          { label: "Feed", href: "/feed" },
          { label: "Para você", href: "/recomendacoes" },
          ...(isAdmin ? [{ label: "Moderação", href: "/moderacao" }] : [])
        ]
      : [])
  ];

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
            className="header-user-email"
            href={profile ? `/u/${profile.username}` : "/perfil"}
            aria-current={
              pathname.startsWith("/u/") || pathname.startsWith("/perfil") ? "page" : undefined
            }
          >
            {profile ? `@${profile.username}` : "Criar perfil"}
          </Link>
          <button type="button" className="header-cta" onClick={() => void handleSignOut()}>
            Sair
          </button>
        </div>
      ) : (
        <Link className="header-cta" href="/entrar">
          Entrar
        </Link>
      )}
    </header>
  );
}
