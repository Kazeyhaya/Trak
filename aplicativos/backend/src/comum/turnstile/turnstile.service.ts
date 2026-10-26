import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  getSecretKey(): string | undefined {
    return process.env.TURNSTILE_SECRET_KEY?.trim() || undefined;
  }

  isConfigured(): boolean {
    return Boolean(this.getSecretKey());
  }

  async validarToken(token?: string | null, ip?: string | null): Promise<boolean> {
    const secretKey = this.getSecretKey();
    if (!secretKey) {
      // Quando a chave secreta não está definida (ex: dev local ou testes de CI),
      // a verificação passa para não travar o desenvolvimento local.
      return true;
    }

    if (!token?.trim()) {
      return false;
    }

    try {
      const formData = new URLSearchParams();
      formData.append("secret", secretKey);
      formData.append("response", token.trim());
      if (ip) {
        formData.append("remoteip", ip);
      }

      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString(),
        signal: AbortSignal.timeout(5000)
      });

      if (!res.ok) {
        this.logger.warn(`Cloudflare Turnstile respondeu com status HTTP ${res.status}`);
        return false;
      }

      const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
      if (!data.success) {
        this.logger.warn(`Falha na validação do Cloudflare Turnstile: ${JSON.stringify(data["error-codes"] || [])}`);
      }
      return Boolean(data.success);
    } catch (err) {
      this.logger.error("Erro ao validar token do Cloudflare Turnstile:", err);
      return false;
    }
  }
}
