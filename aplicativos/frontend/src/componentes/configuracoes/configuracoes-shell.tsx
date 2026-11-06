"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SecaoAparencia } from "./secao-aparencia";
import { SecaoConta } from "./secao-conta";
import { SecaoPerfil } from "./secao-perfil";
import { SecaoPrivacidade } from "./secao-privacidade";
import { SiteHeader } from "../site-header";
import { UiButton } from "../ui-button";
import { useAuth } from "../../contextos/auth-context";
import { Secao, SECOES } from "../../lib/configuracoes";

const NENHUMA_PENDENTE: Record<Secao, boolean> = { perfil: false, aparencia: false, privacidade: false, conta: false };

// Pagina de configuracoes: menu de secoes e uma secao por vez. As secoes ficam montadas
// (so escondidas), entao trocar de secao nao perde o que ainda nao foi salvo.
export function ConfiguracoesShell({ secaoInicial }: { secaoInicial: Secao }) {
  const { profile } = useAuth();
  const router = useRouter();
  // Sem perfil ainda, as outras secoes avisam que e preciso escolher o nome de usuario.
  const [ativa, setAtiva] = useState<Secao>(secaoInicial);
  const [pendentes, setPendentes] = useState(NENHUMA_PENDENTE);
  const algumaPendente = Object.values(pendentes).some(Boolean);

  const avisarAlteracao = useMemo(
    () =>
      Object.fromEntries(
        SECOES.map(({ id }) => [
          id,
          (alterado: boolean) => setPendentes((atual) => (atual[id] === alterado ? atual : { ...atual, [id]: alterado }))
        ])
      ) as Record<Secao, (alterado: boolean) => void>,
    []
  );

  useEffect(() => {
    if (!algumaPendente) {
      return;
    }
    const avisar = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [algumaPendente]);

  function abrir(secao: Secao) {
    setAtiva(secao);
    router.replace(`/configuracoes?secao=${secao}`, { scroll: false });
  }

  // Remonta as secoes quando o perfil passa a existir (criado agora ou terminou de carregar).
  const chave = profile ? "com-perfil" : "sem-perfil";

  return (
    <main className="content-shell">
      <SiteHeader />
      <section className="content-hero config-hero">
        <div>
          <h1>Configurações</h1>
          <p>{profile ? "Seu perfil, aparência, privacidade e conta." : "Escolha um nome de usuário para criar seu perfil."}</p>
        </div>
        <div className="item-next-actions">
          {profile && !profile.hasImported && (
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

      <div className="config-layout">
        <nav className="config-menu" aria-label="Seções das configurações">
          {SECOES.map(({ id, rotulo }) => (
            <button
              key={id}
              type="button"
              className={`config-menu-item${ativa === id ? " is-active" : ""}`}
              aria-current={ativa === id ? "page" : undefined}
              onClick={() => abrir(id)}
            >
              {rotulo}
              {pendentes[id] && (
                <span className="config-menu-pendente" title="Alterações não salvas">
                  <span className="sr-only">(alterações não salvas)</span>
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="config-conteudo" key={chave}>
          <div hidden={ativa !== "perfil"}>
            <SecaoPerfil profile={profile} onAlterado={avisarAlteracao.perfil} />
          </div>
          <div hidden={ativa !== "aparencia"}>
            <SecaoAparencia profile={profile} onAlterado={avisarAlteracao.aparencia} />
          </div>
          <div hidden={ativa !== "privacidade"}>
            <SecaoPrivacidade profile={profile} onAlterado={avisarAlteracao.privacidade} />
          </div>
          <div hidden={ativa !== "conta"}>
            <SecaoConta />
          </div>
        </div>
      </div>
    </main>
  );
}
