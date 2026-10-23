import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { AdminGuard, AutenticacaoOpcionalGuard, ehAdmin, SupabaseAuthGuard } from "./supabase-auth.guard";

function contexto(request: Record<string, unknown>) {
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

function servico(getUser: jest.Mock) {
  return { getClient: () => ({ auth: { getUser } }) } as unknown as SupabaseService;
}

describe("guards de autenticacao", () => {
  const usuarioValido = jest.fn(async () => ({ data: { user: { id: "u1", email: "a@b.com" } }, error: null }));
  const tokenInvalido = jest.fn(async () => ({ data: { user: null }, error: { message: "expirado" } }));

  it("SupabaseAuthGuard exige token", async () => {
    await expect(new SupabaseAuthGuard(servico(usuarioValido)).canActivate(contexto({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it("SupabaseAuthGuard preenche usuarioAuth com token valido", async () => {
    const request: Record<string, unknown> = { headers: { authorization: "Bearer abc" } };
    await expect(new SupabaseAuthGuard(servico(usuarioValido)).canActivate(contexto(request))).resolves.toBe(true);
    expect(request.usuarioAuth).toEqual({ id: "u1", email: "a@b.com" });
    expect(usuarioValido).toHaveBeenCalledWith("abc");
  });

  it("AutenticacaoOpcionalGuard deixa passar sem token", async () => {
    const request: Record<string, unknown> = { headers: {} };
    await expect(new AutenticacaoOpcionalGuard(servico(usuarioValido)).canActivate(contexto(request))).resolves.toBe(true);
    expect(request.usuarioAuth).toBeUndefined();
  });

  it("AutenticacaoOpcionalGuard trata token invalido ou expirado como visitante anonimo", async () => {
    const request: Record<string, unknown> = { headers: { authorization: "Bearer x" } };
    await expect(new AutenticacaoOpcionalGuard(servico(tokenInvalido)).canActivate(contexto(request))).resolves.toBe(
      true
    );
    expect(request.usuarioAuth).toBeUndefined();
  });

  it("SupabaseAuthGuard recusa token invalido", async () => {
    await expect(
      new SupabaseAuthGuard(servico(tokenInvalido)).canActivate(contexto({ headers: { authorization: "Bearer x" } }))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("moderadores", () => {
  const original = process.env.ADMIN_EMAILS;
  beforeEach(() => {
    process.env.ADMIN_EMAILS = " Mod@Trak.app , outro@trak.app";
  });
  afterAll(() => {
    process.env.ADMIN_EMAILS = original;
  });

  it("ehAdmin compara e-mails sem diferenciar caixa", () => {
    expect(ehAdmin("mod@trak.app")).toBe(true);
    expect(ehAdmin("OUTRO@trak.app")).toBe(true);
    expect(ehAdmin("intruso@trak.app")).toBe(false);
    expect(ehAdmin(undefined)).toBe(false);
  });

  it("sem ADMIN_EMAILS ninguem e admin", () => {
    process.env.ADMIN_EMAILS = "";
    expect(ehAdmin("")).toBe(false);
    expect(ehAdmin("mod@trak.app")).toBe(false);
  });

  it("AdminGuard bloqueia quem nao e moderador", () => {
    const guard = new AdminGuard();
    expect(guard.canActivate(contexto({ usuarioAuth: { id: "1", email: "mod@trak.app" } }))).toBe(true);
    expect(() => guard.canActivate(contexto({ usuarioAuth: { id: "2", email: "x@y.z" } }))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(contexto({}))).toThrow(ForbiddenException);
  });
});
