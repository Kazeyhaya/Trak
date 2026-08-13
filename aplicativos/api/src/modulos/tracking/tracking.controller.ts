import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { SupabaseAuthGuard } from "../../comum/autenticacao/supabase-auth.guard";
import { UsuarioAuth, UsuarioLogado } from "../../comum/autenticacao/usuario-auth.decorator";
import { TrackingService } from "./tracking.service";

class TrackingPayloadDto {
  status?: string;
  progress?: number;
  favorite?: boolean;
}

@UseGuards(SupabaseAuthGuard)
@Controller("tracking")
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get()
  listar(@UsuarioLogado() usuario: UsuarioAuth) {
    return this.trackingService.listar(usuario.id);
  }

  @Post("items/:mediaItemId")
  salvar(
    @UsuarioLogado() usuario: UsuarioAuth,
    @Param("mediaItemId") mediaItemId: string,
    @Body() payload: TrackingPayloadDto
  ) {
    return this.trackingService.salvar(usuario.id, mediaItemId, payload);
  }

  @Put("items/:mediaItemId")
  atualizar(
    @UsuarioLogado() usuario: UsuarioAuth,
    @Param("mediaItemId") mediaItemId: string,
    @Body() payload: TrackingPayloadDto
  ) {
    return this.trackingService.salvar(usuario.id, mediaItemId, payload);
  }
}
