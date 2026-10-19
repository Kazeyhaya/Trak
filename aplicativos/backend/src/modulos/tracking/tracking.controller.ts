import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { SupabaseAuthGuard } from "../../comum/autenticacao/supabase-auth.guard";
import { UsuarioAuth, UsuarioLogado } from "../../comum/autenticacao/usuario-auth.decorator";
import { MarcarEpisodiosDto } from "./dto/marcar-episodios.dto";
import { SalvarTrackingDto } from "./dto/salvar-tracking.dto";
import { TrackingService } from "./tracking.service";

@UseGuards(SupabaseAuthGuard)
@Controller("tracking")
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Get()
  listar(@UsuarioLogado() usuario: UsuarioAuth) {
    return this.trackingService.listar(usuario.id);
  }

  @Get("items/:mediaItemId")
  buscar(@UsuarioLogado() usuario: UsuarioAuth, @Param("mediaItemId") mediaItemId: string) {
    return this.trackingService.buscar(usuario.id, mediaItemId);
  }

  @Post("items/:mediaItemId")
  salvar(
    @UsuarioLogado() usuario: UsuarioAuth,
    @Param("mediaItemId") mediaItemId: string,
    @Body() payload: SalvarTrackingDto
  ) {
    return this.trackingService.salvar(usuario.id, mediaItemId, payload);
  }

  @Put("items/:mediaItemId")
  atualizar(
    @UsuarioLogado() usuario: UsuarioAuth,
    @Param("mediaItemId") mediaItemId: string,
    @Body() payload: SalvarTrackingDto
  ) {
    return this.trackingService.salvar(usuario.id, mediaItemId, payload);
  }

  @Delete("items/:mediaItemId")
  remover(@UsuarioLogado() usuario: UsuarioAuth, @Param("mediaItemId") mediaItemId: string) {
    return this.trackingService.remover(usuario.id, mediaItemId);
  }

  @Get("items/:mediaItemId/episodios")
  listarEpisodios(@UsuarioLogado() usuario: UsuarioAuth, @Param("mediaItemId") mediaItemId: string) {
    return this.trackingService.listarEpisodios(usuario.id, mediaItemId);
  }

  @Put("items/:mediaItemId/episodios")
  marcarEpisodios(
    @UsuarioLogado() usuario: UsuarioAuth,
    @Param("mediaItemId") mediaItemId: string,
    @Body() payload: MarcarEpisodiosDto
  ) {
    return this.trackingService.marcarEpisodios(usuario.id, mediaItemId, payload);
  }
}
