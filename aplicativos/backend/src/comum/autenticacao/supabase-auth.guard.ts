import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";
import { UsuarioAuth } from "./usuario-auth.decorator";

type RequestComUsuario = {
  headers: { authorization?: string };
  usuarioAuth?: UsuarioAuth;
};

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
  const { data, error } = await supabaseService.getClient().auth.getUser(token);

  if (error || !data.user) {
    if (opcional) {
      return null;
    }
    throw new UnauthorizedException("Token invalido ou expirado.");
  }

  request.usuarioAuth = { id: data.user.id, email: data.user.email };
  return request.usuarioAuth;
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
