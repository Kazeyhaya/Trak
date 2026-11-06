"use client";

import { SiteHeader } from "./site-header";
import { UiButton } from "./ui-button";
import { UiCard } from "./ui-card";
import { useAuth } from "../contextos/auth-context";

// Ficha de obra +18: so abre para quem liberou conteudo adulto no perfil (data de
// nascimento de 18 anos ou mais e consentimento). Os demais veem este aviso.
export function AdultGate({ adult, children }: { adult?: boolean; children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (!adult || profile?.adultContent) {
    return <>{children}</>;
  }

  return (
    <main className="content-shell">
      <SiteHeader />
      {!loading && (
        <UiCard className="adult-gate">
          <span className="adult-gate-selo">+18</span>
          <h1>Conteúdo adulto</h1>
          <p>
            Esta obra é para maiores de 18 anos e fica oculta por padrão. Para vê-la, informe sua data de nascimento e
            libere o conteúdo +18 no seu perfil.
          </p>
          <div className="adult-gate-acoes">
            {user ? (
              <UiButton href="/configuracoes?secao=privacidade">Abrir configurações</UiButton>
            ) : (
              <UiButton href="/entrar?next=%2Fconfiguracoes%3Fsecao%3Dprivacidade">Entrar para liberar</UiButton>
            )}
            <UiButton href="/catalogo" variant="secondary">
              Voltar ao catálogo
            </UiButton>
          </div>
        </UiCard>
      )}
    </main>
  );
}
