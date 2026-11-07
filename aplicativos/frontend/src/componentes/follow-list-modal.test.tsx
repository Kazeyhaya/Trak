// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FollowUser, Pagina } from "../lib/api";
import * as api from "../lib/api";
import { FollowListModal } from "./follow-list-modal";

vi.mock("../contextos/auth-context", () => ({
  useAuth: () => ({
    profile: { username: "me" }
  })
}));

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    getFollowers: vi.fn(),
    getFollowing: vi.fn()
  };
});

describe("FollowListModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('"carregar mais" junta a página seguinte sem repetir itens', async () => {
    const pagina1: Pagina<FollowUser> = {
      items: [
        { userId: "u1", username: "alice", displayName: "Alice Smith", bio: null, avatarUrl: null },
        { userId: "u2", username: "bob", displayName: "Bob Jones", bio: null, avatarUrl: null }
      ],
      proximo: "cursor-pagina-2"
    };

    const pagina2: Pagina<FollowUser> = {
      items: [
        // u2 repete propositalmente para conferir a deduplicacao
        { userId: "u2", username: "bob", displayName: "Bob Jones", bio: null, avatarUrl: null },
        { userId: "u3", username: "carol", displayName: "Carol Danvers", bio: null, avatarUrl: null }
      ],
      proximo: null
    };

    vi.mocked(api.getFollowers)
      .mockResolvedValueOnce(pagina1)
      .mockResolvedValueOnce(pagina2);

    render(
      <FollowListModal
        isOpen
        onClose={vi.fn()}
        username="alvo"
        initialTab="followers"
        followersCount={3}
        followingCount={0}
      />
    );

    // Espera primeira pagina
    expect(await screen.findByText("Alice Smith")).toBeTruthy();
    expect(screen.getByText("Bob Jones")).toBeTruthy();

    const botaoMais = screen.getByRole("button", { name: "Carregar mais" });
    fireEvent.click(botaoMais);

    // Espera item da pagina 2 carregar
    expect(await screen.findByText("Carol Danvers")).toBeTruthy();

    // Garante que Bob Jones aparece exatamente uma vez (sem duplicatas)
    expect(screen.getAllByText("Bob Jones")).toHaveLength(1);
    expect(screen.getAllByText("Alice Smith")).toHaveLength(1);
    expect(screen.getAllByText("Carol Danvers")).toHaveLength(1);

    // Como proximo veio null, o botao de carregar mais nao deve mais existir
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Carregar mais seguidores" })).toBeNull();
    });
  });
});
