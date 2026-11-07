// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", async (original) => ({
  ...(await original<typeof import("../lib/api")>()),
  getMediaCredits: vi.fn().mockResolvedValue([]),
  getEpisodeCredits: vi.fn().mockResolvedValue([])
}));

import { PantheonModal } from "./pantheon-modal";
import { ApiError } from "../lib/api";

afterEach(cleanup);

function abrir(onSave: (nome: string | null, avatar: string | null) => Promise<void>, onClose = vi.fn()) {
  render(
    <PantheonModal
      isOpen
      onClose={onClose}
      mediaItemId="tmdb_series_1396"
      itemTitle="Breaking Bad"
      currentFavoriteName="Jesse Pinkman"
      currentFavoriteAvatar={null}
      onSave={onSave}
    />
  );
  return onClose;
}

describe("PantheonModal", () => {
  it("mostra o erro e continua aberto quando salvar falha", async () => {
    const onClose = abrir(() => Promise.reject(new ApiError("Nome de personagem muito longo.", 400)));
    fireEvent.click(screen.getByText("Confirmar coroação"));

    expect((await screen.findByRole("alert")).textContent).toContain("Nome de personagem muito longo.");
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("Confirmar coroação")).toHaveProperty("disabled", false));
  });

  it("salva o nome digitado sem avatar e fecha", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = abrir(onSave);
    fireEvent.change(screen.getByLabelText("Ou digite o nome de outro personagem"), {
      target: { value: "Saul Goodman" }
    });
    fireEvent.click(screen.getByText("Confirmar coroação"));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith("Saul Goodman", null);
  });
});
