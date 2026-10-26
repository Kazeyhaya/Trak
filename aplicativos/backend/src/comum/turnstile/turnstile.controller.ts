import { Body, Controller, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { TurnstileService } from "./turnstile.service";

class VerificarTurnstileDto {
  token!: string;
}

@Controller("turnstile")
export class TurnstileController {
  constructor(private readonly turnstileService: TurnstileService) {}

  @Post("verify")
  @HttpCode(HttpStatus.OK)
  async verificar(@Body() body: VerificarTurnstileDto, @Req() req: Request) {
    const rawIp = req.ip || (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
    const valido = await this.turnstileService.validarToken(body?.token, rawIp);
    return { success: valido };
  }
}
