"use client";

import { useState } from "react";

import { errorMessage } from "../../lib/api";
import { camposAlterados } from "../../lib/configuracoes";

// Estado de uma secao das configuracoes: rascunho, o que esta salvo e o envio so do
// que mudou. Um erro mantem o rascunho, para a pessoa tentar de novo sem redigitar.
export function useSecaoSalvavel<T extends Record<string, unknown>>(inicial: T) {
  const [salvo, setSalvo] = useState(inicial);
  const [valores, setValores] = useState(inicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const alteracoes = camposAlterados(salvo, valores);
  const alterado = Object.keys(alteracoes).length > 0;

  function alterar(patch: Partial<T>) {
    setValores((atual) => ({ ...atual, ...patch }));
    setAviso(null);
  }

  async function salvar(enviar: (alteracoes: Partial<T>, valores: T) => Promise<void>, mensagem = "Alterações salvas.") {
    if (!alterado || salvando) {
      return;
    }
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      await enviar(alteracoes, valores);
      setSalvo(valores);
      setAviso(mensagem);
    } catch (err) {
      setErro(errorMessage(err));
    } finally {
      setSalvando(false);
    }
  }

  function descartar() {
    setValores(salvo);
    setErro(null);
    setAviso(null);
  }

  return { valores, alterar, alterado, salvar, salvando, erro, setErro, aviso, descartar };
}
