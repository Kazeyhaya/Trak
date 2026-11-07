"use client";

import { ReactNode, useEffect, useRef } from "react";

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type UiModalProps = {
  onClose: () => void;
  // id do titulo visivel dentro do modal; sem titulo visivel, use `rotulo`.
  tituloId?: string;
  rotulo?: string;
  overlayClassName?: string;
  className?: string;
  children: ReactNode;
};

// Janela modal: fecha com Esc ou clique fora, prende o Tab dentro dela, trava a rolagem
// da pagina e devolve o foco a quem a abriu. Renderize so enquanto estiver aberta.
export function UiModal({
  onClose,
  tituloId,
  rotulo,
  overlayClassName = "cover-modal-overlay",
  className = "cover-modal-card",
  children
}: UiModalProps) {
  const cartao = useRef<HTMLDivElement>(null);
  // O pai costuma passar uma funcao nova a cada render; a ref evita refazer os listeners.
  const fechar = useRef(onClose);
  useEffect(() => {
    fechar.current = onClose;
  });

  useEffect(() => {
    const dialogo = cartao.current;
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogo?.focus();

    function aoTeclar(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        fechar.current();
        return;
      }
      if (event.key !== "Tab" || !dialogo) {
        return;
      }
      const focaveis = Array.from(dialogo.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
        (el) => !el.closest("[hidden], [inert]")
      );
      if (focaveis.length === 0) {
        event.preventDefault();
        dialogo.focus();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const ativo = document.activeElement;
      if (!dialogo.contains(ativo)) {
        event.preventDefault();
        primeiro.focus();
      } else if (event.shiftKey && (ativo === primeiro || ativo === dialogo)) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && ativo === ultimo) {
        event.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = rolagem;
      anterior?.focus();
    };
  }, []);

  return (
    <div
      className={overlayClassName}
      // mousedown, e nao click: arrastar uma selecao de texto para fora nao fecha o modal.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          fechar.current();
        }
      }}
    >
      <div
        ref={cartao}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-label={tituloId ? undefined : rotulo}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
