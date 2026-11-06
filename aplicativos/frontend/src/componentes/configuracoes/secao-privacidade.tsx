"use client";

import { useEffect } from "react";

import { RodapeSecao } from "./rodape-secao";
import { useSecaoSalvavel } from "./usar-secao";
import { useAuth } from "../../contextos/auth-context";
import { Profile, saveMyProfile } from "../../lib/api";
import { idadeEm } from "../../lib/configuracoes";

type Props = { profile: Profile | null; onAlterado: (alterado: boolean) => void };

// Quem ve o perfil e o conteudo +18 no catalogo.
export function SecaoPrivacidade({ profile, onAlterado }: Props) {
  const { refreshProfile } = useAuth();
  const secao = useSecaoSalvavel({
    isPublic: profile?.isPublic ?? true,
    birthDate: profile?.birthDate ?? "",
    adultContent: profile?.adultContent ?? false
  });
  const { valores, alterar, alterado } = secao;
  const maiorDeIdade = valores.birthDate ? idadeEm(valores.birthDate) >= 18 : false;
  const adultoLigado = valores.adultContent && maiorDeIdade;

  useEffect(() => onAlterado(alterado), [alterado, onAlterado]);

  function salvar() {
    void secao.salvar(async (alteracoes, todos) => {
      await saveMyProfile({
        ...(alteracoes.isPublic !== undefined ? { isPublic: alteracoes.isPublic } : {}),
        // A data so e enviada quando preenchida (a API nao apaga a data salva).
        ...(alteracoes.birthDate ? { birthDate: alteracoes.birthDate } : {}),
        ...(alteracoes.adultContent !== undefined || alteracoes.birthDate !== undefined
          ? { adultContent: todos.adultContent && maiorDeIdade }
          : {})
      });
      await refreshProfile();
    }, "Privacidade salva.");
  }

  return (
    <section className="config-secao" aria-labelledby="config-privacidade-titulo">
      <header className="config-secao-cabecalho">
        <h2 id="config-privacidade-titulo">Privacidade e conteúdo</h2>
        <p>Quem pode ver o seu perfil e o que aparece para você no catálogo.</p>
      </header>

      <div className="profile-privacy-card">
        <div className="profile-privacy-copy">
          <strong>Perfil {valores.isPublic ? "público" : "privado"}</strong>
          <p>
            {valores.isPublic
              ? "Qualquer pessoa pode ver sua estante, seus favoritos, os números e a atividade recente."
              : "Só você vê sua estante, favoritos e atividades. Quem segue você também deixa de ver seus destaques."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={valores.isPublic}
          aria-label="Perfil público"
          className={`profile-switch${valores.isPublic ? " is-on" : ""}`}
          onClick={() => alterar({ isPublic: !valores.isPublic })}
        >
          <span className="profile-switch-thumb" />
        </button>
      </div>

      <div className="profile-privacy-card profile-adult-card">
        <div className="profile-privacy-copy">
          <strong>Conteúdo +18 {adultoLigado ? "visível" : "oculto"}</strong>
          <p>
            Jogos, filmes e livros adultos ficam fora do catálogo por padrão. Para vê-los, informe sua data de nascimento
            e confirme que tem 18 anos ou mais. A data só aparece para você.
          </p>
          <label className="field-stack profile-adult-date">
            <span className="field-label">Data de nascimento</span>
            <input
              type="date"
              value={valores.birthDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => {
                const data = event.target.value;
                alterar(!data || idadeEm(data) < 18 ? { birthDate: data, adultContent: false } : { birthDate: data });
              }}
            />
          </label>
          {valores.birthDate && !maiorDeIdade && <small>Conteúdo +18 só pode ser liberado para maiores de 18 anos.</small>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={adultoLigado}
          aria-label="Tenho 18 anos ou mais e quero ver conteúdo +18 no catálogo"
          title={maiorDeIdade ? undefined : "Informe uma data de nascimento de 18 anos ou mais"}
          disabled={!maiorDeIdade}
          className={`profile-switch${adultoLigado ? " is-on" : ""}`}
          onClick={() => alterar({ adultContent: !valores.adultContent })}
        >
          <span className="profile-switch-thumb" />
        </button>
      </div>

      <RodapeSecao
        alterado={alterado}
        salvando={secao.salvando}
        erro={secao.erro}
        aviso={secao.aviso}
        bloqueio={profile ? null : "Escolha um nome de usuário na seção Perfil primeiro."}
        onSalvar={salvar}
        onDescartar={secao.descartar}
      />
    </section>
  );
}
