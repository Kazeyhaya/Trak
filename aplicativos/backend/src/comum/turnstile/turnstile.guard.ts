import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { TurnstileService } from "./turnstile.service";

@Injectable()
export class TurnstileGuard implements CanActivate {
  constructor(private readonly turnstileService: TurnstileService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.turnstileService.isConfigured()) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | undefined>;
      body?: Record<string, unknown>;
      ip?: string;
    }>();

    const token =
      request.headers?.["cf-turnstile-token"] ||
      request.headers?.["x-turnstile-token"] ||
      (typeof request.body?.turnstileToken === "string" ? request.body.turnstileToken : undefined);

    const ip = request.ip || request.headers?.["x-forwarded-for"]?.split(",")[0]?.trim();

    const valido = await this.turnstileService.validarToken(token, ip);
    if (!valido) {
      throw new ForbiddenException("Desafio de verificação do Cloudflare Turnstile inválido ou ausente.");
    }

    return true;
  }
}
