import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { AdminGuard, SupabaseAuthGuard } from "../../comum/autenticacao/supabase-auth.guard";
import { ModerarDenunciaDto, STATUS_DENUNCIA, StatusDenuncia } from "./dto/moderar-denuncia.dto";
import { ModeracaoService } from "./moderacao.service";

// Moderadores sao definidos em ADMIN_EMAILS (lista separada por virgulas).
@UseGuards(SupabaseAuthGuard, AdminGuard)
@Controller("moderacao/denuncias")
export class ModeracaoController {
  constructor(private readonly moderacaoService: ModeracaoService) {}

  @Get()
  listar(@Query("status") status?: string) {
    const filtro = STATUS_DENUNCIA.find((s) => s === status) as StatusDenuncia | undefined;
    return this.moderacaoService.listar(filtro);
  }

  @Patch(":id")
  moderar(@Param("id") id: string, @Body() payload: ModerarDenunciaDto) {
    return this.moderacaoService.moderar(id, payload);
  }
}
