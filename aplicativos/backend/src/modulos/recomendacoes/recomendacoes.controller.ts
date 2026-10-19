import { Controller, Get, UseGuards } from "@nestjs/common";
import { SupabaseAuthGuard } from "../../comum/autenticacao/supabase-auth.guard";
import { UsuarioAuth, UsuarioLogado } from "../../comum/autenticacao/usuario-auth.decorator";
import { RecomendacoesService } from "./recomendacoes.service";

@UseGuards(SupabaseAuthGuard)
@Controller()
export class RecomendacoesController {
  constructor(private readonly recomendacoesService: RecomendacoesService) {}

  @Get("recomendacoes")
  recomendacoes(@UsuarioLogado() usuario: UsuarioAuth) {
    return this.recomendacoesService.recomendacoes(usuario.id);
  }

  @Get("alertas")
  alertas(@UsuarioLogado() usuario: UsuarioAuth) {
    return this.recomendacoesService.alertas(usuario.id);
  }
}
