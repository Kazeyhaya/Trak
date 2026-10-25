"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../contextos/auth-context";
import { destinoSeguro } from "../lib/rotas";
import { UiButton } from "./ui-button";

export function AuthShell({ next }: { next?: string }) {
  const { signIn, signUp, user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "registro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace(destinoSeguro(next));
    }
  }, [user, next, router]);

  if (user) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    // Validation order for registration
    if (mode === "registro") {
      // Primeiro verifica o tamanho mínimo da senha
      if (password.length < 6) {
        setError("A senha deve ter no mínimo 6 caracteres.");
        return;
      }
      // Depois verifica se as senhas coincidem
      if (password !== passwordConfirmation) {
        setError("As senhas não coincidem");
        return;
      }
    }

    setLoading(true);
    const result = mode === "login"
      ? await signIn(email, password)
      : await signUp(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (mode === "login" || result.hasSession) {
      // refresh faz os Server Components lerem os novos cookies de sessao.
      router.replace(destinoSeguro(next));
      router.refresh();
    } else {
      setNotice("Conta criada. Confira seu e-mail para confirmar o acesso.");
    }
  }
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "registro" && password !== passwordConfirmation) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const result = mode === "login"
      ? await signIn(email, password)
      : await signUp(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (mode === "login" || result.hasSession) {
      // refresh faz os Server Components lerem os novos cookies de sessao.
      router.replace(destinoSeguro(next));
      router.refresh();
    } else {
      setNotice("Conta criada. Confira seu e-mail para confirmar o acesso.");
    }
  }

  function changeMode(nextMode: "login" | "registro") {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="auth-hero-copy">
          <h1>{mode === "login" ? "Continue de onde parou." : "Crie seu espaço no Trak."}</h1>
          <p>Organize o que você quer assistir, jogar ou ler.</p>
        </div>

        <aside className="auth-card">
          <div className="panel-header">
            <span className="panel-title">{mode === "login" ? "Entrar" : "Criar conta"}</span>
          </div>

          <div className="auth-mode-switch" role="group" aria-label="Tipo de acesso">
            <button
              className={mode === "login" ? "auth-mode-button is-active" : "auth-mode-button"}
              type="button"
              onClick={() => changeMode("login")}
            >
              Entrar
            </button>
            <button
              className={mode === "registro" ? "auth-mode-button is-active" : "auth-mode-button"}
              type="button"
              onClick={() => changeMode("registro")}
            >
              Criar conta
            </button>
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
            {mode === "registro" && (
              <label>
                Confirmar senha
                <input
                  type="password"
                  placeholder="••••••••"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  required
                />
              </label>
            )}

            {error && <p className="auth-error">{error}</p>}
            {notice && <p className="auth-notice">{notice}</p>}

            <div className="auth-actions">
              <UiButton type="submit" disabled={loading}>
                {loading ? (mode === "login" ? "Entrando..." : "Criando conta...") : (mode === "login" ? "Entrar" : "Criar conta")}
              </UiButton>
            </div>
          </form>
        </aside>
      </section>
    </main>
  );
}