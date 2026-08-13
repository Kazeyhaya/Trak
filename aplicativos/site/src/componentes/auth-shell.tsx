"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../contextos/auth-context";
import { UiBadge } from "./ui-badge";
import { UiButton } from "./ui-button";

const benefits = [
  "Sessão persistida com Supabase Auth.",
  "Token guardado automaticamente para chamadas à API.",
  "Login e logout integrados ao painel e ao catálogo."
];

export function AuthShell() {
  const { signIn, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return (
      <main className="auth-shell">
        <section className="auth-hero">
          <div className="auth-hero-copy">
            <UiBadge tone="primary">Sessão ativa</UiBadge>
            <h1>Você já está conectado.</h1>
            <p>{user.email}</p>
          </div>
          <aside className="auth-card">
            <div className="panel-header">
              <span className="panel-title">Conta</span>
              <UiBadge tone="secondary">Logado</UiBadge>
            </div>
            <div className="auth-actions">
              <UiButton href="/painel">Ir para o painel</UiButton>
              <UiButton href="/catalogo" variant="secondary">Ver catálogo</UiButton>
            </div>
          </aside>
        </section>
      </main>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);

    if (signInError) {
      setError(signInError);
    } else {
      router.push("/painel");
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="auth-hero-copy">
          <UiBadge tone="primary">Entrar no Trak</UiBadge>
          <h1>Um acesso simples para abrir o restante da experiência.</h1>
          <p>Sessão real com Supabase. Tracking e painel ficam disponíveis após o login.</p>

          <ul className="auth-benefits">
            {benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </div>

        <aside className="auth-card">
          <div className="panel-header">
            <span className="panel-title">Acesso</span>
            <UiBadge tone="secondary">Supabase</UiBadge>
          </div>

          <form className="field-stack" onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Senha
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {error && <p className="auth-error">{error}</p>}

            <div className="auth-actions">
              <UiButton>
                {loading ? "Entrando..." : "Continuar"}
              </UiButton>
              <UiButton href="/" variant="secondary">
                Voltar ao início
              </UiButton>
            </div>
          </form>
        </aside>
      </section>
    </main>
  );
}