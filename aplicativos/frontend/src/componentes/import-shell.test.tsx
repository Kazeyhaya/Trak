// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportTask } from "../lib/api";
import * as api from "../lib/api";
import { ImportShell } from "./import-shell";

vi.mock("../contextos/auth-context", () => ({
  useAuth: () => ({
    profile: { importedSources: [], hasImported: false },
    refreshProfile: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock("./site-header", () => ({
  SiteHeader: () => <header data-testid="site-header" />
}));

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    getImportTasks: vi.fn(),
    getImportTask: vi.fn(),
    importLetterboxd: vi.fn(),
    importTrakt: vi.fn(),
    importSteam: vi.fn()
  };
});

describe("ImportShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("retoma ao montar se houver uma tarefa PROCESSANDO", async () => {
    const tarefaProcessando: ImportTask = {
      id: "tarefa-1",
      fonte: "trakt",
      chave: "trakt",
      status: "PROCESSANDO",
      total: 80,
      processados: 20,
      resultado: null,
      erro: null,
      createdAt: "2026-11-07T08:00:00Z"
    };

    vi.mocked(api.getImportTasks).mockResolvedValue([tarefaProcessando]);
    vi.mocked(api.getImportTask).mockResolvedValue(tarefaProcessando);

    render(<ImportShell />);

    const statusEl = await screen.findByRole("status");
    expect(statusEl.textContent).toContain("Importando do Trakt: 20 de 80 itens.");
  });

  it("atualiza progresso com timers falsos e mostra resultado de conclusao", async () => {
    vi.useFakeTimers();

    const tarefaInicial: ImportTask = {
      id: "tarefa-2",
      fonte: "letterboxd",
      chave: "letterboxd",
      status: "PROCESSANDO",
      total: 100,
      processados: 10,
      resultado: null,
      erro: null,
      createdAt: "2026-11-07T08:00:00Z"
    };

    const tarefaMetade: ImportTask = {
      ...tarefaInicial,
      processados: 60
    };

    const tarefaConcluida: ImportTask = {
      ...tarefaInicial,
      status: "CONCLUIDA",
      processados: 100,
      resultado: {
        total: 100,
        imported: 95,
        skipped: 5,
        notFound: ["Filme Desconhecido"]
      }
    };

    vi.mocked(api.getImportTasks).mockResolvedValue([tarefaInicial]);
    vi.mocked(api.getImportTask)
      .mockResolvedValueOnce(tarefaMetade)
      .mockResolvedValueOnce(tarefaConcluida);

    render(<ImportShell />);

    // Resolve a montagem inicial
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const statusInicial = screen.getByRole("status");
    expect(statusInicial.textContent).toContain("Importando do Letterboxd: 10 de 100 itens.");

    // Avanca 2000ms para disparar o primeiro ciclo do setInterval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.getByRole("status").textContent).toContain("Importando do Letterboxd: 60 de 100 itens.");

    // Avanca mais 2000ms para concluir
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    const statusFinal = screen.getByRole("status");
    expect(statusFinal.textContent).toContain("Importação concluída: 95 de 100 itens adicionados.");
    expect(screen.getByText(/5 já estavam no seu Trak/)).toBeTruthy();
    expect(screen.getByText("1 não encontrados")).toBeTruthy();
  });

  it("mostra mensagem de erro quando a tarefa falhou", async () => {
    vi.useFakeTimers();

    const tarefaProcessando: ImportTask = {
      id: "tarefa-3",
      fonte: "steam",
      chave: "steam",
      status: "PROCESSANDO",
      total: 10,
      processados: 2,
      resultado: null,
      erro: null,
      createdAt: "2026-11-07T08:00:00Z"
    };

    const tarefaFalha: ImportTask = {
      ...tarefaProcessando,
      status: "FALHOU",
      erro: "Perfil Steam privado ou não encontrado."
    };

    vi.mocked(api.getImportTasks).mockResolvedValue([tarefaProcessando]);
    vi.mocked(api.getImportTask).mockResolvedValue(tarefaFalha);

    render(<ImportShell />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByRole("status").textContent).toContain("Importando do Steam: 2 de 10 itens.");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    const alertEl = screen.getByRole("alert");
    expect(alertEl.textContent).toContain("Perfil Steam privado ou não encontrado.");
  });
});
