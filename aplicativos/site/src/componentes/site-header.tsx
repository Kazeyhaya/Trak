"use client";

import Link from "next/link";
import { useAuth } from "../contextos/auth-context";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navItems = user
    ? [
        { label: "Catálogo", href: "/catalogo" },
        { label: "Painel", href: "/painel" }
      ]
    : [];

  return (
    <header className="site-header">
      <Link className="brand-mark" href="/" aria-label="Trak, voltar ao início">
        <span className="brand-orb" aria-hidden="true" />
        <span className="brand-copy">
          <strong>Trak</strong>
        </span>
      </Link>

      {navItems.length > 0 && (
        <nav className="site-nav" aria-label="Navegação principal">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      {user ? (
        <div className="header-user">
          <span className="header-user-email">{user.email}</span>
          <button type="button" className="header-cta" onClick={() => void signOut()}>
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