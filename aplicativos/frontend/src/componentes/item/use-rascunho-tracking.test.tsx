// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, TrackingEntry } from "../../lib/api";
import * as api from "../../lib/api";
import { useRascunhoTracking } from "./use-rascunho-tracking";

afterEach(() => {
  vi.restoreAllMocks();
});

const entryBase: TrackingEntry = {
  id: "track-1",
  mediaItemId: "item-100",
  status: "WATCHING",
  progress: 30,
  rating: 4,
  notes: "Nota inicial",
  updatedAt: "2026-11-01T00:00:00Z"
};

describe("useRascunhoTracking", () => {
  it("inicia sem alteracoes pendentes quando recebe o tracking salvo", () => {
    const { result } = renderHook(() =>
      useRascunhoTracking({ itemId: "item-100", initialTracking: entryBase })
    );

    expect(result.current.alterado).toBe(false);
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.draft.notes).toBe("Nota inicial");
    expect(result.current.draft.rating).toBe(4);
    expect(result.current.draft.progress).toBe(30);
  });

  it("marca alteração ao modificar campos do rascunho", () => {
    const { result } = renderHook(() =>
      useRascunhoTracking({ itemId: "item-100", initialTracking: entryBase })
    );

    act(() => {
      result.current.updateDraft({ notes: "Anotação modificada" });
    });

    expect(result.current.alterado).toBe(true);
    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.draft.notes).toBe("Anotação modificada");
  });

  it("descarta as alteracoes e restaura o rascunho original", () => {
    const { result } = renderHook(() =>
      useRascunhoTracking({ itemId: "item-100", initialTracking: entryBase })
    );

    act(() => {
      result.current.updateDraft({ notes: "Texto temporario", rating: 5 });
    });
    expect(result.current.alterado).toBe(true);

    act(() => {
      result.current.descartar();
    });

    expect(result.current.alterado).toBe(false);
    expect(result.current.draft.notes).toBe("Nota inicial");
    expect(result.current.draft.rating).toBe(4);
  });

  it("mantém o rascunho se salvar falhar", async () => {
    vi.spyOn(api, "saveTrackingItem").mockRejectedValue(
      new ApiError("Erro no servidor ao salvar tracking.", 500)
    );

    const { result } = renderHook(() =>
      useRascunhoTracking({ itemId: "item-100", initialTracking: entryBase })
    );

    act(() => {
      result.current.updateDraft({ notes: "Nova tentativa que vai falhar", rating: 5 });
    });

    expect(result.current.alterado).toBe(true);

    await act(async () => {
      await result.current.salvar();
    });

    // Erro registrado
    expect(result.current.error).toBeTruthy();
    // O rascunho e a marca de alteracao foram mantidos para o usuario nao perder dados
    expect(result.current.alterado).toBe(true);
    expect(result.current.draft.notes).toBe("Nova tentativa que vai falhar");
    expect(result.current.draft.rating).toBe(5);
  });

  it("applyServerProgress atualiza o progresso do servidor sem apagar anotações não salvas", () => {
    const { result } = renderHook(() =>
      useRascunhoTracking({ itemId: "item-100", initialTracking: entryBase })
    );

    act(() => {
      result.current.updateDraft({ notes: "Rascunho de critica pendente" });
    });

    const entryAtualizada: TrackingEntry = {
      ...entryBase,
      progress: 60
    };

    act(() => {
      result.current.applyServerProgress(entryAtualizada);
    });

    expect(result.current.draft.progress).toBe(60);
    expect(result.current.draft.notes).toBe("Rascunho de critica pendente");
    expect(result.current.alterado).toBe(true);
  });
});
