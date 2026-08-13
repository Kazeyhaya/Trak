import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { SupabaseService } from "../supabase/supabase.service";

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token Bearer nao informado.");
    }

    const token = authHeader.slice("Bearer ".length).trim();
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException("Token invalido ou expirado.");
    }

    request.usuarioAuth = {
      id: data.user.id,
      email: data.user.email
    };

    return true;
  }
}
