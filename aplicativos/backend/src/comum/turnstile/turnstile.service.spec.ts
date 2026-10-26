import { ForbiddenException } from "@nestjs/common";
import { ExecutionContext } from "@nestjs/common";
import { TurnstileGuard } from "./turnstile.guard";
import { TurnstileService } from "./turnstile.service";

describe("TurnstileService e TurnstileGuard", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  describe("TurnstileService", () => {
    it("deve permitir requisições quando TURNSTILE_SECRET_KEY não estiver configurada", async () => {
      delete process.env.TURNSTILE_SECRET_KEY;
      const service = new TurnstileService();
      expect(service.isConfigured()).toBe(false);
      const resultado = await service.validarToken("token_qualquer");
      expect(resultado).toBe(true);
    });

    it("deve rejeitar quando a chave estiver configurada mas o token for vazio", async () => {
      process.env.TURNSTILE_SECRET_KEY = "dummy_secret";
      const service = new TurnstileService();
      expect(service.isConfigured()).toBe(true);
      const resultado = await service.validarToken("");
      expect(resultado).toBe(false);
    });

    it("deve aprovar quando o endpoint da Cloudflare responder sucesso", async () => {
      process.env.TURNSTILE_SECRET_KEY = "dummy_secret";
      jest.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), { status: 200 })
      );

      const service = new TurnstileService();
      const resultado = await service.validarToken("token_valido", "127.0.0.1");
      expect(resultado).toBe(true);
    });

    it("deve rejeitar quando o endpoint da Cloudflare responder erro", async () => {
      process.env.TURNSTILE_SECRET_KEY = "dummy_secret";
      jest.spyOn(global, "fetch").mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] }), { status: 200 })
      );

      const service = new TurnstileService();
      const resultado = await service.validarToken("token_invalido");
      expect(resultado).toBe(false);
    });

    it("deve tratar falha de rede/exceção com segurança retornando false", async () => {
      process.env.TURNSTILE_SECRET_KEY = "dummy_secret";
      jest.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Timeout de rede"));

      const service = new TurnstileService();
      const resultado = await service.validarToken("token_teste");
      expect(resultado).toBe(false);
    });
  });

  describe("TurnstileGuard", () => {
    function criarContexto(req: Record<string, unknown>): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => req
        })
      } as unknown as ExecutionContext;
    }

    it("deve aprovar canActivate quando o serviço não está configurado", async () => {
      delete process.env.TURNSTILE_SECRET_KEY;
      const service = new TurnstileService();
      const guard = new TurnstileGuard(service);
      const contexto = criarContexto({ headers: {} });

      const aprovado = await guard.canActivate(contexto);
      expect(aprovado).toBe(true);
    });

    it("deve lançar ForbiddenException quando a validação falhar", async () => {
      process.env.TURNSTILE_SECRET_KEY = "dummy_secret";
      const service = new TurnstileService();
      jest.spyOn(service, "validarToken").mockResolvedValueOnce(false);
      const guard = new TurnstileGuard(service);
      const contexto = criarContexto({ headers: { "cf-turnstile-token": "token_ruim" } });

      await expect(guard.canActivate(contexto)).rejects.toThrow(ForbiddenException);
    });

    it("deve aprovar canActivate quando o token for validado pelo header ou body", async () => {
      process.env.TURNSTILE_SECRET_KEY = "dummy_secret";
      const service = new TurnstileService();
      jest.spyOn(service, "validarToken").mockResolvedValueOnce(true);
      const guard = new TurnstileGuard(service);
      const contexto = criarContexto({ body: { turnstileToken: "token_bom" } });

      const aprovado = await guard.canActivate(contexto);
      expect(aprovado).toBe(true);
    });
  });
});
