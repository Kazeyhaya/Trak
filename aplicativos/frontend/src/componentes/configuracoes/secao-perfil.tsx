"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { RodapeSecao } from "./rodape-secao";
import { useSecaoSalvavel } from "./usar-secao";
import { useAuth } from "../../contextos/auth-context";
import { Profile, saveMyProfile } from "../../lib/api";
import { problemaUsername } from "../../lib/perfil";

type Props = { profile: Profile | null; onAlterado: (alterado: boolean) => void };

// Nome de usuario, nome de exibicao e bio.
export function SecaoPerfil({ profile, onAlterado }: Props) {
  const { refreshProfile } = useAuth();
  const router = useRouter();
  const secao = useSecaoSalvavel({
    username: profile?.username ?? "",
    displayName: profile?.displayName ?? "",
    bio: profile?.bio ?? ""
  });
  const { valores, alterar, alterado } = secao;
  const usuario = valores.username.trim().toLowerCase();
  const problema = usuario ? problemaUsername(usuario) : "Escolha um nome de usuário.";

  useEffect(() => onAlterado(alterado), [alterado, onAlterado]);

  function salvar() {
    void secao.salvar(async (alteracoes) => {
      const usernameMudou = alteracoes.username !== undefined;
      await saveMyProfile({
        ...alteracoes,
        ...(usernameMudou ? { username: usuario } : {})
      });
      await refreshProfile();
      if (usernameMudou) {
        router.refresh();
      }
    }, profile ? "Perfil salvo." : "Perfil criado. Agora você pode ajustar as outras seções.");
  }

  return (
    <section className="config-secao" aria-labelledby="config-perfil-titulo">
      <header className="config-secao-cabecalho">
        <h2 id="config-perfil-titulo">Perfil</h2>
        <p>Como as pessoas encontram e reconhecem você no Trak.</p>
      </header>

      <div className="field-stack">
        <div className="profile-form-grid">
          <label>
            Nome de usuário
            <input
              value={valores.username}
              maxLength={20}
              autoCapitalize="none"
              autoComplete="off"
              name="trak-handle"
              spellCheck={false}
              placeholder="seu_nome"
              onChange={(event) => alterar({ username: event.target.value })}
              aria-invalid={Boolean(valores.username) && problema !== null}
              aria-describedby="config-username-ajuda"
            />
            <small id="config-username-ajuda">
              3 a 20 caracteres: letras minúsculas, números ou _. Seu perfil fica em /u/{usuario || "seu_nome"}.
            </small>
            {valores.username !== "" && problema && (
              <span className="field-error" role="alert">
                {problema}
              </span>
            )}
          </label>

          <label>
            Nome de exibição
            <input
              value={valores.displayName}
              maxLength={50}
              placeholder="Como você quer ser chamado"
              onChange={(event) => alterar({ displayName: event.target.value })}
            />
            <small>Aparece em destaque no topo do seu perfil.</small>
          </label>
        </div>

        <label>
          <span className="label-row">
            <span>Bio</span>
            <small>{valores.bio.length}/280</small>
          </span>
          <textarea
            value={valores.bio}
            maxLength={280}
            rows={3}
            placeholder="O que você anda assistindo, jogando ou lendo, e do que mais gosta."
            onChange={(event) => alterar({ bio: event.target.value })}
          />
        </label>
      </div>

      <RodapeSecao
        alterado={alterado}
        salvando={secao.salvando}
        erro={secao.erro}
        aviso={secao.aviso}
        bloqueio={problema}
        onSalvar={salvar}
        onDescartar={secao.descartar}
      />
    </section>
  );
}
