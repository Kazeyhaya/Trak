"use client";

import Link from "next/link";
import { useAuth } from "../contextos/auth-context";
import { UiBadge } from "./ui-badge";

const navItems = [
  { label: "Início", href: "/" },
  { label: "Catálogo", href: "/catalogo" },
  { label: "Painel", href: "/painel" }
];

export function SiteHeader() {
  const { user, signOut } = useAuth();

  return (
    <header className="site-header">
      <Link className="brand-mark" href="/" aria-label="Trak, voltar ao início">
        <span className="brand-orb" aria-hidden="true" />
        <span className="brand-copy">
          <strong>Trak</strong>
          <UiBadge tone="primary">alpha</UiBadge>
        </span>
      </Link>

      <nav className="site-nav" aria-label="Navegação principal">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>

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