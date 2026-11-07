// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommentEntry, Pagina } from "../lib/api";
import * as api from "../lib/api";
import { CommentsSection } from "./comments-section";

vi.mock("../contextos/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-123" },
    loading: false
  })
}));

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    getComments: vi.fn(),
    createComment: vi.fn(),
    deleteComment: vi.fn(),
    setCommentLike: vi.fn(),
    reportComment: vi.fn()
  };
});

describe("CommentsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it('"carregar mais" junta a página seguinte sem repetir itens', async () => {
    const pagina1: Pagina<CommentEntry> = {
      items: [
        {
          id: "com-1",
          userId: "u1",
          mediaItemId: "obra-1",
          content: "Primeiro comentário aqui",
          createdAt: "2026-11-01T10:00:00Z",
          user: { username: "ana", displayName: "Ana" },
          likesCount: 1,
          likedByUser: false,
          isOwn: false
        },
        {
          id: "com-2",
          userId: "u2",
          mediaItemId: "obra-1",
          content: "Segundo comentário interessante",
          createdAt: "2026-11-01T11:00:00Z",
          user: { username: "beto", displayName: "Beto" },
          likesCount: 0,
          likedByUser: false,
          isOwn: false
        }
      ],
      proximo: "cursor-pag-2"
    };

    const pagina2: Pagina<CommentEntry> = {
      items: [
        // com-2 repete propositalmente para testar deduplicacao
        {
          id: "com-2",
          userId: "u2",
          mediaItemId: "obra-1",
          content: "Segundo comentário interessante",
          createdAt: "2026-11-01T11:00:00Z",
          user: { username: "beto", displayName: "Beto" },
          likesCount: 0,
          likedByUser: false,
          isOwn: false
        },
        {
          id: "com-3",
          userId: "u3",
          mediaItemId: "obra-1",
          content: "Terceiro comentário adicional",
          createdAt: "2026-11-01T12:00:00Z",
          user: { username: "carlos", displayName: "Carlos" },
          likesCount: 3,
          likedByUser: true,
          isOwn: false
        }
      ],
      proximo: null
    };

    vi.mocked(api.getComments)
      .mockResolvedValueOnce(pagina1)
      .mockResolvedValueOnce(pagina2);

    render(<CommentsSection mediaItemId="obra-1" />);

    // Aguarda carregar pagina 1
    expect(await screen.findByText("Primeiro comentário aqui")).toBeTruthy();
    expect(screen.getByText("Segundo comentário interessante")).toBeTruthy();

    const botaoMais = screen.getByRole("button", { name: "Ver comentários mais antigos" });
    fireEvent.click(botaoMais);

    // Aguarda carregar pagina 2
    expect(await screen.findByText("Terceiro comentário adicional")).toBeTruthy();

    // Garante deduplicação: nenhum comentário repete
    expect(screen.getAllByText("Primeiro comentário aqui")).toHaveLength(1);
    expect(screen.getAllByText("Segundo comentário interessante")).toHaveLength(1);
    expect(screen.getAllByText("Terceiro comentário adicional")).toHaveLength(1);

    // Botao de carregar mais some pois proximo e null
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Ver comentários mais antigos" })).toBeNull();
    });
  });
});
