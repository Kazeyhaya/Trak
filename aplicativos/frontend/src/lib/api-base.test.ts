import { describe, expect, it } from "vitest";
import { normalizarApiBase } from "./api-base";

describe("normalizarApiBase", () => {
  it.each([
    ["https://trak-9rku.onrender.com", "https://trak-9rku.onrender.com/api"],
    ["https://trak-9rku.onrender.com/", "https://trak-9rku.onrender.com/api"],
    ["https://trak-9rku.onrender.com/api", "https://trak-9rku.onrender.com/api"],
    ["https://trak-9rku.onrender.com/api/", "https://trak-9rku.onrender.com/api"],
    ["  http://localhost:3001/api  ", "http://localhost:3001/api"]
  ])("%s -> %s", (valor, esperado) => {
    expect(normalizarApiBase(valor)).toBe(esperado);
  });

  it("sem valor usa a API local", () => {
    expect(normalizarApiBase(undefined)).toBe("http://localhost:3001/api");
    expect(normalizarApiBase("")).toBe("http://localhost:3001/api");
  });
});
