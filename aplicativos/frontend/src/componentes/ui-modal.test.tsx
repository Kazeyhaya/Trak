// @vitest-environment jsdom
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UiModal } from "./ui-modal";

afterEach(cleanup);

function ModalDeTeste({ onClose }: { onClose: () => void }) {
  return (
    <UiModal onClose={onClose} tituloId="titulo">
      <h3 id="titulo">Capa personalizada</h3>
      <button type="button">Primeiro</button>
      <input aria-label="Link da capa" />
      <button type="button">Último</button>
    </UiModal>
  );
}

// Botao que abre o modal, para conferir a volta do foco ao fechar.
function Pagina() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)}>
        Abrir
      </button>
      {aberto && <ModalDeTeste onClose={() => setAberto(false)} />}
    </>
  );
}

describe("UiModal", () => {
  it("e um dialogo rotulado pelo titulo e recebe o foco ao abrir", () => {
    render(<ModalDeTeste onClose={() => {}} />);
    const dialogo = screen.getByRole("dialog", { name: "Capa personalizada" });
    expect(dialogo.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(dialogo);
  });

  it("fecha com Esc", () => {
    const onClose = vi.fn();
    render(<ModalDeTeste onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("fecha ao clicar fora, mas nao ao clicar dentro", () => {
    const onClose = vi.fn();
    render(<ModalDeTeste onClose={onClose} />);
    const dialogo = screen.getByRole("dialog");
    fireEvent.mouseDown(screen.getByText("Primeiro"));
    fireEvent.mouseDown(dialogo);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(dialogo.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("prende o Tab dentro do modal, nos dois sentidos", () => {
    render(<ModalDeTeste onClose={() => {}} />);
    const primeiro = screen.getByText("Primeiro");
    const ultimo = screen.getByText("Último");

    ultimo.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(primeiro);

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(ultimo);
  });

  it("trava a rolagem da pagina e, ao fechar, devolve o foco a quem abriu", () => {
    render(<Pagina />);
    const abrir = screen.getByText("Abrir");
    abrir.focus();
    fireEvent.click(abrir);
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(abrir);
  });
});
