import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { SupabaseService } from "../supabase/supabase.service";
import { UsuarioAuth } from "./usuario-auth.decorator";

type RequestComUsuario = {
  headers: { authorization?: string };
  usuarioAuth?: UsuarioAuth;
};

// Tokens ja validados no Supabase, por ate 60s (ou ate expirarem, o que vier antes).
// Sem isso, cada requisicao autenticada fazia uma chamada de rede ao Supabase Auth.
// Contrapartida: um token revogado (logout) ainda vale por ate 60s nesta instancia.
const VALIDADE_CACHE_MS = 60_000;
const MAX_TOKENS_EM_CACHE = 5000;
const tokensValidados = new Map<string, { usuario: UsuarioAuth; expiraEm: number }>();

function expiracaoDoToken(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

// Usado nos testes para comecar cada caso sem tokens guardados.
export function limparCacheDeTokens() {
  tokensValidados.clear();
}

// Conta excluida: os tokens dela deixam de valer na hora, sem esperar os 60s do cache.
export function esquecerUsuario(authUserId: string) {
  for (const [chave, guardado] of tokensValidados) {
    if (guardado.usuario.id === authUserId) {
      tokensValidados.delete(chave);
    }
  }
}

async function autenticar(
  supabaseService: SupabaseService,
  request: RequestComUsuario,
  opcional = false
) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const chave = createHash("sha256").update(token).digest("hex");
  const agora = Date.now();
  const guardado = tokensValidados.get(chave);
  if (guardado && guardado.expiraEm > agora) {
    request.usuarioAuth = guardado.usuario;
    return guardado.usuario;
  }

  const { data, error } = await supabaseService.getClient().auth.getUser(token);

  if (error || !data.user) {
    tokensValidados.delete(chave);
    if (opcional) {
      return null;
    }
    throw new UnauthorizedException("Token invalido ou expirado.");
  }

  const usuario = { id: data.user.id, email: data.user.email };
  const expiraEm = Math.min(agora + VALIDADE_CACHE_MS, expiracaoDoToken(token) ?? agora + VALIDADE_CACHE_MS);
  if (tokensValidados.size >= MAX_TOKENS_EM_CACHE) {
    tokensValidados.delete(tokensValidados.keys().next().value as string);
  }
  tokensValidados.set(chave, { usuario, expiraEm });

  request.usuarioAuth = usuario;
  return usuario;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const usuario = await autenticar(this.supabaseService, context.switchToHttp().getRequest());

    if (!usuario) {
      throw new UnauthorizedException("Token Bearer nao informado.");
    }

    return true;
  }
}

// Para rotas publicas que personalizam a resposta quando ha login.
// Se o token estiver expirado ou invalido, trata como visitante anonimo.
@Injectable()
export class AutenticacaoOpcionalGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await autenticar(this.supabaseService, context.switchToHttp().getRequest(), true);
    return true;
  }
}

export function ehAdmin(email?: string) {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(email) && admins.includes(email!.toLowerCase());
}

// Deve ser usado depois do SupabaseAuthGuard.
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestComUsuario>();

    if (!ehAdmin(request.usuarioAuth?.email)) {
      throw new ForbiddenException("Acesso restrito a moderadores.");
    }

    return true;
  }
}
