"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { UiButton } from "../ui-button";
import { traduzirErroAuth, useAuth } from "../../contextos/auth-context";
import { deleteMyAccount, errorMessage } from "../../lib/api";
import { supabase } from "../../lib/supabase-client";

type Estado = { erro: string | null; aviso: string | null; enviando: boolean };
const PARADO: Estado = { erro: null, aviso: null, enviando: false };

// E-mail, senha e exclusao da conta. Cada bloco age na hora (nao entra no "Salvar").
export function SecaoConta() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const [novoEmail, setNovoEmail] = useState("");
  const [email, setEmail] = useState<Estado>(PARADO);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [senha, setSenha] = useState<Estado>(PARADO);

  const [confirmaExclusao, setConfirmaExclusao] = useState("");
  const [exclusao, setExclusao] = useState<Estado>(PARADO);
  const palavraDeConfirmacao = profile?.username ?? "excluir";

  async function trocarEmail(event: React.FormEvent) {
    event.preventDefault();
    const destino = novoEmail.trim().toLowerCase();
    if (!supabase || !destino) {
      return;
    }
    if (destino === user?.email?.toLowerCase()) {
      setEmail({ ...PARADO, erro: "Esse já é o seu e-mail." });
      return;
    }
    setEmail({ ...PARADO, enviando: true });
    const { error } = await supabase.auth.updateUser(
      { email: destino },
      { emailRedirectTo: `${window.location.origin}/configuracoes?secao=conta` }
    );
    if (error) {
      const mensagem = error.message.toLowerCase().includes("already been registered")
        ? "Este e-mail já é usado por outra conta."
        : traduzirErroAuth(error.message);
      setEmail({ ...PARADO, erro: mensagem });
      return;
    }
    setNovoEmail("");
    setEmail({ ...PARADO, aviso: `Enviamos um link para ${destino}. A troca vale depois que você confirmar por lá.` });
  }

  async function trocarSenha(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !user?.email) {
      return;
    }
    if (novaSenha.length < 6) {
      setSenha({ ...PARADO, erro: "A nova senha precisa ter pelo menos 6 caracteres." });
      return;
    }
    if (novaSenha !== confirmacao) {
      setSenha({ ...PARADO, erro: "A confirmação não bate com a nova senha." });
      return;
    }
    setSenha({ ...PARADO, enviando: true });
    // Confere a senha atual antes de trocar: quem pegou o computador aberto nao consegue.
    const conferida = await supabase.auth.signInWithPassword({ email: user.email, password: senhaAtual });
    if (conferida.error) {
      setSenha({ ...PARADO, erro: "A senha atual não confere." });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) {
      setSenha({ ...PARADO, erro: traduzirErroAuth(error.message) });
      return;
    }
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmacao("");
    setSenha({ ...PARADO, aviso: "Senha alterada." });
  }

  async function excluirConta() {
    if (confirmaExclusao.trim().toLowerCase() !== palavraDeConfirmacao) {
      return;
    }
    setExclusao({ ...PARADO, enviando: true });
    try {
      await deleteMyAccount();
      await signOut();
      router.replace("/");
    } catch (err) {
      setExclusao({ ...PARADO, erro: errorMessage(err) });
    }
  }

  return (
    <section className="config-secao" aria-labelledby="config-conta-titulo">
      <header className="config-secao-cabecalho">
        <h2 id="config-conta-titulo">Conta</h2>
        <p>Acesso à sua conta. Estas mudanças valem na hora, sem o botão Salvar.</p>
      </header>

      <form className="config-bloco field-stack" onSubmit={trocarEmail}>
        <h3>E-mail</h3>
        <p className="panel-note">
          Atual: <strong>{user?.email ?? "—"}</strong>
        </p>
        <label>
          Novo e-mail
          <input
            type="email"
            value={novoEmail}
            autoComplete="email"
            placeholder="voce@exemplo.com"
            onChange={(event) => setNovoEmail(event.target.value)}
          />
        </label>
        {email.erro && (
          <p className="auth-error" role="alert">
            {email.erro}
          </p>
        )}
        {email.aviso && (
          <p className="auth-notice" role="status">
            {email.aviso}
          </p>
        )}
        <div>
          <UiButton type="submit" variant="secondary" disabled={email.enviando || !novoEmail.trim()}>
            {email.enviando ? "Enviando…" : "Trocar e-mail"}
          </UiButton>
        </div>
      </form>

      <form className="config-bloco field-stack" onSubmit={trocarSenha}>
        <h3>Senha</h3>
        <label>
          Senha atual
          <input
            type="password"
            value={senhaAtual}
            autoComplete="current-password"
            onChange={(event) => setSenhaAtual(event.target.value)}
          />
        </label>
        <div className="profile-form-grid">
          <label>
            Nova senha
            <input
              type="password"
              value={novaSenha}
              autoComplete="new-password"
              minLength={6}
              onChange={(event) => setNovaSenha(event.target.value)}
            />
            <small>Pelo menos 6 caracteres.</small>
          </label>
          <label>
            Repita a nova senha
            <input
              type="password"
              value={confirmacao}
              autoComplete="new-password"
              onChange={(event) => setConfirmacao(event.target.value)}
            />
          </label>
        </div>
        {senha.erro && (
          <p className="auth-error" role="alert">
            {senha.erro}
          </p>
        )}
        {senha.aviso && (
          <p className="auth-notice" role="status">
            {senha.aviso}
          </p>
        )}
        <div>
          <UiButton type="submit" variant="secondary" disabled={senha.enviando || !senhaAtual || !novaSenha}>
            {senha.enviando ? "Alterando…" : "Trocar senha"}
          </UiButton>
        </div>
      </form>

      <div className="config-bloco config-perigo">
        <h3>Excluir conta</h3>
        <p>
          Apaga sua estante, notas, episódios, favoritos, quem você segue e seus comentários. Não dá para desfazer.
          Comentários que alguém denunciou ficam ocultos, guardados só para a moderação.
        </p>
        <label className="field-stack">
          <span>
            Para confirmar, digite <strong>{palavraDeConfirmacao}</strong>
          </span>
          <input
            value={confirmaExclusao}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setConfirmaExclusao(event.target.value)}
          />
        </label>
        {exclusao.erro && (
          <p className="auth-error" role="alert">
            {exclusao.erro}
          </p>
        )}
        <div>
          <button
            type="button"
            className="config-botao-perigo"
            disabled={exclusao.enviando || confirmaExclusao.trim().toLowerCase() !== palavraDeConfirmacao}
            onClick={() => void excluirConta()}
          >
            {exclusao.enviando ? "Excluindo…" : "Excluir minha conta"}
          </button>
        </div>
      </div>
    </section>
  );
}
