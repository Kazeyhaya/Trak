"use client";

import { UiButton } from "../ui-button";

type RodapeSecaoProps = {
  alterado: boolean;
  salvando: boolean;
  erro: string | null;
  aviso: string | null;
  // Motivo para nao poder salvar (ex.: falta escolher o nome de usuario).
  bloqueio?: string | null;
  onSalvar: () => void;
  onDescartar: () => void;
};

// Mensagens e botoes de uma secao. Fica preso ao pe da tela enquanto ha alteracoes.
export function RodapeSecao({ alterado, salvando, erro, aviso, bloqueio, onSalvar, onDescartar }: RodapeSecaoProps) {
  return (
    <div className={`config-rodape${alterado ? " is-alterado" : ""}`}>
      <div className="config-rodape-mensagens">
        {erro && (
          <p className="auth-error" role="alert">
            {erro}
          </p>
        )}
        {!erro && bloqueio && alterado && <p className="panel-note">{bloqueio}</p>}
        {!erro && aviso && !alterado && (
          <p className="auth-notice" role="status">
            {aviso}
          </p>
        )}
        {!erro && alterado && !bloqueio && <p className="panel-note">Alterações não salvas.</p>}
      </div>
      <div className="config-rodape-acoes">
        {alterado && (
          <UiButton variant="secondary" onClick={onDescartar} disabled={salvando}>
            Descartar
          </UiButton>
        )}
        <UiButton onClick={onSalvar} disabled={!alterado || salvando || Boolean(bloqueio)}>
          {salvando ? "Salvando…" : "Salvar"}
        </UiButton>
      </div>
    </div>
  );
}
