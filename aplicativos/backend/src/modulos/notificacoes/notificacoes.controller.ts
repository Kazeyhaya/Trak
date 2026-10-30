import { Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { SupabaseAuthGuard } from "../../comum/autenticacao/supabase-auth.guard";
import { UsuarioAuth, UsuarioLogado } from "../../comum/autenticacao/usuario-auth.decorator";
import { NotificacoesService } from "./notificacoes.service";

@UseGuards(SupabaseAuthGuard)
@Controller("notificacoes")
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) {}

  @Get()
  listar(@UsuarioLogado() usuario: UsuarioAuth, @Query("limite") limite?: string) {
    return this.notificacoesService.listar(usuario.id, limite ? parseInt(limite, 10) : undefined);
  }

  @Get("nao-lidas/count")
  contarNaoLidas(@UsuarioLogado() usuario: UsuarioAuth) {
    return this.notificacoesService.contarNaoLidas(usuario.id);
  }

  @Patch(":id/lida")
  marcarLida(@Param("id") id: string, @UsuarioLogado() usuario: UsuarioAuth) {
    return this.notificacoesService.marcarLida(id, usuario.id);
  }

  @Post("marcar-todas-lidas")
  marcarTodasLidas(@UsuarioLogado() usuario: UsuarioAuth) {
    return this.notificacoesService.marcarTodasLidas(usuario.id);
  }
}
