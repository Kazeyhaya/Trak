import { calcularProgresso, normalizarAlteracao, statusAposEpisodios } from "./tracking.regras";

describe("calcularProgresso", () => {
  it("calcula a porcentagem arredondada", () => {
    expect(calcularProgresso(1, 3)).toBe(33);
    expect(calcularProgresso(2, 3)).toBe(67);
    expect(calcularProgresso(10, 10)).toBe(100);
  });

  it("nunca passa de 100 nem divide por zero", () => {
    expect(calcularProgresso(12, 10)).toBe(100);
    expect(calcularProgresso(5, 0)).toBe(0);
  });
});

describe("statusAposEpisodios", () => {
  it("conclui ao chegar em 100%", () => {
    expect(statusAposEpisodios("PAUSED", 100)).toBe("COMPLETED");
    expect(statusAposEpisodios(undefined, 100)).toBe("COMPLETED");
  });

  it("mantem pausado e abandonado", () => {
    expect(statusAposEpisodios("PAUSED", 50)).toBe("PAUSED");
    expect(statusAposEpisodios("DROPPED", 50)).toBe("DROPPED");
  });

  it("marca como assistindo quando ha progresso", () => {
    expect(statusAposEpisodios("WANT", 10)).toBe("WATCHING");
    expect(statusAposEpisodios("COMPLETED", 90)).toBe("WATCHING");
  });

  it("sem progresso mantem o status atual", () => {
    expect(statusAposEpisodios("WATCHING", 0)).toBe("WATCHING");
    expect(statusAposEpisodios(undefined, 0)).toBe("WANT");
  });
});

describe("normalizarAlteracao", () => {
  it("concluir sem progresso informado leva a 100%", () => {
    expect(normalizarAlteracao({ status: "COMPLETED" })).toEqual({ status: "COMPLETED", progress: 100 });
  });

  it("respeita o progresso informado", () => {
    expect(normalizarAlteracao({ status: "COMPLETED", progress: 80 })).toEqual({ status: "COMPLETED", progress: 80 });
    expect(normalizarAlteracao({ status: "WATCHING" })).toEqual({ status: "WATCHING" });
  });
});
