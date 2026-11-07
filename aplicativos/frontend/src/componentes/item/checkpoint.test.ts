// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getStatusLabel, TRACKING_PAGES_MAX, TRACKING_STATUSES } from "../../lib/api";
import {
  carregarCheckpoint,
  checkpointStorageKey,
  parsePageInput,
  salvarCheckpoint,
  type CheckpointMeta
} from "./checkpoint";

describe("parsePageInput", () => {
  it("extrai numeros e ignora caracteres nao numericos", () => {
    expect(parsePageInput("123")).toBe(123);
    expect(parsePageInput("pág. 450")).toBe(450);
    expect(parsePageInput("  89 ")).toBe(89);
  });

  it("retorna 0 para strings vazias ou sem digitos", () => {
    expect(parsePageInput("")).toBe(0);
    expect(parsePageInput("abc")).toBe(0);
    expect(parsePageInput("-")).toBe(0);
  });

  it("limita ao maximo permitido de paginas", () => {
    expect(parsePageInput("999999")).toBe(TRACKING_PAGES_MAX);
    expect(parsePageInput(String(TRACKING_PAGES_MAX + 100))).toBe(TRACKING_PAGES_MAX);
  });
});

describe("checkpoint no localStorage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("retorna defaults quando nao ha dados salvos", () => {
    const meta = carregarCheckpoint("media-1", 400);
    expect(meta).toEqual({
      hoursPlayed: 0,
      platform: "PC / Steam",
      platinum: false,
      currentPage: 0,
      totalPages: 400
    });
  });

  it("salva e recupera dados do checkpoint", () => {
    const dados: CheckpointMeta = {
      hoursPlayed: 25,
      platform: "PlayStation",
      platinum: true,
      currentPage: 150,
      totalPages: 300
    };

    salvarCheckpoint("media-1", dados);
    expect(window.localStorage.getItem(checkpointStorageKey("media-1"))).toBe(JSON.stringify(dados));

    const recuperado = carregarCheckpoint("media-1");
    expect(recuperado).toEqual(dados);
  });
});

describe("getStatusLabel", () => {
  it("retorna rotulo valido para todos os status", () => {
    for (const st of TRACKING_STATUSES) {
      expect(getStatusLabel(st)).toBeTruthy();
    }
  });

  it("adapta texto conforme o tipo de midia", () => {
    expect(getStatusLabel("COMPLETED", "GAME")).toBe("Zerado");
    expect(getStatusLabel("COMPLETED", "BOOK")).toBe("Lido");
    expect(getStatusLabel("COMPLETED", "MOVIE")).toBe("Concluído");
    expect(getStatusLabel("WATCHING", "GAME")).toBe("Jogando");
    expect(getStatusLabel("WATCHING", "BOOK")).toBe("Lendo");
    expect(getStatusLabel("WANT", "GAME")).toBe("Quero jogar");
  });
});
